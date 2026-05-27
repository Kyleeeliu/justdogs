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

    const { data: userRow } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = userRow?.role === 'admin';

    let query = supabase
      .from('store_orders')
      .select(`
        *,
        store_order_items (
          *,
          store_items (name, price)
        )
      `)
      .order('created_at', { ascending: false });

    if (!isAdmin) {
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

    const orderList = orders ?? [];
    const userIds = [...new Set(orderList.map((o) => o.user_id))];
    let userMap = new Map<string, { full_name: string; email: string }>();

    if (userIds.length > 0) {
      const { data: orderUsers, error: usersError } = await supabase
        .from('users')
        .select('id, full_name, email')
        .in('id', userIds);

      if (usersError) {
        console.error('Error fetching order customers:', usersError);
      } else {
        userMap = new Map(
          (orderUsers ?? []).map((u) => [u.id, { full_name: u.full_name, email: u.email }])
        );
      }
    }

    const ordersWithUsers = orderList.map((order) => ({
      ...order,
      users: userMap.get(order.user_id) ?? { full_name: 'Unknown', email: '' },
    }));

    return NextResponse.json(ordersWithUsers);
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

    // Notify all admins about the new order (best-effort; don't fail order on message errors).
    try {
      const { data: orderingUser } = await supabase
        .from('users')
        .select('full_name, email')
        .eq('id', user.id)
        .maybeSingle();

      const { data: admins, error: adminsError } = await supabase
        .from('users')
        .select('id')
        .eq('role', 'admin');

      if (adminsError) {
        console.error('Failed to fetch admins for order notification:', adminsError);
      } else if (admins && admins.length > 0) {
        const orderRef = (order as any).order_number || order.id;
        const customerName = orderingUser?.full_name || user.email || 'A customer';
        const total = typeof total_amount === 'number' ? total_amount.toFixed(2) : String(total_amount);

        const storeItemIds = (items as OrderItemInput[]).map((item) => item.store_item_id);
        const { data: storeItems } = await supabase
          .from('store_items')
          .select('id, name')
          .in('id', storeItemIds);
        const nameById = new Map((storeItems || []).map((si: any) => [si.id, si.name]));
        const itemSummary = (items as OrderItemInput[])
          .map((item) => `${nameById.get(item.store_item_id) || 'item'} x${item.quantity}`)
          .join(', ');

        const adminMessages = admins.map((admin) => ({
          sender_id: user.id,
          recipient_id: admin.id,
          subject: `New order: ${customerName}`,
          content: `${customerName} ordered ${itemSummary} (Order ${orderRef}, Total R${total}).`,
          message_type: 'text',
          is_announcement: false,
        }));

        const { error: messageError } = await supabase.from('messages').insert(adminMessages);
        if (messageError) {
          console.error('Failed to create admin order notifications:', messageError);
        }
      }
    } catch (notificationError) {
      console.error('Unexpected admin order notification error:', notificationError);
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
    
    const { data: userRow } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userRow?.role !== 'admin') {
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