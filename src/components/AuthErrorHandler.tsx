'use client';

import { useEffect } from 'react';
import { AuthRecovery } from '@/lib/auth/authRecovery';

/**
 * Global authentication error handler component
 * This component listens for authentication errors and handles them gracefully
 */
export function AuthErrorHandler() {
  useEffect(() => {
    // Handle unhandled promise rejections that might be auth-related
    const handleUnhandledRejection = async (event: PromiseRejectionEvent) => {
      const error = event.reason;
      
      // Check if it's an authentication error that should trigger recovery
      if (AuthRecovery.shouldRecover(error)) {
        console.log('AuthErrorHandler: Handling unhandled auth rejection');
        event.preventDefault(); // Prevent the error from being logged to console
        
        // Use AuthRecovery to handle the error
        await AuthRecovery.handleAuthError(error, 'unhandled rejection');
      }
    };

    // Handle global errors that might be auth-related
    const handleError = async (event: ErrorEvent) => {
      const error = event.error;
      
      // Check if it's an authentication error that should trigger recovery
      if (AuthRecovery.shouldRecover(error)) {
        console.log('AuthErrorHandler: Handling global auth error');
        event.preventDefault(); // Prevent the error from being logged to console
        
        // Use AuthRecovery to handle the error
        await AuthRecovery.handleAuthError(error, 'global error');
      }
    };

    // Add event listeners
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    // Cleanup event listeners on unmount
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
    };
  }, []);

  // This component doesn't render anything
  return null;
}

/**
 * Higher-order component to wrap components with auth error handling
 */
export function withAuthErrorHandling<P extends object>(
  Component: React.ComponentType<P>
) {
  return function AuthErrorWrappedComponent(props: P) {
    return (
      <>
        <AuthErrorHandler />
        <Component {...props} />
      </>
    );
  };
}