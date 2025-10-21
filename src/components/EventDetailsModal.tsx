'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  XMarkIcon,
  CalendarIcon,
  ClockIcon,
  UserIcon,
  MapPinIcon,
  DocumentTextIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  PlayIcon
} from '@heroicons/react/24/outline';
import { Booking, Session, BookingStatus, SessionStatus } from '@/types';

interface EventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    id: string;
    title: string;
    date: Date;
    type: 'booking' | 'session';
    status: string;
    time: string;
    color: string;
  } | null;
  booking?: Booking;
  session?: Session;
  onEdit?: (event: any) => void;
  onDelete?: (eventId: string, type: 'booking' | 'session') => void;
  onStatusChange?: (eventId: string, type: 'booking' | 'session', newStatus: string) => void;
}

export function EventDetailsModal({ 
  isOpen, 
  onClose, 
  event,
  booking,
  session,
  onEdit,
  onDelete,
  onStatusChange
}: EventDetailsModalProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [statusChanging, setStatusChanging] = useState<string | null>(null);

  if (!isOpen || !event) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />;
      case 'confirmed':
      case 'scheduled':
        return <CalendarIcon className="h-5 w-5 text-blue-500" />;
      case 'in_progress':
        return <PlayIcon className="h-5 w-5 text-[rgb(0_32_96)]" />;
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'cancelled':
        return <XCircleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <CalendarIcon className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'confirmed':
      case 'scheduled':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'in_progress':
        return 'text-[rgb(0_32_96)] bg-[rgb(0_32_96)] bg-opacity-10 border-[rgb(0_32_96)]';
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'cancelled':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusOptions = (type: 'booking' | 'session', currentStatus: string) => {
    if (type === 'booking') {
      const bookingStatuses: { value: BookingStatus; label: string }[] = [
        { value: 'pending', label: 'Pending' },
        { value: 'confirmed', label: 'Confirmed' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' }
      ];
      return bookingStatuses.filter(status => status.value !== currentStatus);
    } else {
      const sessionStatuses: { value: SessionStatus; label: string }[] = [
        { value: 'scheduled', label: 'Scheduled' },
        { value: 'in_progress', label: 'In Progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' }
      ];
      return sessionStatuses.filter(status => status.value !== currentStatus);
    }
  };

  const handleDelete = () => {
    if (onDelete && event) {
      onDelete(event.id, event.type);
      setShowDeleteConfirm(false);
      onClose();
    }
  };

  const handleStatusChange = (newStatus: string) => {
    if (onStatusChange && event) {
      setStatusChanging(newStatus);
      onStatusChange(event.id, event.type, newStatus);
      // Reset the loading state after a short delay
      setTimeout(() => {
        setStatusChanging(null);
      }, 1000);
    }
  };

  const handleEdit = () => {
    if (onEdit && event) {
      onEdit(event);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-white/20 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div className="flex items-center space-x-3">
            {getStatusIcon(event.status)}
            <div>
              <CardTitle className="text-xl font-semibold">{event.title}</CardTitle>
              <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(event.status)}`}>
                {event.status.charAt(0).toUpperCase() + event.status.slice(1).replace('_', ' ')}
              </div>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <XMarkIcon className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-3">
              <CalendarIcon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Date</p>
                <p className="text-sm text-gray-600">
                  {booking ? formatDate(booking.start_time) : 
                   session ? formatDate(session.start_time) : 
                   event.date.toLocaleDateString()}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <ClockIcon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Time</p>
                <p className="text-sm text-gray-600">
                  {booking ? `${formatTime(booking.start_time)} - ${formatTime(booking.end_time)}` :
                   session ? `${formatTime(session.start_time)} - ${formatTime(session.end_time)}` :
                   event.time}
                </p>
              </div>
            </div>
          </div>

          {/* Location */}
          {(booking?.location || session) && (
            <div className="flex items-center space-x-3">
              <MapPinIcon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Location</p>
                <p className="text-sm text-gray-600">
                  {booking?.location || 'Training Center'}
                </p>
              </div>
            </div>
          )}

          {/* Special Instructions or Notes */}
          {(booking?.special_instructions || session?.notes) && (
            <div className="flex items-start space-x-3">
              <DocumentTextIcon className="h-5 w-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {booking ? 'Special Instructions' : 'Notes'}
                </p>
                <p className="text-sm text-gray-600">
                  {booking?.special_instructions || session?.notes}
                </p>
              </div>
            </div>
          )}

          {/* Booking Details */}
          {booking && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Booking Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-700">Type</p>
                  <p className="text-gray-600 capitalize">
                    {booking.booking_type.replace('_', ' ')}
                  </p>
                </div>
                {booking.training_level && (
                  <div>
                    <p className="font-medium text-gray-700">Training Level</p>
                    <p className="text-gray-600 capitalize">{booking.training_level}</p>
                  </div>
                )}
                {booking.consult_type && (
                  <div>
                    <p className="font-medium text-gray-700">Consultation Type</p>
                    <p className="text-gray-600 capitalize">{booking.consult_type}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Session Details */}
          {session && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Session Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                {(session.progress_rating || session.behavior_rating) && (
                  <>
                    {session.progress_rating && (
                      <div>
                        <p className="font-medium text-gray-700">Progress Rating</p>
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-3 h-3 rounded-full ${
                                i < session.progress_rating! ? 'bg-yellow-400' : 'bg-gray-200'
                              }`}
                            />
                          ))}
                          <span className="text-gray-600 ml-2">{session.progress_rating}/5</span>
                        </div>
                      </div>
                    )}
                    {session.behavior_rating && (
                      <div>
                        <p className="font-medium text-gray-700">Behavior Rating</p>
                        <div className="flex items-center space-x-1">
                          {[...Array(5)].map((_, i) => (
                            <div
                              key={i}
                              className={`w-3 h-3 rounded-full ${
                                i < session.behavior_rating! ? 'bg-green-400' : 'bg-gray-200'
                              }`}
                            />
                          ))}
                          <span className="text-gray-600 ml-2">{session.behavior_rating}/5</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {/* Status Change */}
          {onStatusChange && (
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Change Status</h4>
              <div className="flex flex-wrap gap-2">
                {getStatusOptions(event.type, event.status).map((status) => (
                  <Button
                    key={status.value}
                    variant="outline"
                    size="sm"
                    onClick={() => handleStatusChange(status.value)}
                    className={`text-xs ${
                      statusChanging === status.value 
                        ? 'bg-[rgb(0_32_96)] text-white border-[rgb(0_32_96)]' 
                        : ''
                    }`}
                    disabled={statusChanging === status.value}
                  >
                    {statusChanging === status.value ? 'Updating...' : status.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-between pt-4 border-t">
            <div className="flex space-x-2">
              {onEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEdit}
                  className="flex items-center space-x-1"
                >
                  <PencilIcon className="h-4 w-4" />
                  <span>Edit</span>
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center space-x-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <TrashIcon className="h-4 w-4" />
                  <span>Delete</span>
                </Button>
              )}
            </div>
            <Button
              variant="outline"
              onClick={onClose}
            >
              Close
            </Button>
          </div>

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 backdrop-blur-md bg-white/20 flex items-center justify-center z-60 p-4">
              <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Confirm Delete</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 mb-4">
                    Are you sure you want to delete this {event.type}? This action cannot be undone.
                  </p>
                  <div className="flex justify-end space-x-3">
                    <Button
                      variant="outline"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleDelete}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
