import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { getServerUser } from '@/lib/supabase/server';

type OrderItemInput = {
  store_item_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

type OrderUpdateInput = {
  status: string;
  admin_notes?: string;
  approved_at?: string;
  approved_by?: string;
  collection_note?: string;
};

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Check if user is admin to see all orders
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    let query = supabase
      .from('store_orders')
      .select(`
        *,
        profiles!store_orders_user_id_fkey (full_name, email),
        store_order_items (
          *,
          store_items (name, price)
        )
      `)
      .order('created_at', { ascending: false });

    // If not admin, only show user's own orders
    if (!profile || profile.role !== 'admin') {
      query = query.eq('user_id', user.id);
    }

    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, error } = await query;

    if (error) {
      console.error('Error fetching orders:', error);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Orders GET API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getServerUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    const body = await request.json();
    const { payment_method, notes, total_amount, items } = body;

    // Validate required fields
    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Order must contain at least one item' }, { status: 400 });
    }

    // Start a transaction by creating the order first
    const { data: order, error: orderError } = await supabase
      .from('store_orders')
      .insert({
        user_id: user.id,
        payment_method,
        notes,
        total_amount,
        status: 'pending'
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    // Add order items
    const orderItems = (items as OrderItemInput[]).map((item) => ({
      order_id: order.id,
      store_item_id: item.store_item_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: item.total_price
    }));

    const { error: itemsError } = await supabase
      .from('store_order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      // Rollback: delete the order if items creation failed
      await supabase.from('store_orders').delete().eq('id', order.id);
      return NextResponse.json({ error: 'Failed to create order items' }, { status: 500 });
    }

    // Clear the user's shopping cart
    await supabase
      .from('shopping_cart')
      .delete()
      .eq('user_id', user.id);

    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    console.error('Orders POST API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getServerUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    
    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status, admin_notes, collection_note } = body;

    const updateData: OrderUpdateInput = {
      status,
      admin_notes
    };

    // If approving the order, set approval details
    if (status === 'approved') {
      updateData.approved_at = new Date().toISOString();
      updateData.approved_by = user.id;
      if (collection_note) {
        updateData.collection_note = collection_note;
      }
    }

    const { data: order, error } = await supabase
      .from('store_orders')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating order:', error);
      return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
    }

    return NextResponse.json(order);
  } catch (error) {
    console.error('Orders PUT API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}