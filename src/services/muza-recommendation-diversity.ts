import type { MuzaCompactEditorialMemory } from '@/types/muza-editorial-history'
import { buildEditorialConceptKey } from '@/services/muza-editorial-concept'

/**
 * High-level categorization of diversity issues detected by the server guard.
 */
export type MuzaDiversityIssueType =
  | 'SAME_BATCH_DUPLICATE'
  | 'RECENT_CONCEPT_REPEAT'
  | 'REJECTED_CONCEPT_REPEAT'
  | 'PUBLISHED_CONCEPT_REPEAT'

/**
 * Structured diversity issue representing a specific duplication violation.
 */
export type MuzaDiversityIssue = {
  type: MuzaDiversityIssueType
  conceptKey: string
  message: string
  recommendationIndexes?: number[]
}

/**
 * Result structure returned by evaluateMuzaRecommendationDiversity.
 */
export type MuzaDiversityEvaluation = {
  isValid: boolean
  issues: MuzaDiversityIssue[]
}

/**
 * Interface representing a candidate recommendation item for diversity evaluation.
 */
export type MuzaDiversityCandidate = {
  editorialTopic: string
  editorialAngle: string
  conceptKey?: string | null
  noveltyReason?: string | null
}

/**
 * Controlled domain error thrown when candidate recommendations fail diversity constraints.
 */
export class MuzaRecommendationDiversityError extends Error {
  public readonly issues: MuzaDiversityIssue[]

  constructor(issues: MuzaDiversityIssue[]) {
    const summary = issues.map((i) => `[${i.type}] ${i.message}`).join('; ')
    super(`Recommendation diversity validation failed: ${summary}`)
    this.name = 'MuzaRecommendationDiversityError'
    this.issues = issues
  }
}

/**
 * Pure, deterministic server-side evaluation of recommendation diversity.
 * Evaluates both SAME-BATCH duplication and HISTORICAL duplication against compact memory.
 * No AI calls, no network, no database, no fuzzy approximations.
 *
 * @param candidates - Generated candidate recommendations to evaluate
 * @param memory - Compact editorial memory of the active business
 * @returns MuzaDiversityEvaluation result
 */
export function evaluateMuzaRecommendationDiversity(
  candidates: MuzaDiversityCandidate[],
  memory: MuzaCompactEditorialMemory
): MuzaDiversityEvaluation {
  const issues: MuzaDiversityIssue[] = []

  // Resolve canonical conceptKeys for all candidates
  const resolvedKeys = candidates.map((c) =>
    c.conceptKey && c.conceptKey.trim().length > 0
      ? c.conceptKey
      : buildEditorialConceptKey(c.editorialTopic, c.editorialAngle)
  )

  // 1. Check SAME-BATCH DUPLICATION
  const seenKeyIndexMap = new Map<string, number>()

  for (let i = 0; i < resolvedKeys.length; i++) {
    const key = resolvedKeys[i]
    if (!key) continue

    if (seenKeyIndexMap.has(key)) {
      const originalIndex = seenKeyIndexMap.get(key)!
      issues.push({
        type: 'SAME_BATCH_DUPLICATE',
        conceptKey: key,
        message: `Duplicate concept within the same batch at position ${originalIndex + 1} and ${i + 1} ("${candidates[i].editorialTopic}" / "${candidates[i].editorialAngle}")`,
        recommendationIndexes: [originalIndex, i],
      })
    } else {
      seenKeyIndexMap.set(key, i)
    }
  }

  // Build lookup sets for historical memory matching
  const recentSet = new Set(
    (memory.recentConcepts || [])
      .map((c) => c.conceptKey)
      .filter((k): k is string => Boolean(k))
  )

  const rejectedSet = new Set(
    (memory.rejectedConcepts || [])
      .map((c) => c.conceptKey)
      .filter((k): k is string => Boolean(k))
  )

  const publishedSet = new Set(
    (memory.publishedConcepts || [])
      .map((c) => c.conceptKey)
      .filter((k): k is string => Boolean(k))
  )

  // 2. Check HISTORICAL DUPLICATION
  for (let i = 0; i < resolvedKeys.length; i++) {
    const key = resolvedKeys[i]
    if (!key) continue

    // Exact match against REJECTED concepts (highest severity)
    if (rejectedSet.has(key)) {
      issues.push({
        type: 'REJECTED_CONCEPT_REPEAT',
        conceptKey: key,
        message: `Candidate at index ${i} ("${key}") repeats a previously rejected editorial concept`,
        recommendationIndexes: [i],
      })
      continue
    }

    // Exact match against RECENT concepts
    if (recentSet.has(key)) {
      issues.push({
        type: 'RECENT_CONCEPT_REPEAT',
        conceptKey: key,
        message: `Candidate at index ${i} ("${key}") repeats a recently proposed editorial concept`,
        recommendationIndexes: [i],
      })
      continue
    }

    // Exact match against PUBLISHED concepts
    if (publishedSet.has(key)) {
      issues.push({
        type: 'PUBLISHED_CONCEPT_REPEAT',
        conceptKey: key,
        message: `Candidate at index ${i} ("${key}") repeats an already published content concept`,
        recommendationIndexes: [i],
      })
      continue
    }
  }

  return {
    isValid: issues.length === 0,
    issues,
  }
}

/**
 * Asserts that candidate recommendations satisfy deterministic diversity constraints.
 * Throws MuzaRecommendationDiversityError if any duplication issue is detected.
 *
 * @param candidates - Candidate recommendations
 * @param memory - Compact editorial memory
 */
export function assertMuzaRecommendationDiversity(
  candidates: MuzaDiversityCandidate[],
  memory: MuzaCompactEditorialMemory
): void {
  const evaluation = evaluateMuzaRecommendationDiversity(candidates, memory)
  if (!evaluation.isValid) {
    throw new MuzaRecommendationDiversityError(evaluation.issues)
  }
}
