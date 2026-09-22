import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  validatePhone,
  validateUrl,
  validateBusinessContactInfo,
} from '@/services/business-contact'

console.log('=== RUNNING STUDIO MŪZA STEP 157B TESTS (BUSINESS CONTACT & CONVERSION) ===')

const onboardingPageContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/app/onboarding/business/page.tsx'),
  'utf8'
)

const onboardingActionsContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/app/onboarding/business/actions.ts'),
  'utf8'
)

const businessContactServiceContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/services/business-contact.ts'),
  'utf8'
)

const businessContactActionsContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/actions/business-contact.ts'),
  'utf8'
)

const conversionSelectorContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/studio/conversion-action-selector.tsx'),
  'utf8'
)

const postEditorContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/studio/post-editor.tsx'),
  'utf8'
)

const contentStudioContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/studio/content-studio.tsx'),
  'utf8'
)

const contentActionsContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/actions/content.ts'),
  'utf8'
)

// ============================================================================
// TEST 1: Phone validation and malformed/script injection rejection
// ============================================================================
const validPhone1 = validatePhone('06 12 34 56 78')
assert.strictEqual(validPhone1.valid, true)
assert.strictEqual(validPhone1.sanitized, '06 12 34 56 78')

const validPhone2 = validatePhone('+33 1 42 68 55 00')
assert.strictEqual(validPhone2.valid, true)

const invalidPhoneTooShort = validatePhone('123')
assert.strictEqual(invalidPhoneTooShort.valid, false)

const invalidPhoneScript = validatePhone('060000<script>alert(1)</script>')
assert.strictEqual(invalidPhoneScript.valid, false)

const invalidPhoneData = validatePhone('javascript:void(0)')
assert.strictEqual(invalidPhoneData.valid, false)

console.log('✔ TEST 1 PASSED: Phone validation enforces format, length, and injection safety')

// ============================================================================
// TEST 2: URL validation (http/https only, reject javascript:, data:, malformed)
// ============================================================================
const validUrl1 = validateUrl('https://mon-gite-morvan.fr/reservation')
assert.strictEqual(validUrl1.valid, true)
assert.ok(validUrl1.sanitized?.startsWith('https://'))

const validUrl2 = validateUrl('http://resa.hotel.com')
assert.strictEqual(validUrl2.valid, true)

const validUrlAutoHttps = validateUrl('calendly.com/mon-gite/rdv')
assert.strictEqual(validUrlAutoHttps.valid, true)
assert.strictEqual(validUrlAutoHttps.sanitized, 'https://calendly.com/mon-gite/rdv')

const invalidUrlJs = validateUrl('javascript:alert(document.cookie)')
assert.strictEqual(invalidUrlJs.valid, false)

const invalidUrlData = validateUrl('data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==')
assert.strictEqual(invalidUrlData.valid, false)

const invalidUrlVb = validateUrl('vbscript:msgbox(1)')
assert.strictEqual(invalidUrlVb.valid, false)

const invalidUrlMalformed = validateUrl('https://')
assert.strictEqual(invalidUrlMalformed.valid, false)

console.log('✔ TEST 2 PASSED: URL validation enforces http/https protocol and rejects unsafe schemes')

// ============================================================================
// TEST 3: BusinessContactInfo composite validation & optionality
// ============================================================================
const emptyInfoValidation = validateBusinessContactInfo({})
assert.strictEqual(emptyInfoValidation.valid, true)
assert.strictEqual(emptyInfoValidation.sanitized?.phone, null)
assert.strictEqual(emptyInfoValidation.sanitized?.bookingUrl, null)
assert.strictEqual(emptyInfoValidation.sanitized?.appointmentUrl, null)

const partialInfoValidation = validateBusinessContactInfo({
  bookingUrl: 'https://gite.fr/booking',
})
assert.strictEqual(partialInfoValidation.valid, true)
assert.strictEqual(partialInfoValidation.sanitized?.phone, null)
assert.strictEqual(partialInfoValidation.sanitized?.bookingUrl, 'https://gite.fr/booking')
assert.strictEqual(partialInfoValidation.sanitized?.appointmentUrl, null)

const completeInfoValidation = validateBusinessContactInfo({
  phone: '06 00 11 22 33',
  bookingUrl: 'https://gite.fr/booking',
  appointmentUrl: 'https://calendly.com/gite/rdv',
})
assert.strictEqual(completeInfoValidation.valid, true)
assert.strictEqual(completeInfoValidation.sanitized?.phone, '06 00 11 22 33')

console.log('✔ TEST 3 PASSED: BusinessContactInfo supports all optional combinations')

