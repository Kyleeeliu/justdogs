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
    
    const message = (error.message || error.toString()).toLowerCase();
    const errorName = (error.name || '').toLowerCase();
    const errorCode = error.code || error.error_code || '';
    
    // Check for various refresh token error patterns
    const refreshTokenPatterns = [
      'refresh_token_not_found',
      'invalid refresh token',
      'refresh token not found',
      'refresh token expired',
      'refresh token invalid',
      'token_refresh_failed',
      'session_not_found',
      'invalid_token',
      'jwt expired',
      'jwt malformed',
      'invalid jwt',
      'token expired',
      'authentication failed',
      'unauthorized'
    ];
    
    // Check for AuthApiError patterns
    const authApiErrorPatterns = [
      'authapierror',
      'auth api error',
      'authentication error',
      'authorization error'
    ];
    
    // Check message content
    const hasRefreshTokenError = refreshTokenPatterns.some(pattern =>
      message.includes(pattern)
    );
    
    const hasAuthApiError = authApiErrorPatterns.some(pattern =>
      message.includes(pattern) || errorName.includes(pattern)
    );
    
    // Check for specific HTTP status codes that indicate auth issues
    const hasAuthStatusCode = (error.status === 400 || error.status === 401 || error.status === 403) &&
                             (message.includes('refresh') || message.includes('token') || message.includes('auth'));
    
    // Check for specific error codes
    const hasAuthErrorCode = ['invalid_token', 'token_expired', 'refresh_token_not_found', 'session_not_found'].includes(errorCode);
    
    // Additional check for network errors that might be masking auth issues
    const isNetworkErrorWithAuthContext = (message.includes('network') || message.includes('fetch')) &&
                                         (message.includes('401') || message.includes('403'));
    
    const shouldRecover = hasRefreshTokenError || hasAuthApiError || hasAuthStatusCode || hasAuthErrorCode || isNetworkErrorWithAuthContext;
    
    if (shouldRecover) {
      console.log('AuthRecovery: Error qualifies for recovery:', {
        message: error.message,
        name: error.name,
        status: error.status,
        code: errorCode,
        hasRefreshTokenError,
        hasAuthApiError,
        hasAuthStatusCode,
        hasAuthErrorCode,
        isNetworkErrorWithAuthContext
      });
    }
    
    return shouldRecover;
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