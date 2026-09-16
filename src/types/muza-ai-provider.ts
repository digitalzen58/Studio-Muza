export type MuzaAIProvider = 'gemini' | 'openai'

export interface MuzaAIProviderConfig {
  recommendationModel: string
}

export interface MuzaAIConfig {
  recommendationProvider: MuzaAIProvider
  providers: Record<MuzaAIProvider, MuzaAIProviderConfig>
}

