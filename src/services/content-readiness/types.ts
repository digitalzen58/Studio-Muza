export type SocialPlatform = 'INSTAGRAM' | 'FACEBOOK' | 'LINKEDIN' | 'TIKTOK' | 'YOUTUBE_SHORTS'

export type ContentFormat = 'POST' | 'CAROUSEL' | 'REEL' | 'STORY' | 'SHORT'

export const FORMAT_PLATFORM_COMPATIBILITY: Record<ContentFormat, readonly SocialPlatform[]> = {
  POST: ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN'],
  CAROUSEL: ['INSTAGRAM', 'LINKEDIN', 'FACEBOOK'],
  REEL: ['INSTAGRAM', 'FACEBOOK'],
  STORY: ['INSTAGRAM', 'FACEBOOK'],
  SHORT: ['TIKTOK', 'YOUTUBE_SHORTS', 'INSTAGRAM'],
} as const

export function isPlatformCompatible(format: ContentFormat, platform: SocialPlatform): boolean {
  const compatibleList = FORMAT_PLATFORM_COMPATIBILITY[format]
  return compatibleList ? compatibleList.includes(platform) : false
}

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
