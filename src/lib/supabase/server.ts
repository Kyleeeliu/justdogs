// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export function createSupabaseServerClient(request?: NextRequest) {
  const cookieStore = cookies()
  
  // Store the token from Authorization header if present
  let headerToken: string | null = null
  if (request) {
    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      headerToken = authHeader.substring(7)
    }
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // If we have a token from Authorization header, use it for auth-related cookies
          if (headerToken) {
            // Supabase uses cookie names like 'sb-<project-ref>-auth-token'
            // Check if this is an auth-related cookie
            if (name.includes('auth-token') || name.includes('access-token') || name.endsWith('-auth-token')) {
              return headerToken
            }
          }
          // Fall back to cookies
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // Handle cookie setting errors gracefully
            console.warn('Failed to set cookie:', name, error)
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // Handle cookie removal errors gracefully
            console.warn('Failed to remove cookie:', name, error)
          }
        },
      },
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // Server-side doesn't need URL detection
        // Add retry configuration for server-side requests
        retryAttempts: 2,
      },
    }
  )
}

/**
 * Get authenticated user from server-side with error handling
 * Can optionally accept a request to read Authorization header
 */
export async function getServerUser(request?: NextRequest) {
  try {
    // If request has Authorization header, try to use it directly
    if (request) {
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        
        // Create a regular Supabase client to verify the token
        const supabaseDirect = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        
        // Set the session with the token
        const { data: { user }, error } = await supabaseDirect.auth.getUser(token)
        
        if (!error && user) {
          console.log('Server auth: Authenticated via Authorization header')
          return user
        } else {
          console.warn('Server auth: Token from header invalid, error:', error?.message)
          // Fall through to try cookie-based auth
        }
      }
    }
    
    // Default: use cookie-based auth with SSR client
    const supabase = createSupabaseServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      console.error('Server auth error (from cookie):', error.message)
      return null
    }
    
    if (user) {
      console.log('Server auth: Authenticated via cookies')
    } else {
      console.warn('Server auth: No user found')
    }
    
    return user
  } catch (error) {
    console.error('Error getting server user:', error)
    return null
  }
}

/**
 * Get server session with error handling
 */
export async function getServerSession() {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Server session error:', error)
      return null
    }
    
    return session
  } catch (error) {
    console.error('Error getting server session:', error)
    return null
  }
}
