import crypto from 'node:crypto'
import {
  type SocialCapabilities,
  type ProviderAuthConfig,
  type AuthUrlResult,
  type OAuthStatePayload,
  type SocialPlatform,
} from '../types'
import {
  type SocialProviderAdapter,
  type AuthorizationParams,
  type CallbackExchangeParams,
  type DiscoveredDestination,
} from './interface'
import { signOAuthState, verifyOAuthState, encryptCredential } from '../crypto'

/**
 * Meta Social Provider Adapter
 * Handles Instagram Professional / Facebook Page integrations via Meta Graph API v21.0.
 */
export class MetaSocialProviderAdapter implements SocialProviderAdapter {
  readonly provider = 'META' as const
  readonly graphApiVersion = 'v21.0'

  // Default Meta scopes needed for Instagram & Facebook publishing
  readonly defaultScopes = [
    'public_profile',
    'email',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
    'instagram_basic',
    'instagram_content_publish',
    'business_management',
  ]

  getAuthConfig(): ProviderAuthConfig {
    const appId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID
    const appSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET
    const configId =
      process.env.META_CONFIG_ID ||
      process.env.META_BUSINESS_CONFIG_ID ||
      process.env.FACEBOOK_CONFIG_ID
    const redirectUri =
      process.env.META_REDIRECT_URI ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL

    return {
      isConfigured: Boolean(appId && appSecret),
      appIdPresent: Boolean(appId),
      appSecretPresent: Boolean(appSecret),
      configIdPresent: Boolean(configId),
      redirectUriPresent: Boolean(redirectUri),
    }
  }

  isConfigured(): boolean {
    return this.getAuthConfig().isConfigured
  }

  getCapabilities(platform: SocialPlatform, accountType?: string): SocialCapabilities {
    if (platform === 'INSTAGRAM') {
      const isProfessional = accountType === 'BUSINESS' || accountType === 'CREATOR'
      return {
        canPublishPosts: isProfessional,
        canPublishCarousels: isProfessional,
        canPublishShortVideo: isProfessional,
        canReadInsights: isProfessional,
      }
    }

    if (platform === 'FACEBOOK') {
      return {
        canPublishPosts: true,
        canPublishCarousels: true,
        canPublishShortVideo: true,
        canReadInsights: true,
      }
    }

    return {
      canPublishPosts: false,
      canPublishCarousels: false,
      canPublishShortVideo: false,
      canReadInsights: false,
    }
  }

  async getAuthorizationUrl(params: AuthorizationParams): Promise<AuthUrlResult | null> {
    if (!this.isConfigured()) {
      return null
    }

    const appId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID
    const configId =
      process.env.META_CONFIG_ID ||
      process.env.META_BUSINESS_CONFIG_ID ||
      process.env.FACEBOOK_CONFIG_ID
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000'
    const baseRedirect =
      params.redirectUriOverride ||
      process.env.META_REDIRECT_URI ||
      `${siteUrl.replace(/\/$/, '')}/api/auth/social/meta/callback`

    // Generate tamper-proof OAuth state
    const now = Date.now()
    const statePayload: OAuthStatePayload = {
      userId: params.userId,
      businessId: params.businessId,
      provider: 'META',
      platform: params.platform,
      nonce: crypto.randomBytes(16).toString('hex'),
      createdAt: now,
      expiresAt: now + 10 * 60 * 1000, // 10 minutes validity
    }

    const signedState = signOAuthState(statePayload as unknown as Record<string, unknown>)

    const urlParams = new URLSearchParams({
      client_id: appId!,
      redirect_uri: baseRedirect,
      state: signedState,
      response_type: 'code',
    })

    if (configId) {
      urlParams.set('config_id', configId)
    } else {
      urlParams.set('scope', this.defaultScopes.join(','))
    }

    const authUrl = `https://www.facebook.com/${this.graphApiVersion}/dialog/oauth?${urlParams.toString()}`

    return {
      url: authUrl,
      state: signedState,
    }
  }

