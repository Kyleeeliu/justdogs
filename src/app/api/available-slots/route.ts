import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { AvailableSlot } from '@/types';

// GET - Get available booking slots for a trainer on a specific date
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get query parameters
    const { searchParams } = new URL(request.url);
    const trainerId = searchParams.get('trainer_id');
    const date = searchParams.get('date');
    const durationMinutes = parseInt(searchParams.get('duration_minutes') || '60');

    // Validate required parameters
    if (!trainerId || !date) {
      return NextResponse.json(
        { error: 'Missing required parameters: trainer_id, date' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD format' },
        { status: 400 }
      );
    }

    // Validate duration
    if (durationMinutes < 15 || durationMinutes > 480) {
      return NextResponse.json(
        { error: 'Duration must be between 15 and 480 minutes' },
        { status: 400 }
      );
    }

    // Verify trainer exists and is actually a trainer
    const { data: trainer, error: trainerError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', trainerId)
      .eq('role', 'trainer')
      .single();

    if (trainerError || !trainer) {
      return NextResponse.json(
        { error: 'Trainer not found or user is not a trainer' },
        { status: 404 }
      );
    }

    // Call the database function to get available slots
    const { data: slots, error: slotsError } = await supabase
      .rpc('get_available_slots', {
        p_trainer_id: trainerId,
        p_date: date,
        p_slot_duration_minutes: durationMinutes
      });

    if (slotsError) {
      console.error('Error fetching available slots:', slotsError);
      return NextResponse.json(
        { error: 'Failed to fetch available slots' },
        { status: 500 }
      );
    }

    // Transform the data to match our interface
    const availableSlots: AvailableSlot[] = (slots || []).map((slot: any) => ({
      start_time: slot.slot_start_time,
      end_time: slot.slot_end_time
    }));

    return NextResponse.json(availableSlots);
  } catch (error) {
    console.error('Error in available slots GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}