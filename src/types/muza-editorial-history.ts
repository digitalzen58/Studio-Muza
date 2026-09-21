/**
 * Typed model representing a historical recommendation for editorial memory reasoning.
 */
export type EditorialHistoryRecommendation = {
  id: string
  title: string
  editorialTopic: string | null
  editorialAngle: string | null
  conceptKey: string | null
  status: string
  createdAt: string
}

/**
 * Typed model representing a published content item for editorial memory reasoning.
 */
export type EditorialHistoryContent = {
  id: string
  recommendationId: string | null
  topic: string | null
  angle: string | null
  sourceConceptKey: string | null
  publishedAt: string
}

/**
 * Rich internal editorial history payload attached to MuzaReasoningContext.
 * Collects evidence across recent active recommendations, rejected recommendations, and published contents.
 */
export type MuzaEditorialHistory = {
  recentRecommendations: EditorialHistoryRecommendation[]
  rejectedRecommendations: EditorialHistoryRecommendation[]
  publishedContents: EditorialHistoryContent[]
}

/**
 * Compact token-efficient editorial memory representation for AI provider payload projection.
 * Strips database IDs, full prose, reasons, and duplicate concepts to optimize token usage.
 */
export type MuzaCompactEditorialMemory = {
  recentConcepts: Array<{
    conceptKey: string
    topic: string
    angle: string
    status: string
  }>
  rejectedConcepts: Array<{
    conceptKey: string
    topic: string
    angle: string
  }>
  publishedConcepts: Array<{
    conceptKey: string
    topic: string
    angle: string
    publishedAt: string
  }>
}
