import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase';
import { getServerUser } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = createServiceRoleClient();

    const { data: items, error } = await supabase
      .from('store_items')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error) {
      console.error('Error fetching store items:', error);
      return NextResponse.json({ error: 'Failed to fetch store items' }, { status: 500 });
    }

    return NextResponse.json(items);
  } catch (error) {
    console.error('Store items API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const body = await request.json();
    const user = await getServerUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { name, description, photo_url, tags, price, stock_quantity } = body;

    const { data: item, error } = await supabase
      .from('store_items')
      .insert({
        name,
        description,
        photo_url,
        tags,
        price,
        stock_quantity,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating store item:', error);
      return NextResponse.json({ error: 'Failed to create store item' }, { status: 500 });
    }

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('Store items POST API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();
    const body = await request.json();
    const user = await getServerUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id, name, description, photo_url, tags, price, stock_quantity, is_active } = body;

    const { data: item, error } = await supabase
      .from('store_items')
      .update({
        name,
        description,
        photo_url,
        tags,
        price,
        stock_quantity,
        is_active
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating store item:', error);
      return NextResponse.json({ error: 'Failed to update store item' }, { status: 500 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Store items PUT API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}