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
  if (!supabase) return { ...authUser, role: 'parent' as const };

  const { data: userRow } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single();

  return { ...authUser, role: (userRow?.role as string) || 'parent' };
}

type PhotoRow = {
  id: string;
  photo_url: string;
  caption?: string | null;
  photo_date: string;
  created_at: string;
  updated_at: string;
  uploaded_by: string;
  uploader?: { full_name?: string | null } | null;
  dog_photo_dogs?: Array<{ dog_id: string; dog?: { id: string; name: string } | null }>;
};

function mapPhoto(photo: PhotoRow) {
  return {
    ...photo,
    uploader_name: photo.uploader?.full_name ?? undefined,
    dogs: (photo.dog_photo_dogs || []).map((d) => d.dog).filter(Boolean),
    dog_ids: (photo.dog_photo_dogs || []).map((d) => d.dog_id),
    dog_names: (photo.dog_photo_dogs || []).map((d) => d.dog?.name).filter(Boolean) as string[],
  };
}

// GET: parents see photos of their dogs; trainers/admins see all
export async function GET(request: NextRequest) {
  try {
    const currentUser = await getAuthenticatedUser(request);
    if (!currentUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getServiceRoleClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
    }

    const { searchParams } = new URL(request.url);
    const dogId = searchParams.get('dog_id');

    const { data, error } = await supabase
      .from('dog_photos')
      .select(
        `
        *,
        uploader:users!dog_photos_uploaded_by_fkey(full_name),
        dog_photo_dogs(
          dog_id,
          dog:dogs(id, name)
        )
      `
      )
      .order('photo_date', { ascending: false });

    if (error) {
      console.error('Error fetching dog photos:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    let photos = (data || []).map((p) => mapPhoto(p as PhotoRow));

    if (currentUser.role === 'parent') {
      const { data: parentDogs } = await supabase.from('dogs').select('id').eq('owner_id', currentUser.id);
      const parentDogIds = new Set(parentDogs?.map((d) => d.id) || []);
      photos = photos.filter((p) => p.dog_ids?.some((id: string) => parentDogIds.has(id)));
    }

    if (dogId) {
      photos = photos.filter((p) => p.dog_ids?.includes(dogId));
    }

    return NextResponse.json(photos);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in GET /api/dog-photos:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: trainers/admins upload metadata after file is in storage
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
    const { photo_url, caption, photo_date, dog_ids } = body as {
      photo_url?: string;
      caption?: string;
      photo_date?: string;
      dog_ids?: string[];
    };

    if (!photo_url || !photo_date || !dog_ids || dog_ids.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: photo_url, photo_date, dog_ids' },
        { status: 400 }
      );
    }

    const { data: dogsCheck, error: dogsErr } = await supabase
      .from('dogs')
      .select('id')
      .in('id', dog_ids);

    if (dogsErr) {
      return NextResponse.json({ error: dogsErr.message }, { status: 500 });
    }
    const foundIds = new Set((dogsCheck || []).map((d) => d.id));
    const missing = dog_ids.filter((id) => !foundIds.has(id));
    if (missing.length > 0) {
      return NextResponse.json({ error: `Unknown dog id(s): ${missing.join(', ')}` }, { status: 400 });
    }

    const { data: photo, error: photoError } = await supabase
      .from('dog_photos')
      .insert({
        uploaded_by: currentUser.id,
        photo_url,
        caption: caption || null,
        photo_date,
      })
      .select()
      .single();

    if (photoError) {
      console.error('Error creating dog photo:', photoError);
      return NextResponse.json({ error: photoError.message }, { status: 500 });
    }

    const dogTags = dog_ids.map((dog_id: string) => ({
      photo_id: photo.id,
      dog_id,
    }));

    const { error: tagError } = await supabase.from('dog_photo_dogs').insert(dogTags);

    if (tagError) {
      console.error('Error tagging dogs:', tagError);
      await supabase.from('dog_photos').delete().eq('id', photo.id);
      return NextResponse.json({ error: tagError.message }, { status: 500 });
    }

    const { data: completePhoto } = await supabase
      .from('dog_photos')
      .select(
        `
        *,
        uploader:users!dog_photos_uploaded_by_fkey(full_name),
        dog_photo_dogs(
          dog_id,
          dog:dogs(id, name)
        )
      `
      )
      .eq('id', photo.id)
      .single();

    return NextResponse.json(completePhoto, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in POST /api/dog-photos:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE: trainers/admins
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

    const { error } = await supabase.from('dog_photos').delete().eq('id', photoId);

    if (error) {
      console.error('Error deleting dog photo:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('Error in DELETE /api/dog-photos:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
