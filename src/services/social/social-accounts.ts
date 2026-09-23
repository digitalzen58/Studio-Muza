import { createClient } from '@/lib/supabase/server'
import {
  type SocialProvider,
  type SocialPlatform,
  type SocialAccountSummary,
  type SaveSocialAccountInput,
  type ProviderAuthConfig,
  type SocialCapabilities,
  type SocialConnectionStatus,
} from './types'
import { metaSocialAdapter } from './adapters/meta-adapter'
import { decryptCredential } from './crypto'

/**
 * Returns configuration readiness flags for a provider without exposing secret values.
 */
export function getProviderConfigStatus(provider: SocialProvider): ProviderAuthConfig {
  if (provider === 'META') {
    return metaSocialAdapter.getAuthConfig()
  }

  return {
    isConfigured: false,
    appIdPresent: false,
    appSecretPresent: false,
    redirectUriPresent: false,
  }
}

/**
 * Retrieves all social accounts connected for a given business.
 * Plaintext tokens are NEVER included in the returned summaries.
 * Ordered by most recent activity (updated_at desc) so active accounts take precedence.
 */
export async function getBusinessSocialAccounts(
  businessId: string
): Promise<{ accounts: SocialAccountSummary[]; error: string | null }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('social_accounts')
      .select(`
        id,
        business_id,
        platform,
        external_account_id,
        account_name,
        account_type,
        status,
        capabilities,
        scopes,
        created_at,
        updated_at,
        last_verified_at
      `)
      .eq('business_id', businessId)
      .order('updated_at', { ascending: false })

    if (error) {
      console.error('Error fetching social accounts:', error.message)
      return { accounts: [], error: error.message }
    }

    const accounts: SocialAccountSummary[] = (data || []).map((row) => {
      const rawPlatform = typeof row.platform === 'string' ? row.platform.toUpperCase().trim() : 'INSTAGRAM'
      const platform: SocialPlatform = (
        ['INSTAGRAM', 'FACEBOOK', 'LINKEDIN', 'TIKTOK', 'YOUTUBE'].includes(rawPlatform)
          ? rawPlatform
          : 'INSTAGRAM'
      ) as SocialPlatform

      const provider: SocialProvider =
        platform === 'INSTAGRAM' || platform === 'FACEBOOK'
          ? 'META'
          : platform === 'LINKEDIN'
            ? 'LINKEDIN'
            : platform === 'TIKTOK'
              ? 'TIKTOK'
              : 'GOOGLE'

      const rawStatus = typeof row.status === 'string' ? row.status.toUpperCase().trim() : 'CONNECTED'
      const status: SocialConnectionStatus = (
        ['CONNECTED', 'REAUTH_REQUIRED', 'DISCONNECTED', 'ERROR'].includes(rawStatus)
          ? rawStatus
          : 'CONNECTED'
      ) as SocialConnectionStatus

      const rawCaps = (row.capabilities as Record<string, unknown>) || {}
      const capabilities: SocialCapabilities = {
        canPublishPosts: Boolean(rawCaps.canPublishPosts ?? true),
        canPublishCarousels: Boolean(rawCaps.canPublishCarousels ?? true),
        canPublishShortVideo: Boolean(rawCaps.canPublishShortVideo ?? false),
        canReadInsights: Boolean(rawCaps.canReadInsights ?? false),
      }

      const scopes = Array.isArray(row.scopes) ? (row.scopes as string[]) : []

      return {
        id: row.id,
        businessId: row.business_id,
        provider,
        platform,
        externalAccountId: row.external_account_id,
        accountName: row.account_name,
        accountType: row.account_type,
        status,
        capabilities,
        scopes,
        connectedAt: row.created_at,
        lastVerifiedAt: row.last_verified_at,
      }
    })

    return { accounts, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Exception in getBusinessSocialAccounts:', message)
    return { accounts: [], error: message }
  }
}

/**
 * Saves or updates a connected social account record idempotently.
 */
