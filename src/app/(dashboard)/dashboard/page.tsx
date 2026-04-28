'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import {
  CalendarIcon,
  UserGroupIcon,
  ClockIcon,
  PlusIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { User, DashboardStats, TrainerStats, ParentStats, Message, Dog } from '@/types';
import { useRouter } from 'next/navigation';
import { getMessagesByUser } from '@/lib/supabase/messages';
import { useAuth } from '@/hooks/useAuth';
import { CreateBookingModal, BookingFormData } from '@/components/CreateBookingModal';
import { getDogsByOwner, getAllDogs } from '@/lib/supabase/dogs';
import { getUsersByRole } from '@/lib/supabase/users';
import { authenticatedGet, authenticatedPost } from '@/lib/api/apiClient';
import { AdminManagementPanel } from '@/components/AdminManagementPanel';
import { VerificationHoldingScreen } from '@/components/VerificationHoldingScreen';

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
        <CardContent>
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[rgb(0_32_96)]" />
          </div>
        </CardContent>
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
            <Button size="sm" onClick={() => router.push('/dogs')} className="bg-[rgb(0_32_96)]">
              Add First Dog
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {userDogs.slice(0, 3).map((dog, index) => (
              <div
                key={dog.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  index % 2 === 0 ? 'bg-[rgb(0_32_96)]/10' : 'bg-green-50'
                }`}
              >
                <div>
                  <p className="font-medium text-gray-900">{dog.name}</p>
                  <p className="text-sm text-gray-600">{dog.breed}</p>
                </div>
                <Button size="sm" onClick={() => router.push('/dogs')}>
                  View Profile
                </Button>
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
            <Button size="sm" onClick={() => router.push('/bookings-sessions')} className="bg-[rgb(0_32_96)]">
              View All Bookings
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {trainerStats.upcoming_sessions.slice(0, 3).map((session, index) => (
              <div
                key={session.id}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  index % 2 === 0 ? 'bg-[rgb(0_32_96)]/10' : 'bg-green-50'
                }`}
              >
                <div>
                  <p className="font-medium">Dog Session - {session.booking_type.replace('_', ' ')}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(session.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <Button size="sm" onClick={() => router.push('/bookings-sessions')}>
                  Details
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Recent farm photos (tagged to dogs)
const FarmPhotosCard = ({ userId, userRole }: { userId: string; userRole: string }) => {
  const [photos, setPhotos] = useState<Array<{
    id: string;
    photo_url: string;
    caption?: string;
    photo_date: string;
    dog_names?: string[];
    uploader_name?: string;
  }>>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const loadPhotos = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await authenticatedGet('/api/farm-photos');
        if (response.ok) {
          const data = await response.json();
          console.log('Loaded farm photos:', data.length);
          setPhotos(data.slice(0, 6)); // Show 6 most recent
        } else {
          const errorText = await response.text();
          console.error('Failed to load farm photos:', response.status, errorText);
          setPhotos([]);
        }
      } catch (error) {
        console.error('Error loading farm photos:', error);
        setPhotos([]);
      } finally {
        setLoading(false);
      }
    };
    loadPhotos();
  }, [userId]);

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle className="flex items-center gap-2">
            <PhotoIcon className="h-5 w-5" />
            {userRole === 'parent' ? 'Recent Farm Photos' : 'Farm Photos'}
          </CardTitle>
          <CardDescription>
            {userRole === 'parent'
              ? 'Photos of your dogs at the farm'
              : 'Photos from farm bookings'}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(0_32_96)]" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => {
                const photo = photos[i];
                if (photo) {
                  return (
                    <button
                      key={`photo-${i}-${photo.id}`}
                      type="button"
                      onClick={() => window.open(photo.photo_url, '_blank')}
                      className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 hover:ring-2 hover:ring-[rgb(0_32_96)] focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)] transition-all"
                    >
                      <Image
                        src={photo.photo_url}
                        alt={photo.caption || 'Farm photo'}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, 33vw"
                        unoptimized
                      />
                      {photo.dog_names && photo.dog_names.length > 0 && (
                        <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 px-2 truncate">
                          {photo.dog_names.join(', ')}
                        </span>
                      )}
                    </button>
                  );
                }
                return (
                  <div
                    key={`placeholder-${i}`}
                    className="aspect-square rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center"
                  >
                    <PhotoIcon className="h-8 w-8 text-gray-300" />
                  </div>
                );
              })}
            </div>
            
            {photos.length === 0 && !loading && (
              <div className="text-center py-6">
                <PhotoIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                <p className="text-gray-500 text-sm">
                  {userRole === 'parent'
                    ? 'No farm photos yet'
                    : 'No photos uploaded yet'}
                </p>
                <p className="text-gray-400 text-xs mt-1">
                  {userRole === 'parent'
                    ? 'Photos from farm bookings will appear here'
                    : 'Upload photos from the bookings page'}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | TrainerStats | ParentStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dogs, setDogs] = useState<Array<{ id: string; name: string }>>([]);
  const [trainers, setTrainers] = useState<Array<{ id: string; name: string; full_name: string }>>([]);
  const router = useRouter();

  const setFallbackStats = (userRole: string) => {
    if (userRole === 'admin') {
      setStats({ 
        total_bookings_today: 0, 
        total_dogs: 0, 
        total_trainers: 0, 
        total_revenue_month: 0, 
        pending_bookings: 0 
      });
    } else if (userRole === 'trainer') {
      setStats({ 
        today_sessions: 0, 
        total_dogs_assigned: 0, 
        unread_messages: 0, 
        upcoming_sessions: [] 
      });
    } else {
      setStats({ 
        total_dogs: 0, 
        upcoming_sessions: 0, 
        unread_messages: 0 
      });
    }
  };

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user) return;
      try {
        setLoading(true);
        
        // Load stats from API
        const response = await authenticatedGet('/api/dashboard-stats');
        if (response.ok) {
          const statsData = await response.json();
          console.log('📊 Dashboard stats loaded:', statsData);
          setStats(statsData);
        } else {
          console.warn('Failed to load stats, using fallback');
          setFallbackStats(user.role);
        }
      } catch (error) {
        console.error('Error loading dashboard:', error);
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
      const startIso = new Date(bookingData.start_time).toISOString();
      const endIso = new Date(
        new Date(bookingData.start_time).getTime() + bookingData.duration_minutes * 60_000
      ).toISOString();

      // Resolve parent_id for each dog (admin may own dogs belonging to parents)
      let allDogsList: Array<{ id: string; owner_id?: string }> = [];
      if (user.role === 'admin') {
        allDogsList = await getAllDogs();
      }

      for (const dogId of bookingData.dog_ids) {
        let parentId = user.id;
        if (user.role === 'admin') {
          const dog = allDogsList.find(d => d.id === dogId);
          parentId = dog?.owner_id ?? user.id;
        }

        const payload = {
          dog_id: dogId,
          booking_type: bookingData.booking_type,
          start_time: startIso,
          end_time: endIso,
          notes: bookingData.notes,
          location: bookingData.location,
          trainer_id: bookingData.trainer_id,
          parent_id: parentId,
          recurring: bookingData.recurring,
          recurring_pattern: bookingData.recurring_pattern,
          recurring_occurrences: bookingData.recurring_occurrences,
        };

        const response = await authenticatedPost('/api/bookings', payload);
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Server Error' }));
          throw new Error(errorData.error || 'Failed to create booking');
        }
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.error || result.message || 'Failed to create booking');
        }
      }

      alert(bookingData.dog_ids.length > 1 ? `${bookingData.dog_ids.length} bookings created successfully!` : 'Booking created successfully!');
      setShowCreateModal(false);
      router.refresh();
      router.push('/bookings-sessions');
    } catch (error) {
      console.error('Error creating booking:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(0_32_96)]" />
      </div>
    );
  }

  if (!user) return <div>User not found</div>;

  const renderAdminDashboard = () => {
    const adminStats = stats as DashboardStats;
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Today&apos;s Bookings</CardTitle>
              <CalendarIcon className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminStats?.total_bookings_today || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Bookings scheduled for today</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Dogs</CardTitle>
              <UserGroupIcon className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminStats?.total_dogs || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Dogs registered in system</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Trainers</CardTitle>
              <UserGroupIcon className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminStats?.total_trainers || 0}</div>
              <p className="text-xs text-gray-500 mt-1">Trainers in system</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pending Bookings</CardTitle>
              <ClockIcon className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {adminStats?.pending_bookings || 0}
              </div>
              <p className="text-xs text-gray-500 mt-1">Awaiting approval</p>
            </CardContent>
          </Card>
        </div>

        {/* Admin Management Panel */}
        <AdminManagementPanel />
      </div>
    );
  };

  const renderTrainerDashboard = () => <TrainerScheduleCard trainerStats={stats as TrainerStats} />;
  const renderParentDashboard = () => <ParentDogsCard userId={user.id} />;

  // Check if parent is unverified
  const isUnverifiedParent = user.role === 'parent' && user.verification_status !== 'verified';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome back, {user.full_name || user.email}!</p>
        </div>
        {(user.role === 'admin' || (user.role === 'parent' && !isUnverifiedParent)) && (
          <Button 
            className="bg-[rgb(0_32_96)] text-white hover:bg-[rgb(0_24_72)]" 
            onClick={() => setShowCreateModal(true)}
          >
            <PlusIcon className="h-4 w-4 mr-2" /> New Booking
          </Button>
        )}
      </div>

      {/* Show verification holding screen for unverified parents */}
      {isUnverifiedParent && (
        <VerificationHoldingScreen />
      )}

      {user.role === 'admin' && renderAdminDashboard()}
      {user.role === 'trainer' && renderTrainerDashboard()}
      {/* Parent dashboard - dogs and messages still visible for unverified */}
      {user.role === 'parent' && renderParentDashboard()}

      {(user.role === 'parent' || user.role === 'trainer' || user.role === 'admin') && (
        <FarmPhotosCard userId={user.id} userRole={user.role} />
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