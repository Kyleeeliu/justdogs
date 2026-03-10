import { NextRequest, NextResponse } from 'next/server';
import { updateDog } from '@/lib/supabase/dogs';
import { getServerUser, createSupabaseServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import { Dog } from '@/types';

// Map API rows (with nested owner) to Dog with owner_name/owner_email; strip nested relation
function mapDogsWithOwner(rows: any[]): Dog[] {
  return (rows ?? []).map((row: any) => {
    const { owner, users, ...dog } = row;
    const ownerData = owner ?? users ?? null;
    return {
      ...dog,
      owner_name: ownerData?.full_name ?? undefined,
      owner_email: ownerData?.email ?? undefined,
    } as Dog;
  });
}

// Server-side functions for fetching dogs (use server client instead of client-side functions)
async function getAllDogsServer(supabase: any): Promise<Dog[]> {
  const { data, error } = await supabase
    .from('dogs')
    .select('*, owner:users!dogs_owner_id_fkey(full_name, email)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all dogs:', error);
    throw error;
  }

  return mapDogsWithOwner((data ?? []) as any[]);
}

async function getDogsByOwnerServer(supabase: any, ownerId: string): Promise<Dog[]> {
  const { data, error } = await supabase
    .from('dogs')
    .select('*, owner:users!dogs_owner_id_fkey(full_name, email)')
    .eq('owner_id', ownerId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching dogs by owner:', error);
    throw error;
  }

  return mapDogsWithOwner((data ?? []) as any[]);
}

// Server-side function for creating dogs (only columns that exist in dogs table)
async function createDogServer(
  supabase: any,
  dogData: {
    name: string;
    breed: string;
    age: number;
    weight: number | null;
    medical_notes: string | null;
    behavioral_notes: string | null;
    owner_id: string;
  }
): Promise<Dog> {
  console.log('createDogServer: Inserting dog data:', dogData);

  const insertPayload: Record<string, unknown> = {
    name: dogData.name,
    breed: dogData.breed,
    age: Number(dogData.age) || 0,
    weight: dogData.weight != null ? Number(dogData.weight) : null,
    medical_notes: dogData.medical_notes || null,
    behavioral_notes: dogData.behavioral_notes || null,
    owner_id: dogData.owner_id,
  };

  const { data, error } = await supabase
    .from('dogs')
    .insert(insertPayload)
    .select()
    .single();

  if (error) {
    console.error('Error creating dog in database:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
    console.error('Error hint:', error.hint);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    
    // Create a more detailed error message
    let errorMsg = `Database error: ${error.message}`;
    if (error.details) {
      errorMsg += `\nDetails: ${error.details}`;
    }
    if (error.hint) {
      errorMsg += `\nHint: ${error.hint}`;
    }
    if (error.code) {
      errorMsg += `\nCode: ${error.code}`;
    }
    
    const dbError = new Error(errorMsg);
    (dbError as any).code = error.code;
    (dbError as any).details = error.details;
    (dbError as any).hint = error.hint;
    throw dbError;
  }

  if (!data) {
    throw new Error('Dog was created but no data returned');
  }

  console.log('Dog created successfully:', data.id);
  return data as Dog;
}

// Helper function to get or create user profile
async function getOrCreateUserProfile(authUser: any, supabase: any) {
  // First try to get existing profile
  const { data: userProfile, error: profileError } = await supabase
    .from('users')
    .select('id, role, full_name, email')
    .eq('id', authUser.id)
    .single();

  if (!profileError && userProfile) {
    return userProfile;
  }

  // Profile doesn't exist, try to create it
  console.log('User profile not found, attempting to create from auth data');
  const userMetadata = authUser.user_metadata || {};
  
  const newProfile = {
    id: authUser.id,
    email: authUser.email,
    full_name: userMetadata.full_name || authUser.email?.split('@')[0] || 'User',
    role: userMetadata.role || 'parent', // Default to parent
    phone: userMetadata.phone || null,
    avatar_url: userMetadata.avatar_url || null,
    approval_status: userMetadata.role === 'trainer' ? 'pending' : 'approved',
  };

  // Try to insert using service role key to bypass RLS
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (supabaseServiceKey && supabaseUrl) {
    try {
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
      } else {
        console.error('Error creating user profile with service key:', createError);
      }
    } catch (error) {
      console.error('Exception creating user profile:', error);
    }
  }

  // If service key creation fails, try with regular client (might work if RLS allows)
  const { data: createdProfile, error: createError } = await supabase
    .from('users')
    .insert(newProfile)
    .select('id, role, full_name, email')
    .single();

  if (!createError && createdProfile) {
    console.log('User profile created successfully with regular client');
    return createdProfile;
  }

  // If all else fails, return a default profile based on auth user
  console.warn('Could not create user profile, using default from auth user');
  return {
    id: authUser.id,
    email: authUser.email,
    full_name: userMetadata.full_name || authUser.email?.split('@')[0] || 'User',
    role: userMetadata.role || 'parent',
  };
}

