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

    const { count: teamTotal, error: e1 } = await supabase
      .from('daily_dog_feedback')
      .select('id', { count: 'exact', head: true })
      .eq('feedback_date', dateStr);

    if (e1) {
      return NextResponse.json({ error: e1.message }, { status: 500 });
    }

    const { count: myTotal, error: e2 } = await supabase
      .from('daily_dog_feedback')
      .select('id', { count: 'exact', head: true })
      .eq('feedback_date', dateStr)
      .eq('trainer_id', user.id);

    if (e2) {
      return NextResponse.json({ error: e2.message }, { status: 500 });
    }

    const { data: targetRow } = await supabase
      .from('daily_feedback_target')
      .select('target_count')
      .eq('for_date', dateStr)
      .maybeSingle();

    return NextResponse.json({
      date: dateStr,
      my_submissions_today: myTotal ?? 0,
      team_submissions_today: teamTotal ?? 0,
      daily_target: targetRow?.target_count ?? 10,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
