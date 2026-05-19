-- Migration: Unification of Bundles, Wishlist and Related Content Mapping
-- 20260519020000_unification_bundles_wishlist.sql

-- 1. Create public.bundles table
CREATE TABLE IF NOT EXISTS public.bundles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    short_description TEXT,
    price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    original_price NUMERIC(10,2) DEFAULT 0.00,
    image_url TEXT,
    banner_url TEXT,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'hidden')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create public.bundle_items table
CREATE TABLE IF NOT EXISTS public.bundle_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bundle_id TEXT NOT NULL REFERENCES public.bundles(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('course', 'digital_product')),
    course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_bundle_item CHECK (
        (item_type = 'course' AND course_id IS NOT NULL AND product_id IS NULL) OR
        (item_type = 'digital_product' AND product_id IS NOT NULL AND course_id IS NULL)
    )
);

-- Unique indexes to prevent duplicate items in a bundle
CREATE UNIQUE INDEX IF NOT EXISTS idx_bundle_course_unique ON public.bundle_items(bundle_id, course_id) WHERE item_type = 'course';
CREATE UNIQUE INDEX IF NOT EXISTS idx_bundle_product_unique ON public.bundle_items(bundle_id, product_id) WHERE item_type = 'digital_product';

-- 3. Create public.wishlist_items table
CREATE TABLE IF NOT EXISTS public.wishlist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL CHECK (item_type IN ('course', 'digital_product', 'bundle')),
    course_id TEXT REFERENCES public.courses(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    bundle_id TEXT REFERENCES public.bundles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_wishlist_item CHECK (
        (item_type = 'course' AND course_id IS NOT NULL AND product_id IS NULL AND bundle_id IS NULL) OR
        (item_type = 'digital_product' AND product_id IS NOT NULL AND course_id IS NULL AND bundle_id IS NULL) OR
        (item_type = 'bundle' AND bundle_id IS NOT NULL AND course_id IS NULL AND product_id IS NULL)
    )
);

-- Unique indexes to prevent duplicate wishlist items
CREATE UNIQUE INDEX IF NOT EXISTS idx_wishlist_course ON public.wishlist_items(user_id, course_id) WHERE item_type = 'course';
CREATE UNIQUE INDEX IF NOT EXISTS idx_wishlist_product ON public.wishlist_items(user_id, product_id) WHERE item_type = 'digital_product';
CREATE UNIQUE INDEX IF NOT EXISTS idx_wishlist_bundle ON public.wishlist_items(user_id, bundle_id) WHERE item_type = 'bundle';

-- 4. Create public.related_content_mapping table
CREATE TABLE IF NOT EXISTS public.related_content_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type TEXT NOT NULL CHECK (source_type IN ('course', 'digital_product', 'bundle')),
    source_id TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('course', 'digital_product', 'bundle')),
    target_id TEXT NOT NULL,
    relevance_score NUMERIC(3,2) DEFAULT 1.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(source_type, source_id, target_type, target_id)
);

-- 5. Enable RLS
ALTER TABLE public.bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.related_content_mapping ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS Policies
-- Bundles Policies
DROP POLICY IF EXISTS "Public read for published bundles" ON public.bundles;
CREATE POLICY "Public read for published bundles" ON public.bundles FOR SELECT USING (status = 'published' OR status = 'draft');
DROP POLICY IF EXISTS "Admin full control on bundles" ON public.bundles;
CREATE POLICY "Admin full control on bundles" ON public.bundles FOR ALL USING (true);

-- Bundle Items Policies
DROP POLICY IF EXISTS "Public read for bundle items" ON public.bundle_items;
CREATE POLICY "Public read for bundle items" ON public.bundle_items FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin full control on bundle items" ON public.bundle_items;
CREATE POLICY "Admin full control on bundle items" ON public.bundle_items FOR ALL USING (true);

-- Wishlist Policies
DROP POLICY IF EXISTS "Users can manage own wishlist" ON public.wishlist_items;
CREATE POLICY "Users can manage own wishlist" ON public.wishlist_items FOR ALL USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admin full control on wishlist" ON public.wishlist_items;
CREATE POLICY "Admin full control on wishlist" ON public.wishlist_items FOR ALL USING (true);

-- Related Content Policies
DROP POLICY IF EXISTS "Public read for related content" ON public.related_content_mapping;
CREATE POLICY "Public read for related content" ON public.related_content_mapping FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin full control on related content" ON public.related_content_mapping;
CREATE POLICY "Admin full control on related content" ON public.related_content_mapping FOR ALL USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_wishlist_user ON public.wishlist_items(user_id);
CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle ON public.bundle_items(bundle_id);
CREATE INDEX IF NOT EXISTS idx_related_source ON public.related_content_mapping(source_type, source_id);