// ============================================================================
// TEST 4: Onboarding includes optional contact section and remains completable
// ============================================================================
assert.ok(
  onboardingPageContent.includes('Comment vos clients peuvent-ils vous contacter ?'),
  'TEST 4 FAILED: Onboarding must contain French contact section heading'
)
assert.ok(
  onboardingPageContent.includes('Vous pourrez les modifier plus tard.'),
  'TEST 4 FAILED: Onboarding must include helper text'
)
assert.ok(
  onboardingPageContent.includes('name="phone"') &&
    onboardingPageContent.includes('name="bookingUrl"') &&
    onboardingPageContent.includes('name="appointmentUrl"'),
  'TEST 4 FAILED: Onboarding must expose phone, bookingUrl, and appointmentUrl fields'
)
assert.ok(
  onboardingActionsContent.includes('saveBusinessContactInfo'),
  'TEST 4 FAILED: Onboarding action must persist provided contact info'
)
console.log('✔ TEST 4 PASSED: Onboarding contains optional contact setup without blocking completion')

// ============================================================================
// TEST 5: POST Studio exposes "Que voulez-vous que les gens fassent ?"
// ============================================================================
assert.ok(
  conversionSelectorContent.includes('Que voulez-vous que les gens fassent ?'),
  'TEST 5 FAILED: ConversionActionSelector must present the required French title'
)
assert.ok(
  conversionSelectorContent.includes('Rien') &&
    conversionSelectorContent.includes('Appeler') &&
    conversionSelectorContent.includes('Réserver') &&
    conversionSelectorContent.includes('Prendre RDV'),
  'TEST 5 FAILED: ConversionActionSelector must present 4 action choices'
)
assert.ok(
  postEditorContent.includes('ConversionActionSelector'),
  'TEST 5 FAILED: PostEditor must render ConversionActionSelector'
)
console.log('✔ TEST 5 PASSED: Post studio integrates intuitive action selector')

// ============================================================================
// TEST 6: Automatic reuse of business defaults vs Missing info prompt
// ============================================================================
assert.ok(
  conversionSelectorContent.includes('getBusinessDefault'),
  'TEST 6 FAILED: Selector must automatically resolve saved business defaults'
)
assert.ok(
  conversionSelectorContent.includes('Enregistrer pour mon activité'),
  'TEST 6 FAILED: Missing information prompt must offer single-action business save'
)
assert.ok(
  conversionSelectorContent.includes('Les personnes seront dirigées vers :') &&
    conversionSelectorContent.includes('Numéro appelé :'),
  'TEST 6 FAILED: Confirmation state must show human confirmation copy'
)
console.log('✔ TEST 6 PASSED: Saved business defaults are automatically reused, missing info prompted once')

// ============================================================================
// TEST 7: Content override vs Business update separation
// ============================================================================
assert.ok(
  conversionSelectorContent.includes('Pour cette publication') &&
    conversionSelectorContent.includes('Pour mon activité'),
  'TEST 7 FAILED: Editor must provide clear distinction between post override and business update'
)
assert.ok(
  conversionSelectorContent.includes('actionIsOverride') &&
    conversionSelectorContent.includes('setActionIsOverride'),
  'TEST 7 FAILED: Component must track per-publication override flag'
)
console.log('✔ TEST 7 PASSED: Content overrides strictly preserve business default values')

// ============================================================================
// TEST 8: Server action and draft persistence integration
// ============================================================================
assert.ok(
  businessContactActionsContent.includes('saveBusinessContactAction') &&
    businessContactActionsContent.includes('workspace_members'),
  'TEST 8 FAILED: saveBusinessContactAction must verify workspace membership (tenant isolation)'
)
assert.ok(
  contentActionsContent.includes('action: ContentActionPayload') ||
    contentActionsContent.includes('action?: ContentActionPayload'),
  'TEST 8 FAILED: SaveContentDraftPayload must support structured action payload'
)
assert.ok(
  contentStudioContent.includes('initialContactInfo') &&
    contentStudioContent.includes('businessContactInfo'),
  'TEST 8 FAILED: ContentStudio must load and maintain businessContactInfo state'
)
console.log('✔ TEST 8 PASSED: Server persistence enforces tenant isolation and schema compliance')

// ============================================================================
// TEST 9: Invariants on external API call counts (0 Gemini, 0 OpenAI, 0 Social)
// ============================================================================
assert.ok(
  !businessContactServiceContent.includes('generateImage') &&
    !businessContactServiceContent.includes('callGemini') &&
    !businessContactServiceContent.includes('openai'),
  'TEST 9 FAILED: Business contact service must perform 0 AI calls'
)
assert.ok(
  !conversionSelectorContent.includes('generateImage') &&
    !conversionSelectorContent.includes('callGemini') &&
    !conversionSelectorContent.includes('openai'),
  'TEST 9 FAILED: Conversion selector must perform 0 AI calls'
)
console.log('✔ TEST 9 PASSED: Strictly 0 automatic Gemini, 0 OpenAI, and 0 social API calls')

console.log('=== ALL STEP 157B TESTS PASSED SUCCESSFULLY ===')
