-- Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    discount_percent INTEGER NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
    max_uses INTEGER NOT NULL DEFAULT 100,
    used_count INTEGER NOT NULL DEFAULT 0,
    expiry_date TIMESTAMP WITH TIME ZONE,
    applies_to_type TEXT NOT NULL DEFAULT 'all', -- 'all', 'product', 'course'
    applies_to_id TEXT, -- Product ID or Course ID/Slug
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Create Policies
DROP POLICY IF EXISTS "Allow public read coupons" ON public.coupons;
CREATE POLICY "Allow public read coupons" ON public.coupons
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow admin manage coupons" ON public.coupons;
CREATE POLICY "Allow admin manage coupons" ON public.coupons
    FOR ALL USING (true); -- Full admin capabilities

-- Add coupon_code column to orders table for analytics tracking
ALTER TABLE IF EXISTS public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;

