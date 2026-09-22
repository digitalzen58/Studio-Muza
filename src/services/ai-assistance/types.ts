export type WritingOperation =
  | 'HELP_WRITE'
  | 'SUGGEST_HOOKS'
  | 'IMPROVE_TEXT'
  | 'SHORTEN_TEXT'

export type WritingTargetType =
  | 'HOOK'
  | 'CAROUSEL_SLIDE'
  | 'CAPTION'

export interface WritingAssistanceRequestPayload {
  contentId: string
  operation: WritingOperation
  targetType: WritingTargetType
  targetIndex?: number
  currentText: string
  slideContext?: {
    label?: string
    hasStockMedia?: boolean
  }
}

export interface WritingAssistanceUsage {
  provider: string
  model: string
  operation: WritingOperation
  targetType: WritingTargetType
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  latencyMs: number
}

export type WritingAssistanceResult =
  | {
      success: true
      operation: WritingOperation
      targetType: WritingTargetType
      targetIndex?: number
      originalTextHash: string
      options: string[]
      usage?: WritingAssistanceUsage
    }
  | {
      success: false
      operation: WritingOperation
      targetType: WritingTargetType
      targetIndex?: number
      message: string
      originalTextHash?: string
    }
