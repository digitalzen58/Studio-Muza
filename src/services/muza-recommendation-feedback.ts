import { createClient } from '@/lib/supabase/server'
import {
  FEEDBACK_MEMORY_CONFIG,
  type RecommendationFeedbackReason,
  type RecommendationFeedbackIntent,
  type MuzaRecommendationFeedbackMemory,
  type MuzaFeedbackMemoryItem,
  type MuzaCompactFeedbackItem,
  type MuzaCompactFeedbackMemory,
} from '@/types/muza-recommendation-feedback'

export interface RecordFeedbackInput {
  businessId: string
  recommendationId: string
  reason: RecommendationFeedbackReason
  note?: string | null
}

export interface RecordFeedbackResult {
  success: boolean
  feedbackId?: string
  recommendationId: string
  reason: RecommendationFeedbackReason
  intent: RecommendationFeedbackIntent
  statusUpdatedToRejected: boolean
  message?: string
}

export interface RecordBatchFeedbackInput {
  businessId: string
  recommendationIds: string[]
  reason: RecommendationFeedbackReason
  note?: string | null
}

export interface RecordBatchFeedbackResult {
  success: boolean
  processedCount: number
  results: RecordFeedbackResult[]
  message?: string
}

/**
 * Server-only service recording structured feedback for a single recommendation.
 * Uses authenticated Supabase client and enforces active business ownership via RPC.
 *
 * COST RULE: ZERO AI calls. Purely deterministic persistence.
 */
export async function recordRecommendationFeedback(
  input: RecordFeedbackInput
): Promise<RecordFeedbackResult> {
  const { businessId, recommendationId, reason, note } = input

  // Validate note length
  if (note && note.trim().length > FEEDBACK_MEMORY_CONFIG.MAX_NOTE_LENGTH) {
    throw new Error(
      `Feedback note exceeds maximum allowed length of ${FEEDBACK_MEMORY_CONFIG.MAX_NOTE_LENGTH} characters.`
    )
  }

  const supabase = await createClient()

  // Call authenticated RPC
  const { data, error } = await supabase.rpc('record_recommendation_feedback', {
    p_business_id: businessId,
    p_recommendation_id: recommendationId,
    p_reason: reason,
    p_note: note ? note.trim() : null,
  })

  if (error) {
    console.error('Error in record_recommendation_feedback RPC:', error.message)
    throw new Error(error.message)
  }

  const rpcResult = data as {
    success: boolean
    feedback_id: string
    recommendation_id: string
    reason: RecommendationFeedbackReason
    intent: RecommendationFeedbackIntent
    status_updated_to_rejected: boolean
  }

  return {
    success: true,
    feedbackId: rpcResult.feedback_id,
    recommendationId: rpcResult.recommendation_id,
    reason: rpcResult.reason,
    intent: rpcResult.intent,
    statusUpdatedToRejected: rpcResult.status_updated_to_rejected,
  }
}

/**
 * Server-only service recording batch feedback for all recommendations in a batch ("Rien ne me convient").
 * COST RULE: ZERO AI calls.
 */
export async function recordBatchRecommendationFeedback(
  input: RecordBatchFeedbackInput
): Promise<RecordBatchFeedbackResult> {
  const { businessId, recommendationIds, reason, note } = input

  if (!recommendationIds || recommendationIds.length === 0) {
    throw new Error('Recommendation IDs list cannot be empty.')
  }

  if (note && note.trim().length > FEEDBACK_MEMORY_CONFIG.MAX_NOTE_LENGTH) {
    throw new Error(
      `Feedback note exceeds maximum allowed length of ${FEEDBACK_MEMORY_CONFIG.MAX_NOTE_LENGTH} characters.`
    )
  }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('record_batch_recommendation_feedback', {
    p_business_id: businessId,
    p_recommendation_ids: recommendationIds,
    p_reason: reason,
    p_note: note ? note.trim() : null,
  })

  if (error) {
    console.error('Error in record_batch_recommendation_feedback RPC:', error.message)
    throw new Error(error.message)
  }

  const rpcResult = data as {
    success: boolean
    processed_count: number
    results: Array<{
      feedback_id: string
      recommendation_id: string
      reason: RecommendationFeedbackReason
      intent: RecommendationFeedbackIntent
      status_updated_to_rejected: boolean
    }>
  }

  return {
    success: true,
    processedCount: rpcResult.processed_count,
    results: (rpcResult.results || []).map((r) => ({
      success: true,
      feedbackId: r.feedback_id,
      recommendationId: r.recommendation_id,
      reason: r.reason,
      intent: r.intent,
      statusUpdatedToRejected: r.status_updated_to_rejected,
    })),
  }
}

