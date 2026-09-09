-- Migration: 005_save_creator_profile_rpc.sql
-- Description: RPC function to atomically & idempotently save/update the Creator Profile for the user's active Business.

CREATE OR REPLACE FUNCTION public.save_creator_profile(
  p_weekly_minutes integer DEFAULT NULL,
  p_camera_comfort smallint DEFAULT NULL,
  p_voiceover_comfort smallint DEFAULT NULL,
  p_writing_comfort smallint DEFAULT NULL,
  p_photo_comfort smallint DEFAULT NULL,
  p_video_comfort smallint DEFAULT NULL,
  p_social_skill_level text DEFAULT NULL,
  p_preferred_formats jsonb DEFAULT '[]'::jsonb,
  p_avoided_formats jsonb DEFAULT '[]'::jsonb,
  p_barriers jsonb DEFAULT '[]'::jsonb,
  p_strengths jsonb DEFAULT '[]'::jsonb,
  p_max_effort_level smallint DEFAULT NULL
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
  v_existing_creator_profile_id uuid;
  v_creator_profile_id uuid;
  v_lock_key bigint;
BEGIN
  -- 1. Security Check: Retrieve current authenticated user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to save creator profile' USING ERRCODE = '40100';
  END IF;

  -- 2. Input Validations
  IF p_weekly_minutes IS NOT NULL AND p_weekly_minutes < 0 THEN
    RAISE EXCEPTION 'p_weekly_minutes must be >= 0' USING ERRCODE = '22023';
  END IF;

  IF p_camera_comfort IS NOT NULL AND (p_camera_comfort < 0 OR p_camera_comfort > 5) THEN
    RAISE EXCEPTION 'p_camera_comfort must be between 0 and 5' USING ERRCODE = '22023';
  END IF;

  IF p_voiceover_comfort IS NOT NULL AND (p_voiceover_comfort < 0 OR p_voiceover_comfort > 5) THEN
    RAISE EXCEPTION 'p_voiceover_comfort must be between 0 and 5' USING ERRCODE = '22023';
  END IF;

  IF p_writing_comfort IS NOT NULL AND (p_writing_comfort < 0 OR p_writing_comfort > 5) THEN
    RAISE EXCEPTION 'p_writing_comfort must be between 0 and 5' USING ERRCODE = '22023';
  END IF;

  IF p_photo_comfort IS NOT NULL AND (p_photo_comfort < 0 OR p_photo_comfort > 5) THEN
    RAISE EXCEPTION 'p_photo_comfort must be between 0 and 5' USING ERRCODE = '22023';
  END IF;

  IF p_video_comfort IS NOT NULL AND (p_video_comfort < 0 OR p_video_comfort > 5) THEN
    RAISE EXCEPTION 'p_video_comfort must be between 0 and 5' USING ERRCODE = '22023';
  END IF;

  IF p_max_effort_level IS NOT NULL AND (p_max_effort_level < 0 OR p_max_effort_level > 5) THEN
    RAISE EXCEPTION 'p_max_effort_level must be between 0 and 5' USING ERRCODE = '22023';
  END IF;

  IF p_preferred_formats IS NOT NULL AND jsonb_typeof(p_preferred_formats) <> 'array' THEN
    RAISE EXCEPTION 'p_preferred_formats must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF p_avoided_formats IS NOT NULL AND jsonb_typeof(p_avoided_formats) <> 'array' THEN
    RAISE EXCEPTION 'p_avoided_formats must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF p_barriers IS NOT NULL AND jsonb_typeof(p_barriers) <> 'array' THEN
    RAISE EXCEPTION 'p_barriers must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF p_strengths IS NOT NULL AND jsonb_typeof(p_strengths) <> 'array' THEN
    RAISE EXCEPTION 'p_strengths must be a JSON array' USING ERRCODE = '22023';
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

  -- 6. Check if Creator Profile exists for (business_id, user_id)
  SELECT cp.id INTO v_existing_creator_profile_id
  FROM public.creator_profiles cp
  WHERE cp.business_id = v_business_id
    AND cp.user_id = v_user_id;

  -- 7. Atomic UPSERT into public.creator_profiles using UNIQUE(business_id, user_id)
  INSERT INTO public.creator_profiles (
    business_id,
    user_id,
    weekly_minutes,
    camera_comfort,
    voiceover_comfort,
    writing_comfort,
    photo_comfort,
    video_comfort,
    social_skill_level,
    preferred_formats,
    avoided_formats,
    barriers,
    strengths,
    max_effort_level
  )
  VALUES (
    v_business_id,
    v_user_id,
    p_weekly_minutes,
    p_camera_comfort,
    p_voiceover_comfort,
    p_writing_comfort,
    p_photo_comfort,
    p_video_comfort,
    NULLIF(TRIM(p_social_skill_level), ''),
    COALESCE(p_preferred_formats, '[]'::jsonb),
    COALESCE(p_avoided_formats, '[]'::jsonb),
    COALESCE(p_barriers, '[]'::jsonb),
    COALESCE(p_strengths, '[]'::jsonb),
    p_max_effort_level
  )
  ON CONFLICT (business_id, user_id) DO UPDATE SET
    weekly_minutes = EXCLUDED.weekly_minutes,
    camera_comfort = EXCLUDED.camera_comfort,
    voiceover_comfort = EXCLUDED.voiceover_comfort,
    writing_comfort = EXCLUDED.writing_comfort,
    photo_comfort = EXCLUDED.photo_comfort,
    video_comfort = EXCLUDED.video_comfort,
    social_skill_level = EXCLUDED.social_skill_level,
    preferred_formats = EXCLUDED.preferred_formats,
    avoided_formats = EXCLUDED.avoided_formats,
    barriers = EXCLUDED.barriers,
    strengths = EXCLUDED.strengths,
    max_effort_level = EXCLUDED.max_effort_level,
    updated_at = now()
  RETURNING id INTO v_creator_profile_id;

  -- 8. Return JSON result
  RETURN jsonb_build_object(
    'creator_profile_id', v_creator_profile_id,
    'business_id', v_business_id,
    'user_id', v_user_id,
    'created', (v_existing_creator_profile_id IS NULL)
  );
END;
$$;

-- Security Hardening: Revoke all from PUBLIC and grant ONLY to authenticated
REVOKE ALL ON FUNCTION public.save_creator_profile(integer, smallint, smallint, smallint, smallint, smallint, text, jsonb, jsonb, jsonb, jsonb, smallint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_creator_profile(integer, smallint, smallint, smallint, smallint, smallint, text, jsonb, jsonb, jsonb, jsonb, smallint) TO authenticated;
