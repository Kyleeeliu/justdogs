import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase.d';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = 'Missing Supabase environment variables. Please check your .env.local file.';
  console.error(errorMsg, {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey,
    urlPrefix: supabaseUrl?.substring(0, 20),
  });
  throw new Error(errorMsg);
}

// Log configuration in development (without exposing sensitive data)
if (process.env.NODE_ENV === 'development') {
  console.log('Supabase client initialized:', {
    urlConfigured: !!supabaseUrl,
    keyConfigured: !!supabaseAnonKey,
    urlPrefix: supabaseUrl?.substring(0, 30) + '...',
  });
}

// Create the Supabase client for browser usage
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'sb-pajtampwqutuuidklxbv-auth-token', // Use consistent storage key with project ref
    debug: process.env.NODE_ENV === 'development',
  },
  global: {
    headers: {
      'X-Client-Info': 'jsdog-app@1.0.0',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Set up auth state change listener with proper error handling
supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
  console.log('Auth state change:', event, session?.user?.email || 'no user');
  
  if (event === 'TOKEN_REFRESHED') {
    if (session) {
      console.log('Token refreshed successfully for:', session.user?.email);
    } else {
      console.warn('Token refresh failed - no session returned');
      // Clear corrupted auth state
      if (typeof window !== 'undefined') {
        console.log('Clearing corrupted auth state after failed refresh');
        // Clear all possible auth storage keys
        const keysToRemove = [
          'sb-pajtampwqutuuidklxbv-auth-token',
          'supabase.auth.token',
          'sb-auth-token'
        ];
        
        keysToRemove.forEach(key => {
          localStorage.removeItem(key);
        });
        
        // Also clear any other Supabase-related items
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase')) {
            localStorage.removeItem(key);
          }
        });
        
        // Redirect to login with session expired message
        window.location.href = '/login?message=session_expired';
      }
    }
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out, clearing local storage');
    if (typeof window !== 'undefined') {
      // Clear all auth-related storage on sign out
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
    }
  }
});

// Add global error handler for unhandled Supabase errors
if (typeof window !== 'undefined') {
  // Handle unhandled promise rejections that might be auth-related
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    
    // Check if it's a refresh token error
    if (error && typeof error === 'object') {
      const message = error.message || error.toString();
      const isRefreshTokenError = message.includes('refresh_token_not_found') ||
                                 message.includes('Invalid Refresh Token') ||
                                 message.includes('Refresh Token Not Found') ||
                                 message.includes('AuthApiError');
      
      if (isRefreshTokenError) {
        console.log('Unhandled refresh token error detected, clearing auth state');
        event.preventDefault(); // Prevent the error from being logged to console
        
        // Clear auth state
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase')) {
            localStorage.removeItem(key);
          }
        });
        
        // Redirect to login
        window.location.href = '/login?message=session_expired';
      }
    }
  });
}

export type SupabaseClient = typeof supabase;