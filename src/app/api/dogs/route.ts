import { NextRequest, NextResponse } from 'next/server';
import { getAllDogs, getDogsByOwner, createDog } from '@/lib/supabase/dogs';
import { getServerUser } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    // Get current user for authentication and role-based access
    const user = await getServerUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('owner_id');

    let dogs;
    
    // Role-based access control
    if (user.role === 'admin') {
      // Admin can see all dogs or filter by owner
      if (ownerId) {
        dogs = await getDogsByOwner(ownerId);
      } else {
        dogs = await getAllDogs();
      }
    } else if (user.role === 'parent') {
      // Parents can only see their own dogs
      dogs = await getDogsByOwner(user.id);
    } else if (user.role === 'trainer') {
      // Trainers can see all dogs (for booking purposes)
      dogs = await getAllDogs();
    } else {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      dogs
    });
  } catch (error) {
    console.error('Error fetching dogs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dogs'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getServerUser();
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only parents and admins can create dogs
    if (currentUser.role !== 'parent' && currentUser.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only parents and admins can register dogs' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, breed, age, weight, medical_notes, behavioral_notes, owner_id } = body;

    // Validate required fields
    if (!name || !breed) {
      return NextResponse.json(
        { success: false, error: 'Name and breed are required' },
        { status: 400 }
      );
    }

    // Determine the owner ID
    let finalOwnerId = currentUser.id; // Default to current user
    
    // If admin is creating a dog for someone else
    if (currentUser.role === 'admin' && owner_id) {
      finalOwnerId = owner_id;
    }

    const dogData = {
      name,
      breed,
      age: age || null,
      weight: weight || null,
      medical_notes: medical_notes || null,
      behavioral_notes: behavioral_notes || null,
      owner_id: finalOwnerId
    };

    const dog = await createDog(dogData);

    return NextResponse.json({
      success: true,
      dog
    });
  } catch (error) {
    console.error('Error creating dog:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create dog'
      },
      { status: 500 }
    );
  }
}