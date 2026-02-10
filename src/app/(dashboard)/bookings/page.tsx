'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CalendarIcon, PlusIcon, CheckIcon, XMarkIcon, 
  UserIcon, ClockIcon, MapPinIcon 
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { formatDateTime } from '@/lib/utils';
import { CreateBookingModal, BookingFormData } from '@/components/CreateBookingModal';
import { getAllDogs, getDogsByOwner } from '@/lib/supabase/dogs';
import { getUsersByRole } from '@/lib/supabase/users';
import { authenticatedFetch, authenticatedGet } from '@/lib/api/apiClient';

export default function BookingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [dogs, setDogs] = useState<any[]>([]);
  const [trainers, setTrainers] = useState<any[]>([]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await authenticatedGet('/api/bookings');
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
      }
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  useEffect(() => {
    if (!showCreateModal || !user) return;
    const loadModalData = async () => {
      const dogsData = user.role === 'parent' ? await getDogsByOwner(user.id) : await getAllDogs();
      setDogs(dogsData.map(d => ({ id: d.id, name: d.name, owner_id: d.owner_id })));
      
      const trainersList = await getUsersByRole('trainer');
      setTrainers(trainersList.map(t => ({ id: t.id, name: t.full_name })));
    };
    loadModalData();
  }, [showCreateModal, user]);

  const handleCreateBooking = async (formData: BookingFormData) => {
    const selectedDog = dogs.find(d => d.id === formData.dog_id);
    const payload = {
      ...formData,
      parent_id: selectedDog?.owner_id || user?.id,
      status: formData.trainer_id ? 'confirmed' : 'pending'
    };

    const res = await authenticatedFetch('/api/bookings', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      setShowCreateModal(false);
      loadData();
    } else {
      alert("Failed to create booking");
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const res = await authenticatedFetch('/api/bookings', {
      method: 'PUT',
      body: JSON.stringify({ id, status }),
    });
    if (res.ok) loadData();
  };

  if (authLoading || loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Bookings</h1>
        <Button onClick={() => setShowCreateModal(true)}>
          <PlusIcon className="h-4 w-4 mr-2" /> New Booking
        </Button>
      </div>

      <div className="grid gap-4">
        {bookings.length === 0 ? (
          <p className="text-gray-500 italic">No bookings found.</p>
        ) : (
          bookings.map((b) => (
            <Card key={b.id} className="overflow-hidden">
              <CardContent className="p-6">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-lg capitalize">{b.booking_type.replace('_', ' ')}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        b.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {b.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 flex items-center gap-4">
                      <span className="flex items-center gap-1"><ClockIcon className="h-4 w-4"/> {formatDateTime(b.start_time)}</span>
                      <span className="flex items-center gap-1"><UserIcon className="h-4 w-4"/> Dog: {b.dogs?.name}</span>
                    </div>
                    {user.role === 'admin' && (
                       <p className="text-xs text-gray-400">Owner: {b.parents?.full_name || 'Unknown'}</p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    {user.role === 'admin' && b.status === 'pending' && (
                      <>
                        <Button size="sm" variant="outline" className="text-green-600" onClick={() => updateStatus(b.id, 'confirmed')}>
                          <CheckIcon className="h-4 w-4 mr-1"/> Approve
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600" onClick={() => updateStatus(b.id, 'cancelled')}>
                          <XMarkIcon className="h-4 w-4 mr-1"/> Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

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