/**
 * Strips recommendation engine format/category prefixes from displayed titles deterministically.
 * Preserves the underlying raw recommendation data intact.
 * Examples:
 * - "Carrousel inspiration : 3 balades d'automne..." -> "3 balades d'automne..."
 * - "Post inspiration : Les secrets du Morvan" -> "Les secrets du Morvan"
 * - "Publication : Pourquoi venir" -> "Pourquoi venir"
 */
export function sanitizeRecommendationTitle(title: string): string {
  if (!title) return ''
  return title
    .replace(/^(?:Carrousel|Post|Publication|Reel|Story|Idée|Inspiration)\s+inspiration\s*:\s*/i, '')
    .replace(/^(?:Carrousel|Post|Publication|Reel|Story|Idée|Inspiration)\s*:\s*/i, '')
    .trim()
}
