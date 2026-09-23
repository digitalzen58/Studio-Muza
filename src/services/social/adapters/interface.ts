import {
  type SocialProvider,
  type SocialPlatform,
  type SocialCapabilities,
  type ProviderAuthConfig,
  type AuthUrlResult,
} from '../types'

export interface AuthorizationParams {
  userId: string
  businessId: string
  platform: SocialPlatform
  redirectUriOverride?: string
}

export interface CallbackExchangeParams {
  code: string
  state: string
  currentUserId: string
  currentBusinessId: string
}

export interface DiscoveredDestination {
  platform: SocialPlatform
  externalAccountId: string
  accountName: string
  accountType?: string
  avatarUrl?: string
  capabilities: SocialCapabilities
  rawTokenEncrypted: string
  tokenExpiresAt?: string | null
  scopes: string[]
}

export interface SocialProviderAdapter {
  readonly provider: SocialProvider
  getAuthConfig(): ProviderAuthConfig
  isConfigured(): boolean
  getAuthorizationUrl(params: AuthorizationParams): Promise<AuthUrlResult | null>
  handleAuthorizationCallback(params: CallbackExchangeParams): Promise<{
    destinations: DiscoveredDestination[]
    error?: string
  }>
  verifyConnection(
    accessTokenEncrypted: string,
    externalAccountId: string,
    platform?: SocialPlatform
  ): Promise<{
    isValid: boolean
    isAuthError?: boolean
    accountName?: string
    error?: string
  }>
  getCapabilities(platform: SocialPlatform, accountType?: string): SocialCapabilities
}
