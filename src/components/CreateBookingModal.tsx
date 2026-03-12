'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { XMarkIcon, CalendarIcon, ClockIcon, UserIcon, DocumentTextIcon, MapPinIcon } from '@heroicons/react/24/outline';

export interface BookingFormData {
  dog_id: string;
  booking_type: string;
  start_time: string;
  end_time: string;
  notes?: string;
  location?: string;
  trainer_id?: string;
  parent_id?: string;
  recurring?: boolean;
  recurring_pattern?: 'weekly' | 'biweekly' | 'monthly';
  recurring_occurrences?: number;
}

interface CreateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bookingData: BookingFormData) => Promise<void>;
  dogs: Array<{ id: string; name: string }>;
  trainers: Array<{ id: string; name: string; full_name?: string }>;
  userRole?: string;
}

const BOOKING_TYPES = [
  { value: 'behavior_and_home', label: 'Behavior and Home' },
  { value: 'academy', label: 'Academy' },
  { value: 'farm', label: 'Farm' },
  { value: 'service_and_emotional_support', label: 'Service & Emotional Support' },
];
/** Format a Date for datetime-local input (local time) */
function toLocalDatetimeLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${day}T${h}:${min}`;
}

export function CreateBookingModal({ isOpen, onClose, onSave, dogs, trainers, userRole }: CreateBookingModalProps) {
  const [formData, setFormData] = useState<BookingFormData>({
    dog_id: '',
    booking_type: '',
    start_time: '',
    end_time: '',
    notes: '',
    location: '',
    trainer_id: '',
    recurring: false,
    recurring_pattern: 'weekly',
    recurring_occurrences: 4,
  });
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      const now = new Date();
      const endTime = new Date(now.getTime() + 60 * 60 * 1000);
      setFormData({
        dog_id: '',
        booking_type: '',
        start_time: toLocalDatetimeLocal(now),
        end_time: toLocalDatetimeLocal(endTime),
        notes: '',
        location: '',
        trainer_id: '',
        recurring: false,
        recurring_pattern: 'weekly',
        recurring_occurrences: 4,
      });
      setErrors({});
    }
  }, [isOpen]);

  useEffect(() => {
    if (formData.start_time && !formData.end_time) {
      const startDate = new Date(formData.start_time);
      const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
      setFormData(prev => ({
        ...prev,
        end_time: endDate.toISOString().slice(0, 16)
      }));
    }
  }, [formData.start_time]);

  const handleInputChange = (field: keyof BookingFormData, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.dog_id) newErrors.dog_id = 'Please select a dog';
    if (!formData.booking_type) newErrors.booking_type = 'Please select a booking type';
    if (!formData.start_time) newErrors.start_time = 'Please select a start time';
    
    if (formData.start_time && formData.end_time) {
      if (new Date(formData.start_time) >= new Date(formData.end_time)) {
        newErrors.end_time = 'End time must be after start time';
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
      // Create a clean payload that matches your API's expected format
      const cleanPayload = {
        ...formData,
        // Ensure end_time is at least start_time if missing
        end_time: formData.end_time || formData.start_time,
        // Explicitly set trainer_id to null if "Any" is selected
        trainer_id: formData.trainer_id || null,
      };

      await onSave(cleanPayload);
      onClose();
    } catch (error: any) {
      console.error('Modal Save Error:', error);
      setErrors({ submit: error.message || 'Failed to create booking' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Create New Booking
              </CardTitle>
              <CardDescription>Schedule a training session for your dog</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
              <XMarkIcon className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Select Dog *</label>
              <select
                value={formData.dog_id}
                onChange={(e) => handleInputChange('dog_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={submitting}
              >
                <option value="">Choose a dog...</option>
                {dogs.map((dog) => (
                  <option key={dog.id} value={dog.id}>{dog.name}</option>
                ))}
              </select>
              {errors.dog_id && <p className="text-sm text-red-600">{errors.dog_id}</p>}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Booking Type *</label>
              <select
                value={formData.booking_type}
                onChange={(e) => handleInputChange('booking_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={submitting}
              >
                <option value="">Choose a service...</option>
                {BOOKING_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
              {errors.booking_type && <p className="text-sm text-red-600">{errors.booking_type}</p>}
            </div>

            {(formData.booking_type === 'behavior_and_home' || formData.booking_type === 'service_and_emotional_support') && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Session Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={formData.location || ''}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="Enter the home/session address"
                    className="pl-9"
                    disabled={submitting}
                  />
                </div>
                <p className="text-xs text-gray-500">The trainer will visit this address for the session.</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Start Time *</label>
                <Input
                  type="datetime-local"
                  value={formData.start_time}
                  onChange={(e) => handleInputChange('start_time', e.target.value)}
                  disabled={submitting}
                />
                {errors.start_time && <p className="text-sm text-red-600">{errors.start_time}</p>}
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">End Time *</label>
                <Input
                  type="datetime-local"
                  value={formData.end_time}
                  onChange={(e) => handleInputChange('end_time', e.target.value)}
                  disabled={submitting}
                />
                {errors.end_time && <p className="text-sm text-red-600">{errors.end_time}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Preferred Trainer (Optional)</label>
              <select
                value={formData.trainer_id || ''}
                onChange={(e) => handleInputChange('trainer_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                disabled={submitting}
              >
                <option value="">Any available trainer</option>
                {trainers.map((trainer) => (
                  <option key={trainer.id} value={trainer.id}>
                    {trainer.full_name || trainer.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={formData.recurring}
                  onChange={(e) => handleInputChange('recurring', e.target.checked)}
                  disabled={submitting}
                  className="rounded border-gray-300 text-[rgb(0_32_96)]"
                />
                <label htmlFor="recurring" className="text-sm font-medium text-gray-700">Make this a recurring booking</label>
              </div>

              {formData.recurring && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Repeat Pattern</label>
                    <select
                      value={formData.recurring_pattern}
                      onChange={(e) => handleInputChange('recurring_pattern', e.target.value as any)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      disabled={submitting}
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Occurrences</label>
                    <Input
                      type="number"
                      value={formData.recurring_occurrences}
                      onChange={(e) => handleInputChange('recurring_occurrences', parseInt(e.target.value) || 1)}
                      disabled={submitting}
                      min="1"
                      max="52"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
              <textarea
                value={formData.notes || ''}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                rows={3}
                disabled={submitting}
                className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none"
              />
            </div>

            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={submitting} className="flex-1 bg-[rgb(0_32_96)] text-white">
                {submitting ? 'Creating...' : 'Create Booking'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}