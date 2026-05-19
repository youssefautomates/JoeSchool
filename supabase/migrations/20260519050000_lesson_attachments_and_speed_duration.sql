-- ============================================================================
-- 🎓 Youssef Automates - LMS Lesson Attachments & Video Processing Status
-- Migration: 20260519050000_lesson_attachments_and_speed_duration.sql
-- ============================================================================

-- Add modern columns to public.course_lessons to support Kajabi-style multi-attachments and high-speed upload status
ALTER TABLE public.course_lessons ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.course_lessons ADD COLUMN IF NOT EXISTS video_processing_status TEXT DEFAULT 'completed';
ALTER TABLE public.course_lessons ADD COLUMN IF NOT EXISTS upload_progress INTEGER DEFAULT 100;

-- Comments for documentation
COMMENT ON COLUMN public.course_lessons.attachments IS 'Array of files attached to this lesson: [{name: string, url: string, size: number, type: string}]';
COMMENT ON COLUMN public.course_lessons.video_processing_status IS 'Status of lesson video upload/processing (e.g., uploading, completed, failed)';
COMMENT ON COLUMN public.course_lessons.upload_progress IS 'Progress percentage of video uploading in background';
