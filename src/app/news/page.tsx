'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getNewsItems, NewsItem } from '@/lib/data/content';
import { useAuth } from '@/hooks/useAuth';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function NewsPage() {
  const { user, isAuthenticated } = useAuth();
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [previewingPdf, setPreviewingPdf] = useState<string | null>(null);

  useEffect(() => {
    const loadNews = async () => {
      try {
        const news = await getNewsItems();
        setNewsItems(news);
      } catch (error) {
        console.error('Error loading news:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNews();
    
    // Refresh news every 30 seconds to catch updates from admin
    const interval = setInterval(loadNews, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'news':
        return 'bg-blue-100 text-blue-800';
      case 'event':
        return 'bg-green-100 text-green-800';
      case 'announcement':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const isExpanded = (itemId: string) => expandedItems.has(itemId);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(0_32_96)] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading news...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              {isAuthenticated && (
                <Link href="/dashboard">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-[rgb(0_32_96)] hover:text-[rgb(0_24_72)] hover:bg-[rgb(0_32_96)]/10"
                  >
                    <ArrowLeftIcon className="h-4 w-4 mr-2" />
                    Back to Dashboard
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
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="text-[rgb(0_32_96)] hover:text-[rgb(0_24_72)]">
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="text-[rgb(0_32_96)] hover:text-[rgb(0_24_72)]">
                      Sign In
                    </Button>
                  </Link>
                  <Link href="/register">
                    <Button size="sm" className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white rounded-full px-6">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Page Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[rgb(0_32_96)] mb-4">News & Events</h1>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto">
            Stay updated with the latest news, events, and special announcements from Just Dogs
          </p>
        </div>

        {/* All News Items - Expandable */}
        <div className="space-y-4 mb-12">
          {newsItems.map((item) => {
            const expanded = isExpanded(item.id);
            const hasAttachments = item.attachments && item.attachments.length > 0;
            
            return (
              <Card 
                key={item.id} 
                className="hover:shadow-lg transition-all duration-300 overflow-hidden"
              >
                <CardContent className="p-0">
                  {/* Collapsed Header */}
                  <div 
                    className="p-6 cursor-pointer"
                    onClick={() => toggleExpand(item.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(item.type)}`}>
                            {item.type}
                          </span>
                          <span className="text-sm text-gray-500">{formatDate(item.date)}</span>
                          {hasAttachments && (
                            <span className="text-xs text-blue-600">
                              📎 {item.attachments!.length} attachment{item.attachments!.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2 text-lg">{item.title}</h3>
                        <p className={`text-gray-700 text-sm transition-all duration-300 ${
                          expanded ? 'line-clamp-none' : 'line-clamp-2'
                        }`}>
                          {item.content}
                        </p>
                  </div>
                      <div className="ml-4 flex-shrink-0">
                        <button
                          className="text-[rgb(0_32_96)] hover:text-[rgb(0_24_72)] transition-transform duration-300"
                          style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
                        >
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                  </div>
                    </div>
        </div>

                  {/* Expanded Content */}
                  <div 
                    className={`overflow-hidden transition-all duration-300 ease-in-out ${
                      expanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="px-6 pb-6 border-t border-gray-100 pt-4">
                      <p className="text-gray-700 mb-4 whitespace-pre-wrap">{item.content}</p>
                      
                      {/* Attachments */}
                      {hasAttachments && (
                        <div className="mt-4 pt-4 border-t border-gray-200">
                          <h4 className="font-medium text-gray-900 mb-3">Attachments</h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {item.attachments!.map((attachment, idx) => (
                              <div key={attachment.id || idx} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                {attachment.type === 'jpeg' ? (
                                  <>
                                    <img 
                                      src={attachment.url} 
                                      alt={attachment.filename}
                                      className="w-16 h-16 object-cover rounded"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium text-gray-900 truncate">{attachment.filename}</p>
                                      <p className="text-xs text-gray-500">{(attachment.size / 1024 / 1024).toFixed(2)} MB</p>
                                      <a
                                        href={attachment.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-xs text-blue-600 hover:underline mt-1 inline-block"
                                      >
                                        View Full Size
                                      </a>
                                    </div>
                                  </>
                                ) : (
                                  <div className="w-full">
                                    <div className="flex items-center gap-3 mb-2">
                                      <div className="w-12 h-12 bg-red-100 rounded flex items-center justify-center flex-shrink-0">
                                        <span className="text-xl">📄</span>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate">{attachment.filename}</p>
                                        <p className="text-xs text-gray-500">{(attachment.size / 1024 / 1024).toFixed(2)} MB</p>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setPreviewingPdf(previewingPdf === attachment.url ? null : attachment.url)}
                                          className="text-xs"
                                        >
                                          {previewingPdf === attachment.url ? 'Hide Preview' : 'Preview'}
                                        </Button>
                                        <a
                                          href={attachment.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          download
                                          className="text-xs text-blue-600 hover:underline px-2 py-1 rounded border border-blue-200 hover:bg-blue-50"
                                        >
                                          Download
                                        </a>
                                      </div>
                                    </div>
                                    {previewingPdf === attachment.url && (
                                      <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
                                        <iframe
                                          src={`${attachment.url}#toolbar=0&navpanes=0&scrollbar=0`}
                                          className="w-full h-[600px]"
                                          title={attachment.filename}
                                          style={{ border: 'none' }}
                                        />
                                      </div>
                                    )}
                                  </div>
                                )}
                  </div>
                ))}
            </div>
          </div>
        )}
                      
                      {item.type === 'event' && (
                        <div className="mt-4">
                          <Button
                            size="sm"
                            className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open('https://justdogs.co.za', '_blank');
                            }}
                          >
                            Register Now
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Call to Action */}
        <div className="text-center bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-3xl font-bold text-[rgb(0_32_96)] mb-4">
            Stay Connected
          </h2>
          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto">
            Don't miss out on the latest updates! Follow us on social media and subscribe 
            to our newsletter for regular news and event announcements.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg rounded-xl"
              onClick={() => window.open('https://www.facebook.com/justdogsbehaviour/', '_blank')}
            >
              📘 Follow on Facebook
            </Button>
            <Button 
              size="lg" 
              className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-4 text-lg rounded-xl"
              onClick={() => window.open('https://www.instagram.com/justdogsbehaviour/?hl=en', '_blank')}
            >
              📷 Follow on Instagram
            </Button>
            <Link href="/services">
              <Button 
                variant="outline" 
                size="lg" 
                className="border-2 border-[rgb(0_32_96)] text-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)] hover:text-white px-8 py-4 text-lg rounded-xl"
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
