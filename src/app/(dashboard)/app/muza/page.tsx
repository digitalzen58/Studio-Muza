import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ensureInitialWorkspace } from '@/services/workspace'
import { getActiveWorkspaceBusiness } from '@/services/business'
import { getBrandProfile } from '@/services/brand'
import { getCreatorProfile } from '@/services/creator'
import { getPrimaryAudience } from '@/services/audience'
import { getPrimaryGoal } from '@/services/goal'
import { getPrimaryOffer } from '@/services/offer'
import { getLatestRecommendationBatchForActiveBusiness } from '@/services/muza-recommendation-fetcher'
import {
  deriveStrategicPriority,
  determineNextAction,
  buildBusinessUnderstanding,
  summarizeCommunicationState,
  type CoachDraftItem,
  type CoachScheduledItem,
} from '@/services/muza-coach'
import { MuzaView } from '@/components/muza/muza-view'
import { Card } from '@/components/ui/card'

export const dynamic = 'force-dynamic'

export default async function MuzaPage() {
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

  // 2. Resolve active business with tenant isolation
  const { business } = await getActiveWorkspaceBusiness(workspace.workspace_id)

  if (!business) {
    redirect('/onboarding/business')
  }

  // 3. Fetch full business record (description, city, region, subindustry)
  const { data: fullBusiness } = await supabase
    .from('businesses')
    .select('id, name, industry, subindustry, description, city, region, website_url')
    .eq('id', business.id)
    .single()

  const businessData = {
    id: business.id,
    name: fullBusiness?.name || business.name,
    industry: fullBusiness?.industry || business.industry,
    subindustry: fullBusiness?.subindustry || null,
    description: fullBusiness?.description || null,
    city: fullBusiness?.city || null,
    region: fullBusiness?.region || null,
  }

  // 4. Retrieve structured profile memory (graceful fallback if incomplete)
  const { brandProfile } = await getBrandProfile(business.id)
  const { creatorProfile } = await getCreatorProfile(business.id)
  const { audience } = await getPrimaryAudience(business.id)
  const { goal } = await getPrimaryGoal(business.id)
  const { offer } = await getPrimaryOffer(business.id)

  // 5. Fetch active drafts
  const { data: rawDrafts } = await supabase
    .from('contents')
    .select(`
      id,
      topic,
      hook,
      updated_at,
      content_variants (
        title,
        format,
        platform
      )
    `)
    .eq('business_id', business.id)
    .eq('status', 'DRAFT')
    .order('updated_at', { ascending: false })

  const draftContents: CoachDraftItem[] = (rawDrafts || []).map((d) => ({
    id: d.id,
    topic: d.topic,
    hook: d.hook,
    updated_at: d.updated_at,
    content_variants: d.content_variants,
  }))

  // 6. Fetch scheduled contents
  const { data: rawScheduled } = await supabase
    .from('contents')
    .select('id, topic, scheduled_at')
    .eq('business_id', business.id)
    .eq('status', 'SCHEDULED')
    .not('scheduled_at', 'is', null)
    .order('scheduled_at', { ascending: true })

  const scheduledContents: CoachScheduledItem[] = (rawScheduled || []).map((s) => ({
    id: s.id,
    topic: s.topic,
    scheduled_at: s.scheduled_at!,
  }))

  // 7. Fetch recommendation batch for Inspirations count (0 AI calls on page load)
  const initialBatch = await getLatestRecommendationBatchForActiveBusiness()
  const usableRecommendationsCount = initialBatch?.batch?.recommendations?.length || 0

  // 8. User greeting name
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

  // 9. Evaluate deterministic visibility coach synthesis
  const coachInput = {
    business: businessData,
    brandProfile,
    creatorProfile,
    audience,
    goal,
    offer,
    draftContents,
    scheduledContents,
    usableRecommendationsCount,
    firstName,
  }

  const priority = deriveStrategicPriority(coachInput)
  const nextAction = determineNextAction(coachInput)
  const businessFacts = buildBusinessUnderstanding(coachInput)
  const communicationState = summarizeCommunicationState(coachInput)

  return (
    <div className="py-2 sm:py-4 px-2 sm:px-4 md:px-6">
      <MuzaView
        businessName={businessData.name}
        firstName={firstName}
        priority={priority}
        nextAction={nextAction}
        businessFacts={businessFacts}
        communicationState={communicationState}
      />
    </div>
  )
}
