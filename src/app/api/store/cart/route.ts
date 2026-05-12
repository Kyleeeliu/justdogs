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

    const { data: cartItems, error } = await supabase
      .from('shopping_cart')
      .select(`
        *,
        store_items (*)
      `)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error fetching cart:', error);
      return NextResponse.json({ error: 'Failed to fetch cart' }, { status: 500 });
    }

    // Transform the data to match the expected format
    const transformedCart = cartItems.map(item => ({
      store_item_id: item.store_item_id,
      quantity: item.quantity,
      item: item.store_items
    }));

    return NextResponse.json(transformedCart);
  } catch (error) {
    console.error('Cart GET API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await request.json();
    const { store_item_id, quantity } = body;

    // Check if item already exists in cart
    const { data: existingItem } = await supabase
      .from('shopping_cart')
      .select('*')
      .eq('user_id', user.id)
      .eq('store_item_id', store_item_id)
      .single();

    if (existingItem) {
      // Update existing item quantity
      const { data: updatedItem, error } = await supabase
        .from('shopping_cart')
        .update({ quantity: existingItem.quantity + quantity })
        .eq('user_id', user.id)
        .eq('store_item_id', store_item_id)
        .select()
        .single();

      if (error) {
        console.error('Error updating cart item:', error);
        return NextResponse.json({ error: 'Failed to update cart item' }, { status: 500 });
      }

      return NextResponse.json(updatedItem);
    } else {
      // Add new item to cart
      const { data: newItem, error } = await supabase
        .from('shopping_cart')
        .insert({
          user_id: user.id,
          store_item_id,
          quantity
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding to cart:', error);
        return NextResponse.json({ error: 'Failed to add to cart' }, { status: 500 });
      }

      return NextResponse.json(newItem, { status: 201 });
    }
  } catch (error) {
    console.error('Cart POST API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const body = await request.json();
    const { store_item_id, quantity } = body;

    const { data: updatedItem, error } = await supabase
      .from('shopping_cart')
      .update({ quantity })
      .eq('user_id', user.id)
      .eq('store_item_id', store_item_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating cart item:', error);
      return NextResponse.json({ error: 'Failed to update cart item' }, { status: 500 });
    }

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error('Cart PUT API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getUserFromCookies();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get('item_id');

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('shopping_cart')
      .delete()
      .eq('user_id', user.id)
      .eq('store_item_id', itemId);

    if (error) {
      console.error('Error removing from cart:', error);
      return NextResponse.json({ error: 'Failed to remove from cart' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Cart DELETE API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}