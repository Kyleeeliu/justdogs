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
  DocumentArrowUpIcon,
  UserIcon,
} from '@heroicons/react/24/outline';
import { authenticatedGet, authenticatedFetch, authenticatedPut } from '@/lib/api/apiClient';
import { getAllNewsItems, addNewsItem, updateNewsItem, deleteNewsItem } from '@/lib/data/content';
import type { NewsItem } from '@/lib/data/content';
import { type EventItem } from '@/lib/supabase/events';
import { uploadNewsAttachment, type NewsAttachment } from '@/lib/supabase/storage';
import { getAllDogs } from '@/lib/supabase/dogs';

// ─── Constants ────────────────────────────────────────────────────────────────

const BOOKING_CATEGORIES = [
  { value: 'farm', label: 'Farm' },
];

interface DbBookingType {
  id: string;
  name: string;
  category: string;
  duration_minutes: number;
  price_per_dog: number;
}

const BOOKING_STATUSES = [
  { value: 'pending', label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-600' },
  { value: 'completed', label: 'Completed', color: 'bg-gray-100 text-gray-600' },
];

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Booking {
  id: string;
  dog_id: string | null;
  dog_name: string;
  parent_id: string | null;
  parent_name: string;
  trainer_id: string | null;
  trainer_name: string | null;
  farm_day_id: string | null;
  farm_day_date: string | null;
  farm_day_trainer: string | null;
  booking_type: string;
  start_time: string;
  end_time: string | null;
  notes: string | null;
  location: string | null;
  created_at: string;
  status: string;
}

interface FarmDay {
  id: string;
  date: string;
  trainer_id: string | null;
  trainer_name: string | null;
  max_capacity: number | null;
  notes: string | null;
  total_bookings: number;
}

interface FarmDayFormState {
  date: string;
  trainer_id: string;
  max_capacity: string;
  notes: string;
}

interface Trainer {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  approval_status: string | null;
}

interface ParentUser {
  id: string;
  full_name: string;
  email: string;
  created_at: string;
  verification_status: string | null;
}

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

interface BookingEditState {
  id: string;
  booking_type: string;
  start_time: string;
  end_time: string;
  notes: string;
  location: string;
  status: string;
  trainer_id: string;
  farm_day_id: string | null;
}

interface BookingCreateState {
  dog_id: string;
  farm_day_id: string;
  booking_type: string;
  notes: string;
}

type TabType = 'bookings' | 'farm-days' | 'trainers' | 'parents' | 'newsletters' | 'events';
type BookingFilter = 'all' | 'pending' | 'confirmed' | 'cancelled' | 'completed';
type TrainerFilter = 'all' | 'pending' | 'current' | 'deactivated';
type ParentFilter = 'all' | 'pending' | 'verified' | 'rejected';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  // Convert ISO to datetime-local format: "YYYY-MM-DDTHH:mm"
  return iso.slice(0, 16);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-ZA', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'Africa/Johannesburg',
  });
}


