import { createClient } from '@/lib/supabase/server'

export interface BrandMediaAsset {
  id: string
  url: string
  mediaType: string
  alt: string
  width?: number | null
  height?: number | null
  orientation?: string | null
}

/**
 * Resolves storage key to public or absolute media URL safely.
 * Preserves absolute URLs, maps relative keys to storage bucket.
 */
export function resolveMediaStorageUrl(
  storageKey: string,
  getPublicUrlFn?: (bucket: string, key: string) => string
): string {
  if (storageKey.startsWith('http://') || storageKey.startsWith('https://')) {
    return storageKey
  }
  if (getPublicUrlFn) {
    return getPublicUrlFn('media_assets', storageKey)
  }
  return `https://supabase.co/storage/v1/object/public/media_assets/${storageKey}`
}

/**
 * Server-side helper to fetch authenticated media assets for a given Business.
 * Respects RLS and authenticated Supabase user scope.
 */
export async function getBusinessMediaAssets(businessId: string): Promise<{
  mediaAssets: BrandMediaAsset[]
  error: string | null
}> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('media_assets')
      .select('id, storage_key, original_filename, mime_type, media_type, width, height, ai_description, orientation')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(12)

    if (error) {
      console.error('Error fetching media_assets:', error.message)
      return { mediaAssets: [], error: error.message }
    }

    if (!data || data.length === 0) {
      return { mediaAssets: [], error: null }
    }

    const mediaAssets: BrandMediaAsset[] = data.map((item) => {
      const url = resolveMediaStorageUrl(item.storage_key, (bucket, key) => {
        const { data: publicUrlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(key)
        return publicUrlData.publicUrl
      })

      return {
        id: item.id,
        url,
        mediaType: item.media_type,
        alt: item.ai_description || item.original_filename || 'Brand media asset',
        width: item.width,
        height: item.height,
        orientation: item.orientation,
      }
    })

    return { mediaAssets, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error fetching media assets'
    console.error('Unexpected error in getBusinessMediaAssets:', message)
    return { mediaAssets: [], error: message }
  }
}
