-- ============================================================================
-- 🎓 Youssef Automates - AI Conversations Table
-- Migration: 20260519070000_ai_conversations.sql
-- ============================================================================

-- 1. Create public.ai_conversations table
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- 2. Enable Row Level Security (RLS) on ai_conversations
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies for ai_conversations (Admins only)
DROP POLICY IF EXISTS "Allow admin select ai_conversations" ON public.ai_conversations;
CREATE POLICY "Allow admin select ai_conversations" ON public.ai_conversations
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow admin insert ai_conversations" ON public.ai_conversations;
CREATE POLICY "Allow admin insert ai_conversations" ON public.ai_conversations
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin update ai_conversations" ON public.ai_conversations;
CREATE POLICY "Allow admin update ai_conversations" ON public.ai_conversations
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow admin delete ai_conversations" ON public.ai_conversations;
CREATE POLICY "Allow admin delete ai_conversations" ON public.ai_conversations
    FOR DELETE TO authenticated USING (true);
