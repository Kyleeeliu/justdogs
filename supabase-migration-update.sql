-- Add missing approval_status column to users table
-- This is needed for trainer approval workflow

ALTER TABLE users ADD COLUMN IF NOT EXISTS approval_status VARCHAR(50) DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Update existing users to have approved status
UPDATE users SET approval_status = 'approved' WHERE approval_status IS NULL;

-- Create index for approval_status for better performance
CREATE INDEX IF NOT EXISTS idx_users_approval_status ON users(approval_status);

-- Update RLS policies to handle approval status
DROP POLICY IF EXISTS "Users can view all users" ON users;
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);

-- Add policy for trainers pending approval
CREATE POLICY "Trainers can be viewed even when pending" ON users FOR SELECT USING (
  role = 'trainer' OR approval_status = 'approved'
);