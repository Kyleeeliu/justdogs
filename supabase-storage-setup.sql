-- Supabase Storage Setup for Gallery Images
-- Run this in your Supabase SQL Editor to set up the storage bucket and policies

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'gallery-images',
  'gallery-images',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the storage bucket
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload gallery images" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'gallery-images' 
  AND auth.role() = 'authenticated'
);

-- Allow public read access to gallery images
CREATE POLICY "Allow public read access to gallery images" ON storage.objects
FOR SELECT USING (bucket_id = 'gallery-images');

-- Allow authenticated users to update their uploaded files
CREATE POLICY "Allow authenticated users to update gallery images" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'gallery-images' 
  AND auth.role() = 'authenticated'
);

-- Allow authenticated users to delete gallery images
CREATE POLICY "Allow authenticated users to delete gallery images" ON storage.objects
FOR DELETE USING (
  bucket_id = 'gallery-images' 
  AND auth.role() = 'authenticated'
);

-- Enable RLS on the storage.objects table if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;