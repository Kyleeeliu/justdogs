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
<<<<<<< Updated upstream
      console.error('Error fetching users from Supabase:', error);
      throw error;
=======
      console.error('Error fetching users from Supabase:', {
        message: error.message || 'No message',
        code: error.code || 'No code',
        details: error.details || 'No details',
        hint: error.hint || 'No hint',
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
      });
      // Don't throw, fall back to local database instead
      console.log('Falling back to local database due to Supabase error');
      return localUsers.getAllUsers();
>>>>>>> Stashed changes
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
<<<<<<< Updated upstream
    // First get the authenticated user
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
=======
    // First check if we have a valid session before calling getUser()
    // getUser() can throw AuthSessionMissingError if there's no session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
>>>>>>> Stashed changes
    
    if (sessionError || !session) {
      console.log('No active session found:', sessionError?.message || 'Session is null');
      return null;
    }
    
    // Use the user from the session if available, otherwise call getUser() to validate
    let authUser = session.user;
    
    // If session user is missing email, try to get fresh user data
    if (!authUser || !authUser.email) {
      try {
        const { data: { user: freshUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          // Handle AuthSessionMissingError specifically
          if (authError.message?.includes('Auth session missing') || authError.name === 'AuthSessionMissingError') {
            console.log('Session expired or invalid');
            return null;
          }
          console.error('Error getting authenticated user:', authError);
          return null;
        }
        
        authUser = freshUser;
      } catch (getUserError) {
        // Handle AuthSessionMissingError thrown as exception
        if (getUserError instanceof Error && 
            (getUserError.message?.includes('Auth session missing') || 
             getUserError.name === 'AuthSessionMissingError')) {
          console.log('Session expired or invalid (exception)');
          return null;
        }
        throw getUserError; // Re-throw if it's a different error
      }
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
<<<<<<< Updated upstream
    console.error('Exception in getCurrentSupabaseUser:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
=======
    // Handle AuthSessionMissingError specifically - this can be thrown by getUser()
    if (error instanceof Error) {
      if (error.message?.includes('Auth session missing') || 
          error.name === 'AuthSessionMissingError' ||
          error.constructor.name === 'AuthSessionMissingError') {
        console.log('Session expired or invalid (caught in catch block)');
        return null;
      }
    }
    
    console.error('Error in getCurrentSupabaseUser:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorName: error instanceof Error ? error.name : undefined
>>>>>>> Stashed changes
    });
    return null;
  }
};