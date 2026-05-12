-- Dog photos (not tied to bookings): trainers/admins upload, tag one or more dogs.
-- Reuses storage bucket path prefix dog-photos/ via existing /api/upload (farm-photos bucket).

CREATE TABLE IF NOT EXISTS dog_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  photo_date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE dog_photos IS 'General dog photos uploaded by trainers/admins; tag dogs via dog_photo_dogs';

CREATE TABLE IF NOT EXISTS dog_photo_dogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  photo_id UUID NOT NULL REFERENCES dog_photos(id) ON DELETE CASCADE,
  dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(photo_id, dog_id)
);

COMMENT ON TABLE dog_photo_dogs IS 'Links dog_photos to tagged dogs';

CREATE INDEX IF NOT EXISTS idx_dog_photos_uploaded_by ON dog_photos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_dog_photos_photo_date ON dog_photos(photo_date);
CREATE INDEX IF NOT EXISTS idx_dog_photo_dogs_photo_id ON dog_photo_dogs(photo_id);
CREATE INDEX IF NOT EXISTS idx_dog_photo_dogs_dog_id ON dog_photo_dogs(dog_id);

DROP TRIGGER IF EXISTS update_dog_photos_updated_at ON dog_photos;
CREATE TRIGGER update_dog_photos_updated_at
  BEFORE UPDATE ON dog_photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE dog_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE dog_photo_dogs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Trainers and admins can manage dog_photos" ON dog_photos;
DROP POLICY IF EXISTS "Trainers and admins can manage dog_photo_dogs" ON dog_photo_dogs;
DROP POLICY IF EXISTS "Parents can view dog photos for their dogs" ON dog_photos;
DROP POLICY IF EXISTS "Parents can view dog photo tags for their dogs" ON dog_photo_dogs;

CREATE POLICY "Trainers and admins can manage dog_photos"
  ON dog_photos FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
  );

CREATE POLICY "Trainers and admins can manage dog_photo_dogs"
  ON dog_photo_dogs FOR ALL
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
  );

CREATE POLICY "Parents can view dog photos for their dogs"
  ON dog_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM dog_photo_dogs dpd
      JOIN dogs d ON d.id = dpd.dog_id
      WHERE dpd.photo_id = dog_photos.id AND d.owner_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view dog photo tags for their dogs"
  ON dog_photo_dogs FOR SELECT
  USING (
    dog_id IN (SELECT id FROM dogs WHERE owner_id = auth.uid())
  );
