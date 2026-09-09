export type MuzaContext = {
  business: {
    id: string
    name: string
    industry: string
    subindustry: string | null
    description: string | null
    websiteUrl: string | null
    countryCode: string | null
    region: string | null
    city: string | null
  }

  brand: {
    positioning: string | null
    promise: string | null
    story: string | null
    personality: unknown[]
    values: unknown[]
    tone: Record<string, unknown>
    preferredVocabulary: unknown[]
    avoidedVocabulary: unknown[]
    signaturePhrases: unknown[]
    communicationDo: unknown[]
    communicationDont: unknown[]
  } | null

  creator: {
    weeklyMinutes: number | null
    cameraComfort: number | null
    voiceoverComfort: number | null
    writingComfort: number | null
    photoComfort: number | null
    videoComfort: number | null
    socialSkillLevel: string | null
    preferredFormats: unknown[]
    avoidedFormats: unknown[]
    barriers: unknown[]
    strengths: unknown[]
    maxEffortLevel: number | null
  } | null

  audience: {
    id: string
    name: string
    description: string | null
    needs: unknown[]
    desires: unknown[]
    problems: unknown[]
    objections: unknown[]
    motivations: unknown[]
    questions: unknown[]
    buyingTriggers: unknown[]
    languagePatterns: unknown[]
    priority: number
  } | null

  goal: {
    id: string
    type: string
    title: string
    description: string | null
    metric: string | null
    targetValue: number | null
    priority: number
    startsAt: string | null
    endsAt: string | null
  } | null

  offer: {
    id: string
    name: string
    description: string | null
    priceFrom: number | null
    priceTo: number | null
    currency: string | null
    url: string | null
    cta: string | null
    benefits: unknown[]
    objections: unknown[]
    seasonality: Record<string, unknown>
    availableFrom: string | null
    availableUntil: string | null
    priority: number
  } | null
}
