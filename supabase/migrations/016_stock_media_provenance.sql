-- Migration: 016_stock_media_provenance.sql
-- Description: Adds stock media provenance, attribution, and scoped duplicate-import protection to media_assets.

-- ============================================================================
-- 1. ADD PROVENANCE AND ATTRIBUTION COLUMNS TO media_assets
-- ============================================================================

ALTER TABLE public.media_assets
ADD COLUMN IF NOT EXISTS external_asset_id TEXT,
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS creator_name TEXT,
ADD COLUMN IF NOT EXISTS creator_url TEXT,
ADD COLUMN IF NOT EXISTS attribution_required BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS attribution_text TEXT,
ADD COLUMN IF NOT EXISTS license_label TEXT;

-- ============================================================================
-- 2. SCOPED DUPLICATE-IMPORT PROTECTION INDEX
-- Avoids re-downloading and duplicating the same provider asset for the same business
-- Scoped strictly to business_id (no cross-tenant information leakage)
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS media_assets_business_stock_unique_idx
ON public.media_assets (business_id, source, external_asset_id)
WHERE external_asset_id IS NOT NULL;
