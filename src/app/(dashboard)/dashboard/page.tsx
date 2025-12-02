'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CalendarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  SpeakerWaveIcon,
  XMarkIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { User, DashboardStats, TrainerStats, ParentStats, Message, Booking, BookingType, Dog } from '@/types';
import { useRouter } from 'next/navigation';
import { getMessagesByUser } from '@/lib/supabase/messages';
import { useAuth } from '@/hooks/useAuth';
import { CreateBookingModal, BookingFormData } from '@/components/CreateBookingModal';
import { getDogsByOwner, getAllDogs } from '@/lib/database/dogs';
import { getUsersByRole } from '@/lib/supabase/users';

export default function DashboardPage() {
  const { user } = useAuth(); // Use user from useAuth hook instead of fetching again
  const [stats, setStats] = useState<DashboardStats | TrainerStats | ParentStats | null>(null);
  const [announcements, setAnnouncements] = useState<Message[]>([]);
  const [dismissedAnnouncements, setDismissedAnnouncements] = useState<string[]>([]);
  const [loading, setLoading] = useState(false); // Start as false since user comes from useAuth
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dogs, setDogs] = useState<Array<{ id: string; name: string }>>([]);
  const [trainers, setTrainers] = useState<Array<{ id: string; name: string; full_name: string }>>([]);
  const [loadingDogs, setLoadingDogs] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user) return; // Wait for user from useAuth
      
      try {
        
        // Load announcements in background (non-blocking)
        getMessagesByUser(user.id)
          .then(messages => {
            const activeAnnouncements = (messages || []).filter((msg: Message) => msg.is_announcement);
            setAnnouncements(activeAnnouncements);
          })
          .catch(error => {
            console.error('Error loading announcements:', error);
            setAnnouncements([]);
          });

          // Load dismissed announcements from localStorage
        try {
          const dismissed = localStorage.getItem(`dismissed_announcements_${user.id}`);
          if (dismissed) {
            setDismissedAnnouncements(JSON.parse(dismissed));
          }
        } catch (error) {
          console.error('Error loading dismissed announcements:', error);
        }
        
        // Set stats immediately (non-blocking)
        if (user.role === 'admin') {
          setStats({
            total_bookings_today: 12,
            total_dogs: 45,
            total_trainers: 8,
            total_revenue_month: 1250000, // in cents
            pending_bookings: 5,
          });
        } else if (user.role === 'trainer') {
          setStats({
            today_sessions: 4,
            total_dogs_assigned: 12,
            unread_messages: 2,
            upcoming_sessions: [
              {
                id: '1',
                dog_id: '1',
                trainer_id: user.id,
                parent_id: '1',
                booking_type: 'dog_training',
                status: 'confirmed',
                start_time: new Date().toISOString(),
                end_time: new Date(Date.now() + 3600000).toISOString(),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }
            ],
          });
        } else if (user.role === 'parent') {
          // For new dog parents, show 0 stats
          setStats({
            total_dogs: 0,
            upcoming_sessions: 0,
            unread_messages: 0,
          });
        }
      } catch (error) {
        console.error('Error loading dashboard:', error);
      }
    };

    loadDashboard();
  }, [user]);

  const dismissAnnouncement = (announcementId: string) => {
    const newDismissed = [...dismissedAnnouncements, announcementId];
    setDismissedAnnouncements(newDismissed);
    if (user) {
      localStorage.setItem(`dismissed_announcements_${user.id}`, JSON.stringify(newDismissed));
    }
  };

  const visibleAnnouncements = announcements.filter(
    announcement => !dismissedAnnouncements.includes(announcement.id)
  );

  // Load dogs and trainers when modal opens
  useEffect(() => {
    const loadBookingData = async () => {
      if (!showCreateModal || !user) return;

      setLoadingDogs(true);
      try {
        // Load dogs
        let userDogs: Dog[] = [];
        if (user.role === 'parent') {
          userDogs = getDogsByOwner(user.id);
        } else {
          userDogs = getAllDogs();
        }
        setDogs(userDogs.map(dog => ({ id: dog.id, name: dog.name })));

        // Load trainers
        const trainersList = await getUsersByRole('trainer');
        setTrainers(trainersList.map(trainer => ({ 
          id: trainer.id, 
          name: trainer.full_name,
          full_name: trainer.full_name 
        })));
      } catch (error) {
        console.error('Error loading booking data:', error);
      } finally {
        setLoadingDogs(false);
      }
    };

    loadBookingData();
  }, [showCreateModal, user]);

  const handleCreateBooking = async (bookingData: BookingFormData) => {
    if (!user) {
      throw new Error('User not found');
    }

    // Get the dog's owner ID
    let parentId: string;
    if (user.role === 'parent') {
      parentId = user.id;
    } else {
      // For admins, get the dog's owner
      const dogDetails = getAllDogs().find(d => d.id === bookingData.dog_id);
      if (!dogDetails) {
        throw new Error('Dog details not found');
      }
      parentId = dogDetails.owner_id;
    }

    // Create booking via API
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...bookingData,
        parent_id: parentId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || 'Failed to create booking');
    }

    const result = await response.json();
    
    // Handle recurring bookings (returns array) or single booking
    if (result.bookings && Array.isArray(result.bookings)) {
      alert(`Successfully created ${result.bookings.length} recurring booking(s)!`);
      router.push('/bookings'); // Redirect to bookings page to see the new bookings
    } else if (result.booking) {
      alert('Booking created successfully!');
      router.push('/bookings'); // Redirect to bookings page to see the new booking
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(0_32_96)]"></div>
      </div>
    );
  }

  if (!user) {
    return <div>User not found</div>;
  }

  const renderAdminDashboard = () => {
    const adminStats = stats as DashboardStats;
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today&apos;s Bookings</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminStats?.total_bookings_today || 0}</div>
              <p className="text-xs text-muted-foreground">
                +2 from yesterday
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Dogs</CardTitle>
              <UserGroupIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminStats?.total_dogs || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active dogs in training
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Trainers</CardTitle>
              <UserGroupIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminStats?.total_trainers || 0}</div>
              <p className="text-xs text-muted-foreground">
                Available for bookings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Bookings</CardTitle>
              <ClockIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{adminStats?.pending_bookings || 0}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting confirmation
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates and notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-3">
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">New booking confirmed</p>
                  <p className="text-xs text-muted-foreground">Max (Golden Retriever) - Training session</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium">Session feedback pending</p>
                  <p className="text-xs text-muted-foreground">2 sessions need trainer notes</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <ClockIcon className="h-5 w-5 text-[rgb(0_32_96)]" />
                <div>
                  <p className="text-sm font-medium">New trainer registered</p>
                  <p className="text-xs text-muted-foreground">Sarah Johnson joined the team</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {user?.role === 'admin' && (
            <Card>
              <CardHeader>
                <CardTitle>Content Management</CardTitle>
                <CardDescription>Manage website content and information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Button 
                    onClick={() => router.push('/admin/content-management')}
                    className="w-full justify-start bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
                  >
                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                    Manage News & Events
                  </Button>
                  <Button 
                    onClick={() => router.push('/admin/content-management')}
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    <UserGroupIcon className="h-4 w-4 mr-2" />
                    Manage Services
                  </Button>
                  <Button 
                    onClick={() => router.push('/admin/content-management')}
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    <SpeakerWaveIcon className="h-4 w-4 mr-2" />
                    Manage Team
                  </Button>
                  <Button 
                    onClick={() => router.push('/admin/content-management')}
                    variant="outline" 
                    className="w-full justify-start"
                  >
                    <DocumentTextIcon className="h-4 w-4 mr-2" />
                    Manage Gallery
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  };

  const renderTrainerDashboard = () => {
    const trainerStats = stats as TrainerStats;
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today&apos;s Sessions</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trainerStats?.today_sessions || 0}</div>
              <p className="text-xs text-muted-foreground">
                Sessions scheduled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Dogs Assigned</CardTitle>
              <UserGroupIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trainerStats?.total_dogs_assigned || 0}</div>
              <p className="text-xs text-muted-foreground">
                Active dogs in your care
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
              <DocumentTextIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{trainerStats?.unread_messages || 0}</div>
              <p className="text-xs text-muted-foreground">
                New messages from parents
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Today&apos;s Schedule</CardTitle>
              <CardDescription>Your upcoming sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[rgb(0_32_96)] bg-opacity-10 rounded-lg">
                  <div>
                    <p className="font-medium">Max - Training Session</p>
                    <p className="text-sm text-gray-600">9:00 AM - 10:00 AM</p>
                  </div>
                  <Button size="sm">View Details</Button>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium">Luna - Behavioral Session</p>
                    <p className="text-sm text-gray-600">2:00 PM - 3:00 PM</p>
                  </div>
                  <Button size="sm">View Details</Button>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    );
  };

  const renderParentDashboard = () => {
    const parentStats = stats as ParentStats;
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Dogs</CardTitle>
              <UserGroupIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{parentStats?.total_dogs || 0}</div>
              <p className="text-xs text-muted-foreground">
                Dogs in training
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upcoming Sessions</CardTitle>
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{parentStats?.upcoming_sessions || 0}</div>
              <p className="text-xs text-muted-foreground">
                Scheduled this week
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
              <DocumentTextIcon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{parentStats?.unread_messages || 0}</div>
              <p className="text-xs text-muted-foreground">
                New messages
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>My Dogs</CardTitle>
              <CardDescription>Your dogs in training</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-[rgb(0_32_96)] bg-opacity-10 rounded-lg">
                  <div>
                    <p className="font-medium">Max</p>
                    <p className="text-sm text-gray-600">Golden Retriever • 2 years old</p>
                  </div>
                  <Button size="sm">View Profile</Button>
                </div>
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium">Luna</p>
                    <p className="text-sm text-gray-600">Border Collie • 1 year old</p>
                  </div>
                  <Button size="sm">View Profile</Button>
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Welcome back! Here&apos;s what&apos;s happening with your {user.role} account.
          </p>
        </div>
        {(user?.role === 'admin' || user?.role === 'parent') && (
          <Button 
            className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white flex-shrink-0 min-w-[140px] shadow-md"
            onClick={() => setShowCreateModal(true)}
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            New Booking
          </Button>
        )}
      </div>

      {/* Announcements Section */}
      {visibleAnnouncements.length > 0 && (
        <div className="space-y-4">
          {visibleAnnouncements.map((announcement) => (
            <Card key={announcement.id} className="border-l-4 border-l-purple-500 bg-gradient-to-r from-purple-50 to-transparent">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <SpeakerWaveIcon className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-semibold text-purple-900">
                        📢 {announcement.subject}
                      </CardTitle>
                      <p className="text-sm text-purple-700 mt-1">
                        Posted {new Date(announcement.created_at).toLocaleDateString()} at{' '}
                        {new Date(announcement.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissAnnouncement(announcement.id)}
                    className="text-purple-600 hover:text-purple-800 hover:bg-purple-100"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {announcement.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {user.role === 'admin' && renderAdminDashboard()}
      {user.role === 'trainer' && renderTrainerDashboard()}
      {user.role === 'parent' && renderParentDashboard()}

      {/* Floating Action Button for Mobile - Always Visible */}
      {(user?.role === 'admin' || user?.role === 'parent') && (
        <Button
          className="fixed bottom-20 right-4 lg:hidden bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white rounded-full h-14 w-14 shadow-lg z-50 flex items-center justify-center"
          onClick={() => setShowCreateModal(true)}
          aria-label="New Booking"
        >
          <PlusIcon className="h-6 w-6" />
        </Button>
      )}

      {/* Create Booking Modal */}
      {user && (
        <CreateBookingModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSave={handleCreateBooking}
          dogs={dogs}
          trainers={trainers}
        />
      )}
    </div>
  );
}
