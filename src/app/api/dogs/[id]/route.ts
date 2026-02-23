import { NextRequest, NextResponse } from 'next/server';
import { updateDog, deleteDog, getDogById } from '@/lib/supabase/dogs';
import { getServerUser } from '@/lib/supabase/server';

export async function GET(request: NextRequest, { params }: { params: any }) {
  const { id } = await params;
  try {
    const currentUser = await getServerUser(request);
    const dog = await getDogById(id);
    if (!dog) return NextResponse.json({ success: false, error: 'Dog not found' }, { status: 404 });

    // Access Control
    if (currentUser?.role === 'parent' && dog.owner_id !== currentUser.id) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    return NextResponse.json({ success: true, dog });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Fetch failed' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: any }) {
  const { id } = await params;
  try {
    const currentUser = await getServerUser(request);
    if (!currentUser || currentUser.role === 'trainer') {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 403 });
    }

    const existingDog = await getDogById(id);
    if (!existingDog) return NextResponse.json({ success: false, error: 'Dog not found' }, { status: 404 });

    // Parents can only update their own
    if (currentUser.role === 'parent' && existingDog.owner_id !== currentUser.id) {
      return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
    }

    const body = await request.json();
    const updatedDog = await updateDog(id, body);

    return NextResponse.json({ success: true, dog: updatedDog });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: any }) {
  const { id } = await params;
  try {
    const currentUser = await getServerUser(request);
    if (currentUser?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only admins can delete' }, { status: 403 });
    }

    await deleteDog(id);
    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 });
  }
}