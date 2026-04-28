import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getServerUser } from '@/lib/supabase/server';

function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

async function getAuthenticatedUser(request: NextRequest) {
  const authUser = await getServerUser(request);
  if (!authUser) return null;

  const supabase = getServiceRoleClient();
  if (!supabase) return { ...authUser, role: 'parent' };

  const { data: userRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single();

  return { ...authUser, role: userRow?.role || 'parent' };
}

// GET: Fetch farm photos (for parents: their dogs only, for trainers/admins: all)
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    console.log('Farm photos GET - current user:', currentUser?.id, currentUser?.role);
    if (!currentUser) {
      console.error('Farm photos GET - no user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceRoleClient();
    if (!supabase) {
      console.error('Farm photos GET - no service role client');
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('booking_id');
    const dogId = searchParams.get('dog_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = supabase
      .from('farm_photos')
      .select(`
        *,
        uploader:users!farm_photos_uploaded_by_fkey(full_name),
        booking:bookings!farm_photos_booking_id_fkey(id, parent_id, dog_id, start_time),
        farm_photo_dogs(
          dog_id,
          dog:dogs(id, name)
        )
      `)
      .order('photo_date', { ascending: false });

    // Apply filters
    if (bookingId) {
      query = query.eq('booking_id', bookingId);
    }
    if (startDate) {
      query = query.gte('photo_date', startDate);
    }
    if (endDate) {
      query = query.lte('photo_date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching farm photos:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Transform data to include dog info
    const photos = (data || []).map((photo: any) => ({
      ...photo,
      uploader_name: photo.uploader?.full_name,
      dogs: (photo.farm_photo_dogs || []).map((fpd: any) => fpd.dog).filter(Boolean),
      dog_ids: (photo.farm_photo_dogs || []).map((fpd: any) => fpd.dog_id),
      dog_names: (photo.farm_photo_dogs || []).map((fpd: any) => fpd.dog?.name).filter(Boolean),
    }));

    // If parent, filter to only their dogs
    if (currentUser.role === 'parent') {
      const { data: parentDogs } = await supabase
        .from('dogs')
        .select('id')
        .eq('owner_id', currentUser.id);
      
      const parentDogIds = new Set(parentDogs?.map(d => d.id) || []);
      
      const filteredPhotos = photos.filter((photo: any) => 
        photo.dog_ids?.some((dogId: string) => parentDogIds.has(dogId))
      );

      return NextResponse.json(filteredPhotos);
    }

    // If dogId filter specified, filter photos
    if (dogId) {
      const filteredPhotos = photos.filter((photo: any) => 
        photo.dog_ids?.includes(dogId)
      );
      return NextResponse.json(filteredPhotos);
    }

    return NextResponse.json(photos);
  } catch (error: any) {
    console.error('Error in GET /api/farm-photos:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// POST: Upload a new farm photo (trainers/admins only)
export async function POST(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser || !['trainer', 'admin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = getServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const body = await request.json();
    const { booking_id, photo_url, caption, photo_date, dog_ids } = body;

    if (!booking_id || !photo_url || !photo_date || !dog_ids || dog_ids.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: booking_id, photo_url, photo_date, dog_ids' },
        { status: 400 }
      );
    }

    // Insert photo
    const { data: photo, error: photoError } = await supabase
      .from('farm_photos')
      .insert({
        booking_id,
        uploaded_by: currentUser.id,
        photo_url,
        caption,
        photo_date,
      })
      .select()
      .single();

    if (photoError) {
      console.error('Error creating farm photo:', photoError);
      return NextResponse.json({ error: photoError.message }, { status: 500 });
    }

    // Insert dog tags
    const dogTags = dog_ids.map((dog_id: string) => ({
      photo_id: photo.id,
      dog_id,
    }));

    const { error: tagError } = await supabase
      .from('farm_photo_dogs')
      .insert(dogTags);

    if (tagError) {
      console.error('Error tagging dogs:', tagError);
      // Rollback photo if tagging fails
      await supabase.from('farm_photos').delete().eq('id', photo.id);
      return NextResponse.json({ error: tagError.message }, { status: 500 });
    }

    // Fetch complete photo with dogs
    const { data: completePhoto } = await supabase
      .from('farm_photos')
      .select(`
        *,
        uploader:users!farm_photos_uploaded_by_fkey(full_name),
        farm_photo_dogs(
          dog_id,
          dog:dogs(id, name)
        )
      `)
      .eq('id', photo.id)
      .single();

    return NextResponse.json(completePhoto, { status: 201 });
  } catch (error: any) {
    console.error('Error in POST /api/farm-photos:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}

// DELETE: Remove a farm photo (trainers/admins only)
export async function DELETE(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser || !['trainer', 'admin'].includes(currentUser.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const supabase = getServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('id');

    if (!photoId) {
      return NextResponse.json({ error: 'Photo ID required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('farm_photos')
      .delete()
      .eq('id', photoId);

    if (error) {
      console.error('Error deleting farm photo:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error in DELETE /api/farm-photos:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
