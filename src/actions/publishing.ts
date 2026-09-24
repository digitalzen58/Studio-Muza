'use server'

import { revalidatePath } from 'next/cache'
import {
  getPublishingReadiness,
  publishContentImmediately,
} from '@/services/publishing/publish-content'
import type {
  PublishingDestinationPlatform,
  PublishingReadinessInfo,
  PublishContentImmediatelyResult,
} from '@/services/publishing/types'

/**
 * Server action to fetch available destinations and readiness info for immediate publishing.
 */
export async function getPublishingReadinessAction(
  contentId: string
): Promise<{ success: boolean; data?: PublishingReadinessInfo; error?: string }> {
  try {
    if (!contentId || typeof contentId !== 'string') {
      return { success: false, error: 'Identifiant de contenu manquant.' }
    }

    const result = await getPublishingReadiness(contentId)
    if ('error' in result) {
      return { success: false, error: result.error }
    }

    return { success: true, data: result }
  } catch (err) {
    console.error('Exception in getPublishingReadinessAction:', err)
    return {
      success: false,
      error: 'Erreur inattendue lors de la vérification de la publication.',
    }
  }
}

/**
 * Server action to publish content immediately to selected platforms.
 */
export async function publishContentImmediatelyAction(payload: {
  contentId: string
  targetPlatforms: PublishingDestinationPlatform[]
}): Promise<PublishContentImmediatelyResult> {
  try {
    const { contentId, targetPlatforms } = payload

    if (!contentId || typeof contentId !== 'string') {
      return {
        success: false,
        overallStatus: 'ALL_FAILED',
        contentId: '',
        destinations: [],
        message: 'Identifiant de contenu manquant.',
      }
    }

    if (!Array.isArray(targetPlatforms) || targetPlatforms.length === 0) {
      return {
        success: false,
        overallStatus: 'ALL_FAILED',
        contentId,
        destinations: [],
        message: 'Veuillez sélectionner au moins une destination de publication.',
      }
    }

    const result = await publishContentImmediately({
      contentId,
      targetPlatforms,
    })

    // Revalidate paths so UI and publication history are up to date
    revalidatePath('/app')
    revalidatePath('/app/calendar')
    revalidatePath(`/app/content/${contentId}`)

    return result
  } catch (err) {
    console.error('Exception in publishContentImmediatelyAction:', err)
    return {
      success: false,
      overallStatus: 'ALL_FAILED',
      contentId: payload?.contentId || '',
      destinations: [],
      message: 'Impossible de publier pour le moment. Votre contenu est conservé dans Mūza.',
    }
  }
}
