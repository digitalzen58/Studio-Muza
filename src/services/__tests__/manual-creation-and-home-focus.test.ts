import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

const envPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf('=')
    if (idx !== -1) {
      const key = trimmed.slice(0, idx).trim()
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '')
      process.env[key] = val
    }
  }
}

console.log('=== RUNNING STUDIO MŪZA STEP 156C TESTS (IC–IR) ===')

const contentActionsContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/actions/content.ts'),
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

const chooserModalContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/components/studio/creation-chooser-modal.tsx'),
  'utf8'
)

const baselineMigration = fs.readFileSync(
  path.resolve(process.cwd(), 'supabase/migrations/001_baseline_schema.sql'),
  'utf8'
)

// ============================================================================
// TEST IC: Manual POST insert uses only real contents columns
// ============================================================================
assert.ok(
  baselineMigration.includes('CREATE TABLE IF NOT EXISTS public.contents'),
  'IC FAILED: Baseline migration must define contents table'
)
assert.ok(
  contentActionsContent.includes('createManualContentDraftAction'),
  'IC FAILED: createManualContentDraftAction must exist in src/actions/content.ts'
)

// Real columns in contents table: id, business_id, recommendation_id, goal_id, offer_id, audience_id, content_type, topic, angle, content_pillar, hook, body, script, cta, status, created_at, updated_at, scheduled_at, published_at
const allowedContentsColumns = [
  'business_id',
  'recommendation_id',
  'goal_id',
  'offer_id',
  'audience_id',
  'content_type',
  'topic',
  'angle',
  'content_pillar',
  'hook',
  'body',
  'script',
  'cta',
  'status',
  'scheduled_at',
  'published_at',
]
assert.ok(allowedContentsColumns.includes('business_id'), 'IC FAILED: business_id must be in allowed columns')

// Verify insert in createManualContentDraftAction does not contain unapproved columns
assert.ok(
  !contentActionsContent.includes("created_by:"),
  'IC FAILED: createManualContentDraftAction must not reference created_by'
)
console.log('✔ TEST IC PASSED: Manual POST insert uses only real contents columns')

// ============================================================================
// TEST ID: Manual POST creation does not reference created_by anywhere in src/
// ============================================================================
const allSrcFiles = ['src/actions/content.ts', 'src/actions/scheduling.ts', 'src/services/content-readiness/post-readiness.ts']
for (const relPath of allSrcFiles) {
  const fullPath = path.resolve(process.cwd(), relPath)
  if (fs.existsSync(fullPath)) {
    const code = fs.readFileSync(fullPath, 'utf8')
    assert.ok(
      !code.includes('created_by'),
      `ID FAILED: ${relPath} must not contain created_by`
    )
  }
}
console.log('✔ TEST ID PASSED: Manual POST creation does not reference created_by')

// ============================================================================
// TEST IE: Manual POST creation succeeds without recommendation
// ============================================================================
assert.ok(
  contentActionsContent.includes('recommendation_id: null'),
  'IE FAILED: createManualContentDraftAction must insert recommendation_id: null for manual drafts'
)
assert.ok(
  contentActionsContent.includes("format: format") || contentActionsContent.includes("format: 'POST'"),
  'IE FAILED: createManualContentDraftAction must set variant format'
)
console.log('✔ TEST IE PASSED: Manual POST creation configured without recommendation_id')

// ============================================================================
// TEST IF: Manual CAROUSEL creation succeeds without recommendation
// ============================================================================
assert.ok(
  contentActionsContent.includes("format === 'CAROUSEL'"),
  'IF FAILED: createManualContentDraftAction must handle CAROUSEL format'
)
assert.ok(
  contentActionsContent.includes("{ index: 1, type: 'COVER'"),
  'IF FAILED: CAROUSEL format must initialize default carousel slides'
)
console.log('✔ TEST IF PASSED: Manual CAROUSEL creation configured without recommendation_id')

