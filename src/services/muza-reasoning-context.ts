import { getMuzaStrategicContext } from '@/services/muza-strategic-context'
import { getMuzaEditorialHistory } from '@/services/muza-editorial-history'
import { getMuzaFeedbackMemory } from '@/services/muza-recommendation-feedback'
import { resolveMuzaBusinessModel } from '@/services/muza-industry-resolver'
import { getBaseIndustryPlaybook } from '@/config/muza-industry-playbooks'
import { buildMuzaGroundingContext } from '@/services/muza-grounding-context'
import { MUZA_REASONING_PRINCIPLES } from '@/config/muza-recommendation-rules'
import type { MuzaReasoningContext } from '@/types/muza-reasoning-context'
import type { MuzaStrategicContext } from '@/types/muza-strategic-context'
import type { MuzaEditorialHistory } from '@/types/muza-editorial-history'
import type { MuzaRecommendationFeedbackMemory } from '@/types/muza-recommendation-feedback'

/**
 * Pure transformation function assembling a MuzaReasoningContext from strategic context, editorial history, and feedback memory.
 * Pure and exported to allow isolated unit testing.
 *
 * @param strategicContext - The strategic context of the business
 * @param editorialHistory - The editorial history context of the business
 * @param feedbackMemory - The feedback memory context of the business
 * @returns MuzaReasoningContext
 */
export function buildMuzaReasoningContext(
  strategicContext: MuzaStrategicContext,
  editorialHistory: MuzaEditorialHistory,
  feedbackMemory: MuzaRecommendationFeedbackMemory = { recentFeedback: [] }
): MuzaReasoningContext {
  const { industry, subindustry } = strategicContext.business

  const resolution = resolveMuzaBusinessModel(industry, subindustry)
  const playbook = getBaseIndustryPlaybook(resolution.businessModel)
  const grounding = buildMuzaGroundingContext(strategicContext)

  return {
    strategicContext,
    editorialHistory,
    feedbackMemory,
    industry: {
      resolution,
      playbook,
    },
    grounding,
    reasoningPrinciples: MUZA_REASONING_PRINCIPLES,
  }
}

/**
 * Primary public server-side function to assemble the full MuzaReasoningContext for the authenticated user.
 * Resolves active business strategic context, editorial history, and feedback memory concurrently.
 *
 * @returns Promise<MuzaReasoningContext>
 */
export async function getMuzaReasoningContext(): Promise<MuzaReasoningContext> {
  const strategicContext = await getMuzaStrategicContext()
  const [editorialHistory, feedbackMemory] = await Promise.all([
    getMuzaEditorialHistory(strategicContext.business.id),
    getMuzaFeedbackMemory(strategicContext.business.id),
  ])
  return buildMuzaReasoningContext(strategicContext, editorialHistory, feedbackMemory)
}
