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

    // Initialize auth state
    const initializeAuth = async () => {
      try {
        console.log('Initializing auth state...');
        const currentUser = await getCurrentUser();
        
        if (mounted) {
          setUser(currentUser);
          setInitialized(true);
          console.log('Auth initialized with user:', currentUser?.email || 'none');
          
          // Start session monitoring if user is already logged in
          if (currentUser) {
            sessionManager.startMonitoring();
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setUser(null);
          setInitialized(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Set up auth state change listener for Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email || 'no user');
        
        if (!mounted) return;

        if (event === 'SIGNED_IN' && session?.user) {
          // User signed in, get their profile
          try {
            const currentUser = await getCurrentUser();
            setUser(currentUser);
            console.log('User signed in:', currentUser?.email);
            // Start session monitoring after successful login
            sessionManager.startMonitoring();
          } catch (error) {
            console.error('Error getting user after sign in:', error);
            setUser(null);
          }
        } else if (event === 'SIGNED_OUT') {
          // User signed out
          setUser(null);
          console.log('User signed out');
          // Stop session monitoring on logout
          sessionManager.stopMonitoring();
        } else if (event === 'TOKEN_REFRESHED' && session?.user) {
          // Token refreshed, user is still authenticated
          console.log('Token refreshed for user:', session.user.email);
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
      await signOut();
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
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