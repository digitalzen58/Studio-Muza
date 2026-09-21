import assert from 'node:assert'
import {
  normalizeEditorialDimension,
  buildEditorialConceptKey,
} from '../muza-editorial-concept'

// Test 1: Equivalent formatting inputs normalize consistently
assert.strictEqual(normalizeEditorialDimension('Chien mascotte'), 'chien_mascotte')
assert.strictEqual(
  normalizeEditorialDimension(' chien   mascotte '),
  'chien_mascotte'
)
assert.strictEqual(normalizeEditorialDimension('CHIEN MASCOTTE'), 'chien_mascotte')

// Test 2: Accented input produces stable deterministic token without diacritics
assert.strictEqual(
  normalizeEditorialDimension('Directeur du gîte'),
  'directeur_du_gite'
)
assert.strictEqual(
  normalizeEditorialDimension('Étoile & Élégance !'),
  'etoile_elegance'
)

// Test 3: buildEditorialConceptKey combining topic & angle
const key1 = buildEditorialConceptKey('Chien mascotte', 'Directeur du gîte')
const key2 = buildEditorialConceptKey('CHIEN MASCOTTE', 'directeur du gite')

assert.strictEqual(key1, 'chien_mascotte::directeur_du_gite')
assert.strictEqual(key1, key2)

// Test 4: Different topic/angle combinations produce different keys
const key3 = buildEditorialConceptKey('Chien mascotte', 'Inspection des chambres')
assert.notStrictEqual(key1, key3)
assert.strictEqual(key3, 'chien_mascotte::inspection_des_chambres')

console.log('✅ All muza-editorial-concept normalization tests passed successfully.')
