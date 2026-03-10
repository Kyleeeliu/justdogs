-- Admin: Trainers & Parent–Dog Links
-- Run after base migrations. Adds:
-- - users.approval_status, users.is_active (if missing)
-- - trainer_parents (which parents a trainer can post for)
-- - dog_parents (which parents see which dogs/sessions)

-- Ensure update_updated_at exists (used by other migrations)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1) Users: approval_status and is_active (for trainer lifecycle)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'approval_status') THEN
    ALTER TABLE users ADD COLUMN approval_status VARCHAR(50) DEFAULT 'approved'
      CHECK (approval_status IN ('pending', 'approved', 'rejected'));
    COMMENT ON COLUMN users.approval_status IS 'For trainers: pending until admin approves; admins/parents default approved';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'is_active') THEN
    ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT true;
    COMMENT ON COLUMN users.is_active IS 'When false, user cannot log in / act (e.g. deactivated trainer)';
  END IF;
END $$;

-- 2) Trainer–Parent links (which dog parents a trainer can post for / act on behalf of)
CREATE TABLE IF NOT EXISTS trainer_parents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  can_post BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_trainer_parent UNIQUE (trainer_id, parent_id)
);

CREATE INDEX IF NOT EXISTS idx_trainer_parents_trainer ON trainer_parents(trainer_id);
CREATE INDEX IF NOT EXISTS idx_trainer_parents_parent ON trainer_parents(parent_id);

ALTER TABLE trainer_parents ENABLE ROW LEVEL SECURITY;

-- Only admins manage trainer_parents; trainers/parents can read their own links
CREATE POLICY "Admins manage trainer_parents" ON trainer_parents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Trainers see their linked parents" ON trainer_parents
  FOR SELECT USING (trainer_id = auth.uid());

CREATE POLICY "Parents see trainers linked to them" ON trainer_parents
  FOR SELECT USING (parent_id = auth.uid());

CREATE TRIGGER update_trainer_parents_updated_at
  BEFORE UPDATE ON trainer_parents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE trainer_parents IS 'Admin-assigned links: which dog parents each trainer can post for / manage';

-- 3) Dog–Parent links (which parent accounts see which dogs; supports multiple parents per dog)
CREATE TABLE IF NOT EXISTS dog_parents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  relationship VARCHAR(50) DEFAULT 'primary' CHECK (relationship IN ('primary', 'secondary', 'guardian', 'other')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT unique_dog_parent UNIQUE (dog_id, parent_id)
);

CREATE INDEX IF NOT EXISTS idx_dog_parents_dog ON dog_parents(dog_id);
CREATE INDEX IF NOT EXISTS idx_dog_parents_parent ON dog_parents(parent_id);

ALTER TABLE dog_parents ENABLE ROW LEVEL SECURITY;

-- Admins manage; parents see only their own links; trainers/admins see for session context
CREATE POLICY "Admins manage dog_parents" ON dog_parents
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Parents see their linked dogs" ON dog_parents
  FOR SELECT USING (parent_id = auth.uid());

CREATE POLICY "Trainers and admins can read dog_parents" ON dog_parents
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
  );

CREATE TRIGGER update_dog_parents_updated_at
  BEFORE UPDATE ON dog_parents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE dog_parents IS 'Admin-assigned links: which parent accounts see which dogs (and thus their sessions/bookings)';

-- Optional: backfill dog_parents from existing dogs.owner_id so current data is visible to primary owner
INSERT INTO dog_parents (dog_id, parent_id, relationship)
  SELECT id, owner_id, 'primary'
  FROM dogs
  WHERE NOT EXISTS (
    SELECT 1 FROM dog_parents dp WHERE dp.dog_id = dogs.id AND dp.parent_id = dogs.owner_id
  )
ON CONFLICT (dog_id, parent_id) DO NOTHING;
