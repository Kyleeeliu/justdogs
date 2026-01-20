'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  PlusIcon, 
  TrashIcon,
  ClockIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { TrainerAvailability, TrainerException, User } from '@/types';

interface TrainerAvailabilityManagerProps {
  trainer: User;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

export function TrainerAvailabilityManager({ trainer }: TrainerAvailabilityManagerProps) {
  const [availability, setAvailability] = useState<TrainerAvailability[]>([]);
  const [exceptions, setExceptions] = useState<TrainerException[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddAvailability, setShowAddAvailability] = useState(false);
  const [showAddException, setShowAddException] = useState(false);

  // Form states
  const [newAvailability, setNewAvailability] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00'
  });

  const [newException, setNewException] = useState({
    exception_date: '',
    start_time: '',
    end_time: '',
    reason: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load trainer's availability and exceptions
  useEffect(() => {
    loadAvailabilityData();
  }, [trainer.id]);

  const loadAvailabilityData = async () => {
    try {
      setLoading(true);
      
      // Load availability
      const availabilityResponse = await fetch(`/api/trainer-availability?trainer_id=${trainer.id}`);
      if (availabilityResponse.ok) {
        const availabilityData = await availabilityResponse.json();
        setAvailability(availabilityData);
      }

      // Load exceptions
      const exceptionsResponse = await fetch(`/api/trainer-exceptions?trainer_id=${trainer.id}`);
      if (exceptionsResponse.ok) {
        const exceptionsData = await exceptionsResponse.json();
        setExceptions(exceptionsData);
      }
    } catch (error) {
      console.error('Error loading availability data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAvailability = async () => {
    try {
      setSaving(true);
      setErrors({});

      // Validate
      if (newAvailability.start_time >= newAvailability.end_time) {
        setErrors({ time: 'End time must be after start time' });
        return;
      }

      const response = await fetch('/api/trainer-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainer_id: trainer.id,
          ...newAvailability
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        setErrors({ submit: errorData.error || 'Failed to add availability' });
        return;
      }

      const newAvailabilityData = await response.json();
      setAvailability(prev => [...prev, newAvailabilityData]);
      setNewAvailability({ day_of_week: 1, start_time: '09:00', end_time: '17:00' });
      setShowAddAvailability(false);
    } catch (error) {
      setErrors({ submit: 'Failed to add availability' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAvailability = async (id: string) => {
    try {
      const response = await fetch(`/api/trainer-availability?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setAvailability(prev => prev.filter(a => a.id !== id));
      }
    } catch (error) {
      console.error('Error deleting availability:', error);
    }
  };

  const handleAddException = async () => {
    try {
      setSaving(true);
      setErrors({});

      // Validate
      if (!newException.exception_date) {
        setErrors({ date: 'Exception date is required' });
        return;
      }

      if (newException.start_time && newException.end_time && newException.start_time >= newException.end_time) {
        setErrors({ time: 'End time must be after start time' });
        return;
      }

      const response = await fetch('/api/trainer-exceptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          trainer_id: trainer.id,
          ...newException
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        setErrors({ submit: errorData.error || 'Failed to add exception' });
        return;
      }

      const newExceptionData = await response.json();
      setExceptions(prev => [...prev, newExceptionData]);
      setNewException({ exception_date: '', start_time: '', end_time: '', reason: '' });
      setShowAddException(false);
    } catch (error) {
      setErrors({ submit: 'Failed to add exception' });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteException = async (id: string) => {
    try {
      const response = await fetch(`/api/trainer-exceptions?id=${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setExceptions(prev => prev.filter(e => e.id !== id));
      }
    } catch (error) {
      console.error('Error deleting exception:', error);
    }
  };

  const getDayName = (dayOfWeek: number) => {
    return DAYS_OF_WEEK.find(d => d.value === dayOfWeek)?.label || 'Unknown';
  };

  const formatTime = (time: string) => {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(0_32_96)]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Availability Management</h2>
          <p className="text-gray-600">Manage your weekly schedule and time off</p>
        </div>
      </div>

      {/* Weekly Availability */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <CalendarDaysIcon className="h-5 w-5 mr-2" />
            Weekly Availability
          </CardTitle>
          <Button
            onClick={() => setShowAddAvailability(true)}
            className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Time Slot
          </Button>
        </CardHeader>
        <CardContent>
          {availability.length === 0 ? (
            <div className="text-center py-8">
              <CalendarDaysIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No availability set</h3>
              <p className="text-gray-600 mb-4">Add your weekly availability to start accepting bookings</p>
              <Button
                onClick={() => setShowAddAvailability(true)}
                className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Your First Time Slot
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {DAYS_OF_WEEK.map(day => {
                const dayAvailability = availability.filter(a => a.day_of_week === day.value);
                return (
                  <div key={day.value} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{day.label}</h4>
                      {dayAvailability.length === 0 ? (
                        <p className="text-sm text-gray-500">Not available</p>
                      ) : (
                        <div className="space-y-1">
                          {dayAvailability.map(slot => (
                            <div key={slot.id} className="flex items-center justify-between">
                              <span className="text-sm text-gray-600">
                                {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteAvailability(slot.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Availability Form */}
          {showAddAvailability && (
            <div className="mt-6 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium mb-4">Add New Time Slot</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Day</label>
                  <select
                    value={newAvailability.day_of_week}
                    onChange={(e) => setNewAvailability(prev => ({ ...prev, day_of_week: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)]"
                  >
                    {DAYS_OF_WEEK.map(day => (
                      <option key={day.value} value={day.value}>{day.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
                  <Input
                    type="time"
                    value={newAvailability.start_time}
                    onChange={(e) => setNewAvailability(prev => ({ ...prev, start_time: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                  <Input
                    type="time"
                    value={newAvailability.end_time}
                    onChange={(e) => setNewAvailability(prev => ({ ...prev, end_time: e.target.value }))}
                  />
                </div>
              </div>
              {errors.time && <p className="text-red-500 text-sm mt-2">{errors.time}</p>}
              {errors.submit && <p className="text-red-500 text-sm mt-2">{errors.submit}</p>}
              <div className="flex justify-end space-x-3 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddAvailability(false);
                    setErrors({});
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddAvailability}
                  disabled={saving}
                  className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
                >
                  {saving ? 'Adding...' : 'Add Time Slot'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exceptions (Time Off) */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
            Time Off & Exceptions
          </CardTitle>
          <Button
            onClick={() => setShowAddException(true)}
            variant="outline"
            className="border-[rgb(0_32_96)] text-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)] hover:text-white"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Time Off
          </Button>
        </CardHeader>
        <CardContent>
          {exceptions.length === 0 ? (
            <div className="text-center py-8">
              <ClockIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No time off scheduled</h3>
              <p className="text-gray-600">Add exceptions for holidays, vacations, or other unavailable times</p>
            </div>
          ) : (
            <div className="space-y-3">
              {exceptions.map(exception => (
                <div key={exception.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {new Date(exception.exception_date).toLocaleDateString()}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {exception.start_time && exception.end_time
                        ? `${formatTime(exception.start_time)} - ${formatTime(exception.end_time)}`
                        : 'Full day'
                      }
                    </p>
                    {exception.reason && (
                      <p className="text-sm text-gray-500">{exception.reason}</p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDeleteException(exception.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Add Exception Form */}
          {showAddException && (
            <div className="mt-6 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium mb-4">Add Time Off</h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                  <Input
                    type="date"
                    value={newException.exception_date}
                    onChange={(e) => setNewException(prev => ({ ...prev, exception_date: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Start Time (optional - leave empty for full day)
                    </label>
                    <Input
                      type="time"
                      value={newException.start_time}
                      onChange={(e) => setNewException(prev => ({ ...prev, start_time: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      End Time (optional)
                    </label>
                    <Input
                      type="time"
                      value={newException.end_time}
                      onChange={(e) => setNewException(prev => ({ ...prev, end_time: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Reason (optional)</label>
                  <Input
                    type="text"
                    value={newException.reason}
                    onChange={(e) => setNewException(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="e.g., Vacation, Holiday, Personal"
                  />
                </div>
              </div>
              {errors.date && <p className="text-red-500 text-sm mt-2">{errors.date}</p>}
              {errors.time && <p className="text-red-500 text-sm mt-2">{errors.time}</p>}
              {errors.submit && <p className="text-red-500 text-sm mt-2">{errors.submit}</p>}
              <div className="flex justify-end space-x-3 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowAddException(false);
                    setErrors({});
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddException}
                  disabled={saving}
                  className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
                >
                  {saving ? 'Adding...' : 'Add Time Off'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}