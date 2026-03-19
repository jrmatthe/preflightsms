-- Training System Rebuild: Courses ARE Trainings
-- Adds schedule + enrollment fields to cbt_courses, creates training_completions for records
-- Run in Supabase SQL Editor

-- 1. Add training fields to cbt_courses
ALTER TABLE cbt_courses ADD COLUMN IF NOT EXISTS schedule_type TEXT DEFAULT 'one_time';
ALTER TABLE cbt_courses ADD COLUMN IF NOT EXISTS frequency_months INT DEFAULT 0;
ALTER TABLE cbt_courses ADD COLUMN IF NOT EXISTS enrolled_users UUID[] DEFAULT '{}';
-- required_for already exists and serves as enrolled_roles

-- 2. Create training_completions table (for tracking who completed what and when)
CREATE TABLE IF NOT EXISTS training_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id),
  course_id UUID NOT NULL REFERENCES cbt_courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  completed_date DATE NOT NULL,
  expires_at DATE,
  instructor TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  expiry_notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_training_completions_org ON training_completions(org_id);
CREATE INDEX IF NOT EXISTS idx_training_completions_course ON training_completions(course_id);
CREATE INDEX IF NOT EXISTS idx_training_completions_user ON training_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_training_completions_expires ON training_completions(expires_at) WHERE expires_at IS NOT NULL;

-- 4. RLS
ALTER TABLE training_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "training_completions_org_read" ON training_completions FOR SELECT USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "training_completions_org_write" ON training_completions FOR ALL USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);

-- 5. Migrate existing training_records into training_completions (if old tables exist)
-- Only records that have a requirement_id matching a cbt_course title get migrated
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'training_records') THEN
    INSERT INTO training_completions (id, org_id, course_id, user_id, completed_date, expires_at, instructor, notes, expiry_notified_at, created_at)
    SELECT tr.id, tr.org_id, c.id, tr.user_id, tr.completed_date, tr.expiry_date,
           COALESCE(tr.instructor, ''), COALESCE(tr.notes, ''), tr.expiry_notified_at, tr.created_at
    FROM training_records tr
    JOIN training_requirements treq ON tr.requirement_id = treq.id
    JOIN cbt_courses c ON c.title = treq.title AND c.org_id = treq.org_id
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- Old tables (training_requirements, training_records) are left in place.
-- Drop them after verifying everything works:
-- DROP TABLE IF EXISTS training_records;
-- DROP TABLE IF EXISTS training_requirements;
