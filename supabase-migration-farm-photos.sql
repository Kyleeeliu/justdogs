-- Farm Photos System
-- Photos uploaded by trainers/admins, tagged to multiple dogs, linked to farm booking dates

-- Ensure update_updated_at function exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1) Create farm_photos table
CREATE TABLE IF NOT EXISTS farm_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  photo_date DATE NOT NULL, -- The date this photo represents (farm booking date)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE farm_photos IS 'Photos uploaded by trainers/admins linked to farm bookings';
COMMENT ON COLUMN farm_photos.booking_id IS 'Farm booking this photo belongs to';
COMMENT ON COLUMN farm_photos.uploaded_by IS 'Trainer or admin who uploaded the photo';
COMMENT ON COLUMN farm_photos.photo_url IS 'Storage URL or path to the photo';
COMMENT ON COLUMN farm_photos.photo_date IS 'The date this photo represents (usually the booking date)';

-- 2) Create farm_photo_dogs join table (many-to-many: photos can tag multiple dogs)
CREATE TABLE IF NOT EXISTS farm_photo_dogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES farm_photos(id) ON DELETE CASCADE,
  dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(photo_id, dog_id)
);

COMMENT ON TABLE farm_photo_dogs IS 'Links photos to multiple dogs (photo tagging)';

-- 3) Indexes for performance
CREATE INDEX IF NOT EXISTS idx_farm_photos_booking_id ON farm_photos(booking_id);
CREATE INDEX IF NOT EXISTS idx_farm_photos_photo_date ON farm_photos(photo_date);
CREATE INDEX IF NOT EXISTS idx_farm_photos_uploaded_by ON farm_photos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_farm_photo_dogs_photo_id ON farm_photo_dogs(photo_id);
CREATE INDEX IF NOT EXISTS idx_farm_photo_dogs_dog_id ON farm_photo_dogs(dog_id);

-- 4) Triggers for updated_at
DROP TRIGGER IF EXISTS update_farm_photos_updated_at ON farm_photos;
CREATE TRIGGER update_farm_photos_updated_at
  BEFORE UPDATE ON farm_photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 5) RLS Policies

ALTER TABLE farm_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE farm_photo_dogs ENABLE ROW LEVEL SECURITY;

-- Admins and trainers can do everything
CREATE POLICY "Trainers and admins can manage farm_photos"
  ON farm_photos FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
  );

CREATE POLICY "Trainers and admins can manage farm_photo_dogs"
  ON farm_photo_dogs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
  );

-- Parents can view photos of their own dogs
CREATE POLICY "Parents can view photos of their dogs"
  ON farm_photos FOR SELECT
  USING (
    auth.uid() IN (
      SELECT DISTINCT b.parent_id
      FROM bookings b
      WHERE b.id = farm_photos.booking_id
    )
  );

CREATE POLICY "Parents can view photo-dog tags for their dogs"
  ON farm_photo_dogs FOR SELECT
  USING (
    dog_id IN (
      SELECT d.id FROM dogs d WHERE d.owner_id = auth.uid()
    )
  );
