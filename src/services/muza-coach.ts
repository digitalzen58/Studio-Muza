import { type BrandProfileSummary } from '@/services/brand'
import { type CreatorProfileSummary } from '@/services/creator'
import { type AudienceSummary } from '@/services/audience'
import { type GoalSummary } from '@/services/goal'
import { type OfferSummary } from '@/services/offer'

export type NextActionType = 'DRAFT' | 'RECOMMENDATIONS' | 'SCHEDULED' | 'EMPTY_IDEAS' | 'CREATE'

export interface CoachDraftItem {
  id: string
  topic?: string | null
  hook?: string | null
  updated_at?: string | null
  content_variants?: Array<{
    title?: string | null
    format?: string | null
    platform?: string | null
  }> | null
}

export interface CoachScheduledItem {
  id: string
  topic?: string | null
  scheduled_at: string
  format?: string | null
}

export interface CoachInput {
  business: {
    id: string
    name: string
    industry: string
    subindustry?: string | null
    description?: string | null
    city?: string | null
    region?: string | null
  }
  brandProfile?: BrandProfileSummary | null
  creatorProfile?: CreatorProfileSummary | null
  audience?: AudienceSummary | null
  goal?: (GoalSummary & { timeframe?: string | null }) | null
  offer?: OfferSummary | null
  draftContents?: CoachDraftItem[]
  scheduledContents?: CoachScheduledItem[]
  usableRecommendationsCount?: number
  firstName?: string
}

export interface CoachNextAction {
  type: NextActionType
  badgeLabel: string
  title: string
  description: string
  ctaLabel: string
  ctaHref: string
  draftId?: string
  draftTopic?: string
}

export interface StrategicPrioritySummary {
  goalTitle: string
  goalDescription?: string | null
  timeframe?: string | null
  coachInterpretation: string
  hasExplicitGoal: boolean
}

export interface BusinessUnderstandingFact {
  id: string
  label: string
  value: string
  detail?: string
  iconType: 'business' | 'audience' | 'tone' | 'priority' | 'creator'
}

export interface CommunicationRhythmSummary {
  activeDraftsCount: number
  scheduledCount: number
  nextScheduledDateLabel: string | null
  usableRecommendationsCount: number
  summarySentence: string
}

/**
 * 1. Strategic Priority Synthesizer
 * Interprets the current active goal and generates a warm, editorial coach interpretation.
 * Pure deterministic function — 0 AI calls.
 */
export function deriveStrategicPriority(input: CoachInput): StrategicPrioritySummary {
  const goal = input.goal
  const business = input.business
  const audience = input.audience
  const brand = input.brandProfile

  if (!goal || !goal.title || !goal.title.trim()) {
    return {
      goalTitle: 'Définissons votre objectif prioritaire',
      goalDescription: null,
      timeframe: null,
      coachInterpretation:
        "Pour guider au mieux votre visibilité, Mūza s'appuie sur ce que vous souhaitez accomplir en ce moment (remplir une saison, attirer de nouveaux clients ou valoriser votre savoir-faire).",
      hasExplicitGoal: false,
    }
  }

  const goalTitle = goal.title.trim()
  const timeframe =
    goal.timeframe?.trim() ||
    (goal.starts_at && goal.ends_at ? `${formatMonthYear(goal.starts_at)} - ${formatMonthYear(goal.ends_at)}` : null)
  const goalDesc = goal.description?.trim() || null

  // Generate contextual, warm coaching interpretation
  let interpretation = `Votre priorité actuelle est de réussir votre objectif : « ${goalTitle} ». `

  if (audience?.name) {
    interpretation += `Votre communication doit s'adresser directement à vos clients privilégiés (${audience.name}) `
  } else {
    interpretation += "Votre communication doit valoriser votre activité "
  }

  if (brand?.positioning) {
    interpretation += `en incarnant ce qui fait votre force : ${brand.positioning}.`
  } else if (business.description) {
    interpretation += `en mettant en avant votre savoir-faire unique et vos atouts : ${business.description}.`
  } else {
    interpretation += "en montrant les coulisses, vos atouts uniques et vos offres du moment."
  }

  return {
    goalTitle,
    goalDescription: goalDesc,
    timeframe,
    coachInterpretation: interpretation,
    hasExplicitGoal: true,
  }
}

/**
 * 2. Next-Action Priority Selector
 * Deterministic selection based on real product state:
 * Priority A: Relevant unfinished draft
 * Priority B: Useful recommendations in Inspirations
 * Priority C: Content already scheduled
 * Priority D: No recommendations (prepare ideas)
 * Priority E: Create content fallback
 */
