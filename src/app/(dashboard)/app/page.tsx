import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureInitialWorkspace } from '@/services/workspace'
import { getActiveWorkspaceBusiness } from '@/services/business'
import { getBrandProfile } from '@/services/brand'
import { getCreatorProfile } from '@/services/creator'
import { getPrimaryAudience } from '@/services/audience'
import { getPrimaryGoal } from '@/services/goal'
import { getPrimaryOffer } from '@/services/offer'
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

  // 3. If no business exists yet, redirect user to initial business onboarding form
  if (!business) {
    redirect('/onboarding/business')
  }

  // 4. Check if active business contains a BrandProfile
  const { brandProfile } = await getBrandProfile(business.id)

  // 5. If no brand profile exists yet, redirect user to brand onboarding form
  if (!brandProfile) {
    redirect('/onboarding/brand')
  }

  // 6. Check if active business contains a CreatorProfile
  const { creatorProfile } = await getCreatorProfile(business.id)

  // 7. If no creator profile exists yet, redirect user to creator onboarding form
  if (!creatorProfile) {
    redirect('/onboarding/creator')
  }

  // 8. Check if active business contains a primary active Audience
  const { audience } = await getPrimaryAudience(business.id)

  // 9. If no primary audience exists yet, redirect user to audience onboarding form
  if (!audience) {
    redirect('/onboarding/audience')
  }

  // 10. Check if active business contains a primary active Goal
  const { goal } = await getPrimaryGoal(business.id)

  // 11. If no primary goal exists yet, redirect user to goals onboarding form
  if (!goal) {
    redirect('/onboarding/goals')
  }

  // 12. Check if active business contains a primary active Offer
  const { offer } = await getPrimaryOffer(business.id)

  // 13. If no primary offer exists yet, redirect user to offers onboarding form
  if (!offer) {
    redirect('/onboarding/offers')
  }

  // 14. Retrieve user first_name for greeting
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
            L&apos;onboarding de <span className="font-semibold text-terracotta">{business.name}</span> est complet (Business, Marque, Créateur, Audience, Objectif, Offre).
          </p>
        </div>

        {brandProfile.promise && (
          <div className="bg-ivory/60 p-3 rounded-xl border border-terracotta-border/30">
            <p className="text-xs font-semibold text-terracotta uppercase tracking-wider mb-0.5">Promesse de marque</p>
            <p className="text-sm font-medium text-ink">« {brandProfile.promise} »</p>
          </div>
        )}

        <p className="text-xs text-ink-muted italic border-t border-terracotta-border/40 pt-3">
          « Mūza propose. Vous choisissez. Mūza s&apos;occupe du reste. »
        </p>
      </Card>

      {/* Active Business, Brand, Creator, Audience, Goal & Offer Context */}
      <Card variant="default" className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-ink flex items-center gap-1.5">
            <MuzaSymbol size="sm" />
            <span>{business.name}</span>
          </h3>
          <Badge variant="ivory">{business.industry}</Badge>
        </div>

        {/* Brand Details Summary */}
        <div className="text-xs text-ink-muted flex flex-col gap-2 pt-2 border-t border-ivory-border/60">
          <p className="font-semibold text-ink text-xs uppercase tracking-wider">Profil de marque</p>
          {brandProfile.tone?.description && (
            <p>
              <strong className="text-ink">Ton de marque :</strong> {String(brandProfile.tone.description)}
            </p>
          )}

          {brandProfile.personality.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <strong className="text-ink">Personnalité :</strong>
              {brandProfile.personality.map((p, idx) => (
                <span key={idx} className="bg-ivory-subtle text-ink border border-ivory-border px-2 py-0.5 rounded-full text-[11px]">
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Creator Details Summary */}
        <div className="text-xs text-ink-muted flex flex-col gap-2 pt-2 border-t border-ivory-border/60">
          <p className="font-semibold text-ink text-xs uppercase tracking-wider">Profil créateur</p>
          {creatorProfile.weekly_minutes !== null && (
            <p>
              <strong className="text-ink">Temps hebdo :</strong> ~{creatorProfile.weekly_minutes} min/semaine
            </p>
          )}

          {creatorProfile.preferred_formats.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <strong className="text-ink">Formats préférés :</strong>
              {creatorProfile.preferred_formats.map((fmt, idx) => (
                <span key={idx} className="bg-ivory-subtle text-ink border border-ivory-border px-2 py-0.5 rounded-full text-[11px]">
                  {fmt}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Audience Details Summary */}
        <div className="text-xs text-ink-muted flex flex-col gap-2 pt-2 border-t border-ivory-border/60">
          <p className="font-semibold text-ink text-xs uppercase tracking-wider">Audience cible principale</p>
          <p>
            <strong className="text-ink">Nom :</strong> {audience.name}
          </p>
          {audience.description && (
            <p>
              <strong className="text-ink">Cible :</strong> {audience.description}
            </p>
          )}

          {audience.needs.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <strong className="text-ink">Besoins :</strong>
              {audience.needs.map((need, idx) => (
                <span key={idx} className="bg-ivory-subtle text-ink border border-ivory-border px-2 py-0.5 rounded-full text-[11px]">
                  {need}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Goal Details Summary */}
        <div className="text-xs text-ink-muted flex flex-col gap-2 pt-2 border-t border-ivory-border/60">
          <p className="font-semibold text-ink text-xs uppercase tracking-wider">Objectif principal actif</p>
          <p>
            <strong className="text-ink">Titre :</strong> {goal.title} ({goal.type})
          </p>
          {goal.description && (
            <p>
              <strong className="text-ink">Résultat recherché :</strong> {goal.description}
            </p>
          )}
          <p>
            <strong className="text-ink">Priorité :</strong> {goal.priority} / 10
            {goal.starts_at && goal.ends_at && ` (Du ${goal.starts_at} au ${goal.ends_at})`}
          </p>
        </div>

        {/* Offer Details Summary */}
        <div className="text-xs text-ink-muted flex flex-col gap-2 pt-2 border-t border-ivory-border/60">
          <p className="font-semibold text-ink text-xs uppercase tracking-wider">Offre principale active</p>
          <p>
            <strong className="text-ink">Nom :</strong> {offer.name}
          </p>
          {offer.description && (
            <p>
              <strong className="text-ink">Description :</strong> {offer.description}
            </p>
          )}
          {(offer.price_from !== null || offer.price_to !== null) && (
            <p>
              <strong className="text-ink">Tarif :</strong>{' '}
              {offer.price_from !== null && offer.price_to !== null
                ? `De ${offer.price_from} € à ${offer.price_to} €`
                : offer.price_from !== null
                ? `À partir de ${offer.price_from} €`
                : `Jusqu'à ${offer.price_to} €`}
            </p>
          )}

          {offer.benefits.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <strong className="text-ink">Bénéfices :</strong>
              {offer.benefits.map((b, idx) => (
                <span key={idx} className="bg-ivory-subtle text-ink border border-ivory-border px-2 py-0.5 rounded-full text-[11px]">
                  {b}
                </span>
              ))}
            </div>
          )}

          <div className="pt-2 border-t border-ivory-border/40 flex flex-col gap-1 text-[11px]">
            <p>
              Workspace : <span className="font-medium text-ink">{workspace.name}</span> ({workspace.slug})
            </p>
            <p>
              Business Slug : <code className="text-ink font-mono bg-ivory-subtle px-1.5 py-0.5 rounded">{business.slug}</code>
            </p>
          </div>
        </div>
      </Card>
    </div>
  )
}

