'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ensureInitialWorkspace } from '@/services/workspace'
import { getActiveWorkspaceBusiness } from '@/services/business'

import { validateVisualComposition } from '@/services/visual-composition/validation'
import type { VisualComposition } from '@/services/visual-composition/types'
import { validatePhone, validateUrl } from '@/services/business-contact'

export interface CarouselSlideData {
  index: number
  type?: string
  label?: string
  text: string
  media_id: string | null
}

export type ContentActionType = 'NONE' | 'PHONE' | 'BOOKING' | 'APPOINTMENT'

export interface ContentActionPayload {
  type: ContentActionType
  destination?: string | null
  is_override?: boolean
}

export interface SaveContentDraftPayload {
  contentId: string
  workingTitle: string
  hook?: string | null
  caption?: string | null
  cta?: string | null
  slides?: CarouselSlideData[]
  primaryMediaId?: string | null
  visualComposition?: VisualComposition | null
  action?: ContentActionPayload | null
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

export type CreateManualDraftResult =
  | {
      success: true
      contentId: string
    }
  | {
      success: false
      message: string
    }

export type DeleteDraftResult =
  | {
      success: true
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
 * Deterministically deletes a draft content and cascades to variants and relations.
 * Strictly enforces business RLS ownership server-side.
 * Does NOT delete media_assets from the business asset library.
 */
export async function deleteContentDraftAction(
  contentId: string
): Promise<DeleteDraftResult> {
  try {
    if (!contentId || typeof contentId !== 'string') {
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
        message: 'Vous devez être connecté pour supprimer ce brouillon.',
      }
    }

    // 1. Verify content exists and belongs to a business the user has access to
    const { data: content, error: fetchError } = await supabase
      .from('contents')
      .select('id, business_id, status')
      .eq('id', contentId)
      .single()

    if (fetchError || !content) {
      return {
        success: false,
        message: 'Brouillon introuvable ou accès non autorisé.',
      }
    }

    // 2. Delete the canonical content row (Postgres ON DELETE CASCADE cleans related variants and media links)
    const { error: deleteError } = await supabase
      .from('contents')
      .delete()
      .eq('id', contentId)

    if (deleteError) {
      console.error('Error deleting content draft:', deleteError)
      return {
        success: false,
        message: 'Impossible de supprimer ce brouillon.',
      }
    }

    revalidatePath('/app')
    revalidatePath('/app/calendar')
    revalidatePath(`/app/content/${contentId}`)

    return {
      success: true,
    }
  } catch (err) {
    console.error('Unexpected error in deleteContentDraftAction:', err)
    return {
      success: false,
      message: 'Une erreur imprévue est survenue lors de la suppression.',
    }
  }
}

/**
 * Deterministically creates a new manual draft content without recommendation.
 * Strictly 0 AI calls.
 */
export async function createManualContentDraftAction(
  format: 'POST' | 'CAROUSEL'
): Promise<CreateManualDraftResult> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        message: 'Vous devez être connecté pour créer un contenu.',
      }
    }

    const { data: workspace } = await ensureInitialWorkspace()
    if (!workspace?.workspace_id) {
      return {
        success: false,
        message: 'Espace de travail introuvable.',
      }
    }

    const { business } = await getActiveWorkspaceBusiness(workspace.workspace_id)
    if (!business?.id) {
      return {
        success: false,
        message: 'Entreprise introuvable.',
      }
    }

    const initialTopic = format === 'CAROUSEL' ? 'Nouveau carrousel' : 'Nouvelle publication'

    // 1. Create canonical contents row (conforming strictly to contents schema)
    const { data: content, error: contentError } = await supabase
      .from('contents')
      .insert({
        business_id: business.id,
        recommendation_id: null,
        content_type: 'SOCIAL',
        topic: initialTopic,
        status: 'DRAFT',
      })
      .select('id')
      .single()

    if (contentError || !content) {
      console.error('Error creating manual content draft:', contentError)
      return {
        success: false,
        message: contentError?.message || 'Impossible de créer le brouillon.',
      }
    }

    // 2. Create initial variant
    const initialSlides =
      format === 'CAROUSEL'
        ? [
            { index: 1, type: 'COVER', label: 'Couverture', text: '', media_id: null },
            { index: 2, type: 'STORY_1', label: 'Page 2', text: '', media_id: null },
            { index: 3, type: 'STORY_2', label: 'Page 3', text: '', media_id: null },
            { index: 4, type: 'STORY_3', label: 'Page 4', text: '', media_id: null },
            { index: 5, type: 'CTA', label: 'Page 5 • Fin', text: '', media_id: null },
          ]
        : []

    const { error: variantError } = await supabase.from('content_variants').insert({
      content_id: content.id,
      platform: 'INSTAGRAM',
      format: format,
      title: initialTopic,
      metadata: format === 'CAROUSEL' ? { slides: initialSlides } : {},
      status: 'DRAFT',
    })

    if (variantError) {
      console.error('Error creating manual variant:', variantError)
      return {
        success: false,
        message: variantError.message || 'Impossible de créer la variante de contenu.',
      }
    }

    revalidatePath('/app')
    revalidatePath(`/app/content/${content.id}`)

    return {
      success: true,
      contentId: content.id,
    }
  } catch (err) {
    console.error('Unexpected error in createManualContentDraftAction:', err)
    return {
      success: false,
      message: 'Une erreur imprévue est survenue.',
    }
  }
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

    // 2. Validate visual composition if provided
    let sanitizedVisualComposition: VisualComposition | null = null
    if (payload.visualComposition) {
      const validation = validateVisualComposition(payload.visualComposition)
      if (!validation.valid) {
        return {
          success: false,
          message: validation.error || 'Composition visuelle invalide.',
        }
      }
      sanitizedVisualComposition = validation.sanitized || null
    }

    // 2b. Validate action intent & destination if provided
    let sanitizedAction: ContentActionPayload | null = null
    if (payload.action && payload.action.type !== 'NONE') {
      const actType = payload.action.type
      const dest = payload.action.destination?.trim() || null
      if (actType === 'PHONE') {
        if (dest) {
          const pVal = validatePhone(dest)
          if (!pVal.valid) {
            return { success: false, message: pVal.error || 'Numéro de téléphone invalide.' }
          }
        }
      } else if (actType === 'BOOKING' || actType === 'APPOINTMENT') {
        if (dest) {
          const uVal = validateUrl(dest)
          if (!uVal.valid) {
            return { success: false, message: uVal.error || 'Lien invalide.' }
          }
        }
      }
      sanitizedAction = {
        type: actType,
        destination: dest,
        is_override: Boolean(payload.action.is_override),
      }
    } else if (payload.action && payload.action.type === 'NONE') {
      sanitizedAction = { type: 'NONE', destination: null, is_override: false }
    }

    // 3. Update platform variants (RLS enforced)
    const variantMetadata: Record<string, unknown> = {
      ...(payload.slides && Array.isArray(payload.slides) && payload.slides.length > 0
        ? { slides: payload.slides }
        : sanitizedVisualComposition
        ? {
            visual_composition: sanitizedVisualComposition,
            primary_media_id:
              sanitizedVisualComposition.background.type === 'IMAGE'
                ? sanitizedVisualComposition.background.mediaAssetId
                : null,
          }
        : payload.primaryMediaId !== undefined
        ? { primary_media_id: payload.primaryMediaId }
        : {}),
      ...(sanitizedAction ? { action: sanitizedAction } : {}),
    }

    const variantUpdates: Record<string, unknown> = {
      title: payload.workingTitle?.trim() || null,
      caption: payload.caption?.trim() || null,
      cta: payload.cta?.trim() || null,
      metadata: variantMetadata,
      updated_at: now,
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

    // 4. Synchronize canonical content_media assignments (RLS enforced)
    await supabase
      .from('content_media')
      .delete()
      .eq('content_id', payload.contentId)

    const effectivePrimaryMediaId =
      sanitizedVisualComposition?.background.type === 'IMAGE'
        ? sanitizedVisualComposition.background.mediaAssetId
        : payload.primaryMediaId

    if (payload.slides && Array.isArray(payload.slides) && payload.slides.length > 0) {
      const mediaAssignments = payload.slides
        .filter((s) => Boolean(s.media_id))
        .map((s) => ({
          content_id: payload.contentId,
          media_asset_id: s.media_id as string,
          position: s.index,
          usage_type: 'CAROUSEL_SLIDE',
        }))

      const uniqueAssignments = Array.from(
        new Map(mediaAssignments.map((a) => [a.media_asset_id, a])).values()
      )

      if (uniqueAssignments.length > 0) {
        const { error: mediaInsertError } = await supabase
          .from('content_media')
          .insert(uniqueAssignments)

        if (mediaInsertError) {
          console.error('Error inserting canonical content_media:', mediaInsertError.message)
        }
      }
    } else if (effectivePrimaryMediaId) {
      const { error: mediaInsertError } = await supabase
        .from('content_media')
        .insert({
          content_id: payload.contentId,
          media_asset_id: effectivePrimaryMediaId,
          position: 0,
          usage_type: 'PRIMARY_IMAGE',
        })

      if (mediaInsertError) {
        console.error('Error inserting primary content_media:', mediaInsertError.message)
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
