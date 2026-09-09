-- Migration: 001_baseline_schema.sql
-- Description: Baseline schema founding migration for Studio Mūza.
-- Reconstructed from remote snapshot excluding RPC functions (002-008) and publish_jobs (009).
-- Ordered strictly according to PostgreSQL DDL dependency requirements.

-- ============================================================================
-- 1. ENUM TYPES (9 Founding Enums)
-- ============================================================================

CREATE TYPE public.content_status AS ENUM (
    'IDEA',
    'DRAFT',
    'READY',
    'SCHEDULED',
    'PUBLISHING',
    'PUBLISHED',
    'FAILED',
    'ARCHIVED'
);

CREATE TYPE public.knowledge_origin AS ENUM (
    'USER_DECLARED',
    'USER_CONFIRMED',
    'OFFICIAL_SOURCE',
    'EXTERNAL_SOURCE',
    'MUZA_INFERRED'
);

CREATE TYPE public.knowledge_status AS ENUM (
    'DISCOVERED',
    'APPROVED',
    'REJECTED',
    'OUTDATED',
    'CONFLICT'
);

CREATE TYPE public.member_status AS ENUM (
    'ACTIVE',
    'INVITED',
    'SUSPENDED'
);

CREATE TYPE public.onboarding_status AS ENUM (
    'NOT_STARTED',
    'IN_PROGRESS',
    'COMPLETED',
    'SKIPPED'
);

CREATE TYPE public.recommendation_status AS ENUM (
    'PROPOSED',
    'ACCEPTED',
    'REJECTED',
    'EXPIRED',
    'CONVERTED'
);

CREATE TYPE public.social_connection_status AS ENUM (
    'CONNECTED',
    'REAUTH_REQUIRED',
    'DISCONNECTED',
    'ERROR'
);

CREATE TYPE public.subscription_status AS ENUM (
    'TRIALING',
    'ACTIVE',
    'PAST_DUE',
    'CANCELED',
    'UNPAID',
    'INCOMPLETE'
);

CREATE TYPE public.workspace_role AS ENUM (
    'OWNER',
    'ADMIN',
    'EDITOR',
    'MEMBER'
);

-- ============================================================================
-- 2. BASE HELPER FUNCTIONS (No Table Dependencies)
-- ============================================================================

-- Function: Trigger to set updated_at column to current timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Function: Event trigger to auto-enable RLS on new public tables
CREATE OR REPLACE FUNCTION public.rls_auto_enable()
RETURNS event_trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog
AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;

-- ============================================================================
-- 3. TABLES (20 Founding Tables)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid NOT NULL,
    first_name text,
    last_name text,
    avatar_url text,
    locale text DEFAULT 'fr-FR'::text NOT NULL,
    timezone text,
    onboarding_completed boolean DEFAULT false NOT NULL,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT profiles_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.workspaces (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT workspaces_pkey PRIMARY KEY (id),
    CONSTRAINT workspaces_slug_key UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS public.workspace_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role public.workspace_role DEFAULT 'MEMBER'::public.workspace_role NOT NULL,
    status public.member_status DEFAULT 'ACTIVE'::public.member_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT workspace_members_pkey PRIMARY KEY (id),
    CONSTRAINT workspace_members_workspace_id_user_id_key UNIQUE (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    provider text DEFAULT 'stripe'::text NOT NULL,
    provider_customer_id text,
    provider_subscription_id text,
    plan_code text DEFAULT 'starter'::text NOT NULL,
    status public.subscription_status DEFAULT 'TRIALING'::public.subscription_status NOT NULL,
    current_period_start timestamp with time zone,
    current_period_end timestamp with time zone,
    trial_ends_at timestamp with time zone,
    cancel_at_period_end boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
    CONSTRAINT subscriptions_provider_provider_subscription_id_key UNIQUE (provider, provider_subscription_id)
);

CREATE TABLE IF NOT EXISTS public.businesses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workspace_id uuid NOT NULL,
    name text NOT NULL,
    slug text,
    industry text,
    subindustry text,
    description text,
    website_url text,
    booking_url text,
    ecommerce_url text,
    country_code character(2),
    region text,
    city text,
    service_area jsonb DEFAULT '{}'::jsonb NOT NULL,
    business_model text,
    onboarding_status public.onboarding_status DEFAULT 'NOT_STARTED'::public.onboarding_status NOT NULL,
    research_status text DEFAULT 'NOT_STARTED'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT businesses_pkey PRIMARY KEY (id),
    CONSTRAINT businesses_workspace_id_slug_key UNIQUE (workspace_id, slug)
);

