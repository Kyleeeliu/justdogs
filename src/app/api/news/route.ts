import { NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('news_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('API /api/news GET error:', err);
    return NextResponse.json({ error: err?.message ?? 'Unknown' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, content, date, type, published, attachments } = body;

    if (!title || !content || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('news_items')
      .insert({ title, content, date, type, published, attachments: attachments || [] })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    console.error('API /api/news POST error:', err);
    return NextResponse.json({ error: err?.message ?? 'Unknown' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, title, content, date, type, published, attachments } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (date !== undefined) updateData.date = date;
    if (type !== undefined) updateData.type = type;
    if (published !== undefined) updateData.published = published;
    if (attachments !== undefined) {
      // Ensure attachments is properly formatted as JSONB array
      updateData.attachments = Array.isArray(attachments) ? attachments : (attachments ? [attachments] : []);
      console.log('Updating news item', id, 'with attachments:', updateData.attachments);
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from('news_items')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      throw error;
    }
    
    console.log('News item updated successfully. Returned data:', data);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error('API /api/news PATCH error:', err);
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
      .from('news_items')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, deleted: data });
  } catch (err: any) {
    console.error('API /api/news DELETE error:', err);
    return NextResponse.json({ error: err?.message ?? 'Unknown' }, { status: 500 });
  }
}