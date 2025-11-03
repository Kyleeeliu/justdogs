'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CalendarIcon, 
  ClockIcon, 
  UserIcon, 
  MapPinIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { getServiceColor, getServiceIcon, getServiceDisplayName, formatPrice } from '@/lib/services';

interface Session {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  duration: number;
  trainer: {
    id: string;
    name: string;
    email: string;
  };
  dog: {
    id: string;
    name: string;
    breed: string;
  };
  parent: {
    id: string;
    name: string;
    email: string;
  };
  location: string;
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled';
  service_type: 'pet_care' | 'dog_sitting' | 'dog_training' | 'private_training' | 'consult';
  training_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  consult_type?: 'behavioral' | 'training' | 'general';
  price: number; // in ZAR cents
  notes?: string;
  created_at: string;
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'scheduled' | 'in-progress' | 'completed' | 'cancelled'>('all');

  // Mock data for development
  useEffect(() => {
    const mockSessions: Session[] = [
      {
        id: '1',
        title: 'Basic Obedience Training',
        description: 'Focus on sit, stay, come commands',
        date: '2024-01-15',
        time: '09:00',
        duration: 60,
        trainer: {
          id: '1',
          name: 'Sarah Johnson',
          email: 'sarah@justdogs.co.za'
        },
        dog: {
          id: '1',
          name: 'Max',
          breed: 'Golden Retriever'
        },
        parent: {
          id: '1',
          name: 'John Smith',
          email: 'john@example.com'
        },
        location: 'Training Center - Room A',
        status: 'completed',
        service_type: 'dog_training',
        training_level: 'beginner',
        price: 25000, // R250.00
        notes: 'Max responded well to positive reinforcement. Continue practicing at home.',
        created_at: '2024-01-10T10:00:00Z'
      },
      {
        id: '2',
        title: 'Advanced Agility Training',
        description: 'Obstacle course training and speed work',
        date: '2024-01-20',
        time: '14:00',
        duration: 90,
        trainer: {
          id: '2',
          name: 'Mike Wilson',
          email: 'mike@justdogs.co.za'
        },
        dog: {
          id: '2',
          name: 'Luna',
          breed: 'Border Collie'
        },
        parent: {
          id: '2',
          name: 'Emma Davis',
          email: 'emma@example.com'
        },
        location: 'Outdoor Training Area',
        status: 'scheduled',
        service_type: 'dog_training',
        training_level: 'advanced',
        price: 25000, // R250.00
        created_at: '2024-01-12T14:30:00Z'
      },
      {
        id: '3',
        title: 'Behavioral Consultation',
        description: 'Addressing separation anxiety and barking issues',
        date: '2024-01-18',
        time: '11:00',
        duration: 45,
        trainer: {
          id: '1',
          name: 'Sarah Johnson',
          email: 'sarah@justdogs.co.za'
        },
        dog: {
          id: '3',
          name: 'Buddy',
          breed: 'Labrador Retriever'
        },
        parent: {
          id: '3',
          name: 'Lisa Brown',
          email: 'lisa@example.com'
        },
        location: 'Consultation Room',
        status: 'in-progress',
        service_type: 'consult',
        consult_type: 'behavioral',
        price: 30000, // R300.00
        notes: 'Initial assessment completed. Developing behavior modification plan.',
        created_at: '2024-01-14T09:15:00Z'
      },
      {
        id: '4',
        title: 'Pet Care Session',
        description: 'Daily feeding, walking, and attention',
        date: '2024-01-16',
        time: '08:00',
        duration: 60,
        trainer: {
          id: '3',
          name: 'Alex Chen',
          email: 'alex@justdogs.co.za'
        },
        dog: {
          id: '4',
          name: 'Rocky',
          breed: 'German Shepherd'
        },
        parent: {
          id: '4',
          name: 'David Wilson',
          email: 'david@example.com'
        },
        location: 'Client Home',
        status: 'completed',
        service_type: 'pet_care',
        price: 15000, // R150.00
        notes: 'Rocky enjoyed his morning walk and ate all his food.',
        created_at: '2024-01-15T07:30:00Z'
      },
      {
        id: '5',
        title: 'Private Training - Aggression',
        description: 'One-on-one training for aggressive behavior',
        date: '2024-01-22',
        time: '10:00',
        duration: 90,
        trainer: {
          id: '2',
          name: 'Mike Wilson',
          email: 'mike@justdogs.co.za'
        },
        dog: {
          id: '5',
          name: 'Shadow',
          breed: 'Rottweiler'
        },
        parent: {
          id: '5',
          name: 'Maria Garcia',
          email: 'maria@example.com'
        },
        location: 'Private Training Facility',
        status: 'scheduled',
        service_type: 'private_training',
        price: 40000, // R400.00
        created_at: '2024-01-16T16:45:00Z'
      }
    ];

    setTimeout(() => {
      setSessions(mockSessions);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredSessions = sessions.filter(session => 
    filter === 'all' ? true : session.status === filter
  );

  const getStatusColor = (status: Session['status']) => {
    switch (status) {
      case 'scheduled':
        return 'bg-[rgb(0_32_96)] text-white';
      case 'in-progress':
        return 'bg-[rgb(0_32_96)] text-white';
      case 'completed':
        return 'bg-[rgb(0_32_96)] text-white';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: Session['status']) => {
    switch (status) {
      case 'scheduled':
        return 'Scheduled';
      case 'in-progress':
        return 'In Progress';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Cancelled';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Training Sessions</h1>
            <p className="text-gray-600">Manage and track all training sessions</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[rgb(0_32_96)]"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Training Sessions</h1>
          <p className="text-gray-600">Manage and track all training sessions</p>
        </div>
        <Button className="flex items-center gap-2">
          <PlusIcon className="h-4 w-4" />
          New Session
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'scheduled', 'in-progress', 'completed', 'cancelled'] as const).map((status) => (
          <Button
            key={status}
            variant={filter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(status)}
            className={filter === status ? '' : 'border-[rgb(0_32_96)] text-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)] hover:text-white'}
          >
            {status === 'all' ? 'All' : getStatusText(status)}
          </Button>
        ))}
      </div>

      {/* Sessions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSessions.map((session) => (
          <Card key={session.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">{session.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {session.description}
                  </CardDescription>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(session.status)}`}>
                    {getStatusText(session.status)}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getServiceColor(session.service_type)}`}>
                    {getServiceIcon(session.service_type)} {getServiceDisplayName(session.service_type)}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Session Details */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{new Date(session.date).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <ClockIcon className="h-4 w-4" />
                  <span>{session.time} ({session.duration} min)</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPinIcon className="h-4 w-4" />
                  <span>{session.location}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">Price:</span>
                  <span className="text-green-600 font-semibold">{formatPrice(session.price)}</span>
                </div>
              </div>

              {/* Service Details */}
              <div className="space-y-2">
                {session.training_level && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Level:</span>
                    <span className="text-gray-600 capitalize">{session.training_level}</span>
                  </div>
                )}
                {session.consult_type && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Consult Type:</span>
                    <span className="text-gray-600 capitalize">{session.consult_type}</span>
                  </div>
                )}
              </div>

              {/* Participants */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <UserIcon className="h-4 w-4 text-gray-500" />
                  <span className="font-medium">Trainer:</span>
                  <span className="text-gray-600">{session.trainer.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Dog:</span>
                  <span className="text-gray-600">{session.dog.name} ({session.dog.breed})</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">Parent:</span>
                  <span className="text-gray-600">{session.parent.name}</span>
                </div>
              </div>

              {/* Notes */}
              {session.notes && (
                <div className="bg-gray-50 p-3 rounded-md">
                  <p className="text-sm text-gray-700">{session.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1">
                  <EyeIcon className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button variant="outline" size="sm">
                  <PencilIcon className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <TrashIcon className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredSessions.length === 0 && (
        <Card className="text-center py-12">
          <CardContent>
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <CalendarIcon className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No sessions found</h3>
            <p className="text-gray-600 mb-4">
              {filter === 'all' 
                ? 'Get started by creating your first training session.'
                : `No ${filter} sessions found.`
              }
            </p>
            {filter === 'all' && (
              <Button>
                <PlusIcon className="h-4 w-4 mr-2" />
                Create Session
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
