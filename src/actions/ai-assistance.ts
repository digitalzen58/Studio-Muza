'use server'

import crypto from 'node:crypto'
import { createClient } from '@/lib/supabase/server'
import { getMuzaStrategicContext } from '@/services/muza-strategic-context'
import { generateGeminiWritingAssistance } from '@/services/ai-assistance/gemini-writing-provider'
import { validateWritingAssistanceGrounding } from '@/services/ai-assistance/writing-grounding-guard'
import type {
  WritingAssistanceRequestPayload,
  WritingAssistanceResult,
  WritingOperation,
  WritingTargetType,
} from '@/services/ai-assistance/types'

const MAX_CURRENT_TEXT_LENGTH = 2000

function computeTextHash(text: string): string {
  const hasher = crypto.createHash('sha256')
  hasher.write(text.trim())
  hasher.end()
  return (hasher.read() as Buffer).toString('hex').slice(0, 12)
}

/**
 * Validates allowed operation/target combinations per Step 151 rules.
 */
function validateOperationAndTarget(
  operation: WritingOperation,
  targetType: WritingTargetType,
  targetIndex?: number,
  currentText?: string
): { isValid: boolean; message?: string } {
  // 1. Target and Operation matrix
  if (targetType === 'HOOK') {
    if (operation !== 'SUGGEST_HOOKS') {
      return {
        isValid: false,
        message: 'Seule l’opération "Proposer des accroches" est autorisée sur l’accroche.',
      }
    }
  } else if (targetType === 'CAROUSEL_SLIDE' || targetType === 'CAPTION') {
    if (operation === 'SUGGEST_HOOKS') {
      return {
        isValid: false,
        message: 'L’opération "Proposer des accroches" ne peut pas être appliquée sur ce champ.',
      }
    }
    if (!['HELP_WRITE', 'IMPROVE_TEXT', 'SHORTEN_TEXT'].includes(operation)) {
      return {
        isValid: false,
        message: `Opération non supportée (${operation}) pour ${targetType}.`,
      }
    }
  } else {
    return {
      isValid: false,
      message: `Type de champ cible non supporté (${targetType}).`,
    }
  }

  // 2. Slide Index validation
  if (targetType === 'CAROUSEL_SLIDE') {
    if (typeof targetIndex !== 'number' || targetIndex < 1) {
      return {
        isValid: false,
        message: 'L’index de slide cible est manquant ou invalide.',
      }
    }
  }

  // 3. Current text presence requirements
  const trimmed = currentText ? currentText.trim() : ''
  if ((operation === 'IMPROVE_TEXT' || operation === 'SHORTEN_TEXT') && !trimmed) {
    return {
      isValid: false,
      message: 'Impossible d’améliorer ou de raccourcir un texte vide.',
    }
  }

  return { isValid: true }
}

/**
 * Server Action to request strictly optional, contextual AI writing assistance.
 * - Authenticates caller and verifies business ownership (fail-closed RLS).
 * - Derives all business/brand/grounding context server-side.
 * - Makes exactly ONE bounded Gemini call (no retries, no OpenAI fallback).
 * - Runs deterministic writing grounding checks.
 * - Makes ZERO database writes.
 */
