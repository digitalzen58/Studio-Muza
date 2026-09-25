'use server'

import { createClient } from '@/lib/supabase/server'
import type { BrandMediaAsset } from '@/services/media'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB limit
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export type UploadMediaResult =
  | {
      success: true
      mediaAsset: BrandMediaAsset
    }
  | {
      success: false
      message: string
    }

export type GetMediaLibraryResult =
  | {
      success: true
      mediaAssets: BrandMediaAsset[]
    }
  | {
      success: false
      message: string
    }

/**
 * Server Action to upload a business personal image into private Supabase storage.
 * Enforces business-scoped ownership and strict file validation.
 * Strictly 0 AI calls.
 */
export async function uploadBusinessMediaAction(
  formData: FormData
): Promise<UploadMediaResult> {
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
        message: 'Vous devez être connecté pour ajouter une photo.',
      }
    }

    // 2. Resolve and validate business ID
    const businessId = formData.get('businessId') as string
    if (!businessId || typeof businessId !== 'string') {
      return {
        success: false,
        message: 'Identifiant d’entreprise manquant.',
      }
    }

    // Verify user can access this business (Fail-closed can_access_business authorization check via RLS)
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

    // 3. Extract and validate file
    const file = formData.get('file') as File | null
    if (!file || typeof file !== 'object' || typeof file.arrayBuffer !== 'function' || !file.size) {
      return {
        success: false,
        message: 'Aucun fichier sélectionné.',
      }
    }

    const mimeType = (file.type || '').toLowerCase()

    // MIME type check
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return {
        success: false,
        message: 'Format non supporté. Veuillez utiliser un fichier JPEG, PNG ou WebP.',
      }
    }

    // Size limit check (10MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        success: false,
        message: 'Fichier trop volumineux. La taille maximale autorisée est de 10 Mo.',
      }
    }

    // 4. Derive safe filename and storage key
    const extension =
      mimeType === 'image/png'
        ? 'png'
        : mimeType === 'image/webp'
        ? 'webp'
        : 'jpg'

    const assetId = crypto.randomUUID()
    const storageKey = `businesses/${businessId}/media/${assetId}.${extension}`

    // 5. Upload buffer into private Supabase Storage bucket
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: storageError } = await supabase.storage
      .from('media_assets')
      .upload(storageKey, buffer, {
        contentType: mimeType || 'image/jpeg',
        upsert: false,
      })

    if (storageError) {
      console.error('Error uploading file to storage:', storageError.message)
      return {
        success: false,
        message: "Impossible d'importer cette image. Réessayez.",
      }
    }

    // 6. Insert metadata row into public.media_assets (strictly 0 invented AI metadata)
    const { data: mediaRow, error: insertError } = await supabase
      .from('media_assets')
      .insert({
        id: assetId,
        business_id: businessId,
        storage_key: storageKey,
        original_filename: file.name || 'photo.jpg',
        mime_type: mimeType || 'image/jpeg',
        media_type: 'IMAGE',
        file_size: file.size,
        source: 'USER_UPLOAD',
        analysis_status: 'PENDING',
      })
      .select('id, storage_key, original_filename, mime_type, media_type, width, height, orientation')
      .single()

    if (insertError || !mediaRow) {
      console.error('Error inserting media_assets row:', insertError?.message)
      // Cleanup orphaned storage object
      await supabase.storage.from('media_assets').remove([storageKey])
      return {
        success: false,
        message: "Impossible d'importer cette image. Réessayez.",
      }
    }

    // 7. Generate signed URL for client rendering (1 hour lifetime)
    const { data: signedData, error: signedError } = await supabase.storage
      .from('media_assets')
      .createSignedUrl(storageKey, 3600)

    const signedUrl = signedData?.signedUrl || storageKey
    if (signedError) {
      console.error('Error generating signed URL:', signedError.message)
    }

    const brandMediaAsset: BrandMediaAsset = {
      id: mediaRow.id,
      url: signedUrl,
      mediaType: mediaRow.media_type,
      alt: mediaRow.original_filename || 'Photo personnelle',
      original_filename: mediaRow.original_filename,
      width: mediaRow.width,
      height: mediaRow.height,
      orientation: mediaRow.orientation,
      source: 'USER_UPLOAD',
    }

    return {
      success: true,
      mediaAsset: brandMediaAsset,
    }
  } catch (err) {
    console.error('Unexpected error in uploadBusinessMediaAction:', err)
    return {
      success: false,
      message: "Impossible d'importer cette image. Réessayez.",
    }
  }
}

/**
 * Server Action to list authenticated business media assets with fresh signed URLs.
 * Strictly 0 AI calls.
 */
export async function getBusinessMediaLibraryAction(
  businessId: string
): Promise<GetMediaLibraryResult> {
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
        message: 'Vous devez être connecté pour accéder à votre médiathèque.',
      }
    }

    // 2. Fetch media assets (RLS enforced)
    const { data: rows, error: fetchError } = await supabase
      .from('media_assets')
      .select('id, storage_key, original_filename, mime_type, media_type, width, height, orientation, ai_description')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (fetchError) {
      console.error('Error fetching business media library:', fetchError.message)
      return {
        success: false,
        message: 'Impossible de charger votre médiathèque.',
      }
    }

    // 3. Generate signed URLs for private assets
    const mediaAssets: BrandMediaAsset[] = await Promise.all(
      (rows || []).map(async (row) => {
        let url = row.storage_key
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          const { data: signedData } = await supabase.storage
            .from('media_assets')
            .createSignedUrl(row.storage_key, 3600)
          if (signedData?.signedUrl) {
            url = signedData.signedUrl
          }
        }

        return {
          id: row.id,
          url,
          mediaType: row.media_type,
          alt: row.ai_description || row.original_filename || 'Photo personnelle',
          width: row.width,
          height: row.height,
          orientation: row.orientation,
        }
      })
    )

    return {
      success: true,
      mediaAssets,
    }
  } catch (err) {
    console.error('Unexpected error in getBusinessMediaLibraryAction:', err)
    return {
      success: false,
      message: 'Une erreur imprévue est survenue.',
    }
  }
}
