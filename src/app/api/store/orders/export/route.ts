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
  profiles: {
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

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Fetch all orders with related data
    const { data: orders, error } = await supabase
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

    if (error) {
      console.error('Error fetching orders for export:', error);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

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

    const csvRows = (orders as ExportOrder[]).map((order) => {
      const items = order.store_order_items
        .map((item) => `${item.store_items.name} (${item.quantity}x $${item.unit_price})`)
        .join('; ');

      return [
        order.order_number,
        order.profiles.full_name,
        order.profiles.email,
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