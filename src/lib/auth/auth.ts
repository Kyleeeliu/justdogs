// src/lib/auth/auth.ts

import { supabase } from '../supabase/client-browser';
import { User, UserRole } from '@/types';
import { getCurrentSupabaseUser } from '../supabase/users';

// --- Functions that use the client-side global 'supabase' (OK) ---

export async function signIn(email: string, password: string) {
    // ... (rest of signIn remains the same)
    console.log('SignIn attempt:', { email });
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Supabase signin error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          error
        });
        throw new Error(error.message);
      }

      console.log('Sign in successful:', data.user?.email);
      return data;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
}

export async function signUp(email: string, password: string, fullName: string, role: UserRole) {
    // ... (rest of signUp remains the same)
    console.log('SignUp attempt:', { email, fullName, role });
    
    try {
      // Check if window is defined (client-side only)
      const redirectUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/login?message=email_confirmed`
        : undefined;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
          ...(redirectUrl && { emailRedirectTo: redirectUrl }),
        },
      });

      if (error) {
        console.error('Supabase signup error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
          error
        });
        throw new Error(error.message);
      }

      console.log('Supabase signup successful:', data);
      
      // ... (rest of the return logic remains the same)
      if (role === 'trainer') {
        console.log('Trainer registration - requires admin approval');
        return {
          user: data.user,
          session: null,
          message: 'Trainer account created and pending admin approval. Please check your email to confirm your account.'
        };
      } else if (role === 'parent') {
        if (data.user && data.session) {
          console.log('Dog parent automatically signed in');
          return data;
        } else if (data.user && !data.session) {
          console.log('Dog parent email confirmation required');
          return {
            user: data.user,
            session: null,
            message: 'Please check your email to confirm your account before signing in.'
          };
        }
      }
      
      return data;
      
    } catch (error) {
      console.error('Error in signUp:', error);
      throw error;
    }
}

export async function signOut() {
    console.log('SignOut called');
    
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
}

// --- Functions using the Server Client (FIXED) ---

export async function getCurrentUser(): Promise<User | null> {
    console.log('getCurrentUser called');
    
    try {
        // First check if we have a valid session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
            console.error('Error getting session:', {
                message: sessionError.message,
                name: sessionError.name,
                status: sessionError.status,
                error: sessionError
            });
            return null;
        }
        
        if (!session) {
            console.log('No active session found');
            return null;
        }
        
        console.log('Found active session for user:', session.user.email);
        
        // Get user profile from our users table
        const user = await getCurrentSupabaseUser();
        if (user) {
            console.log('Found Supabase user:', user.email);
            return user;
        }
        
        console.log('No Supabase user profile found');
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
      console.error('Supabase profile update error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        error
      });
      throw new Error('Failed to update profile');
    }

    console.log('Updated Supabase user:', data);
    return data;
}

// ... (Rest of the utility functions remain the same)

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
      return false;
    }
    
    return false;
}

export async function resetPassword(email: string) {
    // Check if window is defined (client-side only)
    const redirectUrl = typeof window !== 'undefined'
      ? `${window.location.origin}/reset-password`
      : 'http://localhost:3000/reset-password'; // fallback for SSR

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      throw new Error(error.message);
    }
}

export async function updatePassword(newPassword: string) {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(error.message);
    }
}