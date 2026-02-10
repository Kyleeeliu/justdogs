'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import {
  CalendarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SpeakerWaveIcon,
  XMarkIcon,
  PlusIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { User, DashboardStats, TrainerStats, ParentStats, Message, Booking, BookingType, Dog } from '@/types';
import { useRouter } from 'next/navigation';
import { getMessagesByUser, getRecentMessagePhotos } from '@/lib/supabase/messages';
import { useAuth } from '@/hooks/useAuth';
import { CreateBookingModal, BookingFormData } from '@/components/CreateBookingModal';
import { getDogsByOwner, getAllDogs } from '@/lib/supabase/dogs';
import { getUsersByRole } from '@/lib/supabase/users';
import { authenticatedGet, authenticatedPost } from '@/lib/api/apiClient';

// Component to display parent's dogs
const ParentDogsCard = ({ userId }: { userId: string }) => {
  const [userDogs, setUserDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadUserDogs = async () => {
      try {
        const dogs = await getDogsByOwner(userId);
        setUserDogs(dogs);
      } catch (error) {
        console.error('Error loading user dogs:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUserDogs();
  }, [userId]);

  if (loading) {
    return (
      <Card>
        <CardContent><div className="flex justify-center py-4 animate-spin rounded-full h-6 w-6 border-b-2 border-[rgb(0_32_96)]" /></CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Dogs</CardTitle>
        <CardDescription>Your dogs in training</CardDescription>
      </CardHeader>
      <CardContent>
        {userDogs.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-600 mb-4">No dogs registered yet</p>
            <Button size="sm" onClick={() => router.push('/dogs')} className="bg-[rgb(0_32_96)]">Add First Dog</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {userDogs.slice(0, 3).map((dog, index) => (
              <div key={dog.id} className={`flex items-center justify-between p-3 rounded-lg ${index % 2 === 0 ? 'bg-[rgb(0_32_96)] bg-opacity-10' : 'bg-green-50'}`}>
                <div><p className="font-medium">{dog.name}</p><p className="text-sm text-gray-600">{dog.breed}</p></div>
                <Button size="sm" onClick={() => router.push('/dogs')}>View Profile</Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const TrainerScheduleCard = ({ trainerStats }: { trainerStats: TrainerStats }) => {
  const router = useRouter();
  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s Schedule</CardTitle>
        <CardDescription>Your upcoming sessions</CardDescription>
      </CardHeader>
      <CardContent>
        {!trainerStats?.upcoming_sessions?.length ? (
          <div className="text-center py-6">
            <p className="text-gray-600 mb-4">No sessions scheduled for today</p>
            <Button size="sm" onClick={() => router.push('/bookings-sessions')} className="bg-[rgb(0_32_96)]">View All Bookings</Button>
          </div>
        ) : (
          <div className="space-y-3">
            {trainerStats.upcoming_sessions.slice(0, 3).map((session, index) => (
              <div key={session.id} className={`flex items-center justify-between p-3 rounded-lg ${index % 2 === 0 ? 'bg-[rgb(0_32_96)] bg-opacity-10' : 'bg-green-50'}`}>
                <div>
                  <p className="font-medium">Dog Session - {session.booking_type.replace('_', ' ')}</p>
                  <p className="text-sm text-gray-600">{new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <Button size="sm" onClick={() => router.push('/bookings-sessions')}>Details</Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Recent photos from messages (for owners and trainers, togglable)
type PhotoViewAs = 'parent' | 'trainer';
const RecentMessagePhotosCard = ({ userId, userRole }: { userId: string; userRole: string }) => {
  const [photos, setPhotos] = useState<Array<{ file_url: string; file_name: string; created_at: string; sender_name?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [viewAs, setViewAs] = useState<PhotoViewAs>(userRole === 'trainer' ? 'trainer' : 'parent');
  const router = useRouter();

  useEffect(() => {
    if (userId && (userRole === 'parent' || userRole === 'trainer')) {
      setLoading(true);
      getRecentMessagePhotos(userId, viewAs)
        .then(setPhotos)
        .catch(() => setPhotos([]))
        .finally(() => setLoading(false));
    }
  }, [userId, userRole, viewAs]);

  const showToggle = userRole === 'parent' || userRole === 'trainer';

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2">
              <PhotoIcon className="h-5 w-5" />
              Recent photos from messages
            </CardTitle>
            <CardDescription>Last 6 images sent to you in messages</CardDescription>
          </div>
          {showToggle && (
            <div className="flex rounded-lg border border-gray-300 p-0.5 bg-gray-50">
              <button
                type="button"
                onClick={() => setViewAs('parent')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewAs === 'parent' ? 'bg-[rgb(0_32_96)] text-white' : 'text-gray-700 hover:bg-gray-200'}`}
              >
                As owner
              </button>
              <button
                type="button"
                onClick={() => setViewAs('trainer')}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${viewAs === 'trainer' ? 'bg-[rgb(0_32_96)] text-white' : 'text-gray-700 hover:bg-gray-200'}`}
              >
                As trainer
              </button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(0_32_96)]" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => {
              const photo = photos[i];
              if (photo) {
                return (
                  <button
                    key={`${photo.file_url}-${i}`}
                    type="button"
                    onClick={() => window.open(photo.file_url, '_blank')}
                    className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:ring-2 hover:ring-[rgb(0_32_96)] focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)]"
                  >
                    <Image
                      src={photo.file_url}
                      alt={photo.file_name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, 33vw"
                      unoptimized
                    />
                    {photo.sender_name && (
                      <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 px-2 truncate">
                        {photo.sender_name}
                      </span>
                    )}
                  </button>
                );
              }
              return (
                <div
                  key={`placeholder-${i}`}
                  className="aspect-square rounded-lg border-2 border-dashed border-gray-300 bg-gray-50"
                  aria-hidden
                />
              );
            })}
          </div>
        )}
        {(userRole === 'parent' || userRole === 'trainer') && (
          <Button
            variant="outline"
            size="sm"
            className="mt-4 w-full text-gray-900"
            onClick={() => router.push('/messages')}
          >
            Open Messages
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | TrainerStats | ParentStats | null>(null);
  const [announcements, setAnnouncements] = useState<Message[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dogs, setDogs] = useState<Array<{ id: string; name: string }>>([]);
  const [trainers, setTrainers] = useState<Array<{ id: string; name: string; full_name: string }>>([]);
  const router = useRouter();

  const setFallbackStats = (userRole: string) => {
    if (userRole === 'admin') setStats({ total_bookings_today: 0, total_dogs: 0, total_trainers: 0, total_revenue_month: 0, pending_bookings: 0 });
    else if (userRole === 'trainer') setStats({ today_sessions: 0, total_dogs_assigned: 0, unread_messages: 0, upcoming_sessions: [] });
    else setStats({ total_dogs: 0, upcoming_sessions: 0, unread_messages: 0 });
  };

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user) return;
      try {
        setLoading(true);
        getMessagesByUser(user.id).then(messages => {
          setAnnouncements((messages || []).filter((msg: Message) => msg.is_announcement));
        }).catch(() => setAnnouncements([]));

        const dismissed = localStorage.getItem(`dismissed_announcements_${user.id}`);
        if (dismissed) setDismissedAnnouncements(JSON.parse(dismissed));
        
        const response = await authenticatedGet('/api/dashboard-stats');
        if (response.ok) {
          const statsData = await response.json();
          setStats(statsData);
        } else {
          setFallbackStats(user.role);
        }
      } catch (error) {
        setFallbackStats(user.role);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, [user]);

  useEffect(() => {
    const loadBookingData = async () => {
      if (!showCreateModal || !user) return;
      try {
        const userDogs = user.role === 'parent' ? await getDogsByOwner(user.id) : await getAllDogs();
        setDogs(userDogs.map(dog => ({ id: dog.id, name: dog.name })));
        const trainersList = await getUsersByRole('trainer');
        setTrainers(trainersList.map(t => ({ id: t.id, name: t.full_name, full_name: t.full_name })));
      } catch (error) {
        console.error('Error loading booking data:', error);
      }
    };
    loadBookingData();
  }, [showCreateModal, user]);
const handleCreateBooking = async (bookingData: BookingFormData) => {
  if (!user) throw new Error('User not found');

  try {
    // 1. Determine Parent ID
    let parentId = user.id;
    if (user.role === 'admin') {
      const allDogsList = await getAllDogs();
      const dog = allDogsList.find(d => d.id === bookingData.dog_id);
      if (!dog) throw new Error('Dog owner not found');
      parentId = dog.owner_id;
    }

    // 2. Format Payload (Ensuring ISO Dates for DB)
    const payload = {
      ...bookingData,
      parent_id: parentId,
      start_time: new Date(bookingData.start_time).toISOString(),
      end_time: bookingData.end_time ? new Date(bookingData.end_time).toISOString() : null,
    };

    console.log('Sending booking payload:', payload);

    // 3. Send via authenticatedPost - it returns a Response object, not parsed JSON
    const response = await authenticatedPost('/api/bookings', payload);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Server Error' }));
      throw new Error(errorData.error || 'Failed to create booking');
    }

    const result = await response.json();
    
    console.log('Booking API response:', result);
    
    if (result.success) {
      alert('Booking created successfully!');
      setShowCreateModal(false);
      router.refresh();
      router.push('/bookings-sessions');
    } else {
      throw new Error(result.error || result.message || 'Failed to create booking');
    }
  } catch (error) {
    console.error('Error creating booking:', error);
    throw error;
  }
};

if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(0_32_96)]" /></div>;
  if (!user) return <div>User not found</div>;

  const renderAdminDashboard = () => {
    const adminStats = stats as DashboardStats;
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Today&apos;s Bookings</CardTitle><CalendarIcon className="h-4 w-4" /></CardHeader>
            <CardContent><div className="text-2xl font-bold">{adminStats?.total_bookings_today || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Total Dogs</CardTitle><UserGroupIcon className="h-4 w-4" /></CardHeader>
            <CardContent><div className="text-2xl font-bold">{adminStats?.total_dogs || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Active Trainers</CardTitle><UserGroupIcon className="h-4 w-4" /></CardHeader>
            <CardContent><div className="text-2xl font-bold">{adminStats?.total_trainers || 0}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">Pending Bookings</CardTitle><ClockIcon className="h-4 w-4" /></CardHeader>
            <CardContent><div className="text-2xl font-bold">{adminStats?.pending_bookings || 0}</div></CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderTrainerDashboard = () => <TrainerScheduleCard trainerStats={stats as TrainerStats} />;
  const renderParentDashboard = () => <ParentDogsCard userId={user.id} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Account: {user.role}</p>
        </div>
        {(user.role === 'admin' || user.role === 'parent') && (
          <Button className="bg-[rgb(0_32_96)] text-white" onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4 mr-2" /> New Booking
          </Button>
        )}
      </div>

      {user.role === 'admin' && renderAdminDashboard()}
      {user.role === 'trainer' && renderTrainerDashboard()}
      {user.role === 'parent' && renderParentDashboard()}

      {(user.role === 'parent' || user.role === 'trainer') && (
        <RecentMessagePhotosCard userId={user.id} userRole={user.role} />
      )}

      <CreateBookingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateBooking}
        dogs={dogs}
        trainers={trainers}
        userRole={user.role}
      />
    </div>
  );
}