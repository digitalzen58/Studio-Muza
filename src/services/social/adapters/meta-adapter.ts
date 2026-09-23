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
 * Handles independent Instagram Professional (via Instagram Login / graph.instagram.com)
 * and Facebook Pages (via Facebook Login / graph.facebook.com) integrations.
 */
export class MetaSocialProviderAdapter implements SocialProviderAdapter {
  readonly provider = 'META' as const
  readonly graphApiVersion = 'v21.0'

  // Instagram Login Scopes for Professional accounts (Business / Creator)
  readonly instagramScopes = [
    'instagram_business_basic',
    'instagram_business_content_publish',
    'instagram_business_manage_messages',
    'instagram_business_manage_comments',
  ]

  // Facebook Login Scopes for Facebook Pages
  readonly facebookScopes = [
    'public_profile',
    'email',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
  ]

  /**
  * Returns the canonical Meta/Instagram OAuth redirect URI.
  * Ensures exact match: https://studio-muza.vercel.app/api/auth/social/meta/callback
  * with no trailing slash, no localhost fallback in production, and no host header drift.
  */
  getCanonicalRedirectUri(override?: string): string {
    if (override?.trim()) {
      return override.trim().replace(/\/+$/, '')
    }

    if (process.env.META_REDIRECT_URI?.trim()) {
      return process.env.META_REDIRECT_URI.trim().replace(/\/+$/, '')
    }

    const envUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
      process.env.NEXT_PUBLIC_APP_URL?.trim()

    if (envUrl && !envUrl.includes('localhost')) {
      const cleanBase = envUrl.replace(/\/+$/, '')
      return `${cleanBase}/api/auth/social/meta/callback`
    }

    // Default canonical production redirect URI for Studio Mūza
    return 'https://studio-muza.vercel.app/api/auth/social/meta/callback'
  }

  getAuthConfig(platform?: SocialPlatform): ProviderAuthConfig {
    const redirectUri = this.getCanonicalRedirectUri()

    if (platform === 'INSTAGRAM') {
      const appId = process.env.INSTAGRAM_APP_ID?.trim()
      const appSecret = process.env.INSTAGRAM_APP_SECRET?.trim()
      return {
        isConfigured: Boolean(appId && appSecret),
        appIdPresent: Boolean(appId),
        appSecretPresent: Boolean(appSecret),
        redirectUriPresent: Boolean(redirectUri),
      }
    }

    if (platform === 'FACEBOOK') {
      const appId = (process.env.META_APP_ID || process.env.FACEBOOK_APP_ID)?.trim()
      const appSecret = (process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET)?.trim()
      const configId = (
        process.env.META_CONFIG_ID ||
        process.env.META_BUSINESS_CONFIG_ID ||
        process.env.FACEBOOK_CONFIG_ID
      )?.trim()
      return {
        isConfigured: Boolean(appId && appSecret),
        appIdPresent: Boolean(appId),
        appSecretPresent: Boolean(appSecret),
        configIdPresent: Boolean(configId),
        redirectUriPresent: Boolean(redirectUri),
      }
    }

    const fbAppId = (process.env.META_APP_ID || process.env.FACEBOOK_APP_ID)?.trim()
    const fbAppSecret = (process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET)?.trim()
    const igAppId = process.env.INSTAGRAM_APP_ID?.trim()
    const igAppSecret = process.env.INSTAGRAM_APP_SECRET?.trim()
    const configId = (
      process.env.META_CONFIG_ID ||
      process.env.META_BUSINESS_CONFIG_ID ||
      process.env.FACEBOOK_CONFIG_ID
    )?.trim()

    const isFbConfigured = Boolean(fbAppId && fbAppSecret)
    const isIgConfigured = Boolean(igAppId && igAppSecret)

    return {
      isConfigured: isFbConfigured || isIgConfigured,
      appIdPresent: Boolean(fbAppId || igAppId),
      appSecretPresent: Boolean(fbAppSecret || igAppSecret),
      configIdPresent: Boolean(configId),
      redirectUriPresent: Boolean(redirectUri),
    }
  }

