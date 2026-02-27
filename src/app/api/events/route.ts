import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const publishedOnly = url.searchParams.get('published') === 'true';

    const supabase = createServiceRoleClient();
    const base = supabase.from('events').select('*');
    const { data, error } = await (
      publishedOnly
        ? base.eq('published', true).order('event_date', { ascending: true })
        : base.order('event_date', { ascending: true })
    );
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

    // Only include fields that are actually provided
    const insertData: Record<string, any> = { title, description, event_date };
    if (start_time !== undefined) insertData.start_time = start_time;
    if (end_time !== undefined) insertData.end_time = end_time;
    if (location !== undefined) insertData.location = location;
    if (max_participants !== undefined) insertData.max_participants = max_participants;
    if (registration_required !== undefined) insertData.registration_required = registration_required;
    if (registration_url !== undefined) insertData.registration_url = registration_url;
    if (price !== undefined) insertData.price = price;
    if (category !== undefined) insertData.category = category;
    if (status !== undefined) insertData.status = status;
    if (published !== undefined) insertData.published = published;
    if (featured !== undefined) insertData.featured = featured;
    if (image_url !== undefined) insertData.image_url = image_url;

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('events')
      .insert(insertData)
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

    // Only include fields that were actually provided
    const updates: Record<string, any> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (event_date !== undefined) updates.event_date = event_date;
    if (start_time !== undefined) updates.start_time = start_time;
    if (end_time !== undefined) updates.end_time = end_time;
    if (location !== undefined) updates.location = location;
    if (max_participants !== undefined) updates.max_participants = max_participants;
    if (registration_required !== undefined) updates.registration_required = registration_required;
    if (registration_url !== undefined) updates.registration_url = registration_url;
    if (price !== undefined) updates.price = price;
    if (category !== undefined) updates.category = category;
    if (status !== undefined) updates.status = status;
    if (published !== undefined) updates.published = published;
    if (featured !== undefined) updates.featured = featured;
    if (image_url !== undefined) updates.image_url = image_url;

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('events')
      .update(updates)
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