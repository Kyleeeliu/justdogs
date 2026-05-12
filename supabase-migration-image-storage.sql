-- Image Storage Migration
-- This creates a table for storing uploaded images and their metadata

-- Images Table for storing uploaded files
CREATE TABLE IF NOT EXISTS uploaded_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL, -- Path in Supabase storage
    file_url TEXT NOT NULL, -- Public URL to access the image
    file_size INTEGER NOT NULL, -- File size in bytes
    mime_type VARCHAR(100) NOT NULL, -- e.g., 'image/jpeg', 'image/png'
    width INTEGER, -- Image width in pixels
    height INTEGER, -- Image height in pixels
    alt_text TEXT, -- Alternative text for accessibility
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    entity_type VARCHAR(50), -- e.g., 'store_item', 'farm_photo', 'dog_profile'
    entity_id UUID, -- ID of the related entity (store item, booking, etc.)
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_uploaded_images_entity ON uploaded_images(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_uploaded_images_uploaded_by ON uploaded_images(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_uploaded_images_created ON uploaded_images(created_at);
CREATE INDEX IF NOT EXISTS idx_uploaded_images_active ON uploaded_images(is_active);

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_uploaded_images_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER trigger_uploaded_images_updated_at
    BEFORE UPDATE ON uploaded_images
    FOR EACH ROW
    EXECUTE FUNCTION update_uploaded_images_updated_at();

-- RLS (Row Level Security) Policies
ALTER TABLE uploaded_images ENABLE ROW LEVEL SECURITY;

-- Users can view images they uploaded or public images
CREATE POLICY "Users can view their own images" ON uploaded_images
    FOR SELECT USING (
        uploaded_by = auth.uid() 
        OR is_active = true -- Allow viewing active images for store items, etc.
    );

-- Users can upload images
CREATE POLICY "Users can upload images" ON uploaded_images
    FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

-- Users can update their own images
CREATE POLICY "Users can update their own images" ON uploaded_images
    FOR UPDATE USING (auth.uid() = uploaded_by);

-- Admins can manage all images
CREATE POLICY "Admins can manage all images" ON uploaded_images
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

-- Update store_items table to reference uploaded_images instead of direct URL
-- Add a foreign key to link store items to their images
ALTER TABLE store_items ADD COLUMN IF NOT EXISTS image_id UUID REFERENCES uploaded_images(id) ON DELETE SET NULL;

-- Create index for the new foreign key
CREATE INDEX IF NOT EXISTS idx_store_items_image ON store_items(image_id);

-- Supabase Storage Setup
-- You'll need to create a storage bucket called 'images' in your Supabase dashboard
-- Or run this in the Supabase SQL editor:

-- Create storage bucket for images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the images bucket
CREATE POLICY "Anyone can view images" ON storage.objects
    FOR SELECT USING (bucket_id = 'images');

CREATE POLICY "Authenticated users can upload images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'images' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can update their own images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete their own images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'images' 
        AND auth.uid()::text = (storage.foldername(name))[1]
    );

-- Admins can manage all images in storage
CREATE POLICY "Admins can manage all images in storage" ON storage.objects
    FOR ALL USING (
        bucket_id = 'images' 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'admin'
        )
    );

COMMENT ON TABLE uploaded_images IS 'Stores metadata for uploaded images with references to Supabase storage';
COMMENT ON COLUMN uploaded_images.file_path IS 'Path in Supabase storage bucket';
COMMENT ON COLUMN uploaded_images.file_url IS 'Public URL to access the image';
COMMENT ON COLUMN uploaded_images.entity_type IS 'Type of entity this image belongs to (store_item, farm_photo, etc.)';
COMMENT ON COLUMN uploaded_images.entity_id IS 'ID of the related entity';

-- Example usage:
-- When a store item image is uploaded:
-- 1. File is uploaded to Supabase storage bucket 'images' 
-- 2. Metadata is stored in uploaded_images table
-- 3. store_items.image_id references the uploaded_images.id
-- 4. To display: JOIN store_items with uploaded_images to get the file_url