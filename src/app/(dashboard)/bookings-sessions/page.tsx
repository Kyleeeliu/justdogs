'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
  PlusIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { Booking, BookingStatus, Dog, User } from '@/types';
import { authenticatedGet, authenticatedFetch } from '@/lib/api/apiClient';
import { formatDateTime, formatTime } from '@/lib/utils';
import { getDogById, getAllDogs, getDogsByOwner } from '@/lib/supabase/dogs';
import { getUserById, getUsersByRole } from '@/lib/supabase/users';
import { CreateBookingModal, BookingFormData } from '@/components/CreateBookingModal';

interface BookingWithDetails extends Booking {
  dog?: Dog;
  trainer?: User;
  parent?: User;
}

export default function BookingsSessionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all');
  const [search, setSearch] = useState('');
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [trainers, setTrainers] = useState<User[]>([]);
  const [showTrainerAssignment, setShowTrainerAssignment] = useState<string | null>(null);

  // Load bookings with related data
  const loadBookings = async () => {
  if (!user || authLoading) return;

  try {
    setLoading(true);
    console.log('🔍 Fetching bookings for user:', user.role, user.email);
    
    const res = await authenticatedGet('/api/bookings');
    console.log('📡 Response status:', res.status);
    
    if (!res.ok) {
      console.error('❌ Failed to fetch bookings:', res.status);
      setBookings([]);
      return;
    }

    const data = await res.json();
    console.log('✅ Bookings data received:', data);
    console.log('📊 Raw bookings count:', data.length);
    const bookingsArray: Booking[] = Array.isArray(data) ? data : [];

    // Server already filtered by role, so use all returned bookings
    const visible = bookingsArray;

    console.log('📋 Visible bookings before fetching details:', visible.length);

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

    console.log('📊 Bookings with details:', bookingsWithDetails.length);
    console.log('First booking with details:', bookingsWithDetails[0]);
    setBookings(bookingsWithDetails);
  } catch (err) {
    console.error('💥 Error loading bookings:', err);
    setBookings([]);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    loadBookings();
  }, [user, authLoading]);

  // Load trainers and bookings on mount
  useEffect(() => {
    const loadInitialData = async () => {
      if (!user || authLoading) return;

      try {
        const trainersData = await getUsersByRole('trainer');
        setTrainers(trainersData);
      } catch (error) {
        console.error('Error loading trainers:', error);
      }

      await loadBookings();
    };

    loadInitialData();
  }, [user, authLoading]);

  // Load dogs (and refresh trainers) when create modal opens so dropdown is populated
  useEffect(() => {
    if (!showCreateModal || !user) return;

    const loadModalData = async () => {
      try {
        const userDogs = user.role === 'parent'
          ? await getDogsByOwner(user.id)
          : await getAllDogs();
        setDogs(userDogs);
        const trainersData = await getUsersByRole('trainer');
        setTrainers(trainersData);
      } catch (error) {
        console.error('Error loading create-modal data:', error);
      }
    };

    loadModalData();
  }, [showCreateModal, user]);

  // Create booking
  const handleCreateBooking = async (formData: BookingFormData) => {
    try {
      const selectedDog = dogs.find(d => d.id === formData.dog_id);
      const payload = {
        ...formData,
        parent_id: selectedDog?.owner_id || user?.id,
      };

      console.log('Creating booking with payload:', payload);

      const res = await authenticatedFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const result = await res.json();
        console.log('Booking created:', result);
        setShowCreateModal(false);
        await loadBookings();
      } else {
        const errorData = await res.json().catch(() => ({ error: 'Server Error' }));
        console.error('Failed to create booking:', errorData);
        throw new Error(errorData.error || 'Failed to create booking');
      }
    } catch (error: any) {
      console.error('Error creating booking:', error);
      throw error;
    }
  };

  // Update booking status
  const handleBookingStatusUpdate = async (bookingId: string, status: 'confirmed' | 'cancelled', trainerId?: string) => {
  try {
    const updateData: any = { id: bookingId, status };
    if (trainerId) {
      updateData.trainer_id = trainerId;
    }

    const res = await authenticatedFetch('/api/bookings', {
      method: 'PUT',
      body: JSON.stringify(updateData),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Update failed');
    }

    const result = await res.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Update failed');
    }

    // Reload bookings to get fresh data
    await loadBookings();
  } catch (error) {
    console.error('Error updating booking status:', error);
    alert('Failed to update booking status: ' + error.message);
  }
};

  // Handle trainer assignment for pending bookings
  const handleTrainerAssignment = async (bookingId: string, trainerId: string) => {
    await handleBookingStatusUpdate(bookingId, 'confirmed', trainerId);
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
          <p className="text-gray-600 mt-1">
            Manage your training sessions and bookings
          </p>
        </div>
        {(user?.role === 'admin' || user?.role === 'parent') && (
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)]"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Booking
          </Button>
        )}
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
              No bookings found
            </h3>
            <p className="text-gray-600 mb-4">
              {search || filter !== 'all'
                ? 'Try adjusting your search or filters'
                : `You don't have any bookings yet`}
            </p>
            {(user?.role === 'admin' || user?.role === 'parent') && !search && filter === 'all' && (
              <Button 
                onClick={() => setShowCreateModal(true)}
                className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)]"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Your First Booking
              </Button>
            )}
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
                                    onClick={() => setShowTrainerAssignment(booking.id)}
                                    title="Assign trainer and approve"
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
                                  {booking.parent && user?.role === 'admin' && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Owner:</span>
                                      <span className="font-medium text-gray-900">{booking.parent.full_name}</span>
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

      {/* Create Booking Modal */}
      {user && (
        <CreateBookingModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateBooking}
          dogs={dogs.map(d => ({ id: d.id, name: d.name }))}
          trainers={trainers.map(t => ({ id: t.id, name: t.full_name, full_name: t.full_name }))}
          userRole={user.role}
        />
      )}

      {/* Trainer Assignment Modal */}
      {showTrainerAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Assign Trainer
            </h3>
            <p className="text-gray-600 mb-4">
              Select a trainer to assign to this booking and approve it.
            </p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Choose Trainer
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)] text-gray-900"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleTrainerAssignment(showTrainerAssignment, e.target.value);
                      setShowTrainerAssignment(null);
                    }
                  }}
                  defaultValue=""
                >
                  <option value="">Select a trainer...</option>
                  {trainers
                    .filter(trainer => trainer.role === 'trainer')
                    .map(trainer => (
                      <option key={trainer.id} value={trainer.id}>
                        {trainer.full_name}
                      </option>
                    ))}
                </select>
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowTrainerAssignment(null)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    // Approve without trainer assignment
                    handleBookingStatusUpdate(showTrainerAssignment, 'confirmed');
                    setShowTrainerAssignment(null);
                  }}
                  className="flex-1 bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)]"
                >
                  Approve Without Trainer
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}