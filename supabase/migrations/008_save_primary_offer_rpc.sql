-- Migration: 008_save_primary_offer_rpc.sql
-- Description: RPC function to atomically & idempotently save/update the primary active Offer for the user's active Business.

CREATE OR REPLACE FUNCTION public.save_primary_offer(
  p_name text,
  p_description text DEFAULT NULL,
  p_price_from numeric DEFAULT NULL,
  p_price_to numeric DEFAULT NULL,
  p_currency text DEFAULT 'EUR',
  p_url text DEFAULT NULL,
  p_cta text DEFAULT NULL,
  p_benefits jsonb DEFAULT '[]'::jsonb,
  p_objections jsonb DEFAULT '[]'::jsonb,
  p_seasonality jsonb DEFAULT '{}'::jsonb,
  p_available_from date DEFAULT NULL,
  p_available_until date DEFAULT NULL,
  p_priority smallint DEFAULT 10
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
  v_existing_offer_id uuid;
  v_offer_id uuid;
  v_lock_key bigint;
  v_benefits jsonb;
  v_objections jsonb;
  v_seasonality jsonb;
  v_currency text;
BEGIN
  -- 1. Security Check: Retrieve current authenticated user ID
  v_user_id := auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to save offer' USING ERRCODE = '40100';
  END IF;

  -- 2. Input Validations
  IF p_name IS NULL OR TRIM(p_name) = '' THEN
    RAISE EXCEPTION 'Offer name is required' USING ERRCODE = '22023';
  END IF;

  IF p_price_from IS NOT NULL AND p_price_from < 0 THEN
    RAISE EXCEPTION 'p_price_from must be >= 0' USING ERRCODE = '22023';
  END IF;

  IF p_price_to IS NOT NULL AND p_price_to < 0 THEN
    RAISE EXCEPTION 'p_price_to must be >= 0' USING ERRCODE = '22023';
  END IF;

  IF p_price_from IS NOT NULL AND p_price_to IS NOT NULL AND p_price_to < p_price_from THEN
    RAISE EXCEPTION 'p_price_to must be >= p_price_from' USING ERRCODE = '22023';
  END IF;

  IF p_priority IS NOT NULL AND (p_priority < 0 OR p_priority > 10) THEN
    RAISE EXCEPTION 'p_priority must be between 0 and 10' USING ERRCODE = '22023';
  END IF;

  IF p_available_from IS NOT NULL AND p_available_until IS NOT NULL AND p_available_until < p_available_from THEN
    RAISE EXCEPTION 'p_available_until must be >= p_available_from' USING ERRCODE = '22023';
  END IF;

  -- 3. JSON Array / Object Validations
  IF p_benefits IS NOT NULL AND jsonb_typeof(p_benefits) <> 'array' THEN
    RAISE EXCEPTION 'p_benefits must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF p_objections IS NOT NULL AND jsonb_typeof(p_objections) <> 'array' THEN
    RAISE EXCEPTION 'p_objections must be a JSON array' USING ERRCODE = '22023';
  END IF;

  IF p_seasonality IS NOT NULL AND jsonb_typeof(p_seasonality) <> 'object' THEN
    RAISE EXCEPTION 'p_seasonality must be a JSON object' USING ERRCODE = '22023';
  END IF;

  -- Defaults for JSON and Currency
  v_benefits := COALESCE(p_benefits, '[]'::jsonb);
  v_objections := COALESCE(p_objections, '[]'::jsonb);
  v_seasonality := COALESCE(p_seasonality, '{}'::jsonb);
  v_currency := UPPER(TRIM(COALESCE(NULLIF(TRIM(p_currency), ''), 'EUR')));

  IF LENGTH(v_currency) <> 3 THEN
    RAISE EXCEPTION 'p_currency must be a 3-letter currency code'
      USING ERRCODE = '22023';
  END IF;

  IF v_currency !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'p_currency must contain exactly 3 letters'
      USING ERRCODE = '22023';
  END IF;

  -- 4. Retrieve user's active OWNER workspace from workspace_members
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

  -- 5. Retrieve first Business for this workspace
  SELECT b.id
  INTO v_business_id
  FROM public.businesses b
  WHERE b.workspace_id = v_workspace_id
  ORDER BY b.created_at ASC
  LIMIT 1;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'No business found for active workspace' USING ERRCODE = '42000';
  END IF;

  -- 6. Concurrency Control: Advisory lock on workspace_id
  v_lock_key := ('x' || SUBSTRING(REPLACE(v_workspace_id::text, '-', ''), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 7. Find existing primary active Offer for this Business
  SELECT o.id INTO v_existing_offer_id
  FROM public.offers o
  WHERE o.business_id = v_business_id
    AND o.active = true
  ORDER BY o.priority DESC, o.created_at ASC
  LIMIT 1;

  -- 8. Update existing or insert new primary Offer
  IF v_existing_offer_id IS NOT NULL THEN
    UPDATE public.offers
    SET
      name = TRIM(p_name),
      description = NULLIF(TRIM(p_description), ''),
      price_from = p_price_from,
      price_to = p_price_to,
      currency = v_currency,
      url = NULLIF(TRIM(p_url), ''),
      cta = NULLIF(TRIM(p_cta), ''),
      benefits = v_benefits,
      objections = v_objections,
      seasonality = v_seasonality,
      available_from = p_available_from,
      available_until = p_available_until,
      priority = COALESCE(p_priority, 10)
    WHERE id = v_existing_offer_id
    RETURNING id INTO v_offer_id;
  ELSE
    INSERT INTO public.offers (
      business_id,
      name,
      description,
      price_from,
      price_to,
      currency,
      url,
      cta,
      benefits,
      objections,
      seasonality,
      available_from,
      available_until,
      priority,
      active
    )
    VALUES (
      v_business_id,
      TRIM(p_name),
      NULLIF(TRIM(p_description), ''),
      p_price_from,
      p_price_to,
      v_currency,
      NULLIF(TRIM(p_url), ''),
      NULLIF(TRIM(p_cta), ''),
      v_benefits,
      v_objections,
      v_seasonality,
      p_available_from,
      p_available_until,
      COALESCE(p_priority, 10),
      true
    )
    RETURNING id INTO v_offer_id;
  END IF;

  -- 9. Return JSON result
  RETURN jsonb_build_object(
    'offer_id', v_offer_id,
    'business_id', v_business_id,
    'created', (v_existing_offer_id IS NULL)
  );
END;
$$;

-- Security Hardening: Revoke all from PUBLIC and grant ONLY to authenticated
REVOKE ALL ON FUNCTION public.save_primary_offer(text, text, numeric, numeric, text, text, text, jsonb, jsonb, jsonb, date, date, smallint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_primary_offer(text, text, numeric, numeric, text, text, text, jsonb, jsonb, jsonb, date, date, smallint) TO authenticated;
