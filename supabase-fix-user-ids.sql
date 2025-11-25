-- Fix user IDs to match Supabase Auth IDs
-- This script helps resolve foreign key constraint violations
-- Run this in your Supabase SQL Editor

-- First, let's see which users might have mismatched IDs
-- Check if there are users in auth.users that don't have matching entries in users table
SELECT 
  au.id as auth_id,
  au.email,
  u.id as users_table_id,
  CASE 
    WHEN u.id IS NULL THEN 'Missing in users table'
    WHEN u.id != au.id THEN 'ID mismatch'
    ELSE 'OK'
  END as status
FROM auth.users au
LEFT JOIN users u ON u.id = au.id
ORDER BY au.email;

-- If you need to fix users, you can use this approach:
-- 1. For users that exist in auth but not in users table, create them:
--    (This should be done via the application code, but here's the SQL if needed)

-- 2. For users with ID mismatches, you'll need to:
--    a. Update foreign key references first
--    b. Then update the user ID
--    c. This is complex and should be done carefully

-- Better approach: Use the application code to create users with matching IDs
-- The updated createUser function now accepts a userId parameter to ensure IDs match

-- To verify all users have matching IDs:
SELECT 
  COUNT(*) as total_auth_users,
  COUNT(u.id) as users_with_profiles,
  COUNT(*) - COUNT(u.id) as missing_profiles
FROM auth.users au
LEFT JOIN users u ON u.id = au.id;

-- If missing_profiles > 0, those users need to be created via the application
-- The application will automatically create them on next login

