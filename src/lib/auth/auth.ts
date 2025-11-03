import { supabase } from '../supabase/client';
import { User, UserRole } from '@/types';
import { getCurrentSupabaseUser } from '../supabase/users';
import { syncUserWithAuth as syncUserWithLocalStorage } from '../database/users';

// Utility function to safely set localStorage with retry
const safeSetLocalStorage = (key: string, value: string, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      localStorage.setItem(key, value);
      // Verify it was set correctly
      const stored = localStorage.getItem(key);
      if (stored === value) {
        return true;
      }
    } catch (error) {
      console.error(`Failed to set localStorage key ${key}, attempt ${i + 1}:`, error);
      if (i === maxRetries - 1) {
        throw error;
      }
      // Small delay before retry
      new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  return false;
};

// Mock user data for development when Supabase is not configured
const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@justdogs.co.za',
    full_name: 'Admin User',
    role: 'admin',
    phone: '+27 82 123 4567',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    email: 'trainer@justdogs.co.za',
    full_name: 'Trainer User',
    role: 'trainer',
    phone: '+27 83 987 6543',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    email: 'parent@justdogs.co.za',
    full_name: 'Parent User',
    role: 'parent',
    phone: '+27 84 555 1234',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Check if Supabase is properly configured
const isSupabaseConfigured = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  // Temporarily force mock mode for testing
  // Change this to true when you want to use real Supabase Auth
  const FORCE_MOCK_MODE = true;
  
  if (FORCE_MOCK_MODE) {
    console.log('🔧 Using mock authentication mode for testing');
    return false;
  }
  
  return url && 
         key &&
         url !== 'https://placeholder.supabase.co' &&
         key !== 'placeholder-key';
};

export async function signIn(email: string, password: string) {
  console.log('SignIn attempt:', { email, password });
  
  if (!isSupabaseConfigured()) {
    console.log('Using mock authentication');
    
    // First, check for newly registered users
    const newUserStr = localStorage.getItem('newUser_' + email);
    console.log('Checking for new user:', 'newUser_' + email, 'Found:', newUserStr);
    
    if (newUserStr) {
      console.log('Found newly registered user');
      try {
        const newUser = JSON.parse(newUserStr);
        console.log('Parsed new user:', newUser);
        
        // Sync user with database
        const syncedUser = syncUserWithLocalStorage(newUser);
        
        // For newly registered users, accept any password (since we don't store passwords in mock)
        safeSetLocalStorage('mockUser', JSON.stringify(syncedUser));
        console.log('Set mockUser in localStorage:', JSON.stringify(syncedUser));
        
        localStorage.removeItem('newUser_' + email);
        console.log('Removed newUser_' + email + ' from localStorage');
        
        // Verify the mockUser was set correctly
        const verifyMockUser = localStorage.getItem('mockUser');
        console.log('Verification - mockUser in localStorage:', verifyMockUser);
        
        return { user: syncedUser, session: { user: syncedUser } };
      } catch (error) {
        console.error('Error processing new user:', error);
        throw new Error('Invalid user data');
      }
    }
    
    // Check demo accounts
    const mockUser = mockUsers.find(user => user.email === email);
    console.log('Looking for mock user:', email, 'Found:', mockUser);
    
    if (mockUser) {
      // Demo account passwords
      const validPasswords = ['admin123', 'trainer123', 'parent123'];
      console.log('Checking password:', password, 'Valid passwords:', validPasswords);
      
      if (validPasswords.includes(password)) {
        console.log('Valid demo account password');
        // Sync user with database
        const syncedUser = syncUserWithLocalStorage(mockUser);
        safeSetLocalStorage('mockUser', JSON.stringify(syncedUser));
        console.log('Set mockUser for demo account:', JSON.stringify(syncedUser));
        return { user: syncedUser, session: { user: syncedUser } };
      } else {
        console.log('Invalid password for demo account');
      }
    } else {
      console.log('No mock user found for email:', email);
    }
    
    throw new Error('Invalid email or password');
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('Supabase signin error:', error);
      throw new Error(error.message);
    }

    return data;
  } catch (error) {
    console.error('Database connection error:', error);
    // If we get a database error, fall back to mock authentication
    console.log('Falling back to mock authentication due to database error');
    
    // Check demo accounts
    const mockUser = mockUsers.find(user => user.email === email);
    if (mockUser) {
      const validPasswords = ['admin123', 'trainer123', 'parent123'];
      if (validPasswords.includes(password)) {
        const syncedUser = syncUserWithLocalStorage(mockUser);
        safeSetLocalStorage('mockUser', JSON.stringify(syncedUser));
        return { user: syncedUser, session: { user: syncedUser } };
      }
    }
    
    throw new Error('Invalid email or password');
  }
}

