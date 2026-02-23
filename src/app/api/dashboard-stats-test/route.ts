import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    console.log('Testing dashboard stats without authentication...');

    // Use SERVICE ROLE for querying (bypasses RLS and auth)
    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
    
    console.log('Date range:', {
      startOfDay: startOfDay.toISOString(),
      endOfDay: endOfDay.toISOString()
    });

    try {
      // Today's bookings
      const { data: bookingsToday, error: bookingsError } = await supabaseAdmin
        .from('bookings')
        .select('id')
        .gte('start_time', startOfDay.toISOString())
        .lt('start_time', endOfDay.toISOString());
      
      console.log('Bookings today:', {
        count: bookingsToday?.length || 0,
        error: bookingsError?.message
      });
      
      // Total dogs
      const { data: totalDogs, error: dogsError } = await supabaseAdmin
        .from('dogs')
        .select('id');
      
      console.log('Total dogs:', {
        count: totalDogs?.length || 0,
        error: dogsError?.message
      });
      
      // Total trainers
      const { data: totalTrainers, error: trainersError } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('role', 'trainer');
      
      console.log('Total trainers:', {
        count: totalTrainers?.length || 0,
        error: trainersError?.message
      });
      
      // Pending bookings
      const { data: pendingBookings, error: pendingError } = await supabaseAdmin
        .from('bookings')
        .select('id')
        .eq('status', 'pending');
      
      console.log('Pending bookings:', {
        count: pendingBookings?.length || 0,
        error: pendingError?.message
      });

      const stats = {
        total_bookings_today: bookingsToday?.length || 0,
        total_dogs: totalDogs?.length || 0,
        total_trainers: totalTrainers?.length || 0,
        pending_bookings: pendingBookings?.length || 0,
        test_mode: true,
        timestamp: new Date().toISOString()
      };

      console.log('Final test stats:', stats);

      return NextResponse.json(stats);

    } catch (dbError) {
      console.error('Database query failed:', dbError);
      return NextResponse.json({
        error: 'Database query failed',
        details: dbError instanceof Error ? dbError.message : 'Unknown error',
        total_bookings_today: 0,
        total_dogs: 0,
        total_trainers: 0,
        pending_bookings: 0,
        test_mode: true
      }, { status: 500 });
    }

  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: err instanceof Error ? err.message : 'Unknown error',
        test_mode: true
      },
      { status: 500 }
    );
  }
}