import { MUZA_AI_CONFIG } from '@/config/muza-ai'
import { getMuzaReasoningContext } from '@/services/muza-reasoning-context'
import { validateMuzaRecommendationBatch } from '@/services/muza-recommendation-validator'
import { assertMuzaRecommendationGrounding } from '@/services/muza-grounding-guard'
import { assertMuzaRecommendationDiversity } from '@/services/muza-recommendation-diversity'
import { generateGeminiRecommendationBatch } from '@/services/ai-providers/gemini-recommendation-provider'
import { generateOpenAIRecommendationBatch } from '@/services/ai-providers/openai-recommendation-provider'
import { buildEditorialConceptKey } from '@/services/muza-editorial-concept'
import { buildCompactEditorialMemory } from '@/services/muza-editorial-history'
import { buildCompactFeedbackMemory } from '@/services/muza-recommendation-feedback'
import {
  loadBusinessMediaInventory,
  enrichMuzaRecommendationsWithMediaAssets,
} from '@/services/muza-media-intelligence'
import type { MuzaAIProvider } from '@/types/muza-ai-provider'
import type { MuzaReasoningContext } from '@/types/muza-reasoning-context'
import type { MuzaRecommendationBatch } from '@/types/muza-recommendation-engine'
import type { MuzaAIRecommendationBatch } from '@/schemas/muza-ai-recommendation-schema'

/**
 * System instructions guiding Mūza's AI recommendation engine.
 * Defines persona, strategic guidelines, grounding constraints, anti-repetition rules, smart reuse,
 * same-batch diversity, and structured feedback memory semantics.
 */
export const MUZA_RECOMMENDATION_INSTRUCTIONS = `You are Mūza, an expert visibility and content strategist for small businesses, independent creators, and local entrepreneurs.

Your mission is to generate a strategic batch of 3 to 5 tailored recommendations based strictly on the provided business context, industry playbook, reasoning principles, compact editorial memory, and compact feedback memory.

STRICT BATCH & REASONING RULES:
1. Generate between 3 and 5 high-impact, actionable recommendations per batch.
2. Ensure ALL recommendations within the SAME batch are editorially distinct from each other (different underlying topics or angles, NOT merely different social formats).
3. Prioritize recommendations that align directly with the active business objective and goals.
4. Respect creator capacity (weekly available minutes), camera comfort level, and format preferences.
5. Leverage industry playbook insights (decision factors, trust drivers, conversion actions, content pillars).
6. Align recommendations with brand positioning, promise, personality, and tone.
7. Explain clearly in "whyNow" and "reasons" why each recommendation is relevant right now.
8. For each recommendation, supply a concise "editorialTopic" (core subject/theme) and "editorialAngle" (creative stance or story perspective).

EDITORIAL NOVELTY & SMART REUSE RULES ("Mūza ne propose jamais deux fois la même idée sans raison"):
9. DUPLICATE DEFINITION: A recommendation is a duplicate if it shares the same underlying topic AND the same/equivalent angle as a recent or rejected concept. Changing format alone (e.g. Post vs Reel vs Carousel) is NOT sufficient for novelty.
10. REJECTED CONCEPTS ("editorialMemory.rejectedConcepts"): Strongly avoid reintroducing rejected concepts with mere rewordings. A rejected concept may only be revisited if the angle or context has materially changed.
11. PUBLISHED CONCEPTS ("editorialMemory.publishedConcepts"): Prior published concepts demonstrate prior usage. Avoid immediate repetition, but revisit intelligently when justified by a new angle, season, or goal. Publication does not imply performance proof.
12. SMART REUSE & NOVELTY REASON:
    - Genuinely new concept (no relevant historical link): set "noveltyReason": null.
    - Smart reuse of a known topic: permitted ONLY when justified by a materially new angle, objective, offer, audience, or season. Briefly explain the justification in "noveltyReason" (e.g. "Nouvel angle saisonnier sur un thème déjà abordé"). Never fabricate performance claims in noveltyReason.

STRUCTURED FEEDBACK MEMORY RULES ("feedbackMemory"):
13. "IDEA_REJECTION": The underlying idea was explicitly rejected by the user. Avoid repeating this topic/angle during the active window.
14. "REPETITION": Saturated or already treated. Strongly avoid this recent concept during its active window.
15. "FORMAT_PREFERENCE": The concept remains valid. Suggest alternate execution or formats (e.g. Carousel/Post instead of Reel).
16. "EXECUTION_CONSTRAINT": The concept remains valid. Prefer simpler execution compatible with creator constraints and existing media assets.
17. "TIMING": Unfavorable timing this week. Avoid proposing as an immediate recommendation right now, but do NOT treat it as a permanent rejection.
18. "OTHER": Weak contextual nuance only.
19. NON-PERMANENCE: A single feedback event reflects current context, NEVER a permanent lifetime ban.

STRICT GROUNDING & ANTI-FABRICATION RULES:
20. "grounding.knownFacts" are the ONLY business-specific facts you may assert as factual reality.
21. "grounding.unavailableEvidence" categories MUST NOT be presented as known, observed, or verified facts.
22. If a recommendation depends on unavailable evidence, phrase the dependency conditionally (e.g. "si...", "à vérifier...").
23. NEVER invent business attributes (amenities, pricing, opening hours, availability, reviews, past performance metrics).
24. Frame general marketing hypotheses as opportunities/hypotheses, NOT verified SEO search volume or fake market urgency.`

/**
 * Serializes the MuzaReasoningContext into a clean, token-efficient input string for the model.
 * Contains strategic context, compact editorial memory, compact feedback memory, industry resolution, playbook, grounding context, and reasoning principles.
 *
 * @param reasoningContext - The reasoning context for the business
 * @returns Formatted JSON string input for AI provider
 */
export function buildRecommendationInput(
  reasoningContext: MuzaReasoningContext
): string {
  const editorialMemory = buildCompactEditorialMemory(
    reasoningContext.editorialHistory
  )
  const feedbackMemory = buildCompactFeedbackMemory(
    reasoningContext.feedbackMemory || { recentFeedback: [] }
  )

  return JSON.stringify(
    {
      strategicContext: reasoningContext.strategicContext,
      editorialMemory,
      feedbackMemory,
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
 * derives authoritative concept keys server-side, validates diversity,
 * validates domain schema, and attaches deterministic media intelligence.
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

  const recommendationsWithConceptKey = transportBatch.recommendations.map(
    (rec) => ({
      ...rec,
      conceptKey: buildEditorialConceptKey(
        rec.editorialTopic,
        rec.editorialAngle
      ),
    })
  )

  const compactMemory = buildCompactEditorialMemory(
    reasoningContext.editorialHistory
  )

  assertMuzaRecommendationDiversity(
    recommendationsWithConceptKey,
    compactMemory
  )

  const businessBatch = {
    strategicSummary: transportBatch.strategicSummary,
    recommendations: recommendationsWithConceptKey,
    generatedAt: new Date().toISOString(),
  }

  const validatedBatch = validateMuzaRecommendationBatch(businessBatch)

  // Attach deterministic media intelligence before return
  const mediaInventory = await loadBusinessMediaInventory(
    reasoningContext.strategicContext.business.id
  )

  const enrichedRecommendations = enrichMuzaRecommendationsWithMediaAssets(
    validatedBatch.recommendations,
    mediaInventory,
    reasoningContext.industry.playbook
  )

  return {
    ...validatedBatch,
    recommendations: enrichedRecommendations,
  }
}
