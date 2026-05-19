import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function getAuthenticatedUser(request: NextRequest) {
  const authUser = await getServerUser(request);
  if (!authUser) return null;
  const supabase = getServiceRoleClient();
  if (!supabase) return { ...authUser, role: 'parent' };
  const { data: userRow } = await supabase.from('users').select('role').eq('id', authUser.id).single();
  return { ...authUser, role: userRow?.role || 'parent' };
}

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

  const supabase = getServiceRoleClient();
  if (!supabase) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const upcoming = searchParams.get('upcoming') === 'true';

  let query = supabase
    .from('farm_days')
    .select('*, trainers:trainer_id(full_name)')
    .order('date', { ascending: true });

  if (upcoming) {
    query = query.gte('date', new Date().toISOString().split('T')[0]);
  }

  const { data: farmDays, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get booking counts per farm day in one query
  const { data: counts } = await supabase
    .from('bookings')
    .select('farm_day_id')
    .not('farm_day_id', 'is', null);

  const countMap: Record<string, number> = {};
  (counts ?? []).forEach((b: any) => {
    if (b.farm_day_id) countMap[b.farm_day_id] = (countMap[b.farm_day_id] ?? 0) + 1;
  });

  const result = (farmDays ?? []).map((fd: any) => ({
    id: fd.id,
    date: fd.date,
    trainer_id: fd.trainer_id,
    trainer_name: fd.trainers?.full_name ?? null,
    max_capacity: fd.max_capacity ?? null,
    notes: fd.notes ?? null,
    total_bookings: countMap[fd.id] ?? 0,
    created_at: fd.created_at,
    updated_at: fd.updated_at,
  }));

  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  const supabase = getServiceRoleClient();
  if (!supabase) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });

  const body = await request.json();
  if (!body.date) return NextResponse.json({ error: 'Date is required' }, { status: 400 });

  const { data, error } = await supabase
    .from('farm_days')
    .insert([{
      date: body.date,
      trainer_id: body.trainer_id || null,
      max_capacity: body.max_capacity ? parseInt(body.max_capacity) : null,
      notes: body.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, farm_day: data });
}

export async function PUT(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  const supabase = getServiceRoleClient();
  if (!supabase) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });

  const { id, ...updates } = await request.json();
  if (!id) return NextResponse.json({ error: 'Farm day id is required' }, { status: 400 });

  const { data, error } = await supabase
    .from('farm_days')
    .update({
      date: updates.date,
      trainer_id: updates.trainer_id || null,
      max_capacity: updates.max_capacity ? parseInt(updates.max_capacity) : null,
      notes: updates.notes || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Farm day not found' }, { status: 404 });
  return NextResponse.json({ success: true, farm_day: data });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Admin access required' }, { status: 403 });

  const supabase = getServiceRoleClient();
  if (!supabase) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Farm day id is required' }, { status: 400 });

  const { error } = await supabase.from('farm_days').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
