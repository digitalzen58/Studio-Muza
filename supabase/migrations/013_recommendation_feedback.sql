-- Migration: 013_recommendation_feedback.sql
-- Description: Recommendation feedback persistence schema, hardened RLS, and secure RPC functions.
-- Note: LOCAL ONLY migration. Do not deploy remotely.

-- ============================================================================
-- 1. CREATE RECOMMENDATION_FEEDBACK TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.recommendation_feedback (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    business_id uuid NOT NULL,
    recommendation_id uuid NOT NULL,
    reason text NOT NULL,
    intent text NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT recommendation_feedback_pkey PRIMARY KEY (id),
    CONSTRAINT recommendation_feedback_reason_check CHECK (
        reason IN (
            'ALREADY_DONE',
            'TOO_REPETITIVE',
            'NOT_RELEVANT',
            'TOO_COMMERCIAL',
            'TOO_DIFFICULT',
            'WRONG_FORMAT',
            'NOT_NOW',
            'DISLIKE_TOPIC',
            'OTHER'
        )
    ),
    CONSTRAINT recommendation_feedback_intent_check CHECK (
        intent IN (
            'IDEA_REJECTION',
            'EXECUTION_CONSTRAINT',
            'FORMAT_PREFERENCE',
            'TIMING',
            'REPETITION',
            'OTHER'
        )
    ),
    CONSTRAINT recommendation_feedback_note_check CHECK (
        note IS NULL OR length(trim(note)) <= 300
    )
);

-- Foreign Key Constraints
ALTER TABLE ONLY public.recommendation_feedback
    ADD CONSTRAINT recommendation_feedback_business_id_fkey FOREIGN KEY (business_id) REFERENCES public.businesses(id) ON DELETE CASCADE,
    ADD CONSTRAINT recommendation_feedback_recommendation_id_fkey FOREIGN KEY (recommendation_id) REFERENCES public.recommendations(id) ON DELETE CASCADE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS recommendation_feedback_business_created_idx
    ON public.recommendation_feedback USING btree (business_id, created_at DESC);

CREATE INDEX IF NOT EXISTS recommendation_feedback_recommendation_id_idx
    ON public.recommendation_feedback USING btree (recommendation_id);

-- ============================================================================
-- 2. HARDENED PRIVILEGES & ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Explicitly revoke all direct privileges by default
REVOKE ALL ON TABLE public.recommendation_feedback FROM PUBLIC, anon, authenticated;

-- Grant SELECT only to authenticated (for application memory retrieval)
GRANT SELECT ON TABLE public.recommendation_feedback TO authenticated;

-- Service role retains full administrative privileges for server maintenance
GRANT ALL ON TABLE public.recommendation_feedback TO service_role;

-- Row Level Security (RLS)
ALTER TABLE public.recommendation_feedback ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to SELECT only rows belonging to businesses they can access
CREATE POLICY recommendation_feedback_select ON public.recommendation_feedback
    FOR SELECT
    TO authenticated
    USING (
        public.can_access_business(business_id)
    );

-- No direct INSERT, UPDATE, or DELETE policies exist for anon or authenticated.
-- All feedback writes MUST proceed via controlled authenticated RPCs.