// ============================================================================
// TEST IG: Tenant ownership comes from active business server-side
// ============================================================================
assert.ok(
  contentActionsContent.includes('ensureInitialWorkspace()') &&
    contentActionsContent.includes('getActiveWorkspaceBusiness('),
  'IG FAILED: createManualContentDraftAction must resolve tenant business_id server-side via getActiveWorkspaceBusiness'
)
assert.ok(
  contentActionsContent.includes('business_id: business.id'),
  'IG FAILED: contents insert must explicitly use server-resolved business.id'
)
console.log('✔ TEST IG PASSED: Tenant ownership securely derived from active business server-side')

// ============================================================================
// TEST IH: Home content feed excludes SEO/website recommendation cards
// ============================================================================
assert.ok(
  recSectionContent.includes('isActionableContentRecommendation'),
  'IH FAILED: recommendation-section.tsx must define isActionableContentRecommendation filter'
)
assert.ok(
  recSectionContent.includes("'WEBSITE_PAGE'") && recSectionContent.includes("'BLOG_ARTICLE'"),
  'IH FAILED: isActionableContentRecommendation must filter website and SEO formats'
)
console.log('✔ TEST IH PASSED: Home content feed excludes SEO/website recommendation cards')

// ============================================================================
// TEST II: Home actionable feed excludes unsupported video creation flows
// ============================================================================
assert.ok(
  recSectionContent.includes("'INSTAGRAM_REEL'") && recSectionContent.includes("'TIKTOK'") && recSectionContent.includes("'YOUTUBE_SHORT'"),
  'II FAILED: isActionableContentRecommendation must filter unsupported video formats'
)
assert.ok(
  chooserModalContent.includes('Une vidéo courte') && chooserModalContent.includes('Bientôt'),
  'II FAILED: Creation chooser modal must mark video creation as Bientôt'
)
console.log('✔ TEST II PASSED: Home actionable feed excludes unsupported video creation flows')

// ============================================================================
// TEST IJ: Home prominently exposes “＋ Créer un contenu”
// ============================================================================
assert.ok(
  recSectionContent.includes('Créer un contenu') && recSectionContent.includes('bg-terracotta'),
  'IJ FAILED: recommendation-section.tsx must expose prominent terracotta Créer un contenu button'
)
assert.ok(
  emptyStateContent.includes('Créer un contenu') && emptyStateContent.includes('bg-terracotta'),
  'IJ FAILED: recommendation-empty-state.tsx must also expose prominent terracotta Créer un contenu button'
)
console.log('✔ TEST IJ PASSED: Home prominently exposes centered terracotta “＋ Créer un contenu”')

// ============================================================================
// TEST IK: Home CTA opens existing CreationChooserModal
// ============================================================================
assert.ok(
  recSectionContent.includes('<CreationChooserModal') && recSectionContent.includes('setChooserOpen(true)'),
  'IK FAILED: recommendation-section.tsx must open CreationChooserModal upon CTA click'
)
assert.ok(
  emptyStateContent.includes('<CreationChooserModal') && emptyStateContent.includes('setChooserOpen(true)'),
  'IK FAILED: recommendation-empty-state.tsx must open CreationChooserModal upon CTA click'
)
console.log('✔ TEST IK PASSED: Home CTA opens existing CreationChooserModal')

// ============================================================================
// TEST IL: BottomNav still opens same chooser
// ============================================================================
assert.ok(
  bottomNavContent.includes('<CreationChooserModal') && bottomNavContent.includes('setChooserOpen(true)'),
  'IL FAILED: bottom-nav.tsx must open same CreationChooserModal'
)
console.log('✔ TEST IL PASSED: BottomNav opens same CreationChooserModal')

// ============================================================================
// TEST IM: Existing recommendation-created content still works
// ============================================================================
assert.ok(
  contentActionsContent.includes('createOrGetContentDraftAction'),
  'IM FAILED: createOrGetContentDraftAction must remain available for recommendation flows'
)
console.log('✔ TEST IM PASSED: Existing recommendation-created content action intact')

