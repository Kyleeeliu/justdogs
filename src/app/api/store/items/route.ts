import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await request.json();

    // Verify user is admin
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('sb-pajtampwqutuuidklxbv-auth-token');
    
    if (!authCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the auth cookie to get user info
    let user;
    try {
      const authData = JSON.parse(authCookie.value);
      user = authData.user;
    } catch {
      return NextResponse.json({ error: 'Invalid auth token' }, { status: 401 });
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await request.json();

    // Verify user is admin
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('sb-pajtampwqutuuidklxbv-auth-token');
    
    if (!authCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let user;
    try {
      const authData = JSON.parse(authCookie.value);
      user = authData.user;
    } catch {
      return NextResponse.json({ error: 'Invalid auth token' }, { status: 401 });
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