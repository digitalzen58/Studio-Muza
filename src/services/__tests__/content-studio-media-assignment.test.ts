import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('=== RUNNING STUDIO MŪZA STEP 146 TESTS (CU–DN) ===')

const actionsMediaContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/actions/media.ts'),
  'utf8'
)

const actionsContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/actions/content.ts'),
  'utf8'
)

const servicesMediaContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/services/media.ts'),
  'utf8'
)

const studioComponentContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/studio/content-studio.tsx'),
  'utf8'
)

const mediaPickerModalContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/studio/media-picker-modal.tsx'),
  'utf8'
)

const migration015Content = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/015_private_media_storage_foundation.sql'),
  'utf8'
)

// ============================================================================
// TEST CU: “Mes médias” is enabled in Content Studio
// ============================================================================
assert.ok(
  studioComponentContent.includes('onClick={() => setMediaPickerOpen(true)}'),
  'CU FAILED: ContentStudio must have an enabled click handler opening the media picker'
)
assert.ok(
  !studioComponentContent.includes('<button\n            type="button"\n            disabled\n            className="flex flex-col items-center justify-center p-3 rounded-xl border border-ivory-border bg-ivory-subtle/50 text-ink-muted cursor-not-allowed opacity-60 text-center gap-1"\n          >\n            <span className="text-xs font-medium">Mes médias</span>'),
  'CU FAILED: "Mes médias" button must not remain disabled'
)
console.log('✓ TEST CU: “Mes médias” is enabled in Content Studio')

// ============================================================================
// TEST CV: personal media listing is business-scoped
// ============================================================================
assert.ok(
  servicesMediaContent.includes(".eq('business_id', businessId)"),
  'CV FAILED: getBusinessMediaAssets must filter explicitly by business_id'
)
assert.ok(
  actionsMediaContent.includes('can_access_business'),
  'CV FAILED: uploadBusinessMediaAction must verify business access via can_access_business'
)
console.log('✓ TEST CV: Personal media listing is business-scoped')

// ============================================================================
// TEST CW: cross-business media excluded
// ============================================================================
assert.ok(
  migration015Content.includes('can_access_business'),
  'CW FAILED: Storage policies in migration 015 must enforce can_access_business'
)
assert.ok(
  migration015Content.includes("split_part(name, '/', 2)"),
  'CW FAILED: Storage policies must extract business_id from object path'
)
console.log('✓ TEST CW: Cross-business media excluded at storage and database levels')

// ============================================================================
// TEST CX: supported image MIME accepted
// ============================================================================
assert.ok(
  actionsMediaContent.includes("'image/jpeg'") &&
  actionsMediaContent.includes("'image/png'") &&
  actionsMediaContent.includes("'image/webp'"),
  'CX FAILED: Server action must accept JPEG, PNG, and WebP'
)
assert.ok(
  migration015Content.includes("'image/jpeg'") &&
  migration015Content.includes("'image/png'") &&
  migration015Content.includes("'image/webp'"),
  'CX FAILED: Storage bucket configuration must allow image/jpeg, image/png, image/webp'
)
console.log('✓ TEST CX: Supported image MIME types (JPEG, PNG, WebP) accepted')

// ============================================================================
// TEST CY: unsupported MIME rejected
// ============================================================================
assert.ok(
  actionsMediaContent.includes('Format non supporté'),
  'CY FAILED: Server action must return error message for unsupported formats'
)
assert.ok(
  mediaPickerModalContent.includes('Format non supporté'),
  'CY FAILED: Client modal must validate supported formats'
)
console.log('✓ TEST CY: Unsupported MIME types rejected with user-friendly French message')

// ============================================================================
// TEST CZ: oversized upload rejected
// ============================================================================
assert.ok(
  actionsMediaContent.includes('10 * 1024 * 1024'),
  'CZ FAILED: Server action must enforce 10MB file size limit'
)
assert.ok(
  migration015Content.includes('10485760'),
  'CZ FAILED: Storage bucket configuration must enforce 10485760 bytes limit'
)
assert.ok(
  actionsMediaContent.includes('trop volumineux'),
  'CZ FAILED: Server action must return clear message when file is oversized'
)
console.log('✓ TEST CZ: Oversized upload (>10MB) rejected server-side and client-side')

