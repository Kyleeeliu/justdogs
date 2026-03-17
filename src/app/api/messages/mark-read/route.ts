import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// POST /api/messages/mark-read
// Body: { message_ids: string[] }
export async function POST(request: NextRequest) {
  const currentUser = await getServerUser(request);
  if (!currentUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { message_ids } = await request.json();
  if (!Array.isArray(message_ids) || message_ids.length === 0) {
    return NextResponse.json({ success: true, updated: 0 });
  }

  const serviceClient = getServiceRoleClient();
  if (!serviceClient) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  }

  const { error, count } = await serviceClient
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .in('id', message_ids)
    .neq('sender_id', currentUser.id) // only mark messages sent by others
    .is('read_at', null);

  if (error) {
    console.error('Error marking messages as read:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, updated: count ?? message_ids.length });
}
