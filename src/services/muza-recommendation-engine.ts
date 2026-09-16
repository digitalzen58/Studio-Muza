import 'server-only'

import { MUZA_AI_CONFIG } from '@/config/muza-ai'
import { getMuzaReasoningContext } from '@/services/muza-reasoning-context'
import { validateMuzaRecommendationBatch } from '@/services/muza-recommendation-validator'
import { assertMuzaRecommendationGrounding } from '@/services/muza-grounding-guard'
import { generateGeminiRecommendationBatch } from '@/services/ai-providers/gemini-recommendation-provider'
import { generateOpenAIRecommendationBatch } from '@/services/ai-providers/openai-recommendation-provider'
import type { MuzaAIProvider } from '@/types/muza-ai-provider'
import type { MuzaReasoningContext } from '@/types/muza-reasoning-context'
import type { MuzaRecommendationBatch } from '@/types/muza-recommendation-engine'
import type { MuzaAIRecommendationBatch } from '@/schemas/muza-ai-recommendation-schema'

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

STRICT GROUNDING & ANTI-FABRICATION RULES:
- "grounding.knownFacts" are the ONLY business-specific facts you may assert as factual reality.
- "grounding.unavailableEvidence" categories MUST NOT be presented as known, observed, or verified facts.
- If a recommendation depends on unavailable evidence, phrase the dependency conditionally (e.g. "si...", "à vérifier...", "si ces données confirment...").
- Industry playbook knowledge is strategic guidance, NOT proof that a fact or trend is true for this specific business or audience.
- Treat ONLY information explicitly present in the supplied reasoning context as established facts about the business.
- NEVER invent or assume business attributes (e.g. amenities, services, pricing, policies, location features, opening hours, availability, remaining booking dates, promotions, reviews, past performance, existing website content, social metrics).
- NEVER claim current external trends, live search demand, SEO volume, competitor activity, or audience behavior data as observed facts unless explicitly provided in context.
- Frame general marketing knowledge as strategic reasoning/hypotheses rather than current observed evidence (e.g. "Content around X addresses Y audience motivations" vs "People are actively searching for X right now").
- Suggestions may propose creating or highlighting features, but MUST NEVER state the business already possesses them unless confirmed in context (e.g. "If amenity X is offered, highlight it" vs "Showcase your X").
- NEVER claim real scarcity or availability unless availability data is explicitly present in context (e.g. "If slots remain for October, communicate them" vs "Book the last remaining October slots").
- "whyNow" MUST be grounded strictly in active business goals, declared timeframe/season, offer, audience, or strategy — NEVER manufacture external urgency or fake market data.
- Frame SEO suggestions as opportunities/hypotheses, not verified keyword volume.
- Preserve creativity: Propose creative angles, formats, experiments, and strategic ideas freely, but NEVER fabricate unverified FACTS.`

/**
 * Serializes the MuzaReasoningContext into a clean, deterministic input string for the model.
 * Contains strategic context, industry resolution, playbook, grounding context, and reasoning principles.
 *
 * @param reasoningContext - The reasoning context for the business
 * @returns Formatted JSON string input for AI provider
 */
function buildRecommendationInput(
  reasoningContext: MuzaReasoningContext
): string {
  return JSON.stringify(
    {
      strategicContext: reasoningContext.strategicContext,
      industryResolution: reasoningContext.industry.resolution,
      industryPlaybook: reasoningContext.industry.playbook,
      grounding: reasoningContext.grounding,
      reasoningPrinciples: reasoningContext.reasoningPrinciples,
    },
    null,
    2
  )
}

/**
 * Server-side AI recommendation engine for Mūza.
 * Assembles ReasoningContext, delegates to configured AI provider,
 * and validates the transport-level output against the domain business schema.
 *
 * @returns Promise<MuzaRecommendationBatch>
 */
export async function generateMuzaRecommendations(): Promise<MuzaRecommendationBatch> {
  const reasoningContext = await getMuzaReasoningContext()
  const inputPrompt = buildRecommendationInput(reasoningContext)

  const provider = MUZA_AI_CONFIG.recommendationProvider as MuzaAIProvider

  let transportBatch: MuzaAIRecommendationBatch

  switch (provider) {
    case 'gemini':
      transportBatch = await generateGeminiRecommendationBatch(
        inputPrompt,
        MUZA_RECOMMENDATION_INSTRUCTIONS
      )
      break
    case 'openai':
      transportBatch = await generateOpenAIRecommendationBatch(
        inputPrompt,
        MUZA_RECOMMENDATION_INSTRUCTIONS
      )
      break
    default: {
      const exhaustiveCheck: never = provider
      throw new Error(
        `Unsupported AI recommendation provider: ${exhaustiveCheck}`
      )
    }
  }

  assertMuzaRecommendationGrounding(
    transportBatch,
    reasoningContext.grounding
  )

  const businessBatch = {
    ...transportBatch,
    generatedAt: new Date().toISOString(),
  }

  return validateMuzaRecommendationBatch(businessBatch)
}
