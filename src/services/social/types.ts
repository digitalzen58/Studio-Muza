/**
 * Studio Mūza — Social Accounts Domain Types
 * Defines provider abstractions, supported platforms, capabilities, and connection states.
 */

export type SocialProvider = 'META' | 'LINKEDIN' | 'TIKTOK' | 'GOOGLE'

export type SocialPlatform = 'INSTAGRAM' | 'FACEBOOK' | 'LINKEDIN' | 'TIKTOK' | 'YOUTUBE'

export type SocialConnectionStatus = 'CONNECTED' | 'REAUTH_REQUIRED' | 'DISCONNECTED' | 'ERROR'

export interface SocialCapabilities {
  canPublishPosts: boolean
  canPublishCarousels: boolean
  canPublishShortVideo: boolean
  canReadInsights: boolean
}

export interface SocialAccountSummary {
  id: string
  businessId: string
  provider: SocialProvider
  platform: SocialPlatform
  externalAccountId: string
  accountName: string | null
  accountType: string | null
  status: SocialConnectionStatus
  capabilities: SocialCapabilities
  scopes: string[]
  connectedAt: string
  lastVerifiedAt: string | null
}

export interface SaveSocialAccountInput {
  businessId: string
  provider: SocialProvider
  platform: SocialPlatform
  externalAccountId: string
  accountName?: string | null
  accountType?: string | null
  accessTokenEncrypted?: string | null
  refreshTokenEncrypted?: string | null
  tokenExpiresAt?: string | null
  scopes?: string[]
  capabilities?: Partial<SocialCapabilities>
  status?: SocialConnectionStatus
}

export interface ProviderAuthConfig {
  isConfigured: boolean
  appIdPresent: boolean
  appSecretPresent: boolean
  configIdPresent?: boolean
  redirectUriPresent: boolean
}

export interface AuthUrlResult {
  url: string
  state: string
}

export interface OAuthStatePayload {
  userId: string
  businessId: string
  provider: SocialProvider
  platform: SocialPlatform
  nonce: string
  createdAt: number
  expiresAt: number
}