export async function saveSocialAccount(
  input: SaveSocialAccountInput
): Promise<{ accountId: string | null; error: string | null }> {
  try {
    const supabase = await createClient()
    const canonicalPlatform = (input.platform?.toUpperCase().trim() || 'INSTAGRAM') as SocialPlatform
    const targetStatus = input.status || 'CONNECTED'

    // If connecting a new account for a platform, disconnect any superseded accounts for this business
    if (targetStatus === 'CONNECTED') {
      await supabase
        .from('social_accounts')
        .update({
          status: 'DISCONNECTED',
          updated_at: new Date().toISOString(),
        })
        .eq('business_id', input.businessId)
        .eq('platform', canonicalPlatform)
        .neq('external_account_id', input.externalAccountId)
    }

    const { data, error } = await supabase
      .from('social_accounts')
      .upsert(
        {
          business_id: input.businessId,
          platform: canonicalPlatform,
          external_account_id: input.externalAccountId,
          account_name: input.accountName || null,
          account_type: input.accountType || null,
          access_token_encrypted: input.accessTokenEncrypted || null,
          refresh_token_encrypted: input.refreshTokenEncrypted || null,
          token_expires_at: input.tokenExpiresAt || null,
          scopes: input.scopes || [],
          capabilities: input.capabilities || {},
          status: targetStatus,
          last_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'business_id,platform,external_account_id',
        }
      )
      .select('id')
      .single()

    if (error) {
      console.error('Error saving social account:', error.message)
      return { accountId: null, error: error.message }
    }

    return { accountId: data.id, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { accountId: null, error: message }
  }
}

/**
 * Disconnects a social account safely.
 * Sets status to 'DISCONNECTED' and nullifies access tokens.
 * PRESERVES all historical contents, variants, and publish_jobs.
 */
export async function disconnectSocialAccount(
  businessId: string,
  accountId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('social_accounts')
      .update({
        status: 'DISCONNECTED',
        access_token_encrypted: null,
        refresh_token_encrypted: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', accountId)
      .eq('business_id', businessId)

    if (error) {
      console.error('Error disconnecting social account:', error.message)
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { success: false, error: message }
  }
}

/**
 * Verifies live connection status of a social account with provider.
 */
export async function verifySocialAccount(
  businessId: string,
  accountId: string
): Promise<{ isValid: boolean; status: SocialConnectionStatus; error?: string }> {
  try {
    const supabase = await createClient()

    const { data: account, error } = await supabase
      .from('social_accounts')
      .select('id, platform, external_account_id, access_token_encrypted, status')
      .eq('id', accountId)
      .eq('business_id', businessId)
      .single()

    if (error || !account) {
      return { isValid: false, status: 'ERROR', error: 'Compte introuvable.' }
    }

    if (!account.access_token_encrypted) {
      return { isValid: false, status: 'DISCONNECTED', error: 'Aucun jeton d’accès disponible.' }
    }

    const decryptedToken = decryptCredential(account.access_token_encrypted)
    if (!decryptedToken) {
      await supabase
        .from('social_accounts')
        .update({
          status: 'REAUTH_REQUIRED',
          last_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId)

      return {
        isValid: false,
        status: 'REAUTH_REQUIRED',
        error: 'Autorisation à renouveler.',
      }
    }

    if (account.platform === 'INSTAGRAM' || account.platform === 'FACEBOOK') {
      const res = await metaSocialAdapter.verifyConnection(
        decryptedToken,
        account.external_account_id,
        account.platform
      )

      if (res.isValid) {
        await supabase
          .from('social_accounts')
          .update({
            status: 'CONNECTED',
            last_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', accountId)

        return { isValid: true, status: 'CONNECTED' }
      }

      if (res.isAuthError) {
        await supabase
          .from('social_accounts')
          .update({
            status: 'REAUTH_REQUIRED',
            last_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', accountId)

        return {
          isValid: false,
          status: 'REAUTH_REQUIRED',
          error: res.error || 'Autorisation à renouveler.',
        }
      }

      // Technical or network error: preserve existing status without degrading to REAUTH_REQUIRED
      const currentStatus = (account.status as SocialConnectionStatus) || 'CONNECTED'
      await supabase
        .from('social_accounts')
        .update({
          last_verified_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', accountId)

      return {
        isValid: false,
        status: currentStatus,
        error: res.error || 'Impossible de vérifier la connexion pour le moment.',
      }
    }

    return { isValid: true, status: 'CONNECTED' }
  } catch (err) {
    return {
      isValid: false,
      status: 'ERROR',
      error: err instanceof Error ? err.message : 'Erreur de vérification.',
    }
  }
}
