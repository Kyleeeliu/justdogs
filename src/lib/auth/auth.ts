// src/lib/auth/auth.ts

import { supabase } from '../supabase/client';
import { User, UserRole } from '@/types';
import { getCurrentSupabaseUser, createUser } from '../supabase/users';

// --- Functions that use the client-side global 'supabase' (OK) ---

export async function signIn(email: string, password: string) {
    console.log('SignIn attempt:', { email });
    
    try {
        if (!supabase) {
            throw new Error('Supabase client is not initialized. Please check your environment variables.');
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            console.error('Supabase signin error:', error);
            
            let userMessage = error.message || 'An error occurred during sign in';
            
            if (error.message?.includes('Invalid login credentials')) {
                userMessage = 'Invalid email or password. Please try again.';
            } else if (error.message?.includes('Email not confirmed')) {
                userMessage = 'Please confirm your email address before signing in.';
            } else if (error.message?.includes('Too many requests')) {
                userMessage = 'Too many sign-in attempts. Please try again later.';
            }
            
            throw new Error(userMessage);
        }

        if (!data || !data.user) {
            console.error('Sign in returned no user data:', { data });
            throw new Error('Sign in succeeded but no user data was returned.');
        }

        // Check user approval status for trainers
        if (data.user) {
            try {
                const userProfile = await getCurrentSupabaseUser();
                if (userProfile && userProfile.role === 'trainer' && userProfile.approval_status === 'pending') {
                    // Sign out the user immediately
                    await supabase.auth.signOut();
                    throw new Error('Your trainer account is pending admin approval. Please wait for approval before signing in.');
                } else if (userProfile && userProfile.role === 'trainer' && userProfile.approval_status === 'rejected') {
                    // Sign out the user immediately
                    await supabase.auth.signOut();
                    throw new Error('Your trainer account has been rejected. Please contact support for more information.');
                }
            } catch (profileError) {
                console.error('Error checking user approval status:', profileError);
                // If it's an approval-related error, re-throw it
                if (profileError instanceof Error && (
                    profileError.message.includes('pending admin approval') ||
                    profileError.message.includes('has been rejected')
                )) {
                    throw profileError;
                }
                // For other errors, continue with login (don't block existing users)
                console.warn('Could not check approval status, allowing login to proceed');
            }
        }

        console.log('Sign in successful:', data.user.email);
        return data;
    } catch (error) {
        console.error('Sign in error:', error);
        throw error;
    }
}

export async function signUp(email: string, password: string, fullName: string, role: UserRole) {
    console.log('SignUp attempt:', { email, fullName, role });
    
    try {
        // Setup email redirect URL
        const redirectUrl = typeof window !== 'undefined' 
          ? `${window.location.origin}/login?message=email_confirmed`
          : undefined;

        // 1. Call Supabase Auth to create the user
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName, // Passed to user metadata
                    role: role,           // Passed to user metadata
                },
                ...(redirectUrl && { emailRedirectTo: redirectUrl }),
            },
        });

        if (error) {
            console.error('Supabase signup error:', error);
            throw new Error(error.message);
        }

        console.log('Supabase signup successful:', data);
        
        // 2. Manually create the user profile in the public.users table
        if (data.user) {
            try {
                // Check if user profile already exists (to handle race conditions, though trigger is gone)
                const { data: existingUser, error: checkError } = await supabase
                    .from('users')
                    .select('id')
                    .eq('id', data.user.id)
                    .maybeSingle();

                if (checkError && checkError.code !== 'PGRST116') {
                    console.error('Error checking existing user:', checkError);
                    throw checkError;
                }

                if (!existingUser) {
// CRITICAL: This is the INSERT call that the database RLS policies allow
await createUser(
    {
        email: data.user.email!,
        full_name: fullName,
        role: role,
        phone: undefined,
        avatar_url: undefined,
        approval_status: role === 'trainer' ? 'pending' : 'approved',
    },
    data.user.id // Use the auth user ID
);
                    console.log('User profile created successfully');
                } else {
                    console.log('User profile already exists');
                }
} catch (profileError) {
    // Log the error in multiple ways to ensure we capture all information
    console.error('Error creating user profile - Raw error:', profileError);
    console.error('Error creating user profile - Stringified:', JSON.stringify(profileError, null, 2));
    console.error('Error creating user profile - Details:', {
        message: profileError instanceof Error ? profileError.message : 'Unknown error',
        stack: profileError instanceof Error ? profileError.stack : undefined,
        name: profileError instanceof Error ? profileError.name : 'Unknown',
    });
    
    // Also log all enumerable properties if it's an object
    if (typeof profileError === 'object' && profileError !== null) {
        console.error('Error creating user profile - All properties:', Object.getOwnPropertyNames(profileError).reduce((acc, key) => {
            acc[key] = (profileError as any)[key];
            return acc;
        }, {} as any));
    }
    
    // Re-throw the original error to be caught by register/page.tsx
    throw profileError;
}
        }
        
        // 3. Handle different flows based on user role
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
    // Log the error in multiple ways to ensure we capture all information
    console.error('Error in signUp - Raw error:', error);
    console.error('Error in signUp - Stringified:', JSON.stringify(error, null, 2));
    console.error('Error in signUp - Details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown',
    });
    
    // Also log all enumerable properties if it's an object
    if (typeof error === 'object' && error !== null) {
        console.error('Error in signUp - All properties:', Object.getOwnPropertyNames(error).reduce((acc, key) => {
            acc[key] = (error as any)[key];
            return acc;
        }, {} as any));
    }
    
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
            console.error('Error getting session:', sessionError);
            
            // Handle refresh token errors by clearing auth state
            if (isRefreshTokenError(sessionError)) {
                console.log('Invalid refresh token detected in getCurrentUser, clearing auth state');
                await clearAuthState();
            }
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
        console.error('Error in getCurrentUser:', error);
        
        // Handle refresh token errors by clearing auth state
        if (isRefreshTokenError(error)) {
            console.log('Invalid refresh token detected in getCurrentUser exception, clearing auth state');
            await clearAuthState();
        }
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
        console.error('Supabase profile update error:', error);
        throw new Error('Failed to update profile');
    }

    console.log('Updated Supabase user:', data);
    return data as User;
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

/**
 * Clear corrupted authentication state
 * This function helps recover from refresh token errors by clearing all auth data
 */
export async function clearAuthState() {
    console.log('Clearing corrupted auth state...');
    
    try {
        // Sign out from Supabase
        await supabase.auth.signOut();
        
        // Clear localStorage manually if needed
        if (typeof window !== 'undefined') {
            // Clear the specific auth token
            localStorage.removeItem('sb-pajtampwqutuuidklxbv-auth-token');
            
            // Also clear any legacy tokens that might exist
            localStorage.removeItem('supabase.auth.token');
            
            // Clear any other Supabase-related items
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('sb-') || key.includes('supabase')) {
                    localStorage.removeItem(key);
                }
            });
        }
        
        console.log('Auth state cleared successfully');
    } catch (error) {
        console.error('Error clearing auth state:', error);
    }
}

/**
 * Check if an error is related to refresh token issues
 */
export function isRefreshTokenError(error: any): boolean {
    if (!error) return false;
    
    const message = error.message || error.toString();
    return message.includes('refresh_token_not_found') ||
           message.includes('Invalid Refresh Token') ||
           message.includes('AuthApiError');
}