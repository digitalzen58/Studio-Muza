-- Migration: 007_save_primary_goal_rpc.sql
-- Description: RPC function to atomically & idempotently save/update the primary active Goal for the user's active Business.

CREATE OR REPLACE FUNCTION public.save_primary_goal(
  p_type text,
  p_title text,
  p_description text DEFAULT NULL,
  p_metric text DEFAULT NULL,
  p_target_value numeric DEFAULT NULL,
  p_priority smallint DEFAULT 10,
  p_starts_at date DEFAULT NULL,
  p_ends_at date DEFAULT NULL
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
  v_existing_goal_id uuid;
  v_goal_id uuid;
  v_lock_key bigint;
BEGIN
  -- 1. Security Check: Retrieve current authenticated user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to save goal' USING ERRCODE = '40100';
  END IF;

  -- 2. Input Validations
  IF p_type IS NULL OR TRIM(p_type) = '' THEN
    RAISE EXCEPTION 'Goal type is required' USING ERRCODE = '22023';
  END IF;

  IF UPPER(TRIM(p_type)) NOT IN (
    'BOOKINGS',
    'VISIBILITY',
    'ACQUISITION',
    'RETENTION',
    'OFFER_LAUNCH',
    'LEADS',
    'LOCAL_VISIBILITY'
  ) THEN
    RAISE EXCEPTION 'Invalid goal type' USING ERRCODE = '22023';
  END IF;

  IF p_title IS NULL OR TRIM(p_title) = '' THEN
    RAISE EXCEPTION 'Goal title is required' USING ERRCODE = '22023';
  END IF;

  IF p_priority IS NOT NULL AND (p_priority < 0 OR p_priority > 10) THEN
    RAISE EXCEPTION 'p_priority must be between 0 and 10' USING ERRCODE = '22023';
  END IF;

  IF p_starts_at IS NOT NULL AND p_ends_at IS NOT NULL AND p_ends_at < p_starts_at THEN
    RAISE EXCEPTION 'p_ends_at must be >= p_starts_at' USING ERRCODE = '22023';
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

  -- 6. Find existing primary active Goal for this Business
  SELECT g.id INTO v_existing_goal_id
  FROM public.goals g
  WHERE g.business_id = v_business_id
    AND g.status = 'ACTIVE'
  ORDER BY g.priority DESC, g.created_at ASC
  LIMIT 1;

  -- 7. Update existing or insert new primary Goal
  IF v_existing_goal_id IS NOT NULL THEN
    UPDATE public.goals
    SET
      type = UPPER(TRIM(p_type)),
      title = TRIM(p_title),
      description = NULLIF(TRIM(p_description), ''),
      metric = NULLIF(TRIM(p_metric), ''),
      target_value = p_target_value,
      priority = COALESCE(p_priority, 10),
      starts_at = p_starts_at,
      ends_at = p_ends_at
    WHERE id = v_existing_goal_id
    RETURNING id INTO v_goal_id;
  ELSE
    INSERT INTO public.goals (
      business_id,
      offer_id,
      type,
      title,
      description,
      metric,
      target_value,
      priority,
      starts_at,
      ends_at,
      status
    )
    VALUES (
      v_business_id,
      NULL,
      UPPER(TRIM(p_type)),
      TRIM(p_title),
      NULLIF(TRIM(p_description), ''),
      NULLIF(TRIM(p_metric), ''),
      p_target_value,
      COALESCE(p_priority, 10),
      p_starts_at,
      p_ends_at,
      'ACTIVE'
    )
    RETURNING id INTO v_goal_id;
  END IF;

  -- 8. Return JSON result
  RETURN jsonb_build_object(
    'goal_id', v_goal_id,
    'business_id', v_business_id,
    'created', (v_existing_goal_id IS NULL)
  );
END;
$$;

-- Security Hardening: Revoke all from PUBLIC and grant ONLY to authenticated
REVOKE ALL ON FUNCTION public.save_primary_goal(text, text, text, text, numeric, smallint, date, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_primary_goal(text, text, text, text, numeric, smallint, date, date) TO authenticated;
