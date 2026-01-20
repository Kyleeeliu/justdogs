import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('API /api/events GET error:', err);
    return NextResponse.json({ error: err?.message ?? 'Unknown' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      title, 
      description, 
      event_date, 
      start_time, 
      end_time, 
      location, 
      max_participants, 
      registration_required, 
      registration_url, 
      price, 
      category, 
      status, 
      published, 
      featured, 
      image_url 
    } = body;

    if (!title || !description || !event_date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('events')
      .insert({ 
        title, 
        description, 
        event_date, 
        start_time, 
        end_time, 
        location, 
        max_participants, 
        registration_required, 
        registration_url, 
        price, 
        category, 
        status, 
        published, 
        featured, 
        image_url 
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error('API /api/events POST error:', err);
    return NextResponse.json({ error: err?.message ?? 'Unknown' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { 
      id, 
      title, 
      description, 
      event_date, 
      start_time, 
      end_time, 
      location, 
      max_participants, 
      registration_required, 
      registration_url, 
      price, 
      category, 
      status, 
      published, 
      featured, 
      image_url 
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('events')
      .update({ 
        title, 
        description, 
        event_date, 
        start_time, 
        end_time, 
        location, 
        max_participants, 
        registration_required, 
        registration_url, 
        price, 
        category, 
        status, 
        published, 
        featured, 
        image_url 
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('API /api/events PATCH error:', err);
    return NextResponse.json({ error: err?.message ?? 'Unknown' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, deleted: data });
  } catch (err: any) {
    console.error('API /api/events DELETE error:', err);
    return NextResponse.json({ error: err?.message ?? 'Unknown' }, { status: 500 });
  }
}