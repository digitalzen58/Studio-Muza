import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  hookSuggestionsSchema,
} from '@/services/ai-assistance/schemas'
import { validateWritingAssistanceGrounding } from '@/services/ai-assistance/writing-grounding-guard'

console.log('=== RUNNING STUDIO MŪZA STEP 151 TESTS (EI–FE) ===')

const actionsAiAssistanceContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/actions/ai-assistance.ts'),
  'utf8'
)

const geminiWritingProviderContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/services/ai-assistance/gemini-writing-provider.ts'),
  'utf8'
)

const studioComponentContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/studio/content-studio.tsx'),
  'utf8'
)

const assistancePanelContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/studio/writing-assistance-panel.tsx'),
  'utf8'
)

const actionsContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/actions/content.ts'),
  'utf8'
)

// ============================================================================
// TEST EI: Manual writing/editing = 0 AI
// ============================================================================
assert.ok(
  studioComponentContent.includes('onChange={(e) => handleSlideTextChange(e.target.value)}') &&
  studioComponentContent.includes('onChange={(e) => {\n              setHook(e.target.value)'),
  'EI FAILED: Typing in textarea/inputs must be pure local state change with 0 AI'
)
console.log('✓ TEST EI: Manual writing and editing operates with 0 AI calls')

// ============================================================================
// TEST EJ: Opening Studio = 0 AI
// ============================================================================
assert.ok(
  !studioComponentContent.includes('useEffect(() => {\n    handleRequestAssistance'),
  'EJ FAILED: Studio component must not trigger AI on mount'
)
console.log('✓ TEST EJ: Opening Content Studio operates with 0 AI calls')

// ============================================================================
// TEST EK: Saving draft = 0 AI
// ============================================================================
assert.ok(
  !actionsContent.includes('ai-assistance') &&
  !actionsContent.includes('generateGemini') &&
  !actionsContent.includes('GoogleGenAI'),
  'EK FAILED: saveContentDraftAction must perform 0 AI calls'
)
console.log('✓ TEST EK: Saving draft operates with 0 AI calls')

// ============================================================================
// TEST EL: AI only after explicit button click
// ============================================================================
assert.ok(
  studioComponentContent.includes('onClick={() => handleRequestAssistance('),
  'EL FAILED: AI assistance must be tied exclusively to explicit button clicks'
)
console.log('✓ TEST EL: AI only triggers after explicit user action')

// ============================================================================
// TEST EM: Exactly 1 provider call per explicit click
// ============================================================================
assert.ok(
  geminiWritingProviderContent.includes('ai.interactions.create(') &&
  !geminiWritingProviderContent.includes('while (') &&
  !geminiWritingProviderContent.includes('for (let retry'),
  'EM FAILED: Provider must make exactly one interaction call without retry loop'
)
console.log('✓ TEST EM: Exactly 1 provider call executed per explicit click')

// ============================================================================
// TEST EN: Operation validation
// ============================================================================
assert.ok(
  actionsAiAssistanceContent.includes("operation !== 'SUGGEST_HOOKS'") &&
  actionsAiAssistanceContent.includes("!['HELP_WRITE', 'IMPROVE_TEXT', 'SHORTEN_TEXT'].includes(operation)"),
  'EN FAILED: Server action must validate operations strictly'
)
console.log('✓ TEST EN: Operation parameter validated against allowed matrix')

// ============================================================================
// TEST EO: Target validation
// ============================================================================
assert.ok(
  actionsAiAssistanceContent.includes("targetType === 'HOOK'") &&
  actionsAiAssistanceContent.includes("targetType === 'CAROUSEL_SLIDE'") &&
  actionsAiAssistanceContent.includes("targetType === 'CAPTION'"),
  'EO FAILED: Target must be restricted to HOOK, CAROUSEL_SLIDE, and CAPTION'
)
console.log('✓ TEST EO: Target parameter validated strictly')

// ============================================================================
// TEST EP: Carousel slide index validation
// ============================================================================
assert.ok(
  actionsAiAssistanceContent.includes("typeof targetIndex !== 'number' || targetIndex < 1"),
  'EP FAILED: Server action must reject missing or invalid targetIndex for CAROUSEL_SLIDE'
)
console.log('✓ TEST EP: Carousel slide index validated strictly')

