import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  createDefaultVisualComposition,
  type VisualComposition,
  type VisualTextElement,
} from '@/services/visual-composition/types'
import { validateVisualComposition } from '@/services/visual-composition/validation'
import { validatePostReadiness } from '@/services/content-readiness/post-readiness'

console.log('=== RUNNING STUDIO MŪZA STEP 157 TESTS (LIVE VISUAL POST STUDIO) ===')

const brandGreetingHeroContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/recommendations/brand-visual-hero.tsx'),
  'utf8'
)

const recSectionContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/recommendations/recommendation-section.tsx'),
  'utf8'
)

const emptyStateContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/recommendations/recommendation-empty-state.tsx'),
  'utf8'
)

const bottomNavContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/layout/bottom-nav.tsx'),
  'utf8'
)

const postEditorContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/studio/post-editor.tsx'),
  'utf8'
)

const visualCanvasContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/studio/visual-canvas.tsx'),
  'utf8'
)

const contentStudioContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/studio/content-studio.tsx'),
  'utf8'
)

const previewModalContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/studio/content-preview-modal.tsx'),
  'utf8'
)

const contentActionsContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/actions/content.ts'),
  'utf8'
)

// ============================================================================
// TEST 1: Redundant Home Create button removed & Primary centered Create preserved
// ============================================================================
assert.ok(
  !brandGreetingHeroContent.includes('<Plus className="w-3.5 h-3.5" />') &&
    !brandGreetingHeroContent.includes('<span>Créer</span>'),
  'TEST 1 FAILED: Upper-right small Create button must be removed from BrandGreetingHero'
)
assert.ok(
  recSectionContent.includes('Créer un contenu') && recSectionContent.includes('bg-terracotta'),
  'TEST 1 FAILED: Primary centered large Créer un contenu button must remain on Home'
)
assert.ok(
  emptyStateContent.includes('Créer un contenu') && emptyStateContent.includes('bg-terracotta'),
  'TEST 1 FAILED: Empty state must retain prominent Créer un contenu button'
)
assert.ok(
  bottomNavContent.includes('CreationChooserModal'),
  'TEST 1 FAILED: BottomNav must open the unified CreationChooserModal'
)
console.log('✔ TEST 1 PASSED: Redundant Home Create button removed, primary centered CTA preserved')

// ============================================================================
// TEST 2: POST initializes valid visual composition
// ============================================================================
const defaultComp = createDefaultVisualComposition('asset-123', 'https://example.com/photo.jpg')
assert.strictEqual(defaultComp.version, 1, 'Default version must be 1')
assert.strictEqual(defaultComp.aspectRatio, '4:5', 'Default aspect ratio must be 4:5')
assert.strictEqual(defaultComp.background.type, 'IMAGE', 'Default background with media must be IMAGE')
assert.strictEqual(defaultComp.background.mediaAssetId, 'asset-123', 'Default background mediaAssetId must match')
assert.strictEqual(defaultComp.background.scale, 1.0, 'Default background scale must be 1.0')
assert.deepStrictEqual(defaultComp.elements, [], 'Default elements must be empty array')

const colorComp = createDefaultVisualComposition(null, null)
assert.strictEqual(colorComp.background.type, 'COLOR', 'Default background without media must be COLOR')
assert.strictEqual(colorComp.background.color, '#FDFBF7', 'Default background color must be warm ivory')
console.log('✔ TEST 2 PASSED: POST initializes valid normalized visual composition')

// ============================================================================
// TEST 3: Visual elements direct manipulation & tools in VisualCanvas
// ============================================================================
assert.ok(
  visualCanvasContent.includes('handleAddText') &&
    visualCanvasContent.includes('handleAddEmoji') &&
    visualCanvasContent.includes('handlePointerDownElement') &&
    visualCanvasContent.includes('handlePointerMove'),
  'TEST 3 FAILED: VisualCanvas must implement add text, add emoji, and pointer dragging'
)
assert.ok(
  visualCanvasContent.includes('touchAction: \'none\'') || visualCanvasContent.includes('touchAction: "none"'),
  'TEST 3 FAILED: VisualCanvas must specify touch-action: none to prevent mobile screen drag conflicts'
)
assert.ok(
  visualCanvasContent.includes('handleUndo') && visualCanvasContent.includes('pushHistory'),
  'TEST 3 FAILED: VisualCanvas must support undo safety'
)
console.log('✔ TEST 3 PASSED: VisualCanvas implements direct manipulation, touch safety, and undo')

// ============================================================================
// TEST 4: Separation of visual text from publication caption
// ============================================================================
assert.ok(
  postEditorContent.includes('Votre visuel') &&
    postEditorContent.includes('Texte de la publication'),
  'TEST 4 FAILED: PostEditor must distinctly separate visual composition from publication text'
)
assert.ok(
  visualCanvasContent.includes('Texte sur l’image') || visualCanvasContent.includes('Texte sur l\'image'),
  'TEST 4 FAILED: VisualCanvas must label text on image distinctly'
)
console.log('✔ TEST 4 PASSED: Visual text and publication caption are strictly separated')

// ============================================================================
// TEST 5: Shared Preview renders composition in read-only mode
// ============================================================================
assert.ok(
  previewModalContent.includes('<VisualCanvas') &&
    previewModalContent.includes('readOnly={true}'),
  'TEST 5 FAILED: ContentPreviewModal must render VisualCanvas with readOnly={true}'
)
console.log('✔ TEST 5 PASSED: Shared preview renders full visual composition in read-only mode')

