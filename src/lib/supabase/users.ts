import { supabase } from './client';
import { User } from '@/types';

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

  return data;
};

export const getAllUsers = async (): Promise<User[]> => {
  try {
    console.log('Fetching all users from Supabase...');
    const { data, error } = await supabase
      .from(USERS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users from Supabase:', error);
      throw error;
    }

    console.log('Successfully fetched users from Supabase:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('Failed to fetch users:', error);
    throw error;
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

    return data;
  } catch (error) {
    console.error('Failed to fetch user by ID:', error);
    return null;
  }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  try {
    console.log('Fetching user by email:', email);
    
    const { data, error } = await supabase
      .from(USERS_TABLE)
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (error) {
      // Log all possible error properties
      console.error('Error fetching user by email:', {
        error,
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        stringified: JSON.stringify(error),
        keys: Object.keys(error),
      });
      
      // Don't throw - just return null
      // The user might not exist yet or there might be a connection issue
      console.log('Returning null due to error');
      return null;
    }

    if (!data) {
      console.log('No user found for email:', email);
      return null;
    }

    console.log('Successfully fetched user:', data.email);
    return data;
  } catch (error) {
    console.error('Exception in getUserByEmail:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
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

  return data;
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

  return data || [];
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

  return data || [];
};

// Get current user from Supabase auth and sync with users table
export const getCurrentSupabaseUser = async (): Promise<User | null> => {
  try {
    // First get the authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Error getting authenticated user:', authError);
      return null;
    }
    
    if (!authUser || !authUser.email) {
      // This is normal - no one is logged in yet
      console.log('No authenticated user (not logged in)');
      return null;
    }

    console.log('Auth user found:', authUser.email);

    // Get user profile from users table
    const user = await getUserByEmail(authUser.email);
    
    if (!user) {
      console.log('User profile not found in database for:', authUser.email);
      console.log('Note: User profile should be created automatically via database trigger on signup');
      return null;
    }

    console.log('User profile found:', user.email);
    return user;
  } catch (error) {
    console.error('Exception in getCurrentSupabaseUser:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    return null;
  }
};