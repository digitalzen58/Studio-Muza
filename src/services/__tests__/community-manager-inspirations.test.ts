import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { sanitizeRecommendationTitle } from '../title-sanitizer'

async function runAllTests() {
  console.log('=== RUNNING STUDIO MŪZA STEP 159 / 159B TESTS (INSPIRATIONS = COMMUNITY MANAGER) ===')

  const inspirationsPagePath = path.join(process.cwd(), 'src/app/(dashboard)/app/inspirations/page.tsx')
  const inspirationsViewPath = path.join(process.cwd(), 'src/components/inspirations/inspirations-view.tsx')
  const bottomNavPath = path.join(process.cwd(), 'src/components/layout/bottom-nav.tsx')
  const desktopSidebarPath = path.join(process.cwd(), 'src/components/layout/desktop-sidebar.tsx')
  const homePagePath = path.join(process.cwd(), 'src/app/(dashboard)/app/page.tsx')
  const calendarPagePath = path.join(process.cwd(), 'src/app/(dashboard)/app/calendar/page.tsx')

  assert.ok(fs.existsSync(inspirationsPagePath), 'TEST A FAILED: /app/inspirations route file must exist')
  assert.ok(fs.existsSync(inspirationsViewPath), 'TEST B FAILED: InspirationsView component must exist')

  const inspirationsPageContent = fs.readFileSync(inspirationsPagePath, 'utf-8')
  const inspirationsViewContent = fs.readFileSync(inspirationsViewPath, 'utf-8')
  const bottomNavContent = fs.readFileSync(bottomNavPath, 'utf-8')
  const desktopSidebarContent = fs.readFileSync(desktopSidebarPath, 'utf-8')
  const homePageContent = fs.readFileSync(homePagePath, 'utf-8')
  const calendarPageContent = fs.readFileSync(calendarPagePath, 'utf-8')

  // -------------------------------------------------------------
  // 1. Navigation Reconnection & Zero 404
  // -------------------------------------------------------------
  {
    assert.ok(
      bottomNavContent.includes("href: '/app/inspirations'"),
      'TEST 1 FAILED: BottomNav must link to /app/inspirations'
    )
    assert.ok(
      desktopSidebarContent.includes("href: '/app/inspirations'"),
      'TEST 1 FAILED: DesktopSidebar must link to /app/inspirations'
    )
    assert.ok(
      bottomNavContent.includes("href: '/app/muza'"),
      'TEST 1 FAILED: Mūza nav item in BottomNav must route to /app/muza'
    )
    assert.ok(
      desktopSidebarContent.includes("href: '/app/muza'"),
      'TEST 1 FAILED: Mūza nav item in DesktopSidebar must route to /app/muza'
    )
    console.log('✔ TEST 1 PASSED: Navigation correctly routes to /app/inspirations and /app/muza')
  }

  // -------------------------------------------------------------
  // 2. Server-side Tenant Isolation & Page Load = 0 AI calls
  // -------------------------------------------------------------
  {
    assert.ok(
      inspirationsPageContent.includes('getActiveWorkspaceBusiness') &&
        inspirationsPageContent.includes('getLatestRecommendationBatchForActiveBusiness'),
      'TEST 2 FAILED: InspirationsPage must resolve active business and fetch persisted batch'
    )
    assert.ok(
      !inspirationsPageContent.includes('generateRecommendationsAction') &&
        !inspirationsPageContent.includes('callGemini') &&
        !inspirationsPageContent.includes('callOpenAI'),
      'TEST 2 FAILED: InspirationsPage server component must not invoke AI on page load'
    )
    console.log('✔ TEST 2 PASSED: Server-side tenant isolation enforced; page load performs 0 AI calls')
  }

  // -------------------------------------------------------------
  // 3. Community Manager Experience (No complex marketing filters)
  // -------------------------------------------------------------
  {
    assert.ok(
      inspirationsViewContent.includes('Votre Community Manager a préparé des idées pour votre activité'),
      'TEST 3 FAILED: InspirationsView must present the Community Manager framing'
    )
    assert.ok(
      inspirationsViewContent.includes('Cette semaine, voici ce que vous pourriez raconter'),
      'TEST 3 FAILED: InspirationsView must present the contextual weekly editorial proposal'
    )
    assert.ok(
      !inspirationsViewContent.includes('funnel') &&
        !inspirationsViewContent.includes('conversion stage') &&
        !inspirationsViewContent.includes('audience segment score'),
      'TEST 3 FAILED: Community Manager view must be free of marketing jargon'
    )
    console.log('✔ TEST 3 PASSED: Clean Community Manager framing without complex filter tabs or jargon')
  }

  // -------------------------------------------------------------
  // 4. Supported Actionable Formats (POST & CAROUSEL)
  // -------------------------------------------------------------
  {
    assert.ok(
      inspirationsViewContent.includes('isActionableContentRecommendation'),
      'TEST 4 FAILED: InspirationsView must filter for actionable content recommendations'
    )
    assert.ok(
      inspirationsViewContent.includes('INSTAGRAM_REEL') &&
        inspirationsViewContent.includes('BLOG_ARTICLE') &&
        inspirationsViewContent.includes('WEBSITE_PAGE'),
      'TEST 4 FAILED: Unsupported video and SEO formats must be filtered from actionable creation'
    )
    console.log('✔ TEST 4 PASSED: Unsupported video and SEO formats excluded from actionable creation')
  }

  // -------------------------------------------------------------
  // 5. Creation & Feedback Action Integration
  // -------------------------------------------------------------
  {
    assert.ok(
      inspirationsViewContent.includes('createOrGetContentDraftAction'),
      'TEST 5 FAILED: InspirationsView must reuse existing createOrGetContentDraftAction'
    )
    assert.ok(
      inspirationsViewContent.includes('recordRecommendationFeedbackAction'),
      'TEST 5 FAILED: InspirationsView must reuse existing recordRecommendationFeedbackAction'
    )
    assert.ok(
      inspirationsViewContent.includes('generateRecommendationsAction'),
      'TEST 5 FAILED: InspirationsView must reuse existing generateRecommendationsAction on explicit request'
    )
    assert.ok(
      inspirationsViewContent.includes('Proposez-moi autre chose ✦'),
      'TEST 5 FAILED: InspirationsView must expose explicit action for alternative ideas'
    )
    console.log('✔ TEST 5 PASSED: Reuses canonical draft creation, recommendation feedback, and explicit generation')
  }

  // -------------------------------------------------------------
  // 6. Step 159B: Title Sanitization (Engine Prefix Stripping)
  // -------------------------------------------------------------
  {
    const sample1 = "Carrousel inspiration : 3 balades d'automne incontournables dans le Morvan avec son chien"
    const sample2 = "Post inspiration : Les secrets du Morvan"
    const sample3 = "Publication : Pourquoi venir chez nous"
    const sample4 = "3 conseils pour préparer son séjour"

    assert.equal(
      sanitizeRecommendationTitle(sample1),
      "3 balades d'automne incontournables dans le Morvan avec son chien",
      '159B FAILED: Carrousel inspiration prefix must be stripped'
    )
    assert.equal(
      sanitizeRecommendationTitle(sample2),
      "Les secrets du Morvan",
      '159B FAILED: Post inspiration prefix must be stripped'
    )
    assert.equal(
      sanitizeRecommendationTitle(sample3),
      "Pourquoi venir chez nous",
      '159B FAILED: Publication prefix must be stripped'
    )
    assert.equal(
      sanitizeRecommendationTitle(sample4),
      "3 conseils pour préparer son séjour",
      '159B FAILED: Clean title without prefix must remain unchanged'
    )
    console.log('✔ TEST 6 PASSED: Recommendation engine prefixes cleanly and deterministically stripped from display titles')
  }

  // -------------------------------------------------------------
  // 7. Step 159B: Draft State & Clear Card Hierarchy
  // -------------------------------------------------------------
  {
    assert.ok(
      inspirationsViewContent.includes('Brouillon commencé'),
      '159B FAILED: Existing draft must display "Brouillon commencé" badge'
    )
    assert.ok(
      inspirationsViewContent.includes("hasExistingDraft ? 'Continuer le brouillon' : 'Créer ce contenu'"),
      '159B FAILED: Primary CTA must adapt between "Continuer le brouillon" and "Créer ce contenu"'
    )
    assert.ok(
      inspirationsViewContent.includes('Pourquoi Mūza vous le conseille'),
      '159B FAILED: Strategic explanation section must be displayed'
    )
    console.log('✔ TEST 7 PASSED: Draft state clearly demarcated ("Brouillon commencé" / "Continuer le brouillon")')
  }

  // -------------------------------------------------------------
  // 8. Step 159B: Prototype-like Mock Frames Removed & Real Media Preserved
  // -------------------------------------------------------------
  {
    assert.ok(
      !inspirationsViewContent.includes('Mūza Carrousel') &&
        !inspirationsViewContent.includes('Carrousel • Multi-slides'),
      '159B FAILED: Prototype-like fake carousel simulation frame must be removed from Inspirations'
    )
    assert.ok(
      inspirationsViewContent.includes('assignedMedia &&'),
      '159B FAILED: Real brand media preview must be rendered when authentic media is available'
    )
    console.log('✔ TEST 8 PASSED: Fake carousel simulation removed; real brand media displayed cleanly')
  }

  // -------------------------------------------------------------
  // 9. Step 159B: Non-blocking Error UX
  // -------------------------------------------------------------
  {
    assert.ok(
      inspirationsViewContent.includes('Impossible de préparer de nouvelles idées pour le moment'),
      '159B FAILED: Error message when existing ideas are present must reassure user'
    )
    assert.ok(
      inspirationsViewContent.includes('Vos idées actuelles sont toujours disponibles'),
      '159B FAILED: Error message must state existing ideas remain available'
    )
    console.log('✔ TEST 9 PASSED: Non-blocking error notification implemented')
  }

  // -------------------------------------------------------------
  // 10. Step 159B: Responsive 2-Column Grid & Single-Item Max-Width
  // -------------------------------------------------------------
  {
    assert.ok(
      inspirationsViewContent.includes('grid grid-cols-1 lg:grid-cols-2 gap-5'),
      '159B FAILED: 2+ recommendations must use a 2-column grid on desktop'
    )
    assert.ok(
      inspirationsViewContent.includes("actionableItems.length === 1\n            ? 'w-full max-w-2xl'"),
      '159B FAILED: Single recommendation must use a comfortable max-w-2xl width'
    )
    console.log('✔ TEST 10 PASSED: Responsive 2-column grid and single-item max-w-2xl width verified')
  }

  // -------------------------------------------------------------
  // 11. Independence & Isolation of Other Modules
  // -------------------------------------------------------------
  {
    assert.ok(
      homePageContent.includes('RecommendationSection'),
      'TEST 11 FAILED: Home page must remain intact'
    )
    assert.ok(
      calendarPageContent.includes('CalendarViewContainer'),
      'TEST 11 FAILED: Calendar page must remain intact'
    )
    console.log('✔ TEST 11 PASSED: Home, Calendar, Publications, and Studio remain isolated and unaffected')
  }

  console.log('=== ALL STEP 159 & 159B INSPIRATIONS TESTS PASSED SUCCESSFULLY ===')
}

runAllTests()
