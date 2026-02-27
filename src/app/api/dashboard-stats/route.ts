import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerUser } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    console.log('[Dashboard Stats] Starting request');
    console.log('[Dashboard Stats] Service key exists:', !!serviceKey);
    console.log('[Dashboard Stats] Supabase URL exists:', !!supabaseUrl);

    if (!supabaseUrl || !serviceKey) {
      console.error('[Dashboard Stats] Missing environment variables');
      return NextResponse.json(
        { error: 'Server not configured' },
        { status: 500 }
      );
    }

    // Get current user from request (Bearer token or cookies)
    const user = await getServerUser(request);

    if (!user) {
      console.error('[Dashboard Stats] No authenticated user');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[Dashboard Stats] User authenticated:', user.id);

    // Use SERVICE ROLE for all queries (bypasses RLS reliably)
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get user profile to check role using service role (bypasses RLS cookie issues)
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    console.log('[Dashboard Stats] User profile:', userProfile);
    console.log('[Dashboard Stats] Profile error:', profileError);

    if (profileError || !userProfile) {
      console.warn('[Dashboard Stats] User profile not found:', profileError);
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    console.log('[Dashboard Stats] User role:', userProfile.role);

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    console.log('[Dashboard Stats] Date range:', {
      start: startOfDay.toISOString(),
      end: endOfDay.toISOString()
    });

    try {
      if (userProfile.role === 'admin') {
        console.log('[Dashboard Stats] Fetching admin stats...');

        // Run all admin stat queries in parallel
        const [bookingsToday, totalDogs, totalTrainers, pendingStatus, pendingNoTrainer] = await Promise.all([
          // Today's bookings
          supabaseAdmin
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .gte('start_time', startOfDay.toISOString())
            .lt('start_time', endOfDay.toISOString()),

          // Total dogs
          supabaseAdmin
            .from('dogs')
            .select('*', { count: 'exact', head: true }),

          // Active trainers: approved OR null (backward-compat with pre-approval accounts)
          supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true })
            .eq('role', 'trainer')
            .or('approval_status.eq.approved,approval_status.is.null'),

          // Pending bookings with status = 'pending'
          supabaseAdmin
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'pending'),

          // Confirmed bookings with no trainer assigned yet
          supabaseAdmin
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'confirmed')
            .is('trainer_id', null),
        ]);

        const pendingCount = (pendingStatus.count ?? 0) + (pendingNoTrainer.count ?? 0);

        console.log('[Dashboard Stats] Admin results:', {
          bookingsToday: bookingsToday.count,
          bookingsTodayError: bookingsToday.error?.message,
          totalDogs: totalDogs.count,
          totalDogsError: totalDogs.error?.message,
          totalTrainers: totalTrainers.count,
          totalTrainersError: totalTrainers.error?.message,
          pendingCount,
        });

        const stats = {
          total_bookings_today: bookingsToday.count ?? 0,
          total_dogs: totalDogs.count ?? 0,
          total_trainers: totalTrainers.count ?? 0,
          pending_bookings: pendingCount,
        };

        console.log('[Dashboard Stats] Returning admin stats:', stats);
        return NextResponse.json(stats);

      } else if (userProfile.role === 'trainer') {
        console.log('[Dashboard Stats] Fetching trainer stats for:', user.id);

        const [todaySessions, assignedDogs, upcomingSessions] = await Promise.all([
          // Today's sessions for this trainer
          supabaseAdmin
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('trainer_id', user.id)
            .gte('start_time', startOfDay.toISOString())
            .lt('start_time', endOfDay.toISOString()),

          // Unique dogs assigned to this trainer
          supabaseAdmin
            .from('bookings')
            .select('dog_id')
            .eq('trainer_id', user.id)
            .not('dog_id', 'is', null),

          // Upcoming confirmed sessions
          supabaseAdmin
            .from('bookings')
            .select('*')
            .eq('trainer_id', user.id)
            .gte('start_time', new Date().toISOString())
            .eq('status', 'confirmed')
            .order('start_time', { ascending: true })
            .limit(5)
        ]);

        const uniqueDogs = new Set((assignedDogs.data ?? []).map((b: any) => b.dog_id));

        const stats = {
          today_sessions: todaySessions.count ?? 0,
          total_dogs_assigned: uniqueDogs.size,
          unread_messages: 0,
          upcoming_sessions: upcomingSessions.data ?? [],
        };

        console.log('[Dashboard Stats] Returning trainer stats:', stats);
        return NextResponse.json(stats);

      } else if (userProfile.role === 'parent') {
        console.log('[Dashboard Stats] Fetching parent stats for:', user.id);

        const [userDogs, upcomingSessions] = await Promise.all([
          // Dogs owned by this parent
          supabaseAdmin
            .from('dogs')
            .select('*', { count: 'exact', head: true })
            .eq('owner_id', user.id),

          // Upcoming sessions for this parent
          supabaseAdmin
            .from('bookings')
            .select('*', { count: 'exact', head: true })
            .eq('parent_id', user.id)
            .gte('start_time', new Date().toISOString())
            .in('status', ['confirmed', 'pending'])
        ]);

        const stats = {
          total_dogs: userDogs.count ?? 0,
          upcoming_sessions: upcomingSessions.count ?? 0,
          unread_messages: 0,
        };

        console.log('[Dashboard Stats] Returning parent stats:', stats);
        return NextResponse.json(stats);
      }
    } catch (dbError) {
      console.error('[Dashboard Stats] Database query failed:', dbError);
      console.error('[Dashboard Stats] Error details:', {
        message: dbError instanceof Error ? dbError.message : 'Unknown',
        stack: dbError instanceof Error ? dbError.stack : undefined,
      });
      
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

    console.log('[Dashboard Stats] Invalid role:', userProfile.role);
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });

  } catch (err) {
    console.error('[Dashboard Stats] Unexpected error:', err);
    console.error('[Dashboard Stats] Error details:', {
      message: err instanceof Error ? err.message : 'Unknown',
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}