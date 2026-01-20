-- Migration to create events table
-- This creates a separate events system similar to news

-- Create events table
CREATE TABLE IF NOT EXISTS events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    event_date DATE NOT NULL,
    start_time TIME,
    end_time TIME,
    location TEXT,
    max_participants INTEGER,
    current_participants INTEGER DEFAULT 0,
    registration_required BOOLEAN DEFAULT false,
    registration_url TEXT,
    price DECIMAL(10,2) DEFAULT 0.00,
    category TEXT DEFAULT 'general' CHECK (category IN ('general', 'training', 'workshop', 'social', 'competition', 'fundraiser')),
    status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
    published BOOLEAN DEFAULT true,
    featured BOOLEAN DEFAULT false,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create updated_at trigger for events
CREATE OR REPLACE FUNCTION update_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_updated_at_trigger
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_events_updated_at();

-- Enable RLS (Row Level Security)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create policies for events
-- Public can read published events
CREATE POLICY "Public can view published events" ON events
    FOR SELECT USING (published = true);

-- Authenticated users can view all events
CREATE POLICY "Authenticated users can view all events" ON events
    FOR SELECT TO authenticated USING (true);

-- Only admins can insert, update, delete events
CREATE POLICY "Admins can manage events" ON events
    FOR ALL TO authenticated 
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE auth.users.id = auth.uid() 
            AND auth.users.raw_user_meta_data->>'role' = 'admin'
        )
    );

-- Insert some sample events
INSERT INTO events (title, description, event_date, start_time, end_time, location, max_participants, registration_required, category, price, featured) VALUES
('Puppy Socialization Day', 'Join us for a fun-filled day of puppy socialization and early training tips. Perfect for puppies 8-16 weeks old. Bring your furry friend and meet other puppy parents!', '2024-02-10', '10:00', '15:00', 'Just Dogs Training Center', 20, true, 'social', 25.00, true),
('Advanced Training Workshop', 'Intensive workshop for experienced dog owners looking to take their training to the next level. Learn advanced commands and behavior modification techniques.', '2024-02-24', '09:00', '17:00', 'Just Dogs Training Center', 15, true, 'workshop', 150.00, true),
('Service Dog Awareness Day', 'Learn about service dogs and emotional support animals. Meet our trained service dogs and their handlers. Free community event with educational presentations.', '2024-03-15', '11:00', '16:00', 'Community Center', 50, false, 'general', 0.00, false),
('Dog Agility Competition', 'Annual dog agility competition open to all skill levels. Prizes for winners in each category. Registration includes lunch and participation certificate.', '2024-04-20', '08:00', '18:00', 'Just Dogs Outdoor Arena', 30, true, 'competition', 35.00, true),
('Charity Fundraiser Walk', 'Join us for our annual charity walk to raise funds for local animal shelters. All dogs and their families welcome. Refreshments provided.', '2024-05-05', '08:00', '12:00', 'City Park', 100, true, 'fundraiser', 15.00, false);

-- Create index for better performance
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_events_published ON events(published);
CREATE INDEX idx_events_category ON events(category);
CREATE INDEX idx_events_status ON events(status);