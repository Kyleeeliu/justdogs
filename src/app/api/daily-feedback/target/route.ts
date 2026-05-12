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
      .from('daily_feedback_target')
      .select('*')
      .eq('for_date', dateStr)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      for_date: dateStr,
      target_count: data?.target_count ?? 10,
      updated_at: data?.updated_at ?? null,
      updated_by: data?.updated_by ?? null,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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
    const for_date = body.for_date || new Date().toISOString().slice(0, 10);
    const target_count = parseInt(String(body.target_count ?? 10), 10);
    if (Number.isNaN(target_count) || target_count < 0) {
      return NextResponse.json({ error: 'Invalid target_count' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('daily_feedback_target')
      .upsert(
        {
          for_date,
          target_count,
          updated_by: user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'for_date' }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
