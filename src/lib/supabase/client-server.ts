import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/supabase.d'; // <-- NEW: Import your schema type

/**
 * Creates a server-side Supabase client instance that correctly reads and writes session cookies
 * from the Next.js request context, ensuring proper RLS checks.
 * * NOTE: This function MUST remain synchronous to be used correctly in Server Components and Route Handlers.
 */
export async function createSupabaseServerClient() {
  // cookies() is a dynamic function that returns a Promise in newer Next.js versions
  const cookieStore = await cookies();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !supabaseAnonKey) {
    throw new Error('Supabase environment variables (URL or ANON_KEY) are missing.');
  }

  return createServerClient<Database>( // <-- FIX: Inject the Database generic type
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          try {
            return cookieStore.get(name)?.value;
          } catch (error) {
            return undefined;
          }
        },
        
        set(name: string, value: string, options: CookieOptions) {
          try {
            // Next.js set requires options to be part of the object
            // The value is spread into the options object implicitly by the Next.js implementation
            cookieStore.set({ name, value, ...options }); 
          } catch (error) {
            // Ignore error in Server Components that are not Server Actions
          }
        },
        
        remove(name: string, options: CookieOptions) {
          try {
            // Remove by setting the value to empty string and letting the options handle expiry/removal
            cookieStore.set({ name, value: '', ...options, maxAge: 0 });
          } catch (error) {
            // Ignore error
          }
        },
      },
    }
  );
}