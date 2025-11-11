// src/lib/supabase/client-server.ts

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates a server-side Supabase client instance that correctly reads and writes session cookies
 * from the Next.js request context, ensuring proper RLS checks.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !supabaseAnonKey) {
    throw new Error('Supabase environment variables (URL or ANON_KEY) are missing.');
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey,
    {
      cookies: {
        async get(name: string) {
          return cookieStore.get(name)?.value;
        },
        
        async set(name: string, value: string, options: CookieOptions) {
          try {
            // Convert Supabase CookieOptions to Next.js cookie format
            const nextCookieOptions: any = {
              name,
              value,
              httpOnly: options.httpOnly,
              secure: options.secure,
              sameSite: options.sameSite,
              path: options.path,
            };

            // Handle maxAge vs expires conversion
            if (options.maxAge) {
              nextCookieOptions.maxAge = options.maxAge;
            }

            cookieStore.set(nextCookieOptions);
          } catch (error) {
            // Ignore error in Server Components - this is expected in some contexts
          }
        },
        
        async remove(name: string, options: CookieOptions) {
          try {
            const nextCookieOptions: any = {
              name,
              value: '',
              httpOnly: options.httpOnly,
              secure: options.secure,
              sameSite: options.sameSite,
              path: options.path,
              maxAge: 0, // Set maxAge to 0 to remove the cookie
            };

            cookieStore.set(nextCookieOptions);
          } catch (error) {
            // Ignore error in Server Components - this is expected in some contexts
          }
        },
      },
    }
  );
}