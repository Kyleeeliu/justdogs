import { NextRequest, NextResponse } from 'next/server';
import { getServerUser, createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

/**
 * Get authenticated user from request (Bearer token or cookies) and resolve role.
 * Uses getServerUser(request) so that Authorization header is respected.
 */
async function getAuthenticatedUser(request: NextRequest) {
  const authUser = await getServerUser(request);
  if (!authUser) return null;

  const supabase = createSupabaseServerClient(request);

  // Fetch role from profiles or users table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authUser.id)
    .single();

  if (profile?.role) {
    return { ...authUser, role: profile.role };
  }

  const { data: userRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single();

  // If session client can't read users (e.g. Bearer-only), try anon client (users table often allows read)
  let role = userRow?.role;
  if (role === undefined && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data: row } = await anon.from('users').select('role').eq('id', authUser.id).single();
    role = row?.role;
  }

  return { ...authUser, role: role || 'parent' };
}

/** Create a Supabase client with service role to bypass RLS (use only after validating user server-side). */
function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Use service role so we read from Supabase without RLS hiding rows (e.g. right after create)
  const supabase = getServiceRoleClient() ?? createSupabaseServerClient(request);

  let query = supabase.from('bookings').select(`
    *,
    dogs(name),
    trainers:trainer_id(full_name),
    parents:parent_id(full_name)
  `);

  if (user.role === 'parent') {
    query = query.eq('parent_id', user.id);
  } else if (user.role === 'trainer') {
    query = query.eq('trainer_id', user.id);
  }

  const { data, error } = await query.order('start_time', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    console.error('[API] POST Booking: No authenticated user (check Bearer token or cookies)');
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // Determine IDs: Admin can override, others are locked to their own ID
    const parentId = user.role === 'admin' ? (body.parent_id || user.id) : user.id;
    const status = (user.role === 'admin' && body.trainer_id) ? 'confirmed' : 'pending';

    const baseBookingData = {
      dog_id: body.dog_id,
      parent_id: parentId,
      trainer_id: body.trainer_id || null,
      booking_type: body.booking_type || 'boarding',
      start_time: body.start_time,
      end_time: body.end_time || body.start_time,
      notes: body.notes || null,
      status: status,
      updated_at: new Date().toISOString(),
    };

    // Use service role client so insert succeeds regardless of RLS (user already validated above)
    const supabase = getServiceRoleClient() ?? createSupabaseServerClient(request);

    // --- RECURRING LOGIC ---
    if (body.recurring && body.recurring_pattern && body.recurring_occurrences) {
      const bookings = [];
      const startDate = new Date(body.start_time);
      const endDate = new Date(body.end_time || body.start_time);
      const occurrences = Math.min(parseInt(body.recurring_occurrences) || 1, 52);

      const duration = endDate.getTime() - startDate.getTime();
      let currentDate = new Date(startDate);

      for (let i = 0; i < occurrences; i++) {
        const bookingEndTime = new Date(currentDate.getTime() + duration);

        bookings.push({
          ...baseBookingData,
          start_time: currentDate.toISOString(),
          end_time: bookingEndTime.toISOString(),
          created_at: new Date().toISOString(),
        });

        if (body.recurring_pattern === 'weekly') currentDate.setDate(currentDate.getDate() + 7);
        else if (body.recurring_pattern === 'biweekly') currentDate.setDate(currentDate.getDate() + 14);
        else if (body.recurring_pattern === 'monthly') currentDate.setMonth(currentDate.getMonth() + 1);
      }

      const { data, error } = await supabase.from('bookings').insert(bookings).select();
      if (error) throw error;

      return NextResponse.json({
        success: true,
        bookings: data,
        message: `Created ${data.length} recurring bookings`,
      });
    } else {
      // --- SINGLE BOOKING ---
      const { data, error } = await supabase
        .from('bookings')
        .insert([{ ...baseBookingData, created_at: new Date().toISOString() }])
        .select()
        .single();

      if (error) throw error;

      return NextResponse.json({
        success: true,
        booking: data,
        message: 'Booking created successfully',
      });
    }
  } catch (error: any) {
    console.error('[API] POST Booking Exception:', error.message);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create booking',
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (user.role !== 'admin' && user.role !== 'trainer') {
    return NextResponse.json({ error: 'Unauthorized Access' }, { status: 403 });
  }

  const supabase = getServiceRoleClient() ?? createSupabaseServerClient(request);

  try {
    const { id, ...updates } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Booking id is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('bookings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) throw error;
    if (data == null) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, ...data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Booking id is required' }, { status: 400 });

  const supabase = getServiceRoleClient() ?? createSupabaseServerClient(request);
  const { error } = await supabase.from('bookings').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}