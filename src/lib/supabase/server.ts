// src/lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export function createSupabaseServerClient(request?: NextRequest) {
  const cookieStore = cookies()

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
          if (headerToken && (name.includes('auth-token') || name.includes('access-token') || name.endsWith('-auth-token'))) {
            return headerToken
          }
          return cookieStore.get(name)?.value
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch (error) {
            // Expected when called from Server Components
          }
        },
      },
    }
  );
}

/**
 * Get authenticated user from server-side with error handling.
 * Pass request to read Authorization header when client sends Bearer token.
 */
export async function getServerUser(request?: NextRequest) {
  try {
    if (request) {
      const authHeader = request.headers.get('authorization');
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const supabaseDirect = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { user }, error } = await supabaseDirect.auth.getUser(token);
        if (!error && user) return user;
      }
    }
    const supabase = createSupabaseServerClient(request);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Server auth error:', error);
      return null;
    }
    return user;
  } catch (error) {
    console.error('Error getting server user:', error);
    return null;
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