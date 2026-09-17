import 'server-only'

import { MUZA_AI_CONFIG } from '@/config/muza-ai'
import { getMuzaContext } from '@/services/muza-context'
import { generateMuzaRecommendations } from '@/services/muza-recommendation-engine'
import { persistMuzaRecommendationBatch } from '@/services/muza-recommendation-persistence'
import type { MuzaAIProvider } from '@/types/muza-ai-provider'
import type { MuzaPersistedRecommendationBatch } from '@/types/muza-recommendation-engine'

/**
 * Top-level orchestration service for generating and persisting Mūza recommendations.
 *
 * 1. Resolves trusted authenticated business identity from server context.
 * 2. Generates and validates complete recommendation batch via recommendation engine.
 * 3. Persists batch to database via public.save_recommendation_batch RPC.
 *
 * Persistence occurs ONLY after AI generation, schema validation, and grounding guard pass.
 * If generation fails, persistence is never invoked.
 * If persistence fails, throws error without returning unpersisted result.
 *
 * @returns Promise<MuzaPersistedRecommendationBatch>
 */
export async function generateAndPersistMuzaRecommendations(): Promise<MuzaPersistedRecommendationBatch> {
  const context = await getMuzaContext()
  const businessId = context.business.id

  const batch = await generateMuzaRecommendations()

  const provider = MUZA_AI_CONFIG.recommendationProvider as MuzaAIProvider
  const model = MUZA_AI_CONFIG.providers[provider].recommendationModel

  const persistence = await persistMuzaRecommendationBatch({
    businessId,
    batch,
    provider,
    model,
  })

  return {
    batch,
    persistence,
    provider,
    model,
  }
}
