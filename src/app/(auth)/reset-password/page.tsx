'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validToken, setValidToken] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Check if user has a valid recovery token from the URL
  useEffect(() => {
    const checkRecoveryToken = async () => {
      try {
        const tokenHash = searchParams.get('token_hash');
        const type = searchParams.get('type');

        // If we have token_hash in URL, verify the recovery session
        if (tokenHash && type === 'recovery') {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });

          if (error) {
            console.error('Token verification error:', error);
            setValidToken(false);
            setError('Invalid or expired reset link. Please request a new password reset.');
          } else if (data.session) {
            // Token is valid and session is created
            setValidToken(true);
          } else {
            setValidToken(false);
            setError('Unable to verify reset link. Please try again.');
          }
        } else {
          // No token in URL, check if there's an existing session (user already verified)
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            setValidToken(true);
          } else {
            setValidToken(false);
            setError('Invalid or expired reset link. Please request a new password reset.');
          }
        }
      } catch (err) {
        console.error('Token check error:', err);
        setValidToken(false);
        setError('Unable to verify reset link. Please try again.');
      } finally {
        setCheckingToken(false);
      }
    };

    checkRecoveryToken();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please try again.');
      setLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      // Update the user's password
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        // Handle specific error cases with user-friendly messages
        if (error.message.includes('same password') || error.message.includes('New password should be different')) {
          setError('Please choose a different password. Your new password cannot be the same as your current password.');
          setLoading(false);
          return;
        } else if (error.message.includes('weak') || error.message.includes('password is too weak')) {
          setError('Password is too weak. Please use a stronger password with a mix of letters, numbers, and symbols.');
          setLoading(false);
          return;
        } else {
          throw error;
        }
      }

      setSuccess(true);
      
      // Sign out the user to clear the recovery session
      await supabase.auth.signOut();
      
      // Redirect to login after a brief delay
      setTimeout(() => {
        router.push('/login?message=password_reset');
      }, 2000);
    } catch (err) {
      // Only log unexpected errors to console
      console.error('Password reset error:', err);
      
      if (err instanceof Error) {
        setError('Unable to reset password. Please try again or request a new reset link.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (checkingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(0_32_96)] mx-auto mb-4"></div>
              <p className="text-gray-600">Verifying reset link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!validToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center px-6">
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

        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Invalid Reset Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
              <div className="flex items-start">
                <svg className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium mb-1">{error}</p>
                  <p className="text-red-700 text-xs">
                    Reset links expire after a short time for security reasons.
                  </p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => router.push('/forgot-password')}
              className="w-full bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)]"
            >
              Request New Reset Link
            </Button>

            <div className="text-center">
              <button
                onClick={() => router.push('/login')}
                className="text-sm text-[rgb(0_32_96)] hover:text-[rgb(0_24_72)] hover:underline"
              >
                Back to Sign In
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center px-6">
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

      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center">Set new password</CardTitle>
          <CardDescription className="text-center">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg text-sm">
                <div className="flex items-start">
                  <svg className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className="font-medium mb-1">Password reset successful!</p>
                    <p className="text-green-700">
                      Your password has been updated. Redirecting you to sign in...
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
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
              
              <Input
                id="password"
                type="password"
                label="New password"
                placeholder="Enter new password (min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              
              <Input
                id="confirmPassword"
                type="password"
                label="Confirm new password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
              />
              
              <Button
                type="submit"
                className="w-full bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)]"
                loading={loading}
                disabled={loading}
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}