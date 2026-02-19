-- CBT Modules: Courses, Lessons, Enrollments, Progress
-- Part 5 §5.91-5.97 Safety Promotion & Training

-- Courses (a training course like "SMS Initial Training" or "CRM Refresher")
CREATE TABLE IF NOT EXISTS cbt_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT DEFAULT 'sms', -- sms, initial, recurrent, aircraft_specific, emergency, hazmat, security, crew_resource, company, other
  required_for TEXT[] DEFAULT '{"pilot"}', -- roles that must complete
  passing_score INTEGER DEFAULT 80, -- percent to pass quizzes
  estimated_minutes INTEGER DEFAULT 30,
  status TEXT DEFAULT 'draft', -- draft, published, archived
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lessons within a course (ordered content blocks with optional quiz)
CREATE TABLE IF NOT EXISTS cbt_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES cbt_courses(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  -- Content is stored as a JSON array of blocks: [{type: "text", content: "..."}, {type: "heading", content: "..."}, etc.]
  content_blocks JSONB DEFAULT '[]',
  -- Quiz questions stored as JSON: [{question: "...", options: ["A","B","C","D"], correct: 0, explanation: "..."}]
  quiz_questions JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-user progress on each lesson
CREATE TABLE IF NOT EXISTS cbt_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES cbt_courses(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES cbt_lessons(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'not_started', -- not_started, in_progress, completed, failed
  quiz_score INTEGER, -- percentage if quiz was taken
  quiz_answers JSONB, -- user's answers for record
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lesson_id, user_id)
);

-- Course-level enrollment/completion tracking
CREATE TABLE IF NOT EXISTS cbt_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES cbt_courses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'enrolled', -- enrolled, in_progress, completed
  enrolled_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  certificate_number TEXT, -- auto-generated on completion
  UNIQUE(course_id, user_id)
);

-- RLS
ALTER TABLE cbt_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE cbt_enrollments ENABLE ROW LEVEL SECURITY;

-- Courses: org members can read published, admins can write
CREATE POLICY "cbt_courses_select" ON cbt_courses FOR SELECT USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "cbt_courses_insert" ON cbt_courses FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "cbt_courses_update" ON cbt_courses FOR UPDATE USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "cbt_courses_delete" ON cbt_courses FOR DELETE USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);

-- Lessons: same org scope
CREATE POLICY "cbt_lessons_select" ON cbt_lessons FOR SELECT USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "cbt_lessons_insert" ON cbt_lessons FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "cbt_lessons_update" ON cbt_lessons FOR UPDATE USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "cbt_lessons_delete" ON cbt_lessons FOR DELETE USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);

-- Progress: users can read/write their own, admins can read all in org
CREATE POLICY "cbt_progress_select" ON cbt_progress FOR SELECT USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "cbt_progress_insert" ON cbt_progress FOR INSERT WITH CHECK (
  user_id = auth.uid()
);
CREATE POLICY "cbt_progress_update" ON cbt_progress FOR UPDATE USING (
  user_id = auth.uid()
);

-- Enrollments
CREATE POLICY "cbt_enrollments_select" ON cbt_enrollments FOR SELECT USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "cbt_enrollments_insert" ON cbt_enrollments FOR INSERT WITH CHECK (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);
CREATE POLICY "cbt_enrollments_update" ON cbt_enrollments FOR UPDATE USING (
  org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cbt_courses_org ON cbt_courses(org_id);
CREATE INDEX IF NOT EXISTS idx_cbt_lessons_course ON cbt_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_cbt_progress_user ON cbt_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_cbt_progress_course ON cbt_progress(course_id);
CREATE INDEX IF NOT EXISTS idx_cbt_enrollments_user ON cbt_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_cbt_enrollments_course ON cbt_enrollments(course_id);
