import { supabase } from '@/lib/supabase/client-browser';

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
        
        // Check if refreshSession method exists (real Supabase client)
        const authClient = supabase.auth as any;
        if (typeof authClient.refreshSession === 'function') {
          try {
            const { data, error: refreshError } = await authClient.refreshSession();
            
            if (refreshError) {
              console.error('Error refreshing session:', refreshError);
            } else {
              console.log('Session refreshed successfully');
            }
          } catch (error) {
            console.error('Exception during session refresh:', error);
          }
        } else {
          console.log('refreshSession method not available (mock mode)');
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
      
      // Check if refreshSession method exists (real Supabase client)
      const authClient = supabase.auth as any;
      if (typeof authClient.refreshSession === 'function') {
        try {
          const { data, error } = await authClient.refreshSession();
          
          if (error) {
            console.error('Error force refreshing session:', error);
            return false;
          }
          
          console.log('Session force refreshed successfully');
          return true;
        } catch (refreshError) {
          console.error('Exception during force refresh:', refreshError);
          return false;
        }
      } else {
        console.log('refreshSession method not available (mock mode)');
        return false;
      }
    } catch (error) {
      console.error('Error in force refresh:', error);
      return false;
    }
  }
}

// Create singleton instance
export const sessionManager = new SessionManager();