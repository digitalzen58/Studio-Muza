'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export interface CarouselSlideData {
  index: number
  type: string
  label: string
  text: string
  media_id: string | null
}

export interface SaveContentDraftPayload {
  contentId: string
  workingTitle: string
  hook: string | null
  caption: string | null
  cta: string | null
  slides?: CarouselSlideData[]
}

export type CreateOrGetDraftResult =
  | {
      success: true
      contentId: string
      isNew: boolean
    }
  | {
      success: false
      message: string
    }

export type SaveDraftResult =
  | {
      success: true
    }
  | {
      success: false
      message: string
    }

/**
 * Deterministically creates or retrieves a canonical draft content for a given recommendation.
 * Strictly 0 AI calls.
 */
export async function createOrGetContentDraftAction(
  recommendationId: string
): Promise<CreateOrGetDraftResult> {
  try {
    if (!recommendationId || typeof recommendationId !== 'string') {
      return {
        success: false,
        message: 'Identifiant de recommandation manquant ou invalide.',
      }
    }

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        message: 'Vous devez être connecté pour accéder à cette recommandation.',
      }
    }

    // Call atomic RPC
    const { data, error } = await supabase.rpc(
      'create_or_get_content_draft_from_recommendation',
      {
        p_recommendation_id: recommendationId,
      }
    )

    if (error) {
      console.error('Error invoking create_or_get_content_draft_from_recommendation:', error)
      return {
        success: false,
        message: error.message || 'Impossible d’initialiser le brouillon.',
      }
    }

    const rpcResult = data as { content_id: string; is_new: boolean }

    if (!rpcResult?.content_id) {
      return {
        success: false,
        message: 'Réponse invalide lors de l’initialisation du brouillon.',
      }
    }

    return {
      success: true,
      contentId: rpcResult.content_id,
      isNew: Boolean(rpcResult.is_new),
    }
  } catch (err) {
    console.error('Unexpected error in createOrGetContentDraftAction:', err)
    return {
      success: false,
      message: 'Une erreur imprévue est survenue.',
    }
  }
}

/**
 * Deterministically persists manual draft changes in Content Studio.
 * Strictly 0 AI calls.
 */
export async function saveContentDraftAction(
  payload: SaveContentDraftPayload
): Promise<SaveDraftResult> {
  try {
    if (!payload?.contentId) {
      return {
        success: false,
        message: 'Identifiant de contenu manquant.',
      }
    }

    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        message: 'Vous devez être connecté pour enregistrer ce brouillon.',
      }
    }

    const now = new Date().toISOString()

    // 1. Update canonical contents table (RLS enforced)
    const { error: contentUpdateError } = await supabase
      .from('contents')
      .update({
        topic: payload.workingTitle?.trim() || null,
        hook: payload.hook?.trim() || null,
        body: payload.caption?.trim() || null,
        cta: payload.cta?.trim() || null,
        updated_at: now,
      })
      .eq('id', payload.contentId)

    if (contentUpdateError) {
      console.error('Error updating content draft:', contentUpdateError)
      return {
        success: false,
        message: 'Erreur lors de l’enregistrement du contenu.',
      }
    }

    // 2. Update platform variants (RLS enforced)
    const variantUpdates: Record<string, unknown> = {
      title: payload.workingTitle?.trim() || null,
      caption: payload.caption?.trim() || null,
      cta: payload.cta?.trim() || null,
      updated_at: now,
    }

    if (payload.slides && Array.isArray(payload.slides)) {
      variantUpdates.metadata = {
        slides: payload.slides,
      }
    }

    const { error: variantUpdateError } = await supabase
      .from('content_variants')
      .update(variantUpdates)
      .eq('content_id', payload.contentId)

    if (variantUpdateError) {
      console.error('Error updating content variant draft:', variantUpdateError)
      return {
        success: false,
        message: 'Erreur lors de l’enregistrement des variantes du contenu.',
      }
    }

    revalidatePath(`/app/content/${payload.contentId}`)
    revalidatePath('/app')

    return {
      success: true,
    }
  } catch (err) {
    console.error('Unexpected error in saveContentDraftAction:', err)
    return {
      success: false,
      message: 'Une erreur imprévue est survenue lors de l’enregistrement.',
    }
  }
}
