import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { getServerUser } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    const { error } = await supabase
      .from('shopping_cart')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error clearing cart:', error);
      return NextResponse.json({ error: 'Failed to clear cart' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cart clear API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}