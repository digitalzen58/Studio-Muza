import type {
  ContentReadinessInput,
  ContentReadinessResult,
  ReadinessIssue,
} from './types'

/**
 * Validates deterministic editorial readiness of an Instagram Carousel draft.
 * Strictly 0 AI calls.
 *
 * Rules:
 * - BLOCKING:
 *   1. Working title / topic missing
 *   2. Hook missing or < 5 characters
 *   3. Fewer than 2 slides
 *   4. Any slide has empty text
 *
 * - WARNINGS:
 *   1. Caption missing
 *   2. CTA missing
 *   3. One or more slides have no media assigned
 */
export function validateCarouselReadiness(
  input: ContentReadinessInput
): ContentReadinessResult {
  const blockingIssues: ReadinessIssue[] = []
  const warnings: ReadinessIssue[] = []

  // 1. Working title
  const title = input.workingTitle ? input.workingTitle.trim() : ''
  if (!title) {
    blockingIssues.push({
      id: 'missing-title',
      type: 'BLOCKING',
      message: 'Donnez un titre ou sujet à votre contenu.',
      targetType: 'TITLE',
    })
  }

  // 2. Hook
  const hook = input.hook ? input.hook.trim() : ''
  if (!hook || hook.length < 5) {
    blockingIssues.push({
      id: 'missing-hook',
      type: 'BLOCKING',
      message: 'Ajoutez une accroche pour donner envie de lire.',
      targetType: 'HOOK',
    })
  }

  // 3. Slides count and completeness
  const slides = Array.isArray(input.slides) ? input.slides : []
  if (slides.length < 2) {
    blockingIssues.push({
      id: 'insufficient-slides',
      type: 'BLOCKING',
      message: 'Un carrousel nécessite au moins 2 pages.',
      targetType: 'SLIDES',
    })
  } else {
    for (const slide of slides) {
      const slideText = slide.text ? slide.text.trim() : ''
      if (!slideText) {
        blockingIssues.push({
          id: `empty-slide-${slide.index}`,
          type: 'BLOCKING',
          message: `Il manque du texte à la page ${slide.index}.`,
          targetType: 'SLIDES',
          targetIndex: slide.index,
        })
      }
    }
  }

  // 4. Warnings (do not block planning)
  // 4a. Caption warning
  const caption = input.caption ? input.caption.trim() : ''
  if (!caption) {
    warnings.push({
      id: 'empty-caption',
      type: 'WARNING',
      message: 'Vous n’avez pas encore rédigé de texte d’accompagnement (légende).',
      targetType: 'CAPTION',
    })
  }

  // 4b. CTA warning
  const cta = input.cta ? input.cta.trim() : ''
  if (!cta) {
    warnings.push({
      id: 'empty-cta',
      type: 'WARNING',
      message: 'Vous pouvez ajouter un mot de fin (invitation à échanger ou lien).',
      targetType: 'CTA',
    })
  }

  // 4c. Media warning
  if (slides.length > 0) {
    const unassignedSlides = slides.filter((s) => !s.media_id)
    if (unassignedSlides.length > 0) {
      const pageList = unassignedSlides.map((s) => s.index).join(', ')
      warnings.push({
        id: 'missing-media',
        type: 'WARNING',
        message: unassignedSlides.length === 1
          ? `Vous n’avez pas encore ajouté de photo à la page ${unassignedSlides[0].index}.`
          : `Vous n’avez pas encore ajouté de photo aux pages ${pageList}.`,
        targetType: 'SLIDES',
      })
    }
  }

  return {
    ready: blockingIssues.length === 0,
    blockingIssues,
    warnings,
  }
}
