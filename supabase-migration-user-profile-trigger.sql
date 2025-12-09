-- Migration to automatically create user profiles when auth users are created
-- This solves the RLS issue by using a trigger that runs with elevated privileges
-- Run this in your Supabase SQL Editor

-- Create a function that will be called by the trigger
-- This function runs with SECURITY DEFINER, so it can bypass RLS
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  user_full_name TEXT;
  approval_status_value TEXT;
BEGIN
  -- Extract role and full_name from user metadata
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'parent');
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1));
  
  -- Set approval_status based on role
  IF user_role = 'trainer' THEN
    approval_status_value := 'pending';
  ELSE
    approval_status_value := 'approved';
  END IF;
  
  -- Insert into public.users table
  INSERT INTO public.users (id, email, full_name, role, approval_status, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    user_full_name,
    user_role,
    approval_status_value,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- Prevent errors if profile already exists
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger that fires after a new user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also update the RLS policy to ensure it allows the insert
-- Drop and recreate the insert policy to be more explicit
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
CREATE POLICY "Users can insert their own profile" ON users 
FOR INSERT 
WITH CHECK (auth.uid()::text = id::text);

-- Add a comment explaining the trigger
COMMENT ON FUNCTION public.handle_new_user() IS 
'Automatically creates a user profile in public.users when a new auth user is created. Runs with SECURITY DEFINER to bypass RLS.';
