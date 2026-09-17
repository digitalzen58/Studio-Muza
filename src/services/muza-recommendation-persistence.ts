import 'server-only'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import type { MuzaAIProvider } from '@/types/muza-ai-provider'
import type {
  MuzaRecommendationBatch,
  MuzaPersistedBatchResult,
} from '@/types/muza-recommendation-engine'

/**
 * Custom error thrown when recommendation batch persistence fails.
 */
export class MuzaRecommendationPersistenceError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message)
    this.name = 'MuzaRecommendationPersistenceError'
  }
}

/**
 * Zod schema validating the JSON response from public.save_recommendation_batch RPC.
 */
const saveRecommendationBatchResponseSchema = z.object({
  batch_id: z.string().uuid(),
  recommendation_ids: z.array(z.string().uuid()),
  recommendation_count: z.number().int().min(3).max(5),
})

export type PersistMuzaRecommendationBatchInput = {
  businessId: string
  batch: MuzaRecommendationBatch
  provider: MuzaAIProvider
  model: string
}

/**
 * Persists an already validated MuzaRecommendationBatch through the
 * public.save_recommendation_batch RPC.
 *
 * Operates strictly within the user's authenticated Supabase session.
 * Never uses service_role key or makes AI calls.
 *
 * @param input - Input containing trusted businessId, validated batch, provider, and model
 * @returns Promise<MuzaPersistedBatchResult>
 */
export async function persistMuzaRecommendationBatch({
  businessId,
  batch,
  provider,
  model,
}: PersistMuzaRecommendationBatchInput): Promise<MuzaPersistedBatchResult> {
  const pRecommendations = batch.recommendations.map((rec) => ({
    type: rec.type,
    title: rec.title,
    summary: rec.summary,
    priority: rec.priority,
    whyNow: rec.whyNow,
    reasons: rec.reasons,
    suggestedFormats: rec.suggestedFormats,
    estimatedEffortMinutes: rec.estimatedEffortMinutes,
    requiresCamera: rec.requiresCamera,
    requiresVoiceover: rec.requiresVoiceover,
    contentAngle: rec.contentAngle,
    callToAction: rec.callToAction,
  }))

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('save_recommendation_batch', {
    p_business_id: businessId,
    p_strategic_summary: batch.strategicSummary,
    p_provider: provider,
    p_model: model,
    p_generated_at: batch.generatedAt,
    p_recommendations: pRecommendations,
  })

  if (error) {
    throw new MuzaRecommendationPersistenceError(
      `Failed to persist recommendation batch: ${error.message}`,
      error
    )
  }

  const parseResult = saveRecommendationBatchResponseSchema.safeParse(data)

  if (!parseResult.success) {
    throw new MuzaRecommendationPersistenceError(
      'RPC save_recommendation_batch returned a malformed response shape',
      parseResult.error
    )
  }

  const { batch_id, recommendation_ids, recommendation_count } =
    parseResult.data

  if (recommendation_ids.length !== recommendation_count) {
    throw new MuzaRecommendationPersistenceError(
      `RPC response mismatch: recommendation_ids count (${recommendation_ids.length}) does not match recommendation_count (${recommendation_count})`
    )
  }

  return {
    batchId: batch_id,
    recommendationIds: recommendation_ids,
    recommendationCount: recommendation_count,
  }
}
