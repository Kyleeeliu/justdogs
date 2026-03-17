'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { XMarkIcon, CalendarIcon, ClockIcon, MapPinIcon, CheckIcon } from '@heroicons/react/24/outline';
import { authenticatedGet } from '@/lib/api/apiClient';

export interface BookingFormData {
  dog_ids: string[];
  duration_minutes: number;
  booking_type: string;
  start_time: string;
  notes?: string;
  location?: string;
  trainer_id?: string;
  parent_id?: string;
  recurring?: boolean;
  recurring_pattern?: 'weekly' | 'biweekly' | 'monthly';
  recurring_occurrences?: number;
}

export interface DbBookingType {
  id: string;
  name: string;
  category: string;
  duration_minutes: number;
  price_per_dog: number;
}

interface CreateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bookingData: BookingFormData) => Promise<void>;
  dogs: Array<{ id: string; name: string }>;
  trainers: Array<{ id: string; name: string; full_name?: string }>;
  userRole?: string;
  initialValues?: Partial<BookingFormData & { dog_id?: string }>;
}

const CATEGORIES = [
  { value: 'behavior_and_home',          label: 'Behaviour & Home' },
  { value: 'academy',                    label: 'Academy' },
  { value: 'farm',                       label: 'Farm' },
  { value: 'service_and_emotional_support', label: 'Service & Emotional Support' },
];

const DURATION_OPTIONS = [
  { value: 40,  label: '40 minutes' },
  { value: 60,  label: '1 hour' },
  { value: 90,  label: '90 minutes' },
  { value: 120, label: '2 hours' },
  { value: 150, label: '2.5 hours' },
  { value: 180, label: '3 hours' },
  { value: 240, label: '4 hours' },
  { value: 0,   label: 'Custom…' },
];

function toLocalDatetimeLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CreateBookingModal({ isOpen, onClose, onSave, dogs, trainers, userRole, initialValues }: CreateBookingModalProps) {
  const [dog_ids, setDogIds] = useState<string[]>([]);
  const [booking_type, setBookingType] = useState('');
  const [start_time, setStartTime] = useState('');
  const [durationPreset, setDurationPreset] = useState(40);
  const [customMinutes, setCustomMinutes] = useState(60);
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState('');
  const [trainer_id, setTrainerId] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [recurring_pattern, setRecurringPattern] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [recurring_occurrences, setRecurringOccurrences] = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [dbBookingTypes, setDbBookingTypes] = useState<DbBookingType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);

  const durationMinutes = durationPreset === 0 ? customMinutes : durationPreset;

  // Load booking types from DB when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setLoadingTypes(true);
    authenticatedGet('/api/booking-types')
      .then(res => res.json())
      .then(data => setDbBookingTypes(Array.isArray(data) ? data : []))
      .catch(() => setDbBookingTypes([]))
      .finally(() => setLoadingTypes(false));
  }, [isOpen]);

  // Reset / pre-fill form when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const now = new Date();
    now.setSeconds(0, 0);

    if (initialValues) {
      // Pre-fill for duplicate
      const initDogIds = initialValues.dog_ids?.length
        ? initialValues.dog_ids
        : initialValues.dog_id
          ? [initialValues.dog_id]
          : [];
      setDogIds(initDogIds);
      setBookingType(initialValues.booking_type || '');
      setStartTime(toLocalDatetimeLocal(now)); // always fresh start time
      const dur = initialValues.duration_minutes ?? 40;
      const preset = DURATION_OPTIONS.find(o => o.value === dur && o.value !== 0)?.value ?? 0;
      setDurationPreset(preset);
      setCustomMinutes(preset === 0 ? dur : 60);
      setNotes(initialValues.notes || '');
      setLocation(initialValues.location || '');
      setTrainerId(initialValues.trainer_id || '');
    } else {
      setDogIds([]);
      setBookingType('');
      setStartTime(toLocalDatetimeLocal(now));
      setDurationPreset(40);
      setCustomMinutes(60);
      setNotes('');
      setLocation('');
      setTrainerId('');
    }
    setRecurring(false);
    setRecurringPattern('weekly');
    setRecurringOccurrences(4);
    setErrors({});
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleDog = (id: string) => {
    setDogIds(prev => prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]);
    if (errors.dog_ids) setErrors(prev => ({ ...prev, dog_ids: '' }));
  };

  const handleBookingTypeSelect = (typeName: string, dur?: number) => {
    setBookingType(typeName);
    setErrors(p => ({ ...p, booking_type: '' }));
    if (dur) {
      const preset = DURATION_OPTIONS.find(o => o.value === dur && o.value !== 0)?.value ?? 0;
      setDurationPreset(preset);
      if (preset === 0) setCustomMinutes(dur);
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (dog_ids.length === 0) e.dog_ids = 'Please select at least one dog';
    if (!booking_type) e.booking_type = 'Please select a booking type';
    if (!start_time) e.start_time = 'Please select a start date and time';
    if (durationMinutes < 5) e.duration = 'Duration must be at least 5 minutes';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    try {
      await onSave({
        dog_ids,
        duration_minutes: durationMinutes,
        booking_type,
        start_time,
        notes: notes || undefined,
        location: location || undefined,
        trainer_id: trainer_id || undefined,
        recurring,
        recurring_pattern,
        recurring_occurrences,
      });
      onClose();
    } catch (err: any) {
      setErrors({ submit: err.message || 'Failed to create booking' });
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Group DB types by category
  const typesByCategory = CATEGORIES.map(cat => ({
    ...cat,
    types: dbBookingTypes.filter(t => t.category === cat.value),
  })).filter(cat => cat.types.length > 0);

  const needsLocation = booking_type === 'behavior_and_home' || booking_type === 'service_and_emotional_support';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {initialValues ? 'Duplicate Booking' : 'Create New Booking'}
              </CardTitle>
              <CardDescription>
                {initialValues ? 'Review the details below — update the start time to confirm.' : 'Schedule a training session'}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting}>
              <XMarkIcon className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">

            {/* ── Dog selector ── */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Select Dog(s) <span className="text-red-500">*</span>
              </label>
              {dogs.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No dogs available. Add a dog first.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {dogs.map(dog => {
                    const selected = dog_ids.includes(dog.id);
                    return (
                      <button
                        key={dog.id}
                        type="button"
                        onClick={() => toggleDog(dog.id)}
                        disabled={submitting}
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border-2 text-left transition-colors ${
                          selected
                            ? 'border-[rgb(0_32_96)] bg-blue-50 text-[rgb(0_32_96)]'
                            : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                          selected ? 'bg-[rgb(0_32_96)] border-[rgb(0_32_96)]' : 'border-gray-300'
                        }`}>
                          {selected && <CheckIcon className="h-3 w-3 text-white" />}
                        </div>
                        <span className="font-medium text-sm">{dog.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
              {errors.dog_ids && <p className="text-sm text-red-600">{errors.dog_ids}</p>}
              {dog_ids.length > 1 && (
                <p className="text-xs text-blue-600 bg-blue-50 px-3 py-2 rounded-md">
                  A separate booking will be created for each selected dog with the same details.
                </p>
              )}
            </div>

            {/* ── Booking type ── */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Booking Type <span className="text-red-500">*</span>
              </label>
              {loadingTypes ? (
                <p className="text-sm text-gray-400 italic">Loading service types…</p>
              ) : dbBookingTypes.length > 0 ? (
                <div className="space-y-3">
                  {typesByCategory.map(cat => (
                    <div key={cat.value}>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{cat.label}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {cat.types.map(t => {
                          const selected = booking_type === t.name;
                          return (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => handleBookingTypeSelect(t.name, t.duration_minutes)}
                              disabled={submitting}
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
                  ))}
                </div>
              ) : (
                /* Fallback if no DB types exist yet */
                <select
                  value={booking_type}
                  onChange={e => { setBookingType(e.target.value); setErrors(p => ({ ...p, booking_type: '' })); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)]"
                  disabled={submitting}
                >
                  <option value="">Choose a service…</option>
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              )}
              {errors.booking_type && <p className="text-sm text-red-600">{errors.booking_type}</p>}
            </div>

            {/* ── Location (conditional) ── */}
            {needsLocation && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Session Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPinIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={location}
                    onChange={e => setLocation(e.target.value)}
                    placeholder="Enter the home/session address"
                    className="pl-9"
                    disabled={submitting}
                  />
                </div>
                <p className="text-xs text-gray-500">The trainer will visit this address for the session.</p>
              </div>
            )}

            {/* ── Start time + Duration ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  <ClockIcon className="inline h-4 w-4 mr-1 text-gray-400" />
                  Start Date & Time <span className="text-red-500">*</span>
                </label>
                <Input
                  type="datetime-local"
                  value={start_time}
                  onChange={e => { setStartTime(e.target.value); setErrors(p => ({ ...p, start_time: '' })); }}
                  disabled={submitting}
                />
                {errors.start_time && <p className="text-sm text-red-600">{errors.start_time}</p>}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Duration</label>
                <select
                  value={durationPreset}
                  onChange={e => { setDurationPreset(Number(e.target.value)); setErrors(p => ({ ...p, duration: '' })); }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)]"
                  disabled={submitting}
                >
                  {DURATION_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                {durationPreset === 0 && (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={5}
                      max={480}
                      value={customMinutes}
                      onChange={e => setCustomMinutes(Math.max(5, Number(e.target.value)))}
                      disabled={submitting}
                      className="w-24"
                    />
                    <span className="text-sm text-gray-600">minutes</span>
                  </div>
                )}
                {errors.duration && <p className="text-sm text-red-600">{errors.duration}</p>}
                {durationMinutes > 0 && start_time && (
                  <p className="text-xs text-gray-500">
                    Ends at {new Date(new Date(start_time).getTime() + durationMinutes * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>

            {/* ── Trainer (admin only) ── */}
            {userRole === 'admin' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Assign Trainer (Optional)</label>
                <select
                  value={trainer_id}
                  onChange={e => setTrainerId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)]"
                  disabled={submitting}
                >
                  <option value="">Any available trainer</option>
                  {trainers.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name || t.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* ── Recurring ── */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="recurring"
                  checked={recurring}
                  onChange={e => setRecurring(e.target.checked)}
                  disabled={submitting}
                  className="rounded border-gray-300 text-[rgb(0_32_96)]"
                />
                <label htmlFor="recurring" className="text-sm font-medium text-gray-700">
                  Make this a recurring booking
                </label>
              </div>
              {recurring && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">Repeat Pattern</label>
                    <select
                      value={recurring_pattern}
                      onChange={e => setRecurringPattern(e.target.value as any)}
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
                      value={recurring_occurrences}
                      onChange={e => setRecurringOccurrences(parseInt(e.target.value) || 1)}
                      disabled={submitting}
                      min="1"
                      max="52"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* ── Notes ── */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={3}
                disabled={submitting}
                placeholder="Any special instructions or notes…"
                className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)]"
              />
            </div>

            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{errors.submit}</p>
              </div>
            )}

            <div className="flex gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="flex-1 bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white">
                {submitting
                  ? 'Creating…'
                  : dog_ids.length > 1
                    ? `Create ${dog_ids.length} Bookings`
                    : 'Create Booking'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
