import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureInitialWorkspace } from '@/services/workspace'
import { getActiveWorkspaceBusiness } from '@/services/business'
import { getBrandProfile } from '@/services/brand'
import { getCreatorProfile } from '@/services/creator'
import { getPrimaryAudience } from '@/services/audience'
import { getPrimaryGoal } from '@/services/goal'
import { getPrimaryOffer } from '@/services/offer'
import { getBusinessMediaAssets } from '@/services/media'
import { getLatestRecommendationBatchForActiveBusiness } from '@/services/muza-recommendation-fetcher'
import { InspirationsView } from '@/components/inspirations/inspirations-view'
import { Card } from '@/components/ui/card'

export default async function InspirationsPage() {
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

  if (!business) {
    redirect('/onboarding/business')
  }

  // 3. Check onboarding completion
  const { brandProfile } = await getBrandProfile(business.id)
  if (!brandProfile) redirect('/onboarding/brand')

  const { creatorProfile } = await getCreatorProfile(business.id)
  if (!creatorProfile) redirect('/onboarding/creator')

  const { audience } = await getPrimaryAudience(business.id)
  if (!audience) redirect('/onboarding/audience')

  const { goal } = await getPrimaryGoal(business.id)
  if (!goal) redirect('/onboarding/goals')

  const { offer } = await getPrimaryOffer(business.id)
  if (!offer) redirect('/onboarding/offers')

  // 4. Fetch latest persisted recommendation batch for this business (0 AI calls on page load)
  const initialBatch = await getLatestRecommendationBatchForActiveBusiness()

  // 5. Fetch business media assets
  const { mediaAssets } = await getBusinessMediaAssets(business.id)

  // 6. Retrieve user first_name
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

  const strategicContext = {
    businessName: business.name,
    industry: business.industry,
    goalTitle: goal.title,
    audienceName: audience.name,
    weeklyMinutes: creatorProfile.weekly_minutes ?? 60,
    offerName: offer.name,
    firstName: firstName,
    positioning: brandProfile.positioning,
    personality: brandProfile.personality,
    mediaAssets: mediaAssets,
  }

  // 7. Fetch active drafts to highlight any existing drafts started from recommendations
  const { data: draftContents } = await supabase
    .from('contents')
    .select('recommendation_id')
    .eq('business_id', business.id)
    .eq('status', 'DRAFT')
    .not('recommendation_id', 'is', null)

  const draftRecommendationIds = (draftContents || [])
    .map((d) => d.recommendation_id)
    .filter((id): id is string => Boolean(id))

  return (
    <div className="py-2 sm:py-3">
      <InspirationsView
        initialPersistedBatch={initialBatch}
        strategicContext={strategicContext}
        draftRecommendationIds={draftRecommendationIds}
      />
    </div>
  )
}
