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
  if (!supabase) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

  const { data, error } = await supabase
    .from('booking_types')
    .select('*')
    .eq('is_active', true)
    .order('category')
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const supabase = getServiceRoleClient();
  if (!supabase) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

  const body = await request.json();
  const { name, category, duration_minutes, price_per_dog } = body;
  if (!name || !category || !duration_minutes) {
    return NextResponse.json({ error: 'name, category, and duration_minutes are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('booking_types')
    .insert([{ name, category, duration_minutes: Number(duration_minutes), price_per_dog: Number(price_per_dog) || 0, is_active: true }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, bookingType: data });
}

export async function PUT(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const supabase = getServiceRoleClient();
  if (!supabase) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

  const { id, ...updates } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  const { data, error } = await supabase
    .from('booking_types')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, bookingType: data });
}

export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  if (user.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

  const supabase = getServiceRoleClient();
  if (!supabase) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

  const { error } = await supabase.from('booking_types').update({ is_active: false }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
