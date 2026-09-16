import type { MuzaStrategicContext } from '@/types/muza-strategic-context'
import type {
  MuzaGroundingContext,
  MuzaUnavailableEvidenceKey,
} from '@/types/muza-reasoning-context'

/**
 * Standard list of evidence categories that are not currently available in Mūza MVP.
 */
const DEFAULT_UNAVAILABLE_EVIDENCE: MuzaUnavailableEvidenceKey[] = [
  'LIVE_AVAILABILITY_DATA',
  'LIVE_SEARCH_DEMAND_DATA',
  'LIVE_TREND_DATA',
  'COMPETITOR_DATA',
  'SOCIAL_PERFORMANCE_DATA',
  'WEBSITE_ANALYTICS_DATA',
  'VERIFIED_CURRENT_SEO_VOLUME',
  'VERIFIED_CUSTOMER_OBJECTION_FREQUENCY',
  'TRAVEL_TIME_FROM_AUDIENCE',
  'UNDECLARED_AMENITIES_AND_POLICIES',
]

/**
 * Pure transformation function building a deterministic MuzaGroundingContext
 * derived ONLY from structured fields already present in MuzaStrategicContext.
 *
 * @param strategicContext - The strategic context of the business
 * @returns MuzaGroundingContext
 */
export function buildMuzaGroundingContext(
  strategicContext: MuzaStrategicContext
): MuzaGroundingContext {
  const knownFacts: string[] = []

  const { business, brand, creatorConstraints, audience, objective, offer } =
    strategicContext

  // 1. Business Facts
  if (business.name) {
    knownFacts.push(`Business name: ${business.name}`)
  }

  if (business.industry) {
    const sub = business.subindustry
      ? ` (Subindustry: ${business.subindustry})`
      : ''
    knownFacts.push(`Industry: ${business.industry}${sub}`)
  }

  if (business.location) {
    knownFacts.push(`Location: ${business.location}`)
  }

  if (business.description) {
    knownFacts.push(`Business description: ${business.description}`)
  }

  // 2. Brand Positioning & Constraints
  if (brand.positioning) {
    knownFacts.push(`Brand positioning: ${brand.positioning}`)
  }

  if (brand.promise) {
    knownFacts.push(`Brand promise: ${brand.promise}`)
  }

  if (brand.personality.length > 0) {
    knownFacts.push(`Brand personality traits: ${brand.personality.join(', ')}`)
  }

  if (brand.values.length > 0) {
    knownFacts.push(`Brand core values: ${brand.values.join(', ')}`)
  }

  if (brand.preferredVocabulary.length > 0) {
    knownFacts.push(
      `Preferred vocabulary: ${brand.preferredVocabulary.join(', ')}`
    )
  }

  if (brand.avoidedVocabulary.length > 0) {
    knownFacts.push(
      `Avoided vocabulary/topics: ${brand.avoidedVocabulary.join(', ')}`
    )
  }

  // 3. Creator Constraints
  if (creatorConstraints.weeklyMinutes !== null) {
    knownFacts.push(
      `Creator weekly time capacity: ${creatorConstraints.weeklyMinutes} minutes`
    )
  }

  if (creatorConstraints.cameraComfort !== null) {
    knownFacts.push(
      `Creator camera comfort rating: ${creatorConstraints.cameraComfort}/5`
    )
  }

  if (creatorConstraints.voiceoverComfort !== null) {
    knownFacts.push(
      `Creator voiceover comfort rating: ${creatorConstraints.voiceoverComfort}/5`
    )
  }

  if (creatorConstraints.preferredFormats.length > 0) {
    knownFacts.push(
      `Preferred content formats: ${creatorConstraints.preferredFormats.join(', ')}`
    )
  }

  if (creatorConstraints.avoidedFormats.length > 0) {
    knownFacts.push(
      `Avoided content formats: ${creatorConstraints.avoidedFormats.join(', ')}`
    )
  }

  // 4. Audience Facts
  if (audience.name) {
    knownFacts.push(`Primary target audience: ${audience.name}`)
  }

  if (audience.description) {
    knownFacts.push(`Audience profile: ${audience.description}`)
  }

  if (audience.needs.length > 0) {
    knownFacts.push(`Audience stated needs: ${audience.needs.join(', ')}`)
  }

  if (audience.desires.length > 0) {
    knownFacts.push(`Audience stated desires: ${audience.desires.join(', ')}`)
  }

  if (audience.problems.length > 0) {
    knownFacts.push(`Audience key pain points: ${audience.problems.join(', ')}`)
  }

  if (audience.objections.length > 0) {
    knownFacts.push(
      `Audience known objections: ${audience.objections.join(', ')}`
    )
  }

  // 5. Active Objective
  if (objective.title) {
    const desc = objective.description ? `: ${objective.description}` : ''
    knownFacts.push(`Active goal: ${objective.title}${desc}`)
  }

  if (objective.type) {
    knownFacts.push(`Active goal type: ${objective.type}`)
  }

  // 6. Active Offer
  if (offer.name) {
    const desc = offer.description ? `: ${offer.description}` : ''
    knownFacts.push(`Active offer: ${offer.name}${desc}`)
  }

  if (offer.cta) {
    knownFacts.push(`Active offer primary call-to-action: ${offer.cta}`)
  }

  if (offer.benefits.length > 0) {
    knownFacts.push(`Active offer key benefits: ${offer.benefits.join(', ')}`)
  }

  const unavailableEvidence = [...DEFAULT_UNAVAILABLE_EVIDENCE]

  return {
    knownFacts,
    unavailableEvidence,
  }
}
