-- Supabase Storage Setup for News Attachments
-- Run this in your Supabase SQL Editor to set up the storage bucket and policies

-- Create the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'news-attachments',
  'news-attachments',
  true,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the storage bucket
-- Allow authenticated users (admins) to upload files
CREATE POLICY "Allow admins to upload news attachments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'news-attachments' 
  AND auth.role() = 'authenticated'
  AND auth.uid()::text IN (SELECT id::text FROM users WHERE role = 'admin')
);

-- Allow public read access to news attachments (for published news items)
CREATE POLICY "Allow public read access to news attachments" ON storage.objects
FOR SELECT USING (bucket_id = 'news-attachments');

-- Allow admins to update news attachments
CREATE POLICY "Allow admins to update news attachments" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'news-attachments' 
  AND auth.role() = 'authenticated'
  AND auth.uid()::text IN (SELECT id::text FROM users WHERE role = 'admin')
);

-- Allow admins to delete news attachments
CREATE POLICY "Allow admins to delete news attachments" ON storage.objects
FOR DELETE USING (
  bucket_id = 'news-attachments' 
  AND auth.role() = 'authenticated'
  AND auth.uid()::text IN (SELECT id::text FROM users WHERE role = 'admin')
);

-- Enable RLS on the storage.objects table if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
