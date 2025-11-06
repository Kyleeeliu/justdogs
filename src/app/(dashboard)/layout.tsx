'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

import { 
  HomeIcon, 
  UserGroupIcon, 
  CalendarIcon, 
  ChatBubbleLeftRightIcon,
  UserIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon
} from '@heroicons/react/24/outline';
import { getCurrentUser, signOut } from '@/lib/auth/auth';
import { User } from '@/types';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Dogs', href: '/dogs', icon: UserGroupIcon },
  { name: 'Bookings & Sessions', href: '/bookings-sessions', icon: CalendarIcon },
  { name: 'Messages', href: '/messages', icon: ChatBubbleLeftRightIcon },
  { name: 'Profile', href: '/profile', icon: UserIcon },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Check for existing user session on component mount
  useEffect(() => {
    const checkExistingSession = () => {
      try {
        const mockUserStr = localStorage.getItem('mockUser');
        if (mockUserStr) {
          const existingUser = JSON.parse(mockUserStr);
          if (existingUser.id && existingUser.email && existingUser.full_name && existingUser.role) {
            console.log('Found existing user session:', existingUser.full_name);
            setUser(existingUser);
            setAuthChecked(true);
            setLoading(false);
            return true;
          }
        }
      } catch (error) {
        console.error('Error checking existing session:', error);
      }
      return false;
    };

    // Only check if we haven't already checked auth
    if (!authChecked) {
      const hasExistingSession = checkExistingSession();
      if (!hasExistingSession) {
        // No existing session, proceed with normal auth check
        setLoading(true);
      }
    }
  }, [authChecked]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        console.log('Dashboard layout: Checking authentication...');
        
        // Try multiple times with increasing delays to handle race conditions
        let currentUser = null;
        let attempts = 0;
        const maxAttempts = 10;
        
        while (attempts < maxAttempts && !currentUser) {
          try {
            // Add progressive delay
            if (attempts > 0) {
              await new Promise(resolve => setTimeout(resolve, 50 * attempts));
            }
            
            currentUser = await getCurrentUser();
            console.log(`Dashboard layout: Auth check attempt ${attempts + 1}:`, currentUser?.full_name || 'no user');
            
            if (currentUser) {
              break;
            }
            
            attempts++;
          } catch (error) {
            console.error(`Dashboard layout: Auth check attempt ${attempts + 1} error:`, error);
            attempts++;
          }
        }
        
        if (!currentUser) {
          console.log('Dashboard layout: No user found after', maxAttempts, 'attempts, redirecting to login');
          setAuthChecked(true);
          router.push('/login');
          return;
        }
        
        console.log('Dashboard layout: User authenticated:', currentUser.full_name);
        setUser(currentUser);
        setAuthChecked(true);
      } catch (error) {
        console.error('Dashboard layout: Auth check error:', error);
        setAuthChecked(true);
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    // Only run auth check once on mount
    if (!authChecked) {
      console.log('Dashboard layout: Starting auth check...');
      checkAuth();
    }
  }, [router, authChecked]);

  const handleSignOut = async () => {
    try {
      await signOut();
      setUser(null);
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Show loading while checking authentication
  if (loading || !authChecked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(0_32_96)] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user after auth check, show login redirect
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(0_32_96)] mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)} />
        <div className="fixed inset-y-0 left-0 flex w-72 sm:w-64 flex-col bg-white shadow-xl">
          <div className="flex h-16 items-center justify-between px-4">
            <h1 className="text-lg sm:text-xl font-bold text-[rgb(0_32_96)]">🐕 Just Dogs</h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6" />
            </Button>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-3 py-3 text-base font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-[rgb(0_32_96)] text-white'
                        : 'text-gray-600 hover:bg-[rgb(0_32_96)] hover:bg-opacity-10 hover:text-[rgb(0_32_96)]'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className="mr-3 h-6 w-6" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center mb-4">
              <div className="h-10 w-10 rounded-full bg-[rgb(0_32_96)] flex items-center justify-center">
                <span className="text-base font-medium text-white">
                  {user?.full_name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-base font-medium text-gray-700 truncate">{user?.full_name}</p>
                <p className="text-sm text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="w-full border-[rgb(0_32_96)] text-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)] hover:text-white min-h-[44px]"
              onClick={handleSignOut}
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <div className="flex flex-col flex-grow bg-white border-r border-gray-200">
          <div className="flex h-16 items-center px-4">
            <h1 className="text-xl font-bold text-[rgb(0_32_96)]">🐕 Just Dogs</h1>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    isActive
                      ? 'bg-[rgb(0_32_96)] text-white'
                      : 'text-gray-600 hover:bg-[rgb(0_32_96)] hover:bg-opacity-10 hover:text-white'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center mb-4">
              <div className="h-8 w-8 rounded-full bg-[rgb(0_32_96)] flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.full_name?.charAt(0) || 'U'}
                </span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">{user?.full_name}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-[rgb(0_32_96)] text-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)] hover:text-white"
              onClick={handleSignOut}
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            className="lg:hidden min-h-[44px] min-w-[44px] p-2"
            onClick={() => setSidebarOpen(true)}
          >
            <Bars3Icon className="h-6 w-6" />
          </Button>
          
          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1"></div>
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <div className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200" />
              <div className="flex items-center gap-x-4">
                <span className="text-sm lg:text-base text-gray-700 truncate">
                  Welcome back, {user?.full_name}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-4 sm:py-6 pb-20 lg:pb-4">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>

        {/* Mobile bottom navigation */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 lg:hidden">
          <nav className="flex justify-around">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex flex-col items-center py-2 px-3 text-xs font-medium transition-colors ${
                    isActive
                      ? 'text-[rgb(0_32_96)]'
                      : 'text-gray-500 hover:text-[rgb(0_32_96)]'
                  }`}
                >
                  <item.icon className="h-6 w-6 mb-1" />
                  <span className="truncate max-w-[60px]">{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
