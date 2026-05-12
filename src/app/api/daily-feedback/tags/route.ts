import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, getServiceRoleClient } from '@/app/api/daily-feedback/_helpers';

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || !['trainer', 'admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = getServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const dateStr =
      new URL(request.url).searchParams.get('date') ||
      new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('dog_daily_priority_tag')
      .select('id, dog_id, for_date, tag, created_at')
      .eq('for_date', dateStr)
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ date: dateStr, tags: data ?? [] });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const supabase = getServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const body = await request.json();
    const { dog_id, for_date, tag } = body as {
      dog_id?: string;
      for_date?: string;
      tag?: string;
    };

    if (!dog_id || !for_date || !tag?.trim()) {
      return NextResponse.json(
        { error: 'dog_id, for_date, and tag are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('dog_daily_priority_tag')
      .insert({
        dog_id,
        for_date,
        tag: tag.trim().slice(0, 80),
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Tag already exists for this dog and day' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const supabase = getServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    if (id) {
      const { error } = await supabase.from('dog_daily_priority_tag').delete().eq('id', id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      return NextResponse.json({ success: true });
    }

    const dog_id = url.searchParams.get('dog_id');
    const for_date = url.searchParams.get('for_date');
    const tag = url.searchParams.get('tag');
    if (!dog_id || !for_date || !tag) {
      return NextResponse.json(
        { error: 'Provide id= or dog_id, for_date, and tag' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('dog_daily_priority_tag')
      .delete()
      .eq('dog_id', dog_id)
      .eq('for_date', for_date)
      .eq('tag', tag);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
