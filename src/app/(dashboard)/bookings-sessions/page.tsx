'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  CalendarIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ViewColumnsIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { Booking, BookingStatus } from '@/types';
import { authenticatedGet, authenticatedFetch } from '@/lib/api/apiClient';

/* -------------------------------------------------- */
/* Helpers                                            */
/* -------------------------------------------------- */

const getStatusIcon = (status: BookingStatus) => {
  switch (status) {
    case 'pending':
      return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    case 'confirmed':
      return <CalendarIcon className="h-5 w-5 text-blue-500" />;
    case 'completed':
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    case 'cancelled':
      return <XCircleIcon className="h-5 w-5 text-red-500" />;
    default:
      return null;
  }
};

const getStatusColor = (status: BookingStatus) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'confirmed':
      return 'bg-blue-100 text-blue-800';
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const formatDateTime = (date: string) =>
  new Date(date).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/* -------------------------------------------------- */
/* Page                                               */
/* -------------------------------------------------- */

export default function BookingsSessionsPage() {
  const { user, loading: authLoading } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<'bookings' | 'sessions'>('bookings');
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  /* -------------------------------------------------- */
  /* Load bookings                                     */
  /* -------------------------------------------------- */

  useEffect(() => {
    if (!user) return;

    const loadBookings = async () => {
      try {
        setLoading(true);
        
        // Use authenticated API client
        const res = await authenticatedGet('/api/bookings');
        console.log('Bookings API response received');

        const data: Booking[] = await res.json();

        let visible = data;

        if (user.role === 'parent') {
          visible = data.filter(b => b.parent_id === user.id);
        }

        if (user.role === 'trainer') {
          visible = data.filter(b => b.trainer_id === user.id);
        }

        // Admin sees everything
        setBookings(visible);
      } catch (err) {
        console.error('Error loading bookings:', err);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, [user]);

  /* -------------------------------------------------- */
  /* Approve/Reject booking                            */
  /* -------------------------------------------------- */

  const handleBookingStatusUpdate = async (bookingId: string, status: 'confirmed' | 'cancelled') => {
    try {
      // Use authenticated API client for PUT request
      const res = await authenticatedFetch('/api/bookings', {
        method: 'PUT',
        body: JSON.stringify({ id: bookingId, status }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Update failed');
      }

      // Reload bookings using authenticated client
      const updatedRes = await authenticatedGet('/api/bookings');
      const updated = await updatedRes.json();
      
      // Filter based on user role
      let visible = updated;
      if (user?.role === 'parent') {
        visible = updated.filter((b: Booking) => b.parent_id === user.id);
      } else if (user?.role === 'trainer') {
        visible = updated.filter((b: Booking) => b.trainer_id === user.id);
      }
      
      setBookings(visible);
    } catch (error) {
      console.error('Error updating booking status:', error);
      alert('Failed to update booking status');
    }
  };

  /* -------------------------------------------------- */
  /* Derived data                                      */
  /* -------------------------------------------------- */

  const filteredBookings = bookings.filter(b => {
    // Sessions tab shows confirmed and completed bookings
    if (activeTab === 'sessions' && b.status !== 'confirmed' && b.status !== 'completed') {
      return false;
    }

    // Bookings tab shows pending and cancelled bookings
    if (activeTab === 'bookings' && (b.status === 'confirmed' || b.status === 'completed')) {
      return false;
    }

    if (filter !== 'all' && b.status !== filter) return false;

    if (search) {
      const q = search.toLowerCase();
      return (
        b.booking_type.toLowerCase().includes(q) ||
        b.location?.toLowerCase().includes(q) ||
        b.special_instructions?.toLowerCase().includes(q)
      );
    }

    return true;
  });

  const upcomingCount = bookings.filter(
    b => new Date(b.start_time) > new Date() && b.status !== 'cancelled'
  ).length;

  const pendingCount = bookings.filter(b => b.status === 'pending').length;

  /* -------------------------------------------------- */
  /* Loading                                           */
  /* -------------------------------------------------- */

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin h-12 w-12 border-b-2 border-[rgb(0_32_96)] rounded-full" />
      </div>
    );
  }

  /* -------------------------------------------------- */
  /* UI                                                */
  /* -------------------------------------------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bookings & Sessions</h1>
          <p className="text-gray-600">Manage your training sessions</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <Button
          onClick={() => setActiveTab('bookings')}
          variant={activeTab === 'bookings' ? 'default' : 'outline'}
        >
          <CalendarIcon className="h-4 w-4 mr-2" />
          Bookings
        </Button>
        <Button
          onClick={() => setActiveTab('sessions')}
          variant={activeTab === 'sessions' ? 'default' : 'outline'}
        >
          <DocumentTextIcon className="h-4 w-4 mr-2" />
          Sessions
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent>
            <div className="text-2xl font-bold">{bookings.length}</div>
            <p className="text-sm text-gray-500">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingCount}</div>
            <p className="text-sm text-gray-500">Upcoming</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-sm text-gray-500">Pending</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search bookings..."
          className="pl-10"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(s => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? 'default' : 'outline'}
            onClick={() => setFilter(s as any)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      {/* List */}
      {filteredBookings.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No {activeTab} found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredBookings.map(b => (
            <Card key={b.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(b.status)}
                      <h3 className="font-semibold capitalize">
                        {b.booking_type.replace('_', ' ')}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-600">
                      {formatDateTime(b.start_time)}
                    </p>
                    <p className="text-sm text-gray-600">
                      Location: {b.location || '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                        b.status
                      )}`}
                    >
                      {b.status}
                    </span>
                    {(user?.role === 'admin' || user?.role === 'trainer') && b.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => handleBookingStatusUpdate(b.id, 'confirmed')}
                          title="Approve booking"
                        >
                          <CheckIcon className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleBookingStatusUpdate(b.id, 'cancelled')}
                          title="Reject booking"
                        >
                          <XMarkIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
