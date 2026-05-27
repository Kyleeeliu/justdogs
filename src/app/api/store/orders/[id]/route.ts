import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { getServerUser } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getServerUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    const { data: userRow } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = userRow?.role === 'admin';

    // Build the query based on user role
    let queryBuilder = supabase
      .from('store_orders')
      .select(`
        *,
        store_order_items (
          *,
          store_items (name, price)
        )
      `)
      .eq('id', params.id);

    if (!isAdmin) {
      queryBuilder = queryBuilder.eq('user_id', user.id);
    }

    const { data: order, error } = await queryBuilder.single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }
      console.error('Error fetching order:', error);
      return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Order GET API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}