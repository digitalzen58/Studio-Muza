import { createClient } from '@/lib/supabase/server'
import type {
  MuzaEditorialHistory,
  MuzaCompactEditorialMemory,
  EditorialHistoryRecommendation,
  EditorialHistoryContent,
} from '@/types/muza-editorial-history'

/**
 * Centralized retrieval window, result cap, and provider payload budget parameters.
 */
export const EDITORIAL_HISTORY_CONFIG = {
  // DB Retrieval Windows & Caps (Step 131C)
  RECENT_RECOMMENDATIONS_DAYS: 30,
  RECENT_RECOMMENDATIONS_CAP: 30,
  REJECTED_RECOMMENDATIONS_DAYS: 60,
  REJECTED_RECOMMENDATIONS_CAP: 20,
  PUBLISHED_CONTENT_DAYS: 90,
  PUBLISHED_CONTENT_CAP: 30,

  // AI Provider Payload Budget Caps (Step 131D)
  PROVIDER_RECENT_CONCEPTS_CAP: 12,
  PROVIDER_REJECTED_CONCEPTS_CAP: 8,
  PROVIDER_PUBLISHED_CONCEPTS_CAP: 10,
} as const

/**
 * Pure helper projecting rich internal MuzaEditorialHistory into a compact,
 * token-minimized AI payload structure (MuzaCompactEditorialMemory).
 * Deduplicates exact concept keys deterministically, excludes legacy unclassified items,
 * and caps items to provider payload limits.
 *
 * @param history - Rich internal editorial history
 * @returns MuzaCompactEditorialMemory
 */
export function buildCompactEditorialMemory(
  history: MuzaEditorialHistory
): MuzaCompactEditorialMemory {
  // 1. Project & deduplicate recent concepts (excluding unclassified legacy items)
  const seenRecentKeys = new Set<string>()
  const recentConcepts: MuzaCompactEditorialMemory['recentConcepts'] = []

  for (const item of history.recentRecommendations) {
    if (
      item.conceptKey !== null &&
      item.editorialTopic !== null &&
      item.editorialAngle !== null
    ) {
      if (seenRecentKeys.has(item.conceptKey)) continue
      seenRecentKeys.add(item.conceptKey)
      recentConcepts.push({
        conceptKey: item.conceptKey,
        topic: item.editorialTopic,
        angle: item.editorialAngle,
        status: item.status,
      })
      if (recentConcepts.length >= EDITORIAL_HISTORY_CONFIG.PROVIDER_RECENT_CONCEPTS_CAP) {
        break
      }
    }
  }

  // 2. Project & deduplicate rejected concepts (excluding unclassified legacy items)
  const seenRejectedKeys = new Set<string>()
  const rejectedConcepts: MuzaCompactEditorialMemory['rejectedConcepts'] = []

  for (const item of history.rejectedRecommendations) {
    if (
      item.conceptKey !== null &&
      item.editorialTopic !== null &&
      item.editorialAngle !== null
    ) {
      if (seenRejectedKeys.has(item.conceptKey)) continue
      seenRejectedKeys.add(item.conceptKey)
      rejectedConcepts.push({
        conceptKey: item.conceptKey,
        topic: item.editorialTopic,
        angle: item.editorialAngle,
      })
      if (rejectedConcepts.length >= EDITORIAL_HISTORY_CONFIG.PROVIDER_REJECTED_CONCEPTS_CAP) {
        break
      }
    }
  }

  // 3. Project & deduplicate published concepts (excluding unclassified legacy items)
  const seenPublishedKeys = new Set<string>()
  const publishedConcepts: MuzaCompactEditorialMemory['publishedConcepts'] = []

  for (const item of history.publishedContents) {
    if (
      item.sourceConceptKey !== null &&
      item.topic !== null &&
      item.angle !== null
    ) {
      if (seenPublishedKeys.has(item.sourceConceptKey)) continue
      seenPublishedKeys.add(item.sourceConceptKey)
      publishedConcepts.push({
        conceptKey: item.sourceConceptKey,
        topic: item.topic,
        angle: item.angle,
        publishedAt: item.publishedAt ? item.publishedAt.slice(0, 10) : item.publishedAt,
      })
      if (publishedConcepts.length >= EDITORIAL_HISTORY_CONFIG.PROVIDER_PUBLISHED_CONCEPTS_CAP) {
        break
      }
    }
  }

  return {
    recentConcepts,
    rejectedConcepts,
    publishedConcepts,
  }
}

/**
 * Server-only service retrieving compact editorial history evidence for a given Business ID.
 * Operates strictly with user authenticated Supabase client + RLS.
 *
 * @param businessId - Trusted business ID from active context
 * @returns Promise<MuzaEditorialHistory>
 */
