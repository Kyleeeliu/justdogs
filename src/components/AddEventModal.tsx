'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  MapPinIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { BookingType, TrainingLevel, ConsultType } from '@/types';

interface AddEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (eventData: EventFormData) => void;
  selectedDate?: Date;
  dogs: Array<{ id: string; name: string }>;
  trainers: Array<{ id: string; name: string }>;
}

export interface EventFormData {
  type: 'booking' | 'session';
  dog_id: string;
  trainer_id: string;
  booking_type?: BookingType;
  training_level?: TrainingLevel;
  consult_type?: ConsultType;
  start_time: string;
  end_time: string;
  special_instructions?: string;
  location?: string;
  notes?: string;
}

export function AddEventModal({ 
  isOpen, 
  onClose, 
  onSave, 
  selectedDate,
  dogs,
  trainers 
}: AddEventModalProps) {
  const [formData, setFormData] = useState<EventFormData>({
    type: 'booking',
    dog_id: '',
    trainer_id: '',
    booking_type: 'dog_training',
    start_time: selectedDate ? 
      `${selectedDate.toISOString().split('T')[0]}T09:00` : 
      new Date().toISOString().slice(0, 16),
    end_time: selectedDate ? 
      `${selectedDate.toISOString().split('T')[0]}T10:00` : 
      new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    special_instructions: '',
    location: '',
    notes: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const bookingTypes: { value: BookingType; label: string }[] = [
    { value: 'pet_care', label: 'Pet Care' },
    { value: 'dog_sitting', label: 'Dog Sitting' },
    { value: 'dog_training', label: 'Dog Training' },
    { value: 'private_training', label: 'Private Training' },
    { value: 'consult', label: 'Consultation' }
  ];

  const trainingLevels: { value: TrainingLevel; label: string }[] = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'expert', label: 'Expert' }
  ];

  const consultTypes: { value: ConsultType; label: string }[] = [
    { value: 'behavioral', label: 'Behavioral' },
    { value: 'training', label: 'Training' },
    { value: 'general', label: 'General' }
  ];

  const handleInputChange = (field: keyof EventFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.dog_id) newErrors.dog_id = 'Please select a dog';
    if (!formData.trainer_id) newErrors.trainer_id = 'Please select a trainer';
    if (!formData.start_time) newErrors.start_time = 'Please select a start time';
    if (!formData.end_time) newErrors.end_time = 'Please select an end time';
    
    if (formData.start_time && formData.end_time) {
      const start = new Date(formData.start_time);
      const end = new Date(formData.end_time);
      if (end <= start) {
        newErrors.end_time = 'End time must be after start time';
      }
    }

    if (formData.type === 'booking' && !formData.booking_type) {
      newErrors.booking_type = 'Please select a booking type';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSave(formData);
      onClose();
    }
  };

  const handleClose = () => {
    setFormData({
      type: 'booking',
      dog_id: '',
      trainer_id: '',
      booking_type: 'dog_training',
      start_time: selectedDate ? 
        `${selectedDate.toISOString().split('T')[0]}T09:00` : 
        new Date().toISOString().slice(0, 16),
      end_time: selectedDate ? 
        `${selectedDate.toISOString().split('T')[0]}T10:00` : 
        new Date(Date.now() + 3600000).toISOString().slice(0, 16),
      special_instructions: '',
      location: '',
      notes: ''
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold">Add New Event</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
          >
            <XMarkIcon className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Event Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Event Type
              </label>
              <div className="flex space-x-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="booking"
                    checked={formData.type === 'booking'}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="mr-2"
                  />
                  Booking
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="session"
                    checked={formData.type === 'session'}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="mr-2"
                  />
                  Session
                </label>
              </div>
            </div>

            {/* Dog Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <UserIcon className="h-4 w-4 inline mr-1" />
                Dog *
              </label>
              <select
                value={formData.dog_id}
                onChange={(e) => handleInputChange('dog_id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)] ${
                  errors.dog_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a dog</option>
                {dogs.map(dog => (
                  <option key={dog.id} value={dog.id}>
                    {dog.name}
                  </option>
                ))}
              </select>
              {errors.dog_id && (
                <p className="text-red-500 text-sm mt-1">{errors.dog_id}</p>
              )}
            </div>

            {/* Trainer Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <UserIcon className="h-4 w-4 inline mr-1" />
                Trainer *
              </label>
              <select
                value={formData.trainer_id}
                onChange={(e) => handleInputChange('trainer_id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)] ${
                  errors.trainer_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a trainer</option>
                {trainers.map(trainer => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.name}
                  </option>
                ))}
              </select>
              {errors.trainer_id && (
                <p className="text-red-500 text-sm mt-1">{errors.trainer_id}</p>
              )}
            </div>

            {/* Booking Type (only for bookings) */}
            {formData.type === 'booking' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Booking Type *
                </label>
                <select
                  value={formData.booking_type || ''}
                  onChange={(e) => handleInputChange('booking_type', e.target.value as BookingType)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)] ${
                    errors.booking_type ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  {bookingTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
                {errors.booking_type && (
                  <p className="text-red-500 text-sm mt-1">{errors.booking_type}</p>
                )}
              </div>
            )}

            {/* Training Level (for training bookings) */}
            {formData.type === 'booking' && 
             (formData.booking_type === 'dog_training' || formData.booking_type === 'private_training') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Training Level
                </label>
                <select
                  value={formData.training_level || ''}
                  onChange={(e) => handleInputChange('training_level', e.target.value as TrainingLevel)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)]"
                >
                  <option value="">Select training level</option>
                  {trainingLevels.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Consult Type (for consult bookings) */}
            {formData.type === 'booking' && formData.booking_type === 'consult' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Consultation Type
                </label>
                <select
                  value={formData.consult_type || ''}
                  onChange={(e) => handleInputChange('consult_type', e.target.value as ConsultType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)]"
                >
                  <option value="">Select consultation type</option>
                  {consultTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <CalendarIcon className="h-4 w-4 inline mr-1" />
                  Start Time *
                </label>
                <Input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => handleInputChange('start_time', e.target.value)}
                  className={errors.start_time ? 'border-red-500' : ''}
                />
                {errors.start_time && (
                  <p className="text-red-500 text-sm mt-1">{errors.start_time}</p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <ClockIcon className="h-4 w-4 inline mr-1" />
                  End Time *
                </label>
                <Input
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => handleInputChange('end_time', e.target.value)}
                  className={errors.end_time ? 'border-red-500' : ''}
                />
                {errors.end_time && (
                  <p className="text-red-500 text-sm mt-1">{errors.end_time}</p>
                )}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPinIcon className="h-4 w-4 inline mr-1" />
                Location
              </label>
              <Input
                type="text"
                value={formData.location || ''}
                onChange={(e) => handleInputChange('location', e.target.value)}
                placeholder="e.g., Just Dogs Training Center, Client Home"
              />
            </div>

            {/* Special Instructions (for bookings) */}
            {formData.type === 'booking' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DocumentTextIcon className="h-4 w-4 inline mr-1" />
                  Special Instructions
                </label>
                <textarea
                  value={formData.special_instructions || ''}
                  onChange={(e) => handleInputChange('special_instructions', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)]"
                  placeholder="Any special instructions or notes for this booking..."
                />
              </div>
            )}

            {/* Notes (for sessions) */}
            {formData.type === 'session' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <DocumentTextIcon className="h-4 w-4 inline mr-1" />
                  Notes
                </label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)]"
                  placeholder="Session notes and observations..."
                />
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
              >
                Create Event
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
