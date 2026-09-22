import type { MuzaAIProvider } from '@/types/muza-ai-provider'

export type RecommendationType =
  | 'CONTENT'
  | 'SEO'
  | 'OFFER'
  | 'VISIBILITY'
  | 'ENGAGEMENT'

export type RecommendationPriority =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'

export type RecommendationFormat =
  | 'INSTAGRAM_POST'
  | 'INSTAGRAM_CAROUSEL'
  | 'INSTAGRAM_REEL'
  | 'INSTAGRAM_STORY'
  | 'FACEBOOK_POST'
  | 'TIKTOK'
  | 'LINKEDIN_POST'
  | 'YOUTUBE_SHORT'
  | 'BLOG_ARTICLE'
  | 'WEBSITE_PAGE'
  | 'GOOGLE_BUSINESS_PROFILE'
  | 'OTHER'

export type MuzaRecommendationReason = {
  label: string
  explanation: string
}

export type MuzaRecommendation = {
  type: RecommendationType

  title: string
  summary: string

  priority: RecommendationPriority

  whyNow: string
  reasons: MuzaRecommendationReason[]

  suggestedFormats: RecommendationFormat[]

  objective: string | null
  audience: string | null
  offer: string | null

  estimatedEffortMinutes: number | null

  requiresCamera: boolean
  requiresVoiceover: boolean

  contentAngle: string | null
  callToAction: string | null

  editorialTopic: string
  editorialAngle: string
  conceptKey: string
  noveltyReason: string | null

  status?: string

  assetGuidance?: MuzaRecommendationAssetGuidance
}

export type MuzaAssetReadiness =
  | 'READY'
  | 'PARTIAL'
  | 'MISSING'
  | 'NO_MEDIA_REQUIRED'

export type MuzaRecommendationAssetGuidance = {
  assetReadiness: MuzaAssetReadiness
  suggestedAssetIds: string[]
  captureBrief: string | null
}

export type MuzaRecommendationBatch = {
  recommendations: MuzaRecommendation[]

  strategicSummary: string

  generatedAt: string
}

export type MuzaPersistedBatchResult = {
  batchId: string
  recommendationIds: string[]
  recommendationCount: number
}

export type MuzaPersistedRecommendationBatch = {
  batch: MuzaRecommendationBatch
  persistence: MuzaPersistedBatchResult
  provider: MuzaAIProvider
  model: string
}

