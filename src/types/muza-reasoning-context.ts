import type { MuzaStrategicContext } from '@/types/muza-strategic-context'
import type { MuzaIndustryResolution } from '@/services/muza-industry-resolver'
import type { MuzaIndustryPlaybook } from '@/types/muza-industry-playbook'

/**
 * Complete reasoning context for Mūza's AI recommendation engine.
 * Assembles strategic business context, industry resolution, base playbook, and reasoning principles.
 */
export type MuzaReasoningContext = {
  strategicContext: MuzaStrategicContext

  industry: {
    resolution: MuzaIndustryResolution
    playbook: MuzaIndustryPlaybook
  }

  reasoningPrinciples: readonly string[]
}
