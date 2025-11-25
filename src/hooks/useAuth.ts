import { useState, useEffect } from 'react';
import { User } from '@/types';
import { getCurrentUser, signOut } from '@/lib/auth/auth';
import { supabase } from '@/lib/supabase/client';
import { sessionManager } from '@/lib/auth/sessionManager';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let mounted = true;

    // Initialize session monitoring
    sessionManager.initialize();

    // Initialize auth state - optimized to check session first
    const initializeAuth = async () => {
      try {
        // Quick session check first
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // No session, skip user lookup
          if (mounted) {
            setUser(null);
            setInitialized(true);
            setLoading(false);
          }
          return;
        }
        
        // Session exists, get user profile
        setLoading(true);
        const currentUser = await getCurrentUser();
        
        if (mounted) {
          setUser(currentUser);
          setInitialized(true);
          setLoading(false);
          
          // Start session monitoring if user is already logged in
          if (currentUser) {
            sessionManager.startMonitoring();
          }
        }
      } catch (error) {
        console.error('useAuth: Error initializing auth:', error);
        if (mounted) {
          setUser(null);
          setInitialized(true);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Set up auth state change listener for Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: any, session: any) => {
        console.log('useAuth: Auth state changed:', event, session?.user?.email || 'no user');
        
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          // User signed in, get their profile (but don't block UI)
          setLoading(true);
          getCurrentUser()
            .then(currentUser => {
              if (mounted) {
            setUser(currentUser);
                setLoading(false);
            // Start session monitoring after successful login
                if (currentUser) {
            sessionManager.startMonitoring();
                }
              }
            })
            .catch(error => {
            console.error('useAuth: Error getting user after sign in:', error);
              if (mounted) {
            setUser(null);
                setLoading(false);
          }
            });
        } else if (event === 'SIGNED_OUT') {
          // User signed out
          setUser(null);
          console.log('useAuth: User signed out');
          // Stop session monitoring on logout
          sessionManager.stopMonitoring();
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Token refreshed, user is still authenticated
          console.log('useAuth: Token refreshed for user:', session.user.email);
          // Keep the current user, no need to refetch
        }
        
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
      sessionManager.stopMonitoring();
    };
  }, []);

  const logout = async () => {
    try {
      console.log('useAuth: Logging out...');
      await signOut();
      setUser(null);
      sessionManager.stopMonitoring();
      console.log('useAuth: Logout complete');
    } catch (error) {
      console.error('useAuth: Error signing out:', error);
    }
  };

  return {
    user,
    loading,
    initialized,
    logout,
    isAuthenticated: !!user,
  };
}