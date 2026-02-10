'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CalendarIcon, PlusIcon, CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { Booking } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { CreateBookingModal, BookingFormData } from '@/components/CreateBookingModal';
import { getAllDogs, getDogsByOwner } from '@/lib/supabase/dogs';
import { getUsersByRole } from '@/lib/supabase/users';
import { authenticatedGet, authenticatedPost, authenticatedPut } from '@/lib/api/apiClient';
/* ---------------------------------- */
type BookingWithRelations = Booking & {
  dogs?: {
    name?: string;
  };
  trainers?: {
    full_name?: string;
  };
  parents?: {
    full_name?: string;
  };
};


export default function BookingsPage() {
  const { user, loading: authLoading } = useAuth();

  const [bookings, setBookings] = useState<BookingWithRelations[]>([]);

  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dogs, setDogs] = useState<{ id: string; name: string }[]>([]);
  const [trainers, setTrainers] = useState<
    { id: string; name: string; full_name: string }[]
  >([]);

  /* ---------- LOAD BOOKINGS (ADMIN SEES ALL) ---------- */

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      try {
        setLoading(true);

        const res = await authenticatedGet('/api/bookings');

        if (!res.ok) {
          console.error('Failed to fetch bookings');
          setBookings([]);
          return;
        }

        const data = await res.json();

        console.log('✅ BOOKINGS FROM API:', data);

        // IMPORTANT: do NOT filter / normalize / transform
        setBookings(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Error loading bookings', err);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user]);

  /* ---------- LOAD MODAL DATA ---------- */

  useEffect(() => {
    if (!showCreateModal || !user) return;

    const loadModalData = async () => {
      const dogs =
        user.role === 'parent'
          ? await getDogsByOwner(user.id)
          : await getAllDogs();

      setDogs(dogs.map(d => ({ id: d.id, name: d.name })));

      const trainersList = await getUsersByRole('trainer');
      setTrainers(
        trainersList.map(t => ({
          id: t.id,
          name: t.full_name,
          full_name: t.full_name,
        }))
      );
    };

    loadModalData();
  }, [showCreateModal, user]);

  /* ---------- CREATE ---------- */

  const handleCreateBooking = async (data: BookingFormData) => {
    if (!user) return;

    let parentId = user.id;

    if (user.role !== 'parent') {
      const dogs = await getAllDogs();
      const dog = dogs.find(d => d.id === data.dog_id);
      if (!dog) throw new Error('Dog not found');
      parentId = dog.owner_id;
    }

    const res = await authenticatedPost('/api/bookings', { ...data, parent_id: parentId });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Create failed');
    }

    // reload list
    const listRes = await authenticatedGet('/api/bookings');
    const updated = listRes.ok ? await listRes.json() : [];
    setBookings(Array.isArray(updated) ? updated : []);
  };

  /* ---------- APPROVE/REJECT BOOKING ---------- */

  const handleBookingStatusUpdate = async (bookingId: string, status: 'confirmed' | 'cancelled') => {
    try {
      const res = await authenticatedPut('/api/bookings', { id: bookingId, status });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Update failed');
      }

      // Reload bookings
      const listRes = await authenticatedGet('/api/bookings');
      const updated = listRes.ok ? await listRes.json() : [];
      setBookings(Array.isArray(updated) ? updated : []);
    } catch (error) {
      console.error('Error updating booking status:', error);
      alert('Failed to update booking status');
    }
  };

  /* ---------- LOADING ---------- */

  if (authLoading || loading || !user) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin h-12 w-12 border-b-2 border-[rgb(0_32_96)] rounded-full" />
      </div>
    );
  }

  /* ---------- UI ---------- */

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bookings</h1>
          <p className="text-gray-600">
            {user.role === 'admin'
              ? 'All bookings across the system'
              : user.role === 'trainer'
                ? 'Your assigned bookings'
                : 'Your dog bookings'}
          </p>
        </div>
        {(user.role === 'admin' || user.role === 'parent') && (
          <Button onClick={() => setShowCreateModal(true)}>
            <PlusIcon className="h-4 w-4 mr-2" />
            New Booking
          </Button>
        )}
      </div>

      {bookings.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No bookings found</p>
          </CardContent>
        </Card>
      ) : (
        bookings.map(b => (
          <Card key={b.id}>
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-semibold">
                    {b.booking_type.replace('_', ' ')}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {formatDateTime(b.start_time)}
                  </p>
                  <p className="text-xs text-gray-500">
                    Dog: {b.dogs?.name} · Trainer: {b.trainers?.full_name}
                  </p>
                  {user.role === 'admin' && (
                    <p className="text-xs text-gray-500 mt-1">
                      Parent: {b.parents?.full_name}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    b.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    b.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    b.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {b.status}
                  </span>
                  {(user.role === 'admin' || user.role === 'trainer') && b.status === 'pending' && (
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => handleBookingStatusUpdate(b.id, 'confirmed')}
                        title="Approve booking"
                      >
                        <CheckIcon className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleBookingStatusUpdate(b.id, 'cancelled')}
                        title="Reject booking"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <CreateBookingModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSave={handleCreateBooking}
        dogs={dogs}
        trainers={trainers}
      />
    </div>
  );
}
