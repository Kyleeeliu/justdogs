'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User } from '@/types';

const demoUsers: User[] = [
  {
    id: '1',
    email: 'admin@justdogs.co.za',
    full_name: 'Admin User',
    role: 'admin',
    phone: '+27 82 123 4567',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    email: 'trainer@justdogs.co.za',
    full_name: 'Trainer User',
    role: 'trainer',
    phone: '+27 83 987 6543',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    email: 'parent@justdogs.co.za',
    full_name: 'Parent User',
    role: 'parent',
    phone: '+27 84 555 1234',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export default function UserSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  const switchUser = (user: User) => {
    localStorage.setItem('mockUser', JSON.stringify(user));
    setIsOpen(false);
    router.refresh();
  };

  // Only show in development mode
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
        <Card className="w-80 mb-2">
          <CardHeader>
            <CardTitle className="text-sm">Switch User (Dev Only)</CardTitle>
            <CardDescription>Quickly switch between demo accounts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {demoUsers.map((user) => (
              <Button
                key={user.id}
                variant="outline"
                size="sm"
                className="w-full justify-start"
                onClick={() => switchUser(user)}
              >
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 rounded-full bg-[rgb(0_32_96)] bg-opacity-10 flex items-center justify-center">
                    <span className="text-xs font-medium text-[rgb(0_32_96)]">
                      {user.full_name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-medium">{user.full_name}</div>
                    <div className="text-xs text-gray-500 capitalize">{user.role}</div>
                  </div>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>
      )}
      
      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="sm"
        variant="outline"
        className="bg-white shadow-lg"
      >
        👤 Switch User
      </Button>
    </div>
  );
}
