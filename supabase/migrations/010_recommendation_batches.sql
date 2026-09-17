-- Migration: 010_recommendation_batches.sql
-- Description: Recommendation batch persistence schema and recommendations table updates.

-- ============================================================================
-- 1. CREATE RECOMMENDATION_BATCHES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.recommendation_batches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    strategic_summary text NOT NULL,
    provider text NOT NULL,
    model text NOT NULL,
    generated_at timestamp with time zone NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT recommendation_batches_pkey PRIMARY KEY (id),
    CONSTRAINT recommendation_batches_strategic_summary_check CHECK (length(trim(strategic_summary)) > 0),
    CONSTRAINT recommendation_batches_provider_check CHECK (provider IN ('gemini', 'openai')),
    CONSTRAINT recommendation_batches_model_check CHECK (length(trim(model)) > 0)
);

-- Foreign Key Constraints
ALTER TABLE ONLY public.recommendation_batches
    ADD CONSTRAINT recommendation_batches_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

-- Indexes
CREATE INDEX recommendation_batches_business_idx ON public.recommendation_batches USING btree (business_id, created_at DESC);

-- Row Level Security (RLS) & Policy
ALTER TABLE public.recommendation_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY recommendation_batches_business_access ON public.recommendation_batches
    FOR ALL
    USING (
        public.can_access_business(business_id)
    )
    WITH CHECK (
        public.can_access_business(business_id)
    );

-- Table Grants
GRANT ALL ON TABLE public.recommendation_batches TO anon, authenticated, service_role;

-- ============================================================================
-- 2. ALTER RECOMMENDATIONS TABLE
-- ============================================================================

-- Add new columns
ALTER TABLE public.recommendations
    ADD COLUMN batch_id uuid,
    ADD COLUMN recommendation_type text DEFAULT 'CONTENT'::text NOT NULL,
    ADD COLUMN priority text DEFAULT 'MEDIUM'::text NOT NULL,
    ADD COLUMN why_now text,
    ADD COLUMN reasons jsonb DEFAULT '[]'::jsonb NOT NULL,
    ADD COLUMN suggested_formats jsonb DEFAULT '[]'::jsonb NOT NULL,
    ADD COLUMN requires_voiceover boolean DEFAULT false NOT NULL;

-- Foreign Key & Check Constraints
ALTER TABLE ONLY public.recommendations
    ADD CONSTRAINT recommendations_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.recommendation_batches(id) ON DELETE SET NULL,
    ADD CONSTRAINT recommendations_recommendation_type_check CHECK (recommendation_type IN ('CONTENT', 'SEO', 'OFFER', 'VISIBILITY', 'ENGAGEMENT')),
    ADD CONSTRAINT recommendations_priority_check CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH'));

-- Drop NOT NULL on content_type (retained for legacy compatibility)
ALTER TABLE public.recommendations
    ALTER COLUMN content_type DROP NOT NULL;

-- Rename estimated_effort -> estimated_effort_minutes and update check constraint
ALTER TABLE public.recommendations
    RENAME COLUMN estimated_effort TO estimated_effort_minutes;

ALTER TABLE public.recommendations
    DROP CONSTRAINT recommendations_estimated_effort_check;

ALTER TABLE ONLY public.recommendations
    ADD CONSTRAINT recommendations_estimated_effort_minutes_check CHECK (estimated_effort_minutes IS NULL OR (estimated_effort_minutes >= 0 AND estimated_effort_minutes <= 480));

-- Index for batch_id
CREATE INDEX recommendations_batch_id_idx ON public.recommendations USING btree (batch_id);
