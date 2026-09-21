import assert from 'node:assert/strict'
import type { MuzaEditorialHistory } from '../../types/muza-editorial-history'
import {
  EDITORIAL_HISTORY_CONFIG,
  buildCompactEditorialMemory,
} from '../muza-editorial-history'
import {
  buildRecommendationInput,
  MUZA_RECOMMENDATION_INSTRUCTIONS,
} from '../muza-recommendation-engine'
import { getBaseIndustryPlaybook } from '../../config/muza-industry-playbooks'
import type { MuzaReasoningContext } from '../../types/muza-reasoning-context'

/**
 * Pure test suite validating Step 131D Compact Editorial Memory & Prompt Rules A through P.
 */
function runStep131DUnitTests() {
  console.log('--- START STEP 131D COMPACT EDITORIAL MEMORY & PROMPT TESTS ---')

  const now = new Date('2026-09-21T10:00:00Z')

  // Construct mock history with duplicate conceptKeys, legacy null items, and overflow count
  const mockHistory: MuzaEditorialHistory = {
    recentRecommendations: [
      // 1 & 2: Duplicates of conceptKey "chien_mascotte::directeur_du_gite"
      {
        id: 'rec-001',
        title: 'Présenter Rodin récent 1',
        editorialTopic: 'Chien mascotte',
        editorialAngle: 'Directeur du gîte',
        conceptKey: 'chien_mascotte::directeur_du_gite',
        status: 'PROPOSED',
        createdAt: new Date(now.getTime() - 1 * 3600 * 1000).toISOString(),
      },
      {
        id: 'rec-002',
        title: 'Présenter Rodin plus ancien',
        editorialTopic: 'Chien mascotte',
        editorialAngle: 'Directeur du gîte',
        conceptKey: 'chien_mascotte::directeur_du_gite',
        status: 'ACCEPTED',
        createdAt: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
      },
      // 3: Legacy unclassified item (null conceptKey)
      {
        id: 'rec-003',
        title: 'Ancien titre sans classification',
        editorialTopic: null,
        editorialAngle: null,
        conceptKey: null,
        status: 'PROPOSED',
        createdAt: new Date(now.getTime() - 3 * 3600 * 1000).toISOString(),
      },
      // Generate 15 distinct items to test payload capping at 12
      ...Array.from({ length: 15 }, (_, i) => ({
        id: `rec-overflow-${i}`,
        title: `Topic unique ${i}`,
        editorialTopic: `Topic ${i}`,
        editorialAngle: `Angle ${i}`,
        conceptKey: `topic_${i}::angle_${i}`,
        status: 'PROPOSED',
        createdAt: new Date(now.getTime() - (i + 4) * 3600 * 1000).toISOString(),
      })),
    ],

    rejectedRecommendations: [
      // Duplicate rejected concepts
      {
        id: 'rej-001',
        title: 'Rejeté récent',
        editorialTopic: 'Offre promo',
        editorialAngle: 'Remise 50%',
        conceptKey: 'offre_promo::remise_50',
        status: 'REJECTED',
        createdAt: new Date(now.getTime() - 1 * 3600 * 1000).toISOString(),
      },
      {
        id: 'rej-002',
        title: 'Rejeté doublon',
        editorialTopic: 'Offre promo',
        editorialAngle: 'Remise 50%',
        conceptKey: 'offre_promo::remise_50',
        status: 'REJECTED',
        createdAt: new Date(now.getTime() - 2 * 3600 * 1000).toISOString(),
      },
      // 10 distinct rejected items to test cap at 8
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `rej-overflow-${i}`,
        title: `Rejeté unique ${i}`,
        editorialTopic: `Rejet Topic ${i}`,
        editorialAngle: `Rejet Angle ${i}`,
        conceptKey: `rejet_topic_${i}::rejet_angle_${i}`,
        status: 'REJECTED',
        createdAt: new Date(now.getTime() - (i + 3) * 3600 * 1000).toISOString(),
      })),
    ],

    publishedContents: [
      // Duplicate published concepts
      {
        id: 'pub-001',
        recommendationId: 'rec-001',
        topic: 'Chien mascotte',
        angle: 'Directeur du gîte',
        sourceConceptKey: 'chien_mascotte::directeur_du_gite',
        publishedAt: new Date(now.getTime() - 1 * 24 * 3600 * 1000).toISOString(),
      },
      {
        id: 'pub-002',
        recommendationId: 'rec-001',
        topic: 'Chien mascotte',
        angle: 'Directeur du gîte',
        sourceConceptKey: 'chien_mascotte::directeur_du_gite',
        publishedAt: new Date(now.getTime() - 2 * 24 * 3600 * 1000).toISOString(),
      },
      // Legacy published content (null sourceConceptKey)
      {
        id: 'pub-003',
        recommendationId: 'rec-003',
        topic: 'Legacy topic',
        angle: 'Legacy angle',
        sourceConceptKey: null,
        publishedAt: new Date(now.getTime() - 3 * 24 * 3600 * 1000).toISOString(),
      },
      // 12 distinct published items to test cap at 10
      ...Array.from({ length: 12 }, (_, i) => ({
        id: `pub-overflow-${i}`,
        recommendationId: `rec-pub-${i}`,
        topic: `Pub Topic ${i}`,
        angle: `Pub Angle ${i}`,
        sourceConceptKey: `pub_topic_${i}::pub_angle_${i}`,
        publishedAt: new Date(now.getTime() - (i + 4) * 24 * 3600 * 1000).toISOString(),
      })),
    ],
  }

  // Generate compact projection
  const compact = buildCompactEditorialMemory(mockHistory)

  // Assertion A: Duplicate conceptKeys collapse to newest occurrence
  const recentRodinCount = compact.recentConcepts.filter(
    (c) => c.conceptKey === 'chien_mascotte::directeur_du_gite'
  ).length
  assert.equal(recentRodinCount, 1, 'A: Duplicate conceptKeys must collapse to 1 newest entry')
  console.log('✅ A. Duplicate conceptKeys collapse to newest occurrence')

  // Assertion B: Recent memory capped at configured provider maximum (12)
  assert.equal(
    compact.recentConcepts.length,
    EDITORIAL_HISTORY_CONFIG.PROVIDER_RECENT_CONCEPTS_CAP,
    `B: recentConcepts must be capped at ${EDITORIAL_HISTORY_CONFIG.PROVIDER_RECENT_CONCEPTS_CAP}`
  )
  console.log('✅ B. Recent memory capped at provider maximum (12)')

  // Assertion C: Rejected memory capped at configured provider maximum (8)
  assert.equal(
    compact.rejectedConcepts.length,
    EDITORIAL_HISTORY_CONFIG.PROVIDER_REJECTED_CONCEPTS_CAP,
    `C: rejectedConcepts must be capped at ${EDITORIAL_HISTORY_CONFIG.PROVIDER_REJECTED_CONCEPTS_CAP}`
  )
  console.log('✅ C. Rejected memory capped at provider maximum (8)')

  // Assertion D: Published memory capped at configured provider maximum (10)
  assert.equal(
    compact.publishedConcepts.length,
    EDITORIAL_HISTORY_CONFIG.PROVIDER_PUBLISHED_CONCEPTS_CAP,
    `D: publishedConcepts must be capped at ${EDITORIAL_HISTORY_CONFIG.PROVIDER_PUBLISHED_CONCEPTS_CAP}`
  )
  console.log('✅ D. Published memory capped at provider maximum (10)')

  // Assertion E: Legacy/unclassified items (null conceptKey) excluded from compact payload
  const hasNullConceptKey = compact.recentConcepts.some((c) => (c as Record<string, unknown>).conceptKey === null)
  assert.equal(hasNullConceptKey, false, 'E: Unclassified legacy items must be excluded from compact payload')
  console.log('✅ E. Legacy/unclassified items excluded from compact provider payload')

  // Assertion F: Rich internal history remains untouched
  assert.equal(mockHistory.recentRecommendations.length, 18, 'F: Rich internal history items preserved')
  assert.equal(mockHistory.recentRecommendations[2].conceptKey, null, 'F: Legacy null fields in rich history preserved')
  console.log('✅ F. Rich internal history remains untouched')

  // Assertion G: Empty history creates minimal empty arrays []
  const emptyCompact = buildCompactEditorialMemory({
    recentRecommendations: [],
    rejectedRecommendations: [],
    publishedContents: [],
  })
  assert.deepEqual(emptyCompact.recentConcepts, [], 'G: Empty recentConcepts must be []')
  assert.deepEqual(emptyCompact.rejectedConcepts, [], 'G: Empty rejectedConcepts must be []')
  assert.deepEqual(emptyCompact.publishedConcepts, [], 'G: Empty publishedConcepts must be []')
  console.log('✅ G. Empty history creates minimal empty arrays []')

  // Assertion H: Full content bodies/reasons/titles/IDs absent from compact memory
  const firstRecent = compact.recentConcepts[0] as Record<string, unknown>
  assert.equal(firstRecent.id, undefined, 'H: Database ID must be absent')
  assert.equal(firstRecent.title, undefined, 'H: Prose title must be absent')
  assert.equal(firstRecent.reasons, undefined, 'H: Reasons array must be absent')
  console.log('✅ H. Database IDs, titles, reasons, and bodies absent from compact memory')

  // Mock complete reasoning context
  const mockReasoningContext: MuzaReasoningContext = {
    strategicContext: {
      business: { id: 'biz-123', name: 'Gîte Test', industry: 'Hospitalité', subindustry: null, location: null, description: null },
      brand: { positioning: null, promise: null, personality: [], values: [], signaturePhrases: [], preferredVocabulary: [], avoidedVocabulary: [] },
      creatorConstraints: { weeklyMinutes: 120, cameraComfort: 3, voiceoverComfort: 3, writingComfort: 3, photoComfort: 3, videoComfort: 3, maxEffortLevel: 3, preferredFormats: [], avoidedFormats: [], barriers: [], strengths: [] },
      audience: { name: null, description: null, needs: [], desires: [], problems: [], objections: [], motivations: [], questions: [], buyingTriggers: [], languagePatterns: [] },
      objective: { type: null, title: null, description: null, priority: null, startsAt: null, endsAt: null },
      offer: { name: null, description: null, cta: null, benefits: [], objections: [], seasonality: {}, availableFrom: null, availableUntil: null },
      strategicSignals: { hasCompleteBrand: false, hasAudience: false, hasActiveGoal: false, hasActiveOffer: false, creatorTimePressure: 'MEDIUM', cameraConstraint: 'MEDIUM' },
    },
    editorialHistory: mockHistory,
    feedbackMemory: { recentFeedback: [] },
    industry: {
      resolution: { businessModel: 'HOSPITALITY', confidence: 'HIGH', matchedKeywords: [] },
      playbook: getBaseIndustryPlaybook('HOSPITALITY'),
    },
    grounding: { knownFacts: [], unavailableEvidence: [] },
    reasoningPrinciples: [],
  }

  const serializedInput = buildRecommendationInput(mockReasoningContext)
  const parsedInput = JSON.parse(serializedInput)

  // Assertion I: Raw editorialHistory is NOT serialized into provider input
  assert.equal(parsedInput.editorialHistory, undefined, 'I: Raw editorialHistory must NOT be serialized in input prompt')
  console.log('✅ I. Raw editorialHistory is NOT serialized into provider input')

  // Assertion J: Compact editorialMemory IS serialized into provider input
  assert.ok(parsedInput.editorialMemory, 'J: Compact editorialMemory MUST be serialized in input prompt')
  assert.equal(parsedInput.editorialMemory.recentConcepts.length, 12, 'J: Compact recentConcepts serialized')
  console.log('✅ J. Compact editorialMemory IS serialized into provider input')

  // Assertion K: Existing strategic context remains present
  assert.equal(parsedInput.strategicContext.business.name, 'Gîte Test', 'K: Strategic context business name present')
  console.log('✅ K. Existing strategic context remains present in input prompt')

  // Assertion L: No duplicate business context introduced through memory
  assert.equal(parsedInput.editorialMemory.businessName, undefined, 'L: Business name not duplicated inside memory')
  console.log('✅ L. No duplicate business context introduced through memory')

  // Assertions M–P: System Instructions Assertions
  // Assertion M: Format-only change is explicitly insufficient for novelty
  assert.ok(
    MUZA_RECOMMENDATION_INSTRUCTIONS.includes('Changing format alone') &&
      MUZA_RECOMMENDATION_INSTRUCTIONS.includes('NOT sufficient for novelty'),
    'M: Instructions must explicitly state format-only change is insufficient for novelty'
  )
  console.log('✅ M. System instructions state format-only change is insufficient')

  // Assertion N: Rejected concepts are treated strongly
  assert.ok(
    MUZA_RECOMMENDATION_INSTRUCTIONS.includes('Strongly avoid reintroducing rejected concepts'),
    'N: Instructions must strongly avoid reintroducing rejected concepts'
  )
  console.log('✅ N. System instructions state rejected concepts are treated strongly')

  // Assertion O: Published concepts do NOT imply performance proof
  assert.ok(
    MUZA_RECOMMENDATION_INSTRUCTIONS.includes('Publication does not imply performance proof'),
    'O: Instructions must clarify publication does not imply performance proof'
  )
  console.log('✅ O. System instructions state publication does not imply performance proof')

  // Assertion P: Smart reuse is permitted under new angle/context
  assert.ok(
    MUZA_RECOMMENDATION_INSTRUCTIONS.includes('permitted ONLY when justified by a materially new angle'),
    'P: Instructions must define smart reuse rules'
  )
  console.log('✅ P. System instructions define smart reuse requirements')

  console.log('--- ALL STEP 131D UNIT TESTS A–P PASSED SUCCESSFULLY ---')
}

runStep131DUnitTests()