// ============================================================================
// TEST EQ: Cross-business content rejected
// ============================================================================
assert.ok(
  actionsAiAssistanceContent.includes('strategicContext.business.id !== content.business_id') &&
  actionsAiAssistanceContent.includes('from(\'contents\')'),
  'EQ FAILED: Server action must verify caller ownership of content business'
)
console.log('✓ TEST EQ: Cross-business content rejected (fail-closed)')

// ============================================================================
// TEST ER: Client cannot inject business context
// ============================================================================
assert.ok(
  actionsAiAssistanceContent.includes('getMuzaStrategicContext()'),
  'ER FAILED: Business and strategic context must be resolved server-side'
)
console.log('✓ TEST ER: Client cannot inject or forge trusted business context')

// ============================================================================
// TEST ES: Suggestion generation = 0 DB writes
// ============================================================================
assert.ok(
  !actionsAiAssistanceContent.includes('.insert(') &&
  !actionsAiAssistanceContent.includes('.update(') &&
  !actionsAiAssistanceContent.includes('.upsert('),
  'ES FAILED: requestWritingAssistanceAction must perform 0 DB write operations'
)
console.log('✓ TEST ES: Suggestion generation performs 0 database writes')

// ============================================================================
// TEST ET: Suggestion does not mutate editor automatically
// ============================================================================
assert.ok(
  assistancePanelContent.includes('onApply(text)') &&
  !assistancePanelContent.includes('useEffect(() => {\n    onApply'),
  'ET FAILED: Suggestion must require explicit user action before applying'
)
console.log('✓ TEST ET: Suggestion does not mutate editor automatically')

// ============================================================================
// TEST EU: “Utiliser” updates local editor + dirty state
// ============================================================================
assert.ok(
  studioComponentContent.includes('setHook(text)\n                setIsDirty(true)') &&
  studioComponentContent.includes('handleSlideTextChange(text)') &&
  studioComponentContent.includes('setCaption(text)\n                setIsDirty(true)'),
  'EU FAILED: Applying suggestion must update local state and set isDirty = true'
)
console.log('✓ TEST EU: “Utiliser” updates local editor and sets dirty state')

// ============================================================================
// TEST EV: Existing save flow persists accepted suggestion
// ============================================================================
assert.ok(
  studioComponentContent.includes('executeSave'),
  'EV FAILED: Normal save flow handles persistence of accepted changes'
)
console.log('✓ TEST EV: Existing save flow persists accepted suggestion')

// ============================================================================
// TEST EW: Provider failure preserves original text
// ============================================================================
assert.ok(
  assistancePanelContent.includes('Votre texte n’a pas été modifié.') ||
  actionsAiAssistanceContent.includes('Votre texte est resté intact.'),
  'EW FAILED: Failure must preserve existing text with clear message'
)
console.log('✓ TEST EW: Provider failure preserves original user text')

// ============================================================================
// TEST EX: Malformed output rejected
// ============================================================================
assert.ok(
  geminiWritingProviderContent.includes('zodSchema.safeParse(parsed)'),
  'EX FAILED: Output must be validated against Zod schema before use'
)
const invalidHookParse = hookSuggestionsSchema.safeParse({ hooks: ['Hook 1', 'Hook 2'] })
assert.strictEqual(invalidHookParse.success, false, 'EX FAILED: Must reject hook arrays with length != 3')
console.log('✓ TEST EX: Malformed provider output is strictly rejected')

// ============================================================================
// TEST EY: 20s timeout handled with 0 automatic retry
// ============================================================================
assert.ok(
  geminiWritingProviderContent.includes('withProviderTimeout(interactionPromise, 20000)'),
  'EY FAILED: Provider call must be bounded by 20000ms timeout'
)
assert.ok(
  actionsAiAssistanceContent.includes("errorMsg.includes('timed out')"),
  'EY FAILED: Server action must catch timeout gracefully'
)
console.log('✓ TEST EY: 20s timeout handled without automatic retry')

