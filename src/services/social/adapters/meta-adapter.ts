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
      scope: this.facebookScopes.join(','),
    })

    if (configId) {
      urlParams.set('config_id', configId)
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

        const cleanCode = params.code.trim().replace(/#_$/, '')

        // Step 1: Exchange authorization code on api.instagram.com
        const formBody = new URLSearchParams()
        formBody.set('client_id', igAppId)
        formBody.set('client_secret', igAppSecret)
        formBody.set('grant_type', 'authorization_code')
        formBody.set('redirect_uri', canonicalRedirectUri)
        formBody.set('code', cleanCode)

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
        // Note: Instagram User node supports id, user_id, username, account_type, profile_picture_url (NOT name)
        let meData: {
          id?: string | number
          user_id?: string | number
          username?: string
          account_type?: string
          profile_picture_url?: string
        } | null = null

        const meRes = await fetch(
          `https://graph.instagram.com/${this.graphApiVersion}/me?fields=id,user_id,username,account_type,profile_picture_url&access_token=${encodeURIComponent(longLivedToken)}`
        )

        if (meRes.ok) {
          meData = await meRes.json()
        } else {
          // Fallback with minimal core fields (id, username, account_type)
          const fallbackRes = await fetch(
            `https://graph.instagram.com/${this.graphApiVersion}/me?fields=id,username,account_type&access_token=${encodeURIComponent(longLivedToken)}`
          )
          if (fallbackRes.ok) {
            meData = await fallbackRes.json()
          } else {
            // Further fallback with basic id, username
            const basicRes = await fetch(
              `https://graph.instagram.com/${this.graphApiVersion}/me?fields=id,username&access_token=${encodeURIComponent(longLivedToken)}`
            )
            if (basicRes.ok) {
              meData = await basicRes.json()
            }
          }
        }

        if (!meData || (!meData.id && !tokenData.user_id)) {
          return {
            destinations: [],
            error: 'Impossible de récupérer le profil Instagram Professionnel.',
          }
        }

        const igId = String(meData.id || meData.user_id || tokenData.user_id)
        const username = meData.username
          ? (meData.username.startsWith('@') ? meData.username : `@${meData.username}`)
          : 'Instagram'
        const accountType = meData.account_type || 'BUSINESS'
        const encryptedToken = encryptCredential(longLivedToken)
        const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString()

        return {
          destinations: [
            {
              platform: 'INSTAGRAM',
              externalAccountId: igId,
              accountName: username,
              accountType,
              avatarUrl: meData.profile_picture_url,
              capabilities: this.getCapabilities('INSTAGRAM', accountType),
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

      // Discover Facebook Pages only - Request access_token, tasks, category
      const accountsUrl = `https://graph.facebook.com/${this.graphApiVersion}/me/accounts?fields=id,name,access_token,tasks,category&access_token=${userAccessToken}`
      const accountsRes = await fetch(accountsUrl)

      if (!accountsRes.ok) {
        return { destinations: [], error: 'Impossible de récupérer les pages associées à votre compte Facebook.' }
      }

      const accountsData = await accountsRes.json()
      const pages = Array.isArray(accountsData.data) ? accountsData.data : []
      const validPages = pages.filter((page: { id?: string | number; name?: string; access_token?: string }) => Boolean(page.id && page.access_token))

      if (validPages.length === 0) {
        return {
          destinations: [],
          error: 'Aucune Page Facebook avec droit de gestion trouvée. Veuillez cocher votre Page et autoriser sa gestion lors de la connexion Facebook.',
        }
      }

      // Strictly store the PAGE ACCESS TOKEN in rawTokenEncrypted for each Page
      const destinations: DiscoveredDestination[] = validPages.map((page: { id: string | number; name: string; access_token: string }) => ({
        platform: 'FACEBOOK' as SocialPlatform,
        externalAccountId: String(page.id),
        accountName: page.name,
        accountType: 'PAGE',
        capabilities: this.getCapabilities('FACEBOOK', 'PAGE'),
        rawTokenEncrypted: encryptCredential(page.access_token),
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
    grantedPermissions?: string[]
  }> {
    try {
      const token = accessTokenEncrypted // decrypted in service layer
      if (!token) {
        return {
          isValid: false,
          isAuthError: true,
          error: 'Jeton d’accès manquant. Veuillez reconnecter votre compte.',
        }
      }

      const isMetaAuthErrorCode = (code: number, subcode?: number, type?: string) => {
        if (code === 1 || code === 2 || code === 100) return false
        return (
          code === 190 ||
          code === 200 ||
          code === 10 ||
          [102, 458, 463, 467].includes(code) ||
          [458, 459, 460, 463, 467, 490, 491, 492].includes(subcode || 0) ||
          (type === 'OAuthException' && (!code || code === 190))
        )
      }

      // ----------------------------------------------------------------------
      // VERIFY INSTAGRAM: Direct query to graph.instagram.com
      // ----------------------------------------------------------------------
      if (platform === 'INSTAGRAM') {
        let meData: { id?: string | number; user_id?: string | number; username?: string; account_type?: string } | null = null
        let isAuthError = false

        // Attempt 1: Standard id, username, account_type
        const verifyUrl = `https://graph.instagram.com/${this.graphApiVersion}/me?fields=id,username,account_type&access_token=${encodeURIComponent(token)}`
        let res = await fetch(verifyUrl)

        if (!res.ok && res.status === 400) {
          // Attempt 2: Minimal fallback id, username (in case account_type is rejected on node)
          const fallbackUrl = `https://graph.instagram.com/${this.graphApiVersion}/me?fields=id,username&access_token=${encodeURIComponent(token)}`
          const fallbackRes = await fetch(fallbackUrl)
          if (fallbackRes.ok) {
            res = fallbackRes
          }
        }

        if (res.ok) {
          meData = await res.json().catch(() => null)
        } else {
          try {
            const errData = await res.json()
            const errObj = errData?.error
            if (errObj) {
              const code = Number(errObj.code)
              const subcode = Number(errObj.error_subcode)
              const type = String(errObj.type || '')
              if (isMetaAuthErrorCode(code, subcode, type) && code !== 100) {
                isAuthError = true
              }
            }
          } catch {
            if (res.status === 401 || res.status === 403) {
              isAuthError = true
            }
          }

          if (isAuthError) {
            return {
              isValid: false,
              isAuthError: true,
              error: 'Autorisation à renouveler.',
            }
          }

          return {
            isValid: false,
            isAuthError: false,
            error: 'Impossible de vérifier la connexion pour le moment.',
          }
        }

        if (
          !meData ||
          (!meData.id && !meData.user_id) ||
          (externalAccountId &&
            String(meData.id) !== externalAccountId &&
            String(meData.user_id) !== externalAccountId)
        ) {
          return {
            isValid: false,
            isAuthError: false,
            error: 'Identifiant de compte Instagram incohérent.',
          }
        }

        const accountName = meData.username
          ? (meData.username.startsWith('@') ? meData.username : `@${meData.username}`)
          : 'Instagram'

        return {
          isValid: true,
          isAuthError: false,
          accountName,
        }
      }

      // ----------------------------------------------------------------------
      // VERIFY FACEBOOK: Query graph.facebook.com with Page Access Token
      // ----------------------------------------------------------------------
      let pageData: { id?: string | number; name?: string } | null = null
      let isAuthError = false
      let lastErrorObj: { code?: number; error_subcode?: number; type?: string; message?: string } | null = null

      // Primary: Query /me?fields=id,name (native resolution for Page Access Token)
      const meUrl = `https://graph.facebook.com/${this.graphApiVersion}/me?fields=id,name&access_token=${encodeURIComponent(token)}`
      const meRes = await fetch(meUrl)
      const meData = await meRes.json().catch(() => null)

      console.info('[Facebook Verification] Query /me result:', {
        endpoint: `GET https://graph.facebook.com/${this.graphApiVersion}/me?fields=id,name`,
        httpStatus: meRes.status,
        ok: meRes.ok,
        resolvedId: meData?.id || null,
        error: meData?.error
          ? {
              type: meData.error.type,
              code: meData.error.code,
              error_subcode: meData.error.error_subcode,
              message: meData.error.message,
            }
          : null,
      })

      if (meRes.ok && meData?.id) {
        pageData = meData
      } else {
        if (meData?.error) lastErrorObj = meData.error

        // Fallback: Query /{page_id}?fields=id,name
        const verifyUrl = `https://graph.facebook.com/${this.graphApiVersion}/${encodeURIComponent(externalAccountId)}?fields=id,name&access_token=${encodeURIComponent(token)}`
        const res = await fetch(verifyUrl)
        const resData = await res.json().catch(() => null)

        console.info('[Facebook Verification] Fallback /{page_id} result:', {
          endpoint: `GET https://graph.facebook.com/${this.graphApiVersion}/${externalAccountId}?fields=id,name`,
          httpStatus: res.status,
          ok: res.ok,
          resolvedId: resData?.id || null,
          error: resData?.error
            ? {
                type: resData.error.type,
                code: resData.error.code,
                error_subcode: resData.error.error_subcode,
                message: resData.error.message,
              }
            : null,
        })

        if (res.ok && resData?.id) {
          pageData = resData
        } else {
          if (resData?.error) lastErrorObj = resData.error
        }
      }

      // If pageData was resolved, verify ID match
      if (pageData && pageData.id) {
        if (externalAccountId && String(pageData.id) !== externalAccountId) {
          return {
            isValid: false,
            isAuthError: false,
            error: 'Identifiant de Page Facebook incohérent.',
          }
        }

        return {
          isValid: true,
          isAuthError: false,
          accountName: pageData.name || 'Facebook',
        }
      }

      // If both failed to resolve, classify error
      if (lastErrorObj) {
        const code = Number(lastErrorObj.code)
        const subcode = Number(lastErrorObj.error_subcode)
        const type = String(lastErrorObj.type || '')
        const msg = String(lastErrorObj.message || '')

        if (
          isMetaAuthErrorCode(code, subcode, type) ||
          code === 190 ||
          code === 200 ||
          code === 10 ||
          subcode === 33 ||
          subcode === 458 ||
          subcode === 463 ||
          subcode === 467 ||
          msg.includes('missing permissions') ||
          msg.includes('Cannot load') ||
          msg.includes('Error validating access token') ||
          msg.includes('Session has expired') ||
          type === 'OAuthException' ||
          type === 'GraphMethodException'
        ) {
          isAuthError = true
        }
      }

      if (isAuthError) {
        return {
          isValid: false,
          isAuthError: true,
          error: 'Autorisation à renouveler.',
        }
      }

      return {
        isValid: false,
        isAuthError: false,
        error: 'Impossible de vérifier la connexion pour le moment.',
      }
    } catch {
      return {
        isValid: false,
        isAuthError: false,
        error: 'Impossible de vérifier la connexion pour le moment.',
      }
    }
  }

  /**
   * Helper to sanitize error messages so no access tokens or internal secrets are leaked.
   */
  private sanitizeErrorMessage(message: string): string {
    return message
      .replace(/access_token=[a-zA-Z0-9_\-]+/gi, 'access_token=[REDACTED]')
      .replace(/EA[A-Za-z0-9]+/g, '[REDACTED_TOKEN]')
  }

  /**
   * Publishes a photo or text post to a Facebook Page.
   * Endpoints:
   * - Photo: POST https://graph.facebook.com/v21.0/{page_id}/photos
   * - Text-only: POST https://graph.facebook.com/v21.0/{page_id}/feed
   */
  async publishFacebookPost(params: {
    accessToken: string
    pageId: string
    message?: string | null
    imageUrl?: string | null
  }): Promise<{
    success: boolean
    platformPostId?: string
    platformPostUrl?: string
    errorCode?: string
    errorMessage?: string
  }> {
    try {
      if (!params.accessToken) {
        return {
          success: false,
          errorCode: 'MISSING_ACCESS_TOKEN',
          errorMessage: 'Jeton d’accès manquant pour la page Facebook.',
        }
      }
      if (!params.pageId) {
        return {
          success: false,
          errorCode: 'MISSING_PAGE_ID',
          errorMessage: 'Identifiant de page Facebook manquant.',
        }
      }

      // Case 1: Photo post
      if (params.imageUrl) {
        const photoUrl = `https://graph.facebook.com/${this.graphApiVersion}/${encodeURIComponent(params.pageId)}/photos`
        const formBody = new URLSearchParams()
        formBody.set('url', params.imageUrl)
        if (params.message) {
          formBody.set('caption', params.message)
        }
        formBody.set('access_token', params.accessToken)

        const res = await fetch(photoUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formBody.toString(),
        })

        const resData = await res.json().catch(() => ({}))

        if (!res.ok) {
          const rawErr = resData?.error?.message || 'Erreur lors de la publication photo sur Facebook.'
          const code = String(resData?.error?.code || res.status)
          return {
            success: false,
            errorCode: code,
            errorMessage: this.sanitizeErrorMessage(rawErr),
          }
        }

        const platformPostId = String(resData.post_id || resData.id || '')
        let platformPostUrl: string | undefined = undefined

        if (platformPostId) {
          try {
            const permalinkUrl = `https://graph.facebook.com/${this.graphApiVersion}/${encodeURIComponent(platformPostId)}?fields=permalink_url&access_token=${encodeURIComponent(params.accessToken)}`
            const permalinkRes = await fetch(permalinkUrl)
            if (permalinkRes.ok) {
              const permalinkData = await permalinkRes.json().catch(() => ({}))
              if (permalinkData?.permalink_url && typeof permalinkData.permalink_url === 'string') {
                platformPostUrl = permalinkData.permalink_url
              }
            }
          } catch {
            // Non-blocking: platformPostUrl will remain undefined if no reliable URL is returned
          }
        }

        return {
          success: true,
          platformPostId,
          platformPostUrl,
        }
      }

      // Case 2: Text-only post
      const feedUrl = `https://graph.facebook.com/${this.graphApiVersion}/${encodeURIComponent(params.pageId)}/feed`
      const formBody = new URLSearchParams()
      formBody.set('message', params.message || '')
      formBody.set('access_token', params.accessToken)

      const res = await fetch(feedUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formBody.toString(),
      })

      const resData = await res.json().catch(() => ({}))

      if (!res.ok) {
        const rawErr = resData?.error?.message || 'Erreur lors de la publication du message sur Facebook.'
        const code = String(resData?.error?.code || res.status)
        return {
          success: false,
          errorCode: code,
          errorMessage: this.sanitizeErrorMessage(rawErr),
        }
      }

      const platformPostId = String(resData.id || '')
      let platformPostUrl: string | undefined = undefined

      if (platformPostId) {
        try {
          const permalinkUrl = `https://graph.facebook.com/${this.graphApiVersion}/${encodeURIComponent(platformPostId)}?fields=permalink_url&access_token=${encodeURIComponent(params.accessToken)}`
          const permalinkRes = await fetch(permalinkUrl)
          if (permalinkRes.ok) {
            const permalinkData = await permalinkRes.json().catch(() => ({}))
            if (permalinkData?.permalink_url && typeof permalinkData.permalink_url === 'string') {
              platformPostUrl = permalinkData.permalink_url
            }
          }
        } catch {
          // Non-blocking
        }
      }

      return {
        success: true,
        platformPostId,
        platformPostUrl,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inattendue Facebook'
      return {
        success: false,
        errorCode: 'UNEXPECTED_ERROR',
        errorMessage: this.sanitizeErrorMessage(msg),
      }
    }
  }

  /**
   * Publishes a photo post to an Instagram Professional account via the official Content Publishing API (Instagram Login).
   * Host: graph.instagram.com
   * Flux:
   * 1. Create Media Container: POST graph.instagram.com/{version}/{ig_user_id}/media (image_url, caption)
   * 2. Status verification if needed: GET graph.instagram.com/{version}/{container_id}?fields=status_code
   * 3. Publish Container: POST graph.instagram.com/{version}/{ig_user_id}/media_publish (creation_id)
   * 4. Best-effort permalink retrieval: GET graph.instagram.com/{version}/{media_id}?fields=permalink
   */
  async publishInstagramPhotoPost(params: {
    accessToken: string
    instagramAccountId: string
    imageUrl: string
    caption?: string | null
  }): Promise<{
    success: boolean
    platformPostId?: string
    platformPostUrl?: string
    errorCode?: string
    errorMessage?: string
  }> {
    try {
      if (!params.accessToken) {
        return {
          success: false,
          errorCode: 'MISSING_ACCESS_TOKEN',
          errorMessage: 'Jeton d’accès manquant pour le compte Instagram.',
        }
      }
      if (!params.instagramAccountId) {
        return {
          success: false,
          errorCode: 'MISSING_ACCOUNT_ID',
          errorMessage: 'Identifiant de compte Instagram manquant.',
        }
      }
      if (!params.imageUrl) {
        return {
          success: false,
          errorCode: 'MISSING_IMAGE_URL',
          errorMessage: 'Une image est obligatoire pour publier sur Instagram.',
        }
      }

      // Step 1: Create Container (Directly on graph.instagram.com for Instagram Login)
      const containerUrl = `https://graph.instagram.com/${this.graphApiVersion}/${encodeURIComponent(params.instagramAccountId)}/media`
      const containerForm = new URLSearchParams()
      containerForm.set('image_url', params.imageUrl)
      if (params.caption) {
        containerForm.set('caption', params.caption)
      }
      containerForm.set('access_token', params.accessToken)

      const containerRes = await fetch(containerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: containerForm.toString(),
      })

      const containerData = await containerRes.json().catch(() => ({}))

      if (!containerRes.ok || !containerData.id) {
        const rawErr = containerData?.error?.message || 'Erreur lors de la préparation du média Instagram.'
        const code = String(containerData?.error?.code || containerRes.status)
        return {
          success: false,
          errorCode: code,
          errorMessage: this.sanitizeErrorMessage(rawErr),
        }
      }

      const containerId = String(containerData.id)

      // Step 2: Check status if container is in progress (up to 3 retries with 1s pause)
      for (let attempt = 0; attempt < 3; attempt++) {
        const statusUrl = `https://graph.instagram.com/${this.graphApiVersion}/${encodeURIComponent(containerId)}?fields=status_code,status&access_token=${encodeURIComponent(params.accessToken)}`
        const statusRes = await fetch(statusUrl)
        if (statusRes.ok) {
          const statusData = await statusRes.json().catch(() => ({}))
          const statusCode = statusData?.status_code
          if (statusCode === 'FINISHED') {
            break
          }
          if (statusCode === 'ERROR' || statusCode === 'EXPIRED') {
            return {
              success: false,
              errorCode: 'MEDIA_CONTAINER_FAILED',
              errorMessage: 'Le traitement du média par Instagram a échoué.',
            }
          }
        } else {
          // If status endpoint isn't supported or returned error, try proceeding to publish directly
          break
        }
        // Brief wait before rechecking
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }

      // Step 3: Publish Media Container (Directly on graph.instagram.com for Instagram Login)
      const publishUrl = `https://graph.instagram.com/${this.graphApiVersion}/${encodeURIComponent(params.instagramAccountId)}/media_publish`
      const publishForm = new URLSearchParams()
      publishForm.set('creation_id', containerId)
      publishForm.set('access_token', params.accessToken)

      const publishRes = await fetch(publishUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: publishForm.toString(),
      })

      const publishData = await publishRes.json().catch(() => ({}))

      if (!publishRes.ok || !publishData.id) {
        const rawErr = publishData?.error?.message || 'Erreur lors de la publication sur Instagram.'
        const code = String(publishData?.error?.code || publishRes.status)
        return {
          success: false,
          errorCode: code,
          errorMessage: this.sanitizeErrorMessage(rawErr),
        }
      }

      const mediaId = String(publishData.id)

      // Step 4: Best-effort permalink retrieval
      let platformPostUrl: string | undefined = undefined
      try {
        const permalinkUrl = `https://graph.instagram.com/${this.graphApiVersion}/${encodeURIComponent(mediaId)}?fields=permalink&access_token=${encodeURIComponent(params.accessToken)}`
        const permalinkRes = await fetch(permalinkUrl)
        if (permalinkRes.ok) {
          const permalinkData = await permalinkRes.json().catch(() => ({}))
          if (permalinkData?.permalink && typeof permalinkData.permalink === 'string') {
            platformPostUrl = permalinkData.permalink
          }
        }
      } catch {
        // Non-blocking
      }

      return {
        success: true,
        platformPostId: mediaId,
        platformPostUrl,
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inattendue Instagram'
      return {
        success: false,
        errorCode: 'UNEXPECTED_ERROR',
        errorMessage: this.sanitizeErrorMessage(msg),
      }
    }
  }
}

export const metaSocialAdapter = new MetaSocialProviderAdapter()