CREATE TABLE IF NOT EXISTS public.brand_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    positioning text,
    promise text,
    story text,
    personality jsonb DEFAULT '[]'::jsonb NOT NULL,
    values jsonb DEFAULT '[]'::jsonb NOT NULL,
    tone jsonb DEFAULT '{}'::jsonb NOT NULL,
    humor_level smallint,
    commercial_intensity smallint,
    formality_level smallint,
    preferred_vocabulary jsonb DEFAULT '[]'::jsonb NOT NULL,
    avoided_vocabulary jsonb DEFAULT '[]'::jsonb NOT NULL,
    signature_phrases jsonb DEFAULT '[]'::jsonb NOT NULL,
    communication_do jsonb DEFAULT '[]'::jsonb NOT NULL,
    communication_dont jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT brand_profiles_pkey PRIMARY KEY (id),
    CONSTRAINT brand_profiles_business_id_key UNIQUE (business_id),
    CONSTRAINT brand_profiles_commercial_intensity_check CHECK (((commercial_intensity >= 0) AND (commercial_intensity <= 5))),
    CONSTRAINT brand_profiles_formality_level_check CHECK (((formality_level >= 0) AND (formality_level <= 5))),
    CONSTRAINT brand_profiles_humor_level_check CHECK (((humor_level >= 0) AND (humor_level <= 5)))
);

CREATE TABLE IF NOT EXISTS public.creator_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    user_id uuid NOT NULL,
    weekly_minutes integer,
    camera_comfort smallint,
    voiceover_comfort smallint,
    writing_comfort smallint,
    photo_comfort smallint,
    video_comfort smallint,
    social_skill_level text,
    preferred_formats jsonb DEFAULT '[]'::jsonb NOT NULL,
    avoided_formats jsonb DEFAULT '[]'::jsonb NOT NULL,
    barriers jsonb DEFAULT '[]'::jsonb NOT NULL,
    strengths jsonb DEFAULT '[]'::jsonb NOT NULL,
    max_effort_level smallint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT creator_profiles_pkey PRIMARY KEY (id),
    CONSTRAINT creator_profiles_business_id_user_id_key UNIQUE (business_id, user_id),
    CONSTRAINT creator_profiles_camera_comfort_check CHECK (((camera_comfort >= 0) AND (camera_comfort <= 5))),
    CONSTRAINT creator_profiles_max_effort_level_check CHECK (((max_effort_level >= 0) AND (max_effort_level <= 5))),
    CONSTRAINT creator_profiles_photo_comfort_check CHECK (((photo_comfort >= 0) AND (photo_comfort <= 5))),
    CONSTRAINT creator_profiles_video_comfort_check CHECK (((video_comfort >= 0) AND (video_comfort <= 5))),
    CONSTRAINT creator_profiles_voiceover_comfort_check CHECK (((voiceover_comfort >= 0) AND (voiceover_comfort <= 5))),
    CONSTRAINT creator_profiles_weekly_minutes_check CHECK (((weekly_minutes IS NULL) OR (weekly_minutes >= 0))),
    CONSTRAINT creator_profiles_writing_comfort_check CHECK (((writing_comfort >= 0) AND (writing_comfort <= 5)))
);

CREATE TABLE IF NOT EXISTS public.media_assets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    storage_key text NOT NULL,
    original_filename text,
    mime_type text,
    media_type text NOT NULL,
    width integer,
    height integer,
    duration_ms integer,
    file_size bigint,
    source text DEFAULT 'USER_UPLOAD'::text NOT NULL,
    ai_description text,
    ai_tags jsonb DEFAULT '[]'::jsonb NOT NULL,
    detected_objects jsonb DEFAULT '[]'::jsonb NOT NULL,
    detected_scenes jsonb DEFAULT '[]'::jsonb NOT NULL,
    orientation text,
    quality_score numeric,
    brand_relevance_score numeric,
    analysis_status text DEFAULT 'PENDING'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT media_assets_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.visual_identities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    primary_logo_asset_id uuid,
    secondary_logo_asset_id uuid,
    colors jsonb DEFAULT '[]'::jsonb NOT NULL,
    fonts jsonb DEFAULT '[]'::jsonb NOT NULL,
    graphic_rules jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT visual_identities_pkey PRIMARY KEY (id),
    CONSTRAINT visual_identities_business_id_key UNIQUE (business_id)
);

