-- Training System Rebuild: Merge training_requirements + training_records into trainings + training_completions
-- Run this migration in your Supabase SQL Editor

-- 1. Create new tables
CREATE TABLE IF NOT EXISTS trainings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'sms',
  schedule_type TEXT NOT NULL DEFAULT 'recurring',  -- 'one_time' or 'recurring'
  frequency_months INT DEFAULT 12,
  enrolled_roles TEXT[] DEFAULT '{}',
  enrolled_users UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS training_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  training_id UUID NOT NULL REFERENCES trainings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  completed_date DATE NOT NULL,
  expires_at DATE,
  instructor TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  expiry_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_trainings_org ON trainings(org_id);
CREATE INDEX IF NOT EXISTS idx_training_completions_org ON training_completions(org_id);
CREATE INDEX IF NOT EXISTS idx_training_completions_training ON training_completions(training_id);
CREATE INDEX IF NOT EXISTS idx_training_completions_user ON training_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_training_completions_expires ON training_completions(expires_at) WHERE expires_at IS NOT NULL;

-- 3. RLS
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "trainings_org_read" ON trainings FOR SELECT USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "trainings_org_write" ON trainings FOR ALL USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);

CREATE POLICY "training_completions_org_read" ON training_completions FOR SELECT USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "training_completions_org_write" ON training_completions FOR ALL USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);

-- 4. Migrate data from old tables (if they exist)
-- Migrate requirements -> trainings
INSERT INTO trainings (id, org_id, title, description, category, schedule_type, frequency_months, enrolled_roles, created_at)
SELECT id, org_id, title, COALESCE(description, ''), COALESCE(category, 'sms'),
  CASE WHEN frequency_months > 0 THEN 'recurring' ELSE 'one_time' END,
  COALESCE(frequency_months, 0),
  COALESCE(required_for, '{}'),
  created_at
FROM training_requirements
ON CONFLICT (id) DO NOTHING;

-- Migrate records -> completions (only those linked to a requirement)
INSERT INTO training_completions (id, org_id, training_id, user_id, completed_date, expires_at, instructor, notes, expiry_notified_at, created_at)
SELECT id, org_id, requirement_id, user_id, completed_date, expiry_date, COALESCE(instructor, ''), COALESCE(notes, ''), expiry_notified_at, created_at
FROM training_records
WHERE requirement_id IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- For orphan records (no requirement_id), create a one-time training per unique title per org, then link
DO $$
DECLARE
  rec RECORD;
  new_training_id UUID;
BEGIN
  FOR rec IN
    SELECT DISTINCT org_id, title
    FROM training_records
    WHERE requirement_id IS NULL AND title IS NOT NULL AND title != ''
  LOOP
    new_training_id := gen_random_uuid();
    INSERT INTO trainings (id, org_id, title, description, category, schedule_type, frequency_months, enrolled_roles)
    VALUES (new_training_id, rec.org_id, rec.title, '', 'other', 'one_time', 0, '{}');

    INSERT INTO training_completions (id, org_id, training_id, user_id, completed_date, expires_at, instructor, notes, expiry_notified_at, created_at)
    SELECT id, org_id, new_training_id, user_id, completed_date, expiry_date, COALESCE(instructor, ''), COALESCE(notes, ''), expiry_notified_at, created_at
    FROM training_records
    WHERE requirement_id IS NULL AND org_id = rec.org_id AND title = rec.title;
  END LOOP;
END $$;

-- 5. DO NOT drop old tables yet — verify everything works first, then run:
-- DROP TABLE IF EXISTS training_records;
-- DROP TABLE IF EXISTS training_requirements;
