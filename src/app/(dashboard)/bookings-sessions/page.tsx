'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { 
  CalendarIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  XCircleIcon,
  PlayIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ViewColumnsIcon
} from '@heroicons/react/24/outline';
import { getCurrentUser } from '@/lib/auth/auth';
import { User, Booking, Session, BookingStatus, SessionStatus, BookingType } from '@/types';

// Mock data for bookings
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
    booking_type: 'private_training',
    status: 'pending',
    start_time: new Date(Date.now() + 172800000).toISOString(), // Day after tomorrow
    end_time: new Date(Date.now() + 172800000 + 3600000).toISOString(),
    special_instructions: 'Behavioral consultation for separation anxiety.',
    location: 'Client Home',
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
    special_instructions: 'Full day care with exercise and socialization.',
    location: 'Just Dogs Training Center',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

// Mock data for sessions
const mockSessions: Session[] = [
  {
    id: '1',
    booking_id: '1',
    trainer_id: '1',
    parent_id: '1',
    dog_id: '1',
    status: 'scheduled',
    start_time: new Date(Date.now() + 86400000).toISOString(),
    end_time: new Date(Date.now() + 86400000 + 3600000).toISOString(),
    notes: 'Initial assessment and basic training plan.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '2',
    booking_id: '2',
    trainer_id: '2',
    parent_id: '2',
    dog_id: '2',
    status: 'in_progress',
    start_time: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
    end_time: new Date(Date.now() + 1800000).toISOString(), // 30 minutes from now
    notes: 'Working on separation anxiety techniques.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: '3',
    booking_id: '3',
    trainer_id: '1',
    parent_id: '3',
    dog_id: '3',
    status: 'completed',
    start_time: new Date(Date.now() - 86400000).toISOString(),
    end_time: new Date(Date.now() - 86400000 + 28800000).toISOString(),
    notes: 'Successful day care session. Dog was well-behaved and socialized well with other dogs.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

const mockUsers: User[] = [
  { id: '1', full_name: 'Sarah Johnson', email: 'sarah@example.com', role: 'trainer', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '2', full_name: 'Mike Chen', email: 'mike@example.com', role: 'trainer', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '3', full_name: 'Emma Davis', email: 'emma@example.com', role: 'parent', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: '4', full_name: 'John Smith', email: 'john@example.com', role: 'parent', created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

const getStatusIcon = (status: BookingStatus | SessionStatus) => {
  switch (status) {
    case 'pending':
      return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    case 'confirmed':
    case 'scheduled':
      return <CalendarIcon className="h-5 w-5 text-blue-500" />;
    case 'in_progress':
      return <PlayIcon className="h-5 w-5 text-[rgb(0_32_96)]" />;
    case 'completed':
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    case 'cancelled':
      return <XCircleIcon className="h-5 w-5 text-red-500" />;
    default:
      return <ClockIcon className="h-5 w-5 text-gray-500" />;
  }
};

const getStatusColor = (status: BookingStatus | SessionStatus) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'confirmed':
    case 'scheduled':
      return 'bg-[rgb(0_32_96)] text-white';
    case 'in_progress':
      return 'bg-[rgb(0_32_96)] text-white';
    case 'completed':
      return 'bg-[rgb(0_32_96)] text-white';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
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

const formatDateTime = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function BookingsSessionsPage() {
  const [bookings, setBookings] = useState<Booking[]>(mockBookings);
  const [sessions, setSessions] = useState<Session[]>(mockSessions);
  const [activeTab, setActiveTab] = useState<'bookings' | 'sessions'>('bookings');
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [filter, setFilter] = useState<BookingStatus | SessionStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        
        // Filter bookings and sessions based on user role
        if (currentUser?.role === 'parent') {
          // Parents only see their own bookings and sessions
          setBookings(mockBookings.filter(booking => booking.parent_id === currentUser.id));
          setSessions(mockSessions.filter(session => session.parent_id === currentUser.id));
        } else if (currentUser?.role === 'trainer') {
          // Trainers see their assigned bookings and sessions
          setBookings(mockBookings.filter(booking => booking.trainer_id === currentUser.id));
          setSessions(mockSessions.filter(session => session.trainer_id === currentUser.id));
        } else {
          // Admins see all bookings and sessions
          setBookings(mockBookings);
          setSessions(mockSessions);
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
    (filter === 'all' || booking.status === filter) &&
    (booking.booking_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (booking.location && booking.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
     (booking.special_instructions && booking.special_instructions.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  const filteredSessions = sessions.filter(session => 
    (filter === 'all' || session.status === filter) &&
    (session.notes && session.notes.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getAvailableFilters = () => {
    if (activeTab === 'bookings') {
      return ['all', 'pending', 'confirmed', 'completed', 'cancelled'] as const;
    } else {
      return ['all', 'scheduled', 'in_progress', 'completed'] as const;
    }
  };

  const getDogName = (dogId: string) => {
    // In a real app, you'd fetch this from your database
    const dogNames: { [key: string]: string } = {
      '1': 'Max',
      '2': 'Bella',
      '3': 'Charlie',
      '4': 'Luna'
    };
    return dogNames[dogId] || 'Unknown Dog';
  };

  const getTrainerName = (trainerId: string) => {
    const trainer = mockUsers.find(u => u.id === trainerId);
    return trainer?.full_name || 'Unknown Trainer';
  };

  const getParentName = (parentId: string) => {
    const parent = mockUsers.find(u => u.id === parentId);
    return parent?.full_name || 'Unknown Parent';
  };

  // Convert bookings and sessions to calendar events
  const getCalendarEvents = () => {
    const events: { id: string; title: string; date: Date; type: 'booking' | 'session'; status: string; time: string; color: string }[] = [];
    
    // Add booking events
    bookings.forEach(booking => {
      if (filter === 'all' || booking.status === filter) {
        events.push({
          id: `booking-${booking.id}`,
          title: `${getDogName(booking.dog_id)} - ${booking.booking_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}`,
          date: new Date(booking.start_time),
          type: 'booking' as const,
          status: booking.status,
          time: new Date(booking.start_time).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          color: getBookingEventColor(booking.status)
        });
      }
    });
    
    // Add session events
    sessions.forEach(session => {
      if (filter === 'all' || session.status === filter) {
        events.push({
          id: `session-${session.id}`,
          title: `${getDogName(session.dog_id)} - Session`,
          date: new Date(session.start_time),
          type: 'session' as const,
          status: session.status,
          time: new Date(session.start_time).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
          }),
          color: getSessionEventColor(session.status)
        });
      }
    });
    
    return events;
  };

  const getBookingEventColor = (status: BookingStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-l-2 border-yellow-500';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800 border-l-2 border-blue-500';
      case 'completed':
        return 'bg-green-100 text-green-800 border-l-2 border-green-500';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-l-2 border-red-500';
      default:
        return 'bg-gray-100 text-gray-800 border-l-2 border-gray-500';
    }
  };

  const getSessionEventColor = (status: SessionStatus) => {
    switch (status) {
      case 'scheduled':
        return 'bg-[rgb(0_32_96)] bg-opacity-10 text-[rgb(0_32_96)] border-l-2 border-[rgb(0_32_96)]';
      case 'in_progress':
        return 'bg-[rgb(0_32_96)] text-white border-l-2 border-[rgb(0_24_72)]';
      case 'completed':
        return 'bg-green-100 text-green-800 border-l-2 border-green-500';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-l-2 border-red-500';
      default:
        return 'bg-gray-100 text-gray-800 border-l-2 border-gray-500';
    }
  };

  const handleDateClick = (date: Date) => {
    // Filter to show only events for the selected date
    const dateString = date.toDateString();
    // You could implement date-specific filtering here
    console.log('Date clicked:', dateString);
  };

  const handleEventClick = (clickedEvent: { id: string; title: string; date: Date; type: 'booking' | 'session'; status: string; time: string; color: string }) => {
    // Handle event click - could open a modal or navigate to details
    console.log('Event clicked:', clickedEvent);
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Bookings & Sessions</h1>
          <p className="text-gray-600">Manage your bookings and training sessions</p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-4 sm:mt-0">
          <div className="flex space-x-2">
            <Button 
              onClick={() => setActiveTab('bookings')}
              variant={activeTab === 'bookings' ? 'default' : 'outline'}
              className={activeTab === 'bookings' ? '' : 'border-[rgb(0_32_96)] text-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)] hover:text-white'}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Bookings
            </Button>
            <Button 
              onClick={() => setActiveTab('sessions')}
              variant={activeTab === 'sessions' ? 'default' : 'outline'}
              className={activeTab === 'sessions' ? '' : 'border-[rgb(0_32_96)] text-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)] hover:text-white'}
            >
              <DocumentTextIcon className="h-4 w-4 mr-2" />
              Sessions
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button 
              onClick={() => setViewMode('list')}
              variant={viewMode === 'list' ? 'default' : 'outline'}
              className={viewMode === 'list' ? '' : 'border-[rgb(0_32_96)] text-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)] hover:text-white'}
            >
              <ViewColumnsIcon className="h-4 w-4 mr-2" />
              List
            </Button>
            <Button 
              onClick={() => setViewMode('calendar')}
              variant={viewMode === 'calendar' ? 'default' : 'outline'}
              className={viewMode === 'calendar' ? '' : 'border-[rgb(0_32_96)] text-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)] hover:text-white'}
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Calendar
            </Button>
          </div>
        </div>
      </div>

      {/* Search - Only show in list view */}
      {viewMode === 'list' && (
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder={`Search ${activeTab}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total {activeTab === 'bookings' ? 'Bookings' : 'Sessions'}</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeTab === 'bookings' ? bookings.length : sessions.length}
            </div>
            <p className="text-xs text-muted-foreground">
              All {activeTab}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
            <ClockIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeTab === 'bookings' 
                ? bookings.filter(b => new Date(b.start_time) > new Date() && b.status !== 'cancelled').length
                : sessions.filter(s => new Date(s.start_time) > new Date() && s.status !== 'completed').length
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {activeTab === 'bookings' ? 'Future bookings' : 'Scheduled sessions'}
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
              {activeTab === 'bookings' 
                ? bookings.filter(b => b.status === 'pending').length
                : sessions.filter(s => s.status === 'scheduled').length
              }
            </div>
            <p className="text-xs text-muted-foreground">
              {activeTab === 'bookings' ? 'Awaiting confirmation' : 'Scheduled sessions'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters - Only show in list view */}
      {viewMode === 'list' && (
        <div className="flex flex-wrap gap-2">
          {getAvailableFilters().map((filterOption) => (
            <Button
              key={filterOption}
              variant={filter === filterOption ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(filterOption)}
              className={filter === filterOption ? '' : 'border-[rgb(0_32_96)] text-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)] hover:text-white'}
            >
              {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
            </Button>
          ))}
        </div>
      )}

      {/* Content */}
      {viewMode === 'calendar' ? (
        <div className="space-y-6">
          <Calendar 
            events={getCalendarEvents()}
            onDateClick={handleDateClick}
            onEventClick={handleEventClick}
          />
          
          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Booking Status</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-yellow-100 border-l-2 border-yellow-500 rounded"></div>
                      <span>Pending</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-blue-100 border-l-2 border-blue-500 rounded"></div>
                      <span>Confirmed</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-100 border-l-2 border-green-500 rounded"></div>
                      <span>Completed</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-100 border-l-2 border-red-500 rounded"></div>
                      <span>Cancelled</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Session Status</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-[rgb(0_32_96)] bg-opacity-10 border-l-2 border-[rgb(0_32_96)] rounded"></div>
                      <span>Scheduled</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-[rgb(0_32_96)] border-l-2 border-[rgb(0_24_72)] rounded"></div>
                      <span>In Progress</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-green-100 border-l-2 border-green-500 rounded"></div>
                      <span>Completed</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 bg-red-100 border-l-2 border-red-500 rounded"></div>
                      <span>Cancelled</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : activeTab === 'bookings' ? (
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
                          {booking.booking_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} Session
                        </h3>
                        <p className="text-sm text-gray-600">
                          {getDogName(booking.dog_id)} • {getTrainerName(booking.trainer_id)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Date & Time:</span> {formatDateTime(booking.start_time)}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Location:</span> {booking.location}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Duration:</span> 1 hour
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Client:</span> {getParentName(booking.parent_id)}
                        </p>
                      </div>
                    </div>

                    {booking.special_instructions && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Special Instructions:</span> {booking.special_instructions}
                        </p>
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
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredSessions.map((session) => (
            <Card key={session.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      {getStatusIcon(session.status)}
                      <div>
                        <h3 className="font-semibold text-lg">
                          Training Session
                        </h3>
                        <p className="text-sm text-gray-600">
                          {getDogName(session.dog_id)} • {getTrainerName(session.trainer_id)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Date & Time:</span> {formatDateTime(session.start_time)}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Duration:</span> 1 hour
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Client:</span> {getParentName(session.parent_id)}
                        </p>
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Status:</span> {session.status}
                        </p>
                      </div>
                    </div>

                    {session.notes && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Session Notes:</span> {session.notes}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                        {session.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col space-y-2 ml-4">
                    <Button size="sm">
                      View Details
                    </Button>
                    {session.status === 'scheduled' && (
                      <Button size="sm" variant="outline">
                        Start Session
                      </Button>
                    )}
                    {session.status === 'in_progress' && (
                      <Button size="sm" variant="outline">
                        End Session
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {(activeTab === 'bookings' ? filteredBookings.length === 0 : filteredSessions.length === 0) && (
        <Card>
          <CardContent className="text-center py-12">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No {activeTab} found</h3>
            <p className="text-gray-600">
              {filter === 'all' ? `Get started by creating your first ${activeTab.slice(0, -1)}.` : `No ${filter} ${activeTab} found.`}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
