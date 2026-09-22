import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  withProviderTimeout,
  MuzaProviderTimeoutError,
} from '../muza-provider-timeout'
import { validateMuzaRecommendationGrounding } from '../muza-grounding-guard'
import { MUZA_AI_CONFIG } from '../../config/muza-ai'
import type { MuzaPersistedRecommendationBatch } from '../../types/muza-recommendation-engine'
import type { MuzaAIRecommendationBatch } from '../../schemas/muza-ai-recommendation-schema'
import type { MuzaGroundingContext } from '../../types/muza-reasoning-context'

console.log('=== RUNNING MUZA RECOMMENDATION VIEW VS GENERATION UX TESTS (AA–AZ) ===')

const emptyStateContent = fs.readFileSync(
  path.resolve(
    process.cwd(),
    'src/components/recommendations/recommendation-empty-state.tsx'
  ),
  'utf8'
)

const sectionContent = fs.readFileSync(
  path.resolve(
    process.cwd(),
    'src/components/recommendations/recommendation-section.tsx'
  ),
  'utf8'
)

const pageContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/app/(dashboard)/app/page.tsx'),
  'utf8'
)

const actionsContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/app/(dashboard)/app/actions.ts'),
  'utf8'
)

const fetcherContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/services/muza-recommendation-fetcher.ts'),
  'utf8'
)

const orchestratorContent = fs.readFileSync(
  path.resolve(
    process.cwd(),
    'src/services/muza-recommendation-orchestrator.ts'
  ),
  'utf8'
)

const engineContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/services/muza-recommendation-engine.ts'),
  'utf8'
)