  isConfigured(platform?: SocialPlatform): boolean {
    return this.getAuthConfig(platform).isConfigured
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
    if (!this.isConfigured(params.platform)) {
      return null
    }

    const canonicalRedirectUri = this.getCanonicalRedirectUri(params.redirectUriOverride)

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

    // 1. INSTAGRAM LOGIN (Direct Instagram OAuth dialog using INSTAGRAM_APP_ID)
    if (params.platform === 'INSTAGRAM') {
      const igAppId = process.env.INSTAGRAM_APP_ID?.trim()
      if (!igAppId) return null

      const urlParams = new URLSearchParams({
        enable_fb_login: '0',
        force_authentication: '1',
        client_id: igAppId,
        redirect_uri: canonicalRedirectUri,
        response_type: 'code',
        scope: this.instagramScopes.join(','),
        state: signedState,
      })

      const authUrl = `https://www.instagram.com/oauth/authorize?${urlParams.toString()}`
      return {
        url: authUrl,
        state: signedState,
      }
    }

    // 2. FACEBOOK LOGIN (Facebook OAuth dialog using META_APP_ID)
    const fbAppId = (process.env.META_APP_ID || process.env.FACEBOOK_APP_ID)?.trim()
    if (!fbAppId) return null

    const configId = (
      process.env.META_CONFIG_ID ||
      process.env.META_BUSINESS_CONFIG_ID ||
      process.env.FACEBOOK_CONFIG_ID
    )?.trim()

    const urlParams = new URLSearchParams({
      client_id: fbAppId,
      redirect_uri: canonicalRedirectUri,
      state: signedState,
      response_type: 'code',
    })

    if (configId) {
      urlParams.set('config_id', configId)
    } else {
      urlParams.set('scope', this.facebookScopes.join(','))
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
    // 1. Verify OAuth state signature & expiration
    const state = verifyOAuthState<OAuthStatePayload>(params.state)
    if (!state) {
      return { destinations: [], error: 'Session OAuth expirée ou invalide.' }
    }

    // 2. Strict Tenant Binding Verification
    if (state.businessId !== params.currentBusinessId || state.userId !== params.currentUserId) {
      return { destinations: [], error: 'Violation d’isolation multi-tenant: état OAuth incohérent.' }
    }

    const canonicalRedirectUri = this.getCanonicalRedirectUri()

    try {
      // ----------------------------------------------------------------------
      // FLOW A: INSTAGRAM API WITH INSTAGRAM LOGIN (INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET)
      // ----------------------------------------------------------------------
      if (state.platform === 'INSTAGRAM') {
        const igAppId = process.env.INSTAGRAM_APP_ID?.trim()
        const igAppSecret = process.env.INSTAGRAM_APP_SECRET?.trim()

        if (!igAppId || !igAppSecret) {
          return {
            destinations: [],
            error: 'Configuration Instagram manquante.',
          }
        }

        // Step 1: Exchange authorization code on api.instagram.com
        const formBody = new URLSearchParams()
        formBody.set('client_id', igAppId)
        formBody.set('client_secret', igAppSecret)
        formBody.set('grant_type', 'authorization_code')
        formBody.set('redirect_uri', canonicalRedirectUri)
        formBody.set('code', params.code)

        const tokenRes = await fetch('https://api.instagram.com/oauth/access_token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formBody.toString(),
        })

        if (!tokenRes.ok) {
          const errJson = await tokenRes.json().catch(() => ({}))
          return {
            destinations: [],
            error: `Erreur d'authentification Instagram: ${errJson?.error_message || errJson?.error?.message || tokenRes.statusText}`,
          }
        }

        const tokenData = await tokenRes.json()
        const shortLivedToken = tokenData.access_token

        // Step 2: Exchange short-lived token for long-lived (60 days) token on graph.instagram.com
        const longLivedUrl = new URL('https://graph.instagram.com/access_token')
        longLivedUrl.searchParams.set('grant_type', 'ig_exchange_token')
        longLivedUrl.searchParams.set('client_secret', igAppSecret)
        longLivedUrl.searchParams.set('access_token', shortLivedToken)

        const longRes = await fetch(longLivedUrl.toString())
        let longLivedToken = shortLivedToken
        let expiresIn = 60 * 24 * 3600 // default 60 days in seconds
        if (longRes.ok) {
          const longData = await longRes.json()
          if (longData.access_token) {
            longLivedToken = longData.access_token
            expiresIn = Number(longData.expires_in) || expiresIn
          }
        }

        // Step 3: Fetch Instagram User Profile via graph.instagram.com
        const meRes = await fetch(
          `https://graph.instagram.com/${this.graphApiVersion}/me?fields=id,username,name,account_type,profile_picture_url&access_token=${longLivedToken}`
        )

        if (!meRes.ok) {
          return {
            destinations: [],
            error: 'Impossible de récupérer le profil Instagram Professionnel.',
          }
        }

        const meData = await meRes.json()
        const igId = String(meData.id)
        const encryptedToken = encryptCredential(longLivedToken)
        const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

        return {
          destinations: [
            {
              platform: 'INSTAGRAM',
              externalAccountId: igId,
              accountName: meData.username ? `@${meData.username}` : meData.name || 'Instagram',
              accountType: meData.account_type || 'BUSINESS',
              avatarUrl: meData.profile_picture_url,
              capabilities: this.getCapabilities('INSTAGRAM', meData.account_type || 'BUSINESS'),
              rawTokenEncrypted: encryptedToken,
              tokenExpiresAt,
              scopes: this.instagramScopes,
            },
          ],
        }
      }

      // ----------------------------------------------------------------------
      // FLOW B: FACEBOOK LOGIN (Facebook Pages with META_APP_ID / META_APP_SECRET)
      // ----------------------------------------------------------------------
      const fbAppId = (process.env.META_APP_ID || process.env.FACEBOOK_APP_ID)?.trim()
      const fbAppSecret = (process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET)?.trim()

      if (!fbAppId || !fbAppSecret) {
        return {
          destinations: [],
          error: 'Configuration Facebook manquante.',
        }
      }

      const tokenUrl = new URL(`https://graph.facebook.com/${this.graphApiVersion}/oauth/access_token`)
      tokenUrl.searchParams.set('client_id', fbAppId)
      tokenUrl.searchParams.set('client_secret', fbAppSecret)
      tokenUrl.searchParams.set('redirect_uri', canonicalRedirectUri)
      tokenUrl.searchParams.set('code', params.code)

      const tokenRes = await fetch(tokenUrl.toString())
      if (!tokenRes.ok) {
        const errJson = await tokenRes.json().catch(() => ({}))
        return {
          destinations: [],
          error: `Erreur d'authentification Facebook: ${errJson?.error?.message || tokenRes.statusText}`,
        }
      }

      const tokenData = await tokenRes.json()
      const shortLivedToken = tokenData.access_token

      // Exchange short-lived token for long-lived token (60 days)
      const longLivedUrl = new URL(`https://graph.facebook.com/${this.graphApiVersion}/oauth/access_token`)
      longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token')
      longLivedUrl.searchParams.set('client_id', fbAppId)
      longLivedUrl.searchParams.set('client_secret', fbAppSecret)
      longLivedUrl.searchParams.set('fb_exchange_token', shortLivedToken)

      const longRes = await fetch(longLivedUrl.toString())
      const userAccessToken = longRes.ok ? (await longRes.json()).access_token : shortLivedToken

      // Discover Facebook Pages only
      const accountsUrl = `https://graph.facebook.com/${this.graphApiVersion}/me/accounts?fields=id,name,access_token&access_token=${userAccessToken}`
      const accountsRes = await fetch(accountsUrl)

      if (!accountsRes.ok) {
        return { destinations: [], error: 'Impossible de récupérer les pages associées à votre compte Facebook.' }
      }

      const accountsData = await accountsRes.json()
      const pages = Array.isArray(accountsData.data) ? accountsData.data : []
      const destinations: DiscoveredDestination[] = pages.map((page: { id: string; name: string; access_token?: string }) => ({
        platform: 'FACEBOOK' as SocialPlatform,
        externalAccountId: page.id,
        accountName: page.name,
        accountType: 'PAGE',
        capabilities: this.getCapabilities('FACEBOOK', 'PAGE'),
        rawTokenEncrypted: encryptCredential(page.access_token || userAccessToken),
        scopes: this.facebookScopes,
      }))

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
    platform: SocialPlatform = 'FACEBOOK'
  ): Promise<{
    isValid: boolean
    isAuthError?: boolean
    accountName?: string
    error?: string
  }> {
    try {
      const token = accessTokenEncrypted // decrypted in service layer
      if (!token) {
        return { isValid: false, isAuthError: true, error: 'Token manquant.' }
      }

      // ----------------------------------------------------------------------
      // VERIFY INSTAGRAM: Direct query to graph.instagram.com /me
      // ----------------------------------------------------------------------
      if (platform === 'INSTAGRAM') {
        const verifyUrl = `https://graph.instagram.com/${this.graphApiVersion}/me?fields=id,username,name,account_type&access_token=${encodeURIComponent(token)}`
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
        if (!data || typeof data !== 'object' || String(data.id) !== externalAccountId) {
          return {
            isValid: false,
            isAuthError: false,
            error: 'Identifiant de compte Instagram incohérent.',
          }
        }

        const accountName = data.username ? `@${data.username}` : data.name
        return {
          isValid: true,
          isAuthError: false,
          accountName,
        }
      }

      // ----------------------------------------------------------------------
      // VERIFY FACEBOOK: Direct query to graph.facebook.com /{page_id}
      // ----------------------------------------------------------------------
      const verifyUrl = `https://graph.facebook.com/${this.graphApiVersion}/${encodeURIComponent(externalAccountId)}?fields=id,name&access_token=${encodeURIComponent(token)}`
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
      if (!data || typeof data !== 'object' || String(data.id) !== externalAccountId) {
        return {
          isValid: false,
          isAuthError: false,
          error: 'Identifiant de Page Facebook incohérent.',
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

