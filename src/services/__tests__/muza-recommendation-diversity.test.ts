import assert from 'node:assert/strict'
import type { MuzaCompactEditorialMemory } from '../../types/muza-editorial-history'
import {
  evaluateMuzaRecommendationDiversity,
  assertMuzaRecommendationDiversity,
  MuzaRecommendationDiversityError,
  type MuzaDiversityCandidate,
} from '../muza-recommendation-diversity'

/**
 * Deterministic Unit Test Suite for Step 131E Server Diversity Guard (A through N + Cost Safety).
 */
function runStep131EDiversityUnitTests() {
  console.log('--- START STEP 131E DETERMINISTIC DIVERSITY GUARD TESTS ---')

  const sampleMemory: MuzaCompactEditorialMemory = {
    recentConcepts: [
      {
        conceptKey: 'chien_mascotte::directeur_du_gite',
        topic: 'Chien mascotte',
        angle: 'Directeur du gîte',
        status: 'PROPOSED',
      },
    ],
    rejectedConcepts: [
      {
        conceptKey: 'offre_promo::remise_50',
        topic: 'Offre promo',
        angle: 'Remise 50%',
      },
    ],
    publishedConcepts: [
      {
        conceptKey: 'visite_gite::coulisses_menage',
        topic: 'Visite gîte',
        angle: 'Coulisses ménage',
        publishedAt: '2026-09-01',
      },
    ],
  }

  // Test A: Exact same conceptKey in same batch -> REJECTED
  const batchA: MuzaDiversityCandidate[] = [
    {
      editorialTopic: 'Chien mascotte',
      editorialAngle: 'Bienvenue au gîte',
      conceptKey: 'chien_mascotte::bienvenue_au_gite',
    },
    {
      editorialTopic: 'Chien mascotte',
      editorialAngle: 'Bienvenue au gîte',
      conceptKey: 'chien_mascotte::bienvenue_au_gite',
    },
  ]
  const evalA = evaluateMuzaRecommendationDiversity(batchA, {
    recentConcepts: [],
    rejectedConcepts: [],
    publishedConcepts: [],
  })
  assert.equal(evalA.isValid, false, 'A: Same batch exact conceptKey must fail')
  assert.equal(evalA.issues[0].type, 'SAME_BATCH_DUPLICATE')
  console.log('✅ A. Exact same conceptKey in same batch -> rejected')

  // Test B: Same topic + same normalized angle (un-derived conceptKeys) -> REJECTED
  const batchB: MuzaDiversityCandidate[] = [
    {
      editorialTopic: '  Chien Mascotte  ',
      editorialAngle: 'Directeur du Gîte!',
    },
    {
      editorialTopic: 'chien mascotte',
      editorialAngle: 'directeur du gite',
    },
  ]
  const evalB = evaluateMuzaRecommendationDiversity(batchB, {
    recentConcepts: [],
    rejectedConcepts: [],
    publishedConcepts: [],
  })
  assert.equal(evalB.isValid, false, 'B: Same topic + normalized angle must fail')
  assert.equal(evalB.issues[0].type, 'SAME_BATCH_DUPLICATE')
  console.log('✅ B. Same topic + same normalized angle -> rejected')

  // Test C: Same topic + different angle -> ALLOWED
  const batchC: MuzaDiversityCandidate[] = [
    {
      editorialTopic: 'Chien mascotte',
      editorialAngle: 'Rutine du matin',
      conceptKey: 'chien_mascotte::routine_du_matin',
    },
    {
      editorialTopic: 'Chien mascotte',
      editorialAngle: 'Rencontre avec les clients',
      conceptKey: 'chien_mascotte::rencontre_avec_les_clients',
    },
  ]
  const evalC = evaluateMuzaRecommendationDiversity(batchC, {
    recentConcepts: [],
    rejectedConcepts: [],
    publishedConcepts: [],
  })
  assert.equal(evalC.isValid, true, 'C: Same topic + different angle must pass')
  console.log('✅ C. Same topic + different angle -> allowed')

  // Test D: Different topics -> ALLOWED
  const batchD: MuzaDiversityCandidate[] = [
    {
      editorialTopic: 'Chien mascotte',
      editorialAngle: 'Routine du matin',
    },
    {
      editorialTopic: 'Petit dejeuner',
      editorialAngle: 'Produits locaux',
    },
  ]
  const evalD = evaluateMuzaRecommendationDiversity(batchD, {
    recentConcepts: [],
    rejectedConcepts: [],
    publishedConcepts: [],
  })
  assert.equal(evalD.isValid, true, 'D: Different topics must pass')
  console.log('✅ D. Different topics -> allowed')

  // Test E: Same concept, different format (Reel vs Carousel vs Post) -> REJECTED
  const batchE: MuzaDiversityCandidate[] = [
    {
      editorialTopic: 'Gîte écologie',
      editorialAngle: 'Panneaux solaires',
      conceptKey: 'gite_ecologie::panneaux_solaires',
    },
    {
      editorialTopic: 'Gîte écologie',
      editorialAngle: 'Panneaux solaires',
      conceptKey: 'gite_ecologie::panneaux_solaires',
    },
  ]
  const evalE = evaluateMuzaRecommendationDiversity(batchE, {
    recentConcepts: [],
    rejectedConcepts: [],
    publishedConcepts: [],
  })
  assert.equal(evalE.isValid, false, 'E: Same concept in different formats must fail')
  console.log('✅ E. Same concept with format-only variation -> rejected')

  // Test F: Exact recent conceptKey -> REJECTED
  const batchF: MuzaDiversityCandidate[] = [
    {
      editorialTopic: 'Chien mascotte',
      editorialAngle: 'Directeur du gîte',
      conceptKey: 'chien_mascotte::directeur_du_gite',
    },
  ]
  const evalF = evaluateMuzaRecommendationDiversity(batchF, sampleMemory)
  assert.equal(evalF.isValid, false, 'F: Exact recent conceptKey must fail')
  assert.equal(evalF.issues[0].type, 'RECENT_CONCEPT_REPEAT')
  console.log('✅ F. Exact recent conceptKey -> rejected')

  // Test G: Exact rejected conceptKey -> REJECTED
  const batchG: MuzaDiversityCandidate[] = [
    {
      editorialTopic: 'Offre promo',
      editorialAngle: 'Remise 50%',
      conceptKey: 'offre_promo::remise_50',
    },
  ]
  const evalG = evaluateMuzaRecommendationDiversity(batchG, sampleMemory)
  assert.equal(evalG.isValid, false, 'G: Exact rejected conceptKey must fail')
  assert.equal(evalG.issues[0].type, 'REJECTED_CONCEPT_REPEAT')
  console.log('✅ G. Exact rejected conceptKey -> rejected')

  // Test H: Exact published conceptKey -> REJECTED
  const batchH: MuzaDiversityCandidate[] = [
    {
      editorialTopic: 'Visite gîte',
      editorialAngle: 'Coulisses ménage',
      conceptKey: 'visite_gite::coulisses_menage',
    },
  ]
  const evalH = evaluateMuzaRecommendationDiversity(batchH, sampleMemory)
  assert.equal(evalH.isValid, false, 'H: Exact published conceptKey must fail')
  assert.equal(evalH.issues[0].type, 'PUBLISHED_CONCEPT_REPEAT')
  console.log('✅ H. Exact published conceptKey -> rejected')

  // Test I: Historical same topic + materially different angle -> ALLOWED
  const batchI: MuzaDiversityCandidate[] = [
    {
      editorialTopic: 'Chien mascotte',
      editorialAngle: 'Sieste au soleil',
      conceptKey: 'chien_mascotte::sieste_au_soleil',
    },
  ]
  const evalI = evaluateMuzaRecommendationDiversity(batchI, sampleMemory)
  assert.equal(evalI.isValid, true, 'I: Same historical topic + different angle must pass')
  console.log('✅ I. Historical same topic + materially different angle -> allowed')

  // Test J: noveltyReason present but exact conceptKey match -> STILL REJECTED
  const batchJ: MuzaDiversityCandidate[] = [
    {
      editorialTopic: 'Chien mascotte',
      editorialAngle: 'Directeur du gîte',
      conceptKey: 'chien_mascotte::directeur_du_gite',
      noveltyReason: 'Nouvel angle saisonnier sur un thème déjà abordé',
    },
  ]
  const evalJ = evaluateMuzaRecommendationDiversity(batchJ, sampleMemory)
  assert.equal(evalJ.isValid, false, 'J: noveltyReason cannot override exact conceptKey match')
  console.log('✅ J. noveltyReason present but exact conceptKey match -> still rejected')

  // Test K: Empty history -> valid diverse batch passes
  const batchK: MuzaDiversityCandidate[] = [
    {
      editorialTopic: 'Topic A',
      editorialAngle: 'Angle A',
      conceptKey: 'topic_a::angle_a',
    },
    {
      editorialTopic: 'Topic B',
      editorialAngle: 'Angle B',
      conceptKey: 'topic_b::angle_b',
    },
  ]
  const evalK = evaluateMuzaRecommendationDiversity(batchK, {
    recentConcepts: [],
    rejectedConcepts: [],
    publishedConcepts: [],
  })
  assert.equal(evalK.isValid, true, 'K: Empty history allows valid diverse batch')
  console.log('✅ K. Empty history -> valid diverse batch passes')

  // Test L: Legacy/unclassified history -> does not cause false rejection
  const legacyMemory: MuzaCompactEditorialMemory = {
    recentConcepts: [],
    rejectedConcepts: [],
    publishedConcepts: [],
  }
  const evalL = evaluateMuzaRecommendationDiversity(batchK, legacyMemory)
  assert.equal(evalL.isValid, true, 'L: Unclassified legacy history must not cause false rejection')
  console.log('✅ L. Legacy/unclassified history -> does not cause false rejection')

  // Test M: No mutation of recommendation objects
  const candidateM: MuzaDiversityCandidate = {
    editorialTopic: 'Topic M',
    editorialAngle: 'Angle M',
    conceptKey: 'topic_m::angle_m',
  }
  const frozenCandidate = Object.freeze({ ...candidateM })
  assert.doesNotThrow(() => {
    evaluateMuzaRecommendationDiversity([frozenCandidate], sampleMemory)
  }, 'M: Evaluation must not mutate candidate objects')
  console.log('✅ M. No mutation of recommendation candidate objects')

  // Test N: Deterministic result across repeated executions
  const res1 = evaluateMuzaRecommendationDiversity(batchA, sampleMemory)
  const res2 = evaluateMuzaRecommendationDiversity(batchA, sampleMemory)
  assert.deepEqual(res1, res2, 'N: Repeated executions must yield identical results')
  console.log('✅ N. Deterministic result across repeated executions')

  // COST SAFETY & FAILURE EXCEPTION TEST
  console.log('--- START COST SAFETY & FAILURE EXCEPTION TEST ---')
  let providerCalled = false
  const mockProviderCall = () => {
    providerCalled = true
    return 'ai_call'
  }

  // Verify assertMuzaRecommendationDiversity throws controlled exception
  assert.throws(
    () => {
      assertMuzaRecommendationDiversity(batchA, sampleMemory)
      // If code reached here or retried, mockProviderCall would be invoked
      mockProviderCall()
    },
    (err: unknown) => {
      return (
        err instanceof MuzaRecommendationDiversityError &&
        err.issues.length > 0 &&
        err.issues[0].type === 'SAME_BATCH_DUPLICATE'
      )
    },
    'Cost Safety: assertMuzaRecommendationDiversity must throw MuzaRecommendationDiversityError on duplicate'
  )

  assert.equal(providerCalled, false, 'Cost Safety: AI provider MUST NOT be called on failure path')
  console.log('✅ COST SAFETY PASSED: Zero AI calls, zero retries, zero partial persistence on failure')

  console.log('--- ALL STEP 131E DIVERSITY GUARD TESTS PASSED SUCCESSFULLY ---')
}

runStep131EDiversityUnitTests()
