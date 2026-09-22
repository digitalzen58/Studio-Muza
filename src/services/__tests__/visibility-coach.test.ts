import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  deriveStrategicPriority,
  determineNextAction,
  buildBusinessUnderstanding,
  summarizeCommunicationState,
  type CoachInput,
} from '../muza-coach'

test('=== STUDIO MŪZA — STEP 160 DETERMINISTIC VISIBILITY COACH TESTS ===', async (t) => {
  const rootDir = process.cwd()

  await t.test('TEST A & B: /app/muza route exists and requires authentication', () => {
    const pagePath = path.join(rootDir, 'src/app/(dashboard)/app/muza/page.tsx')
    assert.ok(fs.existsSync(pagePath), 'src/app/(dashboard)/app/muza/page.tsx must exist')

    const pageContent = fs.readFileSync(pagePath, 'utf8')
    assert.ok(pageContent.includes('auth.getUser()'), 'Page must verify authenticated user')
    assert.ok(pageContent.includes("redirect('/login')"), 'Unauthenticated user must be redirected to /login')
    assert.ok(pageContent.includes('ensureInitialWorkspace()'), 'Workspace must be resolved')
    assert.ok(pageContent.includes('getActiveWorkspaceBusiness('), 'Business must be resolved from workspace')
  })

  await t.test('TEST C, D, E, F: Navigation enables Mūza on mobile and desktop without disabled state', () => {
    const bottomNavPath = path.join(rootDir, 'src/components/layout/bottom-nav.tsx')
    const sidebarPath = path.join(rootDir, 'src/components/layout/desktop-sidebar.tsx')

    assert.ok(fs.existsSync(bottomNavPath), 'bottom-nav.tsx must exist')
    assert.ok(fs.existsSync(sidebarPath), 'desktop-sidebar.tsx must exist')

    const bottomNavContent = fs.readFileSync(bottomNavPath, 'utf8')
    const sidebarContent = fs.readFileSync(sidebarPath, 'utf8')

    // Mobile nav
    assert.ok(bottomNavContent.includes("{ label: 'Mūza', href: '/app/muza', isMuza: true }"), 'BottomNav must route Mūza to /app/muza')
    assert.ok(!bottomNavContent.includes("{ label: 'Mūza', isMuza: true, disabled: true }"), 'BottomNav must not disable Mūza')

    // Desktop nav
    assert.ok(sidebarContent.includes("{ label: 'Mūza', href: '/app/muza', isMuza: true }"), 'DesktopSidebar must route Mūza to /app/muza')
    assert.ok(!sidebarContent.includes("{ label: 'Mūza', isMuza: true, disabled: true }"), 'DesktopSidebar must not disable Mūza')

    // All 5 destinations exist
    const destinations = ['Accueil', 'Inspirations', 'Créer', 'Calendrier', 'Mūza']
    for (const d of destinations) {
      assert.ok(bottomNavContent.includes(`label: '${d}'`), `BottomNav must contain ${d}`)
    }
  })

  await t.test('TEST G, H, I, J: Page load and coach computations perform ZERO AI or external API calls', () => {
    const muzaCoachPath = path.join(rootDir, 'src/services/muza-coach.ts')
    const pagePath = path.join(rootDir, 'src/app/(dashboard)/app/muza/page.tsx')

    const coachContent = fs.readFileSync(muzaCoachPath, 'utf8')
    const pageContent = fs.readFileSync(pagePath, 'utf8')

    // Zero AI providers in muza-coach or page load
    assert.ok(!coachContent.includes('@google/genai'), 'muza-coach must not call Gemini SDK')
    assert.ok(!coachContent.includes('openai'), 'muza-coach must not call OpenAI')
    assert.ok(!pageContent.includes('generateGeminiRecommendationBatch'), 'MuzaPage must not trigger AI generation on mount')
    assert.ok(!pageContent.includes('fetch('), 'MuzaPage must not trigger arbitrary external fetch calls')
  })

  await t.test('TEST K & L: Active goal interpretation and graceful state without goal', () => {
    // With explicit goal
    const sampleInputWithGoal: CoachInput = {
      business: {
        id: 'biz-1',
        name: 'Gîte du Morvan',
        industry: 'Hébergement touristique',
        city: 'Château-Chinon',
        region: 'Bourgogne',
        description: 'Gîte chaleureux au cœur de la forêt accueillant familles et chiens.',
      },
      goal: {
        id: 'goal-1',
        business_id: 'biz-1',
        offer_id: null,
        type: 'ACQUISITION',
        title: 'Remplir les séjours d’automne',
        description: 'Attirer des couples et familles pour des week-ends nature.',
        timeframe: 'Septembre - Novembre',
        metric: null,
        target_value: null,
        priority: 10,
        starts_at: null,
        ends_at: null,
        status: 'ACTIVE',
      },
      audience: {
        id: 'aud-1',
        business_id: 'biz-1',
        name: 'Couples & familles avec chien',
        description: 'Amoureux de nature et de calme',
        needs: [],
        desires: ['calme', 'nature', 'randonnée'],
        problems: [],
        objections: [],
        motivations: [],
        questions: [],
        buying_triggers: [],
        language_patterns: [],
        priority: 10,
        active: true,
      },
      brandProfile: {
        id: 'bp-1',
        business_id: 'biz-1',
        positioning: 'Un havre de paix au cœur de la forêt',
        promise: null,
        story: null,
        personality: ['Chaleureux', 'Authentique'],
        values: [],
        tone: { description: 'Chaleureux et bienveillant' },
        preferred_vocabulary: [],
        avoided_vocabulary: [],
        signature_phrases: [],
        communication_do: [],
        communication_dont: [],
      },
    }

    const priorityWithGoal = deriveStrategicPriority(sampleInputWithGoal)
    assert.strictEqual(priorityWithGoal.hasExplicitGoal, true)
    assert.strictEqual(priorityWithGoal.goalTitle, 'Remplir les séjours d’automne')
    assert.strictEqual(priorityWithGoal.timeframe, 'Septembre - Novembre')
    assert.ok(priorityWithGoal.coachInterpretation.includes('Couples & familles avec chien'))
    assert.ok(priorityWithGoal.coachInterpretation.includes('Un havre de paix au cœur de la forêt'))

    // Without goal
    const sampleInputNoGoal: CoachInput = {
      business: {
        id: 'biz-2',
        name: 'Atelier Céramique',
        industry: 'Artisanat',
      },
      goal: null,
    }

    const priorityNoGoal = deriveStrategicPriority(sampleInputNoGoal)
    assert.strictEqual(priorityNoGoal.hasExplicitGoal, false)
    assert.strictEqual(priorityNoGoal.goalTitle, 'Définissons votre objectif prioritaire')
    assert.ok(priorityNoGoal.coachInterpretation.includes('Pour guider au mieux votre visibilité'))
  })

  await t.test('TEST M, N, O, P, Q, R: Business understanding uses persisted profile data with 0 technical noise', () => {
    const input: CoachInput = {
      business: {
        id: 'biz-custom',
        name: 'Boulangerie L’Épi d’Or',
        industry: 'Artisanat & Alimentation',
        city: 'Lyon',
        description: 'Pains au levain naturel et farines bio locales.',
      },
      audience: {
        id: 'aud-custom',
        business_id: 'biz-custom',
        name: 'Habitants du quartier et amateurs de bio',
        description: 'Attentifs aux produits sains et au goût authentique',
        desires: ['pain au levain', 'produits locaux'],
        needs: [],
        problems: [],
        objections: [],
        motivations: [],
        questions: [],
        buying_triggers: [],
        language_patterns: [],
        priority: 10,
        active: true,
      },
      brandProfile: {
        id: 'bp-custom',
        business_id: 'biz-custom',
        positioning: 'L’art du vrai pain au levain au quotidien',
        promise: null,
        story: null,
        personality: ['Gourmand', 'Passionné', 'Proche des gens'],
        values: [],
        tone: { description: 'Passionné et chaleureux' },
        preferred_vocabulary: [],
        avoided_vocabulary: [],
        signature_phrases: [],
        communication_do: [],
        communication_dont: [],
      },
      creatorProfile: {
        id: 'cp-custom',
        business_id: 'biz-custom',
        user_id: 'usr-1',
        weekly_minutes: 45,
        camera_comfort: 1,
        voiceover_comfort: 3,
        writing_comfort: 4,
        photo_comfort: 5,
        video_comfort: 2,
        social_skill_level: 'INTERMEDIATE',
        preferred_formats: ['POST'],
        avoided_formats: ['REEL'],
        barriers: [],
        strengths: ['Photos des fournées', 'Histoires de recettes'],
        max_effort_level: 2,
      },
      goal: {
        id: 'goal-custom',
        business_id: 'biz-custom',
        offer_id: null,
        type: 'VISIBILITY',
        title: 'Faire découvrir notre nouveau pain de seigle',
        timeframe: 'Octobre',
        description: 'Booster les ventes du week-end',
        metric: null,
        target_value: null,
        priority: 10,
        starts_at: null,
        ends_at: null,
        status: 'ACTIVE',
      },
    }

    const facts = buildBusinessUnderstanding(input)
    assert.strictEqual(facts.length, 5)

    const [activity, audience, tone, priority, creator] = facts

    // Business name & industry reflected
    assert.ok(activity.value.includes('Boulangerie L’Épi d’Or'))
    assert.ok(activity.value.includes('Artisanat & Alimentation'))
    assert.ok(activity.detail?.includes('Lyon'))

    // Audience reflected
    assert.strictEqual(audience.value, 'Habitants du quartier et amateurs de bio')
    assert.ok(audience.detail?.includes('pain au levain'))

    // Tone reflected
    assert.ok(tone.value.includes('Gourmand, Passionné, Proche des gens'))
    assert.ok(tone.detail?.includes('L’art du vrai pain au levain'))

    // Priority reflected
    assert.strictEqual(priority.value, 'Faire découvrir notre nouveau pain de seigle')
    assert.ok(priority.detail?.includes('Période : Octobre'))

    // Creator preferences reflected
    assert.ok(creator.value.includes('45 min'))
    assert.ok(creator.detail?.includes('plutôt que la vidéo face caméra'))

    // Zero technical JSON / UUID exposure in formatted facts
    for (const f of facts) {
      assert.ok(!f.value.includes('biz-custom'), 'Must not expose UUID')
      assert.ok(!f.value.includes('knowledge_facts'), 'Must not expose internal table names')
      assert.ok(!f.value.includes('{'), 'Must not expose raw JSON')
    }
  })

  await t.test('TEST S, T, U, V, W, X: Next Action Selector priority hierarchy (Draft > Inspirations > Scheduled > Empty > Create)', () => {
    // 1. Relevant unfinished draft (Priority A)
    const draftInput: CoachInput = {
      business: { id: 'biz-1', name: 'Gîte', industry: 'Tourisme' },
      draftContents: [
        {
          id: 'draft-abc-123',
          topic: '3 balades d’automne dans le Morvan',
          hook: 'Envie de nature ce week-end ?',
          updated_at: '2026-09-22T10:00:00Z',
        },
      ],
      usableRecommendationsCount: 3,
      scheduledContents: [{ id: 'sched-1', scheduled_at: '2026-10-15T18:00:00Z' }],
    }

    const actionDraft = determineNextAction(draftInput)
    assert.strictEqual(actionDraft.type, 'DRAFT')
    assert.strictEqual(actionDraft.ctaHref, '/app/content/draft-abc-123')
    assert.strictEqual(actionDraft.ctaLabel, 'Continuer ce brouillon ✦')
    assert.ok(actionDraft.description.includes('3 balades d’automne dans le Morvan'))

    // 2. No draft, but useful recommendations in Inspirations (Priority B)
    const recoInput: CoachInput = {
      business: { id: 'biz-1', name: 'Gîte', industry: 'Tourisme' },
      draftContents: [],
      usableRecommendationsCount: 3,
      scheduledContents: [{ id: 'sched-1', scheduled_at: '2026-10-15T18:00:00Z' }],
    }

    const actionReco = determineNextAction(recoInput)
    assert.strictEqual(actionReco.type, 'RECOMMENDATIONS')
    assert.strictEqual(actionReco.ctaHref, '/app/inspirations')
    assert.strictEqual(actionReco.ctaLabel, 'Découvrir mes idées ✦')
    assert.ok(actionReco.description.includes('3 idées'))

    // 3. No draft, no recommendations, but scheduled content (Priority C)
    const schedInput: CoachInput = {
      business: { id: 'biz-1', name: 'Gîte', industry: 'Tourisme' },
      draftContents: [],
      usableRecommendationsCount: 0,
      scheduledContents: [{ id: 'sched-1', scheduled_at: '2026-10-15T18:00:00Z' }],
    }

    const actionSched = determineNextAction(schedInput)
    assert.strictEqual(actionSched.type, 'SCHEDULED')
    assert.strictEqual(actionSched.ctaHref, '/app/calendar')
    assert.strictEqual(actionSched.ctaLabel, 'Voir mon calendrier')

    // 4. No draft, 0 recommendations, no scheduled content (Priority D)
    const emptyInput: CoachInput = {
      business: { id: 'biz-1', name: 'Gîte', industry: 'Tourisme' },
      draftContents: [],
      usableRecommendationsCount: 0,
      scheduledContents: [],
    }

    const actionEmpty = determineNextAction(emptyInput)
    assert.strictEqual(actionEmpty.type, 'EMPTY_IDEAS')
    assert.strictEqual(actionEmpty.ctaHref, '/app/inspirations')
    assert.strictEqual(actionEmpty.ctaLabel, 'Préparer des idées ✦')

    // 5. Communication Rhythm Summary
    const commSummary = summarizeCommunicationState(draftInput)
    assert.strictEqual(commSummary.activeDraftsCount, 1)
    assert.strictEqual(commSummary.scheduledCount, 1)
    assert.strictEqual(commSummary.usableRecommendationsCount, 3)
    assert.ok(commSummary.summarySentence.includes('1 contenu en cours'))
  })

  await t.test('TEST Y, Z, AA, AB: No fake metrics, no fake SEO scores, no duplicated feed, no chatbot UI', () => {
    const muzaViewPath = path.join(rootDir, 'src/components/muza/muza-view.tsx')
    assert.ok(fs.existsSync(muzaViewPath), 'muza-view.tsx must exist')

    const muzaViewContent = fs.readFileSync(muzaViewPath, 'utf8')

    // No fake metrics
    assert.ok(!muzaViewContent.includes('score /100'), 'Must not display fake score /100')
    assert.ok(!muzaViewContent.includes('CTR'), 'Must not display fake CTR')
    assert.ok(!muzaViewContent.includes('Impressions :'), 'Must not display fake impressions')
    assert.ok(!muzaViewContent.includes('Abonnés :'), 'Must not display fake follower count')

    // No chatbot prompt box
    assert.ok(!muzaViewContent.includes('Posez une question à Mūza'), 'Must not be a chatbot prompt box')
    assert.ok(!muzaViewContent.includes('<input type="text" placeholder="Comment puis-je vous aider'), 'No chat input box')

    // No duplicate recommendations feed
    assert.ok(!muzaViewContent.includes('RecommendationPreviewCard'), 'Must not render full recommendation preview card list')
  })

  await t.test('TEST AC: Strict tenant isolation in MuzaPage', () => {
    const pagePath = path.join(rootDir, 'src/app/(dashboard)/app/muza/page.tsx')
    const pageContent = fs.readFileSync(pagePath, 'utf8')

    assert.ok(pageContent.includes('getActiveWorkspaceBusiness(workspace.workspace_id)'), 'Must scope business to active workspace')
    assert.ok(pageContent.includes(".eq('business_id', business.id)"), 'Must scope drafts and contents to active business')
  })
})
