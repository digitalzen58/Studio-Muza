import { getMuzaStrategicContext } from '@/services/muza-strategic-context'
import { resolveMuzaBusinessModel } from '@/services/muza-industry-resolver'
import { getBaseIndustryPlaybook } from '@/config/muza-industry-playbooks'
import { MUZA_REASONING_PRINCIPLES } from '@/config/muza-recommendation-rules'
import type { MuzaReasoningContext } from '@/types/muza-reasoning-context'
import type { MuzaStrategicContext } from '@/types/muza-strategic-context'

/**
 * Pure transformation function assembling a MuzaReasoningContext from a given MuzaStrategicContext.
 * Pure and exported to allow isolated unit testing.
 *
 * @param strategicContext - The strategic context of the business
 * @returns MuzaReasoningContext
 */
export function buildMuzaReasoningContext(
  strategicContext: MuzaStrategicContext
): MuzaReasoningContext {
  const { industry, subindustry } = strategicContext.business

  const resolution = resolveMuzaBusinessModel(industry, subindustry)
  const playbook = getBaseIndustryPlaybook(resolution.businessModel)

  return {
    strategicContext,
    industry: {
      resolution,
      playbook,
    },
    reasoningPrinciples: MUZA_REASONING_PRINCIPLES,
  }
}

/**
 * Primary public server-side function to assemble the full MuzaReasoningContext for the authenticated user.
 * Delegates fetching to getMuzaStrategicContext() without any direct database or network calls.
 *
 * @returns Promise<MuzaReasoningContext>
 */
export async function getMuzaReasoningContext(): Promise<MuzaReasoningContext> {
  const strategicContext = await getMuzaStrategicContext()
  return buildMuzaReasoningContext(strategicContext)
}