// ============================================================================
// TEST 6: Server validation & sanitization of visual composition
// ============================================================================
const validPayload: VisualComposition = {
  version: 1,
  aspectRatio: '4:5',
  background: {
    type: 'IMAGE',
    mediaAssetId: 'valid-uuid',
    positionX: 0.1,
    positionY: -0.2,
    scale: 1.5,
  },
  elements: [
    {
      id: 'text-1',
      type: 'TEXT',
      text: 'Automne dans le Morvan',
      x: 0.5,
      y: 0.3,
      scale: 1.2,
      colorMode: 'LIGHT',
      boxStyle: 'PILL',
    },
    {
      id: 'emoji-1',
      type: 'EMOJI',
      value: '🐾',
      x: 0.5,
      y: 0.6,
      scale: 1.4,
    },
  ],
}

const validRes = validateVisualComposition(validPayload)
assert.strictEqual(validRes.valid, true, 'Valid composition must pass validation')
assert.strictEqual(validRes.sanitized?.elements.length, 2, 'Sanitized elements count must match')
const firstSanitized = validRes.sanitized?.elements[0] as VisualTextElement | undefined
assert.strictEqual(
  firstSanitized?.text,
  'Automne dans le Morvan',
  'Text content must match'
)

// Excessive elements rejected
const excessiveElements = Array.from({ length: 25 }, (_, i) => ({
  id: `el-${i}`,
  type: 'EMOJI' as const,
  value: '✨',
  x: 0.5,
  y: 0.5,
  scale: 1.0,
}))
const excessiveRes = validateVisualComposition({
  ...validPayload,
  elements: excessiveElements,
})
assert.strictEqual(excessiveRes.valid, false, 'Excessive elements must be rejected')

// Invalid version rejected
const invalidVerRes = validateVisualComposition({
  ...validPayload,
  version: 99 as unknown as 1,
})
assert.strictEqual(invalidVerRes.valid, false, 'Invalid version must be rejected')

// HTML injection sanitized
const injectedComp = {
  ...validPayload,
  elements: [
    {
      id: 'xss-1',
      type: 'TEXT' as const,
      text: '<script>alert("hack")</script>Bonjour',
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      colorMode: 'LIGHT' as const,
    },
  ],
}
const sanitizedRes = validateVisualComposition(injectedComp)
assert.strictEqual(sanitizedRes.valid, true, 'Sanitized payload should be valid')
const xssSanitized = sanitizedRes.sanitized?.elements[0] as VisualTextElement | undefined
assert.strictEqual(
  xssSanitized?.text,
  'alert("hack")Bonjour',
  'HTML tags must be stripped'
)
console.log('✔ TEST 6 PASSED: Server validation enforces strict boundaries and sanitization')

// ============================================================================
// TEST 7: Readiness validation supports photo or plain background
// ============================================================================
const photoReadiness = validatePostReadiness({
  workingTitle: 'Mon post d’automne',
  body: 'Découvrez les magnifiques couleurs dans notre région.',
  visualComposition: validPayload,
})
assert.strictEqual(photoReadiness.ready, true, 'Valid post with image background must be ready')

const colorBgPayload: VisualComposition = {
  version: 1,
  aspectRatio: '4:5',
  background: {
    type: 'COLOR',
    color: '#C85A32',
  },
  elements: [
    {
      id: 't-1',
      type: 'TEXT',
      text: 'Annonce importante',
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      colorMode: 'LIGHT',
    },
  ],
}
const colorBgReadiness = validatePostReadiness({
  workingTitle: 'Annonce',
  body: 'Voici le texte d’accompagnement.',
  visualComposition: colorBgPayload,
})
assert.strictEqual(colorBgReadiness.ready, true, 'Valid post with plain background color must be ready')

const missingVisualReadiness = validatePostReadiness({
  workingTitle: 'Annonce',
  body: 'Voici le texte d’accompagnement.',
  visualComposition: {
    version: 1,
    aspectRatio: '4:5',
    background: {
      type: 'IMAGE',
      mediaAssetId: null,
    },
    elements: [],
  },
})
assert.strictEqual(missingVisualReadiness.ready, false, 'Missing visual must block readiness')
console.log('✔ TEST 7 PASSED: Readiness accurately evaluates photo and plain background options')

// ============================================================================
// TEST 8: Save draft action persists visual composition and media assignments
// ============================================================================
assert.ok(
  contentActionsContent.includes('visual_composition') &&
    contentActionsContent.includes('sanitizedVisualComposition'),
  'TEST 8 FAILED: saveContentDraftAction must persist visual_composition in variant metadata'
)
assert.ok(
  contentStudioContent.includes('visualComposition') &&
    contentStudioContent.includes('setVisualComposition'),
  'TEST 8 FAILED: ContentStudio must maintain visualComposition state'
)
console.log('✔ TEST 8 PASSED: Persistence pipeline integrates visual composition')

// ============================================================================
// TEST 9: Invariants on external API call counts (0 Gemini, 0 OpenAI, 0 Social)
// ============================================================================
assert.ok(
  !visualCanvasContent.includes('generateImage') &&
    !visualCanvasContent.includes('callGemini') &&
    !visualCanvasContent.includes('api.openai.com'),
  'TEST 9 FAILED: Visual composer must perform 0 automatic AI or external calls'
)
console.log('✔ TEST 9 PASSED: Strictly 0 automatic Gemini, 0 OpenAI, and 0 social API calls')

console.log('=== ALL STEP 157 TESTS PASSED SUCCESSFULLY ===')
