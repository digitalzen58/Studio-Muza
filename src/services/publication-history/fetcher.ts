import { createClient } from '@/lib/supabase/server'
import { getBusinessMediaAssets } from '@/services/media'
import type { VisualComposition } from '@/services/visual-composition/types'
import type {
  PublicationItem,
  PublicationFilter,
  PublicationStatus,
  PublicationOrigin,
  PublicationFormat,
  PublicationSlideItem,
} from './types'

interface FetchPublicationsOptions {
  filter?: PublicationFilter
}

export async function getBusinessPublicationsHistory(
  businessId: string,
  options?: FetchPublicationsOptions
): Promise<{ success: boolean; data: PublicationItem[]; error?: string }> {
  try {
    const supabase = await createClient()

    // 1. Fetch business media assets to resolve cover / slide image URLs
    const { mediaAssets } = await getBusinessMediaAssets(businessId)
    const mediaMap = new Map(mediaAssets.map((m) => [m.id, m]))

    // 2. Query contents for this business
    // Filter by statuses relevant to history: PUBLISHED, SCHEDULED, FAILED
    const query = supabase
      .from('contents')
      .select(`
        id,
        business_id,
        content_type,
        topic,
        hook,
        body,
        status,
        scheduled_at,
        published_at,
        created_at,
        content_variants (
          id,
          platform,
          format,
          title,
          caption,
          metadata,
          status,
          created_at
        )
      `)
      .eq('business_id', businessId)
      .in('status', ['PUBLISHED', 'SCHEDULED', 'FAILED'])

    const { data: contentsData, error: contentsError } = await query

    if (contentsError) {
      console.error('Error fetching contents history:', contentsError)
      return { success: false, data: [], error: contentsError.message }
    }

    // 3. Query publish_jobs for any variant-level published/failed records
    const variantIds = (contentsData || []).flatMap((c) =>
      Array.isArray(c.content_variants) ? c.content_variants.map((v) => v.id) : []
    )

    const publishJobsMap = new Map<
      string,
      Array<{
        status: string
        published_at?: string | null
        platform_post_url?: string | null
        last_error_message?: string | null
        created_at: string
      }>
    >()
    if (variantIds.length > 0) {
      const { data: jobsData } = await supabase
        .from('publish_jobs')
        .select('id, content_variant_id, status, published_at, platform_post_url, last_error_message, created_at')
        .in('content_variant_id', variantIds)

      if (jobsData) {
        for (const job of jobsData) {
          const list = publishJobsMap.get(job.content_variant_id) || []
          list.push(job)
          publishJobsMap.set(job.content_variant_id, list)
        }
      }
    }

    // 4. Transform into PublicationItem view models
    const publications: PublicationItem[] = []

    for (const c of contentsData || []) {
      const variants = Array.isArray(c.content_variants) ? c.content_variants : []
      const primaryVariant = variants[0] || null

      const metadata = (primaryVariant?.metadata || {}) as Record<string, unknown>
      const visualComp = (metadata.visual_composition as VisualComposition) || null
      const slides = Array.isArray(metadata.slides)
        ? (metadata.slides as PublicationSlideItem[])
        : []

      const format: PublicationFormat =
        primaryVariant?.format === 'CAROUSEL' ? 'CAROUSEL' : 'POST'

      const origin: PublicationOrigin =
        (metadata.origin as PublicationOrigin) || 'MUZA'

      const platform: string | null =
        typeof metadata.platform === 'string'
          ? metadata.platform
          : primaryVariant?.platform || null

      // Resolve cover media
      let coverMediaUrl: string | null = null
      let coverMediaAlt: string | null = null

      if (format === 'CAROUSEL') {
        const firstSlide = slides.find((s) => s.index === 1) || slides[0]
        if (firstSlide?.media_id) {
          const asset = mediaMap.get(firstSlide.media_id)
          if (asset) {
            coverMediaUrl = asset.url
            coverMediaAlt = asset.alt || asset.original_filename || null
          }
        }
      } else {
        // POST format: check visual composition background or primary media
        if (visualComp?.background?.mediaAssetId) {
          const asset = mediaMap.get(visualComp.background.mediaAssetId)
          if (asset) {
            coverMediaUrl = asset.url
            coverMediaAlt = asset.alt || asset.original_filename || null
          }
        } else if (visualComp?.background?.mediaUrl) {
          coverMediaUrl = visualComp.background.mediaUrl
        } else {
          const primaryId =
            (metadata.primary_media_id as string) ||
            (metadata.media_id as string) ||
            null
          if (primaryId) {
            const asset = mediaMap.get(primaryId)
            if (asset) {
              coverMediaUrl = asset.url
              coverMediaAlt = asset.alt || asset.original_filename || null
            }
          }
        }
      }

      // Action metadata
      const actionType = (metadata.action_type as string) || null
      const actionDestination = (metadata.action_destination as string) || null
      const action =
        actionType && actionType !== 'NONE'
          ? { type: actionType, destination: actionDestination }
          : null

      // Determine publication status based on contents & publish_jobs
      const variantJobs = primaryVariant ? publishJobsMap.get(primaryVariant.id) || [] : []
      const hasFailedJob = variantJobs.some((j) => j.status === 'FAILED')
      const hasPublishedJob = variantJobs.some((j) => j.status === 'PUBLISHED')
      const publishedJob = variantJobs.find((j) => j.status === 'PUBLISHED')
      const failedJob = variantJobs.find((j) => j.status === 'FAILED')

      let status: PublicationStatus = 'SCHEDULED'
      if (c.status === 'PUBLISHED' || hasPublishedJob) {
        status = 'PUBLISHED'
      } else if (c.status === 'FAILED' || hasFailedJob) {
        status = 'FAILED'
      } else if (c.status === 'SCHEDULED') {
        status = 'SCHEDULED'
      }

      const publishedAt =
        c.published_at || publishedJob?.published_at || (status === 'PUBLISHED' ? c.created_at : null)
      const scheduledAt = c.scheduled_at || null
      const failedAt = failedJob?.created_at || (status === 'FAILED' ? c.created_at : null)
      const failureReason =
        failedJob?.last_error_message ||
        (status === 'FAILED' ? 'Un problème est survenu lors de la publication.' : null)

      const title = c.topic || primaryVariant?.title || 'Publication sans titre'
      const caption = primaryVariant?.caption || c.body || c.hook || null

      publications.push({
        id: c.id,
        contentId: c.id,
        variantId: primaryVariant?.id || null,
        title,
        topic: c.topic || null,
        hook: c.hook || null,
        caption,
        status,
        origin,
        platform,
        format,
        scheduledAt,
        publishedAt,
        failedAt,
        failureReason,
        platformPostUrl: publishedJob?.platform_post_url || null,
        visualComposition: visualComp,
        slides,
        coverMediaUrl,
        coverMediaAlt,
        action,
        metrics: null, // Zero fake metrics in Step 158
      })
    }

    // 5. Apply filter if specified
    const filtered = options?.filter
      ? publications.filter((p) => p.status === options.filter)
      : publications

    // 6. Sort results
    filtered.sort((a, b) => {
      if (a.status === 'SCHEDULED' && b.status === 'SCHEDULED') {
        return (
          new Date(a.scheduledAt || 0).getTime() -
          new Date(b.scheduledAt || 0).getTime()
        )
      }
      const timeA = new Date(a.publishedAt || a.failedAt || a.scheduledAt || 0).getTime()
      const timeB = new Date(b.publishedAt || b.failedAt || b.scheduledAt || 0).getTime()
      return timeB - timeA
    })

    return { success: true, data: filtered }
  } catch (err) {
    console.error('Unexpected error fetching publications history:', err)
    return {
      success: false,
      data: [],
      error: err instanceof Error ? err.message : 'Erreur inattendue',
    }
  }
}
