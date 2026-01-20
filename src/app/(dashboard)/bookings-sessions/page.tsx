'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MapPinIcon,
  UserIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { Booking, BookingStatus, Dog, User } from '@/types';
import { authenticatedGet, authenticatedFetch } from '@/lib/api/apiClient';
import { formatDateTime, formatTime, getInitials } from '@/lib/utils';
import { getDogById } from '@/lib/supabase/dogs';
import { getUserById } from '@/lib/supabase/users';

interface BookingWithDetails extends Booking {
  dog?: Dog;
  trainer?: User;
  parent?: User;
}

export default function BookingsSessionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'bookings' | 'sessions'>('bookings');
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set());

  // Load bookings with related data
  useEffect(() => {
    if (!user) return;

    const loadBookings = async () => {
      try {
        setLoading(true);
        
        const res = await authenticatedGet('/api/bookings');
        const data = await res.json();
        const bookingsArray: Booking[] = Array.isArray(data) ? data : [];

        // Filter based on user role
        let visible = bookingsArray;
        if (user.role === 'parent') {
          visible = bookingsArray.filter(b => b.parent_id === user.id);
        } else if (user.role === 'trainer') {
          visible = bookingsArray.filter(b => b.trainer_id === user.id);
        }

        // Fetch related data (dogs, trainers, parents)
        const bookingsWithDetails = await Promise.all(
          visible.map(async (booking) => {
            const [dog, trainer, parent] = await Promise.all([
              getDogById(booking.dog_id).catch(() => null),
              booking.trainer_id ? getUserById(booking.trainer_id).catch(() => null) : null,
              booking.parent_id ? getUserById(booking.parent_id).catch(() => null) : null,
            ]);

            return {
              ...booking,
              dog: dog || undefined,
              trainer: trainer || undefined,
              parent: parent || undefined,
            };
          })
        );

        setBookings(bookingsWithDetails);
      } catch (err) {
        console.error('Error loading bookings:', err);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    loadBookings();
  }, [user]);

  // Update booking status
  const handleBookingStatusUpdate = async (bookingId: string, status: 'confirmed' | 'cancelled') => {
    try {
      const res = await authenticatedFetch('/api/bookings', {
        method: 'PUT',
        body: JSON.stringify({ id: bookingId, status }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Update failed');
      }

      // Update local state
      setBookings(prev => prev.map(b => 
        b.id === bookingId ? { ...b, status } : b
      ));
    } catch (error) {
      console.error('Error updating booking status:', error);
      alert('Failed to update booking status');
    }
  };

  // Toggle booking expansion
  const toggleExpand = (bookingId: string) => {
    setExpandedBookings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(bookingId)) {
        newSet.delete(bookingId);
      } else {
        newSet.add(bookingId);
      }
      return newSet;
    });
  };

  // Filter bookings
  const filteredBookings = bookings.filter(b => {
    // Tab filtering
    if (activeTab === 'sessions' && b.status !== 'confirmed' && b.status !== 'completed') {
      return false;
    }
    if (activeTab === 'bookings' && (b.status === 'confirmed' || b.status === 'completed')) {
      return false;
    }

    // Status filter
    if (filter !== 'all' && b.status !== filter) return false;

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      return (
        b.booking_type.toLowerCase().includes(q) ||
        b.location?.toLowerCase().includes(q) ||
        b.special_instructions?.toLowerCase().includes(q) ||
        b.dog?.name.toLowerCase().includes(q) ||
        b.trainer?.full_name.toLowerCase().includes(q) ||
        b.parent?.full_name.toLowerCase().includes(q)
      );
    }

    return true;
  });

  // Group bookings by date
  const groupedBookings = filteredBookings.reduce((acc, booking) => {
    const date = new Date(booking.start_time).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    if (!acc[date]) acc[date] = [];
    acc[date].push(booking);
    return acc;
  }, {} as Record<string, BookingWithDetails[]>);

  // Sort dates
  const sortedDates = Object.keys(groupedBookings).sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });

  // Statistics
  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    upcoming: bookings.filter(b => new Date(b.start_time) > new Date() && b.status !== 'cancelled').length,
    completed: bookings.filter(b => b.status === 'completed').length,
  };

  // Status helpers
  const getStatusConfig = (status: BookingStatus) => {
    switch (status) {
      case 'pending':
        return {
          icon: ClockIcon,
          color: 'text-yellow-600',
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          badge: 'bg-yellow-100 text-yellow-800',
        };
      case 'confirmed':
        return {
          icon: CheckCircleIcon,
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          badge: 'bg-blue-100 text-blue-800',
        };
      case 'completed':
        return {
          icon: CheckCircleIcon,
          color: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-green-200',
          badge: 'bg-green-100 text-green-800',
        };
      case 'cancelled':
        return {
          icon: XCircleIcon,
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200',
          badge: 'bg-red-100 text-red-800',
        };
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin h-12 w-12 border-b-2 border-[rgb(0_32_96)] rounded-full mx-auto mb-4" />
          <p className="text-gray-600">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bookings & Sessions</h1>
          <p className="text-gray-600 mt-1">Manage your training sessions and bookings</p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <p className="text-sm text-gray-600 mt-1">Total</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-sm text-gray-600 mt-1">Pending</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.confirmed}</div>
            <p className="text-sm text-gray-600 mt-1">Confirmed</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.upcoming}</div>
            <p className="text-sm text-gray-600 mt-1">Upcoming</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-600">{stats.completed}</div>
            <p className="text-sm text-gray-600 mt-1">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'bookings'
              ? 'border-[rgb(0_32_96)] text-[rgb(0_32_96)]'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <CalendarIcon className="h-4 w-4 inline mr-2" />
          Bookings
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'sessions'
              ? 'border-[rgb(0_32_96)] text-[rgb(0_32_96)]'
              : 'border-transparent text-gray-600 hover:text-gray-900'
          }`}
        >
          <DocumentTextIcon className="h-4 w-4 inline mr-2" />
          Sessions
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search by dog, trainer, location, or type..."
            className="pl-10"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const).map(status => (
            <Button
              key={status}
              size="sm"
              variant={filter === status ? 'default' : 'outline'}
              onClick={() => setFilter(status)}
              className={filter === status ? 'bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)]' : ''}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Bookings List */}
      {filteredBookings.length === 0 ? (
        <Card>
          <CardContent className="text-center py-16">
            <CalendarIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No {activeTab} found
            </h3>
            <p className="text-gray-600">
              {search || filter !== 'all'
                ? 'Try adjusting your search or filters'
                : `You don't have any ${activeTab} yet`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map(date => (
            <div key={date}>
              <h2 className="text-lg font-semibold text-gray-900 mb-3 sticky top-0 bg-white py-2 z-10">
                {date}
              </h2>
              <div className="space-y-3">
                {groupedBookings[date].map(booking => {
                  const statusConfig = getStatusConfig(booking.status);
                  const StatusIcon = statusConfig.icon;
                  const isExpanded = expandedBookings.has(booking.id);
                  const isUpcoming = new Date(booking.start_time) > new Date();
                  const canApprove = (user?.role === 'admin' || user?.role === 'trainer') && booking.status === 'pending';

                  return (
                    <Card
                      key={booking.id}
                      className={`hover:shadow-lg transition-all duration-200 overflow-hidden ${
                        isUpcoming && booking.status !== 'cancelled' ? statusConfig.border : 'border-gray-200'
                      }`}
                    >
                      <CardContent className="p-0">
                        {/* Main Booking Card */}
                        <div
                          className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => toggleExpand(booking.id)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-3">
                                <div className={`p-2 rounded-lg ${statusConfig.bg}`}>
                                  <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-gray-900 capitalize">
                                      {booking.booking_type.replace(/_/g, ' ')}
                                    </h3>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.badge}`}>
                                      {booking.status}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                                    <div className="flex items-center gap-1">
                                      <ClockIcon className="h-4 w-4" />
                                      <span>{formatTime(booking.start_time)} - {formatTime(booking.end_time)}</span>
                                    </div>
                                    {booking.dog && (
                                      <div className="flex items-center gap-1">
                                        <UserIcon className="h-4 w-4" />
                                        <span>{booking.dog.name}</span>
                                      </div>
                                    )}
                                    {booking.trainer && (
                                      <div className="flex items-center gap-1">
                                        <UserGroupIcon className="h-4 w-4" />
                                        <span>{booking.trainer.full_name}</span>
                                      </div>
                                    )}
                                    {booking.location && (
                                      <div className="flex items-center gap-1">
                                        <MapPinIcon className="h-4 w-4" />
                                        <span className="truncate">{booking.location}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {canApprove && (
                                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                                    onClick={() => handleBookingStatusUpdate(booking.id, 'confirmed')}
                                    title="Approve booking"
                                  >
                                    <CheckIcon className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                    onClick={() => handleBookingStatusUpdate(booking.id, 'cancelled')}
                                    title="Reject booking"
                                  >
                                    <XMarkIcon className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                              <button className="p-1 hover:bg-gray-200 rounded transition-colors">
                                {isExpanded ? (
                                  <ChevronUpIcon className="h-5 w-5 text-gray-600" />
                                ) : (
                                  <ChevronDownIcon className="h-5 w-5 text-gray-600" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Expanded Details */}
                        {isExpanded && (
                          <div className="border-t border-gray-200 bg-gray-50 p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Booking Details</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Date & Time:</span>
                                    <span className="font-medium text-gray-900">{formatDateTime(booking.start_time)}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Duration:</span>
                                    <span className="font-medium text-gray-900">
                                      {Math.round((new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / 60000)} minutes
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-600">Type:</span>
                                    <span className="font-medium text-gray-900 capitalize">
                                      {booking.booking_type.replace(/_/g, ' ')}
                                    </span>
                                  </div>
                                  {booking.training_level && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Training Level:</span>
                                      <span className="font-medium text-gray-900 capitalize">{booking.training_level}</span>
                                    </div>
                                  )}
                                  {booking.consult_type && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Consult Type:</span>
                                      <span className="font-medium text-gray-900 capitalize">{booking.consult_type}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Participants</h4>
                                <div className="space-y-2 text-sm">
                                  {booking.dog && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Dog:</span>
                                      <span className="font-medium text-gray-900">
                                        {booking.dog.name} ({booking.dog.breed})
                                      </span>
                                    </div>
                                  )}
                                  {booking.trainer && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Trainer:</span>
                                      <span className="font-medium text-gray-900">{booking.trainer.full_name}</span>
                                    </div>
                                  )}
                                  {booking.parent && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Owner:</span>
                                      <span className="font-medium text-gray-900">{booking.parent.full_name}</span>
                                    </div>
                                  )}
                                  {booking.location && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Location:</span>
                                      <span className="font-medium text-gray-900">{booking.location}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            {booking.special_instructions && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Special Instructions</h4>
                                <p className="text-sm text-gray-600 bg-white p-3 rounded border border-gray-200">
                                  {booking.special_instructions}
                                </p>
                              </div>
                            )}
                            <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-200">
                              <span>Created: {new Date(booking.created_at).toLocaleDateString()}</span>
                              <span>Last updated: {new Date(booking.updated_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
