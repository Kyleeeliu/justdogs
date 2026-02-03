import { NextRequest, NextResponse } from 'next/server';
import { getAllDogs, getDogsByOwner, createDog } from '@/lib/supabase/dogs';
import { getServerUser, createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('owner_id');

    let dogs;
    // Admin & Trainers see all; Parents see only theirs
    if (user.role === 'admin' || user.role === 'trainer') {
      dogs = ownerId ? await getDogsByOwner(ownerId) : await getAllDogs();
    } else {
      dogs = await getDogsByOwner(user.id);
    }

    return NextResponse.json({ success: true, dogs });
  } catch (error) {
    console.error('GET /api/dogs Error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch dogs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getServerUser();
    if (!currentUser) return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });

    const body = await request.json();
    const { name, breed, owner_id } = body;

    if (!name || !breed) {
      return NextResponse.json({ success: false, error: 'Name and breed are required' }, { status: 400 });
    }

    // Determine the owner ID (Admin can assign anyone, Parents are locked to themselves)
    const finalOwnerId = currentUser.role === 'admin' ? (owner_id || currentUser.id) : currentUser.id;

    const dogData = {
      ...body,
      owner_id: finalOwnerId,
      // Ensure numeric fields are actually numbers or null
      age: body.age ? parseInt(body.age) : null,
      weight: body.weight ? parseFloat(body.weight) : null,
    };

    const dog = await createDog(dogData);

    // If createDog returns null or undefined without throwing, catch it here
    if (!dog) throw new Error("Database insertion failed");

    return NextResponse.json({ success: true, dog });
  } catch (error: any) {
    // THIS LOG IS CRITICAL: Check your VS Code Terminal for this output!
    console.error('POST /api/dogs Detailed Error:', error.message || error);
    
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'Failed to create dog' 
    }, { status: 500 });
  }
}