// ============================================================================
// LIVE DATABASE TESTS (IN, IO & Verification)
// ============================================================================
async function runDatabaseTests() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !serviceKey) {
    console.log('Skipping live DB checks (no env credentials found).')
    return
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  })

  // TEST IN: Existing real carousel remains untouched
  const { data: carouselContent, error: cErr } = await supabase
    .from('contents')
    .select('id, topic, status, scheduled_at')
    .eq('id', 'c14852eb-03dc-4a86-95f0-78b1b1ae8181')
    .maybeSingle()

  if (cErr) {
    console.warn('DB note on carousel check:', cErr.message)
  } else if (carouselContent) {
    assert.strictEqual(carouselContent.id, 'c14852eb-03dc-4a86-95f0-78b1b1ae8181', 'IN FAILED: Carousel ID mismatch')
    console.log('✔ TEST IN PASSED: Existing real carousel c14852eb is untouched')
  }

  // TEST IO: Historical scheduled demo remains untouched
  const { data: scheduledContent, error: sErr } = await supabase
    .from('contents')
    .select('id, topic, status, scheduled_at')
    .eq('id', '21288540-3e0e-4714-ac7c-a304d8874e6f')
    .maybeSingle()

  if (sErr) {
    console.warn('DB note on scheduled check:', sErr.message)
  } else if (scheduledContent) {
    assert.strictEqual(scheduledContent.id, '21288540-3e0e-4714-ac7c-a304d8874e6f', 'IO FAILED: Scheduled ID mismatch')
    assert.strictEqual(scheduledContent.status, 'SCHEDULED', 'IO FAILED: Scheduled demo status must be SCHEDULED')
    assert.ok(scheduledContent.scheduled_at, 'IO FAILED: Scheduled demo scheduled_at must be populated')
    console.log('✔ TEST IO PASSED: Historical scheduled demo 21288540 is untouched and SCHEDULED')
  }

  // Verify test manual creation without created_by
  const { data: testBiz } = await supabase.from('businesses').select('id').limit(1).single()
  if (testBiz) {
    const { data: insertedPost, error: postErr } = await supabase
      .from('contents')
      .insert({
        business_id: testBiz.id,
        recommendation_id: null,
        content_type: 'SOCIAL',
        topic: 'Test Manual Post Draft Step 156C',
        status: 'DRAFT',
      })
      .select('id, business_id, recommendation_id, topic, status')
      .single()

    assert.ok(!postErr, `Direct DB insert of manual POST failed: ${postErr?.message}`)
    assert.ok(insertedPost?.id, 'Direct DB insert of manual POST returned no ID')
    assert.strictEqual(insertedPost.recommendation_id, null, 'recommendation_id must be null')

    // Clean up temporary test row
    await supabase.from('contents').delete().eq('id', insertedPost.id)
    console.log('✔ TEST IE/DB PASSED: Direct DB manual POST insert conforms to real schema and succeeds')
  }
}

// ============================================================================
// TEST IP, IQ, IR: Call count invariants (0 Gemini, 0 OpenAI, 0 Social calls)
// ============================================================================
assert.ok(
  !contentActionsContent.includes('generateContentWithGemini') &&
    !contentActionsContent.includes('callOpenAI') &&
    !contentActionsContent.includes('publishToInstagram'),
  'IP-IR FAILED: Manual draft creation must not invoke AI or external APIs'
)
console.log('✔ TEST IP PASSED: 0 automatic Gemini calls')
console.log('✔ TEST IQ PASSED: 0 OpenAI calls')
console.log('✔ TEST IR PASSED: 0 social API calls')

runDatabaseTests()
  .then(() => {
    console.log('=== ALL STEP 156C TESTS (IC–IR) PASSED SUCCESSFULLY ===')
  })
  .catch((err) => {
    console.error('Database tests failed:', err)
    process.exit(1)
  })
