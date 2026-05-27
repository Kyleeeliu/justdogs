import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { getServerUser } from '@/lib/supabase/server';

type ExportOrderItem = {
  quantity: number;
  unit_price: number;
  store_items: {
    name: string;
  };
};

type ExportOrder = {
  order_number: string;
  status: string;
  payment_method: string;
  total_amount: number;
  notes: string | null;
  admin_notes: string | null;
  collection_note: string | null;
  created_at: string;
  approved_at: string | null;
  users: {
    full_name: string;
    email: string;
  };
  store_order_items: ExportOrderItem[];
};

export async function GET(request: NextRequest) {
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

    const { data: orders, error } = await supabase
      .from('store_orders')
      .select(`
        *,
        store_order_items (
          *,
          store_items (name, price)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders for export:', error);
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
        console.error('Error fetching order customers for export:', usersError);
        return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
      }

      userMap = new Map(
        (orderUsers ?? []).map((u) => [u.id, { full_name: u.full_name, email: u.email }])
      );
    }

    const ordersWithUsers = orderList.map((order) => ({
      ...order,
      users: userMap.get(order.user_id) ?? { full_name: 'Unknown', email: '' },
    }));

    // Generate CSV content
    const csvHeaders = [
      'Order Number',
      'Customer Name',
      'Customer Email',
      'Status',
      'Payment Method',
      'Total Amount',
      'Items',
      'Customer Notes',
      'Admin Notes',
      'Collection Note',
      'Created Date',
      'Approved Date'
    ];

    const csvRows = (ordersWithUsers as ExportOrder[]).map((order) => {
      const items = order.store_order_items
        .map((item) => `${item.store_items.name} (${item.quantity}x R${item.unit_price})`)
        .join('; ');

      return [
        order.order_number,
        order.users.full_name,
        order.users.email,
        order.status,
        order.payment_method,
        order.total_amount,
        items,
        order.notes || '',
        order.admin_notes || '',
        order.collection_note || '',
        new Date(order.created_at).toLocaleDateString(),
        order.approved_at ? new Date(order.approved_at).toLocaleDateString() : ''
      ];
    });

    // Convert to CSV format
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => 
        row.map(field => 
          // Escape fields that contain commas, quotes, or newlines
          typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))
            ? `"${field.replace(/"/g, '""')}"` 
            : field
        ).join(',')
      )
    ].join('\n');

    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="store-orders-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error) {
    console.error('Orders export API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}