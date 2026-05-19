'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { XMarkIcon, CalendarIcon, CheckIcon } from '@heroicons/react/24/outline';
import { authenticatedGet } from '@/lib/api/apiClient';

export interface BookingFormData {
  dog_ids: string[];
  duration_minutes: number;
  duration_type?: 'minutes' | 'days';
  duration_days?: number;
  booking_type: string;
  start_time: string;
  farm_day_id?: string;
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

interface FarmDayOption {
  id: string;
  date: string;
  trainer_name: string | null;
  max_capacity: number | null;
  total_bookings: number;
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
  { value: 'farm', label: 'Farm' },
];

const DURATION_OPTIONS_DAYS = [
  { value: 1, label: '1 day' },
  { value: 2, label: '2 days' },
  { value: 3, label: '3 days' },
  { value: 4, label: '4 days' },
  { value: 5, label: '5 days' },
  { value: 7, label: '1 week' },
  { value: 14, label: '2 weeks' },
  { value: 0, label: 'Custom…' },
];

function formatFarmDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-ZA', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function CreateBookingModal({ isOpen, onClose, onSave, dogs, initialValues }: CreateBookingModalProps) {
  const [dog_ids, setDogIds] = useState<string[]>([]);
  const [booking_type, setBookingType] = useState('');
  const [farm_day_id, setFarmDayId] = useState('');
  const [start_time, setStartTime] = useState('');
  const [durationPresetDays, setDurationPresetDays] = useState(1);
  const [customDays, setCustomDays] = useState(1);
  const [notes, setNotes] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [recurring_pattern, setRecurringPattern] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [recurring_occurrences, setRecurringOccurrences] = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [dbBookingTypes, setDbBookingTypes] = useState<DbBookingType[]>([]);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [farmDays, setFarmDays] = useState<FarmDayOption[]>([]);
  const [loadingFarmDays, setLoadingFarmDays] = useState(false);

  const durationDays = durationPresetDays === 0 ? customDays : durationPresetDays;

  // Load booking types and farm days when modal opens
  useEffect(() => {
    if (!isOpen) return;

    setLoadingTypes(true);
    authenticatedGet('/api/booking-types')
      .then(res => res.json())
      .then(data => setDbBookingTypes(Array.isArray(data) ? data : []))
      .catch(() => setDbBookingTypes([]))
      .finally(() => setLoadingTypes(false));

    setLoadingFarmDays(true);
    authenticatedGet('/api/farm-days?upcoming=true')
      .then(res => res.json())
      .then(data => setFarmDays(Array.isArray(data) ? data : []))
      .catch(() => setFarmDays([]))
      .finally(() => setLoadingFarmDays(false));
  }, [isOpen]);

