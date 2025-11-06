'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getNewsItems, NewsItem } from '@/lib/data/content';

export default function NewsPage() {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNews = () => {
      try {
        const news = getNewsItems();
        setNewsItems(news);
      } catch (error) {
        console.error('Error loading news:', error);
      } finally {
        setLoading(false);
      }
    };

    loadNews();
    
    // Refresh news every 5 seconds to catch updates from admin
    const interval = setInterval(loadNews, 5000);
    
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
            <Link href="/" className="flex items-center">
              <img
                src="/images/icons/logo.gif"
                alt="Just Dogs Logo"
                className="w-8 h-8 mr-3"
              />
              <span className="text-xl font-bold text-[rgb(0_32_96)]">Just Dogs</span>
            </Link>
            <div className="flex items-center space-x-4">
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

        {/* News & Events Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          {/* Latest News */}
          <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
            <CardHeader>
              <CardTitle className="text-2xl text-[rgb(0_32_96)] flex items-center">
                📰 Latest News
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {newsItems
                .filter(item => item.type === 'news')
                .slice(0, 3)
                .map((item) => (
                  <div key={item.id} className="border-l-4 border-[rgb(0_32_96)] pl-4">
                    <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{formatDate(item.date)}</p>
                    <p className="text-gray-700 text-sm">{item.content}</p>
                  </div>
                ))}
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card className="hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
            <CardHeader>
              <CardTitle className="text-2xl text-[rgb(0_32_96)] flex items-center">
                📅 Upcoming Events
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {newsItems
                .filter(item => item.type === 'event')
                .slice(0, 3)
                .map((item) => (
                  <div key={item.id} className="bg-[rgb(0_32_96)] bg-opacity-10 rounded-lg p-4">
                    <h3 className="font-semibold text-[rgb(0_32_96)] mb-2">{item.title}</h3>
                    <p className="text-sm text-gray-900 font-medium mb-2">{formatDate(item.date)}</p>
                    <p className="text-gray-900 text-sm mb-3">{item.content}</p>
                    <Button 
                      size="sm" 
                      className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
                      onClick={() => window.open('https://justdogs.co.za', '_blank')}
                    >
                      Register Now
                    </Button>
                  </div>
                ))}
            </CardContent>
          </Card>
        </div>

        {/* Special Announcements */}
        {newsItems.filter(item => item.type === 'announcement').length > 0 && (
          <div className="bg-white rounded-2xl p-8 shadow-lg mb-8">
            <h2 className="text-3xl font-bold text-[rgb(0_32_96)] mb-6 text-center">
              🎉 Special Announcements
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {newsItems
                .filter(item => item.type === 'announcement')
                .slice(0, 2)
                .map((item, index) => (
                  <div 
                    key={item.id} 
                    className={`text-center p-6 rounded-xl text-white ${
                      index === 0 
                        ? 'bg-gradient-to-br from-[rgb(0_32_96)] to-[rgb(0_24_72)]' 
                        : 'bg-gradient-to-br from-green-500 to-green-600'
                    }`}
                  >
                    <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                    <p className="mb-4">{item.content}</p>
                    <Button 
                      variant="outline" 
                      className={`border-white text-white hover:bg-white ${
                        index === 0 
                          ? 'hover:text-[rgb(0_32_96)]' 
                          : 'hover:text-green-600'
                      }`}
                      onClick={() => window.open('https://justdogs.co.za', '_blank')}
                    >
                      {index === 0 ? 'Claim Offer' : 'Learn More'}
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        )}

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
              onClick={() => window.open('https://facebook.com/justdogs', '_blank')}
            >
              📘 Follow on Facebook
            </Button>
            <Button 
              size="lg" 
              className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-4 text-lg rounded-xl"
              onClick={() => window.open('https://instagram.com/justdogs', '_blank')}
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
