export const MUZA_RECOMMENDATION_RULES = {
  minRecommendations: 3,
  maxRecommendations: 5,
  maxReasonsPerRecommendation: 4,
  maxSuggestedFormats: 3,
  defaultEstimatedEffortMinutes: null,
} as const

export const MUZA_REASONING_PRINCIPLES = [
  'Prefer recommendations that directly support the active business objective.',
  'Respect creator time, camera comfort, preferred formats and effort constraints.',
  'Prioritize audience relevance over generic social media trends.',
  'Explain why each recommendation is relevant now.',
  'Avoid recommending the same content angle repeatedly.',
  'Prefer actionable recommendations that can realistically be executed.',
  'Use the active offer only when commercially relevant.',
  'Balance visibility, conversion, trust and engagement instead of optimizing a single metric blindly.',
  'Never invent business facts that are absent from the provided strategic context.',
  'Recommendations must remain consistent with the brand positioning, vocabulary and communication constraints.',
] as const
