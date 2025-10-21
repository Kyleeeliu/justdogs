import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Check if we're in development and environment variables are missing
const isMockMode = supabaseUrl === 'https://placeholder.supabase.co' || supabaseAnonKey === 'placeholder-key';

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
  },
});

export type SupabaseClient = typeof supabase;
