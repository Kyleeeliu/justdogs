import { supabase } from '@/lib/supabase/client';
import { clearAuthState, isRefreshTokenError } from '@/lib/auth/auth';

class SessionManager {
  private refreshInterval: NodeJS.Timeout | null = null;
  private readonly REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes
  private readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry
  private focusHandler: (() => void) | null = null;
  private visibilityHandler: (() => void) | null = null;

  constructor() {
    // Don't auto-start monitoring in constructor
    // Let the auth hook control when to start/stop
  }

  /**
   * Initialize session manager
   */
  initialize(): void {
    console.log('SessionManager initialized');
  }

  /**
   * Start monitoring session and auto-refresh
   */
  startMonitoring(): void {
    if (typeof window === 'undefined') return;
    
    this.startSessionMonitoring();
  }

  /**
   * Stop session monitoring
   */
  stopMonitoring(): void {
    this.stopSessionMonitoring();
  }

  private startSessionMonitoring() {
    // Clear any existing interval and event listeners
    this.stopSessionMonitoring();

    // Set up periodic session check
    this.refreshInterval = setInterval(async () => {
      await this.checkAndRefreshSession();
    }, this.REFRESH_INTERVAL);

    // Create bound handlers to ensure proper cleanup
    this.focusHandler = () => {
      this.checkAndRefreshSession();
    };

    this.visibilityHandler = () => {
      if (!document.hidden) {
        this.checkAndRefreshSession();
      }
    };

    // Also check session on page focus
    window.addEventListener('focus', this.focusHandler);
    
    // Check session on page visibility change
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  private checkAndRefreshSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        // If we get an auth error, the session might be invalid
        if (isRefreshTokenError(error)) {
          console.log('Invalid refresh token detected, clearing auth state');
          await clearAuthState();
          // Redirect to login after clearing state
          if (typeof window !== 'undefined') {
            window.location.href = '/login?message=session_expired';
          }
        }
        return;
      }

      if (!session) {
        console.log('No active session found');
        return;
      }

      // Check if token is close to expiry
      const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
      const now = Date.now();
      const timeUntilExpiry = expiresAt - now;

      console.log('Session check:', {
        expiresAt: new Date(expiresAt).toISOString(),
        timeUntilExpiry: Math.round(timeUntilExpiry / 1000 / 60) + ' minutes',
        shouldRefresh: timeUntilExpiry < this.TOKEN_REFRESH_THRESHOLD
      });

      // If token expires within threshold, refresh it
      if (timeUntilExpiry < this.TOKEN_REFRESH_THRESHOLD) {
        console.log('Refreshing session token...');
        
        try {
          // Use the proper Supabase refresh method with retry logic
          const { data, error: refreshError } = await this.refreshWithRetry();
          
          if (refreshError) {
            console.error('Error refreshing session after retries:', refreshError);
            // If refresh fails with token not found, clear auth state
            if (isRefreshTokenError(refreshError)) {
              console.log('Refresh token invalid after retries, clearing auth state');
              await clearAuthState();
              if (typeof window !== 'undefined') {
                window.location.href = '/login?message=session_expired';
              }
            }
          } else {
            console.log('Session refreshed successfully');
          }
        } catch (error) {
          console.error('Exception during session refresh:', error);
          // On any refresh error, consider clearing auth state to prevent stuck states
          if (isRefreshTokenError(error)) {
            console.log('Refresh token error, clearing auth state');
            await clearAuthState();
            if (typeof window !== 'undefined') {
              window.location.href = '/login?message=session_expired';
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in session check:', error);
      // Handle any unexpected errors that might be refresh token related
      if (isRefreshTokenError(error)) {
        console.log('Unexpected refresh token error, clearing auth state');
        await clearAuthState();
        if (typeof window !== 'undefined') {
          window.location.href = '/login?message=session_expired';
        }
      }
    }
  };

  /**
   * Refresh session with retry logic
   */
  private async refreshWithRetry(maxRetries: number = 2): Promise<{ data: any; error: any }> {
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Session refresh attempt ${attempt}/${maxRetries}`);
        const result = await supabase.auth.refreshSession();
        
        if (!result.error) {
          console.log(`Session refresh successful on attempt ${attempt}`);
          return result;
        }
        
        lastError = result.error;
        console.warn(`Session refresh attempt ${attempt} failed:`, result.error);
        
        // If it's a refresh token error, don't retry
        if (isRefreshTokenError(result.error)) {
          break;
        }
        
        // Wait before retrying (exponential backoff)
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      } catch (error) {
        lastError = error;
        console.warn(`Session refresh attempt ${attempt} threw error:`, error);
        
        // If it's a refresh token error, don't retry
        if (isRefreshTokenError(error)) {
          break;
        }
        
        // Wait before retrying
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    return { data: null, error: lastError };
  }

  public stopSessionMonitoring() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    if (typeof window !== 'undefined' && this.focusHandler) {
      window.removeEventListener('focus', this.focusHandler);
      this.focusHandler = null;
    }

    if (typeof document !== 'undefined' && this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
  }

  public async forceRefreshSession() {
    try {
      console.log('Force refreshing session...');
      
      const { data, error } = await this.refreshWithRetry();
      
      if (error) {
        console.error('Error force refreshing session after retries:', error);
        // If refresh fails with token not found, clear auth state
        if (isRefreshTokenError(error)) {
          console.log('Force refresh failed with invalid token, clearing auth state');
          await clearAuthState();
          if (typeof window !== 'undefined') {
            window.location.href = '/login?message=session_expired';
          }
        }
        return false;
      }
      
      console.log('Session force refreshed successfully');
      return true;
    } catch (error) {
      console.error('Error in force refresh:', error);
      // On any refresh error, consider clearing auth state to prevent stuck states
      if (isRefreshTokenError(error)) {
        console.log('Force refresh exception with invalid token, clearing auth state');
        await clearAuthState();
        if (typeof window !== 'undefined') {
          window.location.href = '/login?message=session_expired';
        }
      }
      return false;
    }
  }
}

// Create singleton instance
export const sessionManager = new SessionManager();