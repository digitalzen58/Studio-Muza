import type {
  MuzaGroundingContext,
  MuzaUnavailableEvidenceKey,
} from '@/types/muza-reasoning-context'
import type { MuzaAIRecommendationBatch } from '@/schemas/muza-ai-recommendation-schema'

/**
 * Structured violation item returned by the grounding guard.
 */
export type MuzaGroundingViolation = {
  evidenceKey: MuzaUnavailableEvidenceKey
  fieldPath: string
  matchedTerm: string
  snippet: string
  message: string
}

/**
 * Result returned by the grounding guard evaluation.
 */
export type MuzaGroundingValidationResult = {
  isValid: boolean
  violations: MuzaGroundingViolation[]
}

/**
 * Custom error thrown when post-generation grounding validation fails.
 */
export class MuzaGroundingViolationError extends Error {
  readonly violations: MuzaGroundingViolation[]

  constructor(violations: MuzaGroundingViolation[]) {
    const summary = violations
      .map((v) => `[${v.evidenceKey}] at ${v.fieldPath}: "${v.matchedTerm}"`)
      .join('; ')
    super(`Recommendation output violated grounding constraints: ${summary}`)
    this.name = 'MuzaGroundingViolationError'
    this.violations = violations
  }
}

/**
 * Helper interface for text fields extracted from recommendation batch.
 */
type FieldEntry = {
  path: string
  value: string
}

/**
 * Extracts all non-null free-text fields from a transport batch.
 */
function extractTextFields(batch: MuzaAIRecommendationBatch): FieldEntry[] {
  const entries: FieldEntry[] = []

  if (batch.strategicSummary) {
    entries.push({ path: 'strategicSummary', value: batch.strategicSummary })
  }

  batch.recommendations.forEach((rec, i) => {
    const prefix = `recommendations[${i}]`

    if (rec.title) entries.push({ path: `${prefix}.title`, value: rec.title })
    if (rec.summary)
      entries.push({ path: `${prefix}.summary`, value: rec.summary })
    if (rec.whyNow)
      entries.push({ path: `${prefix}.whyNow`, value: rec.whyNow })
    if (rec.objective)
      entries.push({ path: `${prefix}.objective`, value: rec.objective })
    if (rec.audience)
      entries.push({ path: `${prefix}.audience`, value: rec.audience })
    if (rec.offer) entries.push({ path: `${prefix}.offer`, value: rec.offer })
    if (rec.contentAngle)
      entries.push({ path: `${prefix}.contentAngle`, value: rec.contentAngle })
    if (rec.callToAction)
      entries.push({ path: `${prefix}.callToAction`, value: rec.callToAction })

    if (Array.isArray(rec.reasons)) {
      rec.reasons.forEach((reason, j) => {
        if (reason.label)
          entries.push({
            path: `${prefix}.reasons[${j}].label`,
            value: reason.label,
          })
        if (reason.explanation)
          entries.push({
            path: `${prefix}.reasons[${j}].explanation`,
            value: reason.explanation,
          })
      })
    }
  })

  return entries
}

/**
 * Normalizes text for matching: lowercases and normalizes unicode accents.
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Extracts a surrounding snippet from text for reporting.
 */
function extractSnippet(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 20)
  const end = Math.min(text.length, index + length + 20)
  const snippet = text.slice(start, end)
  const prefixStr = start > 0 ? '...' : ''
  const suffixStr = end < text.length ? '...' : ''
  return `${prefixStr}${snippet}${suffixStr}`
}

/**
 * 1. LIVE_AVAILABILITY_DATA rules
 */
