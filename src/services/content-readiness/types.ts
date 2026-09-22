export type ReadinessIssueType = 'BLOCKING' | 'WARNING'

export type ReadinessTargetType = 'TITLE' | 'HOOK' | 'SLIDES' | 'CAPTION' | 'CTA'

export interface ReadinessIssue {
  id: string
  type: ReadinessIssueType
  message: string
  targetType: ReadinessTargetType
  targetIndex?: number
}

export interface ContentReadinessInput {
  workingTitle?: string | null
  hook?: string | null
  slides?: Array<{
    index: number
    type?: string
    label?: string
    text: string
    media_id?: string | null
  }>
  caption?: string | null
  cta?: string | null
}

export interface ContentReadinessResult {
  ready: boolean
  blockingIssues: ReadinessIssue[]
  warnings: ReadinessIssue[]
}
