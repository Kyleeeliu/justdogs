import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerUser } from '@/lib/supabase/server';

export function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function getAuthenticatedUser(request: NextRequest) {
  const authUser = await getServerUser(request);
  if (!authUser) return null;
  const supabase = getServiceRoleClient();
  if (!supabase) return { ...authUser, role: 'parent' as const };
  const { data: userRow } = await supabase.from('users').select('role').eq('id', authUser.id).single();
  return { ...authUser, role: (userRow?.role as string) || 'parent' };
}

export function utcDayBounds(dateStr: string): { start: string; end: string } {
  return {
    start: `${dateStr}T00:00:00.000Z`,
    end: `${dateStr}T23:59:59.999Z`,
  };
}

export function bookingOverlapsDay(
  startTime: string,
  endTime: string | null,
  dateStr: string
): boolean {
  const { start, end } = utcDayBounds(dateStr);
  const s = new Date(startTime).getTime();
  const e = new Date(endTime || startTime).getTime();
  const ds = new Date(start).getTime();
  const de = new Date(end).getTime();
  return s <= de && e >= ds;
}
