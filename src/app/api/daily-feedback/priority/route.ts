import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedUser,
  getServiceRoleClient,
  bookingOverlapsDay,
} from '@/app/api/daily-feedback/_helpers';

type TagRow = { dog_id: string; tag: string };

function parseDateParam(url: URL): string {
  return url.searchParams.get('date') || new Date().toISOString().slice(0, 10);
}

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

    const url = new URL(request.url);
    const dateStr = parseDateParam(url);
    const limitParam = url.searchParams.get('limit');
    const limit = limitParam ? Math.min(50, Math.max(1, parseInt(limitParam, 10) || 6)) : undefined;
    const onlyOpen = url.searchParams.get('only_open') === '1';

    const { data: bookings, error: bErr } = await supabase
      .from('bookings')
      .select('dog_id, start_time, end_time, status, dogs(id, name, breed, owner_id)')
      .not('status', 'eq', 'cancelled');

    if (bErr) {
      return NextResponse.json({ error: bErr.message }, { status: 500 });
    }

    const pool = new Map<string, { id: string; name: string; breed?: string; owner_id?: string }>();
    for (const row of bookings || []) {
      if (!bookingOverlapsDay(row.start_time, row.end_time, dateStr)) continue;
      const d = row.dogs as { id: string; name: string; breed?: string; owner_id?: string } | null;
      if (d?.id) pool.set(d.id, d);
    }

    const { data: tags, error: tErr } = await supabase
      .from('dog_daily_priority_tag')
      .select('dog_id, tag')
      .eq('for_date', dateStr);

    if (tErr) {
      return NextResponse.json({ error: tErr.message }, { status: 500 });
    }

    const tagsByDog = new Map<string, string[]>();
    for (const t of (tags || []) as TagRow[]) {
      if (!pool.has(t.dog_id)) {
        const { data: dog } = await supabase
          .from('dogs')
          .select('id, name, breed, owner_id')
          .eq('id', t.dog_id)
          .single();
        if (dog) pool.set(dog.id, dog);
      }
      const arr = tagsByDog.get(t.dog_id) || [];
      arr.push(t.tag);
      tagsByDog.set(t.dog_id, arr);
    }

    const { data: allFbRows, error: fbErr } = await supabase
      .from('daily_dog_feedback')
      .select('id, feedback_date, created_at');

    if (fbErr) {
      return NextResponse.json({ error: fbErr.message }, { status: 500 });
    }

    const feedbackIds = (allFbRows || []).map((r) => r.id);
    const feedbackMeta = new Map<string, { feedback_date: string; created_at: string }>();
    for (const r of allFbRows || []) {
      feedbackMeta.set(r.id, {
        feedback_date: r.feedback_date,
        created_at: r.created_at,
      });
    }

    let junction: { feedback_id: string; dog_id: string }[] = [];
    if (feedbackIds.length > 0) {
      const { data: jRows, error: jErr } = await supabase
        .from('daily_dog_feedback_dogs')
        .select('feedback_id, dog_id')
        .in('feedback_id', feedbackIds);

      if (jErr) {
        return NextResponse.json({ error: jErr.message }, { status: 500 });
      }
      junction = (jRows || []) as { feedback_id: string; dog_id: string }[];
    }

    const fedToday = new Set<string>();
    const lastFeedbackAt = new Map<string, string>();

    for (const j of junction) {
      const meta = feedbackMeta.get(j.feedback_id);
      if (!meta) continue;
      if (meta.feedback_date === dateStr) {
        fedToday.add(j.dog_id);
      }
      const prev = lastFeedbackAt.get(j.dog_id);
      if (!prev || new Date(meta.created_at) > new Date(prev)) {
        lastFeedbackAt.set(j.dog_id, meta.created_at);
      }
    }

    const rows = Array.from(pool.values()).map((d) => {
      const tagList = tagsByDog.get(d.id) || [];
      return {
        dog_id: d.id,
        name: d.name,
        breed: d.breed,
        owner_id: d.owner_id,
        tags: tagList,
        tag_count: tagList.length,
        last_feedback_at: lastFeedbackAt.get(d.id) || null,
        fed_today: fedToday.has(d.id),
      };
    });

    rows.sort((a, b) => {
      if (b.tag_count !== a.tag_count) return b.tag_count - a.tag_count;
      const ta = a.last_feedback_at ? new Date(a.last_feedback_at).getTime() : 0;
      const tb = b.last_feedback_at ? new Date(b.last_feedback_at).getTime() : 0;
      if (ta !== tb) return ta - tb;
      return a.name.localeCompare(b.name);
    });

    let out = rows;
    if (onlyOpen) {
      out = rows.filter((r) => !r.fed_today);
    }
    if (limit != null) {
      out = out.slice(0, limit);
    }

    return NextResponse.json({ date: dateStr, dogs: out, total_ranked: rows.length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
