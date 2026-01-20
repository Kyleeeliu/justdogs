'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { BookingSlotSelector } from '@/components/BookingSlotSelector';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExclamationTriangleIcon, CheckCircleIcon, PlusIcon } from '@heroicons/react/24/outline';
import { User, Dog } from '@/types';
import { getUsersByRole } from '@/lib/supabase/users';
import { getDogsByOwner, getAllDogs } from '@/lib/supabase/dogs';

export default function BookSessionPage() {
  const { user, loading: authLoading } = useAuth();
  const [trainers, setTrainers] = useState<User[]>([]);
  const [dogs, setDogs] = useState<Dog[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load trainers
      const trainersData = await getUsersByRole('trainer');
      setTrainers(trainersData);

      // Load dogs based on user role
      let dogsData: Dog[] = [];
      if (user?.role === 'parent') {
        dogsData = await getDogsByOwner(user.id);
      } else if (user?.role === 'admin') {
        dogsData = await getAllDogs();
      }
      setDogs(dogsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookingComplete = (booking: any) => {
    setCompletedBooking(booking);
    setBookingComplete(true);
  };

  const handleBookAnother = () => {
    setBookingComplete(false);
    setCompletedBooking(null);
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(0_32_96)]"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
          <p className="text-gray-600">Please log in to access this page.</p>
        </CardContent>
      </Card>
    );
  }

  if (user.role !== 'parent' && user.role !== 'admin') {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Dog Owner Access Only</h3>
          <p className="text-gray-600">
            This page is only available to dog owners. Trainers can view bookings in the main bookings section.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (trainers.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Trainers Available</h3>
          <p className="text-gray-600">
            There are currently no trainers available for booking. Please contact an administrator.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (dogs.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Dogs Found</h3>
          <p className="text-gray-600 mb-4">
            You need to add a dog to your profile before booking a training session.
          </p>
          <Button 
            onClick={() => window.location.href = '/dashboard/dogs'}
            className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Your Dog
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (bookingComplete && completedBooking) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="text-center py-12">
            <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
            <p className="text-gray-600 mb-6">
              Your training session has been successfully booked.
            </p>
            
            <div className="bg-gray-50 p-6 rounded-lg mb-6 max-w-md mx-auto">
              <h3 className="font-medium text-gray-900 mb-4">Booking Details</h3>
              <div className="space-y-2 text-sm text-left">
                <div className="flex justify-between">
                  <span className="text-gray-600">Booking ID:</span>
                  <span className="font-medium">{completedBooking.id.slice(0, 8)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date & Time:</span>
                  <span className="font-medium">
                    {new Date(completedBooking.start_time).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Duration:</span>
                  <span className="font-medium">60 minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                    {completedBooking.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleBookAnother}
                className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Book Another Session
              </Button>
              <div>
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/dashboard/bookings'}
                >
                  View All Bookings
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <BookingSlotSelector
      trainers={trainers}
      dogs={dogs}
      currentUser={user}
      onBookingComplete={handleBookingComplete}
    />
  );
}