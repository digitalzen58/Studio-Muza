-- Migration: 014_content_draft_foundation.sql
-- Description: Uniqueness guarantee on (business_id, recommendation_id) and atomic create-or-get draft RPC.

-- ============================================================================
-- 1. UNIQUENESS GUARANTEE FOR CANONICAL RECOMMENDATION CONTENTS
-- ============================================================================

-- Ensure that at most one canonical content can exist per business & recommendation
CREATE UNIQUE INDEX IF NOT EXISTS contents_business_recommendation_unique_idx
    ON public.contents (business_id, recommendation_id)
    WHERE recommendation_id IS NOT NULL;

-- ============================================================================
-- 2. SECURE ATOMIC RPC: CREATE OR GET CONTENT DRAFT FROM RECOMMENDATION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_or_get_content_draft_from_recommendation(
    p_recommendation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid;
    v_rec record;
    v_existing_content_id uuid;
    v_content_id uuid;
    v_content_type text;
    v_primary_format text;
    v_primary_platform text;
    v_slides jsonb;
    v_aspect_ratio text;
BEGIN
    -- 1. Security Check: Current user must be authenticated
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to initialize content draft' USING ERRCODE = '40100';
    END IF;

    -- 2. Validate recommendation input
    IF p_recommendation_id IS NULL THEN
        RAISE EXCEPTION 'Invalid recommendation identifier' USING ERRCODE = '22023';
    END IF;

    -- 3. Load recommendation and verify existence
    SELECT
        r.id,
        r.business_id,
        r.goal_id,
        r.offer_id,
        r.audience_id,
        r.title,
        r.concept,
        r.angle,
        r.cta,
        r.recommendation_type,
        r.suggested_formats,
        r.status
    INTO v_rec
    FROM public.recommendations r
    WHERE r.id = p_recommendation_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Recommendation not found' USING ERRCODE = '02000';
    END IF;

    -- 4. Multi-tenant Authorization Check: User must have access to recommendation's business
    IF NOT public.can_access_business(v_rec.business_id) THEN
        RAISE EXCEPTION 'Unauthorized access to recommendation business' USING ERRCODE = '42501';
    END IF;

    -- 5. Idempotency Check: Check if canonical content already exists
    SELECT c.id
    INTO v_existing_content_id
    FROM public.contents c
    WHERE c.business_id = v_rec.business_id
      AND c.recommendation_id = p_recommendation_id;

    IF v_existing_content_id IS NOT NULL THEN
        -- Reopening existing draft is idempotent; do not mutate recommendation state if already accepted
        RETURN jsonb_build_object(
            'content_id', v_existing_content_id,
            'is_new', false
        );
    END IF;

    -- 6. Derive content format and structure deterministically (0 AI calls)
    -- Map suggested formats
    v_content_type := 'POST';
    v_primary_format := 'POST';
    v_primary_platform := 'INSTAGRAM';
    v_aspect_ratio := '4:5';

    IF v_rec.suggested_formats IS NOT NULL AND jsonb_typeof(v_rec.suggested_formats) = 'array' AND jsonb_array_length(v_rec.suggested_formats) > 0 THEN
        IF v_rec.suggested_formats ? 'INSTAGRAM_CAROUSEL' THEN
            v_content_type := 'POST';
            v_primary_format := 'CAROUSEL';
            v_primary_platform := 'INSTAGRAM';
            v_aspect_ratio := '4:5';
        ELSIF v_rec.suggested_formats ? 'INSTAGRAM_REEL' THEN
            v_content_type := 'REEL';
            v_primary_format := 'REEL';
            v_primary_platform := 'INSTAGRAM';
            v_aspect_ratio := '9:16';
        ELSIF v_rec.suggested_formats ? 'FACEBOOK_POST' THEN
            v_content_type := 'POST';
            v_primary_format := 'POST';
            v_primary_platform := 'FACEBOOK';
            v_aspect_ratio := '1:1';
        ELSIF v_rec.suggested_formats ? 'INSTAGRAM_POST' THEN
            v_content_type := 'POST';
            v_primary_format := 'POST';
            v_primary_platform := 'INSTAGRAM';
            v_aspect_ratio := '4:5';
        END IF;
    END IF;

    -- 7. Initialize empty carousel scaffold (structural labels only, 0 fabricated text)
    IF v_primary_format = 'CAROUSEL' THEN
        v_slides := jsonb_build_array(
            jsonb_build_object('index', 1, 'type', 'COVER', 'label', 'Couverture', 'text', '', 'media_id', null),
            jsonb_build_object('index', 2, 'type', 'SLIDE', 'label', 'Balade 1', 'text', '', 'media_id', null),
            jsonb_build_object('index', 3, 'type', 'SLIDE', 'label', 'Balade 2', 'text', '', 'media_id', null),
            jsonb_build_object('index', 4, 'type', 'SLIDE', 'label', 'Balade 3', 'text', '', 'media_id', null),
            jsonb_build_object('index', 5, 'type', 'CTA', 'label', 'Conclusion / CTA', 'text', '', 'media_id', null)
        );
    ELSE
        v_slides := '[]'::jsonb;
    END IF;

    -- 8. Atomic Insert with ON CONFLICT DO NOTHING concurrency protection
    INSERT INTO public.contents (
        business_id,
        recommendation_id,
        goal_id,
        offer_id,
        audience_id,
        content_type,
        topic,
        angle,
        content_pillar,
        hook,
        body,
        script,
        cta,
        status
    )
    VALUES (
        v_rec.business_id,
        p_recommendation_id,
        v_rec.goal_id,
        v_rec.offer_id,
        v_rec.audience_id,
        v_content_type,
        v_rec.title,
        v_rec.angle,
        NULL,
        NULL, -- Zero invented copy: user writes hook manually
        NULL, -- Zero invented copy: user writes body manually
        NULL, -- Zero invented copy: user writes script manually
        v_rec.cta,
        'DRAFT'
    )
    ON CONFLICT (business_id, recommendation_id) WHERE recommendation_id IS NOT NULL
    DO NOTHING
    RETURNING id INTO v_content_id;

    -- If concurrent request inserted simultaneously, fetch existing row
    IF v_content_id IS NULL THEN
        SELECT c.id
        INTO STRICT v_content_id
        FROM public.contents c
        WHERE c.business_id = v_rec.business_id
          AND c.recommendation_id = p_recommendation_id;

        RETURN jsonb_build_object(
            'content_id', v_content_id,
            'is_new', false
        );
    END IF;

    -- 9. Insert canonical platform variant
    INSERT INTO public.content_variants (
        content_id,
        social_account_id,
        platform,
        format,
        title,
        caption,
        script,
        cta,
        hashtags,
        keywords,
        aspect_ratio,
        metadata,
        status
    )
    VALUES (
        v_content_id,
        NULL,
        v_primary_platform,
        v_primary_format,
        v_rec.title,
        NULL, -- Zero invented copy
        NULL,
        v_rec.cta,
        '[]'::jsonb, -- Empty hashtags in Step 144
        '[]'::jsonb, -- Empty keywords in Step 144
        v_aspect_ratio,
        jsonb_build_object('slides', v_slides),
        'DRAFT'
    );

    -- 10. Update recommendation lifecycle: PROPOSED -> ACCEPTED
    -- Only transition if current status is PROPOSED; do not set CONVERTED (reserved for publish/schedule)
    UPDATE public.recommendations
    SET status = 'ACCEPTED'
    WHERE id = p_recommendation_id
      AND status = 'PROPOSED';

    -- 11. Return response
    RETURN jsonb_build_object(
        'content_id', v_content_id,
        'is_new', true
    );
END;
$$;

-- Security: Revoke all from PUBLIC and anon, grant ONLY to authenticated
REVOKE ALL ON FUNCTION public.create_or_get_content_draft_from_recommendation(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_or_get_content_draft_from_recommendation(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_or_get_content_draft_from_recommendation(uuid) TO authenticated;
