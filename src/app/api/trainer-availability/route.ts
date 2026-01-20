import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { TrainerAvailability, TrainerAvailabilityFormData } from '@/types';

// GET - Fetch trainer availability
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

    let query = supabase
      .from('trainer_availability' as any)
      .select('*')
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });

    // Filter by trainer if specified
    if (trainerId) {
      query = query.eq('trainer_id', trainerId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching trainer availability:', error);
      return NextResponse.json(
        { error: 'Failed to fetch trainer availability' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in trainer availability GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create trainer availability
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trainer_id, day_of_week, start_time, end_time } = body;

    // Validate required fields
    if (!trainer_id || day_of_week === undefined || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Missing required fields: trainer_id, day_of_week, start_time, end_time' },
        { status: 400 }
      );
    }

    // Validate day_of_week
    if (day_of_week < 0 || day_of_week > 6) {
      return NextResponse.json(
        { error: 'day_of_week must be between 0 (Sunday) and 6 (Saturday)' },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      return NextResponse.json(
        { error: 'Invalid time format. Use HH:MM format' },
        { status: 400 }
      );
    }

    // Validate that end_time is after start_time
    if (start_time >= end_time) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify trainer exists and is actually a trainer
    const { data: trainer, error: trainerError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', trainer_id)
      .eq('role', 'trainer')
      .single();

    if (trainerError || !trainer) {
      return NextResponse.json(
        { error: 'Trainer not found or user is not a trainer' },
        { status: 404 }
      );
    }

    // Insert availability
    const { data, error } = await supabase
      .from('trainer_availability' as any)
      .insert({
        trainer_id,
        day_of_week,
        start_time,
        end_time,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating trainer availability:', error);
      
      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Availability slot already exists for this trainer, day, and time' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to create trainer availability' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in trainer availability POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update trainer availability
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, day_of_week, start_time, end_time } = body;

    // Validate required fields
    if (!id || day_of_week === undefined || !start_time || !end_time) {
      return NextResponse.json(
        { error: 'Missing required fields: id, day_of_week, start_time, end_time' },
        { status: 400 }
      );
    }

    // Validate day_of_week
    if (day_of_week < 0 || day_of_week > 6) {
      return NextResponse.json(
        { error: 'day_of_week must be between 0 (Sunday) and 6 (Saturday)' },
        { status: 400 }
      );
    }

    // Validate time format (HH:MM)
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(start_time) || !timeRegex.test(end_time)) {
      return NextResponse.json(
        { error: 'Invalid time format. Use HH:MM format' },
        { status: 400 }
      );
    }

    // Validate that end_time is after start_time
    if (start_time >= end_time) {
      return NextResponse.json(
        { error: 'End time must be after start time' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update availability
    const { data, error } = await supabase
      .from('trainer_availability')
      .update({
        day_of_week,
        start_time,
        end_time,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating trainer availability:', error);
      
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Availability slot already exists for this trainer, day, and time' },
          { status: 409 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to update trainer availability' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Availability slot not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in trainer availability PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete trainer availability
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Delete availability
    const { error } = await supabase
      .from('trainer_availability')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting trainer availability:', error);
      return NextResponse.json(
        { error: 'Failed to delete trainer availability' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Trainer availability deleted successfully' });
  } catch (error) {
    console.error('Error in trainer availability DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}