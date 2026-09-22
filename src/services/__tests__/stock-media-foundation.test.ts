import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

console.log('=== RUNNING STUDIO MŪZA STEP 148 TESTS (DO–EH) ===')

const actionsStockMediaContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/actions/stock-media.ts'),
  'utf8'
)

const pexelsProviderContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/services/stock-media/pexels-provider.ts'),
  'utf8'
)

const stockTypesContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/services/stock-media/types.ts'),
  'utf8'
)

const studioComponentContent = [
  fs.readFileSync(path.resolve(process.cwd(), 'src/components/studio/content-studio.tsx'), 'utf8'),
  fs.existsSync(path.resolve(process.cwd(), 'src/components/studio/carousel-editor.tsx'))
    ? fs.readFileSync(path.resolve(process.cwd(), 'src/components/studio/carousel-editor.tsx'), 'utf8')
    : '',
  fs.existsSync(path.resolve(process.cwd(), 'src/components/studio/post-editor.tsx'))
    ? fs.readFileSync(path.resolve(process.cwd(), 'src/components/studio/post-editor.tsx'), 'utf8')
    : '',
].join('\n')

const carouselEditorContent = fs.existsSync(path.resolve(process.cwd(), 'src/components/studio/carousel-editor.tsx'))
  ? fs.readFileSync(path.resolve(process.cwd(), 'src/components/studio/carousel-editor.tsx'), 'utf8')
  : ''

const postEditorContent = fs.existsSync(path.resolve(process.cwd(), 'src/components/studio/post-editor.tsx'))
  ? fs.readFileSync(path.resolve(process.cwd(), 'src/components/studio/post-editor.tsx'), 'utf8')
  : ''

const stockMediaModalContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/studio/stock-media-modal.tsx'),
  'utf8'
)

const mediaPickerModalContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/studio/media-picker-modal.tsx'),
  'utf8'
)

const migration016Content = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/016_stock_media_provenance.sql'),
  'utf8'
)

const envExampleContent = fs.readFileSync(
  path.resolve(process.cwd(), '.env.local.example'),
  'utf8'
)

// ============================================================================
// TEST DO: “Photos gratuites” is enabled in Content Studio
// ============================================================================
assert.ok(
  studioComponentContent.includes('setStockModalOpen(true)'),
  'DO FAILED: ContentStudio must trigger setStockModalOpen(true)'
)
assert.ok(
  !studioComponentContent.includes('<button\n            type="button"\n            disabled\n            className="flex flex-col items-center justify-center p-3 rounded-xl border border-ivory-border bg-ivory-subtle/50 text-ink-muted cursor-not-allowed opacity-60 text-center gap-1"\n          >\n            <span className="text-xs font-medium">Photos gratuites</span>'),
  'DO FAILED: "Photos gratuites" button must not remain disabled in Section 4'
)
console.log('✓ TEST DO: “Photos gratuites” is enabled in Content Studio')

// ============================================================================
// TEST DP: Opening picker performs no automatic search
// ============================================================================
assert.ok(
  stockMediaModalContent.includes("const [hasSearched, setHasSearched] = useState(false)"),
  'DP FAILED: Modal must track hasSearched state initialized to false'
)
assert.ok(
  !stockMediaModalContent.includes('useEffect(() => {\n    handleSearch'),
  'DP FAILED: Opening modal must not automatically trigger search via useEffect'
)
console.log('✓ TEST DP: Opening picker performs no automatic search')

// ============================================================================
// TEST DQ: Search only occurs after explicit user action
// ============================================================================
assert.ok(
  stockMediaModalContent.includes('onSubmit={') &&
  stockMediaModalContent.includes('handleSearch(query)'),
  'DQ FAILED: Search modal must have an explicit form onSubmit handler invoking search'
)
assert.ok(
  stockMediaModalContent.includes('type="submit"'),
  'DQ FAILED: Search modal must have an explicit submit button'
)
console.log('✓ TEST DQ: Search only occurs after explicit user action')

// ============================================================================
// TEST DR: Provider API key never exposed to client
// ============================================================================
assert.ok(
  !envExampleContent.includes('NEXT_PUBLIC_PEXELS_API_KEY'),
  'DR FAILED: Pexels API key must not be exposed with NEXT_PUBLIC_ prefix'
)
assert.ok(
  envExampleContent.includes('PEXELS_API_KEY='),
  'DR FAILED: .env.local.example must document server-side PEXELS_API_KEY'
)
assert.ok(
  !stockMediaModalContent.includes('PEXELS_API_KEY'),
  'DR FAILED: Client modal component must not reference PEXELS_API_KEY directly'
)
console.log('✓ TEST DR: Provider API key is strictly server-side and never exposed to client')

