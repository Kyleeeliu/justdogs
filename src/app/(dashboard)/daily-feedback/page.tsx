'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  authenticatedDelete,
  authenticatedFetch,
  authenticatedGet,
  authenticatedPost,
  authenticatedPut,
} from '@/lib/api/apiClient';
import {
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

type PriorityDog = {
  dog_id: string;
  name: string;
  breed?: string;
  tags: string[];
  tag_count: number;
  last_feedback_at: string | null;
  fed_today: boolean;
};

type BookedDog = { id: string; name: string; breed?: string };
type TagRow = { id: string; dog_id: string; for_date: string; tag: string };
type HistoryItem = {
  id: string;
  trainer_name: string;
  feedback_date: string;
  body_text: string;
  photo_url: string | null;
  created_at: string;
  dog_names: string[];
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function DailyFeedbackPage() {
  const { user } = useAuth();
  const [date, setDate] = useState(todayISO);
  const [stats, setStats] = useState({
    my_submissions_today: 0,
    team_submissions_today: 0,
    daily_target: 10,
  });
  const [fullPriority, setFullPriority] = useState<PriorityDog[]>([]);
  const [top6, setTop6] = useState<PriorityDog[]>([]);
  const [booked, setBooked] = useState<BookedDog[]>([]);
  const [tagRows, setTagRows] = useState<TagRow[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetInput, setTargetInput] = useState('10');
  const [newTagByDog, setNewTagByDog] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [modalDog, setModalDog] = useState<BookedDog | null>(null);
  const [formText, setFormText] = useState('');
  const [formExtraDogIds, setFormExtraDogIds] = useState<string[]>([]);
  const [formFile, setFormFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isStaff = user?.role === 'admin' || user?.role === 'trainer';
  const userId = user?.id;
  const userRole = user?.role;

  const load = useCallback(async () => {
    if (!userId || (userRole !== 'admin' && userRole !== 'trainer')) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const isAdminUser = userRole === 'admin';
      const [s, pFull, p6, b, h] = await Promise.all([
        authenticatedGet(`/api/daily-feedback/stats?date=${encodeURIComponent(date)}`),
        authenticatedGet(`/api/daily-feedback/priority?date=${encodeURIComponent(date)}`),
        authenticatedGet(
          `/api/daily-feedback/priority?date=${encodeURIComponent(date)}&only_open=1&limit=6`
        ),
        authenticatedGet(`/api/daily-feedback/booked?date=${encodeURIComponent(date)}`),
        authenticatedGet(`/api/daily-feedback?limit=25`),
      ]);
      if (s.ok) {
        const j = await s.json();
        setStats({
          my_submissions_today: j.my_submissions_today,
          team_submissions_today: j.team_submissions_today,
          daily_target: j.daily_target,
        });
        setTargetInput(String(j.daily_target));
      }
      if (pFull.ok) {
        const j = await pFull.json();
        setFullPriority(j.dogs || []);
      }
      if (p6.ok) {
        const j = await p6.json();
        setTop6(j.dogs || []);
      }
      if (b.ok) {
        const j = await b.json();
        setBooked(j.dogs || []);
      }
      if (h.ok) {
        const j = await h.json();
        setHistory(j.items || []);
      }
      if (isAdminUser) {
        const t = await authenticatedGet(`/api/daily-feedback/tags?date=${encodeURIComponent(date)}`);
        if (t.ok) {
          const j = await t.json();
          setTagRows(j.tags || []);
        }
      } else {
        setTagRows([]);
      }
    } finally {
      setLoading(false);
    }
  }, [date, userId, userRole]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredBooked = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return booked;
    return booked.filter((d) => d.name.toLowerCase().includes(q) || (d.breed || '').toLowerCase().includes(q));
  }, [booked, search]);

  const saveTarget = async () => {
    const n = parseInt(targetInput, 10);
    if (Number.isNaN(n) || n < 0) return;
    const res = await authenticatedPut('/api/daily-feedback/target', { for_date: date, target_count: n });
    if (res.ok) void load();
  };

  const addTag = async (dogId: string) => {
    const tag = (newTagByDog[dogId] || '').trim();
    if (!tag) return;
    const res = await authenticatedPost('/api/daily-feedback/tags', {
      dog_id: dogId,
      for_date: date,
      tag,
    });
    if (res.ok) {
      setNewTagByDog((prev) => ({ ...prev, [dogId]: '' }));
      void load();
    }
  };

  const removeTag = async (id: string) => {
    const res = await authenticatedDelete(`/api/daily-feedback/tags?id=${encodeURIComponent(id)}`);
    if (res.ok) void load();
  };

  const openModalForDog = (d: BookedDog) => {
    setModalDog(d);
    setFormText('');
    setFormExtraDogIds([]);
    setFormFile(null);
  };

  const toggleExtraDog = (id: string) => {
    if (modalDog && id === modalDog.id) return;
    setFormExtraDogIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const submitFeedback = async (primaryDogId: string, extraIds: string[]) => {
    const text = formText.trim();
    if (!text) {
      alert('Please enter feedback text.');
      return;
    }
    const dog_ids = [primaryDogId, ...extraIds.filter((id) => id !== primaryDogId)];
    setSubmitting(true);
    try {
      let photo_url: string | null = null;
      if (formFile) {
        const ext = formFile.name.split('.').pop() || 'jpg';
        const path = `daily-feedback/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const fd = new FormData();
        fd.append('file', formFile);
        fd.append('path', path);
        const up = await authenticatedFetch('/api/upload', { method: 'POST', body: fd });
        if (!up.ok) {
          const err = await up.json().catch(() => ({}));
          throw new Error(err.error || 'Upload failed');
        }
        const uj = await up.json();
        photo_url = uj.url;
      }
      const res = await authenticatedPost('/api/daily-feedback', {
        feedback_date: date,
        body_text: text,
        photo_url,
        dog_ids,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Save failed');
      }
      setModalDog(null);
      setFormText('');
      setFormExtraDogIds([]);
      setFormFile(null);
      await load();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isStaff) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">This page is for trainers and admins.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ChatBubbleLeftRightIcon className="h-8 w-8 text-[rgb(0_32_96)]" />
            Daily feedback
          </h1>
          <p className="text-gray-600 mt-1 text-sm max-w-2xl">
            Priority is by admin tags (higher first), then longest since last feedback. Submitting feedback for a dog
            on this day removes them from the priority queue until tomorrow.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 whitespace-nowrap">Date</label>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(0_32_96)]" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">Your submissions today</p>
              <p className="text-2xl font-bold text-[rgb(0_32_96)]">{stats.my_submissions_today}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">Team total today</p>
              <p className="text-2xl font-bold text-gray-900">{stats.team_submissions_today}</p>
            </div>
            <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">Daily target</p>
              <p className="text-2xl font-bold text-gray-900">{stats.daily_target}</p>
            </div>
          </div>

          {isAdmin && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-3">
              <h2 className="font-semibold text-gray-900">Admin: daily target</h2>
              <div className="flex flex-wrap items-end gap-2">
                <div>
                  <label className="text-xs text-gray-600">Target submission count for {date}</label>
                  <Input
                    type="number"
                    min={0}
                    className="w-32 mt-1"
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                  />
                </div>
                <Button type="button" onClick={() => void saveTarget()} className="bg-[rgb(0_32_96)] text-white">
                  Save target
                </Button>
              </div>
            </div>
          )}

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Top priority (next up to 6)</h2>
            {top6.length === 0 ? (
              <p className="text-sm text-gray-500">No open priorities — great work, or no bookings for this day.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {top6.map((d) => (
                  <div key={d.dog_id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm space-y-2">
                    <div className="flex justify-between gap-2">
                      <div>
                        <p className="font-semibold text-gray-900">{d.name}</p>
                        {d.tags.length > 0 && (
                          <p className="text-xs text-amber-800 mt-1">Tags: {d.tags.join(', ')}</p>
                        )}
                        <p className="text-xs text-gray-500">
                          Last feedback:{' '}
                          {d.last_feedback_at
                            ? new Date(d.last_feedback_at).toLocaleString()
                            : 'Never'}
                        </p>
                      </div>
                      <Button size="sm" variant="outline" onClick={() => openModalForDog({ id: d.dog_id, name: d.name, breed: d.breed })}>
                        Add feedback
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Dogs booked this day</h2>
            <div className="relative max-w-md mb-3">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
              <Input
                className="pl-10"
                placeholder="Search by name or breed…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {filteredBooked.map((d) => (
                <Button
                  key={d.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openModalForDog(d)}
                  className="rounded-full"
                >
                  <PlusIcon className="h-4 w-4 mr-1" />
                  {d.name}
                </Button>
              ))}
            </div>
          </section>

          {isAdmin && (
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Full priority list & tags</h2>
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 text-left">
                    <tr>
                      <th className="px-3 py-2">Dog</th>
                      <th className="px-3 py-2">Tags today</th>
                      <th className="px-3 py-2">Fed today</th>
                      <th className="px-3 py-2">Add tag</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fullPriority.map((d) => {
                      const rowTags = tagRows.filter((t) => t.dog_id === d.dog_id);
                      return (
                        <tr key={d.dog_id} className="border-t border-gray-100">
                          <td className="px-3 py-2 font-medium">{d.name}</td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap gap-1">
                              {rowTags.map((t) => (
                                <span
                                  key={t.id}
                                  className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900"
                                >
                                  {t.tag}
                                  <button
                                    type="button"
                                    className="hover:text-red-700"
                                    onClick={() => void removeTag(t.id)}
                                    aria-label={`Remove ${t.tag}`}
                                  >
                                    <XMarkIcon className="h-3 w-3" />
                                  </button>
                                </span>
                              ))}
                              {rowTags.length === 0 && <span className="text-gray-400">—</span>}
                            </div>
                          </td>
                          <td className="px-3 py-2">{d.fed_today ? 'Yes' : 'No'}</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <Input
                                className="h-8 text-xs"
                                placeholder="Tag"
                                value={newTagByDog[d.dog_id] || ''}
                                onChange={(e) =>
                                  setNewTagByDog((prev) => ({ ...prev, [d.dog_id]: e.target.value }))
                                }
                              />
                              <Button type="button" size="sm" variant="secondary" onClick={() => void addTag(d.dog_id)}>
                                Add
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section>
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Recent feedback (all dogs)</h2>
            <div className="space-y-3">
              {history.length === 0 ? (
                <p className="text-sm text-gray-500">No entries yet.</p>
              ) : (
                history.map((h) => (
                  <div key={h.id} className="rounded-lg border border-gray-200 bg-white p-3 text-sm">
                    <div className="flex justify-between gap-2 text-xs text-gray-500">
                      <span>{h.feedback_date}</span>
                      <span>{h.trainer_name}</span>
                    </div>
                    <p className="text-gray-800 mt-1">{h.body_text}</p>
                    <p className="text-xs text-gray-500 mt-1">Dogs: {h.dog_names.join(', ') || '—'}</p>
                    {h.photo_url && (
                      <div className="relative mt-2 h-40 w-full max-w-xs rounded-md overflow-hidden border border-gray-100">
                        <Image src={h.photo_url} alt="" fill className="object-cover" unoptimized />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}

      {modalDog && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-t-2xl sm:rounded-2xl bg-white shadow-xl border border-gray-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 p-4">
              <h3 className="font-semibold text-lg">Feedback: {modalDog.name}</h3>
              <button
                type="button"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                onClick={() => setModalDog(null)}
                aria-label="Close"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Also tag these dogs (same photo / note)</label>
                <div className="mt-2 flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                  {booked
                    .filter((b) => b.id !== modalDog.id)
                    .map((b) => (
                      <label key={b.id} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={formExtraDogIds.includes(b.id)}
                          onChange={() => toggleExtraDog(b.id)}
                        />
                        {b.name}
                      </label>
                    ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Feedback</label>
                <textarea
                  className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm min-h-[120px]"
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  placeholder="How did the session / day go?"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Optional photo</label>
                <input
                  type="file"
                  accept="image/*"
                  className="mt-1 block w-full text-sm"
                  onChange={(e) => setFormFile(e.target.files?.[0] || null)}
                />
              </div>
              <Button
                type="button"
                disabled={submitting}
                className="w-full bg-[rgb(0_32_96)] text-white"
                onClick={() => void submitFeedback(modalDog.id, formExtraDogIds)}
              >
                {submitting ? 'Submitting…' : 'Submit feedback'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
