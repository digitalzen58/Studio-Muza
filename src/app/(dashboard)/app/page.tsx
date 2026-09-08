import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureInitialWorkspace } from '@/services/workspace'
import { getActiveWorkspaceBusiness } from '@/services/business'
import { MuzaSymbol } from '@/components/ui/muza-symbol'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // 1. Ensure active workspace exists for authenticated user
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

  // 2. Check if active workspace contains at least one Business
  const { business } = await getActiveWorkspaceBusiness(workspace.workspace_id)

  // 3. If no business exists yet, redirect user to initial onboarding form
  if (!business) {
    redirect('/onboarding/business')
  }

  // 4. Retrieve user first_name for greeting
  let firstName = ''
  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name')
    .eq('id', user.id)
    .single()

  const rawName = profile?.first_name || user.user_metadata?.full_name || ''
  if (rawName) {
    firstName = rawName.trim().split(' ')[0]
  }

  const greeting = firstName ? `Bonjour ${firstName}` : 'Bonjour'

  return (
    <div className="flex flex-col gap-6 py-4">
      {/* Brand Title */}
      <div className="flex items-center gap-2">
        <h1 className="font-serif text-3xl font-bold text-ink">
          Studio Mūza
        </h1>
        <MuzaSymbol size="lg" />
      </div>

      {/* Main Status Card */}
      <Card variant="accent" className="flex flex-col gap-4 py-6">
        <div className="flex items-center justify-between">
          <Badge variant="terracotta" showSymbol>
            {business.name}
          </Badge>
          <span className="text-xs text-terracotta-dark/70 font-mono">v0.1</span>
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-2xl text-terracotta-dark">
            {greeting}
          </h2>
          <p className="text-base font-medium text-ink">
            Votre espace Mūza est prêt.
          </p>
        </div>

        <p className="text-xs text-ink-muted italic border-t border-terracotta-border/40 pt-3">
          « Mūza propose. Vous choisissez. Mūza s&apos;occupe du reste. »
        </p>
      </Card>

      {/* Active Business & Workspace Context */}
      <Card variant="default" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-ink flex items-center gap-1.5">
            <MuzaSymbol size="sm" />
            <span>{business.name}</span>
          </h3>
          <Badge variant="ivory">{business.industry}</Badge>
        </div>
        <div className="text-xs text-ink-muted flex flex-col gap-1 pt-1 border-t border-ivory-border/60">
          <p>
            Workspace : <span className="font-medium text-ink">{workspace.name}</span> ({workspace.slug})
          </p>
          <p>
            Business ID : <code className="text-ink font-mono bg-ivory-subtle px-1.5 py-0.5 rounded">{business.slug}</code>
          </p>
        </div>
      </Card>
    </div>
  )
}
