'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  CalendarIcon,
  ClockIcon,
  MapPinIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '@/hooks/useAuth';
import { formatDateTime, formatTime } from '@/lib/utils';
import { Booking } from '@/types';
import { authenticatedGet } from '@/lib/api/apiClient';

/* -------------------------------------------------- */

export default function SessionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [sessions, setSessions] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'confirmed' | 'completed' | 'cancelled'>('all');

  /* ---------------- LOAD REAL BOOKINGS ---------------- */

  useEffect(() => {
    if (!user) return;

    const loadSessions = async () => {
      try {
        setLoading(true);
        const res = await authenticatedGet('/api/bookings');

        if (!res.ok) {
          console.error('Failed to fetch bookings');
          setSessions([]);
          return;
        }

        const raw = await res.json();

        // Normalize schema
        const normalized: Booking[] = raw.map((b: any) => {
          if (b.start_time && b.end_time) return b;

          if (b.scheduled_date && b.scheduled_time) {
            const start = new Date(`${b.scheduled_date}T${b.scheduled_time}`);
            const end = new Date(start.getTime() + 60 * 60 * 1000);

            return {
              ...b,
              start_time: start.toISOString(),
              end_time: end.toISOString(),
            };
          }

          return b;
        });

        // Parent sees only their sessions
        if (user.role === 'parent') {
          setSessions(normalized.filter(b => b.parent_id === user.id));
        } else {
          // Admin / Trainer sees all
          setSessions(normalized);
        }

      } catch (err) {
        console.error('Error loading sessions:', err);
        setSessions([]);
      } finally {
        setLoading(false);
      }
    };

    loadSessions();
  }, [user]);

  /* ---------------- FILTER ---------------- */

  const filteredSessions = sessions.filter(s =>
    filter === 'all' ? true : s.status === filter
  );

  /* ---------------- LOADING ---------------- */

  if (authLoading || loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin h-10 w-10 border-b-2 border-[rgb(0_32_96)] rounded-full" />
      </div>
    );
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Training Sessions</h1>
          <p className="text-gray-600">All bookings & training sessions</p>
        </div>
        {(user?.role === 'admin' || user?.role === 'parent') && (
          <Button>
            <PlusIcon className="h-4 w-4 mr-2" />
            New Booking
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(s => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? 'default' : 'outline'}
            onClick={() => setFilter(s as any)}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Button>
        ))}
      </div>

      {/* Sessions */}
      {filteredSessions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <CalendarIcon className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">No sessions found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredSessions.map(s => (
            <Card key={s.id}>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>{s.booking_type.replace('_', ' ')}</span>
                  <span className="text-sm capitalize">{s.status}</span>
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CalendarIcon className="h-4 w-4" />
                  {formatDateTime(s.start_time)}
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <ClockIcon className="h-4 w-4" />
                  {formatTime(s.start_time)} – {formatTime(s.end_time)}
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <MapPinIcon className="h-4 w-4" />
                  {s.location || '—'}
                </div>

                <div className="text-sm text-gray-600">
                  Dog ID: {s.dog_id}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
