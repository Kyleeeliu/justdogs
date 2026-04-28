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
  MagnifyingGlassIcon,
  CheckIcon,
  XMarkIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MapPinIcon,
  UserIcon,
  UserGroupIcon,
  PlusIcon,
  DocumentDuplicateIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { Booking, BookingStatus, Dog, User } from '@/types';
import { authenticatedGet, authenticatedFetch } from '@/lib/api/apiClient';
import { formatDateTime, formatTime } from '@/lib/utils';
import { getAllDogs, getDogsByOwner } from '@/lib/supabase/dogs';
import { getUsersByRole } from '@/lib/supabase/users';
import { CreateBookingModal, BookingFormData } from '@/components/CreateBookingModal';
import { FarmPhotoUpload } from '@/components/FarmPhotoUpload';

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
  const [showUpcomingOnly, setShowUpcomingOnly] = useState(user?.role === 'parent' ? false : true);
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>(user?.role === 'parent' ? 'today' : 'all');
  const [search, setSearch] = useState('');
  const [expandedBookings, setExpandedBookings] = useState<Set<string>>(new Set());
  const [pageTab, setPageTab] = useState<'bookings' | 'booking-types'>('bookings');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [duplicateValues, setDuplicateValues] = useState<any>(null);
  const [showPhotoUpload, setShowPhotoUpload] = useState<string | null>(null); // booking ID

  // Booking types state (admin only)
  const [bookingTypesList, setBookingTypesList] = useState<Array<{ id: string; name: string; category: string; duration_minutes: number; price_per_dog: number }>>([]);
  const [btForm, setBtForm] = useState<{ id?: string; name: string; category: string; duration_minutes: number | ''; price_per_dog: number | '' } | null>(null);
  const [btSaving, setBtSaving] = useState(false);
  const [btError, setBtError] = useState('');

  const BT_CATEGORIES = [
    { value: 'farm', label: 'Farm' },
  ];

  const loadBookingTypes = async () => {
    try {
      const res = await authenticatedGet('/api/booking-types');
      const data = await res.json();
      setBookingTypesList(Array.isArray(data) ? data : []);
    } catch { setBookingTypesList([]); }
  };

  const handleBtSave = async () => {
    if (!btForm) return;
    setBtError('');
    if (!btForm.name.trim()) {
      setBtError('Name is required');
      return;
    }
    if (!btForm.duration_minutes || Number(btForm.duration_minutes) < 1) {
      setBtError('Duration must be at least 1 minute');
      return;
    }
    setBtSaving(true);
    try {
      const res = await authenticatedFetch('/api/booking-types', {
        method: btForm.id ? 'PUT' : 'POST',
        body: JSON.stringify({
          id: btForm.id,
          name: btForm.name.trim(),
          category: btForm.category,
          duration_minutes: Number(btForm.duration_minutes),
          price_per_dog: Number(btForm.price_per_dog) || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setBtError(data.error || 'Failed to save');
        setBtSaving(false);
        return;
      }
      await loadBookingTypes();
      setBtForm(null);
    } catch (err: any) {
      setBtError(err.message || 'Failed to save booking type');
    }
    setBtSaving(false);
  };

  const handleBtDelete = async (id: string) => {
    if (!confirm('Remove this booking type?')) return;
    await authenticatedFetch(`/api/booking-types?id=${id}`, { method: 'DELETE' });
    await loadBookingTypes();
  };
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [trainers, setTrainers] = useState<User[]>([]);
  const [showTrainerAssignment, setShowTrainerAssignment] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState<string | null>(null); // booking id being edited
  const [notesInput, setNotesInput] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

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
    // Server already filtered by role, so use all returned bookings
    // Use joined data from API response (dogs/trainers/parents) to avoid separate RLS-prone calls
    const bookingsWithDetails: BookingWithDetails[] = (Array.isArray(data) ? data : []).map((b: any) => ({
      ...b,
      dog: b.dogs ? { id: b.dog_id, name: b.dogs.name, breed: b.dogs.breed } : undefined,
      trainer: b.trainers ? { id: b.trainer_id, full_name: b.trainers.full_name } : undefined,
      parent: b.parents ? { id: b.parent_id, full_name: b.parents.full_name } : undefined,
    }));

    console.log('📊 Bookings with details:', bookingsWithDetails.length);
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
    if (user?.role === 'admin') loadBookingTypes();
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

  // Create booking(s) — one per dog, end_time computed from duration
  const handleCreateBooking = async (formData: BookingFormData) => {
    const endTime = new Date(
      new Date(formData.start_time).getTime() + formData.duration_minutes * 60_000
    ).toISOString();

    // Build one payload per selected dog
    const payloads = formData.dog_ids.map(dogId => {
      const dog = dogs.find(d => d.id === dogId);
      return {
        dog_id: dogId,
        booking_type: formData.booking_type,
        start_time: formData.start_time,
        end_time: endTime,
        notes: formData.notes,
        location: formData.location,
        trainer_id: formData.trainer_id || null,
        parent_id: dog?.owner_id || user?.id,
        recurring: formData.recurring,
        recurring_pattern: formData.recurring_pattern,
        recurring_occurrences: formData.recurring_occurrences,
      };
    });

    const errors: string[] = [];
    for (const payload of payloads) {
      const res = await authenticatedFetch('/api/bookings', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: 'Server error' }));
        errors.push(errData.error || 'Failed to create booking');
      }
    }

    if (errors.length > 0) throw new Error(errors.join('; '));

    setShowCreateModal(false);
    await loadBookings();
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
    alert('Failed to update booking status: ' + (error instanceof Error ? error.message : String(error)));
  }
};

  // Handle trainer assignment for pending bookings
  const handleTrainerAssignment = async (bookingId: string, trainerId: string) => {
    await handleBookingStatusUpdate(bookingId, 'confirmed', trainerId);
  };

  // Save trainer notes
  const handleSaveTrainerNotes = async (bookingId: string) => {
    setSavingNotes(true);
    try {
      const res = await authenticatedFetch('/api/bookings', {
        method: 'PUT',
        body: JSON.stringify({ id: bookingId, trainer_notes: notesInput }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save notes');
      }
      setBookings(prev => prev.map(b =>
        b.id === bookingId ? { ...b, trainer_notes: notesInput } : b
      ));
      setEditingNotes(null);
    } catch (err: any) {
      alert('Failed to save notes: ' + err.message);
    } finally {
      setSavingNotes(false);
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

  // Past = session has ended (use end_time or start_time)
  const isPast = (b: BookingWithDetails) => {
    const end = b.end_time ? new Date(b.end_time) : new Date(b.start_time);
    return end < new Date();
  };
  const isCompletedOrPast = (b: BookingWithDetails) =>
    b.status === 'completed' || (isPast(b) && b.status !== 'cancelled');

  // Filter bookings
  const now = new Date();
  const filteredBookings = bookings.filter(b => {
    // Upcoming-only toggle: hide past bookings (skip when on Completed tab so past sessions show)
    if (showUpcomingOnly && filter !== 'completed' && isPast(b)) return false;

    // Status filter: "completed" tab = all past sessions + explicitly completed
    if (filter === 'completed') {
      if (!isCompletedOrPast(b)) return false;
    } else if (filter !== 'all' && b.status !== filter) return false;

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

  // Sort dates (completed tab: most recent first; others: soonest first)
  const sortedDates = Object.keys(groupedBookings).sort((a, b) => {
    const diff = new Date(a).getTime() - new Date(b).getTime();
    return filter === 'completed' ? -diff : diff;
  });

  // Statistics (completed = explicitly completed or past and not cancelled)
  const stats = {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'pending').length,
    confirmed: bookings.filter(b => b.status === 'confirmed').length,
    upcoming: bookings.filter(b => new Date(b.start_time) > new Date() && b.status !== 'cancelled').length,
    completed: bookings.filter(b => isCompletedOrPast(b)).length,
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
        <div className="flex gap-2">
          {pageTab === 'bookings' && (user?.role === 'admin' || (user?.role === 'parent' && user?.verification_status === 'verified')) && (
            <Button onClick={() => setShowCreateModal(true)} className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)]">
              <PlusIcon className="h-4 w-4 mr-2" />
              New Booking
            </Button>
          )}
          {pageTab === 'booking-types' && user?.role === 'admin' && !btForm && (
            <Button onClick={() => { setBtForm({ name: '', category: 'academy', duration_minutes: '', price_per_dog: '' }); setBtError(''); }} className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)]">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Booking Type
            </Button>
          )}
        </div>
      </div>

      {/* Admin tabs */}
      {user?.role === 'admin' && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex gap-6">
            {([
              { id: 'bookings', label: 'Bookings' },
              { id: 'booking-types', label: 'Booking Types' },
            ] as const).map(tab => (
              <button
                key={tab.id}
                onClick={() => setPageTab(tab.id)}
                className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
                  pageTab === tab.id
                    ? 'border-[rgb(0_32_96)] text-[rgb(0_32_96)]'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* ── Booking Types management (admin only) ── */}
      {pageTab === 'booking-types' && user?.role === 'admin' && (
        <div className="space-y-4">
          {btForm && (
            <Card className="border-2 border-[rgb(0_32_96)]">
              <CardContent className="p-5 space-y-4">
                <h2 className="font-semibold text-gray-900">{btForm.id ? 'Edit Booking Type' : 'New Booking Type'}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></label>
                    <Input placeholder="e.g. Dog Jog, Swim & Gym" value={btForm.name} onChange={e => setBtForm(f => f ? { ...f, name: e.target.value } : f)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                    <select
                      value={btForm.category}
                      onChange={e => setBtForm(f => f ? { ...f, category: e.target.value } : f)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)]"
                    >
                      {BT_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes) <span className="text-red-500">*</span></label>
                    <Input type="number" min={1} placeholder="e.g. 60" value={btForm.duration_minutes}
                      onChange={e => setBtForm(f => f ? { ...f, duration_minutes: e.target.value === '' ? '' : Number(e.target.value) } : f)} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Price per Dog (R - Rand)</label>
                    <Input type="number" min={0} step={0.01} placeholder="e.g. 35.00" value={btForm.price_per_dog}
                      onChange={e => setBtForm(f => f ? { ...f, price_per_dog: e.target.value === '' ? '' : Number(e.target.value) } : f)} />
                  </div>
                </div>
                {btError && <p className="text-sm text-red-600">{btError}</p>}
                <div className="flex gap-3 pt-1">
                  <Button variant="outline" onClick={() => { setBtForm(null); setBtError(''); }} disabled={btSaving}>Cancel</Button>
                  <Button onClick={handleBtSave} disabled={btSaving} className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white">
                    {btSaving ? 'Saving…' : btForm.id ? 'Save Changes' : 'Add Booking Type'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {bookingTypesList.length === 0 && !btForm ? (
            <Card>
              <CardContent className="p-10 text-center text-gray-500">
                <p className="font-medium mb-1">No booking types yet</p>
                <p className="text-sm">Click "Add Booking Type" above to create your first one.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {BT_CATEGORIES.map(cat => {
                const types = bookingTypesList.filter(t => t.category === cat.value);
                if (types.length === 0) return null;
                return (
                  <div key={cat.value}>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{cat.label}</p>
                    <div className="grid gap-2">
                      {types.map(t => (
                        <Card key={t.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="p-4 flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-gray-900">{t.name}</p>
                              <p className="text-sm text-gray-500 mt-0.5">{t.duration_minutes} min · R{Number(t.price_per_dog).toFixed(2)} per dog</p>
                            </div>
                            <div className="flex gap-2">
                              <Button variant="outline" size="sm"
                                onClick={() => { setBtForm({ id: t.id, name: t.name, category: t.category, duration_minutes: t.duration_minutes, price_per_dog: t.price_per_dog }); setBtError(''); }}>
                                <PencilIcon className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-600 hover:bg-red-50"
                                onClick={() => handleBtDelete(t.id)}>
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Everything below only shows on the Bookings tab */}
      {pageTab !== 'booking-types' && (<>

      {/* Statistics Cards - Only for trainers and admins */}
      {user?.role !== 'parent' && (
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
      )}

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
        <div className="flex gap-2 flex-wrap items-center">
          {/* Date filter for parents */}
          {user?.role === 'parent' && (
            <>
              <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
                <Button
                  size="sm"
                  variant={dateFilter === 'today' ? 'default' : 'ghost'}
                  onClick={() => setDateFilter('today')}
                  className={dateFilter === 'today' ? 'bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)]' : ''}
                >
                  Today
                </Button>
                <Button
                  size="sm"
                  variant={dateFilter === 'week' ? 'default' : 'ghost'}
                  onClick={() => setDateFilter('week')}
                  className={dateFilter === 'week' ? 'bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)]' : ''}
                >
                  This Week
                </Button>
                <Button
                  size="sm"
                  variant={dateFilter === 'month' ? 'default' : 'ghost'}
                  onClick={() => setDateFilter('month')}
                  className={dateFilter === 'month' ? 'bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)]' : ''}
                >
                  This Month
                </Button>
                <Button
                  size="sm"
                  variant={dateFilter === 'all' ? 'default' : 'ghost'}
                  onClick={() => setDateFilter('all')}
                  className={dateFilter === 'all' ? 'bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)]' : ''}
                >
                  All
                </Button>
              </div>
              <span className="text-gray-300 hidden sm:inline">|</span>
            </>
          )}
          
          {/* Upcoming toggle for trainers/admins */}
          {user?.role !== 'parent' && (
            <>
              <Button
                size="sm"
                variant={showUpcomingOnly ? 'default' : 'outline'}
                onClick={() => setShowUpcomingOnly(v => !v)}
                className={showUpcomingOnly ? 'bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)]' : ''}
              >
                Upcoming
              </Button>
              <span className="text-gray-300 hidden sm:inline">|</span>
            </>
          )}
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
                : showUpcomingOnly
                  ? 'No upcoming bookings. Toggle "Upcoming" off to see past bookings.'
                  : `You don't have any bookings yet`}
            </p>
            {(user?.role === 'admin' || (user?.role === 'parent' && user?.verification_status === 'verified')) && !search && filter === 'all' && (
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
                          className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => toggleExpand(booking.id)}
                        >
                          <div className="flex items-start gap-3">
                            {/* Status icon */}
                            <div className={`p-2 rounded-lg flex-shrink-0 ${statusConfig.bg}`}>
                              <StatusIcon className={`h-5 w-5 ${statusConfig.color}`} />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              {/* Title row: type + badge */}
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h3 className="font-semibold text-gray-900 capitalize">
                                  {booking.booking_type.replace(/_/g, ' ')}
                                </h3>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${statusConfig.badge}`}>
                                  {booking.status}
                                </span>
                              </div>

                              {/* Metadata: stacks on mobile, inline on sm+ */}
                              <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:gap-x-4 sm:gap-y-1 text-sm text-gray-600">
                                {/* Farm bookings show duration in days, not times */}
                                {(booking as any).duration_type === 'days' ? (
                                  <div className="flex items-center gap-1">
                                    <CalendarIcon className="h-4 w-4 flex-shrink-0" />
                                    <span>{(booking as any).duration_days} day{(booking as any).duration_days !== 1 ? 's' : ''}</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    <ClockIcon className="h-4 w-4 flex-shrink-0" />
                                    <span>{formatTime(booking.start_time)} – {formatTime(booking.end_time)}</span>
                                  </div>
                                )}
                                {booking.dog && (
                                  <div className="flex items-center gap-1">
                                    <UserIcon className="h-4 w-4 flex-shrink-0" />
                                    <span className="truncate">{booking.dog.name}</span>
                                  </div>
                                )}
                                {booking.parent && (user?.role === 'admin' || user?.role === 'trainer') && (
                                  <div className="flex items-center gap-1">
                                    <UserGroupIcon className="h-4 w-4 flex-shrink-0" />
                                    <span className="truncate">{booking.parent.full_name}</span>
                                  </div>
                                )}
                                {booking.trainer && user?.role !== 'trainer' && (
                                  <div className="flex items-center gap-1">
                                    <UserGroupIcon className="h-4 w-4 flex-shrink-0" />
                                    <span className="truncate">{booking.trainer.full_name}</span>
                                  </div>
                                )}
                                {booking.location && (
                                  <div className="flex items-center gap-1">
                                    <MapPinIcon className="h-4 w-4 flex-shrink-0" />
                                    <span className="truncate">{booking.location}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Right actions + chevron */}
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {(user?.role === 'admin' || (user?.role === 'parent' && user?.verification_status === 'verified')) && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0 text-[rgb(0_32_96)] hover:bg-blue-50 border-gray-200"
                                  title="Duplicate booking"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const dur = Math.round(
                                      (new Date(booking.end_time).getTime() - new Date(booking.start_time).getTime()) / 60000
                                    );
                                    setDuplicateValues({
                                      dog_id: booking.dog_id,
                                      booking_type: booking.booking_type,
                                      duration_minutes: dur,
                                      notes: booking.notes,
                                      location: booking.location,
                                      trainer_id: booking.trainer_id,
                                    });
                                    setShowCreateModal(true);
                                  }}
                                >
                                  <DocumentDuplicateIcon className="h-4 w-4" />
                                </Button>
                              )}
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
                                  {booking.parent && (user?.role === 'admin' || user?.role === 'trainer') && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Owner:</span>
                                      <span className="font-medium text-gray-900">{booking.parent.full_name}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                            {booking.location && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                                  <MapPinIcon className="h-4 w-4" /> Session Address
                                </h4>
                                <p className="text-sm text-gray-600 bg-white p-3 rounded border border-gray-200">
                                  {booking.location}
                                </p>
                              </div>
                            )}
                            {(booking.notes || booking.special_instructions) && (
                              <div>
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
                                <p className="text-sm text-gray-600 bg-white p-3 rounded border border-gray-200">
                                  {booking.notes || booking.special_instructions}
                                </p>
                              </div>
                            )}
                            {/* Trainer feedback - hide section for parents if no feedback */}
                            {(booking.trainer_notes || user?.role === 'trainer' || user?.role === 'admin') && (
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-base font-semibold text-gray-900">Trainer Feedback</h4>
                                {(user?.role === 'trainer' || user?.role === 'admin') && editingNotes !== booking.id && (
                                  <button
                                    onClick={() => { setEditingNotes(booking.id); setNotesInput(booking.trainer_notes || ''); }}
                                    className="text-sm font-medium text-[rgb(0_32_96)] hover:underline"
                                  >
                                    {booking.trainer_notes ? 'Edit' : '+ Add feedback'}
                                  </button>
                                )}
                              </div>

                              {(user?.role === 'trainer' || user?.role === 'admin') && editingNotes === booking.id ? (
                                <div className="space-y-2">
                                  <textarea
                                    value={notesInput}
                                    onChange={e => setNotesInput(e.target.value)}
                                    rows={4}
                                    placeholder="Write your session notes here…"
                                    className="w-full px-3 py-2 text-base border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)] text-gray-900"
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <Button size="sm" variant="outline" onClick={() => setEditingNotes(null)} disabled={savingNotes}>
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
                                      onClick={() => handleSaveTrainerNotes(booking.id)}
                                      disabled={savingNotes}
                                    >
                                      {savingNotes ? 'Saving…' : 'Save'}
                                    </Button>
                                  </div>
                                </div>
                              ) : booking.trainer_notes ? (
                                <p className="text-base font-medium text-gray-900 bg-white p-4 rounded-lg border-2 border-gray-300 whitespace-pre-wrap break-words leading-relaxed overflow-wrap-anywhere">
                                  {booking.trainer_notes}
                                </p>
                              ) : (
                                <p className="text-sm text-gray-400 italic">
                                  No feedback added yet.
                                </p>
                              )}
                              </div>
                            )}

                            {/* Farm Photo Upload (trainers/admins only) */}
                            {(user?.role === 'trainer' || user?.role === 'admin') && (
                              <div>
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-base font-semibold text-gray-900">Farm Photos</h4>
                                  <Button
                                    size="sm"
                                    onClick={() => setShowPhotoUpload(booking.id)}
                                    className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
                                  >
                                    <PhotoIcon className="h-4 w-4 mr-2" />
                                    Upload Photo
                                  </Button>
                                </div>
                                <p className="text-sm text-gray-500">Upload photos from this farm booking to share with the parent</p>
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

      </>)}

      {/* Farm Photo Upload Modal */}
      {showPhotoUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <FarmPhotoUpload
              bookingId={showPhotoUpload}
              availableDogs={dogs}
              onUploadComplete={() => {
                setShowPhotoUpload(null);
                // Optionally reload bookings to show updated photo count
              }}
              onClose={() => setShowPhotoUpload(null)}
            />
          </div>
        </div>
      )}

      {/* Create Booking Modal */}
      {user && (
        <CreateBookingModal
          isOpen={showCreateModal}
          onClose={() => { setShowCreateModal(false); setDuplicateValues(null); }}
          onSave={handleCreateBooking}
          dogs={dogs.map(d => ({ id: d.id, name: d.name }))}
          trainers={trainers.map(t => ({ id: t.id, name: t.full_name, full_name: t.full_name }))}
          userRole={user.role}
          initialValues={duplicateValues ?? undefined}
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