-- ============================================================================
-- 3. SECURE RPC: RECORD_RECOMMENDATION_FEEDBACK
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_recommendation_feedback(
    p_business_id uuid,
    p_recommendation_id uuid,
    p_reason text,
    p_note text DEFAULT NULL
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
    v_rec_valid boolean;
    v_derived_intent text;
    v_cleaned_note text;
    v_feedback_id uuid;
BEGIN
    -- 1. Security Check: Authenticated user required
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to record feedback' USING ERRCODE = '40100';
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

    -- 3. Business Verification
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
        RAISE EXCEPTION 'Business not found or access denied for workspace' USING ERRCODE = '42501';
    END IF;

    -- 4. Recommendation Ownership Verification (belongs strictly to same business)
    IF p_recommendation_id IS NULL THEN
        RAISE EXCEPTION 'Invalid recommendation selector' USING ERRCODE = '22023';
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM public.recommendations
        WHERE id = p_recommendation_id
          AND business_id = p_business_id
    ) INTO v_rec_valid;

    IF NOT v_rec_valid THEN
        RAISE EXCEPTION 'Recommendation not found or does not belong to specified business' USING ERRCODE = '42501';
    END IF;

    -- 5. Validate Reason and Derive Deterministic Intent (Caller cannot spoof intent)
    IF p_reason IS NULL OR length(trim(p_reason)) = 0 THEN
        RAISE EXCEPTION 'Feedback reason is required' USING ERRCODE = '22023';
    END IF;

    CASE p_reason
        WHEN 'TOO_REPETITIVE' THEN
            v_derived_intent := 'REPETITION';
        WHEN 'ALREADY_DONE' THEN
            v_derived_intent := 'REPETITION';
        WHEN 'TOO_COMMERCIAL' THEN
            v_derived_intent := 'IDEA_REJECTION';
        WHEN 'NOT_RELEVANT' THEN
            v_derived_intent := 'IDEA_REJECTION';
        WHEN 'DISLIKE_TOPIC' THEN
            v_derived_intent := 'IDEA_REJECTION';
        WHEN 'WRONG_FORMAT' THEN
            v_derived_intent := 'FORMAT_PREFERENCE';
        WHEN 'TOO_DIFFICULT' THEN
            v_derived_intent := 'EXECUTION_CONSTRAINT';
        WHEN 'NOT_NOW' THEN
            v_derived_intent := 'TIMING';
        WHEN 'OTHER' THEN
            v_derived_intent := 'OTHER';
        ELSE
            RAISE EXCEPTION 'Invalid feedback reason: %', p_reason USING ERRCODE = '22023';
    END CASE;

    -- 6. Clean and Bounded Note Validation
    IF p_note IS NOT NULL THEN
        v_cleaned_note := trim(p_note);
        IF length(v_cleaned_note) = 0 THEN
            v_cleaned_note := NULL;
        ELSIF length(v_cleaned_note) > 300 THEN
            RAISE EXCEPTION 'Feedback note exceeds maximum allowed length of 300 characters' USING ERRCODE = '22026';
        END IF;
    ELSE
        v_cleaned_note := NULL;
    END IF;

    -- 7. Insert Feedback Record
    INSERT INTO public.recommendation_feedback (
        business_id,
        recommendation_id,
        reason,
        intent,
        note,
        created_at
    ) VALUES (
        p_business_id,
        p_recommendation_id,
        p_reason,
        v_derived_intent,
        v_cleaned_note,
        now()
    )
    RETURNING id INTO v_feedback_id;

    -- 8. Conditionally Update Recommendation Status
    -- Only IDEA_REJECTION and REPETITION update status to REJECTED.
    -- Execution constraints, format preferences, timing, and other do NOT mark status as REJECTED.
    IF v_derived_intent IN ('IDEA_REJECTION', 'REPETITION') THEN
        UPDATE public.recommendations
        SET status = 'REJECTED'
        WHERE id = p_recommendation_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'feedback_id', v_feedback_id,
        'recommendation_id', p_recommendation_id,
        'reason', p_reason,
        'intent', v_derived_intent,
        'status_updated_to_rejected', v_derived_intent IN ('IDEA_REJECTION', 'REPETITION')
    );
END;
$$;

-- Revoke all RPC execution privileges from PUBLIC and anon
REVOKE ALL ON FUNCTION public.record_recommendation_feedback(uuid, uuid, text, text) FROM PUBLIC, anon;

-- Grant execute exclusively to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.record_recommendation_feedback(uuid, uuid, text, text)
TO authenticated, service_role;

-- ============================================================================
-- 4. SECURE RPC: RECORD_BATCH_RECOMMENDATION_FEEDBACK ("Rien ne me convient")
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_batch_recommendation_feedback(
    p_business_id uuid,
    p_recommendation_ids uuid[],
    p_reason text,
    p_note text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id uuid;
    v_rec_id uuid;
    v_feedback_results jsonb := '[]'::jsonb;
    v_single_result jsonb;
    v_input_distinct_count integer;
    v_valid_rec_count integer;
BEGIN
    -- 1. Security Check: Authenticated user required
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required to record batch feedback' USING ERRCODE = '40100';
    END IF;

    -- 2. Input validation
    IF p_business_id IS NULL THEN
        RAISE EXCEPTION 'Invalid business selector' USING ERRCODE = '22023';
    END IF;

    IF p_recommendation_ids IS NULL OR array_length(p_recommendation_ids, 1) IS NULL OR array_length(p_recommendation_ids, 1) = 0 THEN
        RAISE EXCEPTION 'Recommendation IDs array cannot be empty' USING ERRCODE = '22023';
    END IF;

    -- 3. Atomic Pre-validation: Verify that ALL recommendation IDs exist and strictly belong to p_business_id
    SELECT COUNT(DISTINCT u)
    INTO v_input_distinct_count
    FROM unnest(p_recommendation_ids) u;

    SELECT COUNT(DISTINCT id)
    INTO v_valid_rec_count
    FROM public.recommendations
    WHERE id = ANY(p_recommendation_ids)
      AND business_id = p_business_id;

    IF v_valid_rec_count <> v_input_distinct_count THEN
        RAISE EXCEPTION 'One or more recommendations do not exist or belong to another business' USING ERRCODE = '42501';
    END IF;

    -- 4. Process all recommendations atomically in current transaction
    FOREACH v_rec_id IN ARRAY p_recommendation_ids LOOP
        v_single_result := public.record_recommendation_feedback(
            p_business_id,
            v_rec_id,
            p_reason,
            p_note
        );
        v_feedback_results := v_feedback_results || jsonb_build_array(v_single_result);
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'processed_count', array_length(p_recommendation_ids, 1),
        'results', v_feedback_results
    );
END;
$$;

-- Revoke all RPC execution privileges from PUBLIC and anon
REVOKE ALL ON FUNCTION public.record_batch_recommendation_feedback(uuid, uuid[], text, text) FROM PUBLIC, anon;

-- Grant execute exclusively to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.record_batch_recommendation_feedback(uuid, uuid[], text, text)
TO authenticated, service_role;
