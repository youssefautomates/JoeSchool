-- ============================================================================
-- 🎓 Youssef Automates - Product Reviews Table & Security Policies
-- Migration: 20260602000000_product_reviews.sql
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.product_reviews (
    id TEXT PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    rating NUMERIC(3,2) NOT NULL DEFAULT 5.0,
    text TEXT NOT NULL,
    "avatarUrl" TEXT,
    gender TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT true,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    status TEXT NOT NULL DEFAULT 'pending',
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "featuredPosition" INTEGER DEFAULT 999,
    source TEXT NOT NULL DEFAULT 'manual_admin',
    "schemaVersion" INTEGER NOT NULL DEFAULT 1,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "archiveReason" TEXT,
    "editedAt" TIMESTAMPTZ DEFAULT now(),
    "editedBy" TEXT,
    "moderationAction" TEXT
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_product_reviews_product ON public.product_reviews("productId");
CREATE INDEX IF NOT EXISTS idx_product_reviews_status ON public.product_reviews(status);

-- Enable Row Level Security (RLS)
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- 1. Public Read Access
DROP POLICY IF EXISTS "Public read access for product_reviews" ON public.product_reviews;
CREATE POLICY "Public read access for product_reviews" ON public.product_reviews FOR SELECT USING (true);

-- 2. Full Admin Control
DROP POLICY IF EXISTS "Admin full control on product_reviews" ON public.product_reviews;
CREATE POLICY "Admin full control on product_reviews" ON public.product_reviews FOR ALL USING (true);
