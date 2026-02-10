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

export async function GET(request: NextRequest) {
  console.log('[API] ========== GET /api/bookings START ==========');
  
  const user = await getAuthenticatedUser(request);
  console.log('[API] Authenticated user:', {
    id: user?.id,
    email: user?.email,
    role: user?.role
  });
  
  if (!user) {
    console.log('[API] No user - returning 401');
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Use service role client to bypass RLS (we'll filter manually)
  const supabase = getServiceRoleClient() ?? createSupabaseServerClient(request);
  console.log('[API] Created Supabase client (service role)');

  // Build query
  let query = supabase
    .from('bookings')
    .select('*');

  console.log('[API] User role:', user.role);

  // IMPORTANT: Filter by role on the SERVER side
  if (user.role === 'parent') {
    console.log('[API] Parent - Filtering by parent_id:', user.id);
    query = query.eq('parent_id', user.id);
    
    // Additional safety check: also filter by dog ownership
    // This ensures parents can only see bookings for their own dogs
    const { data: userDogs } = await supabase
      .from('dogs')
      .select('id')
      .eq('owner_id', user.id);
    
    if (userDogs && userDogs.length > 0) {
      const dogIds = userDogs.map(dog => dog.id);
      console.log('[API] Parent owns dogs:', dogIds);
      query = query.in('dog_id', dogIds);
    } else {
      console.log('[API] Parent has no dogs - returning empty array');
      return NextResponse.json([]);
    }
  } else if (user.role === 'trainer') {
    console.log('[API] Trainer - Filtering by trainer_id:', user.id);
    query = query.eq('trainer_id', user.id);
  } else if (user.role === 'admin') {
    console.log('[API] Admin - returning all bookings (no filter)');
  } else {
    // Unknown role - return empty
    console.log('[API] Unknown role - returning empty array');
    return NextResponse.json([]);
  }

  console.log('[API] Executing query...');
  const { data, error } = await query.order('start_time', { ascending: false });
  
  console.log('[API] Query complete');
  console.log('[API] Data length:', data?.length);
  console.log('[API] Error:', error);
  
  if (error) {
    console.error('[API] Supabase error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  
  // Additional logging for parent users
  if (user.role === 'parent' && data) {
    console.log('[API] Parent bookings details:', data.map(booking => ({
      id: booking.id,
      dog_id: booking.dog_id,
      parent_id: booking.parent_id,
      status: booking.status
    })));
  }
  
  console.log('[API] Returning', data?.length || 0, 'bookings');
  console.log('[API] ========== GET /api/bookings END ==========');
  return NextResponse.json(data || []);
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

  // Use service role client to bypass RLS
  const supabase = getServiceRoleClient() ?? createSupabaseServerClient(request);

  if (user.role !== 'admin' && user.role !== 'trainer') {
    return NextResponse.json({ error: 'Unauthorized Access' }, { status: 403 });
  }

  try {
    const { id, ...updates } = await request.json();

    const { data, error } = await supabase
      .from('bookings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('[API] PUT Booking error:', error);
      throw error;
    }
    
    console.log('[API] Booking updated successfully:', data);
    return NextResponse.json({ success: true, booking: data });
  } catch (error: any) {
    console.error('[API] PUT Booking Exception:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}