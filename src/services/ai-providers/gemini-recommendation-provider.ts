import 'server-only'

import { z } from 'zod'
import { getGeminiClient } from '@/lib/gemini/server'
import { MUZA_AI_CONFIG } from '@/config/muza-ai'
import {
  muzaAIRecommendationBatchSchema,
  type MuzaAIRecommendationBatch,
} from '@/schemas/muza-ai-recommendation-schema'

/**
 * Server-only Gemini recommendation provider.
 * Generates and validates transport-level Mūza recommendation batch using
 * Gemini Interactions API.
 *
 * @param input - Serialized context/prompt for recommendation generation
 * @param instructions - System instructions guiding recommendation generation
 * @returns Validated transport-level recommendation batch
 */
export async function generateGeminiRecommendationBatch(
  input: string,
  instructions: string
): Promise<MuzaAIRecommendationBatch> {
  const ai = getGeminiClient()

  const jsonSchema = z.toJSONSchema(muzaAIRecommendationBatchSchema) as Record<
    string,
    unknown
  >

  const interaction = await ai.interactions.create({
    model: MUZA_AI_CONFIG.providers.gemini.recommendationModel,
    system_instruction: instructions,
    input,
    store: false,
    response_format: {
      type: 'text',
      mime_type: 'application/json',
      schema: jsonSchema,
    },
  })

  const rawOutput = interaction.output_text

  if (!rawOutput || rawOutput.trim() === '') {
    throw new Error('Gemini returned an empty recommendation response')
  }

  let parsedJson: unknown
  try {
    parsedJson = JSON.parse(rawOutput)
  } catch {
    throw new Error(
      'Gemini returned malformed JSON in recommendation response'
    )
  }

  const parseResult =
    muzaAIRecommendationBatchSchema.safeParse(parsedJson)

  if (!parseResult.success) {
    throw new Error(
      'Gemini recommendation response failed schema validation'
    )
  }

  return parseResult.data
}
