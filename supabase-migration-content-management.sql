-- Migration for content management (services, team, gallery)
-- Run this in your Supabase SQL Editor

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('behaviour', 'farm', 'academy', 'service')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create team_members table
CREATE TABLE IF NOT EXISTS team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  role VARCHAR(255) NOT NULL,
  bio TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create gallery_images table
CREATE TABLE IF NOT EXISTS gallery_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url TEXT NOT NULL,
  title VARCHAR(255),
  description TEXT,
  dog_name VARCHAR(255),
  display_order INTEGER DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add filter columns to messages table for advanced announcement filtering
ALTER TABLE messages ADD COLUMN IF NOT EXISTS filter_service_types TEXT[];
ALTER TABLE messages ADD COLUMN IF NOT EXISTS filter_service_categories TEXT[];
ALTER TABLE messages ADD COLUMN IF NOT EXISTS filter_trainer_ids UUID[];
ALTER TABLE messages ADD COLUMN IF NOT EXISTS filter_next_service_before DATE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS filter_next_service_after DATE;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_services_category ON services(category);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(active);
CREATE INDEX IF NOT EXISTS idx_team_members_active ON team_members(active);
CREATE INDEX IF NOT EXISTS idx_gallery_images_active ON gallery_images(active);
CREATE INDEX IF NOT EXISTS idx_gallery_images_display_order ON gallery_images(display_order);
CREATE INDEX IF NOT EXISTS idx_messages_filter_trainer_ids ON messages USING GIN(filter_trainer_ids);

-- Enable Row Level Security
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view active services" ON services;
DROP POLICY IF EXISTS "Admins can manage services" ON services;
DROP POLICY IF EXISTS "Anyone can view active team members" ON team_members;
DROP POLICY IF EXISTS "Admins can manage team members" ON team_members;
DROP POLICY IF EXISTS "Anyone can view active gallery images" ON gallery_images;
DROP POLICY IF EXISTS "Admins can manage gallery images" ON gallery_images;

-- RLS Policies for services
CREATE POLICY "Anyone can view active services" ON services
FOR SELECT USING (active = true);

CREATE POLICY "Admins can manage services" ON services
FOR ALL USING (
  auth.uid() IS NOT NULL AND
  auth.uid()::text IN (SELECT id::text FROM users WHERE role = 'admin')
);

-- RLS Policies for team_members
CREATE POLICY "Anyone can view active team members" ON team_members
FOR SELECT USING (active = true);

CREATE POLICY "Admins can manage team members" ON team_members
FOR ALL USING (
  auth.uid() IS NOT NULL AND
  auth.uid()::text IN (SELECT id::text FROM users WHERE role = 'admin')
);

-- RLS Policies for gallery_images
CREATE POLICY "Anyone can view active gallery images" ON gallery_images
FOR SELECT USING (active = true);

CREATE POLICY "Admins can manage gallery images" ON gallery_images
FOR ALL USING (
  auth.uid() IS NOT NULL AND
  auth.uid()::text IN (SELECT id::text FROM users WHERE role = 'admin')
);

-- Create triggers to update updated_at timestamp
CREATE TRIGGER update_services_updated_at 
BEFORE UPDATE ON services 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_team_members_updated_at 
BEFORE UPDATE ON team_members 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gallery_images_updated_at 
BEFORE UPDATE ON gallery_images 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Insert default services (optional - can be removed if you don't want defaults)
INSERT INTO services (name, description, category, active) VALUES
  ('Behaviour & Home', 'Professional behavior modification and home-based training to help your dog become a well-behaved family member.', 'behaviour', true),
  ('Farm', 'Specialized farm dog training and working dog programs designed for agricultural and rural environments.', 'farm', true),
  ('Academy', 'Comprehensive training programs and educational courses for dogs and their owners to build strong foundations.', 'academy', true),
  ('Service & Emotional Support', 'Specialized training for service dogs and emotional support animals to provide assistance and companionship.', 'service', true)
ON CONFLICT DO NOTHING;

