import { createClient } from '@/lib/supabase/server'
import { MuzaContext } from '@/types/muza-context'

/**
 * Safely extracts an array from a JSONB or unknown value.
 */
function toArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

/**
 * Safely extracts a record/object from a JSONB or unknown value.
 */
function toObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

/**
 * Private internal function to load and aggregate MuzaContext for a resolved business and user.
 * Not exported to enforce server-side resolution security.
 */
async function loadMuzaContextForBusiness(
  businessId: string,
  userId: string
): Promise<MuzaContext> {
  const supabase = await createClient()

  const [
    businessRes,
    brandRes,
    creatorRes,
    audienceRes,
    goalRes,
    offerRes,
  ] = await Promise.all([
    supabase
      .from('businesses')
      .select('id, name, industry, subindustry, description, website_url, country_code, region, city')
      .eq('id', businessId)
      .maybeSingle(),

    supabase
      .from('brand_profiles')
      .select('positioning, promise, story, personality, values, tone, preferred_vocabulary, avoided_vocabulary, signature_phrases, communication_do, communication_dont')
      .eq('business_id', businessId)
      .maybeSingle(),

    supabase
      .from('creator_profiles')
      .select('weekly_minutes, camera_comfort, voiceover_comfort, writing_comfort, photo_comfort, video_comfort, social_skill_level, preferred_formats, avoided_formats, barriers, strengths, max_effort_level')
      .eq('business_id', businessId)
      .eq('user_id', userId)
      .maybeSingle(),

    supabase
      .from('audiences')
      .select('id, name, description, needs, desires, problems, objections, motivations, questions, buying_triggers, language_patterns, priority')
      .eq('business_id', businessId)
      .eq('active', true)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('goals')
      .select('id, type, title, description, metric, target_value, priority, starts_at, ends_at')
      .eq('business_id', businessId)
      .eq('status', 'ACTIVE')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),

    supabase
      .from('offers')
      .select('id, name, description, price_from, price_to, currency, url, cta, benefits, objections, seasonality, available_from, available_until, priority')
      .eq('business_id', businessId)
      .eq('active', true)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
  ])

  if (businessRes.error) {
    console.error('Error fetching business for MuzaContext:', businessRes.error.message)
    throw new Error(`Erreur lors de la récupération du business: ${businessRes.error.message}`)
  }

  if (!businessRes.data) {
    throw new Error('Business non trouvé')
  }

  if (brandRes.error) {
    console.error('Error fetching brand_profiles:', brandRes.error.message)
  }
  if (creatorRes.error) {
    console.error('Error fetching creator_profiles:', creatorRes.error.message)
  }
  if (audienceRes.error) {
    console.error('Error fetching audiences:', audienceRes.error.message)
  }
  if (goalRes.error) {
    console.error('Error fetching goals:', goalRes.error.message)
  }
  if (offerRes.error) {
    console.error('Error fetching offers:', offerRes.error.message)
  }

  const b = businessRes.data
  const br = brandRes.data
  const cr = creatorRes.data
  const au = audienceRes.data
  const go = goalRes.data
  const of = offerRes.data

  return {
    business: {
      id: b.id,
      name: b.name,
      industry: b.industry,
      subindustry: b.subindustry ?? null,
      description: b.description ?? null,
      websiteUrl: b.website_url ?? null,
      countryCode: b.country_code ?? null,
      region: b.region ?? null,
      city: b.city ?? null,
    },

    brand: br
      ? {
          positioning: br.positioning ?? null,
          promise: br.promise ?? null,
          story: br.story ?? null,
          personality: toArray(br.personality),
          values: toArray(br.values),
          tone: toObject(br.tone),
          preferredVocabulary: toArray(br.preferred_vocabulary),
          avoidedVocabulary: toArray(br.avoided_vocabulary),
          signaturePhrases: toArray(br.signature_phrases),
          communicationDo: toArray(br.communication_do),
          communicationDont: toArray(br.communication_dont),
        }
      : null,

    creator: cr
      ? {
          weeklyMinutes: cr.weekly_minutes ?? null,
          cameraComfort: cr.camera_comfort ?? null,
          voiceoverComfort: cr.voiceover_comfort ?? null,
          writingComfort: cr.writing_comfort ?? null,
          photoComfort: cr.photo_comfort ?? null,
          videoComfort: cr.video_comfort ?? null,
          socialSkillLevel: cr.social_skill_level ?? null,
          preferredFormats: toArray(cr.preferred_formats),
          avoidedFormats: toArray(cr.avoided_formats),
          barriers: toArray(cr.barriers),
          strengths: toArray(cr.strengths),
          maxEffortLevel: cr.max_effort_level ?? null,
        }
      : null,

    audience: au
      ? {
          id: au.id,
          name: au.name,
          description: au.description ?? null,
          needs: toArray(au.needs),
          desires: toArray(au.desires),
          problems: toArray(au.problems),
          objections: toArray(au.objections),
          motivations: toArray(au.motivations),
          questions: toArray(au.questions),
          buyingTriggers: toArray(au.buying_triggers),
          languagePatterns: toArray(au.language_patterns),
          priority: au.priority ?? 0,
        }
      : null,

    goal: go
      ? {
          id: go.id,
          type: go.type,
          title: go.title,
          description: go.description ?? null,
          metric: go.metric ?? null,
          targetValue: go.target_value ?? null,
          priority: go.priority ?? 0,
          startsAt: go.starts_at ?? null,
          endsAt: go.ends_at ?? null,
        }
      : null,

    offer: of
      ? {
          id: of.id,
          name: of.name,
          description: of.description ?? null,
          priceFrom: of.price_from ?? null,
          priceTo: of.price_to ?? null,
          currency: of.currency ?? null,
          url: of.url ?? null,
          cta: of.cta ?? null,
          benefits: toArray(of.benefits),
          objections: toArray(of.objections),
          seasonality: toObject(of.seasonality),
          availableFrom: of.available_from ?? null,
          availableUntil: of.available_until ?? null,
          priority: of.priority ?? 0,
        }
      : null,
  }
}

/**
 * Primary public server-side function to retrieve the complete MuzaContext for the authenticated user.
 * Resolves the authenticated user, their active OWNER workspace, and the associated Business server-side.
 * Accepts NO client-supplied parameters for security.
 *
 * @returns Promise<MuzaContext>
 */
export async function getMuzaContext(): Promise<MuzaContext> {
  const supabase = await createClient()

  // 1. Retrieve authenticated user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('Utilisateur non authentifié')
  }

  // 2. Retrieve active workspace membership with role OWNER
  const { data: member, error: memberError } = await supabase
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', user.id)
    .eq('status', 'ACTIVE')
    .eq('role', 'OWNER')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (memberError) {
    console.error('Error fetching workspace member:', memberError.message)
    throw new Error(`Erreur lors de la récupération du workspace: ${memberError.message}`)
  }

  if (!member) {
    throw new Error('Aucun espace de travail actif trouvé pour cet utilisateur')
  }

  // 3. Retrieve first Business associated with this active workspace
  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .select('id')
    .eq('workspace_id', member.workspace_id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (bizError) {
    console.error('Error fetching business:', bizError.message)
    throw new Error(`Erreur lors de la récupération du business: ${bizError.message}`)
  }

  if (!business) {
    throw new Error('Aucun business trouvé pour cet espace de travail')
  }

  // 4. Load full MuzaContext for the resolved business and user
  return loadMuzaContextForBusiness(business.id, user.id)
}