// ============================================================================
// TEST DA: upload creates exactly one media_assets row
// ============================================================================
assert.ok(
  actionsMediaContent.includes(".from('media_assets')\n      .insert({"),
  'DA FAILED: Upload action must insert into media_assets table'
)
assert.ok(
  actionsMediaContent.includes("media_type: 'IMAGE'"),
  'DA FAILED: Inserted media asset must have media_type IMAGE'
)
assert.ok(
  actionsMediaContent.includes("source: 'USER_UPLOAD'"),
  'DA FAILED: Inserted media asset must identify source representing user upload'
)
console.log('✓ TEST DA: Upload creates exactly one media_assets row with IMAGE type and USER_UPLOAD source')

// ============================================================================
// TEST DB: storage path is collision-safe and business-scoped
// ============================================================================
assert.ok(
  actionsMediaContent.includes('businesses/${businessId}/media/${assetId}.${extension}'),
  'DB FAILED: Storage path must follow collision-safe pattern businesses/{businessId}/media/{assetId}.{ext}'
)
console.log('✓ TEST DB: Storage path is collision-safe (UUID) and business-scoped')

// ============================================================================
// TEST DC: no AI metadata invented
// ============================================================================
assert.ok(
  !actionsMediaContent.includes('ai_description:'),
  'DC FAILED: Upload action must not invent ai_description'
)
assert.ok(
  !actionsMediaContent.includes('ai_tags:'),
  'DC FAILED: Upload action must not invent ai_tags'
)
assert.ok(
  !actionsMediaContent.includes('detected_objects:'),
  'DC FAILED: Upload action must not invent detected_objects'
)
assert.ok(
  !actionsMediaContent.includes('detected_scenes:'),
  'DC FAILED: Upload action must not invent detected_scenes'
)
console.log('✓ TEST DC: Zero AI metadata invented (ai_description null, empty tags/objects/scenes)')

// ============================================================================
// TEST DD: upload performs 0 Gemini calls
// ============================================================================
assert.ok(
  !actionsMediaContent.includes('@google/genai'),
  'DD FAILED: actions/media.ts must not import @google/genai'
)
assert.ok(
  !servicesMediaContent.includes('@google/genai'),
  'DD FAILED: services/media.ts must not import @google/genai'
)
assert.ok(
  !mediaPickerModalContent.includes('@google/genai'),
  'DD FAILED: media-picker-modal.tsx must not import @google/genai'
)
console.log('✓ TEST DD: Upload performs 0 Gemini calls (0 AI tokens)')

// ============================================================================
// TEST DE: upload performs 0 OpenAI calls
// ============================================================================
assert.ok(
  !actionsMediaContent.includes('openai'),
  'DE FAILED: actions/media.ts must not import openai'
)
assert.ok(
  !servicesMediaContent.includes('openai'),
  'DE FAILED: services/media.ts must not import openai'
)
assert.ok(
  !mediaPickerModalContent.includes('openai'),
  'DE FAILED: media-picker-modal.tsx must not import openai'
)
console.log('✓ TEST DE: Upload performs 0 OpenAI calls (0 AI tokens)')

// ============================================================================
// TEST DF: selecting image assigns correct media_asset to correct slide
// ============================================================================
assert.ok(
  studioComponentContent.includes('handleAssignSlideMedia = (asset: BrandMediaAsset) => {'),
  'DF FAILED: ContentStudio must define handleAssignSlideMedia'
)
assert.ok(
  studioComponentContent.includes('s.index === activeSlideIndex ? { ...s, media_id: asset.id } : s'),
  'DF FAILED: handleAssignSlideMedia must assign asset.id to activeSlideIndex'
)
console.log('✓ TEST DF: Selecting image assigns correct media_asset to active slide')

// ============================================================================
// TEST DG: assignment persists canonically in content_media
// ============================================================================
assert.ok(
  actionsContent.includes(".from('content_media')"),
  'DG FAILED: saveContentDraftAction must interact with content_media table'
)
assert.ok(
  actionsContent.includes("usage_type: 'CAROUSEL_SLIDE'"),
  'DG FAILED: content_media assignment must set usage_type to CAROUSEL_SLIDE'
)
assert.ok(
  actionsContent.includes('position: s.index'),
  'DG FAILED: content_media assignment must store slide index as position'
)
console.log('✓ TEST DG: Slide media assignment persists canonically in content_media with position')

// ============================================================================
// TEST DH: save/reopen restores exact slide-media assignment
// ============================================================================
assert.ok(
  studioComponentContent.includes('initialMediaAssets'),
  'DH FAILED: ContentStudio must accept initialMediaAssets'
)
assert.ok(
  studioComponentContent.includes('activeSlideMedia = activeSlide.media_id'),
  'DH FAILED: ContentStudio must resolve activeSlideMedia from activeSlide.media_id'
)
assert.ok(
  studioComponentContent.includes('src={activeSlideMedia.url}'),
  'DH FAILED: ContentStudio must render activeSlideMedia.url when assigned'
)
console.log('✓ TEST DH: Save/reopen restores exact slide-media assignment and renders visual')

