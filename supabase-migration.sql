-- Supabase Migration Script for Just Dogs App
-- Run this in your Supabase SQL Editor to create the required tables

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'trainer', 'parent', 'behaviorist')),
  phone VARCHAR(50),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES users(id) ON DELETE CASCADE,
  subject VARCHAR(500) NOT NULL,
  content TEXT NOT NULL,
  is_announcement BOOLEAN DEFAULT FALSE,
  target_roles TEXT[] DEFAULT '{}',
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dogs table
CREATE TABLE IF NOT EXISTS dogs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  breed VARCHAR(255) NOT NULL,
  age DECIMAL(3,1) NOT NULL,
  weight DECIMAL(5,1),
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  medical_notes TEXT,
  behavioral_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  booking_type VARCHAR(100) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  location VARCHAR(255),
  special_instructions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sessions table
CREATE TABLE IF NOT EXISTS sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(50) NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_dogs_owner_id ON dogs(owner_id);
CREATE INDEX IF NOT EXISTS idx_bookings_dog_id ON bookings(dog_id);
CREATE INDEX IF NOT EXISTS idx_bookings_trainer_id ON bookings(trainer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_trainer_id ON sessions(trainer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_parent_id ON sessions(parent_id);

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE dogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view all users" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- Create RLS policies for messages table
CREATE POLICY "Users can view their own messages" ON messages FOR SELECT USING (
  auth.uid() = sender_id OR 
  auth.uid() = recipient_id OR 
  (is_announcement = true AND auth.uid() IN (SELECT id FROM users WHERE role = 'admin'))
);
CREATE POLICY "Users can create messages" ON messages FOR INSERT WITH CHECK (auth.uid() = sender_id);
CREATE POLICY "Users can update their own messages" ON messages FOR UPDATE USING (auth.uid() = sender_id);

-- Create RLS policies for dogs table
CREATE POLICY "Users can view dogs they own or are trainers for" ON dogs FOR SELECT USING (
  auth.uid() = owner_id OR 
  auth.uid() IN (SELECT id FROM users WHERE role IN ('trainer', 'admin'))
);
CREATE POLICY "Users can create dogs they own" ON dogs FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Users can update dogs they own" ON dogs FOR UPDATE USING (auth.uid() = owner_id);

-- Create RLS policies for bookings table
CREATE POLICY "Users can view relevant bookings" ON bookings FOR SELECT USING (
  auth.uid() IN (
    SELECT owner_id FROM dogs WHERE id = dog_id
    UNION
    SELECT trainer_id FROM bookings WHERE trainer_id = auth.uid()
    UNION
    SELECT id FROM users WHERE role = 'admin'
  )
);
CREATE POLICY "Users can create bookings" ON bookings FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT owner_id FROM dogs WHERE id = dog_id) OR
  auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
);
CREATE POLICY "Users can update relevant bookings" ON bookings FOR UPDATE USING (
  auth.uid() = trainer_id OR
  auth.uid() IN (SELECT owner_id FROM dogs WHERE id = dog_id) OR
  auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
);

-- Create RLS policies for sessions table
CREATE POLICY "Users can view relevant sessions" ON sessions FOR SELECT USING (
  auth.uid() = trainer_id OR
  auth.uid() = parent_id OR
  auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
);
CREATE POLICY "Users can create sessions" ON sessions FOR INSERT WITH CHECK (
  auth.uid() = trainer_id OR
  auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
);
CREATE POLICY "Users can update relevant sessions" ON sessions FOR UPDATE USING (
  auth.uid() = trainer_id OR
  auth.uid() = parent_id OR
  auth.uid() IN (SELECT id FROM users WHERE role = 'admin')
);

-- Insert some sample users (optional - remove if you don't want sample data)
INSERT INTO users (email, full_name, role, phone) VALUES
  ('admin@justdogs.co.za', 'Admin User', 'admin', '+27 82 123 4567'),
  ('trainer@justdogs.co.za', 'Trainer User', 'trainer', '+27 83 987 6543'),
  ('parent@justdogs.co.za', 'Parent User', 'parent', '+27 84 555 1234'),
  ('behaviorist@justdogs.co.za', 'Behaviorist User', 'behaviorist', '+27 85 777 8888')
ON CONFLICT (email) DO NOTHING;

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dogs_updated_at BEFORE UPDATE ON dogs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
