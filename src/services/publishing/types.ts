export type PublishingDestinationPlatform = 'INSTAGRAM' | 'FACEBOOK'

export interface ConnectedDestinationSummary {
  platform: PublishingDestinationPlatform
  socialAccountId: string
  accountName: string
  accountType?: string | null
  isConnected: boolean
}

export interface PublishingReadinessInfo {
  canPublish: boolean
  contentId: string
  workingTitle: string
  caption?: string | null
  hasMedia: boolean
  mediaAssetId?: string | null
  mediaUrl?: string | null
  availableDestinations: ConnectedDestinationSummary[]
  blockingIssues: string[]
}

export interface DestinationPublishResult {
  platform: PublishingDestinationPlatform
  socialAccountId: string
  accountName: string
  status: 'PUBLISHED' | 'FAILED'
  publishJobId: string
  platformPostId?: string
  platformPostUrl?: string
  errorMessage?: string
}

export type OverallPublishStatus = 'ALL_SUCCESS' | 'PARTIAL_SUCCESS' | 'ALL_FAILED'

export interface PublishContentImmediatelyResult {
  success: boolean
  overallStatus: OverallPublishStatus
  contentId: string
  destinations: DestinationPublishResult[]
  message: string
}