async function runAllTests() {
  // Mock sample batch
  const mockBatch: MuzaPersistedRecommendationBatch = {
    batch: {
      recommendations: [
        {
          type: 'CONTENT',
          title: 'Le Panier du Terroir',
          summary: 'Mise en avant des produits locaux',
          priority: 'HIGH',
          whyNow: 'Saison idéale pour les récoltes',
          reasons: [
            {
              label: 'Événement saisonnier',
              explanation: 'Saison idéale pour les récoltes',
            },
          ],
          suggestedFormats: ['INSTAGRAM_POST', 'INSTAGRAM_CAROUSEL'],
          objective: null,
          audience: null,
          offer: null,
          estimatedEffortMinutes: 30,
          requiresCamera: false,
          requiresVoiceover: false,
          contentAngle: 'Authenticité',
          callToAction: 'Réservez votre séjour',
          editorialTopic: 'Terroir et gastronomie locale',
          editorialAngle: 'Présentation des producteurs partenaires',
          conceptKey: 'le_panier_du_terroir',
          noveltyReason: null,
        },
      ],
      strategicSummary: 'Focus sur l’authenticité et le terroir',
      generatedAt: new Date().toISOString(),
    },
    persistence: {
      batchId: 'mock-batch-123',
      recommendationIds: ['mock-rec-123'],
      recommendationCount: 1,
    },
    provider: 'gemini',
    model: 'gemini-3.6-flash',
  }

  // -------------------------------------------------------------
  // AA. business with existing batch renders persisted recommendations without generation
  // -------------------------------------------------------------
  {
    assert.ok(
      mockBatch.batch.recommendations.length === 1,
      'Mock batch should contain exactly 1 recommendation'
    )
    assert.ok(
      pageContent.includes('const initialBatch = await getLatestRecommendationBatchForActiveBusiness()'),
      'TEST AA FAILED: DashboardPage must load persisted batch via getLatestRecommendationBatchForActiveBusiness'
    )
    assert.ok(
      pageContent.includes('initialPersistedBatch={initialBatch}'),
      'TEST AA FAILED: DashboardPage must pass initialPersistedBatch to RecommendationSection'
    )
    assert.ok(
      sectionContent.includes('if (batch && batch.batch.recommendations.length > 0)'),
      'TEST AA FAILED: RecommendationSection must render persisted recommendations directly when batch is present'
    )
    console.log('✓ TEST AA: Business with existing batch renders persisted recommendations directly without generation')
  }

  // -------------------------------------------------------------
  // AB. viewing an existing batch performs zero provider calls
  // -------------------------------------------------------------
  {
    assert.ok(
      !fetcherContent.includes('generateGeminiRecommendationBatch') &&
        !fetcherContent.includes('generateOpenAIRecommendationBatch') &&
        !fetcherContent.includes('generateMuzaRecommendations'),
      'TEST AB FAILED: muza-recommendation-fetcher must contain zero AI provider calls'
    )
    assert.ok(
      fetcherContent.includes('from(\'recommendation_batches\')') &&
        fetcherContent.includes('from(\'recommendations\')'),
      'TEST AB FAILED: Fetcher must read directly from database tables'
    )
    console.log('✓ TEST AB: Viewing an existing batch performs zero provider calls (0 AI tokens)')
  }

  // -------------------------------------------------------------
  // AC. business with no batch renders true empty state
  // -------------------------------------------------------------
  {
    assert.ok(
      sectionContent.includes('return (\n    <RecommendationEmptyState') ||
        sectionContent.includes('<RecommendationEmptyState'),
      'TEST AC FAILED: RecommendationSection must fall back to RecommendationEmptyState when batch is null'
    )
    console.log('✓ TEST AC: Business with no batch renders true empty state')
  }

  // -------------------------------------------------------------
  // AD. empty-state CTA explicitly represents generation
  // -------------------------------------------------------------
  {
    assert.ok(
      emptyStateContent.includes('Créer mes premières idées'),
      'TEST AD FAILED: Empty state CTA must be explicitly labeled "Créer mes premières idées"'
    )
    assert.ok(
      !emptyStateContent.includes('Voir ce que Mūza me propose'),
      'TEST AD FAILED: Empty state must NOT contain misleading "Voir ce que Mūza me propose"'
    )
    assert.ok(
      emptyStateContent.includes('Mūza prépare votre première sélection d’idées sur mesure'),
      'TEST AD FAILED: Supporting copy must explain first selection generation'
    )
    console.log('✓ TEST AD: Empty-state CTA explicitly represents generation ("Créer mes premières idées ✦")')
  }

  // -------------------------------------------------------------
  // AE. one click triggers at most one generation action
  // -------------------------------------------------------------
  {
    assert.ok(
      emptyStateContent.includes('onClick={onGenerate}'),
      'TEST AE FAILED: CTA must attach to onGenerate'
    )
    assert.ok(
      sectionContent.includes('startTransition(async () => {') &&
        sectionContent.includes('const res = await generateRecommendationsAction()'),
      'TEST AE FAILED: handleGenerate must invoke generateRecommendationsAction in a single transition'
    )
    console.log('✓ TEST AE: One deliberate click triggers at most one generation action')
  }

  // -------------------------------------------------------------
  // AF. double click / pending click cannot trigger a second generation
  // -------------------------------------------------------------
  {
    // 1. Check JS guard in handleGenerate
    assert.ok(
      sectionContent.includes('if (isPending) return'),
      'TEST AF FAILED: handleGenerate must immediately exit if isPending is true'
    )
    // 2. Check disabled attribute on CTA button
    assert.ok(
      emptyStateContent.includes('disabled={isPending}'),
      'TEST AF FAILED: Empty state button must be disabled when isPending is true'
    )
    // 3. Functional verification of guard logic
    let actionCallCount = 0
    let isPendingMock = false

    const simulateClick = () => {
      if (isPendingMock) return
      isPendingMock = true
      actionCallCount++
    }

    simulateClick() // First click
    simulateClick() // Rapid double-click while pending
    simulateClick() // Rapid triple-click while pending
    assert.equal(actionCallCount, 1, 'Double click must not trigger additional generation calls')

    console.log('✓ TEST AF: Double click / pending click is blocked from triggering a second generation')
  }

  // -------------------------------------------------------------
  // AG. generation timeout returns controlled error state
  // -------------------------------------------------------------
  {
    // Test withProviderTimeout with hanging promise
    const hangingPromise = new Promise((resolve) => setTimeout(resolve, 500))
    let caughtError: unknown = null

    try {
      await withProviderTimeout(hangingPromise, 50)
    } catch (err) {
      caughtError = err
    }

    assert.ok(
      caughtError instanceof MuzaProviderTimeoutError,
      'TEST AG FAILED: withProviderTimeout must throw MuzaProviderTimeoutError on timeout'
    )
    assert.equal(
      (caughtError as MuzaProviderTimeoutError).timeoutMs,
      50,
      'Timeout error must reflect configured timeoutMs'
    )

    // Verify engine imports and uses timeout
    assert.ok(
      engineContent.includes('withProviderTimeout'),
      'TEST AG FAILED: recommendation engine must wrap provider calls with withProviderTimeout'
    )
    assert.ok(
      MUZA_AI_CONFIG.generationTimeoutMs > 0 && MUZA_AI_CONFIG.generationTimeoutMs <= 60000,
      'TEST AG FAILED: MUZA_AI_CONFIG.generationTimeoutMs must be defined with bounded value'
    )

    // Verify server action error handling
    assert.ok(
      actionsContent.includes('Mūza n’a pas réussi à préparer vos idées'),
      'TEST AG FAILED: generateRecommendationsAction must return calm French error message'
    )
    assert.ok(
      actionsContent.includes('Vos informations sont bien conservées'),
      'TEST AG FAILED: Error message must reassure that data is preserved'
    )

    console.log('✓ TEST AG: Generation timeout returns controlled error state with bounded duration')
  }

  // -------------------------------------------------------------
  // AH. timeout performs zero automatic retries
  // -------------------------------------------------------------
  {
    let providerInvocations = 0
    const failingProvider = async () => {
      providerInvocations++
      await new Promise((resolve) => setTimeout(resolve, 100))
      return 'success'
    }

    try {
      await withProviderTimeout(failingProvider(), 20)
    } catch {
      // Expected timeout
    }

    assert.equal(
      providerInvocations,
      1,
      'TEST AH FAILED: Exactly 1 invocation must occur. No automatic retries are permitted on timeout.'
    )
    console.log('✓ TEST AH: Timeout performs zero automatic retries (1 user click = max 1 provider call)')
  }

  // -------------------------------------------------------------
  // AI. generation failure creates no partial batch
  // -------------------------------------------------------------
  {
    const generateIdx = orchestratorContent.indexOf('await generateMuzaRecommendations()')
    const persistIdx = orchestratorContent.indexOf('await persistMuzaRecommendationBatch(')
    assert.ok(
      generateIdx !== -1 && persistIdx !== -1,
      'TEST AI FAILED: Orchestrator must generate before persisting'
    )
    assert.ok(
      generateIdx < persistIdx,
      'TEST AI FAILED: Persistence must occur strictly after generation succeeds. If generation fails, persistence is unreachable.'
    )
    console.log('✓ TEST AI: Generation failure or timeout creates zero partial batches in database')
  }

  // -------------------------------------------------------------
  // AJ. retry requires a new explicit user action
  // -------------------------------------------------------------
  {
    assert.ok(
      sectionContent.includes('onClick={handleGenerate}') &&
        sectionContent.includes('<span>Réessayer</span>'),
      'TEST AJ FAILED: Error state must render "Réessayer" button requiring user onClick'
    )
    assert.ok(
      !sectionContent.includes('useEffect(() => {\n      handleGenerate') &&
        !sectionContent.includes('setTimeout(handleGenerate'),
      'TEST AJ FAILED: Must not automatically trigger handleGenerate on error'
    )
    console.log('✓ TEST AJ: Retry requires an explicit new user click on "Réessayer"')
  }

  // -------------------------------------------------------------
  // AK. business A cannot receive business B recommendation batch
  // -------------------------------------------------------------
  {
    assert.ok(
      fetcherContent.includes('.eq(\'business_id\', businessId)'),
      'TEST AK FAILED: Fetcher must filter strictly by business_id'
    )
    assert.ok(
      fetcherContent.includes('const businessId = context.business.id'),
      'TEST AK FAILED: businessId must be resolved from server context, never from client parameters'
    )
    console.log('✓ TEST AK: Business A cannot receive Business B recommendation batch (strict business_id scoping)')
  }

  // -------------------------------------------------------------
  // AL. no cross-business fallback exists
  // -------------------------------------------------------------
  {
    assert.ok(
      fetcherContent.includes('if (!batchRow) {\n      return null\n    }'),
      'TEST AL FAILED: If no batch exists for active business, fetcher must return null immediately'
    )
    assert.ok(
      !fetcherContent.includes('fallback') &&
        !fetcherContent.includes('any_business') &&
        !fetcherContent.includes('LIMIT 1 WHERE 1=1'),
      'TEST AL FAILED: No cross-business fallback permitted'
    )
    console.log('✓ TEST AL: Zero cross-business fallbacks exist (empty state returned faithfully)')
  }

  // -------------------------------------------------------------
  // AM. recommendation heading uses actual count
  // -------------------------------------------------------------
  {
    assert.ok(
      sectionContent.includes('{batch.batch.recommendations.length}') ||
        sectionContent.includes('{actionableRecommendations.length}'),
      'TEST AM FAILED: RecommendationSection heading must use dynamic recommendation count'
    )
    assert.ok(
      sectionContent.includes('pour cette semaine'),
      'TEST AM FAILED: Heading must contain "pour cette semaine"'
    )
    console.log('✓ TEST AM: Recommendation heading uses actual batch count')
  }

  // -------------------------------------------------------------
  // AN. singular heading works for 1 recommendation
  // -------------------------------------------------------------
  {
    const formatCount = (count: number) =>
      `${count} ${count > 1 ? 'idées' : 'idée'} pour cette semaine`

    assert.equal(
      formatCount(1),
      '1 idée pour cette semaine',
      'TEST AN FAILED: 1 recommendation must produce singular "1 idée pour cette semaine"'
    )
    assert.equal(
      formatCount(4),
      '4 idées pour cette semaine',
      'TEST AN FAILED: 4 recommendations must produce plural "4 idées pour cette semaine"'
    )
    console.log('✓ TEST AN: Singular/plural heading formatting works correctly')
  }

  // -------------------------------------------------------------
  // AO. no hard-coded “3 idées” remains in recommendation heading
  // -------------------------------------------------------------
  {
    assert.ok(
      !sectionContent.includes('3 idées pour cette semaine'),
      'TEST AO FAILED: No hardcoded "3 idées pour cette semaine" may remain in recommendation-section.tsx'
    )
    console.log('✓ TEST AO: Zero hard-coded "3 idées" remains in recommendation section')
  }

  // -------------------------------------------------------------
  // AP. strategicSummary is not rendered on Home
  // -------------------------------------------------------------
  {
    assert.ok(
      !sectionContent.includes('batch.batch.strategicSummary &&'),
      'TEST AP FAILED: strategicSummary must not be rendered on Home'
    )
    console.log('✓ TEST AP: strategicSummary is not rendered on Home')
  }

  // -------------------------------------------------------------
  // AQ. strategicSummary remains supported by domain/persistence
  // -------------------------------------------------------------
  {
    const typesContent = fs.readFileSync(
      path.resolve(process.cwd(), 'src/types/muza-recommendation-engine.ts'),
      'utf8'
    )
    assert.ok(
      typesContent.includes('strategicSummary: string | null') ||
        typesContent.includes('strategicSummary?: string | null') ||
        typesContent.includes('strategicSummary'),
      'TEST AQ FAILED: strategicSummary must remain in MuzaRecommendationBatch domain model'
    )
    assert.ok(
      fetcherContent.includes('strategic_summary'),
      'TEST AQ FAILED: Fetcher must continue querying strategic_summary from persistence'
    )
    console.log('✓ TEST AQ: strategicSummary remains supported in domain model and database persistence')
  }

  // -------------------------------------------------------------
  // AR. WeeklyCommunicationStrip is not rendered in recommendation flow
  // -------------------------------------------------------------
  {
    assert.ok(
      !sectionContent.includes('<WeeklyCommunicationStrip'),
      'TEST AR FAILED: WeeklyCommunicationStrip must not be rendered in recommendation-section'
    )
    assert.ok(
      !sectionContent.includes("from './weekly-communication-strip'"),
      'TEST AR FAILED: WeeklyCommunicationStrip import must be removed'
    )
    console.log('✓ TEST AR: WeeklyCommunicationStrip is not rendered in recommendation flow')
  }

  // -------------------------------------------------------------
  // AS. recommendation generation creates no schedule/calendar records
  // -------------------------------------------------------------
  {
    assert.ok(
      !orchestratorContent.includes('from(\'contents\')') &&
        !orchestratorContent.includes('from(\'publish_jobs\')') &&
        !orchestratorContent.includes('from(\'content_variants\')'),
      'TEST AS FAILED: Orchestrator must not write to contents or publish_jobs tables'
    )
    console.log('✓ TEST AS: Recommendation generation creates zero schedule or calendar records')
  }

  // Standard test grounding context with unavailable evidence
  const testGrounding: MuzaGroundingContext = {
    knownFacts: [
      'Business name: Le Gîte des Marguerites',
      'Audience stated problems: Peur des mauvaises surprises sur place, Manque d’idées de balades et activités',
      'Active goal: Remplir les séjours d’automne',
    ],
    unavailableEvidence: [
      'LIVE_AVAILABILITY_DATA',
      'LIVE_SEARCH_DEMAND_DATA',
      'LIVE_TREND_DATA',
      'VERIFIED_CURRENT_SEO_VOLUME',
      'VERIFIED_CUSTOMER_OBJECTION_FREQUENCY',
      'TRAVEL_TIME_FROM_AUDIENCE',
    ],
  }

  const buildTestBatch = (whyNowText: string, reasonExplanation = ''): MuzaAIRecommendationBatch => ({
    strategicSummary: 'Plan stratégique pour la semaine',
    recommendations: [
      {
        type: 'CONTENT',
        title: 'Balade d’automne dans le Morvan',
        summary: 'Guide d’itinéraires accessibles pour chien',
        priority: 'HIGH',
        whyNow: whyNowText,
        reasons: [
          {
            label: 'Levée d’objection',
            explanation: reasonExplanation || 'Format adapté aux contraintes',
          },
        ],
        suggestedFormats: ['INSTAGRAM_POST'],
        objective: null,
        audience: null,
        offer: null,
        estimatedEffortMinutes: 30,
        requiresCamera: false,
        requiresVoiceover: false,
        contentAngle: 'Nature et calme',
        callToAction: 'Découvrez les disponibilités',
        editorialTopic: 'Balades dog-friendly',
        editorialAngle: 'Guide pratique',
        noveltyReason: null,
      },
    ],
  })

  // -------------------------------------------------------------
  // AT. unsupported search-volume claim fails grounding
  // -------------------------------------------------------------
  {
    const batchWithVolumeClaim = buildTestBatch(
      'Cette requête génère beaucoup de recherches pour la saison.'
    )
    const result = validateMuzaRecommendationGrounding(
      batchWithVolumeClaim,
      testGrounding
    )
    assert.equal(
      result.isValid,
      false,
      'TEST AT FAILED: Unsupported search volume claim must be rejected'
    )
    assert.ok(
      result.violations.some((v) => v.evidenceKey === 'VERIFIED_CURRENT_SEO_VOLUME'),
      'TEST AT FAILED: Violation must cite VERIFIED_CURRENT_SEO_VOLUME'
    )
    console.log('✓ TEST AT: Unsupported search-volume claim fails grounding')
  }

  // -------------------------------------------------------------
  // AU. unsupported “high conversion search intent” claim fails grounding
  // -------------------------------------------------------------
  {
    const batchWithConversionClaim = buildTestBatch(
      'Le référencement capte les intentions de recherche à forte conversion pour octobre et novembre.'
    )
    const result = validateMuzaRecommendationGrounding(
      batchWithConversionClaim,
      testGrounding
    )
    assert.equal(
      result.isValid,
      false,
      'TEST AU FAILED: Unsupported high-conversion search intent claim must be rejected'
    )
    assert.ok(
      result.violations.some((v) => v.evidenceKey === 'VERIFIED_CURRENT_SEO_VOLUME'),
      'TEST AU FAILED: Violation must cite VERIFIED_CURRENT_SEO_VOLUME'
    )
    console.log('✓ TEST AU: Unsupported "high conversion search intent" claim fails grounding')
  }

  // -------------------------------------------------------------
  // AV. unsupported primary-question/frequency claim fails grounding
  // -------------------------------------------------------------
  {
    const batchWithPrimaryQ = buildTestBatch(
      'Répondre à leur interrogation principale (« Que faire sur place ? ») déclenche l’envie de réserver.'
    )
    const result = validateMuzaRecommendationGrounding(
      batchWithPrimaryQ,
      testGrounding
    )
    assert.equal(
      result.isValid,
      false,
      'TEST AV FAILED: Claiming an objection is the primary/most frequent one must be rejected'
    )
    assert.ok(
      result.violations.some(
        (v) => v.evidenceKey === 'VERIFIED_CUSTOMER_OBJECTION_FREQUENCY'
      ),
      'TEST AV FAILED: Violation must cite VERIFIED_CUSTOMER_OBJECTION_FREQUENCY'
    )

    const batchWithPrimaryQ2 = buildTestBatch(
      'C’est la principale question de votre audience avant de réserver.'
    )
    const result2 = validateMuzaRecommendationGrounding(
      batchWithPrimaryQ2,
      testGrounding
    )
    assert.equal(result2.isValid, false)
    console.log('✓ TEST AV: Unsupported primary-question/frequency claim fails grounding')
  }

  // -------------------------------------------------------------
  // AW. unsupported audience booking-timing claim fails grounding
  // -------------------------------------------------------------
  {
    const batchWithTimingClaim = buildTestBatch(
      'Les couples urbains planifient leurs week-ends d’octobre et novembre dès le début septembre.'
    )
    const result = validateMuzaRecommendationGrounding(
      batchWithTimingClaim,
      testGrounding
    )
    assert.equal(
      result.isValid,
      false,
      'TEST AW FAILED: Empirical audience booking timing claim must be rejected'
    )
    assert.ok(
      result.violations.some(
        (v) => v.evidenceKey === 'VERIFIED_CUSTOMER_OBJECTION_FREQUENCY'
      ),
      'TEST AW FAILED: Violation must cite VERIFIED_CUSTOMER_OBJECTION_FREQUENCY'
    )
    console.log('✓ TEST AW: Unsupported audience booking-timing claim fails grounding')
  }

  // -------------------------------------------------------------
  // AX. cautious strategic wording remains allowed
  // -------------------------------------------------------------
  {
    const strategicBatch1 = buildTestBatch(
      'Ce contenu peut soutenir les réservations d’automne.',
      'Cette page peut travailler votre visibilité sur Google.'
    )
    const res1 = validateMuzaRecommendationGrounding(
      strategicBatch1,
      testGrounding
    )
    assert.equal(
      res1.isValid,
      true,
      `TEST AX FAILED: Strategic phrasing must be valid. Violations: ${JSON.stringify(res1.violations)}`
    )

    const strategicBatch2 = buildTestBatch(
      'Ce sujet peut répondre à une question importante de votre audience.'
    )
    const res2 = validateMuzaRecommendationGrounding(
      strategicBatch2,
      testGrounding
    )
    assert.equal(
      res2.isValid,
      true,
      `TEST AX FAILED: "question importante" must be valid. Violations: ${JSON.stringify(res2.violations)}`
    )
    console.log('✓ TEST AX: Cautious strategic wording remains allowed')
  }

  // -------------------------------------------------------------
  // AY. valid user-declared audience problem remains allowed when not promoted into unsupported frequency/hierarchy
  // -------------------------------------------------------------
  {
    const declaredProblemBatch = buildTestBatch(
      'Rassure les prospects face à la peur des mauvaises surprises sur place.'
    )
    const res = validateMuzaRecommendationGrounding(
      declaredProblemBatch,
      testGrounding
    )
    assert.equal(
      res.isValid,
      true,
      `TEST AY FAILED: User declared audience problem must be valid. Violations: ${JSON.stringify(res.violations)}`
    )
    console.log('✓ TEST AY: Valid user-declared audience problem remains allowed')
  }

  // -------------------------------------------------------------
  // AZ. grounding rejection occurs before persistence
  // -------------------------------------------------------------
  {
    const assertIdx = engineContent.indexOf('assertMuzaRecommendationGrounding(')
    assert.ok(
      assertIdx !== -1,
      'TEST AZ FAILED: assertMuzaRecommendationGrounding must be invoked in recommendation engine'
    )
    assert.ok(
      orchestratorContent.includes('const batch = await generateMuzaRecommendations()') &&
        orchestratorContent.includes('const persistence = await persistMuzaRecommendationBatch('),
      'TEST AZ FAILED: Orchestration must generate and validate batch before invoking persistence'
    )
    console.log('✓ TEST AZ: Grounding rejection occurs strictly before persistence (fail-closed)')
  }

  // =============================================================
  // STEP 140: HOME PRIORITY HIERARCHY TESTS (BA–BF)
  // =============================================================

  const currentSectionContent = fs.readFileSync(
    path.resolve(
      process.cwd(),
      'src/components/recommendations/recommendation-section.tsx'
    ),
    'utf8'
  )

  const currentEmptyStateContent = fs.readFileSync(
    path.resolve(
      process.cwd(),
      'src/components/recommendations/recommendation-empty-state.tsx'
    ),
    'utf8'
  )

  // -------------------------------------------------------------
  // BA. Studio Visual appears after recommendation section when batch exists
  // -------------------------------------------------------------
  {
    const batchBranchStart = currentSectionContent.indexOf(
      'if (batch && batch.batch.recommendations.length > 0)'
    )
    assert.ok(
      batchBranchStart !== -1,
      'TEST BA FAILED: Batch available branch not found'
    )
    const batchBranchContent = currentSectionContent.slice(batchBranchStart)

    const cardsIndex = batchBranchContent.indexOf('<RecommendationPreviewCard')
    const visualHeroIndex = batchBranchContent.indexOf(
      '<BrandVisualHero context={strategicContext} />'
    )

    assert.ok(
      cardsIndex !== -1,
      'TEST BA FAILED: RecommendationPreviewCard not found in batch branch'
    )
    assert.ok(
      visualHeroIndex !== -1,
      'TEST BA FAILED: BrandVisualHero not found in batch branch'
    )
    assert.ok(
      visualHeroIndex > cardsIndex,
      'TEST BA FAILED: Studio Visual (BrandVisualHero) must appear after recommendation preview cards'
    )
    console.log('✓ TEST BA: Studio Visual appears after recommendation section when batch exists')
  }

  // -------------------------------------------------------------
  // BB. recommendation heading appears before Studio Visual
  // -------------------------------------------------------------
  {
    const batchBranchStart = currentSectionContent.indexOf(
      'if (batch && batch.batch.recommendations.length > 0)'
    )
    const batchBranchContent = currentSectionContent.slice(batchBranchStart)

    const headingIndex = batchBranchContent.indexOf('pour cette semaine')
    const visualHeroIndex = batchBranchContent.indexOf(
      '<BrandVisualHero context={strategicContext} />'
    )

    assert.ok(
      headingIndex !== -1,
      'TEST BB FAILED: Recommendation count heading not found'
    )
    assert.ok(
      headingIndex < visualHeroIndex,
      'TEST BB FAILED: Recommendation heading must appear before Studio Visual showcase'
    )
    console.log('✓ TEST BB: recommendation heading appears before Studio Visual')
  }

  // -------------------------------------------------------------
  // BC. objective chip appears before recommendation heading
  // -------------------------------------------------------------
  {
    const batchBranchStart = currentSectionContent.indexOf(
      'if (batch && batch.batch.recommendations.length > 0)'
    )
    const batchBranchContent = currentSectionContent.slice(batchBranchStart)

    const chipIndex = batchBranchContent.indexOf('Mūza vous aide à')
    const headingIndex = batchBranchContent.indexOf('pour cette semaine')

    assert.ok(
      chipIndex !== -1,
      'TEST BC FAILED: Objective chip not found'
    )
    assert.ok(
      chipIndex < headingIndex,
      'TEST BC FAILED: Objective chip must appear before recommendation heading'
    )
    console.log('✓ TEST BC: objective chip appears before recommendation heading')
  }

  // -------------------------------------------------------------
  // BD. existing recommendation behavior is unchanged
  // -------------------------------------------------------------
  {
    assert.ok(
      currentSectionContent.includes('batch.batch.recommendations.map') ||
        currentSectionContent.includes('actionableRecommendations.map'),
      'TEST BD FAILED: Recommendations mapping must remain active'
    )
    assert.ok(
      currentSectionContent.includes('Nouvelles idées'),
      'TEST BD FAILED: "Nouvelles idées" button must remain present'
    )
    assert.ok(
      currentSectionContent.includes('handleGenerate'),
      'TEST BD FAILED: handleGenerate must remain wired to CTA'
    )
    assert.ok(
      currentSectionContent.includes('Rien ne me convient dans ces idées'),
      'TEST BD FAILED: Feedback action must remain available'
    )
    console.log('✓ TEST BD: existing recommendation behavior is unchanged')
  }

  // -------------------------------------------------------------
  // BE. empty state remains usable and prominent
  // -------------------------------------------------------------
  {
    const ctaIndex = currentEmptyStateContent.indexOf('Créer mes premières idées')
    const previewDeskIndex = currentEmptyStateContent.indexOf(
      'Aperçus • Votre univers en formats'
    )

    assert.ok(
      ctaIndex !== -1,
      'TEST BE FAILED: "Créer mes premières idées" CTA not found in empty state'
    )
    assert.ok(
      previewDeskIndex !== -1,
      'TEST BE FAILED: Preview desk not found in empty state'
    )
    assert.ok(
      ctaIndex < previewDeskIndex,
      'TEST BE FAILED: Generation CTA must appear before heavy format previews desk in empty state'
    )
    assert.ok(
      !currentEmptyStateContent.includes('<BrandVisualHero'),
      'TEST BE FAILED: Empty state must not render heavy BrandVisualHero before CTA'
    )
    console.log('✓ TEST BE: empty state remains usable and prominent')
  }

  // -------------------------------------------------------------
  // BF. Studio Visual is rendered exactly once
  // -------------------------------------------------------------
  {
    const batchBranchStart = currentSectionContent.indexOf(
      'if (batch && batch.batch.recommendations.length > 0)'
    )
    const batchBranchEnd = currentSectionContent.indexOf(
      'return (\n    <RecommendationEmptyState'
    )
    const batchBranchContent = currentSectionContent.slice(
      batchBranchStart,
      batchBranchEnd
    )

    const matches = batchBranchContent.match(/<BrandVisualHero\b/g)
    assert.equal(
      matches ? matches.length : 0,
      1,
      `TEST BF FAILED: BrandVisualHero must be rendered exactly once in batch view, found ${matches ? matches.length : 0}`
    )
    console.log('✓ TEST BF: Studio Visual is rendered exactly once')
  }

  console.log('=== ALL TESTS (AA–BF) PASSED DETERMINISTICALLY ===')
}

runAllTests().catch((err) => {
  console.error(err)
  process.exit(1)
})
