import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Check if we're in development and environment variables are missing
const isMockMode = supabaseUrl === 'https://placeholder.supabase.co' ||
                   supabaseAnonKey === 'placeholder-key' ||
                   !supabaseUrl ||
                   !supabaseAnonKey;

console.log('Supabase configuration:', {
  url: supabaseUrl ? supabaseUrl.substring(0, 20) + '...' : 'missing',
  key: supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'missing',
  isMockMode
});

if (process.env.NODE_ENV === 'development' && isMockMode) {
  console.warn('⚠️ Supabase environment variables are not set. Please create a .env.local file with your Supabase credentials.');
  console.warn('For now, the app will work with mock data.');
}

// Create a mock Supabase client for development
const createMockSupabaseClient = () => {
  return {
    auth: {
      signInWithPassword: async () => {
        throw new Error('Database error querying schema');
      },
      signUp: async () => {
        throw new Error('Database error querying schema');
      },
      signOut: async () => {
        return { error: null };
      },
      getSession: async () => {
        return { data: { session: null }, error: null };
      },
      onAuthStateChange: () => {
        return { data: { subscription: { unsubscribe: () => {} } } };
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => {
            throw new Error('Database error querying schema');
          },
        }),
        order: () => ({
          then: async (resolve: any) => {
            // For getAllUsers, return empty array instead of throwing error
            resolve({ data: [], error: null });
          }
        }),
        then: async (resolve: any) => {
          // For other select operations, return empty array
          resolve({ data: [], error: null });
        }
      }),
      insert: () => ({
        select: async () => {
          throw new Error('Database error querying schema');
        },
      }),
      update: () => ({
        eq: () => ({
          select: () => ({
            single: async () => {
              throw new Error('Database error querying schema');
            },
          }),
        }),
      }),
    }),
  };
};

export const supabase = isMockMode ? createMockSupabaseClient() : createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    storageKey: 'supabase.auth.token',
    debug: process.env.NODE_ENV === 'development',
  },
  global: {
    headers: {
      'X-Client-Info': 'jsdog-app@1.0.0',
    },
  },
});

export type SupabaseClient = typeof supabase;
