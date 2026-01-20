import { supabase } from '@/lib/supabase/client';

/**
 * Auth Recovery Utility
 * Helps recover from corrupted authentication states
 */
export class AuthRecovery {
  /**
   * Clear all authentication data and redirect to login
   */
  static async clearAndRedirect() {
    console.log('AuthRecovery: Clearing corrupted auth state...');
    
    try {
      // Sign out from Supabase
      await supabase.auth.signOut();
    } catch (error) {
      console.warn('AuthRecovery: Error during signOut:', error);
    }
    
    // Clear all localStorage items related to Supabase
    if (typeof window !== 'undefined') {
      try {
        // Clear the specific auth token
        localStorage.removeItem('sb-pajtampwqutuuidklxbv-auth-token');
        
        // Clear any other Supabase-related items
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase')) {
            localStorage.removeItem(key);
          }
        });
        
        // Clear session storage as well
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase')) {
            sessionStorage.removeItem(key);
          }
        });
        
        console.log('AuthRecovery: Local storage cleared');
      } catch (error) {
        console.warn('AuthRecovery: Error clearing storage:', error);
      }
    }
    
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/login?message=session_expired';
    }
  }
  
  /**
   * Check if current error is an auth recovery candidate
   */
  static shouldRecover(error: any): boolean {
    if (!error) return false;
    
    const message = error.message || error.toString();
    const errorName = error.name || '';
    
    return message.includes('refresh_token_not_found') ||
           message.includes('Invalid Refresh Token') ||
           message.includes('Refresh Token Not Found') ||
           message.includes('AuthApiError') ||
           errorName.includes('AuthApiError') ||
           (error.status === 400 && message.includes('refresh'));
  }
  
  /**
   * Handle auth errors gracefully
   */
  static async handleAuthError(error: any, context: string = 'unknown') {
    console.error(`AuthRecovery: Auth error in ${context}:`, error);
    
    if (this.shouldRecover(error)) {
      console.log(`AuthRecovery: Recovering from auth error in ${context}`);
      await this.clearAndRedirect();
      return true;
    }
    
    return false;
  }
}

/**
 * Global error handler for unhandled auth errors
 */
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', async (event) => {
    if (AuthRecovery.shouldRecover(event.reason)) {
      console.log('AuthRecovery: Handling unhandled auth rejection');
      event.preventDefault();
      await AuthRecovery.clearAndRedirect();
    }
  });
}