'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  CalendarIcon,
  ClockIcon,
  UserIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { AvailableSlot, User, Dog, BookingSlotFormData } from '@/types';

interface BookingSlotSelectorProps {
  trainers: User[];
  dogs: Dog[];
  currentUser: User;
  onBookingComplete: (booking: any) => void;
}

export function BookingSlotSelector({ trainers, dogs, currentUser, onBookingComplete }: BookingSlotSelectorProps) {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedDog, setSelectedDog] = useState<string>('');
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [step, setStep] = useState<'date' | 'dog' | 'slots' | 'confirm'>('date');
  const [bookingDetails, setBookingDetails] = useState({
    special_instructions: '',
    location: 'Just Dogs Training Center'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Get minimum date (today)
  const minDate = new Date().toISOString().split('T')[0];

  // Load available slots when date is selected
  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedDate]);

  const loadAvailableSlots = async () => {
    try {
      setLoading(true);
      setAvailableSlots([]);
      
      const response = await fetch(
        `/api/available-slots?date=${selectedDate}&duration_minutes=60`
      );
      
      if (response.ok) {
        const slots = await response.json();
        setAvailableSlots(slots);
      } else {
        const errorData = await response.json();
        setErrors({ slots: errorData.error || 'Failed to load available slots' });
      }
    } catch (error) {
      setErrors({ slots: 'Failed to load available slots' });
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setStep('dog');
    setErrors({});
  };

  const handleDogSelect = (dogId: string) => {
    setSelectedDog(dogId);
    setStep('slots');
    setErrors({});
  };

  const handleSlotSelect = (slot: AvailableSlot) => {
    setSelectedSlot(slot);
    setStep('confirm');
    setErrors({});
  };

  const handleBooking = async () => {
    if (!selectedSlot || !selectedDog) {
      setErrors({ booking: 'Please complete all selections' });
      return;
    }

    try {
      setBooking(true);
      setErrors({});

      const bookingData: BookingSlotFormData = {
        dog_id: selectedDog,
        date: selectedDate,
        start_time: selectedSlot.start_time,
        end_time: selectedSlot.end_time,
        special_instructions: bookingDetails.special_instructions,
        location: bookingDetails.location
      };

      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...bookingData,
          parent_id: currentUser.id,
          booking_type: 'dog_training'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        setErrors({ booking: errorData.error || 'Failed to create booking' });
        return;
      }

      const result = await response.json();
      onBookingComplete(result.booking);
      
      // Reset form
      setSelectedTrainer('');
      setSelectedDate('');
      setSelectedDog('');
      setSelectedSlot(null);
      setAvailableSlots([]);
      setStep('trainer');
      setBookingDetails({ special_instructions: '', location: 'Just Dogs Training Center' });
    } catch (error) {
      setErrors({ booking: 'Failed to create booking' });
    } finally {
      setBooking(false);
    }
  };

  const formatSlotTime = (slot: AvailableSlot) => {
    const start = new Date(slot.start_time);
    const end = new Date(slot.end_time);
    return `${start.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    })} - ${end.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    })}`;
  };

  const getSelectedDogName = () => {
    return dogs.find(d => d.id === selectedDog)?.name || '';
  };

  const resetToStep = (targetStep: typeof step) => {
    setStep(targetStep);
    setErrors({});
    
    if (targetStep === 'trainer') {
      setSelectedTrainer('');
      setSelectedDate('');
      setSelectedDog('');
      setSelectedSlot(null);
      setAvailableSlots([]);
    } else if (targetStep === 'date') {
      setSelectedDate('');
      setSelectedDog('');
      setSelectedSlot(null);
      setAvailableSlots([]);
    } else if (targetStep === 'dog') {
      setSelectedDog('');
      setSelectedSlot(null);
    } else if (targetStep === 'slots') {
      setSelectedSlot(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Book a Training Session</h2>
        <p className="text-gray-600">Select a date and time for your dog's training session</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center space-x-4 mb-6">
        {[
          { key: 'trainer', label: 'Trainer', icon: UserIcon },
          { key: 'date', label: 'Date', icon: CalendarIcon },
          { key: 'dog', label: 'Dog', icon: UserIcon },
          { key: 'slots', label: 'Time', icon: ClockIcon },
          { key: 'confirm', label: 'Confirm', icon: CheckCircleIcon }
        ].map((stepItem, index) => {
          const isActive = step === stepItem.key;
          const isCompleted = ['trainer', 'date', 'dog', 'slots', 'confirm'].indexOf(step) > index;
          const Icon = stepItem.icon;
          
          return (
            <div key={stepItem.key} className="flex items-center">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  isActive
                    ? 'border-[rgb(0_32_96)] bg-[rgb(0_32_96)] text-white'
                    : isCompleted
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-gray-300 text-gray-400'
                }`}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span
                className={`ml-2 text-sm font-medium ${
                  isActive ? 'text-[rgb(0_32_96)]' : isCompleted ? 'text-green-600' : 'text-gray-400'
                }`}
              >
                {stepItem.label}
              </span>
              {index < 4 && <div className="w-8 h-px bg-gray-300 mx-4" />}
            </div>
          );
        })}
      </div>

      {/* Step 1: Select Date */}
      {step === 'date' && (
        <Card>
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-w-md">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Choose a date
              </label>
              <Input
                type="date"
                min={minDate}
                value={selectedDate}
                onChange={(e) => handleDateSelect(e.target.value)}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Dog */}
      {step === 'dog' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Select Your Dog</CardTitle>
            <Button variant="outline" onClick={() => resetToStep('date')}>
              <XMarkIcon className="h-4 w-4 mr-2" />
              Change Date
            </Button>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Date: <span className="font-medium">{new Date(selectedDate).toLocaleDateString()}</span>
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dogs.map(dog => (
                <div
                  key={dog.id}
                  onClick={() => handleDogSelect(dog.id)}
                  className="p-4 border rounded-lg cursor-pointer hover:border-[rgb(0_32_96)] hover:bg-blue-50 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {dog.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{dog.name}</h3>
                      <p className="text-sm text-gray-600">{dog.breed}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Select Time Slot */}
      {step === 'slots' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Available Time Slots</CardTitle>
            <Button variant="outline" onClick={() => resetToStep('dog')}>
              <XMarkIcon className="h-4 w-4 mr-2" />
              Change Dog
            </Button>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Date: <span className="font-medium">{new Date(selectedDate).toLocaleDateString()}</span> • 
                Dog: <span className="font-medium">{getSelectedDogName()}</span>
              </p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(0_32_96)]"></div>
                <span className="ml-2 text-gray-600">Loading available slots...</span>
              </div>
            ) : errors.slots ? (
              <div className="text-center py-8">
                <p className="text-red-600 mb-4">{errors.slots}</p>
                <Button onClick={loadAvailableSlots} variant="outline">
                  Try Again
                </Button>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-8">
                <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No available slots</h3>
                <p className="text-gray-600">No available time slots on the selected date.</p>
                <Button 
                  onClick={() => resetToStep('date')} 
                  className="mt-4"
                  variant="outline"
                >
                  Choose Different Date
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {availableSlots.map((slot, index) => (
                  <div
                    key={index}
                    onClick={() => handleSlotSelect(slot)}
                    className="p-3 border rounded-lg cursor-pointer hover:border-[rgb(0_32_96)] hover:bg-blue-50 transition-colors text-center"
                  >
                    <ClockIcon className="h-6 w-6 mx-auto mb-2 text-[rgb(0_32_96)]" />
                    <p className="font-medium text-gray-900">{formatSlotTime(slot)}</p>
                    <p className="text-sm text-gray-600">60 minutes</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 5: Confirm Booking */}
      {step === 'confirm' && selectedSlot && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Confirm Your Booking</CardTitle>
            <Button variant="outline" onClick={() => resetToStep('slots')}>
              <XMarkIcon className="h-4 w-4 mr-2" />
              Change Time
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Booking Summary */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">Booking Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dog:</span>
                    <span className="font-medium">{getSelectedDogName()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Date:</span>
                    <span className="font-medium">{new Date(selectedDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Time:</span>
                    <span className="font-medium">{formatSlotTime(selectedSlot)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span className="font-medium">60 minutes</span>
                  </div>
                </div>
              </div>

              {/* Additional Details */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location
                  </label>
                  <Input
                    type="text"
                    value={bookingDetails.location}
                    onChange={(e) => setBookingDetails(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Training location"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Special Instructions (Optional)
                  </label>
                  <textarea
                    value={bookingDetails.special_instructions}
                    onChange={(e) => setBookingDetails(prev => ({ ...prev, special_instructions: e.target.value }))}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)]"
                    placeholder="Any special instructions for the trainer..."
                  />
                </div>
              </div>

              {errors.booking && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                  {errors.booking}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => resetToStep('date')}
                >
                  Start Over
                </Button>
                <Button
                  onClick={handleBooking}
                  disabled={booking}
                  className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
                >
                  {booking ? 'Booking...' : 'Confirm Booking'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}