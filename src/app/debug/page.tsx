'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getCurrentUser } from '@/lib/auth/auth';
import { User } from '@/types';

export default function DebugPage() {
  const [user, setUser] = useState<User | null>(null);
  const [localStorageData, setLocalStorageData] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error('Auth error:', error);
      }
    };

    // Get localStorage data
    const mockUser = localStorage.getItem('mockUser');
    const newUsers = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('newUser_')) {
        newUsers.push({ key, value: localStorage.getItem(key) });
      }
    }

    setLocalStorageData({
      mockUser,
      newUsers,
      totalItems: localStorage.length
    });

    checkAuth();
  }, []);

  const clearAll = () => {
    localStorage.clear();
    setLocalStorageData({});
    setUser(null);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">Debug Page</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Authentication Status</CardTitle>
            <CardDescription>Current user and authentication state</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto">
              {JSON.stringify(user, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>LocalStorage Data</CardTitle>
            <CardDescription>All authentication-related localStorage items</CardDescription>
          </CardHeader>
          <CardContent>
            <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto">
              {JSON.stringify(localStorageData, null, 2)}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Debug actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={clearAll} variant="destructive">
              Clear All localStorage
            </Button>
            <Button onClick={() => window.location.reload()}>
              Reload Page
            </Button>
            <Button onClick={() => window.location.href = '/login'}>
              Go to Login
            </Button>
            <Button onClick={() => window.location.href = '/dashboard'}>
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
