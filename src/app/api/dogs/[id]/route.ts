import { NextRequest, NextResponse } from 'next/server';
import { updateDog, deleteDog, getDogById } from '@/lib/supabase/dogs';
import { getServerUser } from '@/lib/supabase/server';

export async function GET(request: NextRequest, { params }: { params: any }) {
  const { id } = await params;
  try {
    const currentUser = await getServerUser();
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
    const currentUser = await getServerUser();
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
export async function POST(request: NextRequest) {
  try {
    const authUser = await getServerUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Use service role client to bypass RLS issues
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Get or create user profile to check role
    async function getOrCreateUserProfile(authUser: any, supabase: any) {
  // First try to get existing profile
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('id, role, full_name, email')
    .eq('id', authUser.id)
    .single();

  // If profile exists, return it
  if (!profileError && userProfile) {
    console.log('User profile found:', userProfile.id);
    return userProfile;
  }

  // Profile doesn't exist - only try to create if we got a "not found" error
  if (profileError?.code === 'PGRST116') {
    console.log('User profile not found, attempting to create from auth data');
    const userMetadata = authUser.user_metadata || {};
    
    const newProfile = {
      id: authUser.id,
      email: authUser.email,
      full_name: userMetadata.full_name || authUser.email?.split('@')[0] || 'User',
      role: userMetadata.role || 'parent',
      phone: userMetadata.phone || null,
      avatar_url: userMetadata.avatar_url || null,
      approval_status: userMetadata.role === 'trainer' ? 'pending' : 'approved',
    };

    // Use service role key to create profile
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (supabaseServiceKey && supabaseUrl) {
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });

      const { data: createdProfile, error: createError } = await supabaseAdmin
        .from('users')
        .insert(newProfile)
        .select('id, role, full_name, email')
        .single();

      if (!createError && createdProfile) {
        console.log('User profile created successfully');
        return createdProfile;
      }
      
      console.error('Error creating user profile:', createError);
    }
  }

  // If we got here, just return what we know from auth
  console.log('Using auth user data as fallback profile');
  return {
    id: authUser.id,
    email: authUser.email,
    full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User',
    role: authUser.user_metadata?.role || 'parent',
  };
}
export async function DELETE(request: NextRequest, { params }: { params: any }) {
  const { id } = await params;
  try {
    const currentUser = await getServerUser();
    if (currentUser?.role !== 'admin') {
      return NextResponse.json({ success: false, error: 'Only admins can delete' }, { status: 403 });
    }

    await deleteDog(id);
    return NextResponse.json({ success: true, message: 'Deleted' });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Delete failed' }, { status: 500 });
  }
}