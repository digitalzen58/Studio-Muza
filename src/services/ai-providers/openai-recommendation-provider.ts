import { zodTextFormat } from 'openai/helpers/zod'
import { getOpenAIClient } from '@/lib/openai/server'
import { MUZA_AI_CONFIG } from '@/config/muza-ai'
import {
  muzaAIRecommendationBatchSchema,
  type MuzaAIRecommendationBatch,
} from '@/schemas/muza-ai-recommendation-schema'

/**
 * Server-only OpenAI recommendation provider.
 * Generates and validates transport-level Mūza recommendation batch using
 * OpenAI Responses API with Structured Outputs.
 *
 * @param input - Serialized context/prompt for recommendation generation
 * @param instructions - System instructions guiding recommendation generation
 * @returns Validated transport-level recommendation batch
 */
export async function generateOpenAIRecommendationBatch(
  input: string,
  instructions: string
): Promise<MuzaAIRecommendationBatch> {
  const client = getOpenAIClient()

  const response = await client.responses.parse({
    model: MUZA_AI_CONFIG.providers.openai.recommendationModel,
    instructions,
    input: [
      {
        role: 'user',
        content: input,
      },
    ],
    text: {
      format: zodTextFormat(
        muzaAIRecommendationBatchSchema,
        'muza_recommendation_batch'
      ),
    },
  })

  if (response.status !== 'completed') {
    throw new Error('Mūza OpenAI recommendation generation did not complete')
  }

  const parsed = response.output_parsed

  if (!parsed) {
    throw new Error(
      'Mūza OpenAI recommendation generation returned no parsed output'
    )
  }

  return parsed
}
