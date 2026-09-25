import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureInitialWorkspace } from '@/services/workspace'
import { getActiveWorkspaceBusiness } from '@/services/business'
import {
  getBusinessSocialAccounts,
  getProviderConfigStatus,
} from '@/services/social/social-accounts'
import { NetworksView } from '@/components/social/networks-view'
import { Card } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function SettingsNetworksPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; success?: string }>
}) {
  const resolvedParams = searchParams ? await searchParams : {}
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 1. Ensure active workspace exists
  const { data: workspace } = await ensureInitialWorkspace()

  if (!workspace?.workspace_id) {
    return (
      <div className="p-4">
        <Card variant="default" className="border-amber-300 bg-amber-50 text-amber-900">
          <p className="text-xs">Impossible de charger votre espace de travail.</p>
        </Card>
      </div>
    )
  }

  // 2. Resolve active business with strict tenant isolation
  const { business } = await getActiveWorkspaceBusiness(workspace.workspace_id)

  if (!business) {
    redirect('/onboarding/business')
  }

  // 3. Fetch connected social accounts for this business
  const socialAccountsRes = await getBusinessSocialAccounts(business.id)
  const accounts = socialAccountsRes?.accounts || []

  // 4. Retrieve provider configuration status (booleans only, 0 secret values)
  const metaConfig = getProviderConfigStatus('META')

  return (
    <div className="py-2 sm:py-4 px-2 sm:px-4 md:px-6">
      <NetworksView
        businessName={business.name}
        accounts={accounts}
        metaConfig={metaConfig}
        initialError={resolvedParams.error || null}
        initialSuccess={resolvedParams.success === 'true' ? 'Réseau social connecté avec succès !' : null}
      />
    </div>
  )
}
