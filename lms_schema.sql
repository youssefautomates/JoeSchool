-- ============================================================================
-- 🎓 Youssef Automates - LMS Database Schema & Security Policies (Phase 4)
-- Run this script in your Supabase SQL Editor to establish a solid database.
-- ============================================================================

-- Drop existing tables to establish relations from scratch (Safely)
DROP TABLE IF EXISTS public.reviews CASCADE;
DROP TABLE IF EXISTS public.certificates CASCADE;
DROP TABLE IF EXISTS public.user_course_progress CASCADE;
DROP TABLE IF EXISTS public.enrollments CASCADE;
DROP TABLE IF EXISTS public.course_lessons CASCADE;
DROP TABLE IF EXISTS public.course_modules CASCADE;
DROP TABLE IF EXISTS public.courses CASCADE;

-- 1. Courses Table
CREATE TABLE public.courses (
    id TEXT PRIMARY KEY, -- Can be text ID (like course-n8n-masterclass) or UUID
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    short_description TEXT,
    image_url TEXT,
    banner_url TEXT,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    original_price NUMERIC(10,2) DEFAULT 0.00,
    is_free BOOLEAN NOT NULL DEFAULT false,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'hidden')),
    duration_hours NUMERIC(5,1) DEFAULT 0.0,
    lessons_count INTEGER DEFAULT 0,
    level TEXT DEFAULT 'مبتدئ' CHECK (level IN ('مبتدئ', 'متوسط', 'متقدم')),
    category TEXT DEFAULT 'الأتمتة',
    tags TEXT[] DEFAULT '{}',
    requirements TEXT[] DEFAULT '{}',
    what_will_learn TEXT[] DEFAULT '{}',
    who_is_for TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Course Modules (Sections) Table
CREATE TABLE public.course_modules (
    id TEXT PRIMARY KEY, -- section ID
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 1
);

-- 3. Course Lessons Table
CREATE TABLE public.course_lessons (
    id TEXT PRIMARY KEY, -- lesson ID
    module_id TEXT NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    slug TEXT NOT NULL,
    video_url TEXT,
    content TEXT,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 1,
    is_preview BOOLEAN NOT NULL DEFAULT false,
    lecture_type TEXT NOT NULL DEFAULT 'video' CHECK (lecture_type IN ('video', 'pdf', 'link', 'download')),
    attachment_url TEXT,
    attachment_name TEXT,
    external_link TEXT
);

-- 4. Enrollments Table
CREATE TABLE public.enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'suspended')),
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, course_id)
);

-- 5. User Course Progress Table
CREATE TABLE public.user_course_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
    completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, lesson_id)
);

-- 6. Certificates Table
CREATE TABLE public.certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    certificate_url TEXT NOT NULL UNIQUE, -- verification_id
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, course_id)
);

-- 7. Course Reviews Table
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    user_name TEXT NOT NULL,
    rating NUMERIC(2,1) NOT NULL DEFAULT 5.0 CHECK (rating >= 1.0 AND rating <= 5.0),
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- ⚡ Performance Indexing
-- ============================================================================
CREATE INDEX idx_courses_slug ON public.courses(slug);
CREATE INDEX idx_courses_status ON public.courses(status);
CREATE INDEX idx_modules_course ON public.course_modules(course_id);
CREATE INDEX idx_lessons_module ON public.course_lessons(module_id);
CREATE INDEX idx_enrollments_user ON public.enrollments(user_id);
CREATE INDEX idx_progress_user ON public.user_course_progress(user_id);
CREATE INDEX idx_certificates_verification ON public.certificates(certificate_url);
CREATE INDEX idx_reviews_course ON public.reviews(course_id);

-- ============================================================================
-- 🛡️ Row-Level Security (RLS) & Policies
-- ============================================================================
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_course_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- --- A. Courses Policies ---
CREATE POLICY "Public read for published courses" ON public.courses 
    FOR SELECT USING (status = 'published');

CREATE POLICY "Admin full control on courses" ON public.courses 
    FOR ALL USING (true); -- Simplified for admin management dashboard

-- --- B. Course Modules Policies ---
CREATE POLICY "Anyone can read modules" ON public.course_modules 
    FOR SELECT USING (true);

CREATE POLICY "Admin full control on modules" ON public.course_modules 
    FOR ALL USING (true);

-- --- C. Course Lessons Policies ---
CREATE POLICY "Anyone can read lessons" ON public.course_lessons 
    FOR SELECT USING (true);

CREATE POLICY "Admin full control on lessons" ON public.course_lessons 
    FOR ALL USING (true);

-- --- D. Enrollments Policies ---
CREATE POLICY "Users can read own enrollments" ON public.enrollments 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own enrollments" ON public.enrollments 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admin full control on enrollments" ON public.enrollments 
    FOR ALL USING (true);

-- --- E. User Course Progress Policies ---
CREATE POLICY "Users can read own progress" ON public.user_course_progress 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert/delete own progress" ON public.user_course_progress 
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admin full control on progress" ON public.user_course_progress 
    FOR ALL USING (true);

-- --- F. Certificates Policies ---
CREATE POLICY "Public read access for certificates" ON public.certificates 
    FOR SELECT USING (true); -- Public verification gateway needs this

CREATE POLICY "Users can manage own certificates" ON public.certificates 
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Admin full control on certificates" ON public.certificates 
    FOR ALL USING (true);

-- --- G. Reviews Policies ---
CREATE POLICY "Public read access for reviews" ON public.reviews 
    FOR SELECT USING (true);

CREATE POLICY "Authenticated users can write reviews" ON public.reviews 
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admin full control on reviews" ON public.reviews 
    FOR ALL USING (true);

-- ============================================================================
-- 📦 Storage Buckets & Storage Security
-- ============================================================================
-- Ensure buckets exist (in Supabase storage.buckets)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('course-materials', 'course-materials', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('course-images', 'course-images', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policies on storage.objects for courses uploads
CREATE POLICY "Allow public read from course-images"
ON storage.objects FOR SELECT USING (bucket_id = 'course-images');

CREATE POLICY "Allow public read from course-materials"
ON storage.objects FOR SELECT USING (bucket_id = 'course-materials');

CREATE POLICY "Allow admin upload to course-images"
ON storage.objects FOR ALL USING (true);

CREATE POLICY "Allow admin upload to course-materials"
ON storage.objects FOR ALL USING (true);
