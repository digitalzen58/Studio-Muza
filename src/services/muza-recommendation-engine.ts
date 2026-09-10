import 'server-only'

import { zodTextFormat } from 'openai/helpers/zod'
import { getOpenAIClient } from '@/lib/openai/server'
import { MUZA_AI_CONFIG } from '@/config/muza-ai'
import { muzaOpenAIRecommendationBatchSchema } from '@/schemas/muza-openai-recommendation-schema'
import { getMuzaReasoningContext } from '@/services/muza-reasoning-context'
import { validateMuzaRecommendationBatch } from '@/services/muza-recommendation-validator'
import type { MuzaReasoningContext } from '@/types/muza-reasoning-context'
import type { MuzaRecommendationBatch } from '@/types/muza-recommendation-engine'

/**
 * System instructions guiding Mūza's AI recommendation engine.
 * Defines the persona, constraints, strategic priorities, and behavioral principles.
 */
const MUZA_RECOMMENDATION_INSTRUCTIONS = `You are Mūza, an expert visibility and content strategist for small businesses, independent creators, and local entrepreneurs.

Your mission is to generate a strategic batch of tailored recommendations based strictly on the provided business context, industry playbook, and reasoning principles.

STRICT GUIDELINES:
1. Generate between 3 and 5 high-impact, actionable recommendations.
2. Prioritize recommendations that align directly with the active business objective and goals.
3. Respect creator capacity (weekly available minutes), camera comfort level, and format preferences.
4. Leverage the provided industry playbook insights (decision factors, trust drivers, conversion actions, content pillars).
5. Align recommendations with the brand positioning, promise, personality, and tone.
6. Prioritize customer relevance and decision triggers over generic social media trends.
7. Avoid proposing repetitive content angles or duplicate formats.
8. Provide realistic, executable recommendations with concrete call-to-actions.
9. Explain clearly in "whyNow" and "reasons" why each recommendation is relevant right now.
10. Integrate active offer details only when commercially relevant to the active goal.
11. Balance visibility, trust, conversion, and engagement metrics across the recommendation batch.
12. NEVER invent business facts, performance metrics, web search findings, or trend data that are not explicitly provided in the context.
13. Set "generatedAt" to a valid current ISO 8601 timestamp string (e.g. YYYY-MM-DDTHH:mm:ss.sssZ).`

/**
 * Serializes the MuzaReasoningContext into a clean, deterministic input string for the model.
 * Contains only strategic context, industry resolution, playbook, and reasoning principles.
 *
 * @param reasoningContext - The reasoning context for the business
 * @returns Formatted JSON string input for OpenAI
 */
function buildRecommendationInput(
  reasoningContext: MuzaReasoningContext
): string {
  return JSON.stringify(
    {
      strategicContext: reasoningContext.strategicContext,
      industryResolution: reasoningContext.industry.resolution,
      industryPlaybook: reasoningContext.industry.playbook,
      reasoningPrinciples: reasoningContext.reasoningPrinciples,
    },
    null,
    2
  )
}

/**
 * Server-side AI recommendation engine for Mūza.
 * Assembles ReasoningContext, invokes OpenAI Responses API with Structured Outputs,
 * and validates the output against the domain schema.
 *
 * @returns Promise<MuzaRecommendationBatch>
 */
export async function generateMuzaRecommendations(): Promise<MuzaRecommendationBatch> {
  const reasoningContext = await getMuzaReasoningContext()
  const client = getOpenAIClient()

  const inputPrompt = buildRecommendationInput(reasoningContext)

  const response = await client.responses.parse({
    model: MUZA_AI_CONFIG.recommendationModel,
    instructions: MUZA_RECOMMENDATION_INSTRUCTIONS,
    input: [
      {
        role: 'user',
        content: inputPrompt,
      },
    ],
    text: {
      format: zodTextFormat(
        muzaOpenAIRecommendationBatchSchema,
        'muza_recommendation_batch'
      ),
    },
  })

  if (response.status !== 'completed') {
    throw new Error('Mūza recommendation generation did not complete')
  }

  const parsed = response.output_parsed

  if (!parsed) {
    throw new Error('Mūza recommendation generation returned no parsed output')
  }

  return validateMuzaRecommendationBatch(parsed)
}
