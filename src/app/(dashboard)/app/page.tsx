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
import { RecommendationSection } from '@/components/recommendations/recommendation-section'
import { Card } from '@/components/ui/card'

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

  // 14. Fetch latest persisted recommendation batch for this business
  const initialBatch = await getLatestRecommendationBatchForActiveBusiness()

  // 15. Fetch business media assets for brand visual previews
  const { mediaAssets } = await getBusinessMediaAssets(business.id)

  // 16. Retrieve user first_name for greeting
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

  // 17. Fetch active drafts for this business (ordered by updated_at DESC)
  const { data: draftContents } = await supabase
    .from('contents')
    .select(`
      id,
      business_id,
      recommendation_id,
      content_type,
      topic,
      hook,
      cta,
      status,
      created_at,
      updated_at,
      content_variants (
        id,
        format,
        platform,
        title,
        caption
      )
    `)
    .eq('business_id', business.id)
    .eq('status', 'DRAFT')
    .order('updated_at', { ascending: false })

  return (
    <div className="py-1 sm:py-2">
      {/* Primary Content: Interactive Mūza Recommendation Section */}
      <RecommendationSection
        initialPersistedBatch={initialBatch}
        strategicContext={strategicContext}
        draftContents={draftContents || []}
      />
    </div>
  )
}

