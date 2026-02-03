import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

/**
 * Helper to get user session specifically for API routes
 * in Next.js 15 to avoid caching issues.
 */
async function getAuthenticatedUser(supabase: any) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;

  // Fetch role from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  return { ...user, role: profile?.role || 'parent' };
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const user = await getAuthenticatedUser(supabase);
  
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

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
  
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  // Use the cookies helper to ensure we aren't using a stale cache
  const cookieStore = await cookies();
  const supabase = await createSupabaseServerClient();
  const user = await getAuthenticatedUser(supabase);
  
  if (!user) {
    console.error('[API] POST Booking: Session cookie missing or expired');
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
      updated_at: new Date().toISOString()
    };

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
        message: `Created ${data.length} recurring bookings`
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
        message: 'Booking created successfully'
      });
    }
  } catch (error: any) {
    console.error('[API] POST Booking Exception:', error.message);
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create booking'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const user = await getAuthenticatedUser(supabase);

  if (!user || (user.role !== 'admin' && user.role !== 'trainer')) {
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

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}