export async function requestWritingAssistanceAction(
  payload: WritingAssistanceRequestPayload
): Promise<WritingAssistanceResult> {
  const { contentId, operation, targetType, targetIndex, currentText } = payload
  const originalTextHash = computeTextHash(currentText || '')

  try {
    const supabase = await createClient()

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        operation,
        targetType,
        targetIndex,
        originalTextHash,
        message: 'Vous devez être connecté pour demander une assistance d’écriture.',
      }
    }

    // 2. Load Content and verify business access (fail-closed via RLS)
    if (!contentId || typeof contentId !== 'string') {
      return {
        success: false,
        operation,
        targetType,
        targetIndex,
        originalTextHash,
        message: 'Identifiant de contenu manquant.',
      }
    }

    const { data: content, error: contentError } = await supabase
      .from('contents')
      .select('id, business_id, recommendation_id')
      .eq('id', contentId)
      .maybeSingle()

    if (contentError || !content) {
      return {
        success: false,
        operation,
        targetType,
        targetIndex,
        originalTextHash,
        message: 'Contenu introuvable ou accès non autorisé.',
      }
    }

    // 3. Validate operation, target, and input bounds
    if (typeof currentText === 'string' && currentText.length > MAX_CURRENT_TEXT_LENGTH) {
      return {
        success: false,
        operation,
        targetType,
        targetIndex,
        originalTextHash,
        message: `Le texte actuel dépasse la longueur maximale autorisée (${MAX_CURRENT_TEXT_LENGTH} caractères).`,
      }
    }

    const validation = validateOperationAndTarget(
      operation,
      targetType,
      targetIndex,
      currentText
    )

    if (!validation.isValid) {
      return {
        success: false,
        operation,
        targetType,
        targetIndex,
        originalTextHash,
        message: validation.message || 'Requête d’assistance invalide.',
      }
    }

    // 4. Load trusted strategic context server-side
    const strategicContext = await getMuzaStrategicContext()
    if (strategicContext.business.id !== content.business_id) {
      return {
        success: false,
        operation,
        targetType,
        targetIndex,
        originalTextHash,
        message: 'Contexte d’entreprise invalide ou non autorisé.',
      }
    }

    // 5. Load linked recommendation title/angle if present
    let recommendationTitle: string | null = null
    let recommendationAngle: string | null = null

    if (content.recommendation_id) {
      const { data: rec } = await supabase
        .from('recommendations')
        .select('title, angle')
        .eq('id', content.recommendation_id)
        .maybeSingle()

      if (rec) {
        recommendationTitle = rec.title
        recommendationAngle = rec.angle
      }
    }

    // 6. Server-side check for stock media on target slide
    let hasStockMedia = false
    let slideLabel: string | null = payload.slideContext?.label || null

    if (targetType === 'CAROUSEL_SLIDE' && targetIndex) {
      const { data: variant } = await supabase
        .from('content_variants')
        .select('metadata')
        .eq('content_id', contentId)
        .limit(1)
        .maybeSingle()

      const slides = (variant?.metadata as { carousel_slides?: Array<{ index: number; label?: string; media_id?: string | null }> })?.carousel_slides
      const slide = slides?.find((s) => s.index === targetIndex)

      if (slide?.label) {
        slideLabel = slide.label
      }

      if (slide?.media_id) {
        const { data: mediaRow } = await supabase
          .from('media_assets')
          .select('source')
          .eq('id', slide.media_id)
          .maybeSingle()

        if (mediaRow?.source === 'STOCK_PEXELS') {
          hasStockMedia = true
        }
      }
    }

    // Fallback: honor client flag if declared
    if (payload.slideContext?.hasStockMedia) {
      hasStockMedia = true
    }

    // 7. Perform exactly ONE Gemini writing call with bounded timeout
    const providerResult = await generateGeminiWritingAssistance({
      businessName: strategicContext.business.name,
      industry: strategicContext.business.industry,
      brandTone: strategicContext.brand.personality.join(', ') || null,
      audience: strategicContext.audience.name || strategicContext.audience.description || null,
      recommendationTitle,
      recommendationAngle,
      targetType,
      targetIndex,
      slideLabel,
      hasStockMedia,
      currentText: currentText || '',
      operation,
    })

    // 8. Deterministic writing grounding guard validation
    for (const option of providerResult.options) {
      const grounding = validateWritingAssistanceGrounding(option, {
        operation,
        currentText: currentText || '',
        hasStockMedia,
        businessName: strategicContext.business.name,
      })

      if (!grounding.isValid) {
        return {
          success: false,
          operation,
          targetType,
          targetIndex,
          originalTextHash,
          message:
            grounding.reason ||
            'La suggestion comportait des éléments non vérifiés et n’a pas été appliquée. Votre texte est resté intact.',
        }
      }
    }

    // 9. Return transient suggestions (0 DB writes)
    return {
      success: true,
      operation,
      targetType,
      targetIndex,
      originalTextHash,
      options: providerResult.options,
      usage: providerResult.usage,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error('Writing assistance error:', errorMsg)

    if (errorMsg.includes('timed out')) {
      return {
        success: false,
        operation,
        targetType,
        targetIndex,
        originalTextHash,
        message: 'Le délai d’attente a été dépassé (20s). Votre texte est resté intact.',
      }
    }

    return {
      success: false,
      operation,
      targetType,
      targetIndex,
      originalTextHash,
      message: 'Mūza n’a pas réussi à préparer une suggestion. Votre texte n’a pas été modifié.',
    }
  }
}
