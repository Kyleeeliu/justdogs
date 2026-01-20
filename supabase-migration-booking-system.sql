-- Professional Booking System Migration for Just Dogs App
-- This adds trainer availability management and prevents double booking

-- Create trainer_availability table
CREATE TABLE IF NOT EXISTS trainer_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=Sunday, 6=Saturday
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_time_range CHECK (end_time > start_time),
  CONSTRAINT unique_trainer_day_time UNIQUE (trainer_id, day_of_week, start_time, end_time)
);

-- Create trainer_exceptions table (for time off)
CREATE TABLE IF NOT EXISTS trainer_exceptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exception_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT valid_exception_time CHECK (
    (start_time IS NULL AND end_time IS NULL) OR 
    (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  )
);

-- Update the existing bookings table to use proper datetime fields and add constraints
-- First, check if we need to migrate from scheduled_date/scheduled_time to start_time/end_time
DO $$
BEGIN
  -- Add start_time and end_time columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'start_time') THEN
    ALTER TABLE bookings ADD COLUMN start_time TIMESTAMP WITH TIME ZONE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'end_time') THEN
    ALTER TABLE bookings ADD COLUMN end_time TIMESTAMP WITH TIME ZONE;
  END IF;

  -- Migrate data from scheduled_date/scheduled_time if they exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'scheduled_date') THEN
    UPDATE bookings 
    SET start_time = (scheduled_date + scheduled_time::time)::timestamp with time zone
    WHERE start_time IS NULL AND scheduled_date IS NOT NULL AND scheduled_time IS NOT NULL;
    
    -- Set end_time to start_time + 1 hour as default
    UPDATE bookings 
    SET end_time = start_time + INTERVAL '1 hour'
    WHERE end_time IS NULL AND start_time IS NOT NULL;
  END IF;
END $$;

-- Add parent_id column to bookings if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'parent_id') THEN
    ALTER TABLE bookings ADD COLUMN parent_id UUID REFERENCES users(id) ON DELETE CASCADE;
    
    -- Populate parent_id from dog ownership
    UPDATE bookings 
    SET parent_id = dogs.owner_id 
    FROM dogs 
    WHERE bookings.dog_id = dogs.id AND bookings.parent_id IS NULL;
  END IF;
END $$;

-- Make start_time and end_time NOT NULL after migration
ALTER TABLE bookings ALTER COLUMN start_time SET NOT NULL;
ALTER TABLE bookings ALTER COLUMN end_time SET NOT NULL;

-- Add constraint to ensure end_time is after start_time
ALTER TABLE bookings ADD CONSTRAINT valid_booking_time CHECK (end_time > start_time);

-- Add constraint to prevent bookings in the past (with some tolerance for ongoing bookings)
ALTER TABLE bookings ADD CONSTRAINT no_past_bookings CHECK (start_time > NOW() - INTERVAL '2 hours');

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_trainer_availability_trainer_day ON trainer_availability(trainer_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_trainer_availability_time ON trainer_availability(start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_trainer_exceptions_trainer_date ON trainer_exceptions(trainer_id, exception_date);
CREATE INDEX IF NOT EXISTS idx_bookings_trainer_time ON bookings(trainer_id, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_bookings_parent_id ON bookings(parent_id);
CREATE INDEX IF NOT EXISTS idx_bookings_time_range ON bookings(start_time, end_time);

-- Enable Row Level Security
ALTER TABLE trainer_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainer_exceptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for trainer_availability
CREATE POLICY "Trainers can manage their own availability" ON trainer_availability
  FOR ALL USING (
    auth.uid() = trainer_id OR 
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
  );

CREATE POLICY "Everyone can view trainer availability" ON trainer_availability
  FOR SELECT USING (true);

-- RLS Policies for trainer_exceptions
CREATE POLICY "Trainers can manage their own exceptions" ON trainer_exceptions
  FOR ALL USING (
    auth.uid() = trainer_id OR 
    auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
  );

CREATE POLICY "Everyone can view trainer exceptions" ON trainer_exceptions
  FOR SELECT USING (true);

-- Update RLS policies for bookings to include parent_id
DROP POLICY IF EXISTS "Users can view relevant bookings" ON bookings;
CREATE POLICY "Users can view relevant bookings" ON bookings FOR SELECT USING (
  auth.uid() = trainer_id OR
  auth.uid() = parent_id OR
  auth.uid() IN (SELECT owner_id FROM dogs WHERE id = dog_id) OR
  auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
);

DROP POLICY IF EXISTS "Users can create bookings" ON bookings;
CREATE POLICY "Users can create bookings" ON bookings FOR INSERT WITH CHECK (
  auth.uid() = parent_id OR
  auth.uid() IN (SELECT owner_id FROM dogs WHERE id = dog_id) OR
  auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
);

DROP POLICY IF EXISTS "Users can update relevant bookings" ON bookings;
CREATE POLICY "Users can update relevant bookings" ON bookings FOR UPDATE USING (
  auth.uid() = trainer_id OR
  auth.uid() = parent_id OR
  auth.uid() IN (SELECT owner_id FROM dogs WHERE id = dog_id) OR
  auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_trainer_availability_updated_at 
  BEFORE UPDATE ON trainer_availability 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trainer_exceptions_updated_at 
  BEFORE UPDATE ON trainer_exceptions 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to check for booking conflicts (prevents double booking)
CREATE OR REPLACE FUNCTION check_booking_conflict()
RETURNS TRIGGER AS $$
BEGIN
  -- Check for overlapping bookings with the same trainer
  IF EXISTS (
    SELECT 1 FROM bookings 
    WHERE trainer_id = NEW.trainer_id 
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    AND status NOT IN ('cancelled')
    AND (
      (NEW.start_time >= start_time AND NEW.start_time < end_time) OR
      (NEW.end_time > start_time AND NEW.end_time <= end_time) OR
      (NEW.start_time <= start_time AND NEW.end_time >= end_time)
    )
  ) THEN
    RAISE EXCEPTION 'Booking conflict: Trainer already has a booking during this time slot';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to prevent double booking
DROP TRIGGER IF EXISTS prevent_double_booking ON bookings;
CREATE TRIGGER prevent_double_booking
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_booking_conflict();

-- Function to get available time slots for a trainer on a specific date
CREATE OR REPLACE FUNCTION get_available_slots(
  p_trainer_id UUID,
  p_date DATE,
  p_slot_duration_minutes INTEGER DEFAULT 60
)
RETURNS TABLE(
  slot_start_time TIMESTAMP WITH TIME ZONE,
  slot_end_time TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  availability_record RECORD;
  slot_start TIMESTAMP WITH TIME ZONE;
  slot_end TIMESTAMP WITH TIME ZONE;
  day_of_week INTEGER;
BEGIN
  -- Get day of week (0=Sunday, 6=Saturday)
  day_of_week := EXTRACT(DOW FROM p_date);
  
  -- Loop through trainer's availability for this day
  FOR availability_record IN 
    SELECT start_time, end_time 
    FROM trainer_availability 
    WHERE trainer_id = p_trainer_id 
    AND day_of_week = day_of_week
    ORDER BY start_time
  LOOP
    -- Generate time slots within this availability window
    slot_start := p_date + availability_record.start_time;
    
    WHILE slot_start + (p_slot_duration_minutes || ' minutes')::INTERVAL <= p_date + availability_record.end_time LOOP
      slot_end := slot_start + (p_slot_duration_minutes || ' minutes')::INTERVAL;
      
      -- Check if this slot conflicts with existing bookings
      IF NOT EXISTS (
        SELECT 1 FROM bookings 
        WHERE trainer_id = p_trainer_id 
        AND status NOT IN ('cancelled')
        AND (
          (slot_start >= start_time AND slot_start < end_time) OR
          (slot_end > start_time AND slot_end <= end_time) OR
          (slot_start <= start_time AND slot_end >= end_time)
        )
      ) THEN
        -- Check if this slot conflicts with trainer exceptions
        IF NOT EXISTS (
          SELECT 1 FROM trainer_exceptions 
          WHERE trainer_id = p_trainer_id 
          AND exception_date = p_date
          AND (
            (start_time IS NULL) OR -- Full day exception
            (slot_start::TIME >= start_time AND slot_start::TIME < end_time) OR
            (slot_end::TIME > start_time AND slot_end::TIME <= end_time) OR
            (slot_start::TIME <= start_time AND slot_end::TIME >= end_time)
          )
        ) THEN
          -- This slot is available
          slot_start_time := slot_start;
          slot_end_time := slot_end;
          RETURN NEXT;
        END IF;
      END IF;
      
      -- Move to next slot
      slot_start := slot_start + (p_slot_duration_minutes || ' minutes')::INTERVAL;
    END LOOP;
  END LOOP;
  
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- Insert some sample trainer availability (optional - for testing)
-- This will only insert if the trainer users exist
INSERT INTO trainer_availability (trainer_id, day_of_week, start_time, end_time)
SELECT u.id, generate_series(1, 5) as day_of_week, '09:00'::time, '17:00'::time
FROM users u 
WHERE u.role = 'trainer'
ON CONFLICT (trainer_id, day_of_week, start_time, end_time) DO NOTHING;

-- Add weekend availability for trainers (Saturday mornings)
INSERT INTO trainer_availability (trainer_id, day_of_week, start_time, end_time)
SELECT u.id, 6 as day_of_week, '09:00'::time, '13:00'::time
FROM users u 
WHERE u.role = 'trainer'
ON CONFLICT (trainer_id, day_of_week, start_time, end_time) DO NOTHING;

COMMENT ON TABLE trainer_availability IS 'Stores weekly recurring availability for trainers';
COMMENT ON TABLE trainer_exceptions IS 'Stores one-time exceptions to trainer availability (time off, holidays, etc.)';
COMMENT ON FUNCTION get_available_slots IS 'Returns available booking slots for a trainer on a specific date';
COMMENT ON FUNCTION check_booking_conflict IS 'Prevents double booking by checking for time conflicts';