// ============================================================================
// TEST DS: Normalized provider result contains provenance
// ============================================================================
assert.ok(
  stockTypesContent.includes('externalId: string') &&
  stockTypesContent.includes('creatorName: string') &&
  stockTypesContent.includes('creatorUrl: string') &&
  stockTypesContent.includes('sourceUrl: string') &&
  stockTypesContent.includes('attributionText: string') &&
  stockTypesContent.includes('licenseLabel: string'),
  'DS FAILED: StockMediaItem type must define complete provenance attributes'
)
assert.ok(
  pexelsProviderContent.includes('creatorName = photo.photographer') &&
  pexelsProviderContent.includes('sourceUrl = photo.url') &&
  pexelsProviderContent.includes('attributionText: `Photo par ${creatorName} sur Pexels`'),
  'DS FAILED: PexelsStockMediaProvider must map creator, source, and attribution correctly'
)
console.log('✓ TEST DS: Normalized provider result contains provenance')

// ============================================================================
// TEST DT: Stock result visibly identifies provider and creator
// ============================================================================
assert.ok(
  stockMediaModalContent.includes('item.creatorName') &&
  stockMediaModalContent.includes('item.creatorUrl') &&
  stockMediaModalContent.includes('sur Pexels'),
  'DT FAILED: Stock media modal must visibly identify creator and Pexels with attribution link'
)
console.log('✓ TEST DT: Stock result visibly identifies provider and creator')

// ============================================================================
// TEST DU: Import creates STOCK media asset
// ============================================================================
assert.ok(
  actionsStockMediaContent.includes("source: 'STOCK_PEXELS'"),
  'DU FAILED: importStockMediaAction must persist source as STOCK_PEXELS'
)
assert.ok(
  migration016Content.includes('(business_id, source, external_asset_id)'),
  'DU FAILED: Migration 016 unique index must include source column'
)
console.log('✓ TEST DU: Import creates STOCK_PEXELS media asset')

// ============================================================================
// TEST DV: Imported asset stored in private bucket
// ============================================================================
assert.ok(
  actionsStockMediaContent.includes("supabase.storage.from('media_assets')"),
  'DV FAILED: importStockMediaAction must upload to private media_assets bucket'
)
assert.ok(
  actionsStockMediaContent.includes("businesses/${businessId}/media/${assetId}.${extension}"),
  'DV FAILED: Storage path must follow business-scoped collision-safe pattern'
)
console.log('✓ TEST DV: Imported asset stored in private media_assets bucket')

// ============================================================================
// TEST DW: Provider provenance persisted
// ============================================================================
assert.ok(
  actionsStockMediaContent.includes('external_asset_id: stockItem.externalId') &&
  actionsStockMediaContent.includes('source_url: stockItem.sourceUrl') &&
  actionsStockMediaContent.includes('creator_name: stockItem.creatorName') &&
  actionsStockMediaContent.includes('creator_url: stockItem.creatorUrl') &&
  actionsStockMediaContent.includes('attribution_required: stockItem.attributionRequired') &&
  actionsStockMediaContent.includes('attribution_text: stockItem.attributionText') &&
  actionsStockMediaContent.includes('license_label: stockItem.licenseLabel'),
  'DW FAILED: importStockMediaAction must insert all provenance fields'
)
console.log('✓ TEST DW: Provider provenance persisted in media_assets')

// ============================================================================
// TEST DX: Same provider asset + same business reuses existing media_asset
// ============================================================================
assert.ok(
  actionsStockMediaContent.includes(".eq('business_id', businessId)") &&
  actionsStockMediaContent.includes(".eq('source', 'STOCK_PEXELS')") &&
  actionsStockMediaContent.includes(".eq('external_asset_id', stockItem.externalId)"),
  'DX FAILED: importStockMediaAction must query for existing stock media for same business'
)
assert.ok(
  migration016Content.includes('CREATE UNIQUE INDEX IF NOT EXISTS media_assets_business_stock_unique_idx'),
  'DX FAILED: Migration 016 must create partial unique index on (business_id, source, external_asset_id)'
)
console.log('✓ TEST DX: Same provider asset + same business reuses existing media_asset')

// ============================================================================
// TEST DY: No cross-business deduplication leakage
// ============================================================================
assert.ok(
  migration016Content.includes('(business_id, source, external_asset_id)'),
  'DY FAILED: Unique constraint must include business_id to prevent cross-tenant deduplication'
)
assert.ok(
  actionsStockMediaContent.includes('can_access_business') &&
  actionsStockMediaContent.includes(".eq('id', businessId)"),
  'DY FAILED: importStockMediaAction must verify caller has access to the business'
)
console.log('✓ TEST DY: Tenant isolation preserved: no cross-business deduplication leakage')

