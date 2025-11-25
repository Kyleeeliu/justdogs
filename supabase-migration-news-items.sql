-- Migration to create news_items table for storing news, events, and announcements
-- Run this in your Supabase SQL Editor

-- Create news_items table
CREATE TABLE IF NOT EXISTS news_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  type TEXT NOT NULL CHECK (type IN ('news', 'event', 'announcement')),
  published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_news_items_type ON news_items(type);
CREATE INDEX IF NOT EXISTS idx_news_items_published ON news_items(published);
CREATE INDEX IF NOT EXISTS idx_news_items_date ON news_items(date DESC);

-- Enable Row Level Security
ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view published news items" ON news_items;
DROP POLICY IF EXISTS "Admins can manage news items" ON news_items;

-- RLS Policies
-- Public can view published news items
CREATE POLICY "Anyone can view published news items" ON news_items
FOR SELECT USING (published = true);

-- Admins can insert, update, and delete news items
CREATE POLICY "Admins can manage news items" ON news_items
FOR ALL USING (
  auth.uid() IS NOT NULL AND
  auth.uid()::text IN (SELECT id::text FROM users WHERE role = 'admin')
);

-- Create trigger to update updated_at timestamp
CREATE TRIGGER update_news_items_updated_at 
BEFORE UPDATE ON news_items 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Insert default news items (optional - can be removed if you don't want defaults)
INSERT INTO news_items (title, content, date, type, published) VALUES
  ('New Training Program Launch', 'We''re excited to announce our new "Puppy Foundations" program designed specifically for puppies aged 8-16 weeks. Early bird registration now open!', '2024-01-15', 'news', true),
  ('Team Expansion', 'Welcome our newest team member, Emma, who specializes in service dog training. She brings 5 years of experience in emotional support animal programs.', '2024-01-10', 'news', true),
  ('Puppy Socialization Day', 'Join us for a fun-filled day of puppy socialization and early training tips. Perfect for puppies 8-16 weeks old.', '2024-02-10', 'event', true),
  ('Advanced Training Workshop', 'Intensive workshop for experienced dog owners looking to take their training to the next level. Limited spots available.', '2024-02-24', 'event', true),
  ('Service Dog Awareness Day', 'Learn about service dogs and emotional support animals. Meet our trained service dogs and their handlers. Free event for the community.', '2024-03-15', 'event', true),
  ('New Client Special', 'Get 20% off your first training session when you book before February 29th, 2024!', '2024-01-20', 'announcement', true),
  ('Referral Program', 'Refer a friend and both you and your friend get a free consultation session!', '2024-01-25', 'announcement', true)
ON CONFLICT DO NOTHING;