export function determineNextAction(input: CoachInput): CoachNextAction {
  const drafts = input.draftContents || []
  const recommendationsCount = input.usableRecommendationsCount || 0
  const scheduled = input.scheduledContents || []

  // A. Relevant unfinished draft
  if (drafts.length > 0) {
    const primaryDraft = drafts[0]
    const variantTitle = primaryDraft.content_variants?.[0]?.title
    const rawTopic = primaryDraft.topic || variantTitle || 'Contenu en cours'
    const draftTopic = rawTopic.length > 60 ? `${rawTopic.slice(0, 57)}...` : rawTopic

    return {
      type: 'DRAFT',
      badgeLabel: 'Brouillon en cours',
      title: 'Continuez votre contenu en cours',
      description: `Vous avez déjà commencé un brouillon (« ${draftTopic} »). Le terminer et le planifier est l’action la plus efficace pour faire avancer votre visibilité.`,
      ctaLabel: 'Continuer ce brouillon ✦',
      ctaHref: `/app/content/${primaryDraft.id}`,
      draftId: primaryDraft.id,
      draftTopic,
    }
  }

  // B. Useful Community Manager recommendations exist
  if (recommendationsCount > 0) {
    const plural = recommendationsCount > 1
    return {
      type: 'RECOMMENDATIONS',
      badgeLabel: 'Idées prêtes',
      title: 'Choisissez votre prochain sujet de publication',
      description: `Votre Community Manager a préparé ${recommendationsCount} idée${plural ? 's' : ''} sur-mesure pour votre activité. Choisissez celle qui vous inspire le plus pour la transformer en publication.`,
      ctaLabel: 'Découvrir mes idées ✦',
      ctaHref: '/app/inspirations',
    }
  }

  // C. Content scheduled soon
  if (scheduled.length > 0) {
    const nextItem = scheduled[0]
    const dateFormatted = formatShortDate(nextItem.scheduled_at)
    return {
      type: 'SCHEDULED',
      badgeLabel: 'Sur les rails',
      title: 'Votre communication est planifiée',
      description: `Vous avez ${scheduled.length} publication${scheduled.length > 1 ? 's' : ''} prête${scheduled.length > 1 ? 's' : ''} à paraître${dateFormatted ? ` (prochaine le ${dateFormatted})` : ''}. Votre calendrier est actif, vous pouvez anticiper la suite sereinement.`,
      ctaLabel: 'Voir mon calendrier',
      ctaHref: '/app/calendar',
    }
  }

  // D. No recommendations available
  if (recommendationsCount === 0) {
    return {
      type: 'EMPTY_IDEAS',
      badgeLabel: 'Nouveau sujet',
      title: 'Demandez des idées à votre Community Manager',
      description: 'Mūza peut vous proposer une nouvelle sélection de sujets adaptés à votre activité et à votre objectif pour alimenter votre calendrier.',
      ctaLabel: 'Préparer des idées ✦',
      ctaHref: '/app/inspirations',
    }
  }

  // E. Fallback creation
  return {
    type: 'CREATE',
    badgeLabel: 'Création',
    title: 'Créez votre prochaine publication',
    description: 'Partagez une photo, un conseil ou les coulisses de votre activité directement dans le Studio.',
    ctaLabel: 'Créer un contenu ✦',
    ctaHref: '/app/create',
  }
}

/**
 * 3. Business Understanding Memory Formatter
 * Builds 5 structured, high-value editorial memory items from persisted profile data.
 * Pure deterministic function — 0 technical noise.
 */
