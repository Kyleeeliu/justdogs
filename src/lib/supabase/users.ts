import { supabase } from './client';
import { User } from '@/types';
import * as localUsers from '../database/users';

// Supabase table name for users
const USERS_TABLE = 'users';

export const createUser = async (userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> => {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .insert([{
      email: userData.email,
      full_name: userData.full_name,
      role: userData.role,
      phone: userData.phone,
      ...(userData.approval_status && { approval_status: userData.approval_status }),
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating user:', error);
    throw error;
  }

  return data as User;
};

export const getAllUsers = async (): Promise<User[]> => {
  // Check if Supabase is properly configured
  const isSupabaseConfigured = () => {
    return process.env.NEXT_PUBLIC_SUPABASE_URL &&
           process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
           process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co';
  };

  if (!isSupabaseConfigured()) {
    console.log('Supabase not configured, using local database for users');
    return localUsers.getAllUsers();
  }

  try {
    console.log('Fetching all users from Supabase...');
    const { data, error } = await supabase
      .from(USERS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users from Supabase:', error);
      console.log('Falling back to local database');
      return localUsers.getAllUsers();
    }

    console.log('Successfully fetched users from Supabase:', data?.length || 0);
    return (data || []) as User[];
  } catch (error) {
    console.error('Failed to fetch users from Supabase, falling back to local database:', error);
    return localUsers.getAllUsers();
  }
};

export const getUserById = async (id: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase
      .from(USERS_TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('Error fetching user by ID:', error);
      throw error;
    }

    return data as User;
  } catch (error) {
    console.error('Failed to fetch user by ID:', error);
    return null;
  }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    console.log('getUserByEmail: Fetching user by email:', email);
    
    const { data, error } = await supabase
      .from(USERS_TABLE)
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      // Log the error but don't make a big deal about it
      console.log('getUserByEmail: Query returned error (this is expected when not logged in):', {
        code: error?.code,
        message: error?.message,
        statusCode: (error as any)?.statusCode,
      });
      return null;
    }

    if (!data) {
      console.log('getUserByEmail: No user found for email:', email);
      return null;
    }

    console.log('getUserByEmail: Successfully fetched user:', data.email);
    return data as User;
  } catch (error) {
    console.log('getUserByEmail: Exception caught:', {
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
};

export const updateUser = async (id: string, updates: Partial<Omit<User, 'id' | 'created_at'>>): Promise<User | null> => {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating user:', error);
    return null;
  }

  return data as User;
};

export const deleteUser = async (id: string): Promise<boolean> => {
  const { error } = await supabase
    .from(USERS_TABLE)
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting user:', error);
    return false;
  }

  return true;
};

export const searchUsers = async (searchTerm: string, role?: string): Promise<User[]> => {
  let query = supabase
    .from(USERS_TABLE)
    .select('*')
    .or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);

  if (role) {
    query = query.eq('role', role);
  }

  const { data, error } = await query.order('created_at', { ascending: false });

  if (error) {
    console.error('Error searching users:', error);
    return [];
  }

  return (data || []) as User[];
};

export const getUsersByRole = async (role: string): Promise<User[]> => {
  const { data, error } = await supabase
    .from(USERS_TABLE)
    .select('*')
    .eq('role', role)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching users by role:', error);
    return [];
  }

  return (data || []) as User[];
};

// Get current user from Supabase auth and sync with users table
export const getCurrentSupabaseUser = async (): Promise<User | null> => {
  try {
    // First check if there's an active session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session:', sessionError);
      return null;
    }
    
    if (!session || !session.user) {
      // No active session - this is completely normal when not logged in
      // Don't log anything - this is expected behavior
      return null;
    }

    console.log('getCurrentSupabaseUser: Active session found for:', session.user.email);

    // Now get user profile from users table
    // Since we have a session, RLS will allow us to read our own user data
    const user = await getUserByEmail(session.user.email!);
    
    if (!user) {
      console.warn('getCurrentSupabaseUser: User profile not found in database for:', session.user.email);
      console.warn('This user may need to be added to the users table manually');
      return null;
    }

    console.log('getCurrentSupabaseUser: User profile loaded successfully');
    return user;
  } catch (error) {
    console.error('getCurrentSupabaseUser: Unexpected exception:', {
      message: error instanceof Error ? error.message : 'Unknown error',
    });
    return null;
  }
};