CREATE TABLE IF NOT EXISTS public.audiences (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    needs jsonb DEFAULT '[]'::jsonb NOT NULL,
    desires jsonb DEFAULT '[]'::jsonb NOT NULL,
    problems jsonb DEFAULT '[]'::jsonb NOT NULL,
    objections jsonb DEFAULT '[]'::jsonb NOT NULL,
    motivations jsonb DEFAULT '[]'::jsonb NOT NULL,
    questions jsonb DEFAULT '[]'::jsonb NOT NULL,
    buying_triggers jsonb DEFAULT '[]'::jsonb NOT NULL,
    language_patterns jsonb DEFAULT '[]'::jsonb NOT NULL,
    priority smallint DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT audiences_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.offers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    price_from numeric(12,2),
    price_to numeric(12,2),
    currency character(3) DEFAULT 'EUR'::bpchar,
    url text,
    cta text,
    benefits jsonb DEFAULT '[]'::jsonb NOT NULL,
    objections jsonb DEFAULT '[]'::jsonb NOT NULL,
    seasonality jsonb DEFAULT '{}'::jsonb NOT NULL,
    available_from date,
    available_until date,
    priority smallint DEFAULT 0 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT offers_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.offer_audiences (
    offer_id uuid NOT NULL,
    audience_id uuid NOT NULL,
    CONSTRAINT offer_audiences_pkey PRIMARY KEY (offer_id, audience_id)
);

CREATE TABLE IF NOT EXISTS public.goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    offer_id uuid,
    type text NOT NULL,
    title text NOT NULL,
    description text,
    metric text,
    target_value numeric,
    priority smallint DEFAULT 0 NOT NULL,
    starts_at date,
    ends_at date,
    status text DEFAULT 'ACTIVE'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT goals_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.knowledge_facts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    namespace text NOT NULL,
    fact_key text NOT NULL,
    value jsonb NOT NULL,
    origin public.knowledge_origin NOT NULL,
    confidence numeric DEFAULT 0.5 NOT NULL,
    status public.knowledge_status DEFAULT 'DISCOVERED'::public.knowledge_status NOT NULL,
    source_url text,
    source_title text,
    source_type text,
    discovered_at timestamp with time zone DEFAULT now() NOT NULL,
    last_verified_at timestamp with time zone,
    expires_at timestamp with time zone,
    supersedes_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT knowledge_facts_pkey PRIMARY KEY (id),
    CONSTRAINT knowledge_facts_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric)))
);

CREATE TABLE IF NOT EXISTS public.research_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    type text NOT NULL,
    status text DEFAULT 'PENDING'::text NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    sources_found integer DEFAULT 0 NOT NULL,
    facts_created integer DEFAULT 0 NOT NULL,
    error jsonb,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT research_runs_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.social_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    platform text NOT NULL,
    external_account_id text NOT NULL,
    account_name text,
    account_type text,
    access_token_encrypted text,
    refresh_token_encrypted text,
    token_expires_at timestamp with time zone,
    scopes jsonb DEFAULT '[]'::jsonb NOT NULL,
    capabilities jsonb DEFAULT '{}'::jsonb NOT NULL,
    status public.social_connection_status DEFAULT 'CONNECTED'::public.social_connection_status NOT NULL,
    last_verified_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT social_accounts_pkey PRIMARY KEY (id),
    CONSTRAINT social_accounts_business_id_platform_external_account_id_key UNIQUE (business_id, platform, external_account_id)
);

