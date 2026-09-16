import type { MuzaStrategicContext } from '@/types/muza-strategic-context'
import type { MuzaIndustryResolution } from '@/services/muza-industry-resolver'
import type { MuzaIndustryPlaybook } from '@/types/muza-industry-playbook'

/**
 * Strongly typed union of unavailable evidence categories for Mūza recommendation grounding.
 */
export type MuzaUnavailableEvidenceKey =
  | 'LIVE_AVAILABILITY_DATA'
  | 'LIVE_SEARCH_DEMAND_DATA'
  | 'LIVE_TREND_DATA'
  | 'COMPETITOR_DATA'
  | 'SOCIAL_PERFORMANCE_DATA'
  | 'WEBSITE_ANALYTICS_DATA'
  | 'VERIFIED_CURRENT_SEO_VOLUME'
  | 'VERIFIED_CUSTOMER_OBJECTION_FREQUENCY'
  | 'TRAVEL_TIME_FROM_AUDIENCE'
  | 'UNDECLARED_AMENITIES_AND_POLICIES'

/**
 * Machine-readable boundary between known facts and unavailable evidence.
 */
export type MuzaGroundingContext = {
  knownFacts: string[]
  unavailableEvidence: MuzaUnavailableEvidenceKey[]
}

/**
 * Complete reasoning context for Mūza's AI recommendation engine.
 * Assembles strategic business context, industry resolution, base playbook, grounding boundary, and reasoning principles.
 */
export type MuzaReasoningContext = {
  strategicContext: MuzaStrategicContext

  industry: {
    resolution: MuzaIndustryResolution
    playbook: MuzaIndustryPlaybook
  }

  grounding: MuzaGroundingContext

  reasoningPrinciples: readonly string[]
}
