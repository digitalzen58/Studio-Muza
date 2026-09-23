'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { ensureInitialWorkspace } from '@/services/workspace'
import { getActiveWorkspaceBusiness } from '@/services/business'
import {
  disconnectSocialAccount,
  verifySocialAccount,
} from '@/services/social/social-accounts'
import { metaSocialAdapter } from '@/services/social/adapters/meta-adapter'
import { type SocialPlatform } from '@/services/social/types'

/**
 * Disconnects a connected social destination for the active business.
 */
export async function disconnectSocialAccountAction(
  accountId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Authentification requise.' }
    }

    const { data: workspace } = await ensureInitialWorkspace()
    if (!workspace?.workspace_id) {
      return { success: false, error: 'Espace de travail introuvable.' }
    }

    const { business } = await getActiveWorkspaceBusiness(workspace.workspace_id)
    if (!business) {
      return { success: false, error: 'Activité introuvable.' }
    }

    const res = await disconnectSocialAccount(business.id, accountId)
    if (res.success) {
      revalidatePath('/app/settings/networks')
      revalidatePath('/app/settings')
    }

    return res
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur lors de la déconnexion'
    return { success: false, error: message }
  }
}

/**
 * Verifies connection status of a connected social destination.
 */
export async function verifySocialAccountAction(
  accountId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, error: 'Authentification requise.' }
    }

    const { data: workspace } = await ensureInitialWorkspace()
    if (!workspace?.workspace_id) {
      return { success: false, error: 'Espace de travail introuvable.' }
    }

    const { business } = await getActiveWorkspaceBusiness(workspace.workspace_id)
    if (!business) {
      return { success: false, error: 'Activité introuvable.' }
    }

    const res = await verifySocialAccount(business.id, accountId)
    revalidatePath('/app/settings/networks')
    revalidatePath('/app/settings')

    return {
      success: res.isValid,
      error: res.error || null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur de vérification'
    return { success: false, error: message }
  }
}

/**
 * Generates authorization URL for a social platform if provider is configured.
 */
export async function getSocialAuthUrlAction(
  platform: SocialPlatform
): Promise<{ url: string | null; error: string | null }> {
  try {
    const supabase = await createClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { url: null, error: 'Authentification requise.' }
    }

    const { data: workspace } = await ensureInitialWorkspace()
    if (!workspace?.workspace_id) {
      return { url: null, error: 'Espace de travail introuvable.' }
    }

    const { business } = await getActiveWorkspaceBusiness(workspace.workspace_id)
    if (!business) {
      return { url: null, error: 'Activité introuvable.' }
    }

    if (platform === 'INSTAGRAM' || platform === 'FACEBOOK') {
      if (!metaSocialAdapter.isConfigured(platform)) {
        return {
          url: null,
          error:
            platform === 'INSTAGRAM'
              ? 'La connexion Instagram nécessite la configuration des identifiants d’application Instagram (INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET).'
              : 'La connexion Facebook nécessite la configuration de l’application Meta Developer (META_APP_ID / META_APP_SECRET).',
        }
      }

      const res = await metaSocialAdapter.getAuthorizationUrl({
        userId: user.id,
        businessId: business.id,
        platform,
      })

      if (!res?.url) {
        return { url: null, error: 'Impossible de générer le lien de connexion.' }
      }

      return { url: res.url, error: null }
    }

    return {
      url: null,
      error: `La connexion pour ${platform} n’est pas encore disponible.`,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erreur de connexion'
    return { url: null, error: message }
  }
}
