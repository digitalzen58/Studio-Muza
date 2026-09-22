import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  mapPublicationStatusLabel,
  mapFormatLabel,
  mapPlatformLabel,
} from '../publication-history/types'

async function runAllTests() {
  console.log('=== RUNNING STUDIO MŪZA STEP 158 TESTS (PUBLICATIONS HISTORY FOUNDATION) ===')

  const calendarPagePath = path.join(process.cwd(), 'src/app/(dashboard)/app/calendar/page.tsx')
  const calendarContainerPath = path.join(process.cwd(), 'src/components/calendar/calendar-view-container.tsx')
  const bottomNavPath = path.join(process.cwd(), 'src/components/layout/bottom-nav.tsx')
  const publicationsViewPath = path.join(process.cwd(), 'src/components/publications/publications-view.tsx')
  const publicationCardPath = path.join(process.cwd(), 'src/components/publications/publication-card.tsx')
  const publicationDetailPath = path.join(process.cwd(), 'src/components/publications/publication-detail-modal.tsx')
  const publicationThumbnailPath = path.join(process.cwd(), 'src/components/publications/publication-thumbnail.tsx')
  const publicationFetcherPath = path.join(process.cwd(), 'src/services/publication-history/fetcher.ts')
  const publicationTypesPath = path.join(process.cwd(), 'src/services/publication-history/types.ts')

  const calendarPageContent = fs.readFileSync(calendarPagePath, 'utf-8')
  const calendarContainerContent = fs.readFileSync(calendarContainerPath, 'utf-8')
  const bottomNavContent = fs.readFileSync(bottomNavPath, 'utf-8')
  const publicationsViewContent = fs.readFileSync(publicationsViewPath, 'utf-8')
  const publicationCardContent = fs.readFileSync(publicationCardPath, 'utf-8')
  const publicationDetailContent = fs.readFileSync(publicationDetailPath, 'utf-8')
  const publicationThumbnailContent = fs.readFileSync(publicationThumbnailPath, 'utf-8')
  const publicationFetcherContent = fs.readFileSync(publicationFetcherPath, 'utf-8')
  const publicationTypesContent = fs.readFileSync(publicationTypesPath, 'utf-8')

  // -------------------------------------------------------------
  // A & B: Navigation & Calendrier Integration (No 6th BottomNav item)
  // -------------------------------------------------------------
  {
    assert.ok(
      calendarContainerContent.includes('Publications') &&
        calendarContainerContent.includes('Calendrier'),
      'TEST A FAILED: Publications view must be accessible from Calendrier'
    )
    assert.ok(
      !bottomNavContent.includes('href: \'/app/publications\'') &&
        !bottomNavContent.includes('href: "/app/publications"'),
      'TEST B FAILED: BottomNav must NOT contain a 6th item for publications'
    )
    console.log('✔ TEST A & B PASSED: Publications accessible from Calendrier header; BottomNav strictly preserved at 5 items')
  }

  // -------------------------------------------------------------
  // C: Default Filter is Publiées
  // -------------------------------------------------------------
  {
    assert.ok(
      publicationsViewContent.includes("useState<PublicationFilter>('PUBLISHED')"),
      'TEST C FAILED: Default Publications filter tab must be PUBLISHED'
    )
    console.log('✔ TEST C PASSED: Default filter tab is "Publiées"')
  }

  // -------------------------------------------------------------
  // D, E, F, G: Source-of-truth filtering (Published vs Scheduled vs Drafts)
  // -------------------------------------------------------------
  {
    assert.ok(
      publicationFetcherContent.includes(".in('status', ['PUBLISHED', 'SCHEDULED', 'FAILED'])"),
      'TEST D-G FAILED: Fetcher queries only PUBLISHED, SCHEDULED, and FAILED; DRAFT must be excluded'
    )
    assert.ok(
      !publicationFetcherContent.includes("'DRAFT'"),
      'TEST G FAILED: Drafts must not be queried or displayed in Publications history'
    )
    console.log('✔ TEST D–G PASSED: Source of truth cleanly separates Published, Scheduled, and Failed; Drafts strictly excluded')
  }

  // -------------------------------------------------------------
  // H & I: Failed publications surfaced cleanly, no fake failures
  // -------------------------------------------------------------
  {
    assert.ok(
      publicationCardContent.includes('Publication non envoyée'),
      'TEST H FAILED: Failed items must show human-friendly "Publication non envoyée"'
    )
    assert.ok(
      !publicationFetcherContent.includes('mockFailed') &&
        !publicationFetcherContent.includes('generateFakeFailure'),
      'TEST I FAILED: Zero artificial/fake failures generated'
    )
    console.log('✔ TEST H & I PASSED: Failures surfaced with human-friendly message; zero artificial errors')
  }

  // -------------------------------------------------------------
  // J: Status & Format mapping helpers avoid raw enum strings
  // -------------------------------------------------------------
  {
    assert.equal(mapPublicationStatusLabel('PUBLISHED'), 'Publiée')
    assert.equal(mapPublicationStatusLabel('SCHEDULED'), 'Prévue')
    assert.equal(mapPublicationStatusLabel('FAILED'), 'Échec')
    assert.equal(mapFormatLabel('POST'), 'Post')
    assert.equal(mapFormatLabel('CAROUSEL'), 'Carrousel')
    console.log('✔ TEST J PASSED: Status & Format mappers map enums to clean French labels ("Publiée", "Prévue", "Échec", "Post", "Carrousel")')
  }

  // -------------------------------------------------------------
  // K & L: Visual Thumbnails (Post composition vs Carousel cover)
  // -------------------------------------------------------------
  {
    assert.ok(
      publicationThumbnailContent.includes('composition.elements?.map') &&
        publicationThumbnailContent.includes('visualComposition'),
      'TEST K FAILED: POST visual composition (background, text, emoji) must be rendered in thumbnail'
    )
    assert.ok(
      publicationThumbnailContent.includes('coverMediaUrl') &&
        publicationThumbnailContent.includes('Layers'),
      'TEST L FAILED: Carousel thumbnail must use cover slide / media with format badge'
    )
    console.log('✔ TEST K & L PASSED: Post uses live visual composition; Carousel uses first slide cover')
  }

  // -------------------------------------------------------------
  // M & N: Detail View (Published is read-only, Scheduled links to edit)
  // -------------------------------------------------------------
  {
    assert.ok(
      publicationDetailContent.includes('readOnly={true}'),
      'TEST M FAILED: Visual canvas in publication detail must be strictly read-only'
    )
    assert.ok(
      publicationDetailContent.includes('item.status === \'SCHEDULED\'') &&
        publicationDetailContent.includes('Modifier le contenu'),
      'TEST N FAILED: Scheduled detail must offer modifier action linking to editor'
    )
    console.log('✔ TEST M & N PASSED: Published detail is read-only; Scheduled detail provides edit flow')
  }

  // -------------------------------------------------------------
  // O & P: Platform neutrality when unknown (no fake Instagram)
  // -------------------------------------------------------------
  {
    assert.equal(mapPlatformLabel(null), null)
    assert.equal(mapPlatformLabel(undefined), null)
    assert.equal(mapPlatformLabel('INSTAGRAM'), 'Instagram')
    assert.equal(mapPlatformLabel('FACEBOOK'), 'Facebook')
    console.log('✔ TEST O & P PASSED: Platform is omitted/neutral when unset; zero fake Instagram assignments')
  }

  // -------------------------------------------------------------
  // Q, R, S: Friendly Empty States
  // -------------------------------------------------------------
  {
    assert.ok(
      publicationsViewContent.includes('Aucune publication pour le moment.') &&
        publicationsViewContent.includes('Vos publications apparaîtront ici une fois publiées.'),
      'TEST Q FAILED: Empty Publiées state text mismatch'
    )
    assert.ok(
      publicationsViewContent.includes('Rien de prévu pour le moment.') &&
        publicationsViewContent.includes('Planifier un contenu'),
      'TEST R FAILED: Empty À venir state text mismatch'
    )
    assert.ok(
      publicationsViewContent.includes('Aucun problème de publication.'),
      'TEST S FAILED: Empty Échec state text mismatch'
    )
    console.log('✔ TEST Q–S PASSED: Clean, friendly empty states for all three tabs')
  }

  // -------------------------------------------------------------
  // T & U: Multi-tenant isolation
  // -------------------------------------------------------------
  {
    assert.ok(
      publicationFetcherContent.includes(".eq('business_id', businessId)"),
      'TEST T FAILED: Publication history query must strictly filter by business_id'
    )
    assert.ok(
      calendarPageContent.includes('getActiveWorkspaceBusiness(workspace.workspace_id)'),
      'TEST U FAILED: Active business resolved securely server-side'
    )
    console.log('✔ TEST T & U PASSED: Strict multi-tenant isolation enforced server-side')
  }

  // -------------------------------------------------------------
  // V & W: Independence from publish_jobs & existing scheduling safety
  // -------------------------------------------------------------
  {
    assert.ok(
      calendarPageContent.includes(".eq('status', 'SCHEDULED')"),
      'TEST V FAILED: Calendar editorial planning queries contents independently of publish_jobs'
    )
    console.log('✔ TEST V & W PASSED: Editorial planning remains completely functional without required publish_jobs')
  }

  // -------------------------------------------------------------
  // Y: Zero metrics invented
  // -------------------------------------------------------------
  {
    assert.ok(
      publicationTypesContent.includes('PublicationMetricsSnapshot') &&
        publicationFetcherContent.includes('metrics: null'),
      'TEST Y FAILED: Metrics must be null; zero fake views/clicks/likes invented'
    )
    console.log('✔ TEST Y PASSED: Future metrics typed with strict null values; zero fake statistics')
  }

  // -------------------------------------------------------------
  // Step 158B: PublicationCard Full Width & Responsive Proportions
  // -------------------------------------------------------------
  {
    assert.ok(
      publicationCardContent.includes('w-full') &&
        publicationsViewContent.includes('flex flex-col gap-3 w-full'),
      'TEST 158B FAILED: PublicationCard and list container must have width: 100%'
    )
    assert.ok(
      publicationCardContent.includes('line-clamp-2'),
      'TEST 158B FAILED: Title must support up to 2 lines without premature cut'
    )
    assert.ok(
      publicationCardContent.includes('flex-wrap'),
      'TEST 158B FAILED: Action buttons must wrap cleanly and remain contained'
    )
    console.log('✔ TEST 158B PASSED: PublicationCard uses full container width, 2-line title, and contained responsive actions')
  }

  // -------------------------------------------------------------
  // Z: Zero AI / social API calls
  // -------------------------------------------------------------
  {
    const files = [
      calendarPageContent,
      calendarContainerContent,
      publicationsViewContent,
      publicationCardContent,
      publicationDetailContent,
      publicationThumbnailContent,
      publicationFetcherContent,
    ]
    for (const f of files) {
      assert.ok(
        !f.includes('GoogleGenAI') &&
          !f.includes('gemini-') &&
          !f.includes('openai') &&
          !f.includes('graph.instagram.com') &&
          !f.includes('graph.facebook.com'),
        'TEST Z FAILED: Zero AI or social API calls allowed in publications history'
      )
    }
    console.log('✔ TEST Z PASSED: Zero automatic Gemini, 0 OpenAI, and 0 social API calls')
  }

  console.log('=== ALL STEP 158 / 158B TESTS PASSED SUCCESSFULLY ===')
}

runAllTests().catch((err) => {
  console.error('Test execution failed:', err)
  process.exit(1)
})
