'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signIn } from '@/lib/auth/auth';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  // Handle URL messages (success/info messages)
  useEffect(() => {
    const message = searchParams.get('message');
    const error = searchParams.get('error');
    
    if (message === 'email_confirmed') {
      setSuccess('Email confirmed successfully! You can now sign in.');
    } else if (message === 'session_expired') {
      setError('Your session has expired. Please sign in again.');
    }
    
    if (error === 'auth_error') {
      setError('Authentication failed. Please try signing in again.');
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setLoading(false);
      setError('Sign in is taking longer than expected. Please try again.');
    }, 30000); // 30 second timeout

    try {
      const result = await signIn(email, password);
      clearTimeout(timeoutId);
      
      if (result && result.user) {
        // Show success message briefly before redirect
        setSuccess('Welcome back! Redirecting to your dashboard...');
        
        // Small delay to show success message
        setTimeout(() => {
          router.push('/dashboard');
        }, 1000);
      } else {
        setError('Unable to sign in. Please check your credentials and try again.');
        setLoading(false);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      
      // Clean up error messages - remove technical details
      let cleanError = 'Unable to sign in. Please try again.';
      
      if (err instanceof Error) {
        const errorMessage = err.message.toLowerCase();
        
        // Map technical errors to user-friendly messages
        if (errorMessage.includes('invalid login credentials') ||
            errorMessage.includes('email or password')) {
          cleanError = err.message; // These are already user-friendly
        } else if (errorMessage.includes('network') ||
                   errorMessage.includes('connection')) {
          cleanError = 'Connection issue. Please check your internet and try again.';
        } else if (errorMessage.includes('timeout')) {
          cleanError = 'Request timed out. Please try again.';
        } else if (errorMessage.includes('trainer account')) {
          cleanError = err.message; // Trainer approval messages are already clean
        } else {
          // For any other technical errors, use the clean message from auth.ts
          cleanError = err.message;
        }
      }
      
      setError(cleanError);
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Welcome back</CardTitle>
        <CardDescription className="text-center">
          Sign in to your Just Dogs account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm font-medium shadow-sm">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm font-medium shadow-sm">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>{success}</span>
              </div>
            </div>
          )}
          
          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          
          <Input
            id="password"
            type="password"
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          
          <Button
            type="submit"
            className="w-full bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)]"
            loading={loading}
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
        
        <div className="mt-6 text-center space-y-2">
          <Link
            href="/reset-password"
            className="text-sm text-[rgb(0_32_96)] hover:text-[rgb(0_24_72)] hover:underline"
          >
            Forgot your password?
          </Link>
          
          <div className="text-sm text-gray-600">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="text-[rgb(0_32_96)] hover:text-[rgb(0_24_72)] hover:underline"
            >
              Sign up
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center px-6" suppressHydrationWarning>
      {/* Just Dogs Logo */}
      <div className="mb-8">
        <img
          src="/images/icons/logo.gif"
          alt="Just Dogs Logo"
          className="w-16 h-20 mx-auto mb-4"
        />
        <h1 className="text-3xl font-bold text-[rgb(0_32_96)] text-center">
          Just Dogs
        </h1>
      </div>

      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}