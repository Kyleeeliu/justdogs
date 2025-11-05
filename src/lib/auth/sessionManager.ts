import { supabase } from '@/lib/supabase/client';

class SessionManager {
  private refreshInterval: NodeJS.Timeout | null = null;
  private readonly REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutes
  private readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes before expiry

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
    // Clear any existing interval
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }

    // Set up periodic session check
    this.refreshInterval = setInterval(async () => {
      await this.checkAndRefreshSession();
    }, this.REFRESH_INTERVAL);

    // Also check session on page focus
    window.addEventListener('focus', this.checkAndRefreshSession);
    
    // Check session on page visibility change
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.checkAndRefreshSession();
      }
    });
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
        if (typeof (supabase.auth as any).refreshSession === 'function') {
          const { data, error: refreshError } = await (supabase.auth as any).refreshSession();
          
          if (refreshError) {
            console.error('Error refreshing session:', refreshError);
          } else {
            console.log('Session refreshed successfully');
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

    if (typeof window !== 'undefined') {
      window.removeEventListener('focus', this.checkAndRefreshSession);
    }
  }

  public async forceRefreshSession() {
    try {
      console.log('Force refreshing session...');
      
      // Check if refreshSession method exists (real Supabase client)
      if (typeof (supabase.auth as any).refreshSession === 'function') {
        const { data, error } = await (supabase.auth as any).refreshSession();
        
        if (error) {
          console.error('Error force refreshing session:', error);
          return false;
        }
        
        console.log('Session force refreshed successfully');
        return true;
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