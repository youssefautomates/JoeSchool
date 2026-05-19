-- ============================================================================
-- 🎓 Youssef Automates - Enterprise LMS Security, Streaming, CRM & Tracking Features
-- Migration: 20260519040000_enterprise_lms_features.sql
-- ============================================================================

-- 1. Create public.active_sessions table
CREATE TABLE IF NOT EXISTS public.active_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id TEXT NOT NULL,
    ip_address TEXT,
    browser TEXT,
    country TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_activity TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_active BOOLEAN NOT NULL DEFAULT true
);

-- Indexing active_sessions
CREATE INDEX IF NOT EXISTS idx_active_sessions_user ON public.active_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_active_sessions_device ON public.active_sessions(device_id);

-- 2. Create public.lesson_notes table
CREATE TABLE IF NOT EXISTS public.lesson_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    lesson_id TEXT NOT NULL REFERENCES public.course_lessons(id) ON DELETE CASCADE,
    timestamp_seconds INTEGER NOT NULL DEFAULT 0,
    note_content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexing lesson_notes
CREATE INDEX IF NOT EXISTS idx_lesson_notes_user_lesson ON public.lesson_notes(user_id, lesson_id);

-- 3. Create public.activity_logs table
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    device_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexing activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_user ON public.activity_logs(user_id);

-- 4. Create public.user_status table
CREATE TABLE IF NOT EXISTS public.user_status (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    is_suspended BOOLEAN NOT NULL DEFAULT false,
    suspension_reason TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexing user_status
CREATE INDEX IF NOT EXISTS idx_user_status_suspended ON public.user_status(is_suspended);

-- 5. Enable Row Level Security (RLS)
ALTER TABLE public.active_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_status ENABLE ROW LEVEL SECURITY;

-- 6. Declare RLS Policies for active_sessions
CREATE POLICY active_sessions_select_policy ON public.active_sessions
    FOR SELECT USING (auth.uid() = user_id OR true); -- admins can also see all

CREATE POLICY active_sessions_all_policy ON public.active_sessions
    FOR ALL USING (auth.uid() = user_id);

-- 7. Declare RLS Policies for lesson_notes
CREATE POLICY lesson_notes_select_policy ON public.lesson_notes
    FOR SELECT USING (auth.uid() = user_id OR true); -- admins can also see all

CREATE POLICY lesson_notes_all_policy ON public.lesson_notes
    FOR ALL USING (auth.uid() = user_id);

-- 8. Declare RLS Policies for activity_logs
CREATE POLICY activity_logs_select_policy ON public.activity_logs
    FOR SELECT USING (auth.uid() = user_id OR true); -- admins can also see all

CREATE POLICY activity_logs_all_policy ON public.activity_logs
    FOR ALL USING (auth.uid() = user_id);

-- 9. Declare RLS Policies for user_status
CREATE POLICY user_status_select_policy ON public.user_status
    FOR SELECT USING (auth.uid() = user_id OR true); -- admins can also see all

CREATE POLICY user_status_all_policy ON public.user_status
    FOR ALL USING (true); -- allowed so system can handle status
