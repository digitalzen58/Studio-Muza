/**
 * Pure deterministic normalization utility for Editorial Memory & Concept Fingerprinting.
 * Converts raw editorial dimensions (topics and angles) into stable machine-friendly tokens,
 * and derives canonical concept keys server-side.
 */

/**
 * Normalizes a single editorial dimension string conservatively and deterministically.
 * Performs trimming, lowercasing, Unicode diacritics removal (NFD), collapsing whitespace into '_',
 * and stripping non-alphanumeric characters.
 *
 * @param value Raw string input (e.g. "Chien mascotte", "Directeur du gîte")
 * @returns Normalized machine-friendly string (e.g. "chien_mascotte", "directeur_du_gite")
 */
export function normalizeEditorialDimension(value: string): string {
  if (!value) return ''

  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Strip diacritics/accents
    .replace(/[^a-z0-9\s_-]/g, '')   // Remove punctuation & non-alphanumeric except spaces, hyphens, underscores
    .replace(/[\s-]+/g, '_')         // Collapse whitespace and hyphens to underscores
    .replace(/^_|_$/g, '')           // Strip leading/trailing underscores
}

/**
 * Derives a deterministic canonical conceptKey from an editorialTopic and editorialAngle.
 * Owned server-side to guarantee stable concept keys across AI provider variants.
 *
 * @param topic Raw editorial topic (e.g. "Chien mascotte")
 * @param angle Raw editorial angle (e.g. "Directeur du gîte")
 * @returns Canonical fingerprint (e.g. "chien_mascotte::directeur_du_gite")
 */
export function buildEditorialConceptKey(topic: string, angle: string): string {
  const normTopic = normalizeEditorialDimension(topic)
  const normAngle = normalizeEditorialDimension(angle)
  return `${normTopic}::${normAngle}`
}
