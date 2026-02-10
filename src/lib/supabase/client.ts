import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase.d';

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
    debug: false,
    // Add retry configuration for refresh token failures
    retryAttempts: 3,
    // Handle refresh token errors gracefully
    onAuthStateChange: (event, session) => {
      if (event === 'TOKEN_REFRESHED' && !session) {
        console.warn('Token refresh failed, clearing auth state');
        // Clear corrupted auth state
        if (typeof window !== 'undefined') {
          localStorage.removeItem('sb-pajtampwqutuuidklxbv-auth-token');
          window.location.href = '/login?message=session_expired';
        }
      }
    },
  },
  global: {
    headers: {
      'X-Client-Info': 'jsdog-app@1.0.0',
    },
  },
});

export type SupabaseClient = typeof supabase;