export async function GET(request: NextRequest) {
  try {
    // Get current user for authentication and role-based access
    // Pass request to read Authorization header if present
    const authUser = await getServerUser(request);
    
    if (!authUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get or create user profile from users table to access role
    const supabase = createSupabaseServerClient(request);
    let userProfile;
    try {
      userProfile = await getOrCreateUserProfile(authUser, supabase);
    } catch (profileError) {
      console.error('Error in getOrCreateUserProfile:', profileError);
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to get or create user profile',
          details: profileError instanceof Error ? profileError.message : String(profileError),
          authUserId: authUser.id
        },
        { status: 500 }
      );
    }

    if (!userProfile) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Could not get or create user profile',
          authUserId: authUser.id
        },
        { status: 500 }
      );
    }

    // Resolve role from users table with service role so we're sure (avoids RLS/cache issues)
    let role = userProfile.role;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL) {
      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      const { data: userRow } = await adminClient
        .from('users')
        .select('role')
        .eq('id', authUser.id)
        .single();
      if (userRow?.role) {
        role = userRow.role;
      }
    }

    const { searchParams } = new URL(request.url);
    const ownerId = searchParams.get('owner_id');

    let dogs: Dog[] = [];

    // Use service role for admin/trainer so we bypass RLS and always get all dogs
    const isAdmin = role === 'admin';
    const isTrainer = role === 'trainer';
    const hasServiceKey = !!(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL);

    const supabaseAdmin = hasServiceKey
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : null;

    try {
      if (role === 'admin') {
        if (ownerId) {
          dogs = await getDogsByOwnerServer(supabaseAdmin || supabase, ownerId);
        } else {
          // Admin viewing all dogs: always use service role when available so RLS doesn't hide rows
          dogs = await getAllDogsServer(supabaseAdmin || supabase);
          if (supabaseAdmin) {
            console.log('[API] GET /api/dogs: admin using service role, dogs count =', dogs.length);
          } else {
            console.warn('[API] GET /api/dogs: SUPABASE_SERVICE_ROLE_KEY not set; admin may see no dogs if RLS restricts');
          }
        }
      } else if (role === 'parent') {
        // Use service role when available so RLS doesn't hide rows (session client may not send JWT to PostgREST)
        dogs = await getDogsByOwnerServer(supabaseAdmin || supabase, authUser.id);
      } else if (role === 'trainer') {
        dogs = await getAllDogsServer(supabaseAdmin || supabase);
      } else {
        return NextResponse.json(
          { success: false, error: 'Insufficient permissions', role },
          { status: 403 }
        );
      }
    } catch (dogsError) {
      console.error('Error fetching dogs list:', dogsError);
      const errorDetails = dogsError instanceof Error ? dogsError.message : String(dogsError);
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch dogs list',
          details: errorDetails
        },
        { status: 500 }
      );
    }

    const dogsList = Array.isArray(dogs) ? dogs : [];
    console.log('[API] GET /api/dogs: role=%s, returning %d dogs', role, dogsList.length);

    return NextResponse.json({
      success: true,
      dogs: dogsList
    });
  } catch (error) {
    console.error('Error fetching dogs:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { errorMessage, errorStack });
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch dogs',
        details: errorMessage
      },
      { status: 500 }
    );
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

    // Get or create user profile to check role
    const supabase = createSupabaseServerClient(request);
    const userProfile = await getOrCreateUserProfile(authUser, supabase);

    if (!userProfile) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Could not get or create user profile',
          authUserId: authUser.id
        },
        { status: 500 }
      );
    }

    // Only parents and admins can create dogs
    if (userProfile.role !== 'parent' && userProfile.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only parents and admins can register dogs' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      name,
      breed,
      age,
      weight,
      medical_notes,
      behavioral_notes,
      vaccine_records,
      preferences,
      emergency_contact,
      owner_id
    } = body;

    // Validate required fields
    if (!name || !breed) {
      return NextResponse.json(
        { success: false, error: 'Name and breed are required' },
        { status: 400 }
      );
    }

    // Determine the owner ID
    let finalOwnerId = authUser.id; // Default to current user
    
    // If admin is creating a dog for someone else
    if (userProfile.role === 'admin' && owner_id) {
      finalOwnerId = owner_id;
    }

    // Ensure age is a number (required field)
    const ageValue = age ? (typeof age === 'number' ? age : parseFloat(age)) : 0;
    
    const dogData = {
      name,
      breed,
      age: ageValue,
      weight: weight ? (typeof weight === 'number' ? weight : parseFloat(weight)) : null,
      medical_notes: medical_notes || null,
      behavioral_notes: behavioral_notes || null,
      owner_id: finalOwnerId
    };

    console.log('Creating dog with data:', dogData);

    // Use service role client for insert so RLS does not block (user already validated above)
    const hasServiceKey = !!(process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL);
    const supabaseForInsert = hasServiceKey
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : supabase;

    const dog = await createDogServer(supabaseForInsert, dogData);

    return NextResponse.json({
      success: true,
      dog
    });
  } catch (error) {
    console.error('Error creating dog:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorDetails = error instanceof Error ? (error as any).details : undefined;
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('Error details:', { 
      errorMessage, 
      errorDetails,
      errorStack,
      errorType: error?.constructor?.name
    });
    
    // Return a proper JSON response with error details
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create dog',
        message: errorMessage,
        details: errorDetails,
        type: error?.constructor?.name || 'Unknown'
      },
      { 
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const currentUser = await getServerUser(request);
    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { id, name, breed, age, weight, medical_notes, behavioral_notes, vaccine_records, preferences, emergency_contact } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Dog ID is required' },
        { status: 400 }
      );
    }

    // Check permissions - users can only update their own dogs unless they're admin
    // For now, we'll let updateDog handle the permission check via RLS
    const updatedDog = await updateDog(id, {
      name,
      breed,
      age: age || null,
      weight: weight || null,
      medical_notes: medical_notes || null,
      behavioral_notes: behavioral_notes || null,
      vaccine_records: vaccine_records || null,
      preferences: preferences || null,
      emergency_contact: emergency_contact || null,
    });

    if (!updatedDog) {
      return NextResponse.json(
        { success: false, error: 'Failed to update dog or dog not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      dog: updatedDog
    });
  } catch (error) {
    console.error('Error updating dog:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update dog'
      },
      { status: 500 }
    );
  }
}