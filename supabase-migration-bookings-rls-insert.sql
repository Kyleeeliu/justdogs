-- Fix bookings RLS INSERT policy so any allowed role can create bookings
-- Run this in Supabase SQL Editor if you get "new row violates row-level security policy for table bookings"

-- Drop existing insert policy (name may exist from migration or booking-system)
DROP POLICY IF EXISTS "Users can create bookings" ON bookings;

-- Allow INSERT when:
-- 1. User is the parent (booking for themselves)
-- 2. User is the trainer (trainer creating booking for a client)
-- 3. User is the dog owner (legacy / same as parent)
-- 4. User is an admin
-- Use ::text comparisons to avoid UUID type mismatches with auth.uid()
CREATE POLICY "Users can create bookings" ON bookings
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    auth.uid()::text = parent_id::text
    OR auth.uid()::text = trainer_id::text
    OR auth.uid()::text IN (SELECT owner_id::text FROM dogs WHERE id = dog_id)
    OR auth.uid()::text IN (SELECT id::text FROM users WHERE role = 'admin')
  )
);
