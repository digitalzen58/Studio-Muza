-- Migration: 009_create_publish_jobs.sql
-- Description: Create publish_jobs table and publish_job_status enum type.

-- ============================================================================
-- 1. ENUM TYPE
-- ============================================================================

CREATE TYPE public.publish_job_status AS ENUM (
    'PENDING',
    'PREPARING',
    'UPLOADING',
    'PROCESSING',
    'PUBLISHED',
    'FAILED',
    'RETRYING'
);

-- ============================================================================
-- 2. TABLE DEFINITION
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.publish_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content_variant_id uuid NOT NULL,
    social_account_id uuid,
    scheduled_at timestamp with time zone NOT NULL,
    status public.publish_job_status DEFAULT 'PENDING'::public.publish_job_status NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    platform_post_id text,
    platform_post_url text,
    platform_status text,
    last_error_code text,
    last_error_message text,
    started_at timestamp with time zone,
    published_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT publish_jobs_pkey PRIMARY KEY (id)
);

-- ============================================================================
-- 3. FOREIGN KEY CONSTRAINTS
-- ============================================================================

ALTER TABLE ONLY public.publish_jobs
    ADD CONSTRAINT publish_jobs_content_variant_id_fkey FOREIGN KEY (content_variant_id) REFERENCES public.content_variants(id) ON DELETE CASCADE,
    ADD CONSTRAINT publish_jobs_social_account_id_fkey FOREIGN KEY (social_account_id) REFERENCES public.social_accounts(id) ON DELETE SET NULL;

-- ============================================================================
-- 4. INDEXES
-- ============================================================================

CREATE INDEX publish_jobs_scheduled_status_idx ON public.publish_jobs USING btree (status, scheduled_at);
CREATE INDEX publish_jobs_variant_idx ON public.publish_jobs USING btree (content_variant_id);

-- ============================================================================
-- 5. TRIGGER FOR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE TRIGGER publish_jobs_set_updated_at
    BEFORE UPDATE ON public.publish_jobs
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 6. ROW LEVEL SECURITY (RLS) & POLICY
-- ============================================================================

ALTER TABLE public.publish_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY publish_jobs_business_access ON public.publish_jobs
    USING (
        EXISTS (
            SELECT 1
            FROM public.content_variants cv
            JOIN public.contents c ON c.id = cv.content_id
            WHERE cv.id = publish_jobs.content_variant_id
              AND public.can_access_business(c.business_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.content_variants cv
            JOIN public.contents c ON c.id = cv.content_id
            WHERE cv.id = publish_jobs.content_variant_id
              AND public.can_access_business(c.business_id)
        )
    );

-- ============================================================================
-- 7. GRANTS
-- ============================================================================

GRANT ALL ON TABLE public.publish_jobs TO anon, authenticated, service_role;
