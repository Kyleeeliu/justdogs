'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  PlusIcon, 
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { getCurrentUser } from '@/lib/auth/auth';
import { User, Booking, BookingStatus, BookingType } from '@/types';
import { formatDateTime, formatTime, getStatusColor } from '@/lib/utils';

// Mock data for demonstration
const mockBookings: Booking[] = [
  {
    id: '1',
    dog_id: '1',
    trainer_id: '1',
    parent_id: '1',
    booking_type: 'dog_training',
    status: 'confirmed',
    start_time: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    end_time: new Date(Date.now() + 86400000 + 3600000).toISOString(),
    special_instructions: 'Focus on recall training. Max responds well to chicken treats.',
    location: 'Just Dogs Training Center',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    dog_id: '2',
    trainer_id: '2',
    parent_id: '2',
    booking_type: 'consult',
    status: 'pending',
    start_time: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
    end_time: new Date(Date.now() + 172800000 + 5400000).toISOString(),
    special_instructions: 'Luna has been showing signs of anxiety around other dogs.',
    location: 'Just Dogs Activity Farm',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    dog_id: '3',
    trainer_id: '1',
    parent_id: '3',
    booking_type: 'dog_sitting',
    status: 'completed',
    start_time: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    end_time: new Date(Date.now() - 86400000 + 28800000).toISOString(),
    special_instructions: 'Buddy needs gentle exercise due to hip dysplasia.',
    location: 'Just Dogs Training Center',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const getStatusIcon = (status: BookingStatus) => {
  switch (status) {
    case 'confirmed':
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    case 'pending':
      return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
    case 'cancelled':
      return <XCircleIcon className="h-5 w-5 text-red-500" />;
    case 'completed':
      return <CheckCircleIcon className="h-5 w-5 text-[rgb(0_32_96)]" />;
    default:
      return <ClockIcon className="h-5 w-5 text-gray-500" />;
  }
};

const getBookingTypeColor = (type: BookingType) => {
  switch (type) {
    case 'dog_training':
      return 'bg-[rgb(0_32_96)] text-white';
    case 'private_training':
      return 'bg-purple-100 text-purple-800';
    case 'dog_sitting':
      return 'bg-green-100 text-green-800';
    case 'pet_care':
      return 'bg-orange-100 text-orange-800';
    case 'consult':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function BookingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>(mockBookings);
  const [filter, setFilter] = useState<BookingStatus | 'all'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        
        // Filter bookings based on user role
        if (currentUser?.role === 'parent') {
          // Parents only see their own bookings
          setBookings(mockBookings.filter(booking => booking.parent_id === currentUser.id));
        } else if (currentUser?.role === 'trainer') {
          // Trainers see their assigned bookings
          setBookings(mockBookings.filter(booking => booking.trainer_id === currentUser.id));
        } else {
          // Admins see all bookings
          setBookings(mockBookings);
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  const filteredBookings = bookings.filter(booking => 
    filter === 'all' || booking.status === filter
  );

  const upcomingBookings = bookings.filter(booking => 
    new Date(booking.start_time) > new Date() && booking.status !== 'cancelled'
  );

  const todayBookings = bookings.filter(booking => {
    const bookingDate = new Date(booking.start_time);
    const today = new Date();
    return bookingDate.toDateString() === today.toDateString();
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(0_32_96)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
          <p className="text-gray-600">
            Manage training sessions and appointments
          </p>
        </div>
        {(user?.role === 'admin' || user?.role === 'parent') && (
          <Button className="mt-4 sm:mt-0">
            <PlusIcon className="h-4 w-4 mr-2" />
            New Booking
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookings.length}</div>
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{todayBookings.length}</div>
            <p className="text-xs text-muted-foreground">
              Sessions scheduled
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingBookings.length}</div>
            <p className="text-xs text-muted-foreground">
              Future sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <ExclamationTriangleIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bookings.filter(b => b.status === 'pending').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Awaiting confirmation
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
          className={filter === 'all' ? '' : 'border-[rgb(0_32_96)] text-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)] hover:text-white'}
        >
          All
        </Button>
        <Button
          variant={filter === 'pending' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('pending')}
          className={filter === 'pending' ? '' : 'border-[rgb(0_32_96)] text-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)] hover:text-white'}
        >
          Pending
        </Button>
        <Button
          variant={filter === 'confirmed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('confirmed')}
          className={filter === 'confirmed' ? '' : 'border-[rgb(0_32_96)] text-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)] hover:text-white'}
        >
          Confirmed
        </Button>
        <Button
          variant={filter === 'completed' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('completed')}
          className={filter === 'completed' ? '' : 'border-[rgb(0_32_96)] text-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)] hover:text-white'}
        >
          Completed
        </Button>
        <Button
          variant={filter === 'cancelled' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('cancelled')}
          className={filter === 'cancelled' ? '' : 'border-[rgb(0_32_96)] text-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)] hover:text-white'}
        >
          Cancelled
        </Button>
      </div>

      {/* Bookings List */}
      <div className="space-y-4">
        {filteredBookings.map((booking) => (
          <Card key={booking.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-3">
                    {getStatusIcon(booking.status)}
                    <div>
                      <h3 className="font-semibold text-lg">
                        {booking.booking_type.charAt(0).toUpperCase() + booking.booking_type.slice(1)} Session
                      </h3>
                      <p className="text-sm text-gray-600">
                        {formatDateTime(booking.start_time)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Duration</p>
                      <p className="text-sm text-gray-600">
                        {formatTime(booking.start_time)} - {formatTime(booking.end_time)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">Location</p>
                      <p className="text-sm text-gray-600">{booking.location}</p>
                    </div>
                  </div>

                  {booking.special_instructions && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700">Special Instructions</p>
                      <p className="text-sm text-gray-600">{booking.special_instructions}</p>
                    </div>
                  )}

                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                      {booking.status}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBookingTypeColor(booking.booking_type)}`}>
                      {booking.booking_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col space-y-2 ml-4">
                  <Button size="sm">
                    View Details
                  </Button>
                  {booking.status === 'pending' && (
                    <Button size="sm" variant="outline">
                      Confirm
                    </Button>
                  )}
                  {booking.status === 'confirmed' && (
                    <Button size="sm" variant="outline">
                      Start Session
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredBookings.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings found</h3>
            <p className="text-gray-600">
              {filter === 'all' ? 'Get started by creating your first booking.' : `No ${filter} bookings found.`}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
