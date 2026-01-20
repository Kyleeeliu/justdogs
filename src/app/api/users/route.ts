import { NextRequest, NextResponse } from 'next/server';
import { getAllUsers, getUsersByRole } from '@/lib/supabase/users';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');

    let users;
    if (role) {
      users = await getUsersByRole(role);
    } else {
      users = await getAllUsers();
    }

    return NextResponse.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch users' 
      },
      { status: 500 }
    );
  }
}