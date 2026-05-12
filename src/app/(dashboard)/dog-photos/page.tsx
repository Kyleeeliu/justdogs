'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { useAuth } from '@/hooks/useAuth';
import { DogPhotoUpload } from '@/components/DogPhotoUpload';
import { Button } from '@/components/ui/button';
import { authenticatedDelete, authenticatedGet } from '@/lib/api/apiClient';
import { TrashIcon, PhotoIcon } from '@heroicons/react/24/outline';

type DogOption = { id: string; name: string };

type DogPhotoRow = {
  id: string;
  photo_url: string;
  caption?: string | null;
  photo_date: string;
  dog_names?: string[];
  uploader_name?: string;
};

export default function DogPhotosPage() {
  const { user } = useAuth();
  const [dogs, setDogs] = useState<DogOption[]>([]);
  const [photos, setPhotos] = useState<DogPhotoRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDogs = useCallback(async () => {
    const res = await authenticatedGet('/api/dogs');
    if (!res.ok) return;
    const data = await res.json();
    const list = (data.dogs || []) as Array<{ id: string; name: string }>;
    setDogs(list.map((d) => ({ id: d.id, name: d.name })));
  }, []);

  const loadPhotos = useCallback(async () => {
    const res = await authenticatedGet('/api/dog-photos');
    if (!res.ok) {
      setPhotos([]);
      return;
    }
    const data = await res.json();
    setPhotos(Array.isArray(data) ? data : []);
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadDogs(), loadPhotos()]);
    } finally {
      setLoading(false);
    }
  }, [loadDogs, loadPhotos]);

  useEffect(() => {
    if (user?.role === 'admin' || user?.role === 'trainer') {
      void refresh();
    } else {
      setLoading(false);
    }
  }, [user?.role, refresh]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this photo?')) return;
    const res = await authenticatedDelete(`/api/dog-photos?id=${encodeURIComponent(id)}`);
    if (res.ok) {
      await loadPhotos();
    }
  };

  if (user?.role !== 'admin' && user?.role !== 'trainer') {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access denied</h3>
        <p className="text-gray-600">Only trainers and admins can manage dog photos here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <PhotoIcon className="h-8 w-8" />
          Dog photos
        </h1>
        <p className="text-gray-600 mt-1">
          Upload photos and tag every dog that appears in each image. Parents only see photos that include their dogs.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[rgb(0_32_96)]" />
        </div>
      ) : (
        <>
          <DogPhotoUpload availableDogs={dogs} onUploadComplete={() => void loadPhotos()} />

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Gallery</h2>
            {photos.length === 0 ? (
              <p className="text-gray-500 text-sm">No dog photos yet.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <div key={photo.id} className="relative group rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                    <button
                      type="button"
                      onClick={() => window.open(photo.photo_url, '_blank')}
                      className="relative block w-full aspect-square"
                    >
                      <Image
                        src={photo.photo_url}
                        alt={photo.caption || 'Dog photo'}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 50vw, 25vw"
                        unoptimized
                      />
                      {photo.dog_names && photo.dog_names.length > 0 && (
                        <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs py-1 px-2 truncate">
                          {photo.dog_names.join(', ')}
                        </span>
                      )}
                    </button>
                    <div className="p-2 flex items-start justify-between gap-2">
                      <div className="min-w-0 text-xs text-gray-600">
                        <div>{photo.photo_date}</div>
                        {photo.uploader_name && <div className="truncate">by {photo.uploader_name}</div>}
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 h-8 w-8 p-0 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => void handleDelete(photo.id)}
                        aria-label="Delete photo"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
