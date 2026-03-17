import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(request: NextRequest) {
  const authUser = await getServerUser(request);
  if (!authUser) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const supabase = getServiceRoleClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // Resolve current user's role
  const { data: userRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single();
  const role = userRow?.role || 'parent';

  // Admin: can message everyone
  if (role === 'admin') {
    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, role')
      .neq('id', authUser.id)
      .order('full_name');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ contacts: data ?? [] });
  }

  // Parent: admin(s) + trainers linked via bookings
  if (role === 'parent') {
    // Get trainers from this parent's bookings (any status)
    const { data: bookings } = await supabase
      .from('bookings')
      .select('trainer_id')
      .eq('parent_id', authUser.id)
      .not('trainer_id', 'is', null);

    const trainerIds = [...new Set((bookings ?? []).map((b: any) => b.trainer_id).filter(Boolean))];

    // Build allowed user IDs: all admins + those trainers
    let query = supabase
      .from('users')
      .select('id, full_name, email, role')
      .neq('id', authUser.id)
      .order('full_name');

    if (trainerIds.length > 0) {
      query = query.or(`role.eq.admin,id.in.(${trainerIds.join(',')})`) as typeof query;
    } else {
      query = query.eq('role', 'admin') as typeof query;
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ contacts: data ?? [] });
  }

  // Trainer: admin(s) + other trainers + parents with future bookings
  if (role === 'trainer') {
    const now = new Date().toISOString();

    const { data: futureBookings } = await supabase
      .from('bookings')
      .select('parent_id')
      .eq('trainer_id', authUser.id)
      .neq('status', 'cancelled')
      .gte('start_time', now);

    const parentIds = [...new Set((futureBookings ?? []).map((b: any) => b.parent_id).filter(Boolean))];

    let query = supabase
      .from('users')
      .select('id, full_name, email, role')
      .neq('id', authUser.id)
      .order('full_name');

    if (parentIds.length > 0) {
      query = query.or(`role.eq.admin,role.eq.trainer,id.in.(${parentIds.join(',')})`) as typeof query;
    } else {
      query = query.in('role', ['admin', 'trainer']) as typeof query;
    }

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ contacts: data ?? [] });
  }

  // Any other role: only admin
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, email, role')
    .eq('role', 'admin')
    .order('full_name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ contacts: data ?? [] });
}
