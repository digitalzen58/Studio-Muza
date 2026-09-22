'use server'

import crypto from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { getStockMediaProvider, type StockMediaItem, type StockMediaSearchResult } from '@/services/stock-media'
import type { BrandMediaAsset } from '@/services/media'

const MAX_STOCK_IMAGE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_DOWNLOAD_HOSTS = ['images.pexels.com']

export type SearchStockMediaResult =
  | {
      success: true
      result: StockMediaSearchResult
    }
  | {
      success: false
      message: string
    }

export type ImportStockMediaResult =
  | {
      success: true
      mediaAsset: BrandMediaAsset
      isExisting: boolean
    }
  | {
      success: false
      message: string
    }

/**
 * Searches stock media using the configured provider (Pexels).
 * Strictly 0 Gemini calls, 0 OpenAI calls.
 */
export async function searchStockMediaAction(
  query: string,
  page: number = 1
): Promise<SearchStockMediaResult> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        message: 'Vous devez être connecté pour rechercher des photos.',
      }
    }

    const trimmedQuery = query.trim()
    if (!trimmedQuery) {
      return {
        success: false,
        message: 'Veuillez saisir des mots-clés pour votre recherche.',
      }
    }

    const provider = getStockMediaProvider()
    const result = await provider.search(trimmedQuery, { page, perPage: 15 })

    return {
      success: true,
      result,
    }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Une erreur est survenue lors de la recherche de photos.'
    console.error('Error in searchStockMediaAction:', message)
    return {
      success: false,
      message,
    }
  }
}

/**
 * Imports a licensed stock image into the business's private media library.
 * Implements strict SSRF protection, tenant isolation, and duplicate-import reuse.
 * Strictly 0 Gemini calls, 0 OpenAI calls.
 */
