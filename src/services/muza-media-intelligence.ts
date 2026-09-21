import { createClient } from '@/lib/supabase/server'
import { normalizeEditorialDimension } from '@/services/muza-editorial-concept'
import type {
  MuzaRecommendation,
  MuzaRecommendationAssetGuidance,
  MuzaAssetReadiness,
} from '@/types/muza-recommendation-engine'
import type { MuzaIndustryPlaybook } from '@/types/muza-industry-playbook'

/**
 * Maximum number of suggested assets attached per recommendation.
 */
export const MAX_SUGGESTED_ASSETS_PER_RECOMMENDATION = 3

/**
 * Server/domain compact representation of a business media asset for matching & asset intelligence.
 */
export type MuzaMediaCandidate = {
  id: string
  businessId: string
  mediaType: string // 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT'
  orientation: string | null // 'PORTRAIT' | 'LANDSCAPE' | 'SQUARE'
  width: number | null
  height: number | null
  description: string | null
  tags: string[]
  detectedObjects: string[]
  detectedScenes: string[]
  qualityScore: number | null
  usageCount: number
  lastUsedAt: string | null
}

/**
 * Server-only service loading authenticated media assets metadata for a given business ID.
 * Respects RLS and authenticated Supabase user scope.
 *
 * @param businessId Trusted business ID
 * @returns Promise<MuzaMediaCandidate[]>
 */
export async function loadBusinessMediaInventory(
  businessId: string
): Promise<MuzaMediaCandidate[]> {
  try {
    const supabase = await createClient()

    // 1. Fetch media assets metadata
    const { data: mediaRows, error: mediaError } = await supabase
      .from('media_assets')
      .select(
        'id, business_id, media_type, width, height, ai_description, ai_tags, detected_objects, detected_scenes, orientation, quality_score, created_at'
      )
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (mediaError) {
      console.error('Error fetching media_assets for inventory:', mediaError.message)
      return []
    }

    if (!mediaRows || mediaRows.length === 0) {
      return []
    }

    // 2. Fetch usage stats from content_media table
    const assetIds = mediaRows.map((r) => r.id)
    const usageMap = new Map<string, { count: number; lastUsed: string | null }>()

    if (assetIds.length > 0) {
      const { data: usageRows, error: usageError } = await supabase
        .from('content_media')
        .select('media_asset_id, created_at')
        .in('media_asset_id', assetIds)

      if (!usageError && usageRows) {
        for (const row of usageRows) {
          const existing = usageMap.get(row.media_asset_id) || { count: 0, lastUsed: null }
          const newCount = existing.count + 1
          const newLastUsed =
            !existing.lastUsed || new Date(row.created_at) > new Date(existing.lastUsed)
              ? row.created_at
              : existing.lastUsed

          usageMap.set(row.media_asset_id, { count: newCount, lastUsed: newLastUsed })
        }
      }
    }

    // 3. Map to MuzaMediaCandidate domain objects
    return mediaRows.map((row) => {
      const usage = usageMap.get(row.id) || { count: 0, lastUsed: null }

      const rawTags = Array.isArray(row.ai_tags) ? row.ai_tags : []
      const rawObjects = Array.isArray(row.detected_objects) ? row.detected_objects : []
      const rawScenes = Array.isArray(row.detected_scenes) ? row.detected_scenes : []

      return {
        id: row.id,
        businessId: row.business_id,
        mediaType: String(row.media_type).toUpperCase(),
        orientation: row.orientation ? String(row.orientation).toUpperCase() : null,
        width: row.width ?? null,
        height: row.height ?? null,
        description: row.ai_description ?? null,
        tags: rawTags.map((t) => normalizeEditorialDimension(String(t))).filter(Boolean),
        detectedObjects: rawObjects.map((o) => normalizeEditorialDimension(String(o))).filter(Boolean),
        detectedScenes: rawScenes.map((s) => normalizeEditorialDimension(String(s))).filter(Boolean),
        qualityScore: row.quality_score ? Number(row.quality_score) : null,
        usageCount: usage.count,
        lastUsedAt: usage.lastUsed,
      }
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error loading media inventory'
    console.error('Unexpected error in loadBusinessMediaInventory:', message)
    return []
  }
}

/**
 * Evaluates whether a recommendation requires photography/video or can be executed
 * clean as a graphical/text format (e.g. FAQ, quote, announcement, checklist, text carousel).
 *
 * @param recommendation Target recommendation
 * @returns boolean
 */
export function isMediaRequiredForRecommendation(
  recommendation: MuzaRecommendation
): boolean {
  // Explicit camera requirement flag from AI generation
  if (recommendation.requiresCamera) {
    return true
  }

  // Explicit video-native format requirements
  const formats = recommendation.suggestedFormats || []
  const hasVideoNativeFormat = formats.some((f) =>
    ['INSTAGRAM_REEL', 'TIKTOK', 'YOUTUBE_SHORT'].includes(f)
  )

  // Non-photo graphic/text execution keywords
  const textKeywords = [
    'faq',
    'citation',
    'quote',
    'checklist',
    'conseil_texte',
    'annonce',
    'communique',
    'carrousel_educatif',
    'infographie',
  ]

  const normTopic = normalizeEditorialDimension(recommendation.editorialTopic)
  const normAngle = normalizeEditorialDimension(recommendation.editorialAngle)

  const isTextGraphicConcept = textKeywords.some(
    (kw) => normTopic.includes(kw) || normAngle.includes(kw)
  )

  if (isTextGraphicConcept && !hasVideoNativeFormat) {
    return false
  }

  // Visual tour / showcase / transformation keywords require media
  const visualKeywords = [
    'visite',
    'coulisses',
    'transformation',
    'avant_apres',
    'produit',
    'demonstration',
    'recette',
    'tutoriel_video',
  ]

  const isVisualConcept = visualKeywords.some(
    (kw) => normTopic.includes(kw) || normAngle.includes(kw)
  )

  if (isVisualConcept) {
    return true
  }

  // Default to false for web pages / articles / Google posts if not camera required
  if (
    formats.every((f) =>
      ['WEBSITE_PAGE', 'BLOG_ARTICLE', 'GOOGLE_BUSINESS_PROFILE', 'OTHER'].includes(f)
    )
  ) {
    return false
  }

  return true
}

/**
 * Pure deterministic scoring function evaluating how well a candidate asset matches a recommendation.
 *
 * @param candidate - Media candidate object
 * @param recommendation - Target recommendation
 * @returns Weighted relevance score
 */
export function scoreMediaCandidateForRecommendation(
  candidate: MuzaMediaCandidate,
  recommendation: MuzaRecommendation
): number {
  let score = 0

  // 1. Semantic metadata keyword overlap
  const targetKeywords = new Set([
    ...normalizeEditorialDimension(recommendation.editorialTopic).split('_'),
    ...normalizeEditorialDimension(recommendation.editorialAngle).split('_'),
    ...(recommendation.contentAngle ? normalizeEditorialDimension(recommendation.contentAngle).split('_') : []),
  ].filter((w) => w.length > 2))

  if (targetKeywords.size > 0) {
    const candidateTokens = new Set([
      ...(candidate.tags || []),
      ...(candidate.detectedObjects || []),
      ...(candidate.detectedScenes || []),
      ...(candidate.description ? normalizeEditorialDimension(candidate.description).split('_') : []),
    ])

    let overlapCount = 0
    for (const kw of targetKeywords) {
      if (candidateTokens.has(kw)) {
        overlapCount++
      }
    }

    score += overlapCount * 30
  }

  // If there is zero semantic overlap between candidate metadata and recommendation topic/angle,
  // do not select the asset merely because it exists.
  if (score === 0) {
    return 0
  }

  // 2. Media Type Compatibility
  const formats = recommendation.suggestedFormats || []
  const requiresVideo = formats.some((f) =>
    ['INSTAGRAM_REEL', 'TIKTOK', 'YOUTUBE_SHORT'].includes(f)
  )

  if (requiresVideo) {
    if (candidate.mediaType === 'VIDEO') {
      score += 25
    } else {
      score -= 15 // Penalty if video format needs video asset but candidate is image
    }
  } else {
    if (candidate.mediaType === 'IMAGE') {
      score += 20
    }
  }

  // 3. Orientation Compatibility
  const prefersVertical = formats.some((f) =>
    ['INSTAGRAM_REEL', 'INSTAGRAM_STORY', 'TIKTOK', 'YOUTUBE_SHORT'].includes(f)
  )

  if (prefersVertical) {
    if (candidate.orientation === 'PORTRAIT') {
      score += 15
    } else if (candidate.orientation === 'SQUARE') {
      score += 5
    }
  } else {
    if (candidate.orientation === 'SQUARE' || candidate.orientation === 'PORTRAIT') {
      score += 10
    }
  }

  // 4. Quality Score Bonus
  if (candidate.qualityScore !== null) {
    score += Math.min(candidate.qualityScore * 10, 15)
  }

  // 5. Lightweight Media Reuse Penalty
  if (candidate.usageCount > 0) {
    score -= Math.min(candidate.usageCount * 10, 25)
  }

  return Math.max(score, 0)
}

/**
 * Generates a deterministic, short, actionable capture brief when asset readiness is PARTIAL or MISSING.
 * Zero AI call. Uses recommendation topic, angle, format, and optional playbook guidance.
 *
 * @param recommendation - Target recommendation
 * @param playbook - Optional active industry playbook
 * @returns Formatted capture brief string
 */
export function generateDeterministicCaptureBrief(
  recommendation: MuzaRecommendation,
  playbook?: MuzaIndustryPlaybook | null
): string {
  const formats = recommendation.suggestedFormats || []
  const isVideo = formats.some((f) =>
    ['INSTAGRAM_REEL', 'TIKTOK', 'YOUTUBE_SHORT'].includes(f)
  )

  const topic = recommendation.editorialTopic
  const angle = recommendation.editorialAngle

  let categoryHint = ''
  if (playbook?.visualAssetCategories && playbook.visualAssetCategories.length > 0) {
    const matchedCategory = playbook.visualAssetCategories.find((cat) =>
      Array.isArray(cat.keywords) &&
      cat.keywords.some(
        (kw) =>
          normalizeEditorialDimension(topic).includes(kw) ||
          normalizeEditorialDimension(angle).includes(kw)
      )
    )
    if (matchedCategory && matchedCategory.captureHints) {
      categoryHint = ` (${matchedCategory.captureHints})`
    }
  }

  if (isVideo) {
    return `Filmez 2 à 3 plans verticaux de 5 à 8 secondes illustrant : ${topic} (${angle})${categoryHint}.`
  }

  return `Prenez 2 photos portrait bien éclairées montrant : ${topic} sous l'angle ${angle}${categoryHint}.`
}

/**
 * Pure helper enriching a single recommendation with media asset guidance.
 *
 * @param recommendation Target recommendation
 * @param candidates Business media inventory
 * @param assignedAssetCounts Map tracking asset assignment counts across batch
 * @param playbook Optional industry playbook
 * @returns MuzaRecommendationAssetGuidance
 */
export function enrichRecommendationWithMediaGuidance(
  recommendation: MuzaRecommendation,
  candidates: MuzaMediaCandidate[],
  assignedAssetCountsOrPlaybook?: Map<string, number> | MuzaIndustryPlaybook | null,
  playbook?: MuzaIndustryPlaybook | null
): MuzaRecommendationAssetGuidance {
  const assignedAssetCounts =
    assignedAssetCountsOrPlaybook instanceof Map
      ? assignedAssetCountsOrPlaybook
      : new Map<string, number>()
  const resolvedPlaybook =
    assignedAssetCountsOrPlaybook instanceof Map
      ? playbook
      : (assignedAssetCountsOrPlaybook as MuzaIndustryPlaybook | null | undefined)

  const isRequired = isMediaRequiredForRecommendation(recommendation)

  if (!isRequired) {
    return {
      assetReadiness: 'NO_MEDIA_REQUIRED',
      suggestedAssetIds: [],
      captureBrief: null,
    }
  }

  if (!candidates || candidates.length === 0) {
    return {
      assetReadiness: 'MISSING',
      suggestedAssetIds: [],
      captureBrief: generateDeterministicCaptureBrief(recommendation, resolvedPlaybook),
    }
  }

  // Score all candidates for this recommendation
  const scored = candidates
    .map((c) => {
      let score = scoreMediaCandidateForRecommendation(c, recommendation)
      // Apply penalty if asset was already selected in current batch to avoid excessive repetition
      const batchUsage = assignedAssetCounts.get(c.id) || 0
      if (batchUsage > 0) {
        score -= batchUsage * 20
      }
      return { candidate: c, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)

  if (scored.length === 0) {
    return {
      assetReadiness: 'MISSING',
      suggestedAssetIds: [],
      captureBrief: generateDeterministicCaptureBrief(recommendation, playbook),
    }
  }

  const selectedCandidates = scored
    .slice(0, MAX_SUGGESTED_ASSETS_PER_RECOMMENDATION)
    .map((s) => s.candidate)

  const selectedIds = selectedCandidates.map((c) => c.id)

  // Track batch usage count for primary suggested asset to prevent primary asset repetition
  if (selectedIds.length > 0) {
    const primaryId = selectedIds[0]
    assignedAssetCounts.set(primaryId, (assignedAssetCounts.get(primaryId) || 0) + 1)
  }

  const topScore = scored[0].score

  const formats = recommendation.suggestedFormats || []
  const isVideoFormat = formats.some((f) =>
    ['INSTAGRAM_REEL', 'TIKTOK', 'YOUTUBE_SHORT'].includes(f)
  )

  const hasMatchingVideo = selectedCandidates.some((c) => c.mediaType === 'VIDEO')

  let readiness: MuzaAssetReadiness

  if (isVideoFormat && !hasMatchingVideo) {
    readiness = 'PARTIAL'
  } else if (topScore >= 35 && selectedCandidates.length >= 1) {
    readiness = 'READY'
  } else {
    readiness = 'PARTIAL'
  }

  const captureBrief =
    readiness === 'READY'
      ? null
      : generateDeterministicCaptureBrief(recommendation, resolvedPlaybook)

  return {
    assetReadiness: readiness,
    suggestedAssetIds: selectedIds,
    captureBrief,
  }
}

/**
 * Batch enrichment function attaching asset guidance to all recommendations in a batch.
 * Operates purely deterministically, updating assigned asset counts across the batch.
 *
 * @param recommendations Batch of recommendations
 * @param candidates Business media inventory candidates
 * @param playbook Optional active industry playbook
 * @returns Array of enriched recommendations
 */
export function enrichMuzaRecommendationsWithMediaAssets(
  recommendations: MuzaRecommendation[],
  candidates: MuzaMediaCandidate[],
  playbook?: MuzaIndustryPlaybook | null
): MuzaRecommendation[] {
  const assignedAssetCounts = new Map<string, number>()

  return recommendations.map((rec) => {
    const assetGuidance = enrichRecommendationWithMediaGuidance(
      rec,
      candidates,
      assignedAssetCounts,
      playbook
    )

    return {
      ...rec,
      assetGuidance,
    }
  })
}