export async function signUp(email: string, password: string, fullName: string, role: UserRole) {
  console.log('SignUp attempt:', { email, fullName, role });
  
  if (!isSupabaseConfigured()) {
    console.log('Using mock registration');
    
    // Mock registration for development
    const newUser: User = {
      id: Date.now().toString(),
      email,
      full_name: fullName,
      role,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    // Sync user with database
    const syncedUser = syncUserWithLocalStorage(newUser);
    
    // Store the new user temporarily with their password
    localStorage.setItem('newUser_' + email, JSON.stringify(syncedUser));
    localStorage.setItem('userPassword_' + email, password);
    
    // Also store in mockUsers array for future reference
    mockUsers.push(syncedUser);
    
    console.log('Created new mock user:', syncedUser);
    
    // Return the user immediately for mock authentication
    return { user: syncedUser, session: { user: syncedUser } };
  }

  // Real Supabase registration
  console.log('Using Supabase registration');
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
      },
    });

    if (error) {
      console.error('Supabase signup error:', error);
      throw new Error(error.message);
    }

    console.log('Supabase signup successful:', data);
    
    // If email confirmation is required, the user won't be signed in automatically
    if (data.user && !data.session) {
      console.log('Email confirmation required');
      return { 
        user: data.user, 
        session: null,
        message: 'Please check your email to confirm your account before signing in.'
      };
    }
    
    // If user is automatically signed in (email confirmation disabled)
    if (data.user && data.session) {
      console.log('User automatically signed in');
      return data;
    }
    
    return data;
    
  } catch (error) {
    console.error('Error in signUp:', error);
    throw error;
  }
}

export async function signOut() {
  console.log('SignOut called');
  
  if (!isSupabaseConfigured()) {
    // Clear mock session
    localStorage.removeItem('mockUser');
    console.log('Cleared mock session');
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw new Error(error.message);
  }
}

export async function getCurrentUser(): Promise<User | null> {
  console.log('getCurrentUser called');
  
  if (!isSupabaseConfigured()) {
    // Get mock user from localStorage with retry logic
    let mockUserStr = null;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts && !mockUserStr) {
      try {
        mockUserStr = localStorage.getItem('mockUser');
        console.log(`Mock user from localStorage (attempt ${attempts + 1}):`, mockUserStr);
        
        if (mockUserStr) {
          break;
        }
        
        // If no user found, wait a bit and try again (for timing issues)
        if (attempts < maxAttempts - 1) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        attempts++;
      } catch (error) {
        console.error(`Error accessing localStorage (attempt ${attempts + 1}):`, error);
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
      }
    }
    
    if (mockUserStr) {
      try {
        const user = JSON.parse(mockUserStr);
        console.log('Successfully parsed mock user:', user);
        
        // Validate that the user has required fields
        if (!user.id || !user.email || !user.full_name || !user.role) {
          console.error('Invalid user data:', user);
          localStorage.removeItem('mockUser');
          return null;
        }
        
        return user;
      } catch (error) {
        console.error('Error parsing mock user:', error);
        // Clear invalid mock user
        localStorage.removeItem('mockUser');
        return null;
      }
    }
    
    console.log('No mock user found after', maxAttempts, 'attempts');
    return null;
  }

  // Real Supabase authentication
  console.log('Using Supabase authentication');
  
  try {
    const user = await getCurrentSupabaseUser();
    if (user) {
      console.log('Found Supabase user:', user.email);
      return user;
    }
    
    console.log('No Supabase user found');
    return null;
    
  } catch (error) {
    console.error('Error in getCurrentUser:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
}

export async function updateUserProfile(userId: string, updates: Partial<User>): Promise<User> {
  console.log('updateUserProfile called:', { userId, updates });
  
  if (!isSupabaseConfigured()) {
    console.log('Using mock profile update');
    
    // Get current user from localStorage
    const mockUserStr = localStorage.getItem('mockUser');
    if (!mockUserStr) {
      throw new Error('No user session found');
    }
    
    const currentUser = JSON.parse(mockUserStr);
    if (currentUser.id !== userId) {
      throw new Error('User ID mismatch');
    }
    
    // Update user data
    const updatedUser: User = {
      ...currentUser,
      ...updates,
      updated_at: new Date().toISOString()
    };
    
    // Update localStorage
    localStorage.setItem('mockUser', JSON.stringify(updatedUser));
    
    // Update in mockUsers array if it exists
    const userIndex = mockUsers.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      mockUsers[userIndex] = updatedUser;
    }
    
    console.log('Updated mock user:', updatedUser);
    return updatedUser;
  }

  // Supabase profile update
  console.log('Using Supabase profile update');
  
  const { data, error } = await supabase
    .from('users')
    .update({
      full_name: updates.full_name,
      phone: updates.phone,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Supabase profile update error:', error);
    throw new Error('Failed to update profile');
  }

  console.log('Updated Supabase user:', data);
  return data;
}

export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    parent: 1,
    trainer: 2,
    behaviorist: 2,
    admin: 3,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export function canAccessResource(
  userRole: UserRole,
  resourceOwnerId: string,
  currentUserId: string
): boolean {
  // Admins can access everything
  if (userRole === 'admin') return true;
  
  // Users can access their own resources
  if (resourceOwnerId === currentUserId) return true;
  
  // Trainers can access resources related to their bookings
  if (userRole === 'trainer') {
    // This would need to be checked against the specific resource
    // For now, return false - this should be handled in specific queries
    return false;
  }
  
  return false;
}

export async function resetPassword(email: string) {
  if (!isSupabaseConfigured()) {
    console.log('Mock password reset for:', email);
    return;
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updatePassword(newPassword: string) {
  if (!isSupabaseConfigured()) {
    console.log('Mock password update');
    return;
  }

  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    throw new Error(error.message);
  }
}
