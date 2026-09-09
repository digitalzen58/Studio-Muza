-- Migration: 006_save_primary_audience_rpc.sql
-- Description: RPC function to atomically & idempotently save/update the primary Audience for the user's active Business.

CREATE OR REPLACE FUNCTION public.save_primary_audience(
  p_name text,
  p_description text DEFAULT NULL,
  p_needs jsonb DEFAULT '[]'::jsonb,
  p_desires jsonb DEFAULT '[]'::jsonb,
  p_problems jsonb DEFAULT '[]'::jsonb,
  p_objections jsonb DEFAULT '[]'::jsonb,
  p_motivations jsonb DEFAULT '[]'::jsonb,
  p_questions jsonb DEFAULT '[]'::jsonb,
  p_buying_triggers jsonb DEFAULT '[]'::jsonb,
  p_language_patterns jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_workspace_id uuid;
  v_business_id uuid;
  v_existing_audience_id uuid;
  v_audience_id uuid;
  v_lock_key bigint;
BEGIN
  -- 1. Security Check: Retrieve current authenticated user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to save audience' USING ERRCODE = '40100';
  END IF;

  -- 2. Input Validations
  IF p_name IS NULL OR TRIM(p_name) = '' THEN
    RAISE EXCEPTION 'Audience name is required' USING ERRCODE = '22023';
  END IF;

  IF p_needs IS NOT NULL AND jsonb_typeof(p_needs) <> 'array' THEN
    RAISE EXCEPTION 'p_needs must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF p_desires IS NOT NULL AND jsonb_typeof(p_desires) <> 'array' THEN
    RAISE EXCEPTION 'p_desires must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF p_problems IS NOT NULL AND jsonb_typeof(p_problems) <> 'array' THEN
    RAISE EXCEPTION 'p_problems must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF p_objections IS NOT NULL AND jsonb_typeof(p_objections) <> 'array' THEN
    RAISE EXCEPTION 'p_objections must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF p_motivations IS NOT NULL AND jsonb_typeof(p_motivations) <> 'array' THEN
    RAISE EXCEPTION 'p_motivations must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF p_questions IS NOT NULL AND jsonb_typeof(p_questions) <> 'array' THEN
    RAISE EXCEPTION 'p_questions must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF p_buying_triggers IS NOT NULL AND jsonb_typeof(p_buying_triggers) <> 'array' THEN
    RAISE EXCEPTION 'p_buying_triggers must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF p_language_patterns IS NOT NULL AND jsonb_typeof(p_language_patterns) <> 'array' THEN
    RAISE EXCEPTION 'p_language_patterns must be a JSON array' USING ERRCODE = '22023';
  END IF;

  -- 3. Retrieve user's active OWNER workspace from workspace_members
  SELECT wm.workspace_id
  INTO v_workspace_id
  FROM public.workspace_members wm
  WHERE wm.user_id = v_user_id
    AND wm.status = 'ACTIVE'
    AND wm.role = 'OWNER'
  ORDER BY wm.created_at ASC
  LIMIT 1;

  IF v_workspace_id IS NULL THEN
    RAISE EXCEPTION 'No active OWNER workspace found for user' USING ERRCODE = '42000';
  END IF;

  -- 4. Retrieve first Business for this workspace
  SELECT b.id
  INTO v_business_id
  FROM public.businesses b
  WHERE b.workspace_id = v_workspace_id
  ORDER BY b.created_at ASC
  LIMIT 1;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'No business found for active workspace' USING ERRCODE = '42000';
  END IF;

  -- 5. Concurrency Control: Advisory lock on workspace_id
  v_lock_key := ('x' || SUBSTRING(REPLACE(v_workspace_id::text, '-', ''), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 6. Find existing primary active Audience for this Business
  SELECT a.id INTO v_existing_audience_id
  FROM public.audiences a
  WHERE a.business_id = v_business_id
    AND a.active = true
  ORDER BY a.priority DESC, a.created_at ASC
  LIMIT 1;

  -- 7. Update existing or insert new primary Audience
  IF v_existing_audience_id IS NOT NULL THEN
    UPDATE public.audiences
    SET
      name = TRIM(p_name),
      description = NULLIF(TRIM(p_description), ''),
      needs = COALESCE(p_needs, '[]'::jsonb),
      desires = COALESCE(p_desires, '[]'::jsonb),
      problems = COALESCE(p_problems, '[]'::jsonb),
      objections = COALESCE(p_objections, '[]'::jsonb),
      motivations = COALESCE(p_motivations, '[]'::jsonb),
      questions = COALESCE(p_questions, '[]'::jsonb),
      buying_triggers = COALESCE(p_buying_triggers, '[]'::jsonb),
      language_patterns = COALESCE(p_language_patterns, '[]'::jsonb),
      updated_at = now()
    WHERE id = v_existing_audience_id
    RETURNING id INTO v_audience_id;
  ELSE
    INSERT INTO public.audiences (
      business_id,
      name,
      description,
      needs,
      desires,
      problems,
      objections,
      motivations,
      questions,
      buying_triggers,
      language_patterns,
      priority,
      active
    )
    VALUES (
      v_business_id,
      TRIM(p_name),
      NULLIF(TRIM(p_description), ''),
      COALESCE(p_needs, '[]'::jsonb),
      COALESCE(p_desires, '[]'::jsonb),
      COALESCE(p_problems, '[]'::jsonb),
      COALESCE(p_objections, '[]'::jsonb),
      COALESCE(p_motivations, '[]'::jsonb),
      COALESCE(p_questions, '[]'::jsonb),
      COALESCE(p_buying_triggers, '[]'::jsonb),
      COALESCE(p_language_patterns, '[]'::jsonb),
      10,
      true
    )
    RETURNING id INTO v_audience_id;
  END IF;

  -- 8. Return JSON result
  RETURN jsonb_build_object(
    'audience_id', v_audience_id,
    'business_id', v_business_id,
    'created', (v_existing_audience_id IS NULL)
  );
END;
$$;

-- Security Hardening: Revoke all from PUBLIC and grant ONLY to authenticated
REVOKE ALL ON FUNCTION public.save_primary_audience(text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_primary_audience(text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) TO authenticated;
