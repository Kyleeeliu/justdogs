import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/supabase.d';

// This API route uses the service role key to bypass RLS
// It should only be called from the client after successful signup

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, email, fullName, role, phone, avatarUrl, approvalStatus } = body;

    // Validate required fields
    if (!userId || !email || !fullName || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: userId, email, fullName, role' },
        { status: 400 }
      );
    }

    // Get service role key from environment
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase service role key');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Create admin client with service role key (bypasses RLS)
    const supabaseAdmin = createClient<Database>(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Insert user profile
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email: email,
        full_name: fullName,
        role: role,
        phone: phone || null,
        avatar_url: avatarUrl || null,
        approval_status: approvalStatus || (role === 'trainer' ? 'pending' : 'approved'),
      })
      .select()
      .single();

    if (error) {
      // If user already exists, that's okay - return success
      if (error.code === '23505') { // Unique violation
        console.log('User profile already exists, fetching existing profile');
        const { data: existingUser } = await supabaseAdmin
          .from('users')
          .select('*')
          .eq('id', userId)
          .single();
        
        if (existingUser) {
          return NextResponse.json({ user: existingUser }, { status: 200 });
        }
      }
      
      console.error('Error creating user profile:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create user profile' },
        { status: 500 }
      );
    }

    return NextResponse.json({ user: data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in create-profile API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
