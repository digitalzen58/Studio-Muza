-- Migration: 015_private_media_storage_foundation.sql
-- Description: Private storage bucket configuration for business media and tenant-isolated storage RLS policies.

-- ============================================================================
-- 1. CONFIGURE PRIVATE STORAGE BUCKET FOR MEDIA ASSETS
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'media_assets',
    'media_assets',
    false, -- STRICTLY PRIVATE: Access requires signed URLs or authenticated RLS
    10485760, -- 10MB maximum file size limit
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- ============================================================================
-- 2. STORAGE OBJECTS RLS POLICIES (Scoped by businesses/{businessId}/...)
-- ============================================================================

-- Helper condition check: path must begin with businesses/{businessId}/ where caller has business access
-- Prevents SQL cast errors by validating UUID format with regex before casting

-- 2.1 INSERT POLICY: Authenticated user uploading to accessible business
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'media_assets_business_insert'
    ) THEN
        CREATE POLICY "media_assets_business_insert"
        ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (
            bucket_id = 'media_assets'
            AND split_part(name, '/', 1) = 'businesses'
            AND split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            AND public.can_access_business(split_part(name, '/', 2)::uuid)
        );
    END IF;
END $$;

-- 2.2 SELECT POLICY: Authenticated user viewing objects of accessible business
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'media_assets_business_select'
    ) THEN
        CREATE POLICY "media_assets_business_select"
        ON storage.objects
        FOR SELECT
        TO authenticated
        USING (
            bucket_id = 'media_assets'
            AND split_part(name, '/', 1) = 'businesses'
            AND split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            AND public.can_access_business(split_part(name, '/', 2)::uuid)
        );
    END IF;
END $$;

-- 2.3 UPDATE POLICY: Authenticated user updating objects of accessible business
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'media_assets_business_update'
    ) THEN
        CREATE POLICY "media_assets_business_update"
        ON storage.objects
        FOR UPDATE
        TO authenticated
        USING (
            bucket_id = 'media_assets'
            AND split_part(name, '/', 1) = 'businesses'
            AND split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            AND public.can_access_business(split_part(name, '/', 2)::uuid)
        )
        WITH CHECK (
            bucket_id = 'media_assets'
            AND split_part(name, '/', 1) = 'businesses'
            AND split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            AND public.can_access_business(split_part(name, '/', 2)::uuid)
        );
    END IF;
END $$;

-- 2.4 DELETE POLICY: Authenticated user deleting objects of accessible business
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'media_assets_business_delete'
    ) THEN
        CREATE POLICY "media_assets_business_delete"
        ON storage.objects
        FOR DELETE
        TO authenticated
        USING (
            bucket_id = 'media_assets'
            AND split_part(name, '/', 1) = 'businesses'
            AND split_part(name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            AND public.can_access_business(split_part(name, '/', 2)::uuid)
        );
    END IF;
END $$;