  async handleAuthorizationCallback(params: CallbackExchangeParams): Promise<{
    destinations: DiscoveredDestination[]
    error?: string
  }> {
    if (!this.isConfigured()) {
      return { destinations: [], error: 'Meta Provider credentials not configured.' }
    }

    // 1. Verify OAuth state signature & expiration
    const state = verifyOAuthState<OAuthStatePayload>(params.state)
    if (!state) {
      return { destinations: [], error: 'Session OAuth expirée ou invalide.' }
    }

    // 2. Strict Tenant Binding Verification
    if (state.businessId !== params.currentBusinessId || state.userId !== params.currentUserId) {
      return { destinations: [], error: 'Violation d’isolation multi-tenant: état OAuth incohérent.' }
    }

    const appId = process.env.META_APP_ID || process.env.FACEBOOK_APP_ID
    const appSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000'
    const redirectUri =
      process.env.META_REDIRECT_URI ||
      `${siteUrl.replace(/\/$/, '')}/api/auth/social/meta/callback`

    try {
      // 3. Exchange code for short-lived user access token
      const tokenUrl = new URL(`https://graph.facebook.com/${this.graphApiVersion}/oauth/access_token`)
      tokenUrl.searchParams.set('client_id', appId!)
      tokenUrl.searchParams.set('client_secret', appSecret!)
      tokenUrl.searchParams.set('redirect_uri', redirectUri)
      tokenUrl.searchParams.set('code', params.code)

      const tokenRes = await fetch(tokenUrl.toString())
      if (!tokenRes.ok) {
        const errJson = await tokenRes.json().catch(() => ({}))
        return {
          destinations: [],
          error: `Erreur d'authentification Meta: ${errJson?.error?.message || tokenRes.statusText}`,
        }
      }

      const tokenData = await tokenRes.json()
      const shortLivedToken = tokenData.access_token

      // 4. Exchange short-lived token for long-lived token (60 days)
      const longLivedUrl = new URL(`https://graph.facebook.com/${this.graphApiVersion}/oauth/access_token`)
      longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token')
      longLivedUrl.searchParams.set('client_id', appId!)
      longLivedUrl.searchParams.set('client_secret', appSecret!)
      longLivedUrl.searchParams.set('fb_exchange_token', shortLivedToken)

      const longRes = await fetch(longLivedUrl.toString())
      const userAccessToken = longRes.ok ? (await longRes.json()).access_token : shortLivedToken

      // 5. Discover eligible Facebook Pages and linked Instagram Business Accounts
      const accountsUrl = `https://graph.facebook.com/${this.graphApiVersion}/me/accounts?fields=id,name,access_token,instagram_business_account{id,username,name,profile_picture_url}&access_token=${userAccessToken}`
      const accountsRes = await fetch(accountsUrl)

      if (!accountsRes.ok) {
        return { destinations: [], error: 'Impossible de récupérer les pages associées à votre compte Meta.' }
      }

      const accountsData = await accountsRes.json()
      const pages = Array.isArray(accountsData.data) ? accountsData.data : []
      const destinations: DiscoveredDestination[] = []

      for (const page of pages) {
        const pageToken = page.access_token || userAccessToken
        const encryptedPageToken = encryptCredential(pageToken)

        // Add Facebook Page destination
        destinations.push({
          platform: 'FACEBOOK',
          externalAccountId: page.id,
          accountName: page.name,
          accountType: 'PAGE',
          capabilities: this.getCapabilities('FACEBOOK', 'PAGE'),
          rawTokenEncrypted: encryptedPageToken,
          scopes: this.defaultScopes,
        })

        // Check if Instagram Business Account is linked to this page
        if (page.instagram_business_account) {
          const ig = page.instagram_business_account
          destinations.push({
            platform: 'INSTAGRAM',
            externalAccountId: ig.id,
            accountName: ig.username ? `@${ig.username}` : ig.name || 'Instagram Pro',
            accountType: 'BUSINESS',
            capabilities: this.getCapabilities('INSTAGRAM', 'BUSINESS'),
            rawTokenEncrypted: encryptedPageToken,
            scopes: this.defaultScopes,
          })
        }
      }

      return { destinations }
    } catch (err) {
      console.error('Meta OAuth callback exception:', err)
      return {
        destinations: [],
        error: err instanceof Error ? err.message : 'Erreur inattendue lors de la connexion Meta.',
      }
    }
  }