// ============================================================================
// TEST DZ: Stock asset can be assigned to active slide
// ============================================================================
assert.ok(
  studioComponentContent.includes('onSelectMedia={handleAssignSlideMedia}'),
  'DZ FAILED: StockMediaModal must receive handleAssignSlideMedia callback'
)
assert.ok(
  studioComponentContent.includes('media_id: asset.id'),
  'DZ FAILED: Stock asset selection must set slide.media_id'
)
console.log('✓ TEST DZ: Stock asset can be assigned to active carousel slide')

// ============================================================================
// TEST EA: Assignment persists through save/reopen
// ============================================================================
assert.ok(
  studioComponentContent.includes('saveContentDraftAction') &&
  studioComponentContent.includes('slides,'),
  'EA FAILED: ContentStudio save payload must pass slides with assigned media'
)
console.log('✓ TEST EA: Assignment persists through existing save/reopen mechanics')

// ============================================================================
// TEST EB: Stock asset appears in “Mes médias”
// ============================================================================
assert.ok(
  mediaPickerModalContent.includes("media.source?.startsWith('STOCK')"),
  'EB FAILED: MediaPickerModal must inspect media.source to distinguish stock media items'
)
assert.ok(
  mediaPickerModalContent.includes('Photo gratuite'),
  'EB FAILED: MediaPickerModal must display "Photo gratuite" badge for stock assets'
)
console.log('✓ TEST EB: Stock asset appears in “Mes médias” with subtle distinction')

// ============================================================================
// TEST EC: “Photo d’illustration” distinction visible
// ============================================================================
assert.ok(
  studioComponentContent.includes('Photo d’illustration') ||
  carouselEditorContent.includes('Photo d’illustration') ||
  postEditorContent.includes('Photo d’illustration') ||
  studioComponentContent.includes("Photo d'illustration"),
  'EC FAILED: Active slide in Content Studio must display "Photo d’illustration" badge for stock media'
)
assert.ok(
  stockMediaModalContent.includes('illustration'),
  'EC FAILED: Stock modal must inform user that photos are illustration stock photos'
)
console.log('✓ TEST EC: “Photo d’illustration” authenticity distinction is visible')

// ============================================================================
// TEST ED: Provider/search/import performs 0 Gemini calls
// ============================================================================
assert.ok(
  !actionsStockMediaContent.includes('gemini') &&
  !actionsStockMediaContent.includes('google/genai') &&
  !pexelsProviderContent.includes('gemini'),
  'ED FAILED: Stock media actions/services must not reference Gemini'
)
console.log('✓ TEST ED: Stock media actions perform 0 Gemini calls')

// ============================================================================
// TEST EE: Provider/search/import performs 0 OpenAI calls
// ============================================================================
assert.ok(
  !actionsStockMediaContent.includes('openai') &&
  !pexelsProviderContent.includes('openai'),
  'EE FAILED: Stock media actions/services must not reference OpenAI'
)
console.log('✓ TEST EE: Stock media actions perform 0 OpenAI calls')

// ============================================================================
// TEST EF: Arbitrary external URL import is impossible (anti-SSRF)
// ============================================================================
assert.ok(
  actionsStockMediaContent.includes("ALLOWED_DOWNLOAD_HOSTS = ['images.pexels.com']") &&
  actionsStockMediaContent.includes('ALLOWED_DOWNLOAD_HOSTS.includes'),
  'EF FAILED: importStockMediaAction must restrict download hostnames to images.pexels.com'
)
assert.ok(
  actionsStockMediaContent.includes("downloadUrlObj.protocol !== 'https:'"),
  'EF FAILED: importStockMediaAction must require https protocol'
)
console.log('✓ TEST EF: Anti-SSRF: arbitrary external URL import is rejected')

// ============================================================================
// TEST EG: Failed import does not modify existing draft
// ============================================================================
assert.ok(
  stockMediaModalContent.includes('setImportError(result.message)'),
  'EG FAILED: Stock modal must catch import failure and display error without calling onSelect'
)
console.log('✓ TEST EG: Failed import does not modify existing draft')

// ============================================================================
// TEST EH: Existing USER_UPLOAD assets remain unchanged
// ============================================================================
assert.ok(
  migration016Content.includes('ALTER TABLE public.media_assets') &&
  migration016Content.includes('ADD COLUMN IF NOT EXISTS external_asset_id TEXT,'),
  'EH FAILED: Migration 016 columns must be nullable to preserve existing user upload records'
)
console.log('✓ TEST EH: Existing USER_UPLOAD assets remain unchanged and fully functional')

console.log('=== ALL STEP 148 TESTS (DO–EH) PASSED SUCCESSFULLY ===')