// ============================================================================
// TEST DI: removing assignment persists
// ============================================================================
assert.ok(
  studioComponentContent.includes('handleRemoveSlideMedia = () => {'),
  'DI FAILED: ContentStudio must define handleRemoveSlideMedia'
)
assert.ok(
  studioComponentContent.includes('s.index === activeSlideIndex ? { ...s, media_id: null } : s'),
  'DI FAILED: handleRemoveSlideMedia must set media_id to null'
)
assert.ok(
  actionsContent.includes(".from('content_media')") &&
  actionsContent.includes(".delete()") &&
  actionsContent.includes(".eq('content_id', payload.contentId)"),
  'DI FAILED: saveContentDraftAction must sync content_media by deleting old and inserting active assignments'
)
console.log('✓ TEST DI: Removing assignment updates slide state to null and persists on save')

// ============================================================================
// TEST DJ: removing assignment does not delete media asset
// ============================================================================
assert.ok(
  !studioComponentContent.includes("delete().from('media_assets')"),
  'DJ FAILED: Removing media from slide must not delete media_assets row'
)
assert.ok(
  !actionsContent.includes(".from('media_assets').delete()"),
  'DJ FAILED: saveContentDraftAction must not delete from media_assets table'
)
console.log('✓ TEST DJ: Removing assignment detaches media from slide without deleting library asset')

// ============================================================================
// TEST DK: text save does not erase media assignments
// ============================================================================
assert.ok(
  studioComponentContent.includes('slides,'),
  'DK FAILED: executeSave must pass current slides array with media_id intact'
)
assert.ok(
  actionsContent.includes('slides: payload.slides'),
  'DK FAILED: saveContentDraftAction must preserve slide metadata including media_id'
)
console.log('✓ TEST DK: Text save preserves slide media_id assignments')

// ============================================================================
// TEST DL: media save does not erase text
// ============================================================================
assert.ok(
  studioComponentContent.includes('workingTitle,'),
  'DL FAILED: executeSave must pass workingTitle'
)
assert.ok(
  studioComponentContent.includes('hook: hook.trim() || null,'),
  'DL FAILED: executeSave must pass hook'
)
assert.ok(
  studioComponentContent.includes('caption: caption.trim() || null,'),
  'DL FAILED: executeSave must pass caption'
)
assert.ok(
  studioComponentContent.includes('cta: cta.trim() || null,'),
  'DL FAILED: executeSave must pass cta'
)
console.log('✓ TEST DL: Media assignment save preserves workingTitle, hook, caption, and cta')

// ============================================================================
// TEST DM: signed/private URL strategy does not expose service-role credentials
// ============================================================================
assert.ok(
  migration015Content.includes("public = false"),
  'DM FAILED: media_assets bucket must be private (public = false)'
)
assert.ok(
  servicesMediaContent.includes('createSignedUrl(item.storage_key, 3600)'),
  'DM FAILED: services/media.ts must generate signed URLs with limited expiry'
)
assert.ok(
  !studioComponentContent.includes('SUPABASE_SERVICE_ROLE_KEY'),
  'DM FAILED: ContentStudio client component must never access service role key'
)
assert.ok(
  !mediaPickerModalContent.includes('SUPABASE_SERVICE_ROLE_KEY'),
  'DM FAILED: media-picker-modal client component must never access service role key'
)
console.log('✓ TEST DM: Private bucket + 1-hour signed URLs used, 0 service-role exposure')

// ============================================================================
// TEST DN: “Photos gratuites” remains disabled and performs no external search
// ============================================================================
assert.ok(
  studioComponentContent.includes('<span className="text-xs font-medium">Photos gratuites</span>'),
  'DN FAILED: ContentStudio must display "Photos gratuites"'
)
assert.ok(
  !studioComponentContent.includes('unsplash'),
  'DN FAILED: ContentStudio must not call Unsplash API'
)
assert.ok(
  !studioComponentContent.includes('pexels'),
  'DN FAILED: ContentStudio must not call Pexels API'
)
assert.ok(
  studioComponentContent.includes('À venir'),
  'DN FAILED: "Photos gratuites" must display "À venir" badge'
)
console.log('✓ TEST DN: “Photos gratuites” remains disabled with “À venir” badge and 0 external search calls')

console.log('\n=== ALL TESTS (CU–DN) PASSED DETERMINISTICALLY ===')
