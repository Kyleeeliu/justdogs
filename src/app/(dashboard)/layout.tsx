'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { getUnreadMessageCount } from '@/lib/supabase/messages';

import {
  HomeIcon,
  UserGroupIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon,
  UserIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  NewspaperIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon, mobileLabel: 'Home' },
  { name: 'Dogs', href: '/dogs', icon: UserGroupIcon, mobileLabel: 'Dogs' },
  { name: 'Bookings & Sessions', href: '/bookings-sessions', icon: CalendarIcon, mobileLabel: 'Bookings' },
  { name: 'Messages', href: '/messages', icon: ChatBubbleLeftRightIcon, mobileLabel: 'Messages' },
  { name: 'News & Events', href: '/news', icon: NewspaperIcon, mobileLabel: 'News' },
  { name: 'Profile', href: '/profile', icon: UserIcon, mobileLabel: 'Profile' },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, initialized, logout, isAuthenticated } = useAuth();

  // Redirect to login if not authenticated after initialization
  useEffect(() => {
    // CRITICAL FIX: Only redirect after auth is fully initialized AND we're sure there's no user
    if (initialized && !loading && !isAuthenticated) {
      console.log('Dashboard layout: User not authenticated after initialization, redirecting to login');
      console.log('Dashboard layout: State:', { initialized, loading, isAuthenticated, user });
      
      // Use router.push for better navigation experience
      router.push('/login');
    }
  }, [initialized, loading, isAuthenticated, user, router]);

  // Load unread message count
  useEffect(() => {
    const loadUnreadCount = async () => {
      if (!user) return;
      
      try {
        const unreadCount = await getUnreadMessageCount(user.id);
        setUnreadMessageCount(unreadCount);
      } catch (error) {
        console.error('Error loading unread message count:', error);
        setUnreadMessageCount(0);
      }
    };

    loadUnreadCount();
    
    // Set up interval to refresh unread count every 30 seconds
    const interval = setInterval(loadUnreadCount, 30000);
    
    return () => clearInterval(interval);
  }, [user]);

  // Listen for messages read events and clear unread count when visiting messages page
  useEffect(() => {
    const handleMessagesRead = (event: CustomEvent) => {
      setUnreadMessageCount(prev => Math.max(0, prev - event.detail.count));
    };

    // Listen for custom event from messages page
    window.addEventListener('messagesRead', handleMessagesRead as EventListener);

    if (pathname === '/messages') {
      // Small delay to allow messages to be marked as read
      const timer = setTimeout(() => {
        setUnreadMessageCount(0);
      }, 1000);
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener('messagesRead', handleMessagesRead as EventListener);
      };
    }

    return () => {
      window.removeEventListener('messagesRead', handleMessagesRead as EventListener);
    };
  }, [pathname]);

  const handleSignOut = async () => {
    try {
      await logout();
      // Use hard redirect for logout to main page
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Show loading while checking authentication
  // IMPORTANT: Wait for BOTH initialized AND !loading before making decisions
  if (!initialized || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(0_32_96)] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user after auth check is complete, show redirect message
  if (!isAuthenticated || !user) {
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
            <Link href="/dashboard" className="flex items-center">
              <Image
                src="/images/icons/logo.png"
                alt="Just Dogs Logo"
                width={24}
                height={32}
                className="w-6 h-8 mr-2 object-contain"
              />
              <h1 className="text-lg sm:text-xl font-bold text-[rgb(0_32_96)]">Just Dogs</h1>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSidebarOpen(false)}
            >
              <XMarkIcon className="h-6 w-6" />
            </Button>
          </div>
          <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const showBadge = item.name === 'Messages' && unreadMessageCount > 0;
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
                  <span className="flex-1">{item.name}</span>
                  {showBadge && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                      {unreadMessageCount}
                    </span>
                  )}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => { setSidebarOpen(false); handleSignOut(); }}
              className="group flex w-full items-center px-3 py-3 text-base font-medium rounded-lg text-gray-600 hover:bg-[rgb(0_32_96)] hover:bg-opacity-10 hover:text-[rgb(0_32_96)] transition-colors"
            >
              <ArrowRightOnRectangleIcon className="mr-3 h-6 w-6" />
              Sign Out
            </button>
          </nav>
          <div className="border-t border-gray-200 p-4 shrink-0">
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
            <Link href="/dashboard" className="flex items-center">
              <Image
                src="/images/icons/logo.png"
                alt="Just Dogs Logo"
                width={24}
                height={32}
                className="w-6 h-8 mr-2 object-contain"
              />
              <h1 className="text-xl font-bold text-[rgb(0_32_96)]">Just Dogs</h1>
            </Link>
          </div>
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const showBadge = item.name === 'Messages' && unreadMessageCount > 0;
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
                  <span className="flex-1">{item.name}</span>
                  {showBadge && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[18px] text-center">
                      {unreadMessageCount}
                    </span>
                  )}
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

        {/* Mobile bottom navigation - compact so all 6 items fit on small screens */}
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 lg:hidden safe-area-pb">
          <nav className="flex">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const showBadge = item.name === 'Messages' && unreadMessageCount > 0;
              const label = (item as { mobileLabel?: string }).mobileLabel ?? item.name;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex flex-1 min-w-0 flex-col items-center justify-center py-1.5 px-0.5 text-[10px] font-medium transition-colors relative ${
                    isActive
                      ? 'text-[rgb(0_32_96)]'
                      : 'text-gray-500 hover:text-[rgb(0_32_96)]'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <item.icon className="h-5 w-5 mb-0.5" />
                    {showBadge && (
                      <span className="absolute -top-0.5 -right-1 bg-red-500 text-white text-[10px] rounded-full px-1 py-0 min-w-[14px] text-center leading-none">
                        {unreadMessageCount > 99 ? '99+' : unreadMessageCount}
                      </span>
                    )}
                  </div>
                  <span className="truncate w-full text-center max-w-[52px]">{label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}