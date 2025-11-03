'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { signUp } from '@/lib/auth/auth';
import { UserRole } from '@/types';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'parent' as UserRole,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [emailConfirmationRequired, setEmailConfirmationRequired] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      console.log('Register page: Attempting sign up for:', formData.email);
      const result = await signUp(formData.email, formData.password, formData.fullName, formData.role);
      console.log('Register page: Sign up successful, result:', result);
      
      // Check if email confirmation is required (for Supabase)
      if (result && 'message' in result && result.message && result.message.includes('email')) {
        console.log('Register page: Email confirmation required');
        setEmailConfirmationRequired(true);
        setSuccess(true);
        setError(''); // Clear any previous errors
        // Don't redirect to dashboard, show email confirmation message
        return;
      }
      
      // For mock authentication, set the user session immediately
      if (result && result.user && result.session) {
        console.log('Register page: Setting user session...');
        try {
          localStorage.setItem('mockUser', JSON.stringify(result.user));
          // Verify it was set correctly
          const stored = localStorage.getItem('mockUser');
          if (stored) {
            console.log('Register page: User session set successfully');
          } else {
            console.error('Register page: Failed to set user session');
          }
        } catch (error) {
          console.error('Register page: Error setting user session:', error);
        }
        console.log('Register page: User session set, redirecting to dashboard');
        
        setSuccess(true);
        setTimeout(() => {
          console.log('Register page: Redirecting to dashboard');
          router.push('/dashboard');
        }, 2000);
      } else {
        // For Supabase with email confirmation, show success message
        setSuccess(true);
        setError('');
      }
    } catch (err) {
      console.error('Register page: Sign up error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center text-green-600">🎉 Registration Successful!</CardTitle>
          <CardDescription className="text-center">
            {emailConfirmationRequired ? 
              'Please check your email to confirm your account before signing in.' :
              'Welcome to Just Dogs! Redirecting you to your dashboard...'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center">
          {!emailConfirmationRequired ? (
            <>
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(0_32_96)] mx-auto mb-4"></div>
              <p className="text-sm text-gray-600">
                You can now sign in with your new account.
              </p>
            </>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                We&apos;ve sent a confirmation email to your address. Please click the link in the email to verify your account.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none bg-[rgb(0_32_96)] text-white hover:bg-[rgb(0_24_72)] focus-visible:ring-[rgb(0_32_96)] h-10 py-2 px-4"
              >
                Go to Sign In
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Create your account</CardTitle>
        <CardDescription className="text-center">
          Join Just Dogs and start managing your training sessions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <Input
            id="fullName"
            type="text"
            label="Full Name"
            placeholder="Enter your full name"
            value={formData.fullName}
            onChange={(e) => handleInputChange('fullName', e.target.value)}
            required
          />
          
          <Input
            id="email"
            type="email"
            label="Email"
            placeholder="Enter your email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            required
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => handleInputChange('role', e.target.value)}
              className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)] focus:border-transparent"
              required
            >
              <option value="parent">Dog Parent</option>
              <option value="trainer">Trainer</option>
            </select>
          </div>
          
          <Input
            id="password"
            type="password"
            label="Password"
            placeholder="Create a password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            required
          />
          
          <Input
            id="confirmPassword"
            type="password"
            label="Confirm Password"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            required
          />
          
          <Button
            type="submit"
            className="w-full bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)]"
            loading={loading}
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>
        
        <div className="mt-6 text-center">
          <div className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link
              href="/login"
              className="text-[rgb(0_32_96)] hover:text-[rgb(0_24_72)] hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
