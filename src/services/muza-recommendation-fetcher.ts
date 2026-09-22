import { createClient } from '@/lib/supabase/server'
import { getMuzaContext } from '@/services/muza-context'
import {
  loadBusinessMediaInventory,
  enrichMuzaRecommendationsWithMediaAssets,
} from '@/services/muza-media-intelligence'
import { resolveMuzaBusinessModel } from '@/services/muza-industry-resolver'
import { getBaseIndustryPlaybook } from '@/config/muza-industry-playbooks'
import type { MuzaAIProvider } from '@/types/muza-ai-provider'
import type {
  MuzaRecommendation,
  MuzaPersistedRecommendationBatch,
  RecommendationType,
  RecommendationPriority,
  RecommendationFormat,
  MuzaRecommendationReason,
} from '@/types/muza-recommendation-engine'

/**
 * Server-only service to fetch the latest persisted recommendation batch
 * for the authenticated user's active business.
 *
 * Recomputes runtime media guidance deterministically against the CURRENT media inventory.
 * Loads inventory ONCE per batch (no N+1 queries, zero AI calls).
 *
 * @returns Promise<MuzaPersistedRecommendationBatch | null>
 */
export async function getLatestRecommendationBatchForActiveBusiness(): Promise<MuzaPersistedRecommendationBatch | null> {
  try {
    const context = await getMuzaContext()
    const businessId = context.business.id

    const supabase = await createClient()

    // 1. Fetch latest recommendation batch for this business
    const { data: batchRow, error: batchError } = await supabase
      .from('recommendation_batches')
      .select('id, strategic_summary, provider, model, generated_at, created_at')
      .eq('business_id', businessId)
      .order('generated_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (batchError) {
      console.error('Error fetching recommendation batch:', batchError.message)
      return null
    }

    if (!batchRow) {
      return null
    }

    // 2. Fetch child recommendations for this batch
    const { data: recommendationRows, error: recError } = await supabase
      .from('recommendations')
      .select(
        'id, recommendation_type, title, concept, priority, why_now, reasons, suggested_formats, estimated_effort_minutes, camera_required, requires_voiceover, angle, cta, editorial_topic, editorial_angle, concept_key, novelty_reason, status, created_at'
      )
      .eq('batch_id', batchRow.id)
      .order('created_at', { ascending: true })

    if (recError) {
      console.error('Error fetching child recommendations:', recError.message)
      return null
    }

    const recommendations: MuzaRecommendation[] = (recommendationRows || []).map(
      (row) => ({
        type: row.recommendation_type as RecommendationType,
        title: row.title,
        summary: row.concept || '',
        priority: row.priority as RecommendationPriority,
        whyNow: row.why_now || '',
        reasons: (Array.isArray(row.reasons)
          ? row.reasons
          : []) as MuzaRecommendationReason[],
        suggestedFormats: (Array.isArray(row.suggested_formats)
          ? row.suggested_formats
          : []) as RecommendationFormat[],
        objective: null,
        audience: null,
        offer: null,
        estimatedEffortMinutes: row.estimated_effort_minutes,
        requiresCamera: row.camera_required,
        requiresVoiceover: row.requires_voiceover,
        contentAngle: row.angle,
        callToAction: row.cta,
        editorialTopic: row.editorial_topic || row.title,
        editorialAngle: row.editorial_angle || row.angle || '',
        conceptKey: row.concept_key || '',
        noveltyReason: row.novelty_reason || null,
        status: row.status || 'PROPOSED',
      })
    )

    // 3. Runtime Media Enrichment: Recompute asset readiness against CURRENT media inventory
    // Loaded once per batch. No N+1 queries. Zero AI calls.
    const mediaInventory = await loadBusinessMediaInventory(businessId)
    const resolution = resolveMuzaBusinessModel(
      context.business.industry,
      context.business.subindustry
    )
    const playbook = getBaseIndustryPlaybook(resolution.businessModel)

    const enrichedRecommendations = enrichMuzaRecommendationsWithMediaAssets(
      recommendations,
      mediaInventory,
      playbook
    )

    const recommendationIds = (recommendationRows || []).map((row) => row.id)

    return {
      batch: {
        recommendations: enrichedRecommendations,
        strategicSummary: batchRow.strategic_summary,
        generatedAt: batchRow.generated_at,
      },
      persistence: {
        batchId: batchRow.id,
        recommendationIds,
        recommendationCount: enrichedRecommendations.length,
      },
      provider: batchRow.provider as MuzaAIProvider,
      model: batchRow.model,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Error in getLatestRecommendationBatchForActiveBusiness:', message)
    return null
  }
}
