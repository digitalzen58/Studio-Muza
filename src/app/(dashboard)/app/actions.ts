'use server'

import { generateAndPersistMuzaRecommendations } from '@/services/muza-recommendation-orchestrator'
import { getMuzaContext } from '@/services/muza-context'
import {
  recordRecommendationFeedback,
  recordBatchRecommendationFeedback,
  type RecordFeedbackResult,
  type RecordBatchFeedbackResult,
} from '@/services/muza-recommendation-feedback'
import type { RecommendationFeedbackReason } from '@/types/muza-recommendation-feedback'
import type { MuzaPersistedRecommendationBatch } from '@/types/muza-recommendation-engine'

export type GenerateRecommendationsActionResult =
  | {
      success: true
      data: MuzaPersistedRecommendationBatch
    }
  | {
      success: false
      message: string
    }

export type RecordFeedbackActionResult =
  | {
      success: true
      data: RecordFeedbackResult
    }
  | {
      success: false
      message: string
    }

export type RecordBatchFeedbackActionResult =
  | {
      success: true
      data: RecordBatchFeedbackResult
    }
  | {
      success: false
      message: string
    }

/**
 * Server action to generate and persist Mūza recommendations for the authenticated user.
 * Wraps orchestration and returns a client-safe discriminated result.
 */
export async function generateRecommendationsAction(): Promise<GenerateRecommendationsActionResult> {
  try {
    const data = await generateAndPersistMuzaRecommendations()
    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error('Error in generateRecommendationsAction:', error)
    return {
      success: false,
      message:
        'Mūza n’a pas pu préparer vos recommandations pour le moment. Réessayez dans un instant.',
    }
  }
}

/**
 * Server action to record structured feedback on a single recommendation.
 * ZERO AI calls. Pure deterministic persistence.
 */
export async function recordRecommendationFeedbackAction(
  recommendationId: string,
  reason: RecommendationFeedbackReason,
  note?: string
): Promise<RecordFeedbackActionResult> {
  try {
    const context = await getMuzaContext()
    const data = await recordRecommendationFeedback({
      businessId: context.business.id,
      recommendationId,
      reason,
      note,
    })
    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error('Error in recordRecommendationFeedbackAction:', error)
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Mūza n’a pas pu enregistrer votre avis pour le moment.',
    }
  }
}

/**
 * Server action to record structured feedback on an entire batch ("Rien ne me convient").
 * ZERO AI calls. Pure deterministic persistence.
 */
export async function recordBatchFeedbackAction(
  recommendationIds: string[],
  reason: RecommendationFeedbackReason,
  note?: string
): Promise<RecordBatchFeedbackActionResult> {
  try {
    const context = await getMuzaContext()
    const data = await recordBatchRecommendationFeedback({
      businessId: context.business.id,
      recommendationIds,
      reason,
      note,
    })
    return {
      success: true,
      data,
    }
  } catch (error) {
    console.error('Error in recordBatchFeedbackAction:', error)
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : 'Mūza n’a pas pu enregistrer votre avis sur le lot.',
    }
  }
}
