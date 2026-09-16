import { MuzaAIConfig } from '@/types/muza-ai-provider'

/**
 * Centralized AI configuration for Mūza recommendation engine and models.
 */
export const MUZA_AI_CONFIG = {
  recommendationProvider: 'gemini',
  providers: {
    gemini: {
      recommendationModel: 'gemini-3.6-flash',
    },
    openai: {
      recommendationModel: 'gpt-5.6-terra',
    },
  },
} as const satisfies MuzaAIConfig

