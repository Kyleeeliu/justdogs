'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { getNewsItems } from '@/lib/data/content';
import type { NewsAttachment, NewsItem } from '@/lib/data/content';
import { facebookPagePluginSrc } from '@/lib/social/fetchSocialFeeds';
import type { EventItem } from '@/lib/supabase/events';
import { useAuth } from '@/hooks/useAuth';
import {
  ArrowLeftIcon,
  NewspaperIcon,
  CalendarIcon,
  MapPinIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline';

export default function NewsPage() {
  const { isAuthenticated } = useAuth();
  const [newsletters, setNewsletters] = useState<NewsItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedNewsletters, setExpandedNewsletters] = useState<Set<string>>(new Set());
  const [previewingPdf, setPreviewingPdf] = useState<string | null>(null);

  useEffect(() => {
    const loadContent = async () => {
      try {
        const [allNews, allEvents] = await Promise.all([
          getNewsItems(),
          fetch('/api/events?published=true').then((r) => (r.ok ? r.json() : [])).catch(() => [] as EventItem[]),
        ]);
        setNewsletters(allNews.filter((item) => item.type === 'news'));
        setEvents(allEvents);
      } catch (error) {
        console.error('Error loading news content:', error);
      } finally {
        setLoading(false);
      }
    };

    loadContent();
    const interval = setInterval(loadContent, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Africa/Johannesburg',
    });

  const toggleNewsletter = (id: string) => {
    setExpandedNewsletters((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(0_32_96)] mx-auto" />
          <p className="mt-4 text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-3">
              {isAuthenticated && (
                <Link href="/dashboard">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)]/10"
                  >
                    <ArrowLeftIcon className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
              )}
              <Link href="/" className="flex items-center">
                <img
                  src="/images/icons/logo.gif"
                  alt="Just Dogs Logo"
                  className="w-[1.6rem] h-8 mr-3"
                />
                <span className="text-xl font-bold text-[rgb(0_32_96)]">Just Dogs</span>
              </Link>
            </div>
            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="text-[rgb(0_32_96)]">
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="text-[rgb(0_32_96)]">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button
                      size="sm"
                      className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white rounded-full px-5"
                    >
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Page Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-[rgb(0_32_96)] mb-3">News &amp; Events</h1>
          <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
            Stay updated with the latest from Just Dogs — newsletters, events, and our Facebook community.
          </p>
        </div>

        {/* Main Grid: Facebook (left) | Newsletters + Events (right) */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,480px)_1fr] gap-8 items-start">

          {/* ======= LEFT: FACEBOOK FEED ======= */}
          <section className="lg:sticky lg:top-24" aria-labelledby="social-heading">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-7 bg-blue-600 rounded-full flex-shrink-0" />
              <PhotoIcon className="h-5 w-5 text-[rgb(0_32_96)]" />
              <h2 id="social-heading" className="text-xl font-bold text-[rgb(0_32_96)]">
                Latest from Facebook
              </h2>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <iframe
                title="Just Dogs on Facebook — recent posts"
                src={facebookPagePluginSrc(480, 680)}
                width="100%"
                height={680}
                style={{ border: 'none', overflow: 'hidden' }}
                allow="encrypted-media"
                loading="lazy"
                className="w-full min-h-[400px] sm:min-h-[680px] block"
              />
            </div>
          </section>

          {/* ======= RIGHT: NEWSLETTERS + EVENTS ======= */}
          <div className="space-y-10 min-w-0">

            {/* NEWSLETTERS */}
            <section aria-labelledby="newsletters-heading">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-7 bg-[rgb(0_32_96)] rounded-full" />
                <NewspaperIcon className="h-5 w-5 text-[rgb(0_32_96)]" />
                <h2 id="newsletters-heading" className="text-xl font-bold text-[rgb(0_32_96)]">Newsletters</h2>
              </div>

              {newsletters.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                  <NewspaperIcon className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No newsletters yet</p>
                  <p className="text-gray-400 text-sm mt-1">Check back soon for the latest updates</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {newsletters.map((item) => {
                    const isExpanded = expandedNewsletters.has(item.id);
                    const hasPdf =
                      item.attachments &&
                      item.attachments.some((a: NewsAttachment) => a.type === 'pdf');

                    return (
                      <Card
                        key={item.id}
                        className="bg-white border border-gray-200 hover:shadow-md transition-all duration-200 overflow-hidden"
                      >
                        <CardContent className="p-0">
                          <div
                            className="p-5 cursor-pointer"
                            onClick={() => toggleNewsletter(item.id)}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <span className="text-xs text-gray-400 font-medium">
                                    {formatDate(item.date)}
                                  </span>
                                  {hasPdf && (
                                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                                      📎 PDF
                                    </span>
                                  )}
                                </div>
                                <h3 className="font-semibold text-gray-900 text-base">
                                  {item.title}
                                </h3>
                                {item.content && (
                                  <p
                                    className={`text-sm text-gray-500 mt-1 ${
                                      isExpanded ? '' : 'line-clamp-2'
                                    }`}
                                  >
                                    {item.content}
                                  </p>
                                )}
                              </div>
                              <button
                                className="text-gray-400 hover:text-[rgb(0_32_96)] flex-shrink-0 mt-0.5 transition-transform duration-200"
                                style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                                aria-label={isExpanded ? 'Collapse' : 'Expand'}
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          <div
                            className={`overflow-hidden transition-all duration-300 ${
                              isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
                            }`}
                          >
                            {item.attachments && item.attachments.length > 0 ? (
                              <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-3">
                                {item.attachments.map((attachment: NewsAttachment, idx: number) => (
                                  <div key={idx}>
                                    {attachment.type === 'pdf' ? (
                                      <div>
                                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                          <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                            <span className="text-lg">📄</span>
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 truncate">
                                              {attachment.filename}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                              {(attachment.size / 1024 / 1024).toFixed(2)} MB
                                            </p>
                                          </div>
                                          <div className="flex gap-2 flex-shrink-0">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setPreviewingPdf(
                                                  previewingPdf === attachment.url ? null : attachment.url
                                                );
                                              }}
                                              className="text-xs"
                                            >
                                              {previewingPdf === attachment.url ? 'Hide' : 'Preview'}
                                            </Button>
                                            <a
                                              href={attachment.url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              download
                                              onClick={(e) => e.stopPropagation()}
                                              className="text-xs px-3 py-1.5 rounded-lg border border-[rgb(0_32_96)] text-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)] hover:text-white transition-colors"
                                            >
                                              Download
                                            </a>
                                          </div>
                                        </div>
                                        {previewingPdf === attachment.url && (
                                          <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden">
                                            <iframe
                                              src={`${attachment.url}#toolbar=0&navpanes=0`}
                                              className="w-full h-[550px]"
                                              title={attachment.filename}
                                              style={{ border: 'none' }}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                                        <img
                                          src={attachment.url}
                                          alt={attachment.filename}
                                          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
                                          onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                          }}
                                        />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-900 truncate">
                                            {attachment.filename}
                                          </p>
                                          <a
                                            href={attachment.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-600 hover:underline"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            View full size
                                          </a>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              item.content && (
                                <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                                  <p className="text-sm text-gray-600 whitespace-pre-wrap">
                                    {item.content}
                                  </p>
                                </div>
                              )
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>

            {/* EVENTS */}
            <section aria-labelledby="events-heading">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-7 bg-emerald-600 rounded-full" />
                <CalendarIcon className="h-5 w-5 text-emerald-700" />
                <h2 id="events-heading" className="text-xl font-bold text-emerald-800">Upcoming Events</h2>
              </div>

              {events.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
                  <CalendarIcon className="h-10 w-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No upcoming events</p>
                  <p className="text-gray-400 text-sm mt-1">Check back soon for exciting events</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {events.map((event) => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const isPast = new Date(event.event_date) < today;

                    return (
                      <Card
                        key={event.id}
                        className={`bg-white overflow-hidden transition-all duration-200 hover:shadow-md ${
                          isPast ? 'border border-gray-200 opacity-70' : 'border border-emerald-200'
                        }`}
                      >
                        <CardContent className="p-5">
                          <div className="flex items-center justify-between mb-3 gap-2">
                            <div
                              className={`px-3 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${
                                isPast ? 'bg-gray-100 text-gray-500' : 'bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              📅 {formatDate(event.event_date)}
                            </div>
                            {isPast ? (
                              <span className="text-xs text-gray-400 italic">Past event</span>
                            ) : (
                              <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium flex-shrink-0">
                                Upcoming
                              </span>
                            )}
                          </div>

                          <h3 className="font-bold text-gray-900 text-base mb-2">{event.title}</h3>
                          <p className="text-sm text-gray-600 leading-relaxed">{event.description}</p>

                          {event.location && (
                            <div className="flex items-center gap-1.5 mt-3 text-sm text-gray-500">
                              <MapPinIcon className="h-4 w-4 flex-shrink-0 text-gray-400" />
                              <span>{event.location}</span>
                            </div>
                          )}

                          {!isPast && (
                            <div className="mt-4 pt-3 border-t border-gray-100">
                              <Button
                                size="sm"
                                className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white text-xs"
                                onClick={() => {
                                  window.location.href = isAuthenticated ? '/bookings-sessions' : '/register';
                                }}
                              >
                                {isAuthenticated ? 'Book a Session' : 'Sign Up to Register'}
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>

          </div>
        </div>

        {/* Stay Connected CTA */}
        <div className="mt-16 text-center bg-white rounded-2xl p-10 shadow-sm border border-gray-100">
          <h2 className="text-2xl font-bold text-[rgb(0_32_96)] mb-3">Stay Connected</h2>
          <p className="text-gray-600 mb-7 max-w-xl mx-auto">
            Follow us on social media for the latest updates, tips, and community highlights.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-7 rounded-xl"
              onClick={() => window.open('https://www.facebook.com/justdogsbehaviour/', '_blank')}
            >
              📘 Follow on Facebook
            </Button>
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-7 rounded-xl"
              onClick={() => window.open('https://www.instagram.com/justdogsbehaviour/', '_blank')}
            >
              📷 Follow on Instagram
            </Button>
            <Link href="/services">
              <Button
                variant="outline"
                size="lg"
                className="border-2 border-[rgb(0_32_96)] text-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)] hover:text-white px-7 rounded-xl"
              >
                View Our Services
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
