'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { XMarkIcon, PhotoIcon, CheckIcon } from '@heroicons/react/24/outline';
import { authenticatedFetch } from '@/lib/api/apiClient';

interface FarmPhotoUploadProps {
  bookingId: string;
  availableDogs: Array<{ id: string; name: string }>;
  onUploadComplete?: () => void;
  onClose?: () => void;
}

export function FarmPhotoUpload({ bookingId, availableDogs, onUploadComplete, onClose }: FarmPhotoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [caption, setCaption] = useState('');
  const [photoDate, setPhotoDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedDogIds, setSelectedDogIds] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Cleanup preview URL on unmount
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    setError('');
    setSelectedFile(file);
    
    // Create preview
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const toggleDog = (dogId: string) => {
    setSelectedDogIds(prev => {
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
      // 1. Upload file to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `farm-photos/${fileName}`;

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

      // 2. Create farm photo record
      const photoResponse = await authenticatedFetch('/api/farm-photos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
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

      // Success!
      setSelectedFile(null);
      setPreviewUrl('');
      setCaption('');
      setSelectedDogIds(new Set());
      setPhotoDate(new Date().toISOString().split('T')[0]);
      
      if (onUploadComplete) {
        onUploadComplete();
      }
      if (onClose) {
        onClose();
      }
    } catch (err: any) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload photo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <PhotoIcon className="h-5 w-5" />
            Upload Farm Photo
          </CardTitle>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose} disabled={uploading}>
              <XMarkIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-4">
        {/* File selector */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Select Photo <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={uploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-[rgb(0_32_96)] file:text-white hover:file:bg-[rgb(0_24_72)] file:cursor-pointer"
          />
          {previewUrl && (
            <div className="mt-2 relative w-full max-w-md">
              <img src={previewUrl} alt="Preview" className="rounded-lg border-2 border-gray-300 w-full" />
            </div>
          )}
        </div>

        {/* Date picker */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Photo Date <span className="text-red-500">*</span>
          </label>
          <Input
            type="date"
            value={photoDate}
            onChange={(e) => setPhotoDate(e.target.value)}
            disabled={uploading}
          />
        </div>

        {/* Caption */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Caption (optional)
          </label>
          <Textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption for this photo..."
            rows={3}
            disabled={uploading}
          />
        </div>

        {/* Dog tags */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            Tag Dogs <span className="text-red-500">*</span>
          </label>
          <p className="text-sm text-gray-500">Select all dogs in this photo</p>
          <div className="grid grid-cols-2 gap-2">
            {availableDogs.map(dog => {
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
                  <div className={`w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center ${
                    selected ? 'bg-[rgb(0_32_96)] border-[rgb(0_32_96)]' : 'border-gray-300'
                  }`}>
                    {selected && <CheckIcon className="h-3 w-3 text-white" />}
                  </div>
                  {dog.name}
                </button>
              );
            })}
          </div>
          {selectedDogIds.size === 0 && (
            <p className="text-xs text-amber-600">Please tag at least one dog</p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          {onClose && (
            <Button variant="outline" onClick={onClose} disabled={uploading}>
              Cancel
            </Button>
          )}
          <Button
            onClick={handleUpload}
            disabled={uploading || !selectedFile || selectedDogIds.size === 0 || !photoDate}
            className="bg-[rgb(0_32_96)] hover:bg-[rgb(0_24_72)] text-white"
          >
            {uploading ? 'Uploading...' : 'Upload Photo'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