export function buildBusinessUnderstanding(input: CoachInput): BusinessUnderstandingFact[] {
  const { business, audience, brandProfile, goal, creatorProfile } = input
  const facts: BusinessUnderstandingFact[] = []

  // 1. Votre activité
  let activityValue = business.name
  if (business.industry) {
    activityValue += ` • ${business.industry}`
  }
  const activityLocation = [business.city, business.region].filter(Boolean).join(', ')
  const activityDetail = [activityLocation, business.description].filter(Boolean).join(' — ') || undefined

  facts.push({
    id: 'activity',
    label: 'Votre activité',
    value: activityValue,
    detail: activityDetail,
    iconType: 'business',
  })

  // 2. Vos clients
  if (audience?.name) {
    let audienceDetail = audience.description || ''
    if (audience.desires && audience.desires.length > 0) {
      const desiresStr = audience.desires.slice(0, 3).join(', ')
      audienceDetail = audienceDetail
        ? `${audienceDetail} (Recherchent : ${desiresStr})`
        : `Recherchent : ${desiresStr}`
    }

    facts.push({
      id: 'audience',
      label: 'Vos clients',
      value: audience.name,
      detail: audienceDetail || undefined,
      iconType: 'audience',
    })
  } else {
    facts.push({
      id: 'audience',
      label: 'Vos clients',
      value: 'Profil de clientèle à préciser',
      detail: 'Mūza personnalise ses recommandations en fonction des besoins de vos clients idéaux.',
      iconType: 'audience',
    })
  }

  // 3. Votre ton & identité
  if (brandProfile) {
    const personalityTraits = Array.isArray(brandProfile.personality) ? brandProfile.personality : []
    const toneDesc =
      typeof brandProfile.tone === 'object' && brandProfile.tone !== null
        ? (brandProfile.tone as { description?: string }).description
        : undefined

    const toneValue =
      personalityTraits.length > 0
        ? personalityTraits.join(', ')
        : toneDesc || 'Chaleureux, authentique et professionnel'

    facts.push({
      id: 'tone',
      label: 'Votre ton & style',
      value: toneValue,
      detail: brandProfile.positioning || undefined,
      iconType: 'tone',
    })
  } else {
    facts.push({
      id: 'tone',
      label: 'Votre ton & style',
      value: 'Chaleureux et accessible',
      detail: 'Le ton reflète la personnalité de votre établissement.',
      iconType: 'tone',
    })
  }

  // 4. Votre priorité actuelle
  if (goal?.title) {
    facts.push({
      id: 'priority',
      label: 'Votre priorité',
      value: goal.title,
      detail: goal.timeframe ? `Période : ${goal.timeframe}` : goal.description || undefined,
      iconType: 'priority',
    })
  } else {
    facts.push({
      id: 'priority',
      label: 'Votre priorité',
      value: 'Objectif à définir',
      detail: 'Fixer un cap permet de concevoir des publications qui génèrent des résultats concrets.',
      iconType: 'priority',
    })
  }

  // 5. Votre façon de créer
  if (creatorProfile) {
    const strengths = Array.isArray(creatorProfile.strengths) ? creatorProfile.strengths : []
    const preferredFormats = Array.isArray(creatorProfile.preferred_formats) ? creatorProfile.preferred_formats : []
    const weeklyMinutes = creatorProfile.weekly_minutes || 60

    let creationValue = `~${weeklyMinutes} min par semaine`
    if (strengths.length > 0) {
      creationValue += ` • Atouts : ${strengths.join(', ')}`
    } else if (preferredFormats.length > 0) {
      creationValue += ` • Formats : ${preferredFormats.join(', ')}`
    }

    const cameraComfort = creatorProfile.camera_comfort ?? 3
    let creationDetail = ''
    if (cameraComfort <= 2) {
      creationDetail = 'Privilégie les photos, l’écrit et les coulisses plutôt que la vidéo face caméra.'
    } else {
      creationDetail = 'À l’aise avec la photo, le texte et la présentation de son activité.'
    }

    facts.push({
      id: 'creator',
      label: 'Votre façon de créer',
      value: creationValue,
      detail: creationDetail,
      iconType: 'creator',
    })
  } else {
    facts.push({
      id: 'creator',
      label: 'Votre façon de créer',
      value: '~60 min par semaine',
      detail: 'Formats simples, photos et messages courts adaptés à votre temps disponible.',
      iconType: 'creator',
    })
  }

  return facts
}

/**
 * 4. Communication Rhythm Summary
 * Builds human-readable state of active drafts, scheduled posts and recommendations.
 */
export function summarizeCommunicationState(input: CoachInput): CommunicationRhythmSummary {
  const draftsCount = input.draftContents?.length || 0
  const scheduledCount = input.scheduledContents?.length || 0
  const recommendationsCount = input.usableRecommendationsCount || 0

  let nextScheduledDateLabel: string | null = null
  if (input.scheduledContents && input.scheduledContents.length > 0) {
    nextScheduledDateLabel = formatShortDate(input.scheduledContents[0].scheduled_at)
  }

  let summarySentence = ''
  if (draftsCount > 0 && scheduledCount > 0) {
    summarySentence = `Vous avez ${draftsCount} contenu en cours et ${scheduledCount} publication${scheduledCount > 1 ? 's' : ''} déjà prévue${scheduledCount > 1 ? 's' : ''}.`
  } else if (draftsCount > 0) {
    summarySentence = `Vous avez ${draftsCount} contenu en cours de préparation.`
  } else if (scheduledCount > 0) {
    summarySentence = `${scheduledCount} publication${scheduledCount > 1 ? 's' : ''} ${scheduledCount > 1 ? 'sont' : 'est'} déjà planifiée${scheduledCount > 1 ? 's' : ''}.`
  } else {
    summarySentence = 'Aucun contenu n’est actuellement planifié.'
  }

  return {
    activeDraftsCount: draftsCount,
    scheduledCount,
    nextScheduledDateLabel,
    usableRecommendationsCount: recommendationsCount,
    summarySentence,
  }
}

/**
 * Helper to format date strings in readable French.
 */
function formatShortDate(isoString?: string | null): string | null {
  if (!isoString) return null
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return null
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  } catch {
    return null
  }
}

function formatMonthYear(isoString?: string | null): string | null {
  if (!isoString) return null
  try {
    const d = new Date(isoString)
    if (isNaN(d.getTime())) return null
    return d.toLocaleDateString('fr-FR', {
      month: 'long',
      year: 'numeric',
    })
  } catch {
    return null
  }
}
