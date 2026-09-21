export type MuzaAIProvider = 'gemini' | 'openai'

export interface MuzaAIProviderConfig {
  recommendationModel: string
}

export interface MuzaAIConfig {
  recommendationProvider: MuzaAIProvider
  generationTimeoutMs: number
  providers: Record<MuzaAIProvider, MuzaAIProviderConfig>
}

