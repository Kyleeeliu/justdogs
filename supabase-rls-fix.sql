-- Fix RLS policies to allow authentication flow to work properly
-- Run this in your Supabase SQL Editor

-- Drop existing policies for users table
DROP POLICY IF EXISTS "Users can view all users" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;

-- Create new RLS policies for users table that allow authentication flow
-- Allow public read access for authentication (needed for login flow)
CREATE POLICY "Allow public read access for authentication" ON users 
FOR SELECT USING (true);

-- Allow users to update their own profile (authenticated users only)
CREATE POLICY "Users can update their own profile" ON users 
FOR UPDATE USING (auth.uid()::text = id::text);

-- Allow authenticated users to insert their own profile
CREATE POLICY "Users can insert their own profile" ON users 
FOR INSERT WITH CHECK (auth.uid()::text = id::text);

-- Update messages policies to handle null auth.uid() gracefully
DROP POLICY IF EXISTS "Users can view their own messages" ON messages;
CREATE POLICY "Users can view their own messages" ON messages FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    auth.uid()::text = sender_id::text OR 
    auth.uid()::text = recipient_id::text OR 
    (is_announcement = true AND auth.uid()::text IN (SELECT id::text FROM users WHERE role = 'admin'))
  )
);

-- Update dogs policies to handle null auth.uid() gracefully  
DROP POLICY IF EXISTS "Users can view dogs they own or are trainers for" ON dogs;
CREATE POLICY "Users can view dogs they own or are trainers for" ON dogs FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    auth.uid()::text = owner_id::text OR 
    auth.uid()::text IN (SELECT id::text FROM users WHERE role IN ('trainer', 'admin'))
  )
);

-- Update bookings policies to handle null auth.uid() gracefully
DROP POLICY IF EXISTS "Users can view relevant bookings" ON bookings;
CREATE POLICY "Users can view relevant bookings" ON bookings FOR SELECT USING (
  auth.uid() IS NOT NULL AND auth.uid()::text IN (
    SELECT owner_id::text FROM dogs WHERE id::text = dog_id::text
    UNION
    SELECT trainer_id::text FROM bookings WHERE trainer_id::text = auth.uid()::text
    UNION
    SELECT id::text FROM users WHERE role = 'admin'
  )
);

-- Update sessions policies to handle null auth.uid() gracefully
DROP POLICY IF EXISTS "Users can view relevant sessions" ON sessions;
CREATE POLICY "Users can view relevant sessions" ON sessions FOR SELECT USING (
  auth.uid() IS NOT NULL AND (
    auth.uid()::text = trainer_id::text OR
    auth.uid()::text = parent_id::text OR
    auth.uid()::text IN (SELECT id::text FROM users WHERE role = 'admin')
  )
);

-- Ensure the users table has the correct structure
-- Add approval_status column if it doesn't exist (from the update migration)
ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected'));