import { supabase } from './client';
import { User } from '@/types';
import * as localUsers from '../database/users';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key';

// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
  return process.env.NEXT_PUBLIC_SUPABASE_URL &&
         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
         process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://placeholder.supabase.co';
};

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
      avatar_url: userData.avatar_url,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
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
  if (!isSupabaseConfigured()) {
    console.log('Using local database for user retrieval (Supabase not configured)');
    return localUsers.getAllUsers();
  }

  // Check if we're in mock mode by testing the supabase client
  const isMockMode = supabaseUrl === 'https://placeholder.supabase.co' || supabaseAnonKey === 'placeholder-key';
  if (isMockMode) {
    console.log('Using local database for user retrieval (Mock mode)');
    return localUsers.getAllUsers();
  }

  try {
    console.log('Attempting to fetch users from Supabase...');
    const { data, error } = await supabase
      .from(USERS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users from Supabase:', {
        message: error.message || 'No message',
        code: error.code || 'No code',
        details: error.details || 'No details',
        hint: error.hint || 'No hint',
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
      });
      throw error;
    }

    console.log('Successfully fetched users from Supabase:', data?.length || 0, 'users');
    return data || [];
  } catch (error) {
    console.error('Supabase user retrieval failed, falling back to local database:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
    });
    return localUsers.getAllUsers();
  }
};

export const getUserById = async (id: string): Promise<User | null> => {
  if (!isSupabaseConfigured()) {
    console.log('Using local database for user retrieval by ID');
    return localUsers.getUserById(id) || null;
  }

  try {
    const { data, error } = await supabase
      .from(USERS_TABLE)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching user by ID from Supabase:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Supabase user by ID retrieval failed, falling back to local database:', error);
    return localUsers.getUserById(id) || null;
  }
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  if (!isSupabaseConfigured()) {
    console.log('Using local database for user retrieval by email');
    return localUsers.getUserByEmail(email) || null;
  }

  try {
    console.log('Attempting to fetch user by email from Supabase:', email);
    
    const { data, error } = await supabase
      .from(USERS_TABLE)
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      // Handle specific Supabase errors
      if (error.code === 'PGRST116') {
        // No rows returned - user doesn't exist
        console.log('User not found in Supabase:', email);
        return null;
      }
      
      // Log error with all possible properties
      const errorInfo = {
        message: error.message || 'Unknown error',
        code: error.code || 'No code',
        details: error.details || 'No details',
        hint: error.hint || 'No hint'
      };
      
      console.log('Error fetching user by email from Supabase - Message:', error.message || 'No message');
      console.log('Error fetching user by email from Supabase - Code:', error.code || 'No code');
      console.log('Error fetching user by email from Supabase - Details:', error.details || 'No details');
      console.log('Error fetching user by email from Supabase - Hint:', error.hint || 'No hint');
      console.log('Full error object stringified:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
      
      // For other errors, fall back to local database
      console.log('Falling back to local database due to Supabase error');
      return localUsers.getUserByEmail(email) || null;
    }

    console.log('Successfully fetched user from Supabase:', data?.email);
    return data;
  } catch (error) {
    const errorInfo = {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
    };
    
    console.log('Supabase user by email retrieval failed, falling back to local database:', errorInfo);
    return localUsers.getUserByEmail(email) || null;
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

// Sync user with Supabase auth - create user profile if it doesn't exist
export const syncUserWithAuth = async (userData: Omit<User, 'id' | 'created_at' | 'updated_at'>): Promise<User> => {
  const existingUser = await getUserByEmail(userData.email);
  if (existingUser) {
    return existingUser;
  }
  return await createUser(userData);
};

// Get current user from Supabase auth and sync with users table
export const getCurrentSupabaseUser = async (): Promise<User | null> => {
  try {
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Error getting authenticated user:', authError);
      return null;
    }
    
    if (!authUser || !authUser.email) {
      console.log('No authenticated user found');
      return null;
    }

    // Check if user exists in our users table
    let user = await getUserByEmail(authUser.email);
    
    if (!user) {
      console.log('User not found in users table, creating new user profile');
      try {
        // Create user profile if it doesn't exist
        user = await createUser({
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
          role: authUser.user_metadata?.role || 'parent',
          phone: authUser.user_metadata?.phone,
          avatar_url: authUser.user_metadata?.avatar_url,
        });
        console.log('Created new user profile:', user);
      } catch (createError) {
        console.error('Error creating user profile:', createError);
        return null;
      }
    }

    return user;
  } catch (error) {
    console.error('Error in getCurrentSupabaseUser:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
};
