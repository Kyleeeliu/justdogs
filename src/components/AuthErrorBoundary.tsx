'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AuthRecovery } from '@/lib/auth/authRecovery';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary specifically for handling authentication errors
 * Catches refresh token errors and other auth-related issues
 */
export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AuthErrorBoundary caught an error:', error, errorInfo);
    
    // Check if this is an auth-related error
    if (AuthRecovery.shouldRecover(error)) {
      console.log('AuthErrorBoundary: Handling auth error');
      // Handle auth recovery asynchronously
      AuthRecovery.handleAuthError(error, 'AuthErrorBoundary').catch(console.error);
    }
  }

  render() {
    if (this.state.hasError) {
      // Check if it's an auth error that should trigger recovery
      if (this.state.error && AuthRecovery.shouldRecover(this.state.error)) {
        // Show a loading state while redirecting
        return (
          <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <h2 className="text-lg font-medium text-gray-900 mb-2">Session Expired</h2>
              <p className="text-gray-600">Redirecting to login...</p>
            </div>
          </div>
        );
      }

      // For non-auth errors, show a generic error message
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="text-red-500 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
            <p className="text-gray-600 mb-4">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to manually trigger auth error recovery
 */
export function useAuthErrorRecovery() {
  const handleAuthError = React.useCallback(async (error: any) => {
    if (AuthRecovery.shouldRecover(error)) {
      await AuthRecovery.handleAuthError(error, 'manual trigger');
      return true;
    }
    return false;
  }, []);

  return { handleAuthError };
}