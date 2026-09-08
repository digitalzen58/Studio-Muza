-- Migration: 002_create_initial_workspace.sql
-- Description: RPC function to atomically ensure an authenticated user has an initial workspace.

CREATE OR REPLACE FUNCTION public.ensure_initial_workspace()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid;
  v_lock_key bigint;
  v_existing_workspace_id uuid;
  v_existing_name text;
  v_existing_slug text;
  v_first_name text;
  v_workspace_name text;
  v_clean_name text;
  v_base_slug text;
  v_unique_slug text;
  v_workspace_id uuid;
BEGIN
  -- 1. Security Check: Retrieve current authenticated user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to initialize workspace' USING ERRCODE = '40100';
  END IF;

  -- 2. Concurrency Control: Acquire transaction-level advisory lock derived from user_id UUID
  -- Prevents race conditions and duplicate workspace creations during concurrent first requests
  v_lock_key := ('x' || SUBSTRING(REPLACE(v_user_id::text, '-', ''), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 3. Check if an active workspace membership already exists for this user
  SELECT wm.workspace_id, w.name, w.slug
  INTO v_existing_workspace_id, v_existing_name, v_existing_slug
  FROM public.workspace_members wm
  JOIN public.workspaces w ON w.id = wm.workspace_id
  WHERE wm.user_id = v_user_id
    AND wm.status = 'ACTIVE'
  ORDER BY wm.created_at ASC
  LIMIT 1;

  -- 4. Return existing workspace if found
  IF v_existing_workspace_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'workspace_id', v_existing_workspace_id,
      'name', v_existing_name,
      'slug', v_existing_slug,
      'created', false
    );
  END IF;

  -- 5. Read first_name from public.profiles
  SELECT first_name INTO v_first_name
  FROM public.profiles
  WHERE id = v_user_id;

  IF v_first_name IS NOT NULL AND TRIM(v_first_name) <> '' THEN
    v_workspace_name := 'Espace de ' || TRIM(v_first_name);
  ELSE
    v_workspace_name := 'Mon Espace Mūza';
  END IF;

  -- 6. Generate clean slug (safely handle French accents without external extensions)
  IF v_first_name IS NOT NULL AND TRIM(v_first_name) <> '' THEN
    v_clean_name := TRANSLATE(TRIM(v_first_name), 'ÉÈÊËÀÂÄÙÛÜÎÏÔÖÇéèêëàâäùûüîïôöç', 'EEEEAAAUUUIIOOCeeeeaaauuuiiooc');
    v_base_slug := LOWER(REGEXP_REPLACE(v_clean_name, '[^a-zA-Z0-9]+', '-', 'g'));
    v_base_slug := TRIM(BOTH '-' FROM v_base_slug);
    IF v_base_slug IS NULL OR v_base_slug = '' THEN
      v_base_slug := 'espace';
    END IF;
    v_base_slug := 'espace-de-' || v_base_slug;
  ELSE
    v_base_slug := 'mon-espace-muza';
  END IF;

  -- Append random hex suffix for guaranteed uniqueness
  v_unique_slug := v_base_slug || '-' || SUBSTRING(REPLACE(gen_random_uuid()::text, '-', ''), 1, 12);

  -- 7. Atomically insert Workspace with created_by = auth.uid()
  INSERT INTO public.workspaces (name, slug, created_by)
  VALUES (v_workspace_name, v_unique_slug, v_user_id)
  RETURNING id, name, slug INTO v_workspace_id, v_workspace_name, v_unique_slug;

  -- 8. Atomically insert WorkspaceMember with role = 'OWNER' & status = 'ACTIVE'
  INSERT INTO public.workspace_members (workspace_id, user_id, role, status)
  VALUES (v_workspace_id, v_user_id, 'OWNER', 'ACTIVE');

  -- 9. Return JSON result structure
  RETURN jsonb_build_object(
    'workspace_id', v_workspace_id,
    'name', v_workspace_name,
    'slug', v_unique_slug,
    'created', true
  );
END;
$$;

-- Security Hardening: Revoke all execution permissions from PUBLIC and grant ONLY to authenticated
REVOKE ALL ON FUNCTION public.ensure_initial_workspace() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_initial_workspace() TO authenticated;
