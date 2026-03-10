import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerUser } from '@/lib/supabase/server';

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
  const supabase = getServiceRoleClient();
  if (!supabase) return { ...authUser, role: null as string | null };
  const { data: userRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single();
  return { ...authUser, role: userRow?.role ?? null };
}

/**
 * POST /api/admin/trainers
 * Admin creates a new trainer account with a password (no invite email) and a users row with role=trainer, approved.
 * Body: { email: string, full_name: string, phone?: string, password: string }
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminUser(request);
    if (!admin) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    if (admin.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { email, full_name, phone, password } = body;
    if (!email || typeof email !== 'string' || !full_name || typeof full_name !== 'string') {
      return NextResponse.json(
        { error: 'email and full_name are required' },
        { status: 400 }
      );
    }
    if (!password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { error: 'A password of at least 8 characters is required' },
        { status: 400 }
      );
    }

    const supabase = getServiceRoleClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Server configuration error (missing service role)' },
        { status: 500 }
      );
    }

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: {
        full_name: full_name.trim(),
        role: 'trainer',
      },
    });

    if (createError) {
      const msg = createError.message || 'Failed to create auth user';
      if (msg.includes('already been registered') || msg.includes('already exists')) {
        return NextResponse.json(
          { error: 'A user with this email is already registered. You can change their role to trainer in the Users section.' },
          { status: 409 }
        );
      }
      console.error('[admin/trainers] createUser error:', createError);
      return NextResponse.json(
        { error: msg },
        { status: 500 }
      );
    }

    const createdUser = created?.user;
    if (!createdUser?.id) {
      return NextResponse.json(
        { error: 'Auth user was created but no user id was returned' },
        { status: 500 }
      );
    }

    const { error: insertError } = await supabase.from('users').insert({
      id: createdUser.id,
      email: createdUser.email ?? email.trim().toLowerCase(),
      full_name: full_name.trim(),
      role: 'trainer',
      phone: phone ? String(phone).trim() : null,
      approval_status: 'approved',
      is_active: true,
    });

    if (insertError) {
      if (insertError.code === '23505') {
        const { error: updateError } = await supabase
          .from('users')
          .update({
            full_name: full_name.trim(),
            role: 'trainer',
            phone: phone ? String(phone).trim() : null,
            approval_status: 'approved',
            is_active: true,
            updated_at: new Date().toISOString(),
          })
          .eq('id', createdUser.id);
        if (updateError) {
          console.error('[admin/trainers] update existing user error:', updateError);
          return NextResponse.json(
            { error: 'User already exists; failed to update role to trainer' },
            { status: 500 }
          );
        }
      } else {
        console.error('[admin/trainers] insert users error:', insertError);
        return NextResponse.json(
          { error: insertError.message || 'Failed to create trainer profile' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      user: {
        id: createdUser.id,
        email: createdUser.email,
        full_name: full_name.trim(),
        role: 'trainer',
        approval_status: 'approved',
      },
      message: 'Trainer account created. Share the credentials with the trainer so they can log in.',
    });
  } catch (e) {
    console.error('[admin/trainers] unexpected error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
