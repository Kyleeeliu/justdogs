import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { TrainerException, TrainerExceptionFormData } from '@/types';

// GET - Fetch trainer exceptions
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
    const fromDate = searchParams.get('from_date');
    const toDate = searchParams.get('to_date');

    let query = supabase
      .from('trainer_exceptions' as any)
      .select('*')
      .order('exception_date', { ascending: true });

    // Filter by trainer if specified
    if (trainerId) {
      query = query.eq('trainer_id', trainerId);
    }

    // Filter by date range if specified
    if (fromDate) {
      query = query.gte('exception_date', fromDate);
    }
    if (toDate) {
      query = query.lte('exception_date', toDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching trainer exceptions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch trainer exceptions' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in trainer exceptions GET:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create trainer exception
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { trainer_id, exception_date, start_time, end_time, reason } = body;

    // Validate required fields
    if (!trainer_id || !exception_date) {
      return NextResponse.json(
        { error: 'Missing required fields: trainer_id, exception_date' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(exception_date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD format' },
        { status: 400 }
      );
    }

    // Validate that exception date is not in the past
    const exceptionDate = new Date(exception_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (exceptionDate < today) {
      return NextResponse.json(
        { error: 'Exception date cannot be in the past' },
        { status: 400 }
      );
    }

    // If start_time and end_time are provided, validate them
    if (start_time || end_time) {
      if (!start_time || !end_time) {
        return NextResponse.json(
          { error: 'Both start_time and end_time must be provided for partial day exceptions' },
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

    // Insert exception
    const { data, error } = await supabase
      .from('trainer_exceptions' as any)
      .insert({
        trainer_id,
        exception_date,
        start_time: start_time || null,
        end_time: end_time || null,
        reason: reason || null,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating trainer exception:', error);
      return NextResponse.json(
        { error: 'Failed to create trainer exception' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error in trainer exceptions POST:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update trainer exception
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, exception_date, start_time, end_time, reason } = body;

    // Validate required fields
    if (!id || !exception_date) {
      return NextResponse.json(
        { error: 'Missing required fields: id, exception_date' },
        { status: 400 }
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(exception_date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Use YYYY-MM-DD format' },
        { status: 400 }
      );
    }

    // If start_time and end_time are provided, validate them
    if (start_time || end_time) {
      if (!start_time || !end_time) {
        return NextResponse.json(
          { error: 'Both start_time and end_time must be provided for partial day exceptions' },
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

    // Update exception
    const { data, error } = await supabase
      .from('trainer_exceptions' as any)
      .update({
        exception_date,
        start_time: start_time || null,
        end_time: end_time || null,
        reason: reason || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating trainer exception:', error);
      return NextResponse.json(
        { error: 'Failed to update trainer exception' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Exception not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in trainer exceptions PUT:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete trainer exception
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

    // Delete exception
    const { error } = await supabase
      .from('trainer_exceptions' as any)
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting trainer exception:', error);
      return NextResponse.json(
        { error: 'Failed to delete trainer exception' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: 'Trainer exception deleted successfully' });
  } catch (error) {
    console.error('Error in trainer exceptions DELETE:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}