function statusBadge(status: string) {
  const s = BOOKING_STATUSES.find((b) => b.value === status);
  return s ? s.color : 'bg-gray-100 text-gray-600';
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AdminManagementPanel() {
  const [activeTab, setActiveTab] = useState<TabType>('bookings');
  const [loading, setLoading] = useState(true);

  // ── Bookings ──
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [bookingFilter, setBookingFilter] = useState<BookingFilter>('all');
  const [approvedTrainers, setApprovedTrainers] = useState<Array<{ id: string; full_name: string }>>([]);
  const [assigningBookingId, setAssigningBookingId] = useState<string | null>(null);
  const [editingBooking, setEditingBooking] = useState<BookingEditState | null>(null);
  const [showCreateBooking, setShowCreateBooking] = useState(false);
  const [allDogs, setAllDogs] = useState<Array<{ id: string; name: string }>>([]);
  const [bookingFormError, setBookingFormError] = useState<string | null>(null);
  const [dbBookingTypes, setDbBookingTypes] = useState<DbBookingType[]>([]);
  const emptyCreate: BookingCreateState = {
    dog_id: '',
    farm_day_id: '',
    booking_type: '',
    notes: '',
  };
  const [createForm, setCreateForm] = useState<BookingCreateState>(emptyCreate);

  // ── Farm Days ──
  const [farmDays, setFarmDays] = useState<FarmDay[]>([]);
  const [showCreateFarmDay, setShowCreateFarmDay] = useState(false);
  const [editingFarmDay, setEditingFarmDay] = useState<FarmDay | null>(null);
  const emptyFarmDayForm: FarmDayFormState = { date: '', trainer_id: '', max_capacity: '', notes: '' };
  const [farmDayForm, setFarmDayForm] = useState<FarmDayFormState>(emptyFarmDayForm);
  const [farmDayFormError, setFarmDayFormError] = useState<string | null>(null);

  // ── Trainers ──
  const [allTrainers, setAllTrainers] = useState<Trainer[]>([]);
  const [trainerFilter, setTrainerFilter] = useState<TrainerFilter>('all');
  const [showCreateTrainer, setShowCreateTrainer] = useState(false);
  const [createTrainerForm, setCreateTrainerForm] = useState({
    email: '',
    full_name: '',
    phone: '',
    password: '',
  });
  const [createTrainerError, setCreateTrainerError] = useState<string | null>(null);

  // ── Parents ──
  const [allParents, setAllParents] = useState<ParentUser[]>([]);
  const [parentFilter, setParentFilter] = useState<ParentFilter>('pending');

  // ── Newsletters ──
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

  // ── Events ──
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

      // ── Trainers (all) ──
      const res = await authenticatedGet('/api/users?role=trainer');
      if (res.ok) {
        const data = await res.json();
        const trainers: Trainer[] = (data.users || []).map((t: any) => ({
          id: t.id,
          full_name: t.full_name,
          email: t.email,
          created_at: t.created_at,
          approval_status: t.approval_status ?? null,
        }));
        setAllTrainers(trainers);
        setApprovedTrainers(
          trainers.filter((t) => !t.approval_status || t.approval_status === 'approved')
        );
      }

      // ── Parents (all) ──
      const parentRes = await authenticatedGet('/api/users?role=parent');
      if (parentRes.ok) {
        const data = await parentRes.json();
        const parents: ParentUser[] = (data.users || []).map((p: any) => ({
          id: p.id,
          full_name: p.full_name,
          email: p.email,
          created_at: p.created_at,
          verification_status: p.verification_status ?? null,
        }));
        setAllParents(parents);
      }

      // ── All Bookings ──
      const bookingsRes = await authenticatedGet('/api/bookings');
      if (bookingsRes.ok) {
        const data = await bookingsRes.json();
        const bookings: Booking[] = data.map((b: any) => ({
          id: b.id,
          dog_id: b.dog_id ?? null,
          dog_name: b.dogs?.name || b.dog?.name || 'Unknown Dog',
          parent_id: b.parent_id ?? null,
          parent_name: b.parents?.full_name || b.parent?.full_name || 'Unknown Owner',
          trainer_id: b.trainer_id ?? null,
          trainer_name: b.trainers?.full_name || null,
          farm_day_id: b.farm_day_id ?? null,
          farm_day_date: b.farm_day?.date ?? null,
          farm_day_trainer: b.farm_day?.farm_day_trainer?.full_name ?? null,
          booking_type: b.booking_type,
          start_time: b.start_time,
          end_time: b.end_time ?? null,
          notes: b.notes ?? null,
          location: b.location ?? null,
          created_at: b.created_at,
          status: b.status,
        }));
        setAllBookings(bookings);
      }

      // ── Farm Days ──
      try {
        const fdRes = await authenticatedGet('/api/farm-days');
        if (fdRes.ok) {
          const fdData = await fdRes.json();
          setFarmDays(Array.isArray(fdData) ? fdData : []);
        }
      } catch {
        setFarmDays([]);
      }

      // ── Dogs (for create booking) ──
      try {
        const dogs = await getAllDogs();
        setAllDogs(dogs.map((d) => ({ id: d.id, name: d.name })));
      } catch {
        setAllDogs([]);
      }

      // ── Booking Types ──
      try {
        const btRes = await authenticatedGet('/api/booking-types');
        if (btRes.ok) {
          const btData = await btRes.json();
          setDbBookingTypes(Array.isArray(btData) ? btData : []);
        }
      } catch {
        setDbBookingTypes([]);
      }

      // ── Newsletters ──
      const allNews = await getAllNewsItems();
      setNewsletters(allNews.filter((n) => n.type === 'news'));

      // ── Events ──
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

  // ─── Booking Handlers ─────────────────────────────────────────────────────

  const handleAssignTrainer = async (bookingId: string, trainerId: string) => {
    try {
      const res = await authenticatedFetch('/api/bookings', {
        method: 'PUT',
        body: JSON.stringify({ id: bookingId, trainer_id: trainerId, status: 'confirmed' }),
      });
      if (!res.ok) throw new Error('Failed to assign trainer');
      await loadData();
      setAssigningBookingId(null);
    } catch (error) {
      console.error('Error assigning trainer:', error);
      alert('Failed to assign trainer. Please try again.');
    }
  };

  const openEditBooking = (b: Booking) => {
    setBookingFormError(null);
    setEditingBooking({
      id: b.id,
      booking_type: b.booking_type,
      start_time: toLocalInput(b.start_time),
      end_time: toLocalInput(b.end_time),
      notes: b.notes || '',
      location: b.location || '',
      status: b.status,
      trainer_id: b.trainer_id || '',
      farm_day_id: b.farm_day_id,
    });
  };

  const handleSaveEditBooking = async () => {
    if (!editingBooking) return;
    setBookingFormError(null);
    if (!editingBooking.booking_type || !editingBooking.start_time) {
      setBookingFormError('Service type and start date/time are required.');
      return;
    }
    try {
      const payload: any = {
        id: editingBooking.id,
        booking_type: editingBooking.booking_type,
        start_time: new Date(editingBooking.start_time).toISOString(),
        end_time: editingBooking.end_time
          ? new Date(editingBooking.end_time).toISOString()
          : null,
        notes: editingBooking.notes || null,
        location: editingBooking.location || null,
        status: editingBooking.status,
        trainer_id: editingBooking.trainer_id || null,
      };
      const res = await authenticatedFetch('/api/bookings', {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || 'Failed to save booking');
      }
      setEditingBooking(null);
      await loadData();
    } catch (error: any) {
      setBookingFormError(error.message || 'Failed to save booking');
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm('Delete this booking? This cannot be undone.')) return;
    try {
      const res = await authenticatedFetch(`/api/bookings?id=${bookingId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || 'Failed to delete booking');
      }
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to delete booking.');
    }
  };

  const handleCreateBooking = async () => {
    setBookingFormError(null);
    if (!createForm.dog_id || !createForm.booking_type || !createForm.farm_day_id) {
      setBookingFormError('Dog, service type, and farm day are required.');
      return;
    }
    try {
      const farmDay = farmDays.find(fd => fd.id === createForm.farm_day_id);
      const payload: any = {
        dog_id: createForm.dog_id,
        booking_type: createForm.booking_type,
        farm_day_id: createForm.farm_day_id,
        start_time: farmDay ? `${farmDay.date}T00:00:00` : new Date().toISOString(),
        notes: createForm.notes || null,
        duration_type: 'days',
        duration_days: 1,
      };
      const res = await authenticatedFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || 'Failed to create booking');
      }
      setShowCreateBooking(false);
      setCreateForm(emptyCreate);
      await loadData();
    } catch (error: any) {
      setBookingFormError(error.message || 'Failed to create booking');
    }
  };

  // ─── Farm Day Handlers ────────────────────────────────────────────────────

  const openCreateFarmDay = () => {
    setFarmDayFormError(null);
    setEditingFarmDay(null);
    setFarmDayForm(emptyFarmDayForm);
    setShowCreateFarmDay(true);
  };

  const openEditFarmDay = (fd: FarmDay) => {
    setFarmDayFormError(null);
    setEditingFarmDay(fd);
    setFarmDayForm({
      date: fd.date,
      trainer_id: fd.trainer_id || '',
      max_capacity: fd.max_capacity !== null ? String(fd.max_capacity) : '',
      notes: fd.notes || '',
    });
    setShowCreateFarmDay(true);
  };

  const handleSaveFarmDay = async () => {
    setFarmDayFormError(null);
    if (!farmDayForm.date) {
      setFarmDayFormError('Date is required.');
      return;
    }
    try {
      const payload = {
        date: farmDayForm.date,
        trainer_id: farmDayForm.trainer_id || null,
        max_capacity: farmDayForm.max_capacity || null,
        notes: farmDayForm.notes || null,
      };
      let res: Response;
      if (editingFarmDay) {
        res = await authenticatedFetch('/api/farm-days', {
          method: 'PUT',
          body: JSON.stringify({ id: editingFarmDay.id, ...payload }),
        });
      } else {
        res = await authenticatedFetch('/api/farm-days', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || 'Failed to save farm day');
      }
      setShowCreateFarmDay(false);
      setEditingFarmDay(null);
      setFarmDayForm(emptyFarmDayForm);
      await loadData();
    } catch (error: any) {
      setFarmDayFormError(error.message || 'Failed to save farm day');
    }
  };

  const handleDeleteFarmDay = async (id: string) => {
    if (!confirm('Delete this farm day? Existing bookings linked to it will lose their farm day association.')) return;
    try {
      const res = await authenticatedFetch(`/api/farm-days?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || 'Failed to delete farm day');
      }
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to delete farm day.');
    }
  };

  // ─── Trainer Handlers ─────────────────────────────────────────────────────

  const handleTrainerStatus = async (trainerId: string, status: 'approved' | 'deactivated') => {
    if (
      status === 'deactivated' &&
      !confirm('Deactivate this trainer? Their account will switch to a regular parent view. You can reactivate them at any time.')
    )
      return;
    try {
      const res = await authenticatedPut('/api/users', { id: trainerId, approval_status: status });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || `Failed to ${status} trainer`);
      }
      await loadData();
    } catch (error: any) {
      alert(error.message || `Failed to ${status} trainer.`);
    }
  };

  const handleCreateTrainer = async () => {
    setCreateTrainerError(null);
    if (
      !createTrainerForm.email.trim() ||
      !createTrainerForm.full_name.trim() ||
      !createTrainerForm.password.trim()
    ) {
      setCreateTrainerError('Email, full name, and password are required.');
      return;
    }
    try {
      const res = await authenticatedFetch('/api/admin/trainers', {
        method: 'POST',
        body: JSON.stringify({
          email: createTrainerForm.email.trim(),
          full_name: createTrainerForm.full_name.trim(),
          phone: createTrainerForm.phone.trim() || undefined,
          password: createTrainerForm.password.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error((data as any).error || 'Failed to create trainer');
      }
      setShowCreateTrainer(false);
      setCreateTrainerForm({ email: '', full_name: '', phone: '', password: '' });
      await loadData();
    } catch (error: any) {
      setCreateTrainerError(error.message || 'Failed to create trainer');
    }
  };

  // ─── Parent Verification Handlers ──────────────────────────────────────────

  const handleParentVerification = async (parentId: string, status: 'verified' | 'rejected') => {
    if (
      status === 'rejected' &&
      !confirm('Reject this parent verification? They will remain blocked from bookings.')
    )
      return;
    try {
      const res = await authenticatedPut('/api/users', { id: parentId, verification_status: status });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as any).error || `Failed to set parent as ${status}`);
      }
      await loadData();
    } catch (error: any) {
      alert(error.message || `Failed to set parent as ${status}.`);
    }
  };

  // ─── Newsletter Handlers ──────────────────────────────────────────────────

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

  // ─── Event Handlers ───────────────────────────────────────────────────────

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
      const formFields: Record<string, any> = {
        title: eventForm.title.trim(),
        description: eventForm.description.trim(),
        event_date: eventForm.event_date,
        published: eventForm.published,
      };
      if (eventForm.location.trim()) formFields.location = eventForm.location.trim();

      let res: Response;
      if (editingEvent) {
        res = await authenticatedFetch('/api/events', {
          method: 'PATCH',
          body: JSON.stringify({ id: editingEvent.id, ...formFields }),
        });
      } else {
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
      alert(error.message || 'Failed to delete event.');
    }
  };

  const handleToggleEventPublished = async (event: EventItem) => {
    try {
      const res = await authenticatedFetch('/api/events', {
        method: 'PATCH',
        body: JSON.stringify({ id: event.id, published: !event.published }),
      });
      if (!res.ok) throw new Error('Failed to update event');
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to update event.');
    }
  };

  // ─── Derived data ─────────────────────────────────────────────────────────

  const now = new Date();
  const isCompleted = (b: Booking) =>
    b.status === 'completed' || (new Date(b.start_time) < now && b.status !== 'cancelled');

  const filteredBookings =
    bookingFilter === 'all'
      ? allBookings
      : bookingFilter === 'completed'
      ? allBookings.filter(isCompleted)
      : allBookings.filter((b) => b.status === bookingFilter);

  const filteredTrainers =
    trainerFilter === 'all'
      ? allTrainers
      : trainerFilter === 'current'
      ? allTrainers.filter((t) => !t.approval_status || t.approval_status === 'approved')
      : allTrainers.filter((t) => t.approval_status === trainerFilter);

  const getParentVerificationStatus = (parent: ParentUser): ParentFilter => {
    if (parent.verification_status === 'verified') return 'verified';
    if (parent.verification_status === 'rejected') return 'rejected';
    return 'pending';
  };

  const filteredParents =
    parentFilter === 'all'
      ? allParents
      : allParents.filter((p) => getParentVerificationStatus(p) === parentFilter);

  const pendingTrainerCount = allTrainers.filter((t) => t.approval_status === 'pending').length;
  const pendingParentCount = allParents.filter((p) => getParentVerificationStatus(p) === 'pending').length;
  const pendingBookingCount = allBookings.filter((b) => b.status === 'pending').length;

  // ─── Loading State ────────────────────────────────────────────────────────

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
      label: 'Bookings',
      count: pendingBookingCount || undefined,
      icon: <CalendarIcon className="h-4 w-4" />,
    },
    {
      id: 'farm-days',
      label: 'Farm Days',
      icon: <CalendarIcon className="h-4 w-4" />,
    },
    {
      id: 'trainers',
      label: 'Trainers',
      count: pendingTrainerCount || undefined,
      icon: <UserIcon className="h-4 w-4" />,
    },
    {
      id: 'parents',
      label: 'Parents',
      count: pendingParentCount || undefined,
      icon: <UserGroupIcon className="h-4 w-4" />,
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
        <CardTitle className="text-xl">Admin Management</CardTitle>
        <CardDescription className="text-blue-200">
          Manage bookings, trainer and parent approvals, newsletters, and events
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
                      activeTab === tab.id ? 'bg-[rgb(0_32_96)] text-white' : 'bg-red-500 text-white'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* ═══════════════ BOOKINGS TAB ═══════════════ */}
        {activeTab === 'bookings' && (
          <div className="p-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              {/* Status filter */}
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'pending', 'confirmed', 'cancelled', 'completed'] as BookingFilter[]).map(
                  (f) => {
                    const count =
                      f === 'all'
                        ? allBookings.length
                        : f === 'completed'
                        ? allBookings.filter(isCompleted).length
                        : allBookings.filter((b) => b.status === f).length;
                    return (
                      <button
                        key={f}
                        onClick={() => setBookingFilter(f)}
                        className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                          bookingFilter === f
                            ? 'bg-[rgb(0_32_96)] text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {f} ({count})
                      </button>
                    );
                  }
                )}
              </div>
              <Button
                size="sm"
                className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] flex-shrink-0"
                onClick={() => {
                  setBookingFormError(null);
                  setCreateForm(emptyCreate);
                  setShowCreateBooking(true);
                }}
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                New Booking
              </Button>
            </div>

            {filteredBookings.length === 0 ? (
              <div className="text-center py-14 text-gray-400">
                <CalendarIcon className="h-14 w-14 mx-auto mb-3 text-gray-200" />
                <p className="font-semibold text-gray-500">No bookings</p>
                <p className="text-sm mt-1">
                  {bookingFilter === 'all' ? 'No bookings have been made yet' : `No ${bookingFilter} bookings`}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-start sm:items-center justify-between p-4 bg-white border border-gray-200 rounded-xl gap-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-semibold text-gray-900">{booking.dog_name}</span>
                        <span className="text-sm text-gray-500">— {booking.parent_name}</span>
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${statusBadge(booking.status)}`}>
                          {booking.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {BOOKING_CATEGORIES.find((t) => t.value === booking.booking_type)?.label ||
                          booking.booking_type.replace(/_/g, ' ')}{' '}
                        · {formatDate(booking.start_time)}
                      </p>
                      {booking.farm_day_id ? (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Farm Day:{' '}
                          <span className="text-gray-700 font-medium">
                            {booking.farm_day_date
                              ? new Date(booking.farm_day_date + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })
                              : 'Unknown'}
                          </span>
                          {booking.farm_day_trainer && (
                            <span className="text-gray-500"> · {booking.farm_day_trainer}</span>
                          )}
                        </p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Trainer:{' '}
                          <span className={booking.trainer_name ? 'text-gray-700 font-medium' : 'text-red-500'}>
                            {booking.trainer_name || 'Unassigned'}
                          </span>
                        </p>
                      )}
                      {booking.location && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          📍 {booking.location}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      {!booking.farm_day_id && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs px-2.5"
                          onClick={() => setAssigningBookingId(booking.id)}
                          title="Assign trainer"
                        >
                          <UserGroupIcon className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEditBooking(booking)}
                        title="Edit booking"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleDeleteBooking(booking.id)}
                        title="Delete booking"
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

        {/* ═══════════════ FARM DAYS TAB ═══════════════ */}
        {activeTab === 'farm-days' && (
          <div className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <p className="text-sm text-gray-500">
                Create farm day slots that parents can book into. Each day is assigned to one trainer.
              </p>
              <Button
                size="sm"
                className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] flex-shrink-0"
                onClick={openCreateFarmDay}
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                New Farm Day
              </Button>
            </div>

            {farmDays.length === 0 ? (
              <div className="text-center py-14 text-gray-400">
                <CalendarIcon className="h-14 w-14 mx-auto mb-3 text-gray-200" />
                <p className="font-semibold text-gray-500">No farm days yet</p>
                <p className="text-sm mt-1">Create a farm day so parents can book farm stays</p>
              </div>
            ) : (
              <div className="space-y-2">
                {farmDays.map((fd) => (
                  <div
                    key={fd.id}
                    className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl gap-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-semibold text-gray-900">
                          {new Date(fd.date + 'T00:00:00').toLocaleDateString('en-ZA', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                          {fd.total_bookings}{fd.max_capacity ? `/${fd.max_capacity}` : ''} booked
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Trainer:{' '}
                        <span className={fd.trainer_name ? 'font-medium text-gray-800' : 'text-amber-600'}>
                          {fd.trainer_name || 'Unassigned'}
                        </span>
                      </p>
                      {fd.notes && <p className="text-xs text-gray-400 mt-0.5">{fd.notes}</p>}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <Button size="sm" variant="outline" onClick={() => openEditFarmDay(fd)}>
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => handleDeleteFarmDay(fd.id)}
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

        {/* ═══════════════ TRAINERS TAB ═══════════════ */}
        {activeTab === 'trainers' && (
          <div className="p-6">
            {/* Header: filter + Create trainer */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    { value: 'all', label: 'All' },
                    { value: 'pending', label: 'Pending Approval' },
                    { value: 'current', label: 'Current Trainers' },
                    { value: 'deactivated', label: 'Deactivated' },
                  ] as Array<{ value: TrainerFilter; label: string }>
                ).map(({ value: f, label }) => {
                  const count =
                    f === 'all'
                      ? allTrainers.length
                      : f === 'current'
                      ? allTrainers.filter((t) => !t.approval_status || t.approval_status === 'approved').length
                      : allTrainers.filter((t) => t.approval_status === f).length;
                  return (
                    <button
                      key={f}
                      onClick={() => setTrainerFilter(f)}
                      className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        trainerFilter === f
                          ? 'bg-[rgb(0_32_96)] text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {label} ({count})
                    </button>
                  );
                })}
              </div>
              <Button
                size="sm"
                className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] flex-shrink-0"
                onClick={() => {
                  setCreateTrainerError(null);
                  setCreateTrainerForm({ email: '', full_name: '', phone: '', password: '' });
                  setShowCreateTrainer(true);
                }}
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                Create Trainer
              </Button>
            </div>

            {filteredTrainers.length === 0 ? (
              <div className="text-center py-14 text-gray-400">
                <CheckIcon className="h-14 w-14 mx-auto mb-3 text-gray-200" />
                <p className="font-semibold text-gray-500">No trainers</p>
                <p className="text-sm mt-1">
                  {trainerFilter === 'pending'
                    ? 'No pending applications'
                    : trainerFilter === 'current'
                    ? 'No active trainers yet'
                    : trainerFilter === 'deactivated'
                    ? 'No deactivated trainers'
                    : 'No trainers found'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTrainers.map((trainer) => {
                  const isCurrent = !trainer.approval_status || trainer.approval_status === 'approved';
                  const isPending = trainer.approval_status === 'pending';
                  const isDeactivated = trainer.approval_status === 'deactivated';
                  return (
                    <div
                      key={trainer.id}
                      className="flex items-start sm:items-center justify-between p-4 bg-white border border-gray-200 rounded-xl gap-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-semibold text-gray-900">{trainer.full_name}</span>
                          {isPending && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                              Pending Approval
                            </span>
                          )}
                          {isCurrent && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
                              Active Trainer
                            </span>
                          )}
                          {isDeactivated && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full font-medium">
                              Deactivated
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{trainer.email}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Registered{' '}
                          {new Date(trainer.created_at).toLocaleDateString('en-ZA', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {isPending && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleTrainerStatus(trainer.id, 'approved')}
                          >
                            <CheckIcon className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        )}
                        {isDeactivated && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleTrainerStatus(trainer.id, 'approved')}
                          >
                            <CheckIcon className="h-4 w-4 mr-1" />
                            Reactivate
                          </Button>
                        )}
                        {isCurrent && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleTrainerStatus(trainer.id, 'deactivated')}
                          >
                            <XMarkIcon className="h-4 w-4 mr-1" />
                            Deactivate
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ PARENTS TAB ═══════════════ */}
        {activeTab === 'parents' && (
          <div className="p-6">
            <div className="flex flex-wrap gap-1.5 mb-5">
              {(
                [
                  { value: 'pending', label: 'Pending Verification' },
                  { value: 'verified', label: 'Verified' },
                  { value: 'rejected', label: 'Rejected' },
                  { value: 'all', label: 'All' },
                ] as Array<{ value: ParentFilter; label: string }>
              ).map(({ value: f, label }) => {
                const count =
                  f === 'all'
                    ? allParents.length
                    : allParents.filter((p) => getParentVerificationStatus(p) === f).length;
                return (
                  <button
                    key={f}
                    onClick={() => setParentFilter(f)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      parentFilter === f
                        ? 'bg-[rgb(0_32_96)] text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {label} ({count})
                  </button>
                );
              })}
            </div>

            {filteredParents.length === 0 ? (
              <div className="text-center py-14 text-gray-400">
                <UserGroupIcon className="h-14 w-14 mx-auto mb-3 text-gray-200" />
                <p className="font-semibold text-gray-500">No parents</p>
                <p className="text-sm mt-1">
                  {parentFilter === 'pending'
                    ? 'No parents awaiting verification'
                    : parentFilter === 'verified'
                    ? 'No verified parents yet'
                    : parentFilter === 'rejected'
                    ? 'No rejected parents'
                    : 'No parent accounts found'}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredParents.map((parent) => {
                  const status = getParentVerificationStatus(parent);
                  const isPending = status === 'pending';
                  const isVerified = status === 'verified';
                  const isRejected = status === 'rejected';
                  return (
                    <div
                      key={parent.id}
                      className="flex items-start sm:items-center justify-between p-4 bg-white border border-gray-200 rounded-xl gap-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <span className="font-semibold text-gray-900">{parent.full_name}</span>
                          {isPending && (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full font-medium">
                              Pending Verification
                            </span>
                          )}
                          {isVerified && (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded-full font-medium">
                              Verified
                            </span>
                          )}
                          {isRejected && (
                            <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                              Rejected
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{parent.email}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          Registered{' '}
                          {new Date(parent.created_at).toLocaleDateString('en-ZA', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        {!isVerified && (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleParentVerification(parent.id, 'verified')}
                          >
                            <CheckIcon className="h-4 w-4 mr-1" />
                            Verify
                          </Button>
                        )}
                        {!isRejected && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => handleParentVerification(parent.id, 'rejected')}
                          >
                            <XMarkIcon className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════ NEWSLETTERS TAB ═══════════════ */}
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
                            item.published ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
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
                      <Button size="sm" variant="outline" onClick={() => handleEditNewsletter(item)}>
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

        {/* ═══════════════ EVENTS TAB ═══════════════ */}
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
                            event.published ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'
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
                      <Button size="sm" variant="outline" onClick={() => handleEditEvent(event)}>
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

      {/* ═══════════════ MODAL: ASSIGN TRAINER ═══════════════ */}
      {assigningBookingId && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Assign Trainer</h3>
            <p className="text-sm text-gray-500 mb-5">
              Select an approved trainer to assign to this booking.
            </p>
            <div className="space-y-2 mb-6 max-h-72 overflow-y-auto">
              {approvedTrainers.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-sm text-gray-500">No approved trainers available.</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Approve a trainer first in the Trainer Approvals tab.
                  </p>
                </div>
              ) : (
                approvedTrainers.map((trainer) => (
                  <button
                    key={trainer.id}
                    onClick={() => handleAssignTrainer(assigningBookingId, trainer.id)}
                    className="w-full p-3.5 text-left border border-gray-200 rounded-xl hover:bg-[rgb(0_32_96)] hover:text-white hover:border-[rgb(0_32_96)] transition-all font-medium text-sm"
                  >
                    {trainer.full_name}
                  </button>
                ))
              )}
            </div>
            <Button variant="outline" onClick={() => setAssigningBookingId(null)} className="w-full">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* ═══════════════ MODAL: EDIT BOOKING ═══════════════ */}
      {editingBooking && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-5">Edit Booking</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Service Type <span className="text-red-500">*</span>
                </label>
                {dbBookingTypes.length > 0 ? (
                  <div className="space-y-3">
                    {BOOKING_CATEGORIES.map(cat => {
                      const types = dbBookingTypes.filter(t => t.category === cat.value);
                      if (types.length === 0) return null;
                      return (
                        <div key={cat.value}>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{cat.label}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {types.map(t => {
                              const selected = editingBooking.booking_type === t.name;
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => setEditingBooking({ ...editingBooking, booking_type: t.name })}
                                  className={`flex flex-col px-4 py-3 rounded-lg border-2 text-left transition-colors ${
                                    selected
                                      ? 'border-[rgb(0_32_96)] bg-blue-50 text-[rgb(0_32_96)]'
                                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                  }`}
                                >
                                  <span className="font-medium text-sm">{t.name}</span>
                                  <span className="text-xs opacity-70 mt-0.5">
                                    {t.duration_minutes} min · R{t.price_per_dog}/dog
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <select
                    value={editingBooking.booking_type}
                    onChange={(e) => setEditingBooking({ ...editingBooking, booking_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)] text-sm"
                  >
                    <option value="">Choose a service...</option>
                    {BOOKING_CATEGORIES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Start Date & Time <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="datetime-local"
                    value={editingBooking.start_time}
                    onChange={(e) => setEditingBooking({ ...editingBooking, start_time: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    End Date & Time <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <Input
                    type="datetime-local"
                    value={editingBooking.end_time}
                    onChange={(e) => setEditingBooking({ ...editingBooking, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                <select
                  value={editingBooking.status}
                  onChange={(e) => setEditingBooking({ ...editingBooking, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)] text-sm"
                >
                  {BOOKING_STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              {editingBooking.farm_day_id ? (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                  Trainer is managed via the Farm Day. Edit the farm day in the Farm Days tab to change the trainer.
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Trainer</label>
                  <select
                    value={editingBooking.trainer_id}
                    onChange={(e) => setEditingBooking({ ...editingBooking, trainer_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)] text-sm"
                  >
                    <option value="">Unassigned</option>
                    {approvedTrainers.map((t) => (
                      <option key={t.id} value={t.id}>{t.full_name}</option>
                    ))}
                  </select>
                </div>
              )}

              {(editingBooking.booking_type === 'behavior_and_home' || editingBooking.booking_type === 'service_and_emotional_support') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Session Address</label>
                  <Input
                    value={editingBooking.location}
                    onChange={(e) => setEditingBooking({ ...editingBooking, location: e.target.value })}
                    placeholder="Enter the home/session address"
                  />
                  <p className="text-xs text-gray-500 mt-1">The trainer will visit this address.</p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                <textarea
                  value={editingBooking.notes}
                  onChange={(e) => setEditingBooking({ ...editingBooking, notes: e.target.value })}
                  placeholder="Any special instructions or notes..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)] text-sm resize-none"
                />
              </div>

              {bookingFormError && (
                <p className="text-sm text-red-600">{bookingFormError}</p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => { setEditingBooking(null); setBookingFormError(null); }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEditBooking}
                className="flex-1 bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)]"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ MODAL: CREATE BOOKING ═══════════════ */}
      {showCreateBooking && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-gray-900 mb-5">New Booking</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Dog <span className="text-red-500">*</span>
                </label>
                <select
                  value={createForm.dog_id}
                  onChange={(e) => setCreateForm({ ...createForm, dog_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)] text-sm"
                >
                  <option value="">Select a dog...</option>
                  {allDogs.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Service Type <span className="text-red-500">*</span>
                </label>
                {dbBookingTypes.length > 0 ? (
                  <div className="space-y-3">
                    {BOOKING_CATEGORIES.map(cat => {
                      const types = dbBookingTypes.filter(t => t.category === cat.value);
                      if (types.length === 0) return null;
                      return (
                        <div key={cat.value}>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{cat.label}</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {types.map(t => {
                              const selected = createForm.booking_type === t.name;
                              return (
                                <button
                                  key={t.id}
                                  type="button"
                                  onClick={() => setCreateForm({ ...createForm, booking_type: t.name })}
                                  className={`flex flex-col px-4 py-3 rounded-lg border-2 text-left transition-colors ${
                                    selected
                                      ? 'border-[rgb(0_32_96)] bg-blue-50 text-[rgb(0_32_96)]'
                                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                                  }`}
                                >
                                  <span className="font-medium text-sm">{t.name}</span>
                                  <span className="text-xs opacity-70 mt-0.5">
                                    {t.duration_minutes} min · R{t.price_per_dog}/dog
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <select
                    value={createForm.booking_type}
                    onChange={(e) => setCreateForm({ ...createForm, booking_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)] text-sm"
                  >
                    <option value="">Choose a service...</option>
                    {BOOKING_CATEGORIES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Farm Day <span className="text-red-500">*</span>
                </label>
                {farmDays.length === 0 ? (
                  <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    No farm days exist. Create one in the Farm Days tab first.
                  </p>
                ) : (
                  <select
                    value={createForm.farm_day_id}
                    onChange={(e) => setCreateForm({ ...createForm, farm_day_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)] text-sm"
                  >
                    <option value="">Select a farm day…</option>
                    {farmDays.map((fd) => (
                      <option key={fd.id} value={fd.id}>
                        {new Date(fd.date + 'T00:00:00').toLocaleDateString('en-ZA', {
                          weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                        })}
                        {fd.trainer_name ? ` · ${fd.trainer_name}` : ''}
                        {fd.max_capacity ? ` (${fd.total_bookings}/${fd.max_capacity})` : ` (${fd.total_bookings} booked)`}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                  placeholder="Any special instructions or notes..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)] text-sm resize-none"
                />
              </div>

              {bookingFormError && (
                <p className="text-sm text-red-600">{bookingFormError}</p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => { setShowCreateBooking(false); setBookingFormError(null); }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateBooking}
                className="flex-1 bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)]"
              >
                Create Booking
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ MODAL: CREATE / EDIT FARM DAY ═══════════════ */}
      {showCreateFarmDay && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-5">
              {editingFarmDay ? 'Edit Farm Day' : 'New Farm Day'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={farmDayForm.date}
                  onChange={(e) => setFarmDayForm({ ...farmDayForm, date: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Assigned Trainer <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <select
                  value={farmDayForm.trainer_id}
                  onChange={(e) => setFarmDayForm({ ...farmDayForm, trainer_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)] text-sm"
                >
                  <option value="">Unassigned</option>
                  {approvedTrainers.map((t) => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Max Capacity <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  value={farmDayForm.max_capacity}
                  onChange={(e) => setFarmDayForm({ ...farmDayForm, max_capacity: e.target.value })}
                  placeholder="Leave blank for unlimited"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
                <textarea
                  value={farmDayForm.notes}
                  onChange={(e) => setFarmDayForm({ ...farmDayForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Internal notes about this farm day…"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)] text-sm resize-none"
                />
              </div>

              {farmDayFormError && (
                <p className="text-sm text-red-600">{farmDayFormError}</p>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => { setShowCreateFarmDay(false); setEditingFarmDay(null); setFarmDayFormError(null); }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveFarmDay}
                className="flex-1 bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)]"
              >
                {editingFarmDay ? 'Save Changes' : 'Create Farm Day'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ MODAL: CREATE TRAINER ═══════════════ */}
      {showCreateTrainer && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-5">Create Trainer</h3>
            <p className="text-sm text-gray-600 mb-4">
              Create a trainer account with a password. Share these credentials securely with the trainer so they can log in.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={createTrainerForm.email}
                  onChange={(e) => setCreateTrainerForm({ ...createTrainerForm, email: e.target.value })}
                  placeholder="trainer@example.com"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Full name <span className="text-red-500">*</span>
                </label>
                <Input
                  value={createTrainerForm.full_name}
                  onChange={(e) => setCreateTrainerForm({ ...createTrainerForm, full_name: e.target.value })}
                  placeholder="Jane Smith"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Temporary password <span className="text-red-500">*</span>{' '}
                  <span className="text-gray-400 font-normal text-xs">(at least 8 characters)</span>
                </label>
                <Input
                  type="password"
                  value={createTrainerForm.password}
                  onChange={(e) => setCreateTrainerForm({ ...createTrainerForm, password: e.target.value })}
                  placeholder="Choose a secure password"
                  className="w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone (optional)</label>
                <Input
                  type="tel"
                  value={createTrainerForm.phone}
                  onChange={(e) => setCreateTrainerForm({ ...createTrainerForm, phone: e.target.value })}
                  placeholder="+27 82 123 4567"
                  className="w-full"
                />
              </div>
              {createTrainerError && (
                <p className="text-sm text-red-600">{createTrainerError}</p>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateTrainer(false);
                  setCreateTrainerError(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateTrainer}
                className="flex-1 bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)]"
              >
                Create Trainer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ MODAL: NEWSLETTER ═══════════════ */}
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
                  onChange={(e) => setNewsletterForm({ ...newsletterForm, title: e.target.value })}
                  placeholder="e.g., Spring 2025 Newsletter"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Summary <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={newsletterForm.content}
                  onChange={(e) => setNewsletterForm({ ...newsletterForm, content: e.target.value })}
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
                    onChange={(e) => setNewsletterForm({ ...newsletterForm, date: e.target.value })}
                  />
                </div>
                <div className="flex items-end pb-0.5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newsletterForm.published}
                      onChange={(e) => setNewsletterForm({ ...newsletterForm, published: e.target.checked })}
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
                      <p className="text-sm font-semibold text-gray-900">{newsletterForm.pendingFile.name}</p>
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
                onClick={() => { setShowNewsletterModal(false); setEditingNewsletter(null); resetNewsletterForm(); }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveNewsletter}
                disabled={uploadingFile}
                className="flex-1 bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)]"
              >
                {uploadingFile ? 'Uploading PDF...' : editingNewsletter ? 'Save Changes' : 'Publish Newsletter'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════ MODAL: EVENT ═══════════════ */}
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
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="e.g., Easter is coming and we are hosting an Easter Egg Hunt for the dogs!..."
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
                    onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Location <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <Input
                    value={eventForm.location}
                    onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                    placeholder="e.g., Main Training Grounds"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer w-fit">
                <input
                  type="checkbox"
                  checked={eventForm.published}
                  onChange={(e) => setEventForm({ ...eventForm, published: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 accent-[rgb(0_32_96)]"
                />
                <span className="text-sm font-medium text-gray-700">Publish immediately</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => { setShowEventModal(false); setEditingEvent(null); resetEventForm(); }}
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
