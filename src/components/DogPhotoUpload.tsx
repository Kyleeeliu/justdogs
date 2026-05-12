'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PhotoIcon, CheckIcon } from '@heroicons/react/24/outline';
import { authenticatedFetch } from '@/lib/api/apiClient';

interface DogPhotoUploadProps {
  availableDogs: Array<{ id: string; name: string }>;
  onUploadComplete?: () => void;
}

export function DogPhotoUpload({ availableDogs, onUploadComplete }: DogPhotoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [photoDate, setPhotoDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedDogIds, setSelectedDogIds] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setError('');
    setSelectedFile(file);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(URL.createObjectURL(file));
  };

  const toggleDog = (dogId: string) => {
    setSelectedDogIds((prev) => {
      const next = new Set(prev);
      if (next.has(dogId)) {
        next.delete(dogId);
      } else {
        next.add(dogId);
      }
      return next;
    });
  };

  const handleUpload = async () => {
    if (!selectedFile || selectedDogIds.size === 0 || !photoDate) {
      setError('Please select a photo, tag at least one dog, and set a date');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `dog-photos/${fileName}`;

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('path', filePath);

      const uploadResponse = await authenticatedFetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.json();
        throw new Error(uploadError.error || 'Failed to upload file');
      }

      const { url: photoUrl } = await uploadResponse.json();

      const photoResponse = await authenticatedFetch('/api/dog-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photo_url: photoUrl,
          caption: caption || undefined,
          photo_date: photoDate,
          dog_ids: Array.from(selectedDogIds),
        }),
      });

      if (!photoResponse.ok) {
        const photoError = await photoResponse.json();
        throw new Error(photoError.error || 'Failed to save photo');
      }

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(null);
      setPreviewUrl('');
      setCaption('');
      setSelectedDogIds(new Set());
      setPhotoDate(new Date().toISOString().split('T')[0]);
      onUploadComplete?.();
    } catch (err: unknown) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2">
          <PhotoIcon className="h-5 w-5" />
          Upload dog photo
        </CardTitle>
      </CardHeader>

      <CardContent className="pt-6 space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Photo <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-[rgb(0_32_96)] file:text-white hover:file:bg-[rgb(0_24_72)] file:cursor-pointer"
          />
          {previewUrl && (
            <div className="mt-2 relative w-full max-w-md aspect-square rounded-lg border-2 border-gray-300 overflow-hidden bg-gray-100">
              <Image src={previewUrl} alt="Preview" fill className="object-contain" unoptimized />
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Photo date <span className="text-red-500">*</span>
          </label>
          <Input
            type="date"
            value={photoDate}
            onChange={(e) => setPhotoDate(e.target.value)}
            disabled={uploading}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Caption (optional)</label>
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a short caption…"
            rows={2}
            disabled={uploading}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Tag dogs <span className="text-red-500">*</span>
          </label>
          <p className="text-sm text-gray-500">Select every dog that appears in this photo.</p>
          {availableDogs.length === 0 ? (
            <p className="text-sm text-amber-700">No dogs available to tag.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableDogs.map((dog) => {
                const selected = selectedDogIds.has(dog.id);
                return (
                  <button
                    key={dog.id}
                    type="button"
                    onClick={() => toggleDog(dog.id)}
                    disabled={uploading}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md border-2 text-sm font-medium transition-colors ${
                      selected
                        ? 'border-[rgb(0_32_96)] bg-blue-50 text-[rgb(0_32_96)]'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <span
                      className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 ${
                        selected ? 'bg-[rgb(0_32_96)] border-[rgb(0_32_96)]' : 'border-gray-300'
                      }`}
                    >
                      {selected && <CheckIcon className="h-3 w-3 text-white" />}
                    </span>
                    {dog.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <Button
          onClick={handleUpload}
          disabled={uploading || !selectedFile || selectedDogIds.size === 0 || !photoDate || availableDogs.length === 0}
          className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </Button>
      </CardContent>
    </Card>
  );
}
