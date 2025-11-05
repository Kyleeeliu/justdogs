import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Browser/public client (safe to use in client-side code)
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
export const supabase = createClient(url, anonKey);

// Server-only client using the service role key (DO NOT expose this to the browser)
// Use this in server-side API routes or server actions only
export function createServiceRoleClient(): SupabaseClient {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY in environment');
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}