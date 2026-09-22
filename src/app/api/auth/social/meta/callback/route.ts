import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureInitialWorkspace } from '@/services/workspace'
import { getActiveWorkspaceBusiness } from '@/services/business'
import { metaSocialAdapter } from '@/services/social/adapters/meta-adapter'
import { saveSocialAccount } from '@/services/social/social-accounts'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const redirectTarget = new URL('/app/settings/networks', baseUrl)

  // 1. Check provider error in callback
  if (error) {
    redirectTarget.searchParams.set('error', errorDescription || error)
    return NextResponse.redirect(redirectTarget)
  }

  if (!code || !state) {
    redirectTarget.searchParams.set('error', 'Paramètres d’authentification manquants.')
    return NextResponse.redirect(redirectTarget)
  }

  try {
    const supabase = await createClient()

    // 2. Verify authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      const loginUrl = new URL('/login', baseUrl)
      return NextResponse.redirect(loginUrl)
    }

    // 3. Resolve active business for strict multi-tenant binding
    const { data: workspace } = await ensureInitialWorkspace()
    if (!workspace?.workspace_id) {
      redirectTarget.searchParams.set('error', 'Espace de travail introuvable.')
      return NextResponse.redirect(redirectTarget)
    }

    const { business } = await getActiveWorkspaceBusiness(workspace.workspace_id)
    if (!business) {
      redirectTarget.searchParams.set('error', 'Activité introuvable.')
      return NextResponse.redirect(redirectTarget)
    }

    // 4. Handle authorization exchange with provider adapter
    const exchangeResult = await metaSocialAdapter.handleAuthorizationCallback({
      code,
      state,
      currentUserId: user.id,
      currentBusinessId: business.id,
    })

    if (exchangeResult.error || exchangeResult.destinations.length === 0) {
      redirectTarget.searchParams.set(
        'error',
        exchangeResult.error || 'Aucun compte Instagram Pro ou Page Facebook éligible trouvé.'
      )
      return NextResponse.redirect(redirectTarget)
    }

    // 5. Save/update discovered destinations idempotently
    for (const dest of exchangeResult.destinations) {
      await saveSocialAccount({
        businessId: business.id,
        provider: 'META',
        platform: dest.platform,
        externalAccountId: dest.externalAccountId,
        accountName: dest.accountName,
        accountType: dest.accountType,
        accessTokenEncrypted: dest.rawTokenEncrypted,
        tokenExpiresAt: dest.tokenExpiresAt,
        scopes: dest.scopes,
        capabilities: dest.capabilities,
        status: 'CONNECTED',
      })
    }

    redirectTarget.searchParams.set('success', 'true')
    return NextResponse.redirect(redirectTarget)
  } catch (err) {
    console.error('Exception in Meta OAuth callback route:', err)
    redirectTarget.searchParams.set(
      'error',
      err instanceof Error ? err.message : 'Erreur inattendue lors de la connexion.'
    )
    return NextResponse.redirect(redirectTarget)
  }
}
