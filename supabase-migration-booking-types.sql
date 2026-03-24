-- Booking Types table
-- Stores the different service types that can be booked

CREATE TABLE IF NOT EXISTS booking_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  duration_minutes INTEGER NOT NULL DEFAULT 60,
  price_per_dog INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed the 4 default booking types
INSERT INTO booking_types (name, category, duration_minutes, price_per_dog, is_active)
VALUES
  ('Behaviour & Home', 'behavior_and_home', 60, 0, true),
  ('Academy', 'academy', 60, 0, true),
  ('Farm', 'farm', 60, 0, true),
  ('Service & Emotional Support', 'service_and_emotional_support', 60, 0, true)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE booking_types ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read active booking types
CREATE POLICY "Anyone can view active booking types"
  ON booking_types FOR SELECT
  USING (is_active = true);

-- Allow admins to manage booking types (via service role key, so no RLS policy needed for write)
