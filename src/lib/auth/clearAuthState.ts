/**
 * Utility script to manually clear corrupted authentication state
 * This can be used in development or as a recovery mechanism
 */

import { supabase } from '@/lib/supabase/client';

/**
 * Comprehensive auth state cleanup function
 * Clears all possible authentication data from browser storage
 */
export async function clearAllAuthState(): Promise<void> {
  console.log('Starting comprehensive auth state cleanup...');
  
  try {
    // 1. Sign out from Supabase (this should clear server-side session)
    console.log('Signing out from Supabase...');
    await supabase.auth.signOut();
  } catch (error) {
    console.warn('Error during Supabase signOut:', error);
    // Continue with cleanup even if signOut fails
  }
  
  if (typeof window !== 'undefined') {
    // 2. Clear localStorage
    console.log('Clearing localStorage...');
    const localStorageKeysToRemove = [
      'sb-pajtampwqutuuidklxbv-auth-token',
      'supabase.auth.token',
      'sb-auth-token',
      'supabase-auth-token',
      'auth-token'
    ];
    
    // Remove specific keys
    localStorageKeysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        console.log(`Removed localStorage key: ${key}`);
      } catch (error) {
        console.warn(`Error removing localStorage key ${key}:`, error);
      }
    });
    
    // Remove any keys that start with 'sb-' or contain 'supabase'
    try {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
          localStorage.removeItem(key);
          console.log(`Removed localStorage key: ${key}`);
        }
      });
    } catch (error) {
      console.warn('Error during localStorage cleanup:', error);
    }
    
    // 3. Clear sessionStorage
    console.log('Clearing sessionStorage...');
    try {
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
          sessionStorage.removeItem(key);
          console.log(`Removed sessionStorage key: ${key}`);
        }
      });
    } catch (error) {
      console.warn('Error during sessionStorage cleanup:', error);
    }
    
    // 4. Clear any cookies (if accessible)
    console.log('Clearing auth-related cookies...');
    try {
      const cookiesToClear = [
        'sb-pajtampwqutuuidklxbv-auth-token',
        'sb-pajtampwqutuuidklxbv-auth-token.0',
        'sb-pajtampwqutuuidklxbv-auth-token.1',
        'sb-pajtampwqutuuidklxbv-auth-token.2',
        'sb-pajtampwqutuuidklxbv-auth-token.3',
        'sb-pajtampwqutuuidklxbv-auth-token.4',
        'sb-pajtampwqutuuidklxbv-auth-token.5',
        'sb-pajtampwqutuuidklxbv-auth-token.6',
        'sb-pajtampwqutuuidklxbv-auth-token.7'
      ];
      
      cookiesToClear.forEach(cookieName => {
        try {
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname}`;
          document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
          console.log(`Cleared cookie: ${cookieName}`);
        } catch (error) {
          console.warn(`Error clearing cookie ${cookieName}:`, error);
        }
      });
    } catch (error) {
      console.warn('Error during cookie cleanup:', error);
    }
  }
  
  console.log('Auth state cleanup completed');
}

/**
 * Quick auth state check and cleanup if corrupted
 */
export async function checkAndCleanAuthState(): Promise<boolean> {
  try {
    console.log('Checking auth state...');
    
    // Try to get current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('Auth state check failed:', error);
      
      // Check if it's a refresh token error
      const message = (error.message || '').toLowerCase();
      const isRefreshTokenError = message.includes('refresh_token_not_found') ||
                                 message.includes('invalid refresh token') ||
                                 message.includes('refresh token not found') ||
                                 message.includes('authapierror');
      
      if (isRefreshTokenError) {
        console.log('Corrupted auth state detected, cleaning up...');
        await clearAllAuthState();
        return true; // Cleanup performed
      }
    }
    
    if (session) {
      console.log('Auth state is valid for user:', session.user?.email);
    } else {
      console.log('No active session found');
    }
    
    return false; // No cleanup needed
  } catch (error) {
    console.error('Error during auth state check:', error);
    
    // If there's any error, try to clean up
    console.log('Performing cleanup due to auth check error...');
    await clearAllAuthState();
    return true; // Cleanup performed
  }
}

/**
 * Development helper function to manually trigger auth cleanup
 * Can be called from browser console: window.clearAuthState()
 */
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).clearAuthState = clearAllAuthState;
  (window as any).checkAuthState = checkAndCleanAuthState;
  console.log('Auth utilities available: window.clearAuthState(), window.checkAuthState()');
}