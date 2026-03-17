'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import { authenticatedGet, authenticatedFetch } from '@/lib/api/apiClient';

interface BookingType {
  id: string;
  name: string;
  category: string;
  duration_minutes: number;
  price_per_dog: number;
}

const CATEGORIES = [
  { value: 'behavior_and_home',             label: 'Behaviour & Home' },
  { value: 'academy',                       label: 'Academy' },
  { value: 'farm',                          label: 'Farm' },
  { value: 'service_and_emotional_support', label: 'Service & Emotional Support' },
];

const BLANK_FORM = { name: '', category: 'academy', duration_minutes: '' as number | '', price_per_dog: '' as number | '' };

export default function BookingTypesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bookingTypes, setBookingTypes] = useState<BookingType[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<{ id?: string; name: string; category: string; duration_minutes: number | ''; price_per_dog: number | '' } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!authLoading && user?.role !== 'admin') router.push('/dashboard');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user?.role === 'admin') loadTypes();
  }, [user]);

  const loadTypes = async () => {
    setLoading(true);
    try {
      const res = await authenticatedGet('/api/booking-types');
      const data = await res.json();
      setBookingTypes(Array.isArray(data) ? data : []);
    } catch {
      setBookingTypes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!form) return;
    setError('');
    if (!form.name.trim()) { setError('Name is required'); return; }
    if (!form.duration_minutes || Number(form.duration_minutes) < 1) { setError('Duration must be at least 1 minute'); return; }

    setSaving(true);
    try {
      const method = form.id ? 'PUT' : 'POST';
      const res = await authenticatedFetch('/api/booking-types', {
        method,
        body: JSON.stringify({
          id: form.id,
          name: form.name.trim(),
          category: form.category,
          duration_minutes: Number(form.duration_minutes),
          price_per_dog: Number(form.price_per_dog) || 0,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save');
        return;
      }
      await loadTypes();
      setForm(null);
    } catch {
      setError('Failed to save booking type');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this booking type? It will no longer appear in the booking form.')) return;
    await authenticatedFetch(`/api/booking-types?id=${id}`, { method: 'DELETE' });
    await loadTypes();
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin h-10 w-10 border-b-2 border-[rgb(0_32_96)] rounded-full" />
      </div>
    );
  }

  const typesByCategory = CATEGORIES.map(cat => ({
    ...cat,
    types: bookingTypes.filter(t => t.category === cat.value),
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Booking Types</h1>
          <p className="text-gray-600 mt-1">Manage the services available when creating a booking</p>
        </div>
        {!form && (
          <Button
            onClick={() => { setForm(BLANK_FORM); setError(''); }}
            className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Booking Type
          </Button>
        )}
      </div>

      {/* Add / Edit form */}
      {form && (
        <Card className="border-2 border-[rgb(0_32_96)]">
          <CardContent className="p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 text-lg">{form.id ? 'Edit Booking Type' : 'New Booking Type'}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Dog Jog, Swim & Gym"
                  value={form.name}
                  onChange={e => setForm(f => f ? { ...f, name: e.target.value } : f)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => f ? { ...f, category: e.target.value } : f)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[rgb(0_32_96)]"
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Duration (minutes) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min={1}
                  placeholder="e.g. 60"
                  value={form.duration_minutes}
                  onChange={e => setForm(f => f ? { ...f, duration_minutes: e.target.value === '' ? '' : Number(e.target.value) } : f)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Price per Dog (R)</label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="e.g. 35.00"
                  value={form.price_per_dog}
                  onChange={e => setForm(f => f ? { ...f, price_per_dog: e.target.value === '' ? '' : Number(e.target.value) } : f)}
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div className="flex gap-3 pt-1">
              <Button variant="outline" onClick={() => { setForm(null); setError(''); }} disabled={saving}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
              >
                {saving ? 'Saving…' : (form.id ? 'Save Changes' : 'Add Booking Type')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List grouped by category */}
      {bookingTypes.length === 0 && !form ? (
        <Card>
          <CardContent className="p-10 text-center text-gray-500">
            <p className="text-lg font-medium mb-1">No booking types yet</p>
            <p className="text-sm">Click "Add Booking Type" to create your first one.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {typesByCategory.map(cat => {
            if (cat.types.length === 0) return null;
            return (
              <div key={cat.value}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{cat.label}</p>
                <div className="grid gap-2">
                  {cat.types.map(t => (
                    <Card key={t.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-gray-900">{t.name}</p>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {t.duration_minutes} min · R{Number(t.price_per_dog).toFixed(2)} per dog
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setForm({ id: t.id, name: t.name, category: t.category, duration_minutes: t.duration_minutes, price_per_dog: t.price_per_dog }); setError(''); }}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDelete(t.id)}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
