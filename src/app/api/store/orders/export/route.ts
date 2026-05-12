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

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

    const csvRows = orders.map((order: any) => {
      const items = order.store_order_items
        .map((item: any) => `${item.store_items.name} (${item.quantity}x $${item.unit_price})`)
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