CREATE TABLE IF NOT EXISTS public.recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    goal_id uuid,
    offer_id uuid,
    audience_id uuid,
    title text NOT NULL,
    concept text,
    content_type text NOT NULL,
    angle text,
    content_pillar text,
    estimated_effort smallint,
    camera_required boolean DEFAULT false NOT NULL,
    required_assets jsonb DEFAULT '[]'::jsonb NOT NULL,
    target_platforms jsonb DEFAULT '[]'::jsonb NOT NULL,
    cta text,
    score numeric,
    score_breakdown jsonb DEFAULT '{}'::jsonb NOT NULL,
    explanation text,
    status public.recommendation_status DEFAULT 'PROPOSED'::public.recommendation_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    CONSTRAINT recommendations_pkey PRIMARY KEY (id),
    CONSTRAINT recommendations_estimated_effort_check CHECK (((estimated_effort >= 0) AND (estimated_effort <= 5))),
    CONSTRAINT recommendations_score_check CHECK (((score IS NULL) OR ((score >= (0)::numeric) AND (score <= (100)::numeric))))
);

CREATE TABLE IF NOT EXISTS public.contents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    recommendation_id uuid,
    goal_id uuid,
    offer_id uuid,
    audience_id uuid,
    content_type text NOT NULL,
    topic text,
    angle text,
    content_pillar text,
    hook text,
    body text,
    script text,
    cta text,
    status public.content_status DEFAULT 'DRAFT'::public.content_status NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    scheduled_at timestamp with time zone,
    published_at timestamp with time zone,
    CONSTRAINT contents_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.content_variants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    content_id uuid NOT NULL,
    social_account_id uuid,
    platform text NOT NULL,
    format text,
    title text,
    caption text,
    script text,
    cta text,
    hashtags jsonb DEFAULT '[]'::jsonb NOT NULL,
    keywords jsonb DEFAULT '[]'::jsonb NOT NULL,
    aspect_ratio text,
    duration_ms integer,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    status text DEFAULT 'DRAFT'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT content_variants_pkey PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.content_media (
    content_id uuid NOT NULL,
    media_asset_id uuid NOT NULL,
    position integer DEFAULT 0 NOT NULL,
    usage_type text,
    CONSTRAINT content_media_pkey PRIMARY KEY (content_id, media_asset_id)
);

-- ============================================================================
-- 4. FOREIGN KEY CONSTRAINTS (Added after all table definitions)
-- ============================================================================

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.workspaces
    ADD CONSTRAINT workspaces_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;