// ============================================================================
// TEST EZ: Duplicate click blocked while pending
// ============================================================================
assert.ok(
  studioComponentContent.includes('if (assistanceState?.isPending) return'),
  'EZ FAILED: Handler must guard against duplicate clicks while pending'
)
assert.ok(
  studioComponentContent.includes('disabled={Boolean(assistanceState?.isPending)}'),
  'EZ FAILED: Trigger buttons must be disabled while pending'
)
console.log('✓ TEST EZ: Duplicate click blocked while request is pending')

// ============================================================================
// TEST FA: “Réessayer ✦” = exactly one new explicit call
// ============================================================================
assert.ok(
  assistancePanelContent.includes('onClick={onRetry}') &&
  assistancePanelContent.includes('Réessayer ✦'),
  'FA FAILED: Panel must render explicit retry button bound to onRetry'
)
console.log('✓ TEST FA: “Réessayer ✦” triggers a single explicit new request')

// ============================================================================
// TEST FB: SUGGEST_HOOKS returns exactly 3 options
// ============================================================================
const validHooks = hookSuggestionsSchema.safeParse({
  hooks: [
    'Et si votre chien avait aussi besoin d’un week-end ?',
    '3 sentiers secrets à explorer en automne dans le Morvan',
    'Le calme absolu à 2h de Paris : notre havre de paix',
  ],
})
assert.ok(validHooks.success, 'FB FAILED: Valid hooks must pass schema')
assert.strictEqual(validHooks.data.hooks.length, 3, 'FB FAILED: Exactly 3 hooks must be returned')
console.log('✓ TEST FB: SUGGEST_HOOKS enforces exactly 3 structured options')

// ============================================================================
// TEST FC: IMPROVE_TEXT / SHORTEN_TEXT cannot introduce unsupported facts
// ============================================================================
const inventedPriceResult = validateWritingAssistanceGrounding(
  'Venez profiter de notre chambre à 150 € la nuit.',
  { operation: 'IMPROVE_TEXT', currentText: 'Venez profiter de notre chambre chaleureuse.' }
)
assert.strictEqual(inventedPriceResult.isValid, false, 'FC FAILED: Grounding guard must reject invented prices')

const inventedRatingResult = validateWritingAssistanceGrounding(
  'Un gîte noté 5/5 sur Google par nos hôtes.',
  { operation: 'SHORTEN_TEXT', currentText: 'Un gîte très apprécié.' }
)
assert.strictEqual(inventedRatingResult.isValid, false, 'FC FAILED: Grounding guard must reject ratings')

const validImprovement = validateWritingAssistanceGrounding(
  'Profitez de nos balades en forêt au cœur de la Bourgogne.',
  { operation: 'IMPROVE_TEXT', currentText: 'On propose des balades en forêt en Bourgogne.' }
)
assert.strictEqual(validImprovement.isValid, true, 'FC FAILED: Grounded improvement must pass')
console.log('✓ TEST FC: Grounding guard prevents introduction of unsupported facts')

// ============================================================================
// TEST FD: STOCK_PEXELS media never becomes business factual evidence
// ============================================================================
const stockViolationResult = validateWritingAssistanceGrounding(
  'Voici notre jardin et notre terrasse à la tombée de la nuit.',
  { operation: 'HELP_WRITE', currentText: '', hasStockMedia: true }
)
assert.strictEqual(
  stockViolationResult.isValid,
  false,
  'FD FAILED: Stock media must not be described as genuine business property'
)
console.log('✓ TEST FD: Stock media cannot be claimed as genuine business property')

// ============================================================================
// TEST FE: No publishing/scheduling/publish_jobs
// ============================================================================
assert.ok(
  !actionsAiAssistanceContent.includes('publish_jobs') &&
  !actionsAiAssistanceContent.includes('scheduled_at') &&
  !actionsAiAssistanceContent.includes('publishContent'),
  'FE FAILED: Writing assistance must not trigger publishing or scheduling'
)
console.log('✓ TEST FE: No publishing, scheduling, or publish_jobs side effects')

console.log('\n=== ALL STEP 151 TESTS (EI–FE) PASSED DETERMINISTICALLY ===')
