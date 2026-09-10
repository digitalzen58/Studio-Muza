export type MuzaBusinessModel =
  | 'LOCAL_SERVICE'
  | 'HOSPITALITY'
  | 'RETAIL'
  | 'ECOMMERCE'
  | 'PROFESSIONAL_SERVICE'
  | 'CREATOR_EXPERT'
  | 'FOOD_BEVERAGE'
  | 'HEALTH_WELLNESS'
  | 'ARTISAN'
  | 'OTHER'

export type MuzaIndustryPlaybook = {
  id: string

  industry: string
  subindustries: string[]

  businessModel: MuzaBusinessModel

  typicalObjectives: string[]

  customerDecisionFactors: string[]

  trustDrivers: string[]

  conversionActions: string[]

  contentPillars: string[]

  usefulProof: string[]

  commonObjections: string[]

  seasonalFactors: string[]

  localVisibilityImportance:
    | 'LOW'
    | 'MEDIUM'
    | 'HIGH'

  seoImportance:
    | 'LOW'
    | 'MEDIUM'
    | 'HIGH'

  recommendedChannels: string[]

  usefulContentFormats: string[]

  strategicOpportunities: string[]

  strategicRisks: string[]
}
