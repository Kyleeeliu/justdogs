-- Farm bookings (whole-day) and parent verification
-- Run after base migrations (bookings, users exist).

-- Ensure update_updated_at exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1) Add duration_type to bookings (minutes vs days for farm bookings)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'duration_type'
  ) THEN
    ALTER TABLE bookings ADD COLUMN duration_type VARCHAR(20) DEFAULT 'minutes'
      CHECK (duration_type IN ('minutes', 'days'));
    COMMENT ON COLUMN bookings.duration_type IS 'Duration unit: minutes for timed sessions, days for farm bookings';
  END IF;
END $$;

-- 2) Add duration_days to bookings (for farm bookings measured in days)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'duration_days'
  ) THEN
    ALTER TABLE bookings ADD COLUMN duration_days INTEGER;
    COMMENT ON COLUMN bookings.duration_days IS 'Duration in days for farm bookings (whole-day stays)';
  END IF;
END $$;

-- 3) Add verification_status to users (for parent verification before booking)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'verification_status'
  ) THEN
    ALTER TABLE users ADD COLUMN verification_status VARCHAR(50) DEFAULT 'pending'
      CHECK (verification_status IN ('pending', 'verified', 'rejected'));
    COMMENT ON COLUMN users.verification_status IS 'For parents: pending until admin verifies; trainers/admins default verified';
    
    -- Backfill: trainers and admins are auto-verified; parents stay pending
    UPDATE users SET verification_status = 'verified' WHERE role IN ('trainer', 'admin');
  END IF;
END $$;

COMMENT ON TABLE bookings IS 'Bookings: farm bookings use duration_type=days, others use minutes';
COMMENT ON TABLE users IS 'Users: parents need verification_status=verified before booking';
