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

    const url = new URL(request.url);
    const dogId = url.searchParams.get('dog_id');
    const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '40', 10)));

    let feedbackRows: Record<string, unknown>[] = [];

    if (dogId) {
      const { data: fbIds, error: e1 } = await supabase
        .from('daily_dog_feedback_dogs')
        .select('feedback_id')
        .eq('dog_id', dogId);

      if (e1) {
        return NextResponse.json({ error: e1.message }, { status: 500 });
      }
      const ids = [...new Set((fbIds || []).map((r) => r.feedback_id))];
      if (ids.length === 0) {
        return NextResponse.json({ items: [] });
      }
      const { data, error } = await supabase
        .from('daily_dog_feedback')
        .select('id, trainer_id, feedback_date, body_text, photo_url, created_at')
        .in('id', ids)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      feedbackRows = data || [];
    } else {
      const { data, error } = await supabase
        .from('daily_dog_feedback')
        .select('id, trainer_id, feedback_date, body_text, photo_url, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      feedbackRows = data || [];
    }

    const fbIds = feedbackRows.map((r) => r.id as string);
    const junctionByFb = new Map<string, { dog_id: string; name: string }[]>();
    if (fbIds.length) {
      const { data: links, error: lErr } = await supabase
        .from('daily_dog_feedback_dogs')
        .select('feedback_id, dog_id, dogs(name)')
        .in('feedback_id', fbIds);

      if (lErr) {
        return NextResponse.json({ error: lErr.message }, { status: 500 });
      }

      for (const row of links || []) {
        const fid = row.feedback_id as string;
        const dog = row.dogs as { name: string } | null;
        const arr = junctionByFb.get(fid) || [];
        arr.push({ dog_id: row.dog_id as string, name: dog?.name || '' });
        junctionByFb.set(fid, arr);
      }
    }

    const trainerIds = [...new Set(feedbackRows.map((r) => r.trainer_id as string))];
    let names: Record<string, string> = {};
    if (trainerIds.length) {
      const { data: users } = await supabase
        .from('users')
        .select('id, full_name')
        .in('id', trainerIds);
      for (const u of users || []) {
        names[u.id] = u.full_name || '';
      }
    }

    const items = feedbackRows.map((row) => {
      const links = junctionByFb.get(row.id as string) || [];
      return {
        id: row.id,
        trainer_id: row.trainer_id,
        trainer_name: names[row.trainer_id as string] || '',
        feedback_date: row.feedback_date,
        body_text: row.body_text,
        photo_url: row.photo_url,
        created_at: row.created_at,
        dog_ids: links.map((l) => l.dog_id),
        dog_names: links.map((l) => l.name).filter(Boolean),
      };
    });

    return NextResponse.json({ items });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user || !['trainer', 'admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = getServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const body = await request.json();
    const { feedback_date, body_text, photo_url, dog_ids } = body as {
      feedback_date?: string;
      body_text?: string;
      photo_url?: string | null;
      dog_ids?: string[];
    };

    const dateStr = feedback_date || new Date().toISOString().slice(0, 10);
    const text = (body_text || '').trim();
    if (!text) {
      return NextResponse.json({ error: 'body_text is required' }, { status: 400 });
    }
    if (!dog_ids || !Array.isArray(dog_ids) || dog_ids.length === 0) {
      return NextResponse.json({ error: 'dog_ids must be a non-empty array' }, { status: 400 });
    }

    const uniqueIds = [...new Set(dog_ids)];
    const { data: dogsOk, error: dErr } = await supabase
      .from('dogs')
      .select('id')
      .in('id', uniqueIds);

    if (dErr) {
      return NextResponse.json({ error: dErr.message }, { status: 500 });
    }
    if ((dogsOk || []).length !== uniqueIds.length) {
      return NextResponse.json({ error: 'One or more dog_ids are invalid' }, { status: 400 });
    }

    const { data: fb, error: iErr } = await supabase
      .from('daily_dog_feedback')
      .insert({
        trainer_id: user.id,
        feedback_date: dateStr,
        body_text: text,
        photo_url: photo_url || null,
      })
      .select()
      .single();

    if (iErr) {
      return NextResponse.json({ error: iErr.message }, { status: 500 });
    }

    const junction = uniqueIds.map((dog_id) => ({
      feedback_id: fb.id,
      dog_id,
    }));

    const { error: jErr } = await supabase.from('daily_dog_feedback_dogs').insert(junction);

    if (jErr) {
      await supabase.from('daily_dog_feedback').delete().eq('id', fb.id);
      return NextResponse.json({ error: jErr.message }, { status: 500 });
    }

    return NextResponse.json({ ...fb, dog_ids: uniqueIds }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
