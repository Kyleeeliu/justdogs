-- Daily dog feedback: priority tags (admin), team target, trainer submissions with multi-dog photo tagging.

CREATE TABLE IF NOT EXISTS daily_feedback_target (
  for_date DATE PRIMARY KEY,
  target_count INTEGER NOT NULL DEFAULT 10 CHECK (target_count >= 0),
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE daily_feedback_target IS 'Admin-set team goal: how many feedback submissions to aim for per calendar day';

CREATE TABLE IF NOT EXISTS dog_daily_priority_tag (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  for_date DATE NOT NULL,
  tag VARCHAR(80) NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (dog_id, for_date, tag)
);

CREATE INDEX IF NOT EXISTS idx_dog_daily_priority_tag_date ON dog_daily_priority_tag(for_date);
CREATE INDEX IF NOT EXISTS idx_dog_daily_priority_tag_dog ON dog_daily_priority_tag(dog_id);

CREATE TABLE IF NOT EXISTS daily_dog_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feedback_date DATE NOT NULL,
  body_text TEXT NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_dog_feedback_date ON daily_dog_feedback(feedback_date);
CREATE INDEX IF NOT EXISTS idx_daily_dog_feedback_trainer ON daily_dog_feedback(trainer_id);

CREATE TABLE IF NOT EXISTS daily_dog_feedback_dogs (
  feedback_id UUID NOT NULL REFERENCES daily_dog_feedback(id) ON DELETE CASCADE,
  dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  PRIMARY KEY (feedback_id, dog_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_dog_feedback_dogs_dog ON daily_dog_feedback_dogs(dog_id);

ALTER TABLE daily_feedback_target ENABLE ROW LEVEL SECURITY;
ALTER TABLE dog_daily_priority_tag ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_dog_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_dog_feedback_dogs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "daily_feedback_target_select" ON daily_feedback_target;
DROP POLICY IF EXISTS "daily_feedback_target_admin" ON daily_feedback_target;
CREATE POLICY "daily_feedback_target_select" ON daily_feedback_target FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
);
CREATE POLICY "daily_feedback_target_admin" ON daily_feedback_target FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "dog_daily_priority_tag_select" ON dog_daily_priority_tag;
DROP POLICY IF EXISTS "dog_daily_priority_tag_admin" ON dog_daily_priority_tag;
CREATE POLICY "dog_daily_priority_tag_select" ON dog_daily_priority_tag FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
);
CREATE POLICY "dog_daily_priority_tag_admin" ON dog_daily_priority_tag FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "daily_dog_feedback_select" ON daily_dog_feedback;
DROP POLICY IF EXISTS "daily_dog_feedback_insert" ON daily_dog_feedback;
CREATE POLICY "daily_dog_feedback_select" ON daily_dog_feedback FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
);
CREATE POLICY "daily_dog_feedback_insert" ON daily_dog_feedback FOR INSERT WITH CHECK (
  trainer_id = auth.uid()
  AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
);

DROP POLICY IF EXISTS "daily_dog_feedback_dogs_select" ON daily_dog_feedback_dogs;
DROP POLICY IF EXISTS "daily_dog_feedback_dogs_insert" ON daily_dog_feedback_dogs;
CREATE POLICY "daily_dog_feedback_dogs_select" ON daily_dog_feedback_dogs FOR SELECT USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
);
CREATE POLICY "daily_dog_feedback_dogs_insert" ON daily_dog_feedback_dogs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
);
