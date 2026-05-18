-- ============================================================================
-- SQL Migration - Phase 1: Online Course Platform Architecture
-- Central database schema for courses, modules, lessons, enrollments, and progress.
-- ============================================================================

-- 1. Extend products table with product_type safely without breaking existing records
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'products' AND column_name = 'product_type'
    ) THEN
        ALTER TABLE products ADD COLUMN product_type VARCHAR(50) DEFAULT 'digital_product';
    END IF;
END $$;

-- 2. Create courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    short_description TEXT,
    image_url TEXT,
    price NUMERIC(10,2) DEFAULT 0.00,
    original_price NUMERIC(10,2),
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'hidden')),
    duration_hours NUMERIC(5,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create course modules table
CREATE TABLE IF NOT EXISTS course_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Create course lessons table
CREATE TABLE IF NOT EXISTS course_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    module_id UUID REFERENCES course_modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    video_url TEXT,
    content TEXT,
    duration_seconds INT DEFAULT 0,
    sort_order INT DEFAULT 0,
    is_preview BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Create enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT now(),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'suspended')),
    CONSTRAINT unique_user_course UNIQUE (user_id, course_id)
);

-- 6. Create user course progress table
CREATE TABLE IF NOT EXISTS user_course_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID REFERENCES course_lessons(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_user_lesson UNIQUE (user_id, lesson_id)
);

-- 7. Create certificates table
CREATE TABLE IF NOT EXISTS certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    issued_at TIMESTAMPTZ DEFAULT now(),
    certificate_url TEXT,
    CONSTRAINT unique_user_course_cert UNIQUE (user_id, course_id)
);

-- 8. Add indexes for optimal performance
CREATE INDEX IF NOT EXISTS idx_courses_slug ON courses(slug);
CREATE INDEX IF NOT EXISTS idx_course_modules_course ON course_modules(course_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_module ON course_lessons(module_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON user_course_progress(user_id);

-- 9. Enable Row Level Security (RLS) on new tables
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- 10. Define RLS Policies

-- Courses: Read is public for published courses; write restricted to admins.
CREATE POLICY "Public read for published courses" ON courses
    FOR SELECT USING (status = 'published' OR status = 'hidden');

-- Modules & Lessons: Accessible to users who are enrolled or if it's a preview lesson.
CREATE POLICY "Enrolled or preview access to modules" ON course_modules
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM enrollments 
            WHERE enrollments.course_id = course_modules.course_id 
            AND enrollments.user_id = auth.uid()
        )
    );

CREATE POLICY "Enrolled or preview access to lessons" ON course_lessons
    FOR SELECT USING (
        is_preview = true OR EXISTS (
            SELECT 1 FROM course_modules
            JOIN enrollments ON enrollments.course_id = course_modules.course_id
            WHERE course_modules.id = course_lessons.module_id
            AND enrollments.user_id = auth.uid()
        )
    );

-- Enrollments: Users can only view their own enrollments; write restricted to paymob system/admins.
CREATE POLICY "Users can view their own enrollments" ON enrollments
    FOR SELECT USING (user_id = auth.uid());

-- Progress: Users can read/write their own progress records.
CREATE POLICY "Users can manage their own progress" ON user_course_progress
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own progress" ON user_course_progress
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own progress" ON user_course_progress
    FOR DELETE USING (user_id = auth.uid());

-- Certificates: Users can only read their own certificates.
CREATE POLICY "Users can view their own certificates" ON certificates
    FOR SELECT USING (user_id = auth.uid());
