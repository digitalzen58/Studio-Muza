-- Migration: 012_editorial_memory.sql
-- Description: Editorial memory foundation schema extension and RPC updates for concept tracking.

-- ============================================================================
-- 1. ALTER RECOMMENDATIONS TABLE
-- ============================================================================

ALTER TABLE public.recommendations
    ADD COLUMN IF NOT EXISTS editorial_topic text,
    ADD COLUMN IF NOT EXISTS editorial_angle text,
    ADD COLUMN IF NOT EXISTS concept_key text,
    ADD COLUMN IF NOT EXISTS novelty_reason text;

-- Indexes for historical editorial lookup
CREATE INDEX IF NOT EXISTS recommendations_business_created_idx
    ON public.recommendations USING btree (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS recommendations_business_concept_key_idx
    ON public.recommendations USING btree (business_id, concept_key, created_at DESC);

-- ============================================================================
-- 2. UPDATE SAVE_RECOMMENDATION_BATCH RPC FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.save_recommendation_batch(
  p_business_id uuid,
  p_strategic_summary text,
  p_provider text,
  p_model text,
  p_generated_at timestamp with time zone,
  p_recommendations jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_owner_workspace_count integer;
  v_workspace_id uuid;
  v_business_valid boolean;
  v_lock_key bigint;
  v_audience_id uuid;
  v_goal_id uuid;
  v_offer_id uuid;
  v_batch_id uuid;
  v_rec jsonb;
  v_reason jsonb;
  v_format text;
  v_estimated_effort_num integer;
  v_content_angle text;
  v_cta text;
  v_editorial_topic text;
  v_editorial_angle text;
  v_concept_key text;
  v_novelty_reason text;
  v_rec_id uuid;
  v_recommendation_ids uuid[] := ARRAY[]::uuid[];
BEGIN
  -- 1. Security Check: Retrieve current authenticated user ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to save recommendation batch' USING ERRCODE = '40100';
  END IF;

  -- 2. Ownership Invariant Verification
  SELECT COUNT(*)
  INTO v_owner_workspace_count
  FROM public.workspace_members
  WHERE user_id = v_user_id
    AND status = 'ACTIVE'
    AND role = 'OWNER';

  IF v_owner_workspace_count = 0 THEN
    RAISE EXCEPTION 'No active OWNER workspace found for user' USING ERRCODE = '42000';
  ELSIF v_owner_workspace_count > 1 THEN
    RAISE EXCEPTION 'Invariant violation: Multiple active OWNER workspaces found for user' USING ERRCODE = '42000';
  END IF;

  SELECT workspace_id
  INTO STRICT v_workspace_id
  FROM public.workspace_members
  WHERE user_id = v_user_id
    AND status = 'ACTIVE'
    AND role = 'OWNER';

  -- 3. Business Selector Verification
  IF p_business_id IS NULL THEN
    RAISE EXCEPTION 'Invalid business selector' USING ERRCODE = '22023';
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.businesses
    WHERE id = p_business_id
      AND workspace_id = v_workspace_id
  ) INTO v_business_valid;

  IF NOT v_business_valid THEN
    RAISE EXCEPTION 'Unauthorized business selector' USING ERRCODE = '42501';
  END IF;

  -- 4. Advisory Lock
  v_lock_key := ('x' || SUBSTRING(REPLACE(v_workspace_id::text, '-', ''), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 5. Batch Payload Validation
  IF p_strategic_summary IS NULL OR TRIM(p_strategic_summary) = '' THEN
    RAISE EXCEPTION 'Strategic summary is required' USING ERRCODE = '22023';
  END IF;

  IF p_provider IS NULL OR p_provider NOT IN ('gemini', 'openai') THEN
    RAISE EXCEPTION 'Invalid provider' USING ERRCODE = '22023';
  END IF;

  IF p_model IS NULL OR TRIM(p_model) = '' THEN
    RAISE EXCEPTION 'Model is required' USING ERRCODE = '22023';
  END IF;

  IF p_generated_at IS NULL THEN
    RAISE EXCEPTION 'Generated at timestamp is required' USING ERRCODE = '22023';
  END IF;

  IF p_recommendations IS NULL OR jsonb_typeof(p_recommendations) <> 'array' THEN
    RAISE EXCEPTION 'Recommendations must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF jsonb_array_length(p_recommendations) < 3 OR jsonb_array_length(p_recommendations) > 5 THEN
    RAISE EXCEPTION 'Recommendation batch must contain between 3 and 5 items' USING ERRCODE = '22023';
  END IF;

  -- 6. Context Resolution (Once per batch)
  SELECT a.id INTO v_audience_id
  FROM public.audiences a
  WHERE a.business_id = p_business_id
    AND a.active = true
  ORDER BY a.priority DESC, a.created_at ASC
  LIMIT 1;

  SELECT g.id INTO v_goal_id
  FROM public.goals g
  WHERE g.business_id = p_business_id
    AND g.status = 'ACTIVE'
  ORDER BY g.priority DESC, g.created_at ASC
  LIMIT 1;

  SELECT o.id INTO v_offer_id
  FROM public.offers o
  WHERE o.business_id = p_business_id
    AND o.active = true
  ORDER BY o.priority DESC, o.created_at ASC
  LIMIT 1;

  -- 7. Parent Insert
  INSERT INTO public.recommendation_batches (
    business_id,
    strategic_summary,
    provider,
    model,
    generated_at
  )
  VALUES (
    p_business_id,
    TRIM(p_strategic_summary),
    p_provider,
    TRIM(p_model),
    p_generated_at
  )
  RETURNING id INTO v_batch_id;

  -- 8. Child Recommendation Iteration & Validation
  FOR v_rec IN SELECT * FROM jsonb_array_elements(p_recommendations) LOOP
    -- Reject ownership or context identifiers in JSON items
    IF v_rec ? 'userId' OR v_rec ? 'workspaceId' OR v_rec ? 'businessId' OR v_rec ? 'goalId' OR v_rec ? 'audienceId' OR v_rec ? 'offerId' THEN
      RAISE EXCEPTION 'Recommendation object must not contain ownership or context identifiers' USING ERRCODE = '22023';
    END IF;

    -- Validate type
    IF jsonb_typeof(v_rec -> 'type') <> 'string' OR (v_rec ->> 'type') NOT IN ('CONTENT', 'SEO', 'OFFER', 'VISIBILITY', 'ENGAGEMENT') THEN
      RAISE EXCEPTION 'Invalid or missing recommendation type' USING ERRCODE = '22023';
    END IF;

    -- Validate title
    IF jsonb_typeof(v_rec -> 'title') <> 'string' OR TRIM(v_rec ->> 'title') = '' OR LENGTH(TRIM(v_rec ->> 'title')) > 140 THEN
      RAISE EXCEPTION 'Invalid recommendation title' USING ERRCODE = '22023';
    END IF;

    -- Validate summary
    IF jsonb_typeof(v_rec -> 'summary') <> 'string' OR TRIM(v_rec ->> 'summary') = '' OR LENGTH(TRIM(v_rec ->> 'summary')) > 500 THEN
      RAISE EXCEPTION 'Invalid recommendation summary' USING ERRCODE = '22023';
    END IF;

    -- Validate priority
    IF jsonb_typeof(v_rec -> 'priority') <> 'string' OR (v_rec ->> 'priority') NOT IN ('LOW', 'MEDIUM', 'HIGH') THEN
      RAISE EXCEPTION 'Invalid recommendation priority' USING ERRCODE = '22023';
    END IF;

    -- Validate whyNow
    IF jsonb_typeof(v_rec -> 'whyNow') <> 'string' OR TRIM(v_rec ->> 'whyNow') = '' OR LENGTH(TRIM(v_rec ->> 'whyNow')) > 500 THEN
      RAISE EXCEPTION 'Invalid recommendation whyNow' USING ERRCODE = '22023';
    END IF;

    -- Validate reasons
    IF jsonb_typeof(v_rec -> 'reasons') <> 'array' OR jsonb_array_length(v_rec -> 'reasons') < 1 OR jsonb_array_length(v_rec -> 'reasons') > 5 THEN
      RAISE EXCEPTION 'reasons must be a JSON array of length 1 to 5' USING ERRCODE = '22023';
    END IF;

    FOR v_reason IN SELECT * FROM jsonb_array_elements(v_rec -> 'reasons') LOOP
      IF jsonb_typeof(v_reason) <> 'object' THEN
        RAISE EXCEPTION 'Every reason must be an object' USING ERRCODE = '22023';
      END IF;
      IF jsonb_typeof(v_reason -> 'label') <> 'string' OR TRIM(v_reason ->> 'label') = '' THEN
        RAISE EXCEPTION 'Reason label must be a non-empty string' USING ERRCODE = '22023';
      END IF;
      IF jsonb_typeof(v_reason -> 'explanation') <> 'string' OR TRIM(v_reason ->> 'explanation') = '' THEN
        RAISE EXCEPTION 'Reason explanation must be a non-empty string' USING ERRCODE = '22023';
      END IF;
    END LOOP;

    -- Validate suggestedFormats
    IF jsonb_typeof(v_rec -> 'suggestedFormats') <> 'array' OR jsonb_array_length(v_rec -> 'suggestedFormats') < 1 OR jsonb_array_length(v_rec -> 'suggestedFormats') > 4 THEN
      RAISE EXCEPTION 'suggestedFormats must be a JSON array of length 1 to 4' USING ERRCODE = '22023';
    END IF;

    FOR v_format IN SELECT * FROM jsonb_array_elements_text(v_rec -> 'suggestedFormats') LOOP
      IF v_format NOT IN (
        'INSTAGRAM_POST',
        'INSTAGRAM_CAROUSEL',
        'INSTAGRAM_REEL',
        'INSTAGRAM_STORY',
        'FACEBOOK_POST',
        'TIKTOK',
        'LINKEDIN_POST',
        'YOUTUBE_SHORT',
        'BLOG_ARTICLE',
        'WEBSITE_PAGE',
        'GOOGLE_BUSINESS_PROFILE',
        'OTHER'
      ) THEN
        RAISE EXCEPTION 'Invalid format in suggestedFormats' USING ERRCODE = '22023';
      END IF;
    END LOOP;

    -- Validate estimatedEffortMinutes
    IF NOT (v_rec ? 'estimatedEffortMinutes') THEN
      RAISE EXCEPTION 'estimatedEffortMinutes property must be present' USING ERRCODE = '22023';
    END IF;

    v_estimated_effort_num := NULL;
    IF jsonb_typeof(v_rec -> 'estimatedEffortMinutes') <> 'null' THEN
      IF jsonb_typeof(v_rec -> 'estimatedEffortMinutes') <> 'number' THEN
        RAISE EXCEPTION 'estimatedEffortMinutes must be a number or null' USING ERRCODE = '22023';
      END IF;

      IF (v_rec ->> 'estimatedEffortMinutes')::numeric <> TRUNC((v_rec ->> 'estimatedEffortMinutes')::numeric) THEN
        RAISE EXCEPTION 'estimatedEffortMinutes must be an integer' USING ERRCODE = '22023';
      END IF;

      v_estimated_effort_num := (v_rec ->> 'estimatedEffortMinutes')::integer;
      IF v_estimated_effort_num < 1 OR v_estimated_effort_num > 480 THEN
        RAISE EXCEPTION 'estimatedEffortMinutes must be between 1 and 480' USING ERRCODE = '22023';
      END IF;
    END IF;

    -- Validate requiresCamera
    IF jsonb_typeof(v_rec -> 'requiresCamera') <> 'boolean' THEN
      RAISE EXCEPTION 'requiresCamera must be a boolean' USING ERRCODE = '22023';
    END IF;

    -- Validate requiresVoiceover
    IF jsonb_typeof(v_rec -> 'requiresVoiceover') <> 'boolean' THEN
      RAISE EXCEPTION 'requiresVoiceover must be a boolean' USING ERRCODE = '22023';
    END IF;

    -- Validate contentAngle
    IF NOT (v_rec ? 'contentAngle') THEN
      RAISE EXCEPTION 'contentAngle property must be present' USING ERRCODE = '22023';
    END IF;

    v_content_angle := NULL;
    IF jsonb_typeof(v_rec -> 'contentAngle') <> 'null' THEN
      IF jsonb_typeof(v_rec -> 'contentAngle') <> 'string' OR TRIM(v_rec ->> 'contentAngle') = '' OR LENGTH(TRIM(v_rec ->> 'contentAngle')) > 500 THEN
        RAISE EXCEPTION 'Invalid contentAngle string' USING ERRCODE = '22023';
      END IF;
      v_content_angle := TRIM(v_rec ->> 'contentAngle');
    END IF;

    -- Validate callToAction
    IF NOT (v_rec ? 'callToAction') THEN
      RAISE EXCEPTION 'callToAction property must be present' USING ERRCODE = '22023';
    END IF;

    v_cta := NULL;
    IF jsonb_typeof(v_rec -> 'callToAction') <> 'null' THEN
      IF jsonb_typeof(v_rec -> 'callToAction') <> 'string' OR TRIM(v_rec ->> 'callToAction') = '' OR LENGTH(TRIM(v_rec ->> 'callToAction')) > 300 THEN
        RAISE EXCEPTION 'Invalid callToAction string' USING ERRCODE = '22023';
      END IF;
      v_cta := TRIM(v_rec ->> 'callToAction');
    END IF;

    -- Validate editorialTopic (Optional or Required for new schema)
    v_editorial_topic := NULL;
    IF v_rec ? 'editorialTopic' AND jsonb_typeof(v_rec -> 'editorialTopic') <> 'null' THEN
      IF jsonb_typeof(v_rec -> 'editorialTopic') <> 'string' OR TRIM(v_rec ->> 'editorialTopic') = '' THEN
        RAISE EXCEPTION 'editorialTopic must be a non-empty string when present' USING ERRCODE = '22023';
      END IF;
      v_editorial_topic := TRIM(v_rec ->> 'editorialTopic');
    END IF;

    -- Validate editorialAngle
    v_editorial_angle := NULL;
    IF v_rec ? 'editorialAngle' AND jsonb_typeof(v_rec -> 'editorialAngle') <> 'null' THEN
      IF jsonb_typeof(v_rec -> 'editorialAngle') <> 'string' OR TRIM(v_rec ->> 'editorialAngle') = '' THEN
        RAISE EXCEPTION 'editorialAngle must be a non-empty string when present' USING ERRCODE = '22023';
      END IF;
      v_editorial_angle := TRIM(v_rec ->> 'editorialAngle');
    END IF;

    -- Validate conceptKey
    v_concept_key := NULL;
    IF v_rec ? 'conceptKey' AND jsonb_typeof(v_rec -> 'conceptKey') <> 'null' THEN
      IF jsonb_typeof(v_rec -> 'conceptKey') <> 'string' OR TRIM(v_rec ->> 'conceptKey') = '' THEN
        RAISE EXCEPTION 'conceptKey must be a non-empty string when present' USING ERRCODE = '22023';
      END IF;
      v_concept_key := TRIM(v_rec ->> 'conceptKey');
    END IF;

    -- Validate noveltyReason
    v_novelty_reason := NULL;
    IF v_rec ? 'noveltyReason' AND jsonb_typeof(v_rec -> 'noveltyReason') <> 'null' THEN
      IF jsonb_typeof(v_rec -> 'noveltyReason') <> 'string' OR TRIM(v_rec ->> 'noveltyReason') = '' THEN
        RAISE EXCEPTION 'noveltyReason must be a string when present' USING ERRCODE = '22023';
      END IF;
      v_novelty_reason := TRIM(v_rec ->> 'noveltyReason');
    END IF;

    -- Insert Child Recommendation Row
    INSERT INTO public.recommendations (
      batch_id,
      business_id,
      goal_id,
      audience_id,
      offer_id,
      title,
      concept,
      recommendation_type,
      priority,
      why_now,
      reasons,
      suggested_formats,
      estimated_effort_minutes,
      camera_required,
      requires_voiceover,
      angle,
      cta,
      editorial_topic,
      editorial_angle,
      concept_key,
      novelty_reason,
      content_type
    )
    VALUES (
      v_batch_id,
      p_business_id,
      v_goal_id,
      v_audience_id,
      v_offer_id,
      TRIM(v_rec ->> 'title'),
      TRIM(v_rec ->> 'summary'),
      v_rec ->> 'type',
      v_rec ->> 'priority',
      TRIM(v_rec ->> 'whyNow'),
      v_rec -> 'reasons',
      v_rec -> 'suggestedFormats',
      v_estimated_effort_num,
      (v_rec ->> 'requiresCamera')::boolean,
      (v_rec ->> 'requiresVoiceover')::boolean,
      v_content_angle,
      v_cta,
      v_editorial_topic,
      v_editorial_angle,
      v_concept_key,
      v_novelty_reason,
      NULL
    )
    RETURNING id INTO v_rec_id;

    v_recommendation_ids := ARRAY_APPEND(v_recommendation_ids, v_rec_id);
  END LOOP;

  -- 9. Return JSON Contract
  RETURN jsonb_build_object(
    'batch_id', v_batch_id,
    'recommendation_ids', to_jsonb(v_recommendation_ids),
    'recommendation_count', ARRAY_LENGTH(v_recommendation_ids, 1)
  );
END;
$$;

-- Security Hardening
REVOKE ALL ON FUNCTION public.save_recommendation_batch(uuid, text, text, text, timestamp with time zone, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_recommendation_batch(uuid, text, text, text, timestamp with time zone, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_recommendation_batch(uuid, text, text, text, timestamp with time zone, jsonb) TO authenticated;
