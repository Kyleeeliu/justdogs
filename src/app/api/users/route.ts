import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, getUsersByRole } from '@/lib/supabase/users';
import { getServerUser, createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getAdminUser(request: NextRequest) {
  const authUser = await getServerUser(request);
  if (!authUser) return null;

  const supabase = createSupabaseServerClient(request);

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', authUser.id)
    .single();

  if (profile?.role) return { ...authUser, role: profile.role };

  const { data: userRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single();

  let role = userRow?.role;
  if (role === undefined && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const anon = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    const { data: row } = await anon.from('users').select('role').eq('id', authUser.id).single();
    role = row?.role;
  }

  return { ...authUser, role: role || 'parent' };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    // Use service role to bypass RLS — anon client silently returns empty when policies block reads
    const supabase = getServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Server configuration error' }, { status: 500 });
    }

    let query = supabase.from('users').select('*').order('created_at', { ascending: false });
    if (role) query = query.eq('role', role) as typeof query;

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, users: data ?? [] });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAdminUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabase = getServiceRoleClient() ?? createSupabaseServerClient(request);

    const { data, error } = await supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: data });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}