export async function getMuzaEditorialHistory(
  businessId: string
): Promise<MuzaEditorialHistory> {
  const supabase = await createClient()
  const now = new Date()

  // 1. Calculate cutoff ISO dates based on central config
  const recentCutoff = new Date(
    now.getTime() -
      EDITORIAL_HISTORY_CONFIG.RECENT_RECOMMENDATIONS_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()

  const rejectedCutoff = new Date(
    now.getTime() -
      EDITORIAL_HISTORY_CONFIG.REJECTED_RECOMMENDATIONS_DAYS *
        24 *
        60 *
        60 *
        1000
  ).toISOString()

  const publishedCutoff = new Date(
    now.getTime() -
      EDITORIAL_HISTORY_CONFIG.PUBLISHED_CONTENT_DAYS * 24 * 60 * 60 * 1000
  ).toISOString()

  // 2. Fetch Recent Recommendations (active/non-rejected)
  const { data: recentRows, error: recentError } = await supabase
    .from('recommendations')
    .select('id, title, editorial_topic, editorial_angle, concept_key, status, created_at')
    .eq('business_id', businessId)
    .in('status', ['PROPOSED', 'ACCEPTED', 'CONVERTED'])
    .gte('created_at', recentCutoff)
    .order('created_at', { ascending: false })
    .limit(EDITORIAL_HISTORY_CONFIG.RECENT_RECOMMENDATIONS_CAP)

  if (recentError) {
    console.error('Error fetching recent recommendations history:', recentError.message)
  }

  const recentRecommendations: EditorialHistoryRecommendation[] = (
    recentRows || []
  ).map((row) => ({
    id: row.id,
    title: row.title,
    editorialTopic: row.editorial_topic ?? null,
    editorialAngle: row.editorial_angle ?? null,
    conceptKey: row.concept_key ?? null,
    status: row.status,
    createdAt: row.created_at,
  }))

  // 3. Fetch Rejected Recommendations
  const { data: rejectedRows, error: rejectedError } = await supabase
    .from('recommendations')
    .select('id, title, editorial_topic, editorial_angle, concept_key, status, created_at')
    .eq('business_id', businessId)
    .eq('status', 'REJECTED')
    .gte('created_at', rejectedCutoff)
    .order('created_at', { ascending: false })
    .limit(EDITORIAL_HISTORY_CONFIG.REJECTED_RECOMMENDATIONS_CAP)

  if (rejectedError) {
    console.error('Error fetching rejected recommendations history:', rejectedError.message)
  }

  const rejectedRecommendations: EditorialHistoryRecommendation[] = (
    rejectedRows || []
  ).map((row) => ({
    id: row.id,
    title: row.title,
    editorialTopic: row.editorial_topic ?? null,
    editorialAngle: row.editorial_angle ?? null,
    conceptKey: row.concept_key ?? null,
    status: row.status,
    createdAt: row.created_at,
  }))

  // 4. Fetch Published Content
  const { data: contentRows, error: contentError } = await supabase
    .from('contents')
    .select('id, recommendation_id, topic, angle, published_at')
    .eq('business_id', businessId)
    .eq('status', 'PUBLISHED')
    .not('published_at', 'is', null)
    .gte('published_at', publishedCutoff)
    .order('published_at', { ascending: false })
    .limit(EDITORIAL_HISTORY_CONFIG.PUBLISHED_CONTENT_CAP)

  if (contentError) {
    console.error('Error fetching published content history:', contentError.message)
  }

  // Batch lookup linked recommendations to extract canonical sourceConceptKey
  const linkedRecIds = Array.from(
    new Set(
      (contentRows || [])
        .map((r) => r.recommendation_id)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    )
  )

  const conceptKeyMap = new Map<string, string | null>()

  if (linkedRecIds.length > 0) {
    const { data: recConceptRows, error: recConceptError } = await supabase
      .from('recommendations')
      .select('id, concept_key')
      .in('id', linkedRecIds)

    if (recConceptError) {
      console.error(
        'Error fetching linked recommendation concept keys:',
        recConceptError.message
      )
    } else if (recConceptRows) {
      recConceptRows.forEach((r) => {
        conceptKeyMap.set(r.id, r.concept_key ?? null)
      })
    }
  }

  const publishedContents: EditorialHistoryContent[] = (contentRows || []).map(
    (row) => {
      const linkedRecId = row.recommendation_id ?? null
      const sourceConceptKey = linkedRecId ? conceptKeyMap.get(linkedRecId) ?? null : null

      return {
        id: row.id,
        recommendationId: linkedRecId,
        topic: row.topic ?? null,
        angle: row.angle ?? null,
        sourceConceptKey,
        publishedAt: row.published_at,
      }
    }
  )

  return {
    recentRecommendations,
    rejectedRecommendations,
    publishedContents,
  }
}