/**
 * Fetches recent feedback memory for an active business and applies configurable intent windows.
 *
 * Windows:
 * - IDEA_REJECTION: 90 days
 * - EXECUTION_CONSTRAINT: 60 days
 * - FORMAT_PREFERENCE: 60 days
 * - REPETITION: 30 days
 * - TIMING: 14 days
 *
 * @param businessId Active business ID
 * @param customNow Optional Date for deterministic testing
 * @returns Promise<MuzaRecommendationFeedbackMemory>
 */
export async function getMuzaFeedbackMemory(
  businessId: string,
  customNow?: Date
): Promise<MuzaRecommendationFeedbackMemory> {
  const supabase = await createClient()
  const now = customNow || new Date()

  // Find the widest window across all intents (90 days) to bound the DB query
  const maxDays = Math.max(...Object.values(FEEDBACK_MEMORY_CONFIG.WINDOWS_DAYS))
  const maxCutoff = new Date(now.getTime() - maxDays * 24 * 60 * 60 * 1000).toISOString()

  // Fetch feedback records with linked recommendation concept_key
  const { data: rows, error } = await supabase
    .from('recommendation_feedback')
    .select(
      `
      id,
      reason,
      intent,
      created_at,
      recommendations!inner (
        id,
        concept_key
      )
    `
    )
    .eq('business_id', businessId)
    .gte('created_at', maxCutoff)
    .order('created_at', { ascending: false })
    .limit(FEEDBACK_MEMORY_CONFIG.MAX_MEMORY_ITEMS)

  if (error) {
    console.error('Error fetching recommendation feedback memory:', error.message)
    return { recentFeedback: [] }
  }

  const items: MuzaFeedbackMemoryItem[] = []

  for (const row of rows || []) {
    const intent = row.intent as RecommendationFeedbackIntent
    const windowDays = FEEDBACK_MEMORY_CONFIG.WINDOWS_DAYS[intent] || 30
    const itemCutoff = new Date(now.getTime() - windowDays * 24 * 60 * 60 * 1000)
    const itemDate = new Date(row.created_at)

    // Verify item is strictly within its intent-specific window
    if (itemDate >= itemCutoff) {
      // Extract conceptKey from joined relation
      const rec = Array.isArray(row.recommendations)
        ? row.recommendations[0]
        : row.recommendations

      const conceptKey = rec?.concept_key || null

      if (conceptKey) {
        items.push({
          conceptKey,
          reason: row.reason as RecommendationFeedbackReason,
          intent,
          createdAt: row.created_at,
        })
      }
    }
  }

  return {
    recentFeedback: items,
  }
}

/**
 * Pure helper projecting rich MuzaRecommendationFeedbackMemory into an ultra-compact,
 * token-minimized representation suitable for future AI provider payload (Step 132A).
 *
 * RULES:
 * 1. Strips database IDs, full prose, reasons explanations, and notes.
 * 2. Deduplicates exact concept keys deterministically (preserves newest).
 * 3. Caps items to FEEDBACK_MEMORY_CONFIG.PROVIDER_PAYLOAD_CAP (15 items).
 * 4. Token-efficient: { k: conceptKey, r: reason, i: intent }.
 *
 * @param memory Rich internal feedback memory
 * @returns MuzaCompactFeedbackMemory
 */
export function buildCompactFeedbackMemory(
  memory: MuzaRecommendationFeedbackMemory
): MuzaCompactFeedbackMemory {
  const seenKeys = new Set<string>()
  const compactItems: MuzaCompactFeedbackItem[] = []

  for (const item of memory.recentFeedback) {
    if (!item.conceptKey) continue

    if (seenKeys.has(item.conceptKey)) continue
    seenKeys.add(item.conceptKey)

    compactItems.push({
      k: item.conceptKey,
      r: item.reason,
      i: item.intent,
    })

    if (compactItems.length >= FEEDBACK_MEMORY_CONFIG.PROVIDER_PAYLOAD_CAP) {
      break
    }
  }

  return compactItems
}