  // Reset / pre-fill form when modal opens
  useEffect(() => {
    if (!isOpen) return;

    if (initialValues) {
      const initDogIds = initialValues.dog_ids?.length
        ? initialValues.dog_ids
        : initialValues.dog_id
          ? [initialValues.dog_id]
          : [];
      setDogIds(initDogIds);
      setBookingType(initialValues.booking_type || '');
      setFarmDayId(initialValues.farm_day_id || '');
      setStartTime('');
      const dur = initialValues.duration_days ?? 1;
      const preset = DURATION_OPTIONS_DAYS.find(o => o.value === dur && o.value !== 0)?.value ?? 0;
      setDurationPresetDays(preset);
      setCustomDays(preset === 0 ? dur : 1);
      setNotes(initialValues.notes || '');
    } else {
      setDogIds([]);
      setBookingType('');
      setFarmDayId('');
      setStartTime('');
      setDurationPresetDays(1);
      setCustomDays(1);
      setNotes('');
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

  const handleBookingTypeSelect = (typeName: string) => {
    setBookingType(typeName);
    setErrors(p => ({ ...p, booking_type: '' }));
    setDurationPresetDays(1);
  };

  const handleFarmDaySelect = (dayId: string) => {
    setFarmDayId(dayId);
    const day = farmDays.find(d => d.id === dayId);
    if (day) setStartTime(day.date);
    setErrors(p => ({ ...p, farm_day_id: '' }));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (dog_ids.length === 0) e.dog_ids = 'Please select at least one dog';
    if (!booking_type) e.booking_type = 'Please select a booking type';
    if (!farm_day_id) e.farm_day_id = 'Please select a farm day';
    if (durationDays < 1) e.duration = 'Duration must be at least 1 day';
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
        duration_minutes: 0,
        duration_type: 'days',
        duration_days: durationDays,
        booking_type,
        start_time: `${start_time}T00:00:00`,
        farm_day_id: farm_day_id || undefined,
        notes: notes || undefined,
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

  const typesByCategory = CATEGORIES.map(cat => ({
    ...cat,
    types: dbBookingTypes.filter(t => t.category === cat.value),
  })).filter(cat => cat.types.length > 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <Card className="w-full max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="truncate">{initialValues ? 'Duplicate Booking' : 'Create New Booking'}</span>
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                {initialValues ? 'Review the details below — update the farm day to confirm.' : 'Schedule a farm stay'}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} disabled={submitting} className="flex-shrink-0">
              <XMarkIcon className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">

            {/* ── Dog selector ── */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Select Dog(s) <span className="text-red-500">*</span>
              </label>
              {dogs.length === 0 ? (
                <p className="text-sm text-gray-500 italic">No dogs available. Add a dog first.</p>
              ) : (
                <div className="space-y-3">
                  {dogs.map(dog => {
                    const selected = dog_ids.includes(dog.id);
                    return (
                      <div key={dog.id} className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          id={`dog-${dog.id}`}
                          checked={selected}
                          onChange={() => toggleDog(dog.id)}
                          disabled={submitting}
                          className="h-4 w-4 text-[rgb(0_32_96)] focus:ring-[rgb(0_32_96)] border-gray-300 rounded"
                        />
                        <label
                          htmlFor={`dog-${dog.id}`}
                          className="text-sm font-medium text-gray-900 cursor-pointer flex-1"
                        >
                          {dog.name}
                        </label>
                      </div>
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
                              onClick={() => handleBookingTypeSelect(t.name)}
                              disabled={submitting}
                              className={`flex flex-col px-4 py-3 rounded-lg border-2 text-left transition-colors ${
                                selected
                                  ? 'border-[rgb(0_32_96)] bg-blue-50 text-[rgb(0_32_96)]'
                                  : 'border-gray-200 hover:border-gray-300 text-gray-700'
                              }`}
                            >
                              <span className="font-medium text-sm">{t.name}</span>
                              <span className="text-xs opacity-70 mt-0.5">
                                R{t.price_per_dog}/dog
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
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

            {/* ── Farm Day selector ── */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                <CalendarIcon className="inline h-4 w-4 mr-1 text-gray-400" />
                Select Farm Day <span className="text-red-500">*</span>
              </label>
              {loadingFarmDays ? (
                <p className="text-sm text-gray-400 italic">Loading available farm days…</p>
              ) : farmDays.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-700">No upcoming farm days are available yet.</p>
                  <p className="text-xs text-amber-600 mt-1">An admin needs to create farm day slots first.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {farmDays.map(day => {
                    const selected = farm_day_id === day.id;
                    const full = day.max_capacity !== null && day.total_bookings >= day.max_capacity;
                    return (
                      <button
                        key={day.id}
                        type="button"
                        onClick={() => !full && handleFarmDaySelect(day.id)}
                        disabled={submitting || full}
                        className={`w-full flex items-center justify-between px-3 sm:px-4 py-3 rounded-lg border-2 text-left transition-colors min-w-0 ${
                          full
                            ? 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                            : selected
                              ? 'border-[rgb(0_32_96)] bg-blue-50 text-[rgb(0_32_96)]'
                              : 'border-gray-200 hover:border-gray-300 text-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                            selected ? 'bg-[rgb(0_32_96)] border-[rgb(0_32_96)]' : 'border-gray-300'
                          }`}>
                            {selected && <CheckIcon className="h-3 w-3 text-white" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{formatFarmDate(day.date)}</p>
                            {day.trainer_name && (
                              <p className="text-xs opacity-70 truncate">Trainer: {day.trainer_name}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-xs text-right flex-shrink-0 ml-2">
                          {day.max_capacity !== null ? (
                            <span className={full ? 'text-red-500 font-medium' : 'text-gray-500'}>
                              {full ? 'Full' : `${day.total_bookings}/${day.max_capacity}`}
                            </span>
                          ) : (
                            <span className="text-gray-400">{day.total_bookings} booked</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              {errors.farm_day_id && <p className="text-sm text-red-600">{errors.farm_day_id}</p>}
            </div>

            {/* ── Duration ── */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Duration</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DURATION_OPTIONS_DAYS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDurationPresetDays(opt.value)}
                    disabled={submitting}
                    className={`px-2 sm:px-3 py-2 rounded-lg border-2 text-xs sm:text-sm font-medium transition-colors ${
                      durationPresetDays === opt.value
                        ? 'border-[rgb(0_32_96)] bg-blue-50 text-[rgb(0_32_96)]'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {durationPresetDays === 0 && (
                <Input
                  type="number"
                  value={customDays}
                  onChange={e => setCustomDays(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  placeholder="Number of days"
                  disabled={submitting}
                />
              )}
              {errors.duration && <p className="text-sm text-red-600">{errors.duration}</p>}
            </div>

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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-4 sm:pl-6">
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

            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting} className="flex-1 order-2 sm:order-1">
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="flex-1 bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white order-1 sm:order-2">
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
