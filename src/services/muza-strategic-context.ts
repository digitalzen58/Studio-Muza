import { getMuzaContext } from '@/services/muza-context'
import { MuzaContext } from '@/types/muza-context'
import { MuzaStrategicContext } from '@/types/muza-strategic-context'

/**
 * Sanitizes unknown JSON arrays into clean, trimmed, non-empty, deduplicated string arrays.
 * Non-string items are ignored.
 */
export function sanitizeStringArray(arr: unknown[] | null | undefined): string[] {
  if (!Array.isArray(arr)) return []

  const result: string[] = []
  const seen = new Set<string>()

  for (const item of arr) {
    if (typeof item === 'string') {
      const trimmed = item.trim()
      if (trimmed !== '' && !seen.has(trimmed)) {
        seen.add(trimmed)
        result.push(trimmed)
      }
    }
  }

  return result
}

/**
 * Combines city, region, and countryCode into a clean location string.
 */
function buildLocation(
  city: string | null,
  region: string | null,
  countryCode: string | null
): string | null {
  const parts = [city, region, countryCode]
    .map((part) => (typeof part === 'string' ? part.trim() : ''))
    .filter((part) => part !== '')

  return parts.length > 0 ? parts.join(', ') : null
}

/**
 * Computes deterministic strategic signals from the raw MuzaContext.
 */
function computeStrategicSignals(context: MuzaContext): MuzaStrategicContext['strategicSignals'] {
  const brand = context.brand
  const hasCompleteBrand =
    brand !== null &&
    ((typeof brand.positioning === 'string' && brand.positioning.trim() !== '') ||
      (typeof brand.promise === 'string' && brand.promise.trim() !== ''))

  const hasAudience = context.audience !== null
  const hasActiveGoal = context.goal !== null
  const hasActiveOffer = context.offer !== null

  const creator = context.creator
  let creatorTimePressure: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN' = 'UNKNOWN'
  if (creator && creator.weeklyMinutes !== null && creator.weeklyMinutes !== undefined) {
    const mins = creator.weeklyMinutes
    if (mins <= 60) {
      creatorTimePressure = 'HIGH'
    } else if (mins <= 180) {
      creatorTimePressure = 'MEDIUM'
    } else {
      creatorTimePressure = 'LOW'
    }
  }

  let cameraConstraint: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN' = 'UNKNOWN'
  if (creator && creator.cameraComfort !== null && creator.cameraComfort !== undefined) {
    const comfort = creator.cameraComfort
    if (comfort === 0 || comfort === 1) {
      cameraConstraint = 'HIGH'
    } else if (comfort === 2 || comfort === 3) {
      cameraConstraint = 'MEDIUM'
    } else if (comfort === 4 || comfort === 5) {
      cameraConstraint = 'LOW'
    }
  }

  return {
    hasCompleteBrand,
    hasAudience,
    hasActiveGoal,
    hasActiveOffer,
    creatorTimePressure,
    cameraConstraint,
  }
}

/**
 * Pure transformation function converting a raw MuzaContext into a clean MuzaStrategicContext.
 * Pure and exported to allow isolated unit testing.
 */
export function buildMuzaStrategicContext(context: MuzaContext): MuzaStrategicContext {
  const { business, brand, creator, audience, goal, offer } = context

  return {
    business: {
      name: business.name.trim(),
      industry: business.industry.trim(),
      subindustry: business.subindustry ? business.subindustry.trim() || null : null,
      location: buildLocation(business.city, business.region, business.countryCode),
      description: business.description ? business.description.trim() || null : null,
    },

    brand: {
      positioning: brand?.positioning ? brand.positioning.trim() || null : null,
      promise: brand?.promise ? brand.promise.trim() || null : null,
      personality: sanitizeStringArray(brand?.personality),
      values: sanitizeStringArray(brand?.values),
      signaturePhrases: sanitizeStringArray(brand?.signaturePhrases),
      preferredVocabulary: sanitizeStringArray(brand?.preferredVocabulary),
      avoidedVocabulary: sanitizeStringArray(brand?.avoidedVocabulary),
    },

    creatorConstraints: {
      weeklyMinutes: creator?.weeklyMinutes ?? null,
      cameraComfort: creator?.cameraComfort ?? null,
      voiceoverComfort: creator?.voiceoverComfort ?? null,
      writingComfort: creator?.writingComfort ?? null,
      photoComfort: creator?.photoComfort ?? null,
      videoComfort: creator?.videoComfort ?? null,
      maxEffortLevel: creator?.maxEffortLevel ?? null,
      preferredFormats: sanitizeStringArray(creator?.preferredFormats),
      avoidedFormats: sanitizeStringArray(creator?.avoidedFormats),
      barriers: sanitizeStringArray(creator?.barriers),
      strengths: sanitizeStringArray(creator?.strengths),
    },

    audience: {
      name: audience?.name ? audience.name.trim() || null : null,
      description: audience?.description ? audience.description.trim() || null : null,
      needs: sanitizeStringArray(audience?.needs),
      desires: sanitizeStringArray(audience?.desires),
      problems: sanitizeStringArray(audience?.problems),
      objections: sanitizeStringArray(audience?.objections),
      motivations: sanitizeStringArray(audience?.motivations),
      questions: sanitizeStringArray(audience?.questions),
      buyingTriggers: sanitizeStringArray(audience?.buyingTriggers),
      languagePatterns: sanitizeStringArray(audience?.languagePatterns),
    },

    objective: {
      type: goal?.type ? goal.type.trim() || null : null,
      title: goal?.title ? goal.title.trim() || null : null,
      description: goal?.description ? goal.description.trim() || null : null,
      priority: goal?.priority ?? null,
      startsAt: goal?.startsAt ?? null,
      endsAt: goal?.endsAt ?? null,
    },

    offer: {
      name: offer?.name ? offer.name.trim() || null : null,
      description: offer?.description ? offer.description.trim() || null : null,
      cta: offer?.cta ? offer.cta.trim() || null : null,
      benefits: sanitizeStringArray(offer?.benefits),
      objections: sanitizeStringArray(offer?.objections),
      seasonality:
        typeof offer?.seasonality === 'object' && offer.seasonality !== null && !Array.isArray(offer.seasonality)
          ? offer.seasonality
          : {},
      availableFrom: offer?.availableFrom ?? null,
      availableUntil: offer?.availableUntil ?? null,
    },

    strategicSignals: computeStrategicSignals(context),
  }
}

/**
 * Primary public server-side function to retrieve the transformed MuzaStrategicContext for the authenticated user.
 * Delegates data fetching to getMuzaContext() without making any direct database or network calls.
 *
 * @returns Promise<MuzaStrategicContext>
 */
export async function getMuzaStrategicContext(): Promise<MuzaStrategicContext> {
  const rawContext = await getMuzaContext()
  return buildMuzaStrategicContext(rawContext)
}
