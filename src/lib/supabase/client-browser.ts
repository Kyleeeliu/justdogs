import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase.d';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

console.log('Supabase configuration:', {
  url: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'missing',
  key: supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'missing',
});

// Create the Supabase client for browser usage
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'sb-pajtampwqutuuidklxbv-auth-token', // Use consistent storage key with project ref
    // Keep auth debug logs off by default; enable only when explicitly needed.
    debug: process.env.NEXT_PUBLIC_SUPABASE_AUTH_DEBUG === 'true',
  },
  global: {
    headers: {
      'X-Client-Info': 'jsdog-app@1.0.0',
    },
  },
});

export type SupabaseClient = typeof supabase;
