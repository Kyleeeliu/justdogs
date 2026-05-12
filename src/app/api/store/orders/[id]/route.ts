import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function getUserFromCookies() {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('sb-pajtampwqutuuidklxbv-auth-token');
  
  if (!authCookie) {
    return null;
  }

  try {
    const authData = JSON.parse(authCookie.value);
    return authData.user;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is admin to see all orders
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

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

    // If not admin, only show user's own orders
    if (!profile || profile.role !== 'admin') {
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