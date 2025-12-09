-- Migration to ensure bookings table has the correct schema
-- Run this in your Supabase SQL Editor if you get "scheduled_date column not found" errors

-- Check if scheduled_date column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'bookings' 
        AND column_name = 'scheduled_date'
    ) THEN
        -- Add scheduled_date and scheduled_time columns
        ALTER TABLE bookings 
        ADD COLUMN scheduled_date DATE,
        ADD COLUMN scheduled_time TIME;
        
        -- Migrate existing data from start_time/end_time if they exist
        IF EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'bookings' 
            AND column_name = 'start_time'
        ) THEN
            UPDATE bookings 
            SET 
                scheduled_date = DATE(start_time),
                scheduled_time = start_time::TIME
            WHERE scheduled_date IS NULL;
        END IF;
        
        -- Make columns NOT NULL after migration
        ALTER TABLE bookings 
        ALTER COLUMN scheduled_date SET NOT NULL,
        ALTER COLUMN scheduled_time SET NOT NULL;
        
        RAISE NOTICE 'Added scheduled_date and scheduled_time columns to bookings table';
    ELSE
        RAISE NOTICE 'scheduled_date column already exists';
    END IF;
END $$;

-- Verify the schema
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings'
ORDER BY ordinal_position;