  async verifyConnection(
    accessTokenEncrypted: string,
    externalAccountId: string,
    platform: SocialPlatform = 'FACEBOOK',
    parentPageId?: string
  ): Promise<{
    isValid: boolean
    isAuthError?: boolean
    accountName?: string
    error?: string
  }> {
    if (!this.isConfigured()) {
      return { isValid: false, isAuthError: false, error: 'Configuration Meta manquante.' }
    }

    try {
      const token = accessTokenEncrypted // decrypted in service layer

      // Platform specific validation endpoints:
      // FACEBOOK: Check page node directly
      // INSTAGRAM: Check linked page node containing instagram_business_account
      let verifyUrl: string
      if (platform === 'INSTAGRAM') {
        const targetPage = parentPageId || 'me'
        verifyUrl = `https://graph.facebook.com/${this.graphApiVersion}/${encodeURIComponent(targetPage)}?fields=id,instagram_business_account{id,username}&access_token=${encodeURIComponent(token)}`
      } else {
        verifyUrl = `https://graph.facebook.com/${this.graphApiVersion}/${encodeURIComponent(externalAccountId)}?fields=id,name&access_token=${encodeURIComponent(token)}`
      }

      const res = await fetch(verifyUrl)

      if (!res.ok) {
        let isAuthError = false
        try {
          const errData = await res.json()
          const errObj = errData?.error
          if (errObj) {
            const code = Number(errObj.code)
            const subcode = Number(errObj.error_subcode)
            const type = String(errObj.type || '')

            // Known Meta OAuth token expiration/revocation indicators:
            // 190: Invalid OAuth 2.0 Access Token
            // 102: Session key invalid
            // 458, 459, 460, 463, 467, 490, 491, 492: User revoked or token expired
            if (
              code === 190 ||
              [102, 458, 463, 467].includes(code) ||
              [458, 459, 460, 463, 467, 490, 491, 492].includes(subcode) ||
              (type === 'OAuthException' && code !== 100 && code !== 1 && code !== 2 && (!code || code === 190))
            ) {
              isAuthError = true
            }
          }
        } catch {
          if (res.status === 401) {
            isAuthError = true
          }
        }

        if (isAuthError) {
          return { isValid: false, isAuthError: true, error: 'Autorisation à renouveler.' }
        }

        return {
          isValid: false,
          isAuthError: false,
          error: 'Impossible de vérifier la connexion pour le moment.',
        }
      }

      const data = await res.json()

      if (!data || typeof data !== 'object') {
        return {
          isValid: false,
          isAuthError: false,
          error: 'Impossible de vérifier la connexion pour le moment.',
        }
      }

      if (platform === 'INSTAGRAM') {
        const ig = data.instagram_business_account
        if (!ig || typeof ig !== 'object' || ig.id !== externalAccountId) {
          return {
            isValid: false,
            isAuthError: false,
            error: "Le compte Instagram n'est plus relié à cette Page Facebook.",
          }
        }

        const accountName = ig.username ? `@${ig.username}` : undefined
        return {
          isValid: true,
          isAuthError: false,
          accountName,
        }
      }

      // FACEBOOK
      if (data.id !== externalAccountId) {
        return {
          isValid: false,
          isAuthError: false,
          error: 'Impossible de vérifier la connexion pour le moment.',
        }
      }

      return {
        isValid: true,
        isAuthError: false,
        accountName: data.name,
      }
    } catch {
      return {
        isValid: false,
        isAuthError: false,
        error: 'Impossible de vérifier la connexion pour le moment.',
      }
    }
  }
}

export const metaSocialAdapter = new MetaSocialProviderAdapter()