ALTER TABLE ONLY public.workspace_members
    ADD CONSTRAINT workspace_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    ADD CONSTRAINT workspace_members_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.businesses
    ADD CONSTRAINT businesses_workspace_id_fkey FOREIGN KEY (workspace_id) REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.brand_profiles
    ADD CONSTRAINT brand_profiles_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.creator_profiles
    ADD CONSTRAINT creator_profiles_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE,
    ADD CONSTRAINT creator_profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.media_assets
    ADD CONSTRAINT media_assets_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.visual_identities
    ADD CONSTRAINT visual_identities_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE,
    ADD CONSTRAINT visual_identities_primary_logo_asset_id_fkey FOREIGN KEY (primary_logo_asset_id) REFERENCES public.media_assets(id) ON DELETE SET NULL,
    ADD CONSTRAINT visual_identities_secondary_logo_asset_id_fkey FOREIGN KEY (secondary_logo_asset_id) REFERENCES public.media_assets(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.audiences
    ADD CONSTRAINT audiences_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.offer_audiences
    ADD CONSTRAINT offer_audiences_audience_id_fkey FOREIGN KEY (audience_id) REFERENCES public.audiences(id) ON DELETE CASCADE,
    ADD CONSTRAINT offer_audiences_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE,
    ADD CONSTRAINT goals_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.knowledge_facts
    ADD CONSTRAINT knowledge_facts_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE,
    ADD CONSTRAINT knowledge_facts_supersedes_id_fkey FOREIGN KEY (supersedes_id) REFERENCES public.knowledge_facts(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.research_runs
    ADD CONSTRAINT research_runs_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.social_accounts
    ADD CONSTRAINT social_accounts_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE;

ALTER TABLE ONLY public.recommendations
    ADD CONSTRAINT recommendations_audience_id_fkey FOREIGN KEY (audience_id) REFERENCES public.audiences(id) ON DELETE SET NULL,
    ADD CONSTRAINT recommendations_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE,
    ADD CONSTRAINT recommendations_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE SET NULL,
    ADD CONSTRAINT recommendations_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.contents
    ADD CONSTRAINT contents_audience_id_fkey FOREIGN KEY (audience_id) REFERENCES public.audiences(id) ON DELETE SET NULL,
    ADD CONSTRAINT contents_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE,
    ADD CONSTRAINT contents_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.goals(id) ON DELETE SET NULL,
    ADD CONSTRAINT contents_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE SET NULL,
    ADD CONSTRAINT contents_recommendation_id_fkey FOREIGN KEY (recommendation_id) REFERENCES public.recommendations(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.content_variants
    ADD CONSTRAINT content_variants_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.contents(id) ON DELETE CASCADE,
    ADD CONSTRAINT content_variants_social_account_id_fkey FOREIGN KEY (social_account_id) REFERENCES public.social_accounts(id) ON DELETE SET NULL;

ALTER TABLE ONLY public.content_media
    ADD CONSTRAINT content_media_content_id_fkey FOREIGN KEY (content_id) REFERENCES public.contents(id) ON DELETE CASCADE,
    ADD CONSTRAINT content_media_media_asset_id_fkey FOREIGN KEY (media_asset_id) REFERENCES public.media_assets(id) ON DELETE CASCADE;

-- ============================================================================
-- 5. INDEXES (15 Founding Indexes)
-- ============================================================================

CREATE INDEX audiences_business_id_idx ON public.audiences USING btree (business_id);
CREATE INDEX businesses_workspace_id_idx ON public.businesses USING btree (workspace_id);
CREATE INDEX content_variants_content_id_idx ON public.content_variants USING btree (content_id);
CREATE INDEX contents_business_status_idx ON public.contents USING btree (business_id, status, created_at DESC);
CREATE INDEX goals_business_status_idx ON public.goals USING btree (business_id, status);
CREATE INDEX knowledge_facts_business_key_idx ON public.knowledge_facts USING btree (business_id, namespace, fact_key);
CREATE INDEX knowledge_facts_status_idx ON public.knowledge_facts USING btree (business_id, status);
CREATE INDEX media_assets_business_id_idx ON public.media_assets USING btree (business_id);
CREATE INDEX offers_business_id_idx ON public.offers USING btree (business_id);
CREATE INDEX recommendations_business_status_idx ON public.recommendations USING btree (business_id, status, created_at DESC);
CREATE INDEX research_runs_business_type_idx ON public.research_runs USING btree (business_id, type, created_at DESC);
CREATE INDEX social_accounts_business_id_idx ON public.social_accounts USING btree (business_id);
CREATE INDEX subscriptions_workspace_id_idx ON public.subscriptions USING btree (workspace_id);
CREATE INDEX workspace_members_user_id_idx ON public.workspace_members USING btree (user_id);
CREATE INDEX workspace_members_workspace_id_idx ON public.workspace_members USING btree (workspace_id);

-- ============================================================================
-- 6. TABLE-DEPENDENT FUNCTIONS (Created after tables exist)
-- ============================================================================

-- Function: Security helper to check active workspace membership for RLS (depends on workspace_members)
CREATE OR REPLACE FUNCTION public.is_workspace_member(target_workspace_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
      and wm.status = 'ACTIVE'
  );
$$;

-- Function: Security helper to check active workspace membership for a business for RLS (depends on businesses & workspace_members)
CREATE OR REPLACE FUNCTION public.can_access_business(target_business_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  select exists (
    select 1
    from public.businesses b
    join public.workspace_members wm
      on wm.workspace_id = b.workspace_id
    where b.id = target_business_id
      and wm.user_id = auth.uid()
      and wm.status = 'ACTIVE'
  );
$$;

-- Function: Trigger to auto-create profiles record upon user signup in auth.users (depends on profiles)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
declare
  v_full_name text;
  v_first_name text;
  v_last_name text;
begin
  v_full_name := trim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));

  if v_full_name <> '' then
    v_first_name := split_part(v_full_name, ' ', 1);

    if position(' ' in v_full_name) > 0 then
      v_last_name := trim(substr(v_full_name, position(' ' in v_full_name) + 1));
    else
      v_last_name := null;
    end if;
  end if;

  insert into public.profiles (
    id,
    first_name,
    last_name
  )
  values (
    new.id,
    nullif(v_first_name, ''),
    nullif(v_last_name, '')
  )
  on conflict (id) do update
  set
    first_name = coalesce(excluded.first_name, profiles.first_name),
    last_name = coalesce(excluded.last_name, profiles.last_name);

  return new;
end;
$$;

-- ============================================================================
-- 7. TRIGGERS FOR UPDATED_AT (14 Founding Triggers)
-- ============================================================================

CREATE OR REPLACE TRIGGER audiences_set_updated_at BEFORE UPDATE ON public.audiences FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER brand_profiles_set_updated_at BEFORE UPDATE ON public.brand_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER businesses_set_updated_at BEFORE UPDATE ON public.businesses FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER content_variants_set_updated_at BEFORE UPDATE ON public.content_variants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER contents_set_updated_at BEFORE UPDATE ON public.contents FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER creator_profiles_set_updated_at BEFORE UPDATE ON public.creator_profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER goals_set_updated_at BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER media_assets_set_updated_at BEFORE UPDATE ON public.media_assets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER offers_set_updated_at BEFORE UPDATE ON public.offers FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER social_accounts_set_updated_at BEFORE UPDATE ON public.social_accounts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER subscriptions_set_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER visual_identities_set_updated_at BEFORE UPDATE ON public.visual_identities FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE OR REPLACE TRIGGER workspaces_set_updated_at BEFORE UPDATE ON public.workspaces FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 8. AUTH USER TRIGGER
-- ============================================================================

-- Trigger: Link handle_new_user function to auth.users table
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 9. ROW LEVEL SECURITY (RLS) & POLICIES (24 Founding Policies)
-- ============================================================================

ALTER TABLE public.audiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY audiences_business_access ON public.audiences USING (public.can_access_business(business_id)) WITH CHECK (public.can_access_business(business_id));

ALTER TABLE public.brand_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY brand_profiles_business_access ON public.brand_profiles USING (public.can_access_business(business_id)) WITH CHECK (public.can_access_business(business_id));

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
CREATE POLICY businesses_insert_member ON public.businesses FOR INSERT WITH CHECK (public.is_workspace_member(workspace_id));
CREATE POLICY businesses_select_member ON public.businesses FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY businesses_update_member ON public.businesses FOR UPDATE USING (public.is_workspace_member(workspace_id)) WITH CHECK (public.is_workspace_member(workspace_id));

ALTER TABLE public.content_media ENABLE ROW LEVEL SECURITY;
CREATE POLICY content_media_business_access ON public.content_media USING ((EXISTS ( SELECT 1 FROM public.contents c WHERE ((c.id = content_media.content_id) AND public.can_access_business(c.business_id))))) WITH CHECK ((EXISTS ( SELECT 1 FROM public.contents c WHERE ((c.id = content_media.content_id) AND public.can_access_business(c.business_id)))));

ALTER TABLE public.content_variants ENABLE ROW LEVEL SECURITY;
CREATE POLICY content_variants_business_access ON public.content_variants USING ((EXISTS ( SELECT 1 FROM public.contents c WHERE ((c.id = content_variants.content_id) AND public.can_access_business(c.business_id))))) WITH CHECK ((EXISTS ( SELECT 1 FROM public.contents c WHERE ((c.id = content_variants.content_id) AND public.can_access_business(c.business_id)))));

ALTER TABLE public.contents ENABLE ROW LEVEL SECURITY;
CREATE POLICY contents_business_access ON public.contents USING (public.can_access_business(business_id)) WITH CHECK (public.can_access_business(business_id));

ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY creator_profiles_business_access ON public.creator_profiles USING (public.can_access_business(business_id)) WITH CHECK (public.can_access_business(business_id));

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY goals_business_access ON public.goals USING (public.can_access_business(business_id)) WITH CHECK (public.can_access_business(business_id));

ALTER TABLE public.knowledge_facts ENABLE ROW LEVEL SECURITY;
CREATE POLICY knowledge_facts_business_access ON public.knowledge_facts USING (public.can_access_business(business_id)) WITH CHECK (public.can_access_business(business_id));

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY media_assets_business_access ON public.media_assets USING (public.can_access_business(business_id)) WITH CHECK (public.can_access_business(business_id));

ALTER TABLE public.offer_audiences ENABLE ROW LEVEL SECURITY;
CREATE POLICY offer_audiences_business_access ON public.offer_audiences USING ((EXISTS ( SELECT 1 FROM public.offers o WHERE ((o.id = offer_audiences.offer_id) AND public.can_access_business(o.business_id))))) WITH CHECK ((EXISTS ( SELECT 1 FROM public.offers o WHERE ((o.id = offer_audiences.offer_id) AND public.can_access_business(o.business_id)))));

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY offers_business_access ON public.offers USING (public.can_access_business(business_id)) WITH CHECK (public.can_access_business(business_id));

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING ((id = auth.uid()));
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING ((id = auth.uid())) WITH CHECK ((id = auth.uid()));

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY recommendations_business_access ON public.recommendations USING (public.can_access_business(business_id)) WITH CHECK (public.can_access_business(business_id));

ALTER TABLE public.research_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY research_runs_business_access ON public.research_runs USING (public.can_access_business(business_id)) WITH CHECK (public.can_access_business(business_id));

ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY social_accounts_business_access ON public.social_accounts USING (public.can_access_business(business_id)) WITH CHECK (public.can_access_business(business_id));

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY subscriptions_select_member ON public.subscriptions FOR SELECT USING (public.is_workspace_member(workspace_id));

ALTER TABLE public.visual_identities ENABLE ROW LEVEL SECURITY;
CREATE POLICY visual_identities_business_access ON public.visual_identities USING (public.can_access_business(business_id)) WITH CHECK (public.can_access_business(business_id));

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspace_members_insert_owner_admin ON public.workspace_members FOR INSERT WITH CHECK (((user_id = auth.uid()) OR (EXISTS ( SELECT 1 FROM public.workspace_members wm WHERE ((wm.workspace_id = workspace_members.workspace_id) AND (wm.user_id = auth.uid()) AND (wm.status = 'ACTIVE'::public.member_status) AND (wm.role = ANY (ARRAY['OWNER'::public.workspace_role, 'ADMIN'::public.workspace_role])))))));
CREATE POLICY workspace_members_select_member ON public.workspace_members FOR SELECT USING (public.is_workspace_member(workspace_id));
CREATE POLICY workspace_members_update_owner_admin ON public.workspace_members FOR UPDATE USING ((EXISTS ( SELECT 1 FROM public.workspace_members wm WHERE ((wm.workspace_id = workspace_members.workspace_id) AND (wm.user_id = auth.uid()) AND (wm.status = 'ACTIVE'::public.member_status) AND (wm.role = ANY (ARRAY['OWNER'::public.workspace_role, 'ADMIN'::public.workspace_role])))))) WITH CHECK ((EXISTS ( SELECT 1 FROM public.workspace_members wm WHERE ((wm.workspace_id = workspace_members.workspace_id) AND (wm.user_id = auth.uid()) AND (wm.status = 'ACTIVE'::public.member_status) AND (wm.role = ANY (ARRAY['OWNER'::public.workspace_role, 'ADMIN'::public.workspace_role]))))));

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY workspaces_insert_authenticated ON public.workspaces FOR INSERT TO authenticated WITH CHECK ((created_by = auth.uid()));
CREATE POLICY workspaces_select_member ON public.workspaces FOR SELECT USING (public.is_workspace_member(id));
CREATE POLICY workspaces_update_member ON public.workspaces FOR UPDATE USING (public.is_workspace_member(id)) WITH CHECK (public.is_workspace_member(id));

-- ============================================================================
-- 10. GRANTS
-- ============================================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON FUNCTION public.can_access_business(target_business_id uuid) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.handle_new_user() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.is_workspace_member(target_workspace_id uuid) TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.rls_auto_enable() TO anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.set_updated_at() TO anon, authenticated, service_role;

GRANT ALL ON TABLE public.audiences TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.brand_profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.businesses TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.content_media TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.content_variants TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.contents TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.creator_profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.goals TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.knowledge_facts TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.media_assets TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.offer_audiences TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.offers TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.recommendations TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.research_runs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.social_accounts TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.subscriptions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.visual_identities TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.workspace_members TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.workspaces TO anon, authenticated, service_role;
