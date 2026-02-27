'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  NewspaperIcon,
  CalendarIcon,
  CheckIcon,
  XMarkIcon,
  ClockIcon,
  DocumentArrowUpIcon,
} from '@heroicons/react/24/outline';
import { authenticatedGet, authenticatedFetch, authenticatedPut } from '@/lib/api/apiClient';
import { getUsersByRole } from '@/lib/supabase/users';
import { getAllNewsItems, addNewsItem, updateNewsItem, deleteNewsItem } from '@/lib/data/content';
import type { NewsItem } from '@/lib/data/content';
import { type EventItem } from '@/lib/supabase/events';
import { uploadNewsAttachment, type NewsAttachment } from '@/lib/supabase/storage';

interface PendingBooking {
  id: string;
  dog_name: string;
  parent_name: string;
  booking_type: string;
  start_time: string;
  created_at: string;
  status: string;
  trainer_id: string | null;
}

interface PendingTrainer {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  approval_status: string;
}

type TabType = 'bookings' | 'trainers' | 'newsletters' | 'events';

interface NewsletterFormState {
  title: string;
  content: string;
  date: string;
  published: boolean;
  pendingFile: File | null;
}

interface EventFormState {
  title: string;
  description: string;
  event_date: string;
  location: string;
  published: boolean;
}