export async function importStockMediaAction({
  businessId,
  stockItem,
}: {
  businessId: string
  stockItem: StockMediaItem
}): Promise<ImportStockMediaResult> {
  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        message: 'Vous devez être connecté pour importer une photo.',
      }
    }

    // 2. Validate business ownership (Fail-closed can_access_business authorization check via RLS)
    if (!businessId || typeof businessId !== 'string') {
      return {
        success: false,
        message: 'Identifiant d’entreprise manquant.',
      }
    }

    const { data: businessRow, error: bizError } = await supabase
      .from('businesses')
      .select('id')
      .eq('id', businessId)
      .maybeSingle()

    if (bizError || !businessRow) {
      return {
        success: false,
        message: 'Accès non autorisé à cette entreprise.',
      }
    }

    // 3. Security: Validate download URL against SSRF
    let downloadUrlObj: URL
    try {
      downloadUrlObj = new URL(stockItem.downloadUrl)
    } catch {
      return {
        success: false,
        message: 'URL de téléchargement d’image invalide.',
      }
    }

    if (downloadUrlObj.protocol !== 'https:') {
      return {
        success: false,
        message: 'Protocole de téléchargement non sécurisé.',
      }
    }

    if (!ALLOWED_DOWNLOAD_HOSTS.includes(downloadUrlObj.hostname.toLowerCase())) {
      return {
        success: false,
        message: 'Source de téléchargement non autorisée (protection anti-SSRF).',
      }
    }

    // 4. Duplicate-Import Protection: Check if already imported for this business
    const { data: existingAsset, error: existingError } = await supabase
      .from('media_assets')
      .select(
        'id, storage_key, original_filename, mime_type, media_type, width, height, orientation, source, creator_name, source_url, license_label, external_asset_id'
      )
      .eq('business_id', businessId)
      .eq('source', 'STOCK_PEXELS')
      .eq('external_asset_id', stockItem.externalId)
      .maybeSingle()

    if (!existingError && existingAsset) {
      // Reuse existing asset without re-downloading or duplicating
      const { data: signedData } = await supabase.storage
        .from('media_assets')
        .createSignedUrl(existingAsset.storage_key, 3600)

      return {
        success: true,
        mediaAsset: {
          id: existingAsset.id,
          url: signedData?.signedUrl || existingAsset.storage_key,
          mediaType: existingAsset.media_type,
          alt: stockItem.altDescription || `Photo par ${stockItem.creatorName} sur Pexels`,
          original_filename: existingAsset.original_filename,
          width: existingAsset.width,
          height: existingAsset.height,
          orientation: existingAsset.orientation,
          source: existingAsset.source,
          creator_name: existingAsset.creator_name,
          source_url: existingAsset.source_url,
          license_label: existingAsset.license_label,
          external_asset_id: existingAsset.external_asset_id,
        },
        isExisting: true,
      }
    }

    // 5. Download image from provider
    const downloadResponse = await fetch(downloadUrlObj.toString(), {
      method: 'GET',
    })

    if (!downloadResponse.ok) {
      return {
        success: false,
        message: 'Impossible de télécharger la photo depuis Pexels.',
      }
    }

    const contentType = (downloadResponse.headers.get('content-type') || '').toLowerCase().split(';')[0].trim()
    if (!ALLOWED_MIME_TYPES.includes(contentType)) {
      return {
        success: false,
        message: 'Format d’image non supporté reçu du fournisseur.',
      }
    }

    const imageArrayBuffer = await downloadResponse.arrayBuffer()
    const imageBuffer = Buffer.from(imageArrayBuffer)

    if (imageBuffer.length > MAX_STOCK_IMAGE_SIZE) {
      return {
        success: false,
        message: 'La photo est trop volumineuse pour être importée.',
      }
    }

    // 6. Generate collision-safe storage path in private bucket
    const assetId = crypto.randomUUID()
    const extension = contentType === 'image/webp' ? 'webp' : contentType === 'image/png' ? 'png' : 'jpg'
    const storageKey = `businesses/${businessId}/media/${assetId}.${extension}`

    const { error: uploadError } = await supabase.storage
      .from('media_assets')
      .upload(storageKey, imageBuffer, {
        contentType,
        upsert: false,
      })

    if (uploadError) {
      console.error('Error uploading stock image to private storage:', uploadError.message)
      return {
        success: false,
        message: 'Échec du stockage de l’image dans votre médiathèque.',
      }
    }

    // 7. Insert into public.media_assets with full provenance (0 AI)
    const { data: insertedRow, error: insertError } = await supabase
      .from('media_assets')
      .insert({
        id: assetId,
        business_id: businessId,
        storage_key: storageKey,
        original_filename: `pexels-${stockItem.externalId}.${extension}`,
        mime_type: contentType,
        media_type: 'IMAGE',
        file_size: imageBuffer.length,
        width: stockItem.width || null,
        height: stockItem.height || null,
        source: 'STOCK_PEXELS',
        analysis_status: 'PENDING',
        external_asset_id: stockItem.externalId,
        source_url: stockItem.sourceUrl,
        creator_name: stockItem.creatorName,
        creator_url: stockItem.creatorUrl,
        attribution_required: stockItem.attributionRequired,
        attribution_text: stockItem.attributionText,
        license_label: stockItem.licenseLabel,
        ai_description: null,
        ai_tags: [],
        detected_objects: [],
        detected_scenes: [],
      })
      .select()
      .single()

    if (insertError || !insertedRow) {
      console.error('Error inserting stock media_assets record:', insertError?.message)
      // Cleanup orphaned storage object
      await supabase.storage.from('media_assets').remove([storageKey])
      return {
        success: false,
        message: 'Échec de l’enregistrement de la photo en base de données.',
      }
    }

    // 8. Generate 1-hour signed URL
    const { data: signedData } = await supabase.storage
      .from('media_assets')
      .createSignedUrl(storageKey, 3600)

    const signedUrl = signedData?.signedUrl || storageKey

    return {
      success: true,
      mediaAsset: {
        id: insertedRow.id,
        url: signedUrl,
        mediaType: insertedRow.media_type,
        alt: stockItem.altDescription || stockItem.attributionText,
        original_filename: insertedRow.original_filename,
        width: insertedRow.width,
        height: insertedRow.height,
        orientation: insertedRow.orientation,
        source: insertedRow.source,
        creator_name: insertedRow.creator_name,
        source_url: insertedRow.source_url,
        license_label: insertedRow.license_label,
        external_asset_id: insertedRow.external_asset_id,
      },
      isExisting: false,
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Une erreur imprévue est survenue.'
    console.error('Unexpected error in importStockMediaAction:', message)
    return {
      success: false,
      message,
    }
  }
}
