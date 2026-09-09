-- Migration: 003_create_initial_business.sql
-- Description: RPC function to atomically & idempotently create an initial Business for the user's active Workspace.

CREATE OR REPLACE FUNCTION public.create_initial_business(
  p_name text,
  p_industry text,
  p_subindustry text DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_website_url text DEFAULT NULL,
  p_country_code text DEFAULT 'FR',
  p_region text DEFAULT NULL,
  p_city text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_workspace_id uuid;
  v_lock_key bigint;
  v_existing_business_id uuid;
  v_existing_name text;
  v_existing_slug text;
  v_business_id uuid;
  v_clean_name text;
  v_base_slug text;
  v_unique_slug text;
BEGIN
  -- 1. Security Check: Retrieve current authenticated user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to create a business' USING ERRCODE = '40100';
  END IF;

  -- 2. Input Validation
  IF p_name IS NULL OR TRIM(p_name) = '' THEN
    RAISE EXCEPTION 'Business name is required' USING ERRCODE = '22023';
  END IF;

  IF p_industry IS NULL OR TRIM(p_industry) = '' THEN
    RAISE EXCEPTION 'Industry is required' USING ERRCODE = '22023';
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

  -- 4. Concurrency Control: Transaction lock on workspace_id to prevent duplicate business creation
  v_lock_key := ('x' || SUBSTRING(REPLACE(v_workspace_id::text, '-', ''), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 5. Check if a Business already exists in this workspace
  SELECT b.id, b.name, b.slug
  INTO v_existing_business_id, v_existing_name, v_existing_slug
  FROM public.businesses b
  WHERE b.workspace_id = v_workspace_id
  ORDER BY b.created_at ASC
  LIMIT 1;

  -- 6. If Business already exists, return existing Business details (idempotent)
  IF v_existing_business_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'business_id', v_existing_business_id,
      'workspace_id', v_workspace_id,
      'name', v_existing_name,
      'slug', v_existing_slug,
      'created', false
    );
  END IF;

  -- 7. Generate clean unique slug for the Business (handles French accents safely)
  v_clean_name := TRANSLATE(TRIM(p_name), 'ÉÈÊËÀÂÄÙÛÜÎÏÔÖÇéèêëàâäùûüîïôöç', 'EEEEAAAUUUIIOOCeeeeaaauuuiiooc');
  v_base_slug := LOWER(REGEXP_REPLACE(v_clean_name, '[^a-zA-Z0-9]+', '-', 'g'));
  v_base_slug := TRIM(BOTH '-' FROM v_base_slug);
  IF v_base_slug IS NULL OR v_base_slug = '' THEN
    v_base_slug := 'business';
  END IF;

  v_unique_slug := v_base_slug || '-' || SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 12);

  -- 8. Atomically insert the initial Business
  INSERT INTO public.businesses (
    workspace_id,
    name,
    slug,
    industry,
    subindustry,
    description,
    website_url,
    country_code,
    region,
    city,
    onboarding_status,
    research_status
  )
  VALUES (
    v_workspace_id,
    TRIM(p_name),
    v_unique_slug,
    TRIM(p_industry),
    NULLIF(TRIM(p_subindustry), ''),
    NULLIF(TRIM(p_description), ''),
    NULLIF(TRIM(p_website_url), ''),
    COALESCE(NULLIF(TRIM(p_country_code), ''), 'FR'),
    NULLIF(TRIM(p_region), ''),
    NULLIF(TRIM(p_city), ''),
    'IN_PROGRESS',
    'NOT_STARTED'
  )
  RETURNING id, name, slug INTO v_business_id, v_existing_name, v_existing_slug;

  -- 9. Return JSON result
  RETURN jsonb_build_object(
    'business_id', v_business_id,
    'workspace_id', v_workspace_id,
    'name', v_existing_name,
    'slug', v_existing_slug,
    'created', true
  );
END;
$$;

-- Security Hardening: Revoke all from PUBLIC and grant ONLY to authenticated
REVOKE ALL ON FUNCTION public.create_initial_business(text, text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_initial_business(text, text, text, text, text, text, text, text) TO authenticated;