const AVAILABILITY_CONDITIONAL_PATTERNS = [
  /si\s+des\s+dates\s+sont\s+disponibles/i,
  /si\s+certains?\s+creneaux.*sont\s+(encore\s+)?disponibles/i,
  /s['’]il\s+reste\s+des\s+disponibilites/i,
  /si\s+vous\s+avez\s+encore\s+des\s+creneaux/i,
  /a\s+verifier\s+selon\s+(vos|les)\s+disponibilites/i,
  /selon\s+(vos|les)\s+disponibilites/i,
  /si\s+vos\s+disponibilites\s+le\s+permettent/i,
  /si\s+des\s+creneaux\s+sont\s+libres/i,
]

const AVAILABILITY_FORBIDDEN_PATTERNS = [
  {
    pattern: /derniers?\s+creneaux\s+disponibles/i,
    label: 'derniers créneaux disponibles',
  },
  {
    pattern: /dernieres?\s+dates\s+disponibles/i,
    label: 'dernières dates disponibles',
  },
  {
    pattern: /dernieres?\s+disponibilites/i,
    label: 'dernières disponibilités',
  },
  {
    pattern: /creneaux\s+encore\s+libres/i,
    label: 'créneaux encore libres',
  },
  {
    pattern: /dates\s+encore\s+disponibles/i,
    label: 'dates encore disponibles',
  },
  {
    pattern: /derniers?\s+week-ends\s+disponibles/i,
    label: 'derniers week-ends disponibles',
  },
  {
    pattern: /dernieres?\s+places\s+disponibles/i,
    label: 'dernières places disponibles',
  },
  {
    pattern:
      /il\s+reste\s+(\d+|quelques)\s+(dates|places|creneaux|semaines|week-ends)/i,
    label: 'il reste X dates/places/créneaux',
  },
]

function checkAvailabilityViolation(
  text: string
): { matchedTerm: string; index: number; length: number } | null {
  const norm = normalizeText(text)

  for (const cond of AVAILABILITY_CONDITIONAL_PATTERNS) {
    if (cond.test(norm)) {
      return null
    }
  }

  for (const item of AVAILABILITY_FORBIDDEN_PATTERNS) {
    const match = norm.match(item.pattern)
    if (match && match.index !== undefined) {
      return {
        matchedTerm: item.label,
        index: match.index,
        length: match[0].length,
      }
    }
  }

  return null
}

/**
 * 2. LIVE_SEARCH_DEMAND_DATA rules
 */
const SEARCH_CONDITIONAL_PATTERNS = [
  /opportunite\s+seo/i,
  /peut\s+aider\s+a\s+etre\s+trouve/i,
  /aide\s+a\s+etre\s+trouve/i,
  /peut\s+capter\s+(des|les)\s+recherches/i,
  /pour\s+capter\s+(des|les)\s+recherches/i,
  /pour\s+travailler\s+la\s+visibilite/i,
  /si\s+les\s+donnees\s+de\s+recherche\s+confirment/i,
]

const SEARCH_FORBIDDEN_PATTERNS = [
  {
    pattern: /cherchent\s+activement(\s+sur\s+google)?/i,
    label: 'cherchent activement sur Google',
  },
  { pattern: /recherchent\s+activement/i, label: 'recherchent activement' },
  { pattern: /recherches\s+en\s+hausse/i, label: 'recherches en hausse' },
  {
    pattern: /volume\s+de\s+recherche\s+eleve/i,
    label: 'volume de recherche élevé',
  },
  {
    pattern: /recherches\s+populaires\s+actuellement/i,
    label: 'recherches populaires actuellement',
  },
  {
    pattern: /recherchent\s+en\s+ce\s+moment/i,
    label: 'recherchent en ce moment',
  },
]

function checkSearchDemandViolation(
  text: string
): { matchedTerm: string; index: number; length: number } | null {
  const norm = normalizeText(text)

  for (const cond of SEARCH_CONDITIONAL_PATTERNS) {
    if (cond.test(norm)) {
      return null
    }
  }

  for (const item of SEARCH_FORBIDDEN_PATTERNS) {
    const match = norm.match(item.pattern)
    if (match && match.index !== undefined) {
      return {
        matchedTerm: item.label,
        index: match.index,
        length: match[0].length,
      }
    }
  }

  return null
}

/**
 * 3. TRAVEL_TIME_FROM_AUDIENCE rules
 */
const TRAVEL_CONDITIONAL_PATTERNS = [
  /selon\s+le\s+temps\s+de\s+trajet\s+reel/i,
  /si\s+la\s+distance\s+le\s+permet/i,
  /a\s+verifier\s+selon\s+((votre|la)\s+ville\s+de\s+depart|la\s+distance)/i,
]

const TRAVEL_FORBIDDEN_PATTERNS = [
  {
    pattern:
      /(situ[eé]\s+)?a\s+(seulement\s+|\d+\s+min\s+de\s+)?\d+\s+(heures?|h|minutes?|min)\s+de\s+[a-z]+/i,
    label: 'situé à X heures/minutes de',
  },
  {
    pattern: /seulement\s+\d+\s+(heures?|h|minutes?|min)\s+de\s+trajet/i,
    label: 'seulement X heures/minutes de trajet',
  },
]

function checkTravelTimeViolation(
  text: string
): { matchedTerm: string; index: number; length: number } | null {
  const norm = normalizeText(text)

  for (const cond of TRAVEL_CONDITIONAL_PATTERNS) {
    if (cond.test(norm)) {
      return null
    }
  }

  for (const item of TRAVEL_FORBIDDEN_PATTERNS) {
    const match = norm.match(item.pattern)
    if (match && match.index !== undefined) {
      return {
        matchedTerm: item.label,
        index: match.index,
        length: match[0].length,
      }
    }
  }

  return null
}

/**
 * Pure function evaluating a transport recommendation batch against grounding context.
 * Collects structured violations without mutating batch or grounding.
 *
 * @param batch - Transport recommendation batch to inspect
 * @param grounding - Grounding context containing unavailable evidence keys
 * @returns MuzaGroundingValidationResult
 */
export function validateMuzaRecommendationGrounding(
  batch: MuzaAIRecommendationBatch,
  grounding: MuzaGroundingContext
): MuzaGroundingValidationResult {
  const violations: MuzaGroundingViolation[] = []
  const textFields = extractTextFields(batch)
  const unavailable = new Set(grounding.unavailableEvidence)

  textFields.forEach(({ path, value }) => {
    // 1. Check LIVE_AVAILABILITY_DATA
    if (unavailable.has('LIVE_AVAILABILITY_DATA')) {
      const match = checkAvailabilityViolation(value)
      if (match) {
        violations.push({
          evidenceKey: 'LIVE_AVAILABILITY_DATA',
          fieldPath: path,
          matchedTerm: match.matchedTerm,
          snippet: extractSnippet(value, match.index, match.length),
          message:
            'Assertion of live availability/remaining dates without available availability data',
        })
      }
    }

    // 2. Check LIVE_SEARCH_DEMAND_DATA
    if (unavailable.has('LIVE_SEARCH_DEMAND_DATA')) {
      const match = checkSearchDemandViolation(value)
      if (match) {
        violations.push({
          evidenceKey: 'LIVE_SEARCH_DEMAND_DATA',
          fieldPath: path,
          matchedTerm: match.matchedTerm,
          snippet: extractSnippet(value, match.index, match.length),
          message:
            'Assertion of active search demand/trends without available search data',
        })
      }
    }

    // 3. Check TRAVEL_TIME_FROM_AUDIENCE
    if (unavailable.has('TRAVEL_TIME_FROM_AUDIENCE')) {
      const match = checkTravelTimeViolation(value)
      if (match) {
        violations.push({
          evidenceKey: 'TRAVEL_TIME_FROM_AUDIENCE',
          fieldPath: path,
          matchedTerm: match.matchedTerm,
          snippet: extractSnippet(value, match.index, match.length),
          message:
            'Assertion of specific travel time without available location/transit data',
        })
      }
    }
  })

  // Deduplicate identical violations by evidenceKey + fieldPath + matchedTerm
  const uniqueViolations: MuzaGroundingViolation[] = []
  const seenKeys = new Set<string>()

  for (const v of violations) {
    const key = `${v.evidenceKey}:${v.fieldPath}:${v.matchedTerm}`
    if (!seenKeys.has(key)) {
      seenKeys.add(key)
      uniqueViolations.push(v)
    }
  }

  return {
    isValid: uniqueViolations.length === 0,
    violations: uniqueViolations,
  }
}

/**
 * Asserts that a transport recommendation batch satisfies post-generation grounding constraints.
 * Throws MuzaGroundingViolationError if violations exist.
 *
 * @param batch - Transport recommendation batch to inspect
 * @param grounding - Grounding context containing unavailable evidence keys
 */
export function assertMuzaRecommendationGrounding(
  batch: MuzaAIRecommendationBatch,
  grounding: MuzaGroundingContext
): void {
  const result = validateMuzaRecommendationGrounding(batch, grounding)

  if (!result.isValid) {
    throw new MuzaGroundingViolationError(result.violations)
  }
}
