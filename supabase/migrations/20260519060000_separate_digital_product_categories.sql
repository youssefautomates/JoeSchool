-- ============================================================================
-- 🎓 Youssef Automates - Separate Digital Product Categories
-- Migration: 20260519060000_separate_digital_product_categories.sql
-- ============================================================================

-- 1. Create public.product_categories table
CREATE TABLE IF NOT EXISTS public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Drop the restrictive check constraint on products category column
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_category_check;

-- 3. Enable Row Level Security (RLS) on product_categories
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies for product_categories
DROP POLICY IF EXISTS "Allow public read product_categories" ON public.product_categories;
CREATE POLICY "Allow public read product_categories" ON public.product_categories
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin manage product_categories" ON public.product_categories;
CREATE POLICY "Allow admin manage product_categories" ON public.product_categories
    FOR ALL USING (true); -- Requires admin privileges in application layer

-- 5. Insert initial default categories
INSERT INTO public.product_categories (name, slug, order_index) VALUES
('الأتمتة', 'automation', 1),
('الذكاء الاصطناعي', 'artificial-intelligence', 2),
('صناعة المحتوى', 'content-creation', 3)
ON CONFLICT (slug) DO NOTHING;
