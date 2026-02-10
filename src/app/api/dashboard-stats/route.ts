import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseServerClient, getServerUser } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        { error: 'Server not configured' },
        { status: 500 }
      );
    }

    // Get current user with improved error handling
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile to check role
    const supabaseClient = createSupabaseServerClient();
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      console.warn('User profile not found, defaulting to parent role:', profileError);
      // Default to parent role if profile not found
      return NextResponse.json({
        total_dogs: 0,
        upcoming_sessions: 0,
        unread_messages: 0,
      });
    }

    // Use SERVICE ROLE for querying (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    try {
      if (userProfile.role === 'admin') {
        // Admin stats - all data
        const [bookingsToday, totalDogs, totalTrainers, pendingBookings] = await Promise.all([
          // Today's bookings
          supabaseAdmin
            .from('bookings')
            .select('id')
            .gte('start_time', startOfDay.toISOString())
            .lt('start_time', endOfDay.toISOString()),
          
          // Total dogs
          supabaseAdmin
            .from('dogs')
            .select('id'),
          
          // Total trainers
          supabaseAdmin
            .from('users')
            .select('id')
            .eq('role', 'trainer'),
          
          // Pending bookings
          supabaseAdmin
            .from('bookings')
            .select('id')
            .eq('status', 'pending')
        ]);

        return NextResponse.json({
          total_bookings_today: bookingsToday.data?.length || 0,
          total_dogs: totalDogs.data?.length || 0,
          total_trainers: totalTrainers.data?.length || 0,
          pending_bookings: pendingBookings.data?.length || 0,
        });

      } else if (userProfile.role === 'trainer') {
        // Trainer stats - their data only
        const [todaySessions, assignedDogs, upcomingSessions] = await Promise.all([
          // Today's sessions for this trainer
          supabaseAdmin
            .from('bookings')
            .select('id')
            .eq('trainer_id', user.id)
            .gte('start_time', startOfDay.toISOString())
            .lt('start_time', endOfDay.toISOString()),
          
          // Dogs assigned to this trainer (unique dogs from bookings)
          supabaseAdmin
            .from('bookings')
            .select('dog_id')
            .eq('trainer_id', user.id),
          
          // Upcoming sessions
          supabaseAdmin
            .from('bookings')
            .select(`
              *,
              dogs:dog_id (name)
            `)
            .eq('trainer_id', user.id)
            .gte('start_time', new Date().toISOString())
            .eq('status', 'confirmed')
            .order('start_time', { ascending: true })
            .limit(5)
        ]);

        // Get unique dog count
        const uniqueDogs = new Set(assignedDogs.data?.map(b => b.dog_id) || []);

        return NextResponse.json({
          today_sessions: todaySessions.data?.length || 0,
          total_dogs_assigned: uniqueDogs.size,
          unread_messages: 0, // TODO: Implement message counting
          upcoming_sessions: upcomingSessions.data || [],
        });

      } else if (userProfile.role === 'parent') {
        // Parent stats - their data only
        const [userDogs, upcomingSessions] = await Promise.all([
          // Dogs owned by this parent
          supabaseAdmin
            .from('dogs')
            .select('id')
            .eq('owner_id', user.id),
          
          // Upcoming sessions for their dogs
          supabaseAdmin
            .from('bookings')
            .select('id')
            .eq('parent_id', user.id)
            .gte('start_time', new Date().toISOString())
            .in('status', ['confirmed', 'pending'])
        ]);

        return NextResponse.json({
          total_dogs: userDogs.data?.length || 0,
          upcoming_sessions: upcomingSessions.data?.length || 0,
          unread_messages: 0, // TODO: Implement message counting
        });
      }
    } catch (dbError) {
      console.warn('Database query failed, returning fallback stats:', dbError);
      // Return fallback stats based on role
      if (userProfile.role === 'admin') {
        return NextResponse.json({
          total_bookings_today: 0,
          total_dogs: 0,
          total_trainers: 0,
          pending_bookings: 0,
        });
      } else if (userProfile.role === 'trainer') {
        return NextResponse.json({
          today_sessions: 0,
          total_dogs_assigned: 0,
          unread_messages: 0,
          upcoming_sessions: [],
        });
      } else {
        return NextResponse.json({
          total_dogs: 0,
          upcoming_sessions: 0,
          unread_messages: 0,
        });
      }
    }

    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });

  } catch (err) {
    console.error('Unexpected error fetching dashboard stats:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}