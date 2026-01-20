'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AuthRecovery } from '@/lib/auth/authRecovery';
import { 
  ExclamationTriangleIcon, 
  ArrowPathIcon,
  CheckCircleIcon 
} from '@heroicons/react/24/outline';

export default function AuthRecoveryPage() {
  const [clearing, setClearing] = useState(false);
  const [cleared, setCleared] = useState(false);

  const handleClearAuth = async () => {
    setClearing(true);
    try {
      await AuthRecovery.clearAndRedirect();
      setCleared(true);
    } catch (error) {
      console.error('Error clearing auth:', error);
    } finally {
      setClearing(false);
    }
  };

  if (cleared) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="max-w-md w-full">
          <CardContent className="text-center py-12">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Auth State Cleared</h2>
            <p className="text-gray-600 mb-6">
              Your authentication state has been cleared. You will be redirected to the login page shortly.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold text-gray-900">
            Authentication Recovery
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-gray-600 mb-4">
              If you're experiencing authentication issues like "Invalid Refresh Token" errors, 
              this tool can help by clearing your authentication state.
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6">
              <div className="flex">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-700">
                  <p className="font-medium">This will:</p>
                  <ul className="mt-2 list-disc list-inside space-y-1">
                    <li>Sign you out of the application</li>
                    <li>Clear all stored authentication tokens</li>
                    <li>Redirect you to the login page</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Button
              onClick={handleClearAuth}
              disabled={clearing}
              className="w-full bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
            >
              {clearing ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                  Clearing Auth State...
                </>
              ) : (
                <>
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Clear Authentication State
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={() => window.location.href = '/login'}
              className="w-full"
            >
              Back to Login
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              If you continue to experience issues after clearing your auth state, 
              please contact support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}