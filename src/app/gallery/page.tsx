'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getGalleryImages, type GalleryImage } from '@/lib/supabase/content';

export default function GalleryPage() {
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGalleryImages = async () => {
      try {
        const images = await getGalleryImages(); // Only gets active images
        setGalleryImages(images);
      } catch (error) {
        console.error('Error loading gallery images:', error);
        // Fallback to default images if database fails
        setGalleryImages([]);
      } finally {
        setLoading(false);
      }
    };

    loadGalleryImages();
  }, []);

  // Fallback images if no database images are available
  const fallbackImages = [
    { url: '/1000524395.jpg', alt: 'Happy dog' },
    { url: '/1000524743.jpg', alt: 'Playful dog' },
    { url: '/1000525223.jpg', alt: 'Training dog' },
    { url: '/1000531276.jpg', alt: 'Cute dog' },
    { url: '/1000531400.jpg', alt: 'Adorable dog' },
    { url: '/1000532605.jpg', alt: 'Friendly dog' },
    { url: '/1000532661.jpg', alt: 'Loving dog' },
    { url: '/1000538234.jpg', alt: 'Beautiful dog' },
    { url: '/1000539282.jpg', alt: 'Sweet dog' },
    { url: '/1000543258.jpg', alt: 'Amazing dog' }
  ];

  const imagesToDisplay = galleryImages.length > 0 ? galleryImages : fallbackImages.map((img, index) => ({
    id: `fallback-${index}`,
    image_url: img.url,
    title: img.alt,
    description: '',
    dog_name: '',
    display_order: index,
    active: true
  }));

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
          <h1 className="text-4xl font-bold text-[rgb(0_32_96)] mb-4">Our Happy Dogs</h1>
          <p className="text-lg text-gray-700 max-w-3xl mx-auto">
            Meet some of the amazing dogs we've had the pleasure of working with. 
            These photos are updated monthly to showcase our latest furry friends!
          </p>
        </div>

        {/* Gallery Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(0_32_96)]"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
            {imagesToDisplay.map((image, index) => (
              <div key={image.id} className="relative aspect-square rounded-lg overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 group">
                <img
                  src={image.image_url}
                  alt={image.title || image.dog_name || `Happy dog ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  onError={(e) => {
                    // Fallback to a default image if the URL fails
                    (e.target as HTMLImageElement).src = '/api/placeholder/400/400';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                {(image.title || image.dog_name) && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <p className="text-white text-sm font-medium">
                      {image.dog_name || image.title}
                    </p>
                    {image.description && (
                      <p className="text-white/80 text-xs mt-1 line-clamp-2">
                        {image.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Social Media Section */}
        <div className="text-center bg-white rounded-2xl p-8 shadow-lg mb-8">
          <h2 className="text-3xl font-bold text-[rgb(0_32_96)] mb-4">
            📸 Follow Our Journey
          </h2>
          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto">
            See more photos and updates from our daily adventures with dogs on our social media!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-lg rounded-xl"
              onClick={() => window.open('https://facebook.com/justdogs', '_blank')}
            >
              📘 Facebook
            </Button>
            <Button 
              size="lg" 
              className="bg-pink-600 hover:bg-pink-700 text-white px-8 py-4 text-lg rounded-xl"
              onClick={() => window.open('https://instagram.com/justdogs', '_blank')}
            >
              📷 Instagram
            </Button>
          </div>
        </div>

        {/* Call to Action */}
        <div className="text-center bg-white rounded-2xl p-8 shadow-lg">
          <h2 className="text-3xl font-bold text-[rgb(0_32_96)] mb-4">
            Want Your Dog to Join Our Gallery?
          </h2>
          <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto">
            Book a session with our team and your furry friend could be featured in our next gallery update!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/services">
              <Button 
                size="lg" 
                className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white px-8 py-4 text-lg rounded-xl"
              >
                Book a Session
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="lg" 
              className="border-2 border-[rgb(0_32_96)] text-[rgb(0_32_96)] hover:bg-[rgb(0_32_96)] hover:text-white px-8 py-4 text-lg rounded-xl"
              onClick={() => window.open('https://justdogs.co.za', '_blank')}
            >
              Visit Our Website
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
