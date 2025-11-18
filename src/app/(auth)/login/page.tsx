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

  // Handle email confirmation callback
  useEffect(() => {
    const message = searchParams.get('message');
    if (message === 'email_confirmed') {
      setSuccess('Email confirmed successfully! You can now sign in.');
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
      console.log('Login page: Attempting sign in for:', email);
      const result = await signIn(email, password);
      console.log('Login page: Sign in successful:', result);
      
      clearTimeout(timeoutId);
      
      if (result && result.user) {
        console.log('Login page: User authenticated:', result.user);
        
        // Redirect immediately - useAuth hook will handle session verification
        console.log('Login page: Redirecting to dashboard');
        router.push('/dashboard');
        // Don't set loading to false here - let the redirect happen
      } else {
        console.error('Login page: No user data received');
        setError('Login failed - no user data received');
        setLoading(false);
      }
    } catch (err) {
      clearTimeout(timeoutId);
      console.error('Login page: Sign in error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during sign in');
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
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md text-sm">
              {success}
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
          className="w-20 h-20 mx-auto mb-4"
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