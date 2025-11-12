-- Migration to add media columns to messages table
-- Run this if you already have an existing messages table

-- Add media columns to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_type VARCHAR(50) CHECK (media_type IN ('image', 'video'));
ALTER TABLE messages ADD COLUMN IF NOT EXISTS media_thumbnail_url TEXT;

-- Create storage bucket for message media if it doesn't exist
-- Note: This needs to be done in Supabase Storage UI or via supabase CLI
-- Bucket name: message-media
-- Settings:
--   - Public: true (so media can be accessed via public URLs)
--   - File size limit: 10MB
--   - Allowed MIME types: image/*, video/*

-- Create storage policy for message media (run after creating the bucket)
-- This allows authenticated users to upload files
CREATE POLICY "Authenticated users can upload message media" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'message-media' 
    AND auth.role() = 'authenticated'
  );

-- Allow public read access to message media
CREATE POLICY "Public can view message media" ON storage.objects
  FOR SELECT
  USING (bucket_id = 'message-media');

-- Allow users to delete their own uploaded media
CREATE POLICY "Users can delete their own message media" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'message-media' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Add index for media queries
CREATE INDEX IF NOT EXISTS idx_messages_media_url ON messages(media_url) WHERE media_url IS NOT NULL;