export function AdminManagementPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('bookings');
  const [loading, setLoading] = useState(true);

  // Bookings
  const [pendingBookings, setPendingBookings] = useState<PendingBooking[]>([]);
  const [trainers, setTrainers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [assigningTrainer, setAssigningTrainer] = useState<string | null>(null);

  // Trainer Approvals
  const [pendingTrainers, setPendingTrainers] = useState<PendingTrainer[]>([]);

  // Newsletters
  const [newsletters, setNewsletters] = useState<NewsItem[]>([]);
  const [showNewsletterModal, setShowNewsletterModal] = useState(false);
  const [editingNewsletter, setEditingNewsletter] = useState<NewsItem | null>(null);
  const [newsletterForm, setNewsletterForm] = useState<NewsletterFormState>({
    title: '',
    content: '',
    date: new Date().toISOString().split('T')[0],
    published: true,
    pendingFile: null,
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Events
  const [events, setEvents] = useState<EventItem[]>([]);
  const [showEventModal, setShowEventModal] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [eventForm, setEventForm] = useState<EventFormState>({
    title: '',
    description: '',
    event_date: new Date().toISOString().split('T')[0],
    location: '',
    published: true,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load all trainers - split into approved (for booking assignment) and pending (for approval)
      const allTrainers = await getUsersByRole('trainer');
      setTrainers(
        allTrainers.filter((t: any) => !t.approval_status || t.approval_status === 'approved')
      );
      setPendingTrainers(
        allTrainers
          .filter((t: any) => t.approval_status === 'pending')
          .map((t: any) => ({
            id: t.id,
            full_name: t.full_name,
            email: t.email,
            created_at: t.created_at,
            approval_status: t.approval_status,
          }))
      );

      // Load pending bookings
      const bookingsRes = await authenticatedGet('/api/bookings');
      if (bookingsRes.ok) {
        const bookingsData = await bookingsRes.json();
        const pending = bookingsData
          .filter(
            (b: any) =>
              b.status === 'pending' ||
              (b.status === 'confirmed' && !b.trainer_id)
          )
          .map((b: any) => ({
            id: b.id,
            dog_name: b.dog?.name || b.dogs?.name || 'Unknown Dog',
            parent_name: b.parent?.full_name || b.parents?.full_name || 'Unknown Parent',
            booking_type: b.booking_type,
            start_time: b.start_time,
            created_at: b.created_at,
            status: b.status,
            trainer_id: b.trainer_id,
          }));
        setPendingBookings(pending);
      }

      // Load newsletters (news_items with type='news')
      const allNews = await getAllNewsItems();
      setNewsletters(allNews.filter((n) => n.type === 'news'));

      // Load events via API (service role — bypasses RLS)
      try {
        const eventsRes = await authenticatedGet('/api/events');
        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          setEvents(Array.isArray(eventsData) ? eventsData : []);
        } else {
          setEvents([]);
        }
      } catch {
        setEvents([]);
      }
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ---- BOOKING HANDLERS ----

  const handleAssignTrainer = async (bookingId: string, trainerId: string) => {
    try {
      const res = await authenticatedFetch('/api/bookings', {
        method: 'PUT',
        body: JSON.stringify({ id: bookingId, status: 'confirmed', trainer_id: trainerId }),
      });
      if (res.ok) {
        await loadData();
        setAssigningTrainer(null);
      } else {
        throw new Error('Failed to assign trainer');
      }
    } catch (error) {
      console.error('Error assigning trainer:', error);
      alert('Failed to assign trainer. Please try again.');
    }
  };

  const handleRejectBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to reject this booking?')) return;
    try {
      const res = await authenticatedFetch('/api/bookings', {
        method: 'PUT',
        body: JSON.stringify({ id: bookingId, status: 'cancelled' }),
      });
      if (res.ok) await loadData();
    } catch (error) {
      console.error('Error rejecting booking:', error);
    }
  };

  // ---- TRAINER APPROVAL HANDLERS ----

  const handleApproveTrainer = async (trainerId: string) => {
    try {
      const res = await authenticatedPut('/api/users', {
        id: trainerId,
        approval_status: 'approved',
      });
      if (res.ok) {
        await loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to approve trainer');
      }
    } catch (error: any) {
      console.error('Error approving trainer:', error);
      alert(error.message || 'Failed to approve trainer. Please try again.');
    }
  };

  const handleRejectTrainer = async (trainerId: string) => {
    if (!confirm('Reject this trainer application? They will not be able to log in.')) return;
    try {
      const res = await authenticatedPut('/api/users', {
        id: trainerId,
        approval_status: 'rejected',
      });
      if (res.ok) {
        await loadData();
      } else {
        throw new Error('Failed to reject trainer');
      }
    } catch (error: any) {
      console.error('Error rejecting trainer:', error);
      alert(error.message || 'Failed to reject trainer. Please try again.');
    }
  };

  // ---- NEWSLETTER HANDLERS ----

  const resetNewsletterForm = () => {
    setNewsletterForm({
      title: '',
      content: '',
      date: new Date().toISOString().split('T')[0],
      published: true,
      pendingFile: null,
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveNewsletter = async () => {
    if (!newsletterForm.title.trim()) {
      alert('Please enter a title for the newsletter.');
      return;
    }

    try {
      let attachments: NewsAttachment[] = (editingNewsletter?.attachments as NewsAttachment[]) || [];

      // Upload PDF if a new file was selected
      if (newsletterForm.pendingFile) {
        setUploadingFile(true);
        const newsItemId = editingNewsletter?.id || `newsletter-${Date.now()}`;
        const result = await uploadNewsAttachment(newsletterForm.pendingFile, newsItemId);
        setUploadingFile(false);

        if (!result.success || !result.attachment) {
          alert(`PDF upload failed: ${result.error || 'Unknown error'}`);
          return;
        }
        attachments = [...attachments, result.attachment];
      }

      const newsData = {
        title: newsletterForm.title.trim(),
        content: newsletterForm.content.trim(),
        date: newsletterForm.date,
        type: 'news' as const,
        published: newsletterForm.published,
        attachments,
      };

      if (editingNewsletter) {
        await updateNewsItem(editingNewsletter.id, newsData);
      } else {
        await addNewsItem(newsData);
      }

      setShowNewsletterModal(false);
      setEditingNewsletter(null);
      resetNewsletterForm();
      await loadData();
    } catch (error) {
      console.error('Error saving newsletter:', error);
      setUploadingFile(false);
      alert('Failed to save newsletter. Please try again.');
    }
  };

  const handleEditNewsletter = (item: NewsItem) => {
    setEditingNewsletter(item);
    setNewsletterForm({
      title: item.title,
      content: item.content,
      date: item.date,
      published: item.published,
      pendingFile: null,
    });
    setShowNewsletterModal(true);
  };

  const handleDeleteNewsletter = async (id: string) => {
    if (!confirm('Delete this newsletter? This cannot be undone.')) return;
    try {
      await deleteNewsItem(id);
      await loadData();
    } catch (error) {
      console.error('Error deleting newsletter:', error);
      alert('Failed to delete newsletter.');
    }
  };

  const handleToggleNewsletterPublished = async (item: NewsItem) => {
    try {
      await updateNewsItem(item.id, { published: !item.published });
      await loadData();
    } catch (error) {
      console.error('Error toggling newsletter:', error);
    }
  };

  // ---- EVENT HANDLERS ----

  const resetEventForm = () => {
    setEventForm({
      title: '',
      description: '',
      event_date: new Date().toISOString().split('T')[0],
      location: '',
      published: true,
    });
  };

  const handleSaveEvent = async () => {
    if (!eventForm.title.trim() || !eventForm.description.trim() || !eventForm.event_date) {
      alert('Please fill in the event title, description, and date.');
      return;
    }

    try {
      // Only send the fields the user actually filled in
      const formFields: Record<string, any> = {
        title: eventForm.title.trim(),
        description: eventForm.description.trim(),
        event_date: eventForm.event_date,
        published: eventForm.published,
      };
      if (eventForm.location.trim()) {
        formFields.location = eventForm.location.trim();
      }

      let res: Response;
      if (editingEvent) {
        // PATCH: only update the fields from the form — don't touch status/category
        res = await authenticatedFetch('/api/events', {
          method: 'PATCH',
          body: JSON.stringify({ id: editingEvent.id, ...formFields }),
        });
      } else {
        // POST: include sensible defaults for required DB columns
        res = await authenticatedFetch('/api/events', {
          method: 'POST',
          body: JSON.stringify({
            ...formFields,
            status: 'upcoming',
            category: 'general',
            registration_required: false,
            price: 0,
            featured: false,
          }),
        });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || `Server error (${res.status})`);
      }

      setShowEventModal(false);
      setEditingEvent(null);
      resetEventForm();
      await loadData();
    } catch (error: any) {
      console.error('Error saving event:', error);
      alert(error.message || 'Failed to save event. Please try again.');
    }
  };

  const handleEditEvent = (event: EventItem) => {
    setEditingEvent(event);
    setEventForm({
      title: event.title,
      description: event.description,
      event_date: event.event_date,
      location: event.location || '',
      published: event.published,
    });
    setShowEventModal(true);
  };

  const handleDeleteEvent = async (id: string) => {
    if (!confirm('Delete this event? This cannot be undone.')) return;
    try {
      const res = await authenticatedFetch('/api/events?id=' + id, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || `Delete failed (${res.status})`);
      }
      await loadData();
    } catch (error: any) {
      console.error('Error deleting event:', error);
      alert(error.message || 'Failed to delete event.');
    }
  };

  const handleToggleEventPublished = async (event: EventItem) => {
    try {
      const res = await authenticatedFetch('/api/events', {
        method: 'PATCH',
        body: JSON.stringify({ id: event.id, published: !event.published }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || `Update failed (${res.status})`);
      }
      await loadData();
    } catch (error: any) {
      console.error('Error toggling event:', error);
      alert(error.message || 'Failed to update event. Please try again.');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(0_32_96)]" />
            <p className="text-sm text-gray-500">Loading management panel...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const tabs: Array<{ id: TabType; label: string; count?: number; icon: React.ReactNode }> = [
    {
      id: 'bookings',
      label: 'Pending Bookings',
      count: pendingBookings.length,
      icon: <UserGroupIcon className="h-4 w-4" />,
    },
    {
      id: 'trainers',
      label: 'Trainer Approvals',
      count: pendingTrainers.length,
      icon: <ClockIcon className="h-4 w-4" />,
    },
    {
      id: 'newsletters',
      label: 'Newsletters',
      icon: <NewspaperIcon className="h-4 w-4" />,
    },
    {
      id: 'events',
      label: 'Events',
      icon: <CalendarIcon className="h-4 w-4" />,
    },
  ];

  return (
    <Card className="border-2 border-[rgb(0_32_96)] overflow-hidden">
      <CardHeader className="bg-[rgb(0_32_96)] text-white">
        <CardTitle className="text-xl">Content Management</CardTitle>
        <CardDescription className="text-blue-200">
          Manage bookings, trainer approvals, newsletters, and events
        </CardDescription>
      </CardHeader>

      <CardContent className="p-0">
        {/* Tab Bar */}
        <div className="border-b border-gray-200 bg-gray-50 overflow-x-auto">
          <div className="flex min-w-max">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? 'bg-white text-[rgb(0_32_96)] border-[rgb(0_32_96)]'
                    : 'text-gray-500 border-transparent hover:text-gray-800 hover:bg-gray-100'
                }`}
              >
                {tab.icon}
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 text-xs rounded-full font-bold ${
                      activeTab === tab.id
                        ? 'bg-[rgb(0_32_96)] text-white'
                        : 'bg-red-500 text-white'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ===================== PENDING BOOKINGS TAB ===================== */}
        {activeTab === 'bookings' && (
          <div className="p-6">
            {pendingBookings.length === 0 ? (
              <div className="text-center py-14 text-gray-400">
                <UserGroupIcon className="h-14 w-14 mx-auto mb-3 text-gray-200" />
                <p className="font-semibold text-gray-500">No pending bookings</p>
                <p className="text-sm mt-1">All bookings have been processed</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-start sm:items-center justify-between p-4 bg-amber-50 border border-amber-200 rounded-xl gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-gray-900">{booking.dog_name}</span>
                        <span className="text-sm text-gray-500">• {booking.parent_name}</span>
                        {!booking.trainer_id && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                            No Trainer Assigned
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {booking.booking_type.replace(/_/g, ' ')} •{' '}
                        {new Date(booking.start_time).toLocaleDateString('en-ZA', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        at{' '}
                        {new Date(booking.start_time).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Requested {new Date(booking.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => setAssigningTrainer(booking.id)}
                      >
                        <CheckIcon className="h-4 w-4 mr-1" />
                        Assign Trainer
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleRejectBooking(booking.id)}
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===================== TRAINER APPROVALS TAB ===================== */}
        {activeTab === 'trainers' && (
          <div className="p-6">
            <div className="mb-4">
              <p className="text-sm text-gray-500">
                New trainer registrations require admin approval before they can log in.
              </p>
            </div>
            {pendingTrainers.length === 0 ? (
              <div className="text-center py-14 text-gray-400">
                <CheckIcon className="h-14 w-14 mx-auto mb-3 text-gray-200" />
                <p className="font-semibold text-gray-500">No pending applications</p>
                <p className="text-sm mt-1">All trainer accounts have been reviewed</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingTrainers.map((trainer) => (
                  <div
                    key={trainer.id}
                    className="flex items-start sm:items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-semibold text-gray-900">{trainer.full_name}</span>
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                          Pending Review
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{trainer.email}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Applied {new Date(trainer.created_at).toLocaleDateString('en-ZA', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleApproveTrainer(trainer.id)}
                      >
                        <CheckIcon className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleRejectTrainer(trainer.id)}
                      >
                        <XMarkIcon className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===================== NEWSLETTERS TAB ===================== */}
        {activeTab === 'newsletters' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-gray-500">
                Upload PDF newsletters that will appear on the public News page.
              </p>
              <Button
                size="sm"
                className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] flex-shrink-0"
                onClick={() => {
                  setEditingNewsletter(null);
                  resetNewsletterForm();
                  setShowNewsletterModal(true);
                }}
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Newsletter
              </Button>
            </div>

            {newsletters.length === 0 ? (
              <div className="text-center py-14 text-gray-400">
                <NewspaperIcon className="h-14 w-14 mx-auto mb-3 text-gray-200" />
                <p className="font-semibold text-gray-500">No newsletters yet</p>
                <p className="text-sm mt-1">Add your first newsletter above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {newsletters.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold text-gray-900">{item.title}</h4>
                        {item.attachments && item.attachments.length > 0 && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                            📎 {item.attachments.length} PDF
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            item.published
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {item.published ? 'Published' : 'Draft'}
                        </span>
                      </div>
                      {item.content && (
                        <p className="text-sm text-gray-500 line-clamp-1">{item.content}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(item.date).toLocaleDateString('en-ZA', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleNewsletterPublished(item)}
                        className="text-xs px-2.5"
                      >
                        {item.published ? 'Unpublish' : 'Publish'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditNewsletter(item)}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleDeleteNewsletter(item.id)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===================== EVENTS TAB ===================== */}
        {activeTab === 'events' && (
          <div className="p-6">
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-gray-500">
                Create events that will appear on the public Events section.
              </p>
              <Button
                size="sm"
                className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] flex-shrink-0"
                onClick={() => {
                  setEditingEvent(null);
                  resetEventForm();
                  setShowEventModal(true);
                }}
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Add Event
              </Button>
            </div>

            {events.length === 0 ? (
              <div className="text-center py-14 text-gray-400">
                <CalendarIcon className="h-14 w-14 mx-auto mb-3 text-gray-200" />
                <p className="font-semibold text-gray-500">No events yet</p>
                <p className="text-sm mt-1">Add your first event above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="flex items-start justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold text-gray-900">{event.title}</h4>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full ${
                            event.published
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {event.published ? 'Published' : 'Draft'}
                        </span>
                        <span
                          className={`px-2 py-0.5 text-xs rounded-full capitalize ${
                            event.status === 'upcoming'
                              ? 'bg-blue-100 text-blue-700'
                              : event.status === 'completed'
                              ? 'bg-gray-100 text-gray-500'
                              : event.status === 'cancelled'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}
                        >
                          {event.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 line-clamp-2">{event.description}</p>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400">
                        <span>
                          📅{' '}
                          {new Date(event.event_date).toLocaleDateString('en-ZA', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                        {event.location && <span>📍 {event.location}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleToggleEventPublished(event)}
                        className="text-xs px-2.5"
                      >
                        {event.published ? 'Unpublish' : 'Publish'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEditEvent(event)}
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleDeleteEvent(event.id)}
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* ===================== TRAINER ASSIGNMENT MODAL ===================== */}
      {assigningTrainer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Assign Trainer</h3>
            <p className="text-sm text-gray-500 mb-5">
              Select an approved trainer to assign to this booking.
            </p>
            <div className="space-y-2 mb-6 max-h-72 overflow-y-auto">
              {trainers.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500">No approved trainers available.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Approve a trainer first in the Trainer Approvals tab.
                  </p>
                </div>
              ) : (
                trainers.map((trainer) => (
                  <button
                    key={trainer.id}
                    onClick={() => handleAssignTrainer(assigningTrainer, trainer.id)}
                    className="w-full p-3.5 text-left border border-gray-200 rounded-xl hover:bg-[rgb(0_32_96)] hover:text-white hover:border-[rgb(0_32_96)] transition-all font-medium text-sm"
                  >
                    {trainer.full_name}
                  </button>
                ))
              )}
            </div>
            <Button
              variant="outline"
              onClick={() => setAssigningTrainer(null)}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* ===================== NEWSLETTER MODAL ===================== */}
      {showNewsletterModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-5">
              {editingNewsletter ? 'Edit Newsletter' : 'Add Newsletter'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <Input
                  value={newsletterForm.title}
                  onChange={(e) =>
                    setNewsletterForm({ ...newsletterForm, title: e.target.value })
                  }
                  placeholder="e.g., Spring 2025 Newsletter"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Summary{' '}
                  <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={newsletterForm.content}
                  onChange={(e) =>
                    setNewsletterForm({ ...newsletterForm, content: e.target.value })
                  }
                  placeholder="Brief description of what this newsletter covers..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)] text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
                  <Input
                    type="date"
                    value={newsletterForm.date}
                    onChange={(e) =>
                      setNewsletterForm({ ...newsletterForm, date: e.target.value })
                    }
                  />
                </div>
                <div className="flex items-end pb-0.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newsletterForm.published}
                      onChange={(e) =>
                        setNewsletterForm({ ...newsletterForm, published: e.target.checked })
                      }
                      className="w-4 h-4 rounded border-gray-300 accent-[rgb(0_32_96)]"
                    />
                    <span className="text-sm font-medium text-gray-700">Publish immediately</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  PDF Newsletter
                </label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-xl p-5 text-center hover:border-[rgb(0_32_96)] transition-colors cursor-pointer"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <DocumentArrowUpIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  {newsletterForm.pendingFile ? (
                    <div>
                      <p className="text-sm font-semibold text-gray-900">
                        {newsletterForm.pendingFile.name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {(newsletterForm.pendingFile.size / 1024 / 1024).toFixed(2)} MB — click to change
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Click to upload PDF</p>
                      <p className="text-xs text-gray-400 mt-0.5">PDF files up to 10 MB</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setNewsletterForm({ ...newsletterForm, pendingFile: file });
                    }}
                  />
                </div>

                {/* Show existing attachments when editing */}
                {editingNewsletter?.attachments && editingNewsletter.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-gray-400">Currently attached:</p>
                    {editingNewsletter.attachments.map((att: any, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 text-xs text-gray-600 bg-gray-50 p-2 rounded-lg"
                      >
                        <span>📄</span>
                        <span className="flex-1 truncate">{att.filename}</span>
                        <a
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline ml-auto flex-shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowNewsletterModal(false);
                  setEditingNewsletter(null);
                  resetNewsletterForm();
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveNewsletter}
                disabled={uploadingFile}
                className="flex-1 bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)]"
              >
                {uploadingFile
                  ? 'Uploading PDF...'
                  : editingNewsletter
                  ? 'Save Changes'
                  : 'Publish Newsletter'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== EVENT MODAL ===================== */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-5">
              {editingEvent ? 'Edit Event' : 'Add Event'}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Event Title <span className="text-red-500">*</span>
                </label>
                <Input
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder="e.g., Easter Egg Hunt for Dogs!"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={eventForm.description}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, description: e.target.value })
                  }
                  placeholder="e.g., Easter is coming and we are hosting an Easter Egg Hunt for the dogs! Bring your furry friend for a fun morning of treats and surprises..."
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)] text-sm resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Event Date <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="date"
                    value={eventForm.event_date}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, event_date: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Location{' '}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <Input
                    value={eventForm.location}
                    onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                    placeholder="e.g., Main Training Grounds"
                  />
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer w-fit">
                  <input
                    type="checkbox"
                    checked={eventForm.published}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, published: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-gray-300 accent-[rgb(0_32_96)]"
                  />
                  <span className="text-sm font-medium text-gray-700">Publish immediately</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowEventModal(false);
                  setEditingEvent(null);
                  resetEventForm();
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEvent}
                className="flex-1 bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)]"
              >
                {editingEvent ? 'Save Changes' : 'Publish Event'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
