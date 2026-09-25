import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'

test('=== STUDIO MŪZA — INSTAGRAM & FACEBOOK PRE-PUBLICATION PREVIEW MODAL TESTS ===', async (t) => {
  const rootDir = process.cwd()

  await t.test('1. ContentPreviewModal exists and supports network tabs (Instagram & Facebook)', () => {
    const modalContent = fs.readFileSync(path.resolve(rootDir, 'src/components/studio/content-preview-modal.tsx'), 'utf8')
    assert.ok(modalContent.includes("setActiveTab('INSTAGRAM')"), 'Modal must support switching to Instagram tab')
    assert.ok(modalContent.includes("setActiveTab('FACEBOOK')"), 'Modal must support switching to Facebook tab')
    assert.ok(modalContent.includes('Aperçu de votre publication'), 'Modal title must be Aperçu de votre publication')
  })

  await t.test('2. Instant tab switching between Instagram and Facebook without page reload or AI calls', () => {
    const modalContent = fs.readFileSync(path.resolve(rootDir, 'src/components/studio/content-preview-modal.tsx'), 'utf8')
    assert.ok(modalContent.includes('activeTab === \'INSTAGRAM\''), 'Must conditionally render Instagram card')
    assert.ok(modalContent.includes('activeTab === \'FACEBOOK\''), 'Must conditionally render Facebook card')
    assert.ok(!modalContent.includes('fetch('), 'Must not trigger external network API calls during tab switch')
  })

  await t.test('3. Preview works seamlessly without connected social account', () => {
    const modalContent = fs.readFileSync(path.resolve(rootDir, 'src/components/studio/content-preview-modal.tsx'), 'utf8')
    assert.ok(modalContent.includes('Aperçu libre'), 'Must display un-connected preview status cleanly')
    assert.ok(modalContent.includes('isIgConnected'), 'Must check Instagram connection status safely')
    assert.ok(modalContent.includes('isFbConnected'), 'Must check Facebook connection status safely')
  })

  await t.test('4. Real account_name used when connected, fallback to business_name when missing', () => {
    const modalContent = fs.readFileSync(path.resolve(rootDir, 'src/components/studio/content-preview-modal.tsx'), 'utf8')
    assert.ok(modalContent.includes('igAccount?.accountName || businessName'), 'Instagram must use accountName or fallback to businessName')
    assert.ok(modalContent.includes('fbAccount?.accountName || businessName'), 'Facebook must use accountName or fallback to businessName')
  })

  await t.test('5. Caption rendering with whitespace-pre-wrap preservation', () => {
    const modalContent = fs.readFileSync(path.resolve(rootDir, 'src/components/studio/content-preview-modal.tsx'), 'utf8')
    assert.ok(modalContent.includes('whitespace-pre-wrap'), 'Caption text must preserve line breaks via whitespace-pre-wrap')
    assert.ok(modalContent.includes('caption.trim()'), 'Caption text must be trimmed')
  })

  await t.test('6. Visual engine (VisualCanvas) reused for media composition (backgrounds, gradients, effects, text, fonts, emojis)', () => {
    const modalContent = fs.readFileSync(path.resolve(rootDir, 'src/components/studio/content-preview-modal.tsx'), 'utf8')
    assert.ok(modalContent.includes('<VisualCanvas'), 'Must render VisualCanvas component with readOnly=true')
    assert.ok(modalContent.includes('readOnly={true}'), 'VisualCanvas must be set to readOnly')
  })

  await t.test('7. Multi-page carousel support with page stepper and page navigation controls', () => {
    const modalContent = fs.readFileSync(path.resolve(rootDir, 'src/components/studio/content-preview-modal.tsx'), 'utf8')
    assert.ok(modalContent.includes('handlePrevPage'), 'Must support previous page navigation')
    assert.ok(modalContent.includes('handleNextPage'), 'Must support next page navigation')
    assert.ok(modalContent.includes('slides.length'), 'Must render carousel slide count')
  })

  await t.test('8. Zero fake engagement numbers (0 fake likes, 0 fake comments, 0 fake views)', () => {
    const modalContent = fs.readFileSync(path.resolve(rootDir, 'src/components/studio/content-preview-modal.tsx'), 'utf8')
    assert.ok(!modalContent.includes('1,420 likes'), 'Must not contain fake like counts')
    assert.ok(!modalContent.includes('1 420 J\'aime'), 'Must not contain fake like counts')
    assert.ok(!modalContent.includes('Voir les 42 commentaires'), 'Must not contain fake comments')
  })

  await t.test('9. Facebook layout puts text BEFORE media, Instagram puts caption AFTER media', () => {
    const modalContent = fs.readFileSync(path.resolve(rootDir, 'src/components/studio/content-preview-modal.tsx'), 'utf8')

    // Find Facebook block and verify text precedes media
    const fbBlock = modalContent.slice(modalContent.indexOf('FACEBOOK FEED PREVIEW'))
    const fbCaptionIdx = fbBlock.indexOf('Facebook Caption Section (PLACED BEFORE MEDIA)')
    const fbMediaIdx = fbBlock.indexOf('Media Layer')
    assert.ok(fbCaptionIdx > 0 && fbMediaIdx > fbCaptionIdx, 'Facebook preview must place caption BEFORE media layer')

    // Find Instagram block and verify media precedes caption
    const igBlock = modalContent.slice(modalContent.indexOf('INSTAGRAM FEED PREVIEW'), modalContent.indexOf('FACEBOOK FEED PREVIEW'))
    const igMediaIdx = igBlock.indexOf('Media Layer')
    const igCaptionIdx = igBlock.indexOf('Instagram Caption Section')
    assert.ok(igMediaIdx > 0 && igCaptionIdx > igMediaIdx, 'Instagram preview must place media BEFORE caption section')
  })

  await t.test('10. Footer Publier maintenant button reuses existing publication flow', () => {
    const modalContent = fs.readFileSync(path.resolve(rootDir, 'src/components/studio/content-preview-modal.tsx'), 'utf8')
    assert.ok(modalContent.includes('onProceedToPublish()'), 'Must call onProceedToPublish when Publier maintenant is clicked')
    assert.ok(modalContent.includes('Publier maintenant'), 'Must have button labeled Publier maintenant')
  })

  await t.test('11. Responsive modal design (max-w-xl desktop feed frame + scrollable body)', () => {
    const modalContent = fs.readFileSync(path.resolve(rootDir, 'src/components/studio/content-preview-modal.tsx'), 'utf8')
    assert.ok(modalContent.includes('max-w-xl'), 'Modal wrapper must use max-w-xl for comfortable desktop feed width')
    assert.ok(modalContent.includes('overflow-y-auto'), 'Modal body must be vertically scrollable for mobile')
  })

  await t.test('12. Network-specific discovery/SEO optimization sections present for Instagram and Facebook', () => {
    const modalContent = fs.readFileSync(path.resolve(rootDir, 'src/components/studio/content-preview-modal.tsx'), 'utf8')
    assert.ok(modalContent.includes('Optimisation pour Instagram'), 'Must include Optimisation pour Instagram section')
    assert.ok(modalContent.includes('Optimisation pour Facebook'), 'Must include Optimisation pour Facebook section')
    assert.ok(modalContent.includes('Ces mots et repères aident les bonnes personnes'), 'Must include user-friendly explanation')
  })

  await t.test('13. Hashtags rendered in Instagram feed card exactly where published', () => {
    const modalContent = fs.readFileSync(path.resolve(rootDir, 'src/components/studio/content-preview-modal.tsx'), 'utf8')
    assert.ok(modalContent.includes('igHashtags.length > 0'), 'Instagram feed card must conditionally render active hashtags')
    assert.ok(modalContent.includes('igHashtags.map'), 'Instagram feed card must render hashtag items')
  })

  await t.test('14. Action triggers for future Mūza Intelligence (Suggérer des hashtags ✦ / Optimiser pour network ✦)', () => {
    const modalContent = fs.readFileSync(path.resolve(rootDir, 'src/components/studio/content-preview-modal.tsx'), 'utf8')
    assert.ok(modalContent.includes('Suggérer des hashtags ✦'), 'Must include Suggérer des hashtags action trigger')
    assert.ok(modalContent.includes('Optimiser pour Instagram ✦'), 'Must include Optimiser pour Instagram action trigger')
    assert.ok(modalContent.includes('Optimiser pour Facebook ✦'), 'Must include Optimiser pour Facebook action trigger')
  })

  await t.test('15. Zero automatic AI call / zero API token consumed on modal open', () => {
    const modalContent = fs.readFileSync(path.resolve(rootDir, 'src/components/studio/content-preview-modal.tsx'), 'utf8')
    assert.ok(!modalContent.includes('@google/genai'), 'Must not call Gemini AI automatically')
    assert.ok(!modalContent.includes('openai'), 'Must not call OpenAI automatically')
  })
})
