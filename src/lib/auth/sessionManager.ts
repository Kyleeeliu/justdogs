import { supabase } from '@/lib/supabase/client-browser';
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
          // Use the proper Supabase refresh method
          const { data, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error('Error refreshing session:', refreshError);
            // If refresh fails with token not found, clear auth state
            if (isRefreshTokenError(refreshError)) {
              console.log('Refresh token invalid, clearing auth state');
              await clearAuthState();
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
          }
        }
      }
    } catch (error) {
      console.error('Error in session check:', error);
    }
  };

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
      
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Error force refreshing session:', error);
        // If refresh fails with token not found, clear auth state
        if (isRefreshTokenError(error)) {
          console.log('Force refresh failed with invalid token, clearing auth state');
          await clearAuthState();
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
      }
      return false;
    }
  }
}

// Create singleton instance
export const sessionManager = new SessionManager();