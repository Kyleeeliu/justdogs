# Just Dogs App Setup Guide

## Quick Start (Development Mode)

The app is now configured to work in **development mode** without Supabase setup! You can:

1. **Run the app**: `npm run dev`
2. **Test with demo accounts**:
   - Admin: `admin@justdogs.co.za` / `admin123`
   - Trainer: `trainer@justdogs.co.za` / `trainer123`
   - Parent: `parent@justdogs.co.za` / `parent123`

## Setting Up Supabase (Production)

To use the app with real authentication and database:

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note your project URL and anon key

### 2. Set Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME="Just Dogs Training App"
```

### 3. Database Schema

Run these SQL commands in your Supabase SQL editor:

```sql
-- Create users table
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'trainer', 'parent')) NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create dogs table
CREATE TABLE dogs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  breed TEXT NOT NULL,
  age INTEGER NOT NULL,
  weight NUMERIC,
  owner_id UUID REFERENCES users(id) NOT NULL,
  medical_notes TEXT,
  behavioral_notes TEXT,
  vaccine_records TEXT,
  preferences TEXT,
  emergency_contact JSONB,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dog_id UUID REFERENCES dogs(id) NOT NULL,
  trainer_id UUID REFERENCES users(id) NOT NULL,
  parent_id UUID REFERENCES users(id) NOT NULL,
  booking_type TEXT CHECK (booking_type IN ('training', 'daycare', 'behavioral', 'socialization')) NOT NULL,
  status TEXT CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')) NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  special_instructions TEXT,
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sessions table
CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id) NOT NULL,
  trainer_id UUID REFERENCES users(id) NOT NULL,
  dog_id UUID REFERENCES dogs(id) NOT NULL,
  attended BOOLEAN NOT NULL,
  notes TEXT NOT NULL,
  progress_rating INTEGER CHECK (progress_rating >= 1 AND progress_rating <= 5),
  behavior_rating INTEGER CHECK (behavior_rating >= 1 AND behavior_rating <= 5),
  photos TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create invoices table
CREATE TABLE invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  parent_id UUID REFERENCES users(id) NOT NULL,
  booking_id UUID REFERENCES bookings(id),
  amount INTEGER NOT NULL, -- in cents
  currency TEXT DEFAULT 'ZAR',
  status TEXT CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')) NOT NULL,
  due_date DATE NOT NULL,
  invoice_number TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  payment_proof_url TEXT,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES users(id) NOT NULL,
  recipient_id UUID REFERENCES users(id),
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  is_announcement BOOLEAN DEFAULT FALSE,
  target_roles TEXT[],
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Set up Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE dogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic examples)
CREATE POLICY "Users can view their own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Add more policies as needed...
```

### 4. Enable Authentication

1. Go to Authentication > Settings in your Supabase dashboard
2. Configure your site URL and redirect URLs
3. Set up email templates if needed

## Development vs Production

- **Development**: Uses mock data and localStorage for authentication
- **Production**: Uses Supabase for real authentication and database

The app automatically detects which mode to use based on environment variables.
