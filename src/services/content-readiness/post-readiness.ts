import type { VisualComposition } from '../visual-composition/types'
import type {
  ContentReadinessResult,
  ReadinessIssue,
} from './types'

export interface PostReadinessInput {
  workingTitle?: string | null
  body?: string | null
  primaryMediaId?: string | null
  visualComposition?: VisualComposition | null
  cta?: string | null
}

/**
 * Validates deterministic editorial readiness of an Instagram / Facebook Post draft.
 * Strictly 0 AI calls.
 *
 * Rules:
 * - BLOCKING:
 *   1. Working title / topic missing
 *   2. Text missing or < 5 characters
 *   3. Visual background missing (photo or plain background)
 *
 * - WARNINGS:
 *   1. CTA missing
 */
export function validatePostReadiness(
  input: PostReadinessInput
): ContentReadinessResult {
  const blockingIssues: ReadinessIssue[] = []
  const warnings: ReadinessIssue[] = []

  // 1. Working title
  const title = input.workingTitle ? input.workingTitle.trim() : ''
  if (!title) {
    blockingIssues.push({
      id: 'missing-title',
      type: 'BLOCKING',
      message: 'Donnez un titre ou sujet à votre publication.',
      targetType: 'TITLE',
    })
  }

  // 2. Publication text
  const text = input.body ? input.body.trim() : ''
  if (!text || text.length < 5) {
    blockingIssues.push({
      id: 'missing-text',
      type: 'BLOCKING',
      message: 'Ajoutez le texte de votre publication.',
      targetType: 'CAPTION',
    })
  }

  // 3. Visual Background (Photo or Plain Background Color)
  const hasPhoto = Boolean(
    input.primaryMediaId ||
      (input.visualComposition?.background?.type === 'IMAGE' &&
        input.visualComposition?.background?.mediaAssetId)
  )
  const hasColorBackground = Boolean(
    (input.visualComposition?.background?.type === 'COLOR' &&
      input.visualComposition?.background?.color) ||
    (input.visualComposition?.background?.type === 'GRADIENT' &&
      input.visualComposition?.background?.gradient?.from)
  )

  if (!hasPhoto && !hasColorBackground) {
    blockingIssues.push({
      id: 'missing-media',
      type: 'BLOCKING',
      message: 'Ajoutez une photo ou choisissez un fond pour votre publication.',
      targetType: 'SLIDES',
    })
  }

  // 4. CTA Warning (optional)
  const cta = input.cta ? input.cta.trim() : ''
  if (!cta) {
    warnings.push({
      id: 'empty-cta',
      type: 'WARNING',
      message: 'Vous pouvez ajouter un mot de fin (invitation à échanger ou lien).',
      targetType: 'CTA',
    })
  }

  return {
    ready: blockingIssues.length === 0,
    blockingIssues,
    warnings,
  }
}
