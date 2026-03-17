-- Add trainer_notes to bookings (for trainer feedback per session)
-- Run in Supabase SQL Editor.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'bookings' AND column_name = 'trainer_notes'
  ) THEN
    ALTER TABLE bookings ADD COLUMN trainer_notes TEXT;
    COMMENT ON COLUMN bookings.trainer_notes IS 'Trainer (or admin) session feedback visible to parent and other trainers.';
  END IF;
END $$;
