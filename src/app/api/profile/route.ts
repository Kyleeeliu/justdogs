import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerUser } from '@/lib/supabase/server';

export async function PUT(request: NextRequest) {
  try {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const user = await getServerUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { full_name, phone } = body;

    // Only allow updating safe fields — never role, email, approval_status
    const updates: Record<string, string> = { updated_at: new Date().toISOString() };
    if (full_name !== undefined) updates.full_name = String(full_name).trim();
    if (phone !== undefined) updates.phone = String(phone).trim();

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error } = await supabaseAdmin
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('[Profile] Update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, user: data });
  } catch (error: any) {
    console.error('[Profile] Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
