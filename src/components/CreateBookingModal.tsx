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
  DocumentTextIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { BookingType, TrainingLevel, ConsultType } from '@/types';

interface CreateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bookingData: BookingFormData) => Promise<void>;
  dogs: Array<{ id: string; name: string }>;
  trainers: Array<{ id: string; name: string; full_name: string }>;
}

export interface BookingFormData {
  dog_id: string;
  trainer_id: string;
  booking_type: BookingType;
  training_level?: TrainingLevel;
  consult_type?: ConsultType;
  start_time: string;
  end_time: string;
  special_instructions?: string;
  location?: string;
  is_recurring?: boolean;
  recurrence_type?: 'daily' | 'weekly' | 'biweekly' | 'monthly';
  recurrence_end_date?: string;
  recurrence_count?: number;
}

export function CreateBookingModal({ 
  isOpen, 
  onClose, 
  onSave,
  dogs,
  trainers 
}: CreateBookingModalProps) {
  const [formData, setFormData] = useState<BookingFormData>({
    dog_id: '',
    trainer_id: '',
    booking_type: 'dog_training',
    start_time: new Date().toISOString().slice(0, 16),
    end_time: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
    special_instructions: '',
    location: 'Just Dogs Training Center',
    is_recurring: false,
    recurrence_type: 'weekly',
    recurrence_end_date: '',
    recurrence_count: 4,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const bookingTypes: { value: BookingType; label: string }[] = [
    { value: 'dog_training', label: 'Dog Training' },
    { value: 'private_training', label: 'Private Training' },
    { value: 'consult', label: 'Consultation' },
    { value: 'dog_sitting', label: 'Dog Sitting' },
    { value: 'pet_care', label: 'Pet Care' }
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

  const handleInputChange = (field: keyof BookingFormData, value: string | boolean) => {
    // Handle boolean fields (like is_recurring)
    if (field === 'is_recurring') {
      setFormData(prev => ({ ...prev, [field]: value as boolean }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value as string }));
    }
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.dog_id) newErrors.dog_id = 'Please select a dog';
    if (!formData.start_time) newErrors.start_time = 'Please select a start time';
    if (!formData.end_time) newErrors.end_time = 'Please select an end time';
    if (!formData.booking_type) newErrors.booking_type = 'Please select a booking type';
    
    if (formData.start_time && formData.end_time) {
      const start = new Date(formData.start_time);
      const end = new Date(formData.end_time);
      if (end <= start) {
        newErrors.end_time = 'End time must be after start time';
      }
      if (start < new Date()) {
        newErrors.start_time = 'Start time cannot be in the past';
      }
    }

    // Validate recurring booking fields
    if (formData.is_recurring) {
      if (!formData.recurrence_type) {
        newErrors.recurrence_type = 'Please select a recurrence type';
      }
      if (!formData.recurrence_end_date && !formData.recurrence_count) {
        newErrors.recurrence_end_date = 'Please specify either an end date or number of occurrences';
      }
      if (formData.recurrence_end_date && formData.start_time) {
        const start = new Date(formData.start_time);
        const endDate = new Date(formData.recurrence_end_date);
        if (endDate <= start) {
          newErrors.recurrence_end_date = 'End date must be after start date';
        }
      }
      if (formData.recurrence_count && formData.recurrence_count < 2) {
        newErrors.recurrence_count = 'Recurring bookings must have at least 2 occurrences';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      await onSave(formData);
      // Reset form on success
      setFormData({
        dog_id: '',
        trainer_id: '',
        booking_type: 'dog_training',
        start_time: new Date().toISOString().slice(0, 16),
        end_time: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
        special_instructions: '',
        location: 'Just Dogs Training Center',
        is_recurring: false,
        recurrence_type: 'weekly',
        recurrence_end_date: '',
        recurrence_count: 4,
      });
      setErrors({});
      onClose();
    } catch (error) {
      console.error('Error creating booking:', error);
      setErrors({ submit: error instanceof Error ? error.message : 'Failed to create booking' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setFormData({
      dog_id: '',
      trainer_id: '',
      booking_type: 'dog_training',
      start_time: new Date().toISOString().slice(0, 16),
      end_time: new Date(Date.now() + 3600000).toISOString().slice(0, 16),
      special_instructions: '',
      location: 'Just Dogs Training Center',
      is_recurring: false,
      recurrence_type: 'weekly',
      recurrence_end_date: '',
      recurrence_count: 4,
    });
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold">Create New Booking</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={handleClose}
            className="h-8 w-8 p-0"
            disabled={submitting}
          >
            <XMarkIcon className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Dog Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <UserIcon className="h-4 w-4 inline mr-1" />
                Dog *
              </label>
              <select
                value={formData.dog_id}
                onChange={(e) => handleInputChange('dog_id', e.target.value)}
                disabled={submitting}
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
              {dogs.length === 0 && (
                <p className="text-amber-600 text-sm mt-1">
                  No dogs found. Please add a dog first in the Dogs section.
                </p>
              )}
            </div>

            {/* Booking Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Booking Type *
              </label>
              <select
                value={formData.booking_type}
                onChange={(e) => handleInputChange('booking_type', e.target.value as BookingType)}
                disabled={submitting}
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

            {/* Training Level (for training bookings) */}
            {(formData.booking_type === 'dog_training' || formData.booking_type === 'private_training') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Training Level
                </label>
                <select
                  value={formData.training_level || ''}
                  onChange={(e) => handleInputChange('training_level', e.target.value as TrainingLevel)}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)]"
                >
                  <option value="">Select training level (optional)</option>
                  {trainingLevels.map(level => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Consult Type (for consult bookings) */}
            {formData.booking_type === 'consult' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Consultation Type
                </label>
                <select
                  value={formData.consult_type || ''}
                  onChange={(e) => handleInputChange('consult_type', e.target.value as ConsultType)}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)]"
                >
                  <option value="">Select consultation type (optional)</option>
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
                  disabled={submitting}
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
                  disabled={submitting}
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
                disabled={submitting}
                placeholder="e.g., Just Dogs Training Center, Client Home"
              />
            </div>

            {/* Special Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DocumentTextIcon className="h-4 w-4 inline mr-1" />
                Special Instructions
              </label>
              <textarea
                value={formData.special_instructions || ''}
                onChange={(e) => handleInputChange('special_instructions', e.target.value)}
                disabled={submitting}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)]"
                placeholder="Any special instructions or notes for this booking..."
              />
            </div>

            {/* Recurring Booking Toggle */}
            <div className="border-t pt-4">
              <div className="flex items-center space-x-3 mb-4">
                <input
                  type="checkbox"
                  id="is_recurring"
                  checked={formData.is_recurring || false}
                  onChange={(e) => handleInputChange('is_recurring', e.target.checked)}
                  disabled={submitting}
                  className="h-4 w-4 text-[rgb(0_32_96)] focus:ring-[rgb(0_32_96)] border-gray-300 rounded"
                />
                <label htmlFor="is_recurring" className="flex items-center text-sm font-medium text-gray-700">
                  <ArrowPathIcon className="h-4 w-4 mr-2" />
                  Make this a recurring booking
                </label>
              </div>

              {formData.is_recurring && (
                <div className="space-y-4 pl-7 border-l-2 border-[rgb(0_32_96)]">
                  {/* Recurrence Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Repeat Every
                    </label>
                    <select
                      value={formData.recurrence_type || 'weekly'}
                      onChange={(e) => handleInputChange('recurrence_type', e.target.value)}
                      disabled={submitting}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)] ${
                        errors.recurrence_type ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly (Every 2 weeks)</option>
                      <option value="monthly">Monthly</option>
                    </select>
                    {errors.recurrence_type && (
                      <p className="text-red-500 text-sm mt-1">{errors.recurrence_type}</p>
                    )}
                  </div>

                  {/* Recurrence End Options */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        End Date (Optional)
                      </label>
                      <Input
                        type="date"
                        value={formData.recurrence_end_date || ''}
                        onChange={(e) => {
                          handleInputChange('recurrence_end_date', e.target.value);
                          if (e.target.value) {
                            handleInputChange('recurrence_count', '');
                          }
                        }}
                        disabled={submitting}
                        min={formData.start_time ? formData.start_time.split('T')[0] : undefined}
                        className={errors.recurrence_end_date ? 'border-red-500' : ''}
                      />
                      {errors.recurrence_end_date && (
                        <p className="text-red-500 text-sm mt-1">{errors.recurrence_end_date}</p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Number of Occurrences (Optional)
                      </label>
                      <Input
                        type="number"
                        min="2"
                        max="52"
                        value={formData.recurrence_count || ''}
                        onChange={(e) => {
                          handleInputChange('recurrence_count', e.target.value);
                          if (e.target.value) {
                            handleInputChange('recurrence_end_date', '');
                          }
                        }}
                        disabled={submitting}
                        placeholder="e.g., 4"
                        className={errors.recurrence_count ? 'border-red-500' : ''}
                      />
                      {errors.recurrence_count && (
                        <p className="text-red-500 text-sm mt-1">{errors.recurrence_count}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        Leave empty if using end date
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error message */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
                {errors.submit}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
              >
                {submitting ? 'Creating...' : 'Create Booking'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
