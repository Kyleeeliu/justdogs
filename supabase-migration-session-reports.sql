-- Session reports: trainers write reports per session for parents; visible to other trainers when covering
-- Run after base migrations (bookings, sessions, users, dogs exist).

-- Ensure update_updated_at exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Session reports table
CREATE TABLE IF NOT EXISTS session_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
  dog_id UUID NOT NULL REFERENCES dogs(id) ON DELETE CASCADE,
  trainer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  summary TEXT,
  behavior_notes TEXT,
  homework TEXT,
  mood_energy VARCHAR(50) CHECK (mood_energy IN ('calm', 'energetic', 'excited', 'anxious', 'stressed', 'tired', 'other')),

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_report_per_session UNIQUE (session_id)
);

CREATE INDEX IF NOT EXISTS idx_session_reports_session ON session_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_session_reports_booking ON session_reports(booking_id);
CREATE INDEX IF NOT EXISTS idx_session_reports_dog ON session_reports(dog_id);
CREATE INDEX IF NOT EXISTS idx_session_reports_trainer ON session_reports(trainer_id);
CREATE INDEX IF NOT EXISTS idx_session_reports_parent ON session_reports(parent_id);
CREATE INDEX IF NOT EXISTS idx_session_reports_created ON session_reports(created_at DESC);

ALTER TABLE session_reports ENABLE ROW LEVEL SECURITY;

-- SELECT: parents see their reports; trainers and admins see all (for covering)
CREATE POLICY "Session reports read"
  ON session_reports FOR SELECT
  USING (
    parent_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('trainer', 'admin'))
  );

-- Insert/Update: only the trainer assigned to that session (or admin)
CREATE POLICY "Trainer or admin insert session report"
  ON session_reports FOR INSERT
  WITH CHECK (
    trainer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Trainer or admin update session report"
  ON session_reports FOR UPDATE
  USING (
    trainer_id = auth.uid()
    OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Delete: admins only (optional; remove if trainers should delete their own)
CREATE POLICY "Admins delete session reports"
  ON session_reports FOR DELETE
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

CREATE TRIGGER update_session_reports_updated_at
  BEFORE UPDATE ON session_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE session_reports IS 'Trainer-written reports per session for parents; visible to other trainers when covering.';
