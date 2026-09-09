export type MuzaStrategicContext = {
  business: {
    name: string
    industry: string
    subindustry: string | null
    location: string | null
    description: string | null
  }

  brand: {
    positioning: string | null
    promise: string | null
    personality: string[]
    values: string[]
    signaturePhrases: string[]
    preferredVocabulary: string[]
    avoidedVocabulary: string[]
  }

  creatorConstraints: {
    weeklyMinutes: number | null
    cameraComfort: number | null
    voiceoverComfort: number | null
    writingComfort: number | null
    photoComfort: number | null
    videoComfort: number | null
    maxEffortLevel: number | null
    preferredFormats: string[]
    avoidedFormats: string[]
    barriers: string[]
    strengths: string[]
  }

  audience: {
    name: string | null
    description: string | null
    needs: string[]
    desires: string[]
    problems: string[]
    objections: string[]
    motivations: string[]
    questions: string[]
    buyingTriggers: string[]
    languagePatterns: string[]
  }

  objective: {
    type: string | null
    title: string | null
    description: string | null
    priority: number | null
    startsAt: string | null
    endsAt: string | null
  }

  offer: {
    name: string | null
    description: string | null
    cta: string | null
    benefits: string[]
    objections: string[]
    seasonality: Record<string, unknown>
    availableFrom: string | null
    availableUntil: string | null
  }

  strategicSignals: {
    hasCompleteBrand: boolean
    hasAudience: boolean
    hasActiveGoal: boolean
    hasActiveOffer: boolean
    creatorTimePressure: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN'
    cameraConstraint: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN'
  }
}
