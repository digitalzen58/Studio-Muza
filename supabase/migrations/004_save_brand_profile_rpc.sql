-- Migration: 004_save_brand_profile_rpc.sql
-- Description: RPC function to atomically & idempotently save/update the Brand Profile for the user's active Business.

CREATE OR REPLACE FUNCTION public.save_brand_profile(
  p_positioning text DEFAULT NULL,
  p_promise text DEFAULT NULL,
  p_story text DEFAULT NULL,
  p_personality jsonb DEFAULT '[]'::jsonb,
  p_values jsonb DEFAULT '[]'::jsonb,
  p_tone jsonb DEFAULT '{}'::jsonb,
  p_preferred_vocabulary jsonb DEFAULT '[]'::jsonb,
  p_avoided_vocabulary jsonb DEFAULT '[]'::jsonb,
  p_signature_phrases jsonb DEFAULT '[]'::jsonb,
  p_communication_do jsonb DEFAULT '[]'::jsonb,
  p_communication_dont jsonb DEFAULT '[]'::jsonb
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
  v_existing_brand_profile_id uuid;
  v_brand_profile_id uuid;
  v_lock_key bigint;
BEGIN
  -- 1. Security Check: Retrieve current authenticated user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to save brand profile' USING ERRCODE = '40100';
  END IF;

  -- 2. Input Validation: Enforce strict JSONB types
  IF p_personality IS NOT NULL AND jsonb_typeof(p_personality) <> 'array' THEN
    RAISE EXCEPTION 'p_personality must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF p_values IS NOT NULL AND jsonb_typeof(p_values) <> 'array' THEN
    RAISE EXCEPTION 'p_values must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF p_tone IS NOT NULL AND jsonb_typeof(p_tone) <> 'object' THEN
    RAISE EXCEPTION 'p_tone must be a JSON object' USING ERRCODE = '22023';
  END IF;

  IF p_preferred_vocabulary IS NOT NULL AND jsonb_typeof(p_preferred_vocabulary) <> 'array' THEN
    RAISE EXCEPTION 'p_preferred_vocabulary must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF p_avoided_vocabulary IS NOT NULL AND jsonb_typeof(p_avoided_vocabulary) <> 'array' THEN
    RAISE EXCEPTION 'p_avoided_vocabulary must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF p_signature_phrases IS NOT NULL AND jsonb_typeof(p_signature_phrases) <> 'array' THEN
    RAISE EXCEPTION 'p_signature_phrases must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF p_communication_do IS NOT NULL AND jsonb_typeof(p_communication_do) <> 'array' THEN
    RAISE EXCEPTION 'p_communication_do must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF p_communication_dont IS NOT NULL AND jsonb_typeof(p_communication_dont) <> 'array' THEN
    RAISE EXCEPTION 'p_communication_dont must be a JSON array' USING ERRCODE = '22023';
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

  -- 5. Concurrency Control: Advisory lock on workspace_id to prevent concurrent updates
  v_lock_key := ('x' || SUBSTRING(REPLACE(v_workspace_id::text, '-', ''), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 6. Check if a Brand Profile already exists for this business
  SELECT bp.id INTO v_existing_brand_profile_id
  FROM public.brand_profiles bp
  WHERE bp.business_id = v_business_id;

  -- 7. Atomic UPSERT into public.brand_profiles using UNIQUE(business_id)
  INSERT INTO public.brand_profiles (
    business_id,
    positioning,
    promise,
    story,
    personality,
    values,
    tone,
    preferred_vocabulary,
    avoided_vocabulary,
    signature_phrases,
    communication_do,
    communication_dont
  )
  VALUES (
    v_business_id,
    NULLIF(TRIM(p_positioning), ''),
    NULLIF(TRIM(p_promise), ''),
    NULLIF(TRIM(p_story), ''),
    COALESCE(p_personality, '[]'::jsonb),
    COALESCE(p_values, '[]'::jsonb),
    COALESCE(p_tone, '{}'::jsonb),
    COALESCE(p_preferred_vocabulary, '[]'::jsonb),
    COALESCE(p_avoided_vocabulary, '[]'::jsonb),
    COALESCE(p_signature_phrases, '[]'::jsonb),
    COALESCE(p_communication_do, '[]'::jsonb),
    COALESCE(p_communication_dont, '[]'::jsonb)
  )
  ON CONFLICT (business_id) DO UPDATE SET
    positioning = EXCLUDED.positioning,
    promise = EXCLUDED.promise,
    story = EXCLUDED.story,
    personality = EXCLUDED.personality,
    values = EXCLUDED.values,
    tone = EXCLUDED.tone,
    preferred_vocabulary = EXCLUDED.preferred_vocabulary,
    avoided_vocabulary = EXCLUDED.avoided_vocabulary,
    signature_phrases = EXCLUDED.signature_phrases,
    communication_do = EXCLUDED.communication_do,
    communication_dont = EXCLUDED.communication_dont,
    updated_at = now()
  RETURNING id INTO v_brand_profile_id;

  -- 8. Return JSON result
  RETURN jsonb_build_object(
    'brand_profile_id', v_brand_profile_id,
    'business_id', v_business_id,
    'created', (v_existing_brand_profile_id IS NULL)
  );
END;
$$;

-- Security Hardening: Revoke all from PUBLIC and grant ONLY to authenticated
REVOKE ALL ON FUNCTION public.save_brand_profile(text, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_brand_profile(text, text, text, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb, jsonb) TO authenticated;
