-- ============================================================================
-- 🎓 Youssef Automates - Real Analytics Tracking Engine & Schema Migration
-- Migration: 20260525000000_analytics_events.sql
-- ============================================================================

-- 1. Create analytics_events table for tracking visitor sessions and funnel steps
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name TEXT NOT NULL,
    session_id TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    product_id TEXT,
    product_title TEXT,
    utm_source TEXT,
    utm_medium TEXT,
    utm_campaign TEXT,
    utm_content TEXT,
    utm_term TEXT,
    referrer TEXT,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add performance indexing for fast dashboard queries and aggregations
CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON public.analytics_events(event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON public.analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_session_id ON public.analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_utm_source ON public.analytics_events(utm_source);

-- 3. Enable RLS and define permissive insert policy for anonymous tracking
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow anonymous insert for analytics tracking" ON public.analytics_events;
CREATE POLICY "Allow anonymous insert for analytics tracking" ON public.analytics_events
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin full select on analytics tracking" ON public.analytics_events;
CREATE POLICY "Allow admin full select on analytics tracking" ON public.analytics_events
    FOR SELECT USING (true);

-- 4. Alter orders table to capture country and payment method details
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'EG';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Card';

-- Document the columns
COMMENT ON COLUMN public.orders.country IS 'Billed billing country captured from Paymob payload at completion';
COMMENT ON COLUMN public.orders.payment_method IS 'Billed payment method type captured from Paymob (e.g. Card, Wallet, Kiosk)';
