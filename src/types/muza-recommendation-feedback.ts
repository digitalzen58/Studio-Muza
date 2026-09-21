/**
 * Studio Mūza — Step 131G Recommendation Feedback Taxonomy & Memory Models.
 *
 * PRODUCT PRINCIPLE:
 * “Mūza propose. Vous choisissez. Mūza apprend.”
 *
 * A rejection must NOT automatically mean “never talk about this topic again.”
 * We distinguish:
 * - idea rejection (IDEA_REJECTION)
 * - format preference (FORMAT_PREFERENCE)
 * - feasibility problem (EXECUTION_CONSTRAINT)
 * - repetition / saturation (REPETITION)
 * - timing / context (TIMING)
 * - other context (OTHER)
 */

/**
 * 9 discrete, understandable, and extensible feedback reasons.
 */
export type RecommendationFeedbackReason =
  | 'ALREADY_DONE'
  | 'TOO_REPETITIVE'
  | 'NOT_RELEVANT'
  | 'TOO_COMMERCIAL'
  | 'TOO_DIFFICULT'
  | 'WRONG_FORMAT'
  | 'NOT_NOW'
  | 'DISLIKE_TOPIC'
  | 'OTHER'

/**
 * 6 higher-level feedback intents grouping the underlying operational meaning.
 */
export type RecommendationFeedbackIntent =
  | 'IDEA_REJECTION'
  | 'EXECUTION_CONSTRAINT'
  | 'FORMAT_PREFERENCE'
  | 'TIMING'
  | 'REPETITION'
  | 'OTHER'

/**
 * Deterministic mapping dictionary from feedback reason to higher-level intent.
 */
export const FEEDBACK_REASON_TO_INTENT_MAP: Record<
  RecommendationFeedbackReason,
  RecommendationFeedbackIntent
> = {
  TOO_REPETITIVE: 'REPETITION',
  ALREADY_DONE: 'REPETITION',
  TOO_DIFFICULT: 'EXECUTION_CONSTRAINT',
  WRONG_FORMAT: 'FORMAT_PREFERENCE',
  NOT_NOW: 'TIMING',
  TOO_COMMERCIAL: 'IDEA_REJECTION',
  NOT_RELEVANT: 'IDEA_REJECTION',
  DISLIKE_TOPIC: 'IDEA_REJECTION',
  OTHER: 'OTHER',
} as const

/**
 * Pure helper function returning the deterministic intent for any feedback reason.
 */
export function mapFeedbackReasonToIntent(
  reason: RecommendationFeedbackReason
): RecommendationFeedbackIntent {
  return FEEDBACK_REASON_TO_INTENT_MAP[reason] || 'OTHER'
}

/**
 * Centralized behavioral memory windows (in days) and budget configurations.
 * These are starting behavioral-memory windows, NOT permanent truths.
 *
 * SEMANTICS:
 * - IDEA_REJECTION (90 days): Strong avoidance of the exact topic/angle idea for a quarterly cycle.
 * - EXECUTION_CONSTRAINT (60 days): Topic is fine, but filming/execution was too demanding.
 * - FORMAT_PREFERENCE (60 days): Concept is good, but format (e.g. Reel) was wrong. Concept remains eligible for other formats!
 * - REPETITION (30 days): Concept was recently covered or saturated. Avoid near-term repetition.
 * - TIMING (14 days): Concept was rejected due to current week's schedule/context. Expires quickly.
 */
export const FEEDBACK_MEMORY_CONFIG = {
  // Configurable temporal windows in days per intent
  WINDOWS_DAYS: {
    IDEA_REJECTION: 90,
    EXECUTION_CONSTRAINT: 60,
    FORMAT_PREFERENCE: 60,
    REPETITION: 30,
    TIMING: 14,
    OTHER: 30,
  } as Record<RecommendationFeedbackIntent, number>,

  // Maximum characters allowed for user free-text notes
  MAX_NOTE_LENGTH: 300,

  // Caps for retrieval & AI projection budgets (Step 132A)
  MAX_MEMORY_ITEMS: 20,
  PROVIDER_PAYLOAD_CAP: 15,
} as const

/**
 * French user-facing labels and descriptions for reasons.
 */
export const FEEDBACK_REASON_LABELS: Record<
  RecommendationFeedbackReason,
  { label: string; description: string }
> = {
  ALREADY_DONE: {
    label: 'Déjà traité récemment',
    description: 'J’ai déjà abordé ce sujet il n’y a pas longtemps.',
  },
  TOO_REPETITIVE: {
    label: 'Trop répétitif',
    description: 'Ce thème revient un peu trop souvent en ce moment.',
  },
  NOT_RELEVANT: {
    label: 'Pas adapté à mes clients',
    description: 'Ce sujet ne correspond pas aux attentes de ma clientèle.',
  },
  TOO_COMMERCIAL: {
    label: 'Trop commercial',
    description: 'Le ton est trop vendeur pour l’esprit de mon activité.',
  },
  TOO_DIFFICULT: {
    label: 'Trop compliqué à réaliser',
    description: 'L’idée est bonne mais demande trop de temps ou de tournage.',
  },
  WRONG_FORMAT: {
    label: 'Pas le bon format',
    description: 'L’idée me plaît mais je préfère un autre format (carrousel, post...).',
  },
  NOT_NOW: {
    label: 'Pas maintenant',
    description: 'Ce n’est pas le bon moment cette semaine, à revoir plus tard.',
  },
  DISLIKE_TOPIC: {
    label: 'Ce sujet ne me plaît pas',
    description: 'Je ne souhaite pas communiquer sur cette thématique.',
  },
  OTHER: {
    label: 'Autre raison',
    description: 'Précisez en quelques mots pourquoi cette idée ne convient pas.',
  },
} as const

/**
 * Concise batch dissatisfaction options for "Rien ne me convient".
 */
export const BATCH_FEEDBACK_OPTIONS: Array<{
  reason: RecommendationFeedbackReason
  label: string
}> = [
  { reason: 'TOO_REPETITIVE', label: 'Trop répétitif' },
  { reason: 'TOO_COMMERCIAL', label: 'Trop commercial' },
  { reason: 'NOT_RELEVANT', label: 'Pas adapté à mes clients' },
  { reason: 'TOO_DIFFICULT', label: 'Trop compliqué à réaliser' },
  { reason: 'NOT_NOW', label: 'Je veux autre chose cette semaine' },
  { reason: 'OTHER', label: 'Autre raison' },
]

/**
 * Rich internal feedback memory item attached to context.
 */
export type MuzaFeedbackMemoryItem = {
  conceptKey: string
  reason: RecommendationFeedbackReason
  intent: RecommendationFeedbackIntent
  createdAt: string
  format?: string | null
}

/**
 * Rich internal feedback memory structure distinct from raw database rows.
 */
export type MuzaRecommendationFeedbackMemory = {
  recentFeedback: MuzaFeedbackMemoryItem[]
}

/**
 * Ultra-compact, token-minimized projection for future AI provider payload (Step 132A).
 * Strips UUIDs, timestamps, full prose, reasons explanations, and notes.
 *
 * k: conceptKey
 * r: reason code
 * i: intent code
 */
export type MuzaCompactFeedbackItem = {
  k: string
  r: RecommendationFeedbackReason
  i: RecommendationFeedbackIntent
}

/**
 * Compact feedback memory structure for AI provider projection.
 */
export type MuzaCompactFeedbackMemory = MuzaCompactFeedbackItem[]
