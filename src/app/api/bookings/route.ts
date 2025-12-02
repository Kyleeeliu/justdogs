import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/supabase.d';
import { BookingType, BookingStatus } from '@/types';

// GET - Fetch bookings
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
    
    // Get the current user from the session
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // For now, return empty array - we'll implement proper fetching later
    // This is a placeholder that works with the current mock data setup
    return NextResponse.json([]);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new booking
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      dog_id, 
      trainer_id, 
      parent_id,
      booking_type, 
      training_level,
      consult_type,
      start_time, 
      end_time, 
      special_instructions, 
      location,
      is_recurring,
      recurrence_type,
      recurrence_end_date,
      recurrence_count
    } = body;

    // Validate required fields
    if (!dog_id || !trainer_id || !parent_id || !booking_type || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Missing required fields: dog_id, trainer_id, parent_id, booking_type, start_time, end_time' },
        { status: 400 }
      );
    }

    // Validate dates
    const start = new Date(start_time);
    const end = new Date(end_time);
    if (end <= start) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }
    if (start < new Date()) {
      return NextResponse.json(
        { error: 'Start time cannot be in the past' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase service role key');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Create admin client with service role key (bypasses RLS)
    const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get the dog to verify ownership and get parent_id
    const { data: dogData, error: dogError } = await supabaseAdmin
      .from('dogs')
      .select('owner_id')
      .eq('id', dog_id)
      .single();

    if (dogError || !dogData) {
      console.error('Error fetching dog:', dogError);
      return NextResponse.json(
        { error: 'Dog not found' },
        { status: 404 }
      );
    }

    // Verify that the parent_id matches the dog's owner (for security)
    if (dogData.owner_id !== parent_id) {
      return NextResponse.json(
        { error: 'Dog does not belong to the specified parent' },
        { status: 403 }
      );
    }

    // Handle recurring bookings
    if (is_recurring && recurrence_type) {
      const bookings = [];
      let currentDate = new Date(start);
      const duration = end.getTime() - start.getTime();
      
      // Determine end condition
      let endCondition: Date | number;
      if (recurrence_end_date) {
        endCondition = new Date(recurrence_end_date);
      } else if (recurrence_count) {
        endCondition = recurrence_count;
      } else {
        return NextResponse.json(
          { error: 'Recurring bookings must specify either end date or occurrence count' },
          { status: 400 }
        );
      }

      let occurrenceCount = 0;
      const maxOccurrences = typeof endCondition === 'number' ? endCondition : 100; // Safety limit

      while (occurrenceCount < maxOccurrences) {
        if (typeof endCondition === 'object' && currentDate > endCondition) {
          break;
        }

        const occurrenceEnd = new Date(currentDate.getTime() + duration);
        
        const bookingData: any = {
          dog_id,
          trainer_id,
          booking_type,
          status: 'pending',
          scheduled_date: currentDate.toISOString().split('T')[0],
          scheduled_time: currentDate.toISOString().split('T')[1].slice(0, 5),
          location: location || null,
          special_instructions: special_instructions || null,
        };

        const { data, error } = await supabaseAdmin
          .from('bookings')
          .insert(bookingData)
          .select()
          .single();

        if (error) {
          console.error(`Error creating recurring booking ${occurrenceCount + 1}:`, error);
          // Continue with other bookings even if one fails
        } else {
          const startDateTime = new Date(`${data.scheduled_date}T${data.scheduled_time}`);
          const endDateTime = new Date(startDateTime.getTime() + duration);

          bookings.push({
            id: data.id,
            dog_id: data.dog_id,
            trainer_id: data.trainer_id,
            parent_id: parent_id,
            booking_type: data.booking_type as BookingType,
            training_level: training_level,
            consult_type: consult_type,
            status: data.status as BookingStatus,
            start_time: startDateTime.toISOString(),
            end_time: endDateTime.toISOString(),
            special_instructions: data.special_instructions || undefined,
            location: data.location || undefined,
            created_at: data.created_at,
            updated_at: data.updated_at,
          });
        }

        occurrenceCount++;
        
        // Calculate next occurrence date
        switch (recurrence_type) {
          case 'daily':
            currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
            break;
          case 'weekly':
            currentDate = new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000);
            break;
          case 'biweekly':
            currentDate = new Date(currentDate.getTime() + 14 * 24 * 60 * 60 * 1000);
            break;
          case 'monthly':
            currentDate = new Date(currentDate);
            currentDate.setMonth(currentDate.getMonth() + 1);
            break;
        }

        if (typeof endCondition === 'number' && occurrenceCount >= endCondition) {
          break;
        }
      }

      return NextResponse.json({ 
        bookings,
        message: `Created ${bookings.length} recurring booking(s)`
      }, { status: 201 });
    } else {
      // Single booking (existing logic)
      const bookingData: any = {
        dog_id,
        trainer_id,
        booking_type,
        status: 'pending',
        scheduled_date: start.toISOString().split('T')[0],
        scheduled_time: start.toISOString().split('T')[1].slice(0, 5),
        location: location || null,
        special_instructions: special_instructions || null,
      };

      // Insert booking
      const { data, error } = await supabaseAdmin
        .from('bookings')
        .insert(bookingData)
        .select()
        .single();

      if (error) {
        console.error('Error creating booking:', error);
        return NextResponse.json(
          { error: error.message || 'Failed to create booking' },
          { status: 500 }
        );
      }

      // Transform to match the Booking interface format
      // Calculate end_time from start_time and duration
      const startDateTime = new Date(`${data.scheduled_date}T${data.scheduled_time}`);
      const duration = end.getTime() - start.getTime();
      const endDateTime = new Date(startDateTime.getTime() + duration);

      const booking = {
        id: data.id,
        dog_id: data.dog_id,
        trainer_id: data.trainer_id,
        parent_id: parent_id,
        booking_type: data.booking_type as BookingType,
        training_level: training_level, // Store in memory, not in DB yet
        consult_type: consult_type, // Store in memory, not in DB yet
        status: data.status as BookingStatus,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        special_instructions: data.special_instructions || undefined,
        location: data.location || undefined,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      return NextResponse.json({ booking }, { status: 201 });
    }
  } catch (error) {
    console.error('Unexpected error in create booking API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
