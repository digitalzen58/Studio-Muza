import { z } from 'zod'
import { getGeminiClient } from '@/lib/gemini/server'
import { MUZA_AI_CONFIG } from '@/config/muza-ai'
import { withProviderTimeout } from '@/services/muza-provider-timeout'
import {
  hookSuggestionsSchema,
  singleTextSuggestionSchema,
} from './schemas'
import type {
  WritingOperation,
  WritingTargetType,
  WritingAssistanceUsage,
} from './types'

export interface PromptContextParams {
  businessName: string
  industry: string
  brandTone?: string | null
  audience?: string | null
  recommendationTitle?: string | null
  recommendationAngle?: string | null
  targetType: WritingTargetType
  targetIndex?: number
  slideLabel?: string | null
  hasStockMedia?: boolean
  currentText: string
  operation: WritingOperation
}

/**
 * Builds compact, strictly bounded system instructions for writing assistance.
 * Keeps input budget under 400-500 tokens.
 */
function buildSystemInstructions(params: PromptContextParams): string {
  const lines: string[] = [
    `Vous êtes l'assistant de rédaction Studio Mūza pour l'établissement "${params.businessName}" (${params.industry}).`,
  ]

  if (params.brandTone) {
    lines.push(`Ton de marque : ${params.brandTone}.`)
  }
  if (params.audience) {
    lines.push(`Audience cible : ${params.audience}.`)
  }
  if (params.recommendationTitle || params.recommendationAngle) {
    lines.push(`Sujet éditorial : ${params.recommendationTitle || ''} (${params.recommendationAngle || ''}).`)
  }

  lines.push(
    `RÈGLES D'OR ÉDITORIALES :`,
    `- Écrivez en français direct, élégant, chaleureux et naturel.`,
    `- N'inventez AUCUN fait, tarif, équipement luxueux, pourcentage, avis client ou récompense.`,
    `- Ne prétendez pas être le "meilleur" ou "numéro 1".`
  )

  if (params.hasStockMedia) {
    lines.push(
      `- ATTENTION VISUEL : La photo associée est une illustration d'ambiance (ex: paysage de saison). Ne la décrivez JAMAIS comme la chambre, le jardin ou la propriété réelle de l'établissement.`
    )
  }

  return lines.join('\n')
}

/**
 * Builds user turn input describing the exact requested operation and field target.
 */
function buildUserInput(params: PromptContextParams): string {
  let targetDescription = `Champ : ${params.targetType}`
  if (params.targetType === 'CAROUSEL_SLIDE') {
    targetDescription += ` (Slide #${params.targetIndex ?? 1}${params.slideLabel ? ` - ${params.slideLabel}` : ''})`
  }

  const lines = [targetDescription, `Opération : ${params.operation}`]

  if (params.currentText.trim()) {
    lines.push(`Texte actuel rédigé par l'utilisateur :\n"${params.currentText.trim()}"`)
  } else {
    lines.push(`Le champ est actuellement vide.`)
  }

  switch (params.operation) {
    case 'SUGGEST_HOOKS':
      lines.push(
        `Consigne : Proposez exactement 3 phrases d'accroche percutantes et adaptées au format Instagram / carrousel, captant l'attention sans sensationnalisme artificiel.`
      )
      break
    case 'HELP_WRITE':
      lines.push(
        `Consigne : Rédigez une proposition fluide et inspirante pour ce champ (environ 1 à 3 phrases concises), prête à être éditée par l'utilisateur.`
      )
      break
    case 'IMPROVE_TEXT':
      lines.push(
        `Consigne : Améliorez la clarté, le rythme et l'impact du texte ci-dessus en respectant scrupuleusement les faits et l'intention de l'utilisateur sans ajouter d'informations inventées.`
      )
      break
    case 'SHORTEN_TEXT':
      lines.push(
        `Consigne : Raccourcissez le texte ci-dessus pour le rendre plus percutant et facile à lire sur mobile, sans supprimer l'information essentielle.`
      )
      break
  }

  return lines.join('\n\n')
}

/**
 * Invokes Gemini Interactions API with strict structured JSON output and bounded timeout.
 * Zero automatic retries, zero background cascade.
 */
export async function generateGeminiWritingAssistance(
  params: PromptContextParams
): Promise<{
  options: string[]
  usage?: WritingAssistanceUsage
}> {
  const ai = getGeminiClient()
  const systemInstruction = buildSystemInstructions(params)
  const input = buildUserInput(params)

  const isHooks = params.operation === 'SUGGEST_HOOKS'
  const zodSchema = isHooks ? hookSuggestionsSchema : singleTextSuggestionSchema
  const jsonSchema = z.toJSONSchema(zodSchema) as Record<string, unknown>

  const startTime = Date.now()

  const interactionPromise = ai.interactions.create({
    model: MUZA_AI_CONFIG.providers.gemini.recommendationModel,
    system_instruction: systemInstruction,
    input,
    store: false,
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: jsonSchema,
    },
  })

  // 20-second bounded server-side timeout
  const interaction = await withProviderTimeout(interactionPromise, 20000)
  const latencyMs = Date.now() - startTime

  const rawOutput = interaction.output_text
  if (!rawOutput || rawOutput.trim() === '') {
    throw new Error('Gemini a retourné une réponse vide.')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(rawOutput)
  } catch {
    throw new Error('La réponse du modèle n’a pas pu être décodée au format JSON.')
  }

  const parseResult = zodSchema.safeParse(parsed)
  if (!parseResult.success) {
    throw new Error('La structure de la réponse générée ne correspond pas au format attendu.')
  }

  let options: string[] = []
  if (isHooks) {
    options = (parseResult.data as { hooks: string[] }).hooks
  } else {
    options = [(parseResult.data as { suggestedText: string }).suggestedText]
  }

  // Extract usage metadata if available from interaction response safely
  const rawInteraction = interaction as Record<string, unknown>
  const usageRecord = (rawInteraction.usage_metadata || rawInteraction.usage) as
    | Record<string, number>
    | undefined

  const usage: WritingAssistanceUsage = {
    provider: 'gemini',
    model: MUZA_AI_CONFIG.providers.gemini.recommendationModel,
    operation: params.operation,
    targetType: params.targetType,
    inputTokens: usageRecord?.prompt_token_count || usageRecord?.prompt_tokens,
    outputTokens: usageRecord?.candidates_token_count || usageRecord?.completion_tokens,
    totalTokens: usageRecord?.total_token_count || usageRecord?.total_tokens,
    latencyMs,
  }

  return {
    options,
    usage,
  }
}
