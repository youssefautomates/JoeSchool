-- Create course_categories table
CREATE TABLE IF NOT EXISTS public.course_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.course_categories ENABLE ROW LEVEL SECURITY;

-- Create Policies
DROP POLICY IF EXISTS "Allow public read course_categories" ON public.course_categories;
CREATE POLICY "Allow public read course_categories" ON public.course_categories
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin manage course_categories" ON public.course_categories;
CREATE POLICY "Allow admin manage course_categories" ON public.course_categories
    FOR ALL USING (true); -- Requires admin privileges in application layer

-- Insert default categories to avoid breaking existing UI
INSERT INTO public.course_categories (name, slug, order_index) VALUES
('دورات الأتمتة', 'automation-courses', 1),
('دورات صناعة المحتوى', 'content-creation-courses', 2),
('الدورات المجانية', 'free-courses', 3)
ON CONFLICT (slug) DO NOTHING;
