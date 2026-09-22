import type { VisualComposition } from '@/services/visual-composition/types'

export type PublicationStatus = 'PUBLISHED' | 'SCHEDULED' | 'FAILED'
export type PublicationFilter = 'PUBLISHED' | 'SCHEDULED' | 'FAILED'
export type PublicationOrigin = 'MUZA' | 'EXTERNAL' | 'IMPORTED'
export type PublicationFormat = 'POST' | 'CAROUSEL'

export interface PublicationCommercialAction {
  type: string | null
  destination: string | null
}

export interface PublicationSlideItem {
  index: number
  media_id?: string | null
  headline?: string
  body?: string
}

/**
 * Future metrics snapshot type foundation.
 * Values remain null in Step 158 (zero fake metrics).
 */
export interface PublicationMetricsSnapshot {
  views?: number | null
  reach?: number | null
  clicks?: number | null
  likes?: number | null
  comments?: number | null
  shares?: number | null
  saves?: number | null
  capturedAt?: string | null
}

export interface PublicationItem {
  id: string
  contentId: string
  variantId?: string | null
  title: string
  topic?: string | null
  hook?: string | null
  caption?: string | null
  status: PublicationStatus
  origin: PublicationOrigin
  platform?: string | null
  format: PublicationFormat
  scheduledAt?: string | null
  publishedAt?: string | null
  failedAt?: string | null
  failureReason?: string | null
  visualComposition?: VisualComposition | null
  slides?: PublicationSlideItem[]
  coverMediaUrl?: string | null
  coverMediaAlt?: string | null
  action?: PublicationCommercialAction | null
  metrics?: PublicationMetricsSnapshot | null
}

/**
 * User-facing status mapper: converts technical enum to beginner French label.
 */
export function mapPublicationStatusLabel(status: PublicationStatus): string {
  switch (status) {
    case 'PUBLISHED':
      return 'Publiée'
    case 'SCHEDULED':
      return 'Prévue'
    case 'FAILED':
      return 'Échec'
    default:
      return status
  }
}

/**
 * User-facing format mapper: converts format to beginner French label.
 */
export function mapFormatLabel(format: PublicationFormat): string {
  switch (format) {
    case 'POST':
      return 'Post'
    case 'CAROUSEL':
      return 'Carrousel'
    default:
      return format
  }
}

/**
 * Platform label helper: formats known platform or returns null when unset.
 */
export function mapPlatformLabel(platform?: string | null): string | null {
  if (!platform) return null
  const upper = platform.toUpperCase()
  if (upper === 'INSTAGRAM') return 'Instagram'
  if (upper === 'FACEBOOK') return 'Facebook'
  if (upper === 'LINKEDIN') return 'LinkedIn'
  if (upper === 'TIKTOK') return 'TikTok'
  if (upper === 'YOUTUBE' || upper === 'YOUTUBE_SHORTS') return 'YouTube'
  return platform
}
