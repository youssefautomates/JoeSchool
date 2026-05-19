-- ============================================================================
-- 🎓 Youssef Automates - Secure LMS Video Storage & Student Progress Tracking (Phase 5)
-- Migration: 20260519030000_secure_lms_video_progress.sql
-- ============================================================================

-- 1. Create Private Buckets in Supabase Storage Schema
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('course-videos', 'course-videos', false, 10737418240, ARRAY['video/mp4', 'video/quicktime', 'video/x-matroska', 'video/webm']),
  ('lesson-assets', 'lesson-assets', false, 524288000, NULL),
  ('lesson-thumbnails', 'lesson-thumbnails', false, 52428800, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

-- 2. Create the course_progress table
CREATE TABLE IF NOT EXISTS public.course_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
    watched_seconds INTEGER NOT NULL DEFAULT 0,
    completed BOOLEAN NOT NULL DEFAULT false,
    last_position INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, lesson_id)
);

-- 3. Indexing
CREATE INDEX IF NOT EXISTS idx_course_progress_user_course ON public.course_progress(user_id, course_id);
CREATE INDEX IF NOT EXISTS idx_course_progress_lesson ON public.course_progress(lesson_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.course_progress ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies
DROP POLICY IF EXISTS "Users can manage own course progress" ON public.course_progress;
CREATE POLICY "Users can manage own course progress" ON public.course_progress FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin full control on course progress" ON public.course_progress;
CREATE POLICY "Admin full control on course progress" ON public.course_progress FOR ALL USING (true);
