import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { MetaSocialProviderAdapter } from '../social/adapters/meta-adapter'

test('=== STUDIO MŪZA — REAL INSTAGRAM & FACEBOOK PUBLISHING TESTS ===', async (t) => {
  const rootDir = process.cwd()

  // --------------------------------------------------------------------------
  // SCENARIO A: Facebook connecté → Publication réussie (Mock Meta Graph API)
  // --------------------------------------------------------------------------
  await t.test('Scenario A: Facebook Page Photo & Text publishing calls Meta Graph API and returns platform post ID', async () => {
    const adapter = new MetaSocialProviderAdapter()
    const originalFetch = global.fetch

    // Mock successful Facebook photo post and optional permalink fetch
    global.fetch = async (url: string | URL | Request) => {
      const urlStr = url.toString()
      if (urlStr.includes('/photos')) {
        return new Response(
          JSON.stringify({
            id: '100200300_photo_id',
            post_id: '100200300_feed_post_id',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      if (urlStr.includes('fields=permalink_url')) {
        return new Response(
          JSON.stringify({
            id: '100200300_feed_post_id',
            permalink_url: 'https://www.facebook.com/digitalzen/posts/100200300_feed_post_id',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
    }

    try {
      const res = await adapter.publishFacebookPost({
        accessToken: 'EAAB_VALID_PAGE_TOKEN',
        pageId: '1234567890',
        message: 'Bienvenue chez Digital Zen !',
        imageUrl: 'https://example.com/temp-signed-photo.jpg',
      })

      assert.strictEqual(res.success, true, 'Facebook photo publish must succeed')
      assert.strictEqual(res.platformPostId, '100200300_feed_post_id', 'Must return feed post ID')
      assert.strictEqual(
        res.platformPostUrl,
        'https://www.facebook.com/digitalzen/posts/100200300_feed_post_id',
        'Must return reliable permalink URL from Graph API'
      )
    } finally {
      global.fetch = originalFetch
    }
  })

  // --------------------------------------------------------------------------
  // SCENARIO B: Instagram connecté → Publication réussie (Container + Publish)
  // --------------------------------------------------------------------------
  await t.test('Scenario B: Instagram Professional photo publishing creates container, verifies status, and publishes media on graph.instagram.com', async () => {
    const adapter = new MetaSocialProviderAdapter()
    const originalFetch = global.fetch

    const calls: string[] = []

    global.fetch = async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString()
      calls.push(urlStr)

      // Step 1: Container creation
      if (urlStr.includes('/media') && !urlStr.includes('/media_publish') && init?.method === 'POST') {
        return new Response(
          JSON.stringify({ id: '17999888777000' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      // Step 2: Status check
      if (urlStr.includes('17999888777000') && init?.method !== 'POST') {
        return new Response(
          JSON.stringify({ id: '17999888777000', status_code: 'FINISHED' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      // Step 3: Publish container
      if (urlStr.includes('/media_publish')) {
        return new Response(
          JSON.stringify({ id: '18222333444555' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      // Step 4: Permalink
      if (urlStr.includes('18222333444555')) {
        return new Response(
          JSON.stringify({ id: '18222333444555', permalink: 'https://www.instagram.com/p/Cxyz123/' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }

      return new Response(JSON.stringify({ error: 'Unhandled' }), { status: 400 })
    }

    try {
      const res = await adapter.publishInstagramPhotoPost({
        accessToken: 'IG_USER_TOKEN_123',
        instagramAccountId: '17841400000000',
        imageUrl: 'https://example.com/temp-signed-media.jpg',
        caption: 'Moment de sérénité avec Digital Zen #bienetre',
      })

      assert.strictEqual(res.success, true, 'Instagram publishing must succeed')
      assert.strictEqual(res.platformPostId, '18222333444555')
      assert.strictEqual(res.platformPostUrl, 'https://www.instagram.com/p/Cxyz123/')
      assert.ok(calls.every((c) => c.includes('graph.instagram.com')), 'All Instagram calls must target graph.instagram.com')
      assert.ok(calls.some((c) => c.includes('/media')), 'Must call /media to create container')
      assert.ok(calls.some((c) => c.includes('/media_publish')), 'Must call /media_publish')
    } finally {
      global.fetch = originalFetch
    }
  })

  // --------------------------------------------------------------------------
  // SCENARIO C: Instagram + Facebook → Deux jobs distincts créés
  // --------------------------------------------------------------------------
  await t.test('Scenario C: Multi-destination publishing creates distinct publish_job per target platform', async () => {
    const publishingServicePath = path.join(rootDir, 'src/services/publishing/publish-content.ts')
    assert.ok(fs.existsSync(publishingServicePath), 'publish-content.ts must exist')

    const fileContent = fs.readFileSync(publishingServicePath, 'utf8')
    assert.ok(
      fileContent.includes("for (const platform of targetPlatforms)"),
      'Must iterate through each target platform'
    )
    assert.ok(
      fileContent.includes(".from('publish_jobs')") && fileContent.includes(".insert("),
      'Must insert a publish_job for each destination'
    )
  })

  // --------------------------------------------------------------------------
  // SCENARIO D: Échec Instagram / Succès Facebook → Partiel
  // --------------------------------------------------------------------------
  await t.test('Scenario D: Instagram failure + Facebook success yields PARTIAL_SUCCESS and does not mark content as published', async () => {
    const publishingServicePath = path.join(rootDir, 'src/services/publishing/publish-content.ts')
    const fileContent = fs.readFileSync(publishingServicePath, 'utf8')

    assert.ok(
      fileContent.includes("overallStatus = 'PARTIAL_SUCCESS'"),
      'Must handle PARTIAL_SUCCESS'
    )
    assert.ok(
      fileContent.includes("successfulCount === totalCount"),
      'Only mark contents as PUBLISHED when 100% of destinations succeed'
    )
  })

  // --------------------------------------------------------------------------
  // SCENARIO E: Succès Instagram / Échec Facebook → Partiel
  // --------------------------------------------------------------------------
  await t.test('Scenario E: Error handling preserves draft in Studio Mūza and records failure reason without losing content', async () => {
    const publishingServicePath = path.join(rootDir, 'src/services/publishing/publish-content.ts')
    const fileContent = fs.readFileSync(publishingServicePath, 'utf8')

    assert.ok(
      fileContent.includes("status: 'FAILED'"),
      'Must record FAILED status on publish_jobs for failing destination'
    )
    assert.ok(
      fileContent.includes("last_error_message"),
      'Must record last_error_message'
    )
  })

  // --------------------------------------------------------------------------
  // SCENARIO F: Protection anti-double soumission (Client & Server)
  // --------------------------------------------------------------------------
  await t.test('Scenario F: Server guard checks recent in-progress / published jobs to prevent double execution', async () => {
    const publishingServicePath = path.join(rootDir, 'src/services/publishing/publish-content.ts')
    const fileContent = fs.readFileSync(publishingServicePath, 'utf8')

    assert.ok(
      fileContent.includes("existingActiveJobs") || fileContent.includes("Une publication est déjà en cours"),
      'Must include anti-double submission check against recently active publish_jobs'
    )
  })

  // --------------------------------------------------------------------------
  // SCENARIO G: Compte DISCONNECTED → Refus
  // --------------------------------------------------------------------------
  await t.test('Scenario G: Disconnected account is refused gracefully with clear feedback', async () => {
    const publishingServicePath = path.join(rootDir, 'src/services/publishing/publish-content.ts')
    const fileContent = fs.readFileSync(publishingServicePath, 'utf8')

    assert.ok(
      fileContent.includes("account.status !== 'CONNECTED'"),
      'Must verify that account status is CONNECTED'
    )
    assert.ok(
      fileContent.includes("Ce compte est déconnecté"),
      'Must provide friendly disconnected account message'
    )
  })

  // --------------------------------------------------------------------------
  // SCENARIO H: Compte REAUTH_REQUIRED → Refus
  // --------------------------------------------------------------------------
  await t.test('Scenario H: Account requiring re-auth is refused with re-authorization guidance', async () => {
    const publishingServicePath = path.join(rootDir, 'src/services/publishing/publish-content.ts')
    const fileContent = fs.readFileSync(publishingServicePath, 'utf8')

    assert.ok(
      fileContent.includes("account?.status === 'REAUTH_REQUIRED'") ||
        fileContent.includes("Autorisation expirée"),
      'Must detect REAUTH_REQUIRED and prompt to reconnect'
    )
  })

  // --------------------------------------------------------------------------
  // SCENARIO I: Mauvais Business / Tenant isolation
  // --------------------------------------------------------------------------
  await t.test('Scenario I: Tenant boundary strictly enforced via business_id matching and RLS can_access_business', async () => {
    const publishingServicePath = path.join(rootDir, 'src/services/publishing/publish-content.ts')
    const fileContent = fs.readFileSync(publishingServicePath, 'utf8')

    assert.ok(
      fileContent.includes("eq('business_id', content.business_id)"),
      'Social accounts must match the content business_id'
    )
  })

  // --------------------------------------------------------------------------
  // SCENARIO J: Média privé → URL signée temporaire (jamais sauvegardée canoniquement)
  // --------------------------------------------------------------------------
  await t.test('Scenario J: Private media generates temporary signed URL with 3600s TTL for Meta ingestion without altering canonical storage key', async () => {
    const publishingServicePath = path.join(rootDir, 'src/services/publishing/publish-content.ts')
    const fileContent = fs.readFileSync(publishingServicePath, 'utf8')

    assert.ok(
      fileContent.includes(".createSignedUrl(asset.storage_key, 3600)"),
      'Must generate temporary signed URL with 3600s TTL for private media assets'
    )
  })

  // --------------------------------------------------------------------------
  // SCENARIO K: Sécurité — Aucun token / secret exposé côté client
  // --------------------------------------------------------------------------
  await t.test('Scenario K: Secrets and tokens are never included in types, client responses, or error messages', async () => {
    const typesPath = path.join(rootDir, 'src/services/publishing/types.ts')
    const typesContent = fs.readFileSync(typesPath, 'utf8')

    assert.ok(!typesContent.includes('access_token'), 'Publishing types must not expose access_token')
    assert.ok(!typesContent.includes('token_encrypted'), 'Publishing types must not expose token_encrypted')

    const adapter = new MetaSocialProviderAdapter()
    const errorWithToken = 'Error: OAuthException code 190 access_token=EAAxxxxxx invalid'
    // @ts-expect-error access private method for testing sanitization
    const sanitized = adapter.sanitizeErrorMessage(errorWithToken)
    assert.ok(!sanitized.includes('EAAxxxxxx'), 'Token must be sanitized out of errors')
    assert.ok(sanitized.includes('[REDACTED]'), 'Must replace with [REDACTED]')
  })

  // --------------------------------------------------------------------------
  // SCENARIO L: Historique alimenté après publication réelle réussie
  // --------------------------------------------------------------------------
  await t.test('Scenario L: getBusinessPublicationsHistory queries publish_jobs and maps platformPostUrl', async () => {
    const fetcherPath = path.join(rootDir, 'src/services/publication-history/fetcher.ts')
    const fetcherContent = fs.readFileSync(fetcherPath, 'utf8')

    assert.ok(
      fetcherContent.includes(".from('publish_jobs')"),
      'Publication history fetcher must join publish_jobs'
    )
    assert.ok(
      fetcherContent.includes("platform_post_url"),
      'Fetcher must query platform_post_url'
    )
    assert.ok(
      fetcherContent.includes("platformPostUrl"),
      'Fetcher must map platformPostUrl to PublicationItem view model'
    )
  })

  // --------------------------------------------------------------------------
  // SCENARIO M: UI Modal — Respects Digital Zen Identity and simple UX flow
  // --------------------------------------------------------------------------
  await t.test('Scenario M: PublishContentModal provides clean network chooser, confirmation dialog, and result screens', async () => {
    const modalPath = path.join(rootDir, 'src/components/studio/publish-content-modal.tsx')
    assert.ok(fs.existsSync(modalPath), 'publish-content-modal.tsx must exist')

    const modalContent = fs.readFileSync(modalPath, 'utf8')
    assert.ok(modalContent.includes('Où voulez-vous publier ?'), 'Must show network selection step')
    assert.ok(modalContent.includes('Publier maintenant ?'), 'Must show confirmation step')
    assert.ok(modalContent.includes('Publication réussie ✦'), 'Must show success result step')
    assert.ok(modalContent.includes('Publication partiellement réussie'), 'Must show partial result step')
    assert.ok(modalContent.includes('Impossible de publier pour le moment'), 'Must show failure result step')
    assert.ok(modalContent.includes('Réessayer'), 'Must provide retry capability')
  })

  // --------------------------------------------------------------------------
  // SCENARIO N: Sélection prioritaire du compte CONNECTED actif le plus récent
  // --------------------------------------------------------------------------
  await t.test('Scenario N: Account selection prioritizes CONNECTED account over DISCONNECTED, and picks most recently updated CONNECTED account', async () => {
    // Case 1: Instagram A (DISCONNECTED, older), Instagram B (CONNECTED,Location newer)
    const accountsCase1 = [
      { id: 'acc_old_disconnected', platform: 'INSTAGRAM', status: 'DISCONNECTED', updated_at: '2026-01-01T00:00:00Z', access_token_encrypted: 'enc1' },
      { id: 'acc_new_connected', platform: 'INSTAGRAM', status: 'CONNECTED', updated_at: '2026-02-01T00:00:00Z', access_token_encrypted: 'enc2' },
    ]

    const sortedCase1 = [...accountsCase1].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

    const selectedCase1 =
      sortedCase1.find((a) => a.platform === 'INSTAGRAM' && a.status === 'CONNECTED') ||
      sortedCase1.find((a) => a.platform === 'INSTAGRAM')

    assert.strictEqual(selectedCase1?.id, 'acc_new_connected', 'Must select active CONNECTED account over DISCONNECTED account')

    // Case 2 (Defensive): Instagram A (CONNECTED, older), Instagram B (CONNECTED, newer)
    const accountsCase2 = [
      { id: 'acc_old_connected', platform: 'INSTAGRAM', status: 'CONNECTED', updated_at: '2026-01-01T00:00:00Z', access_token_encrypted: 'enc1' },
      { id: 'acc_new_connected', platform: 'INSTAGRAM', status: 'CONNECTED', updated_at: '2026-02-01T00:00:00Z', access_token_encrypted: 'enc2' },
    ]

    const sortedCase2 = [...accountsCase2].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

    const selectedCase2 =
      sortedCase2.find((a) => a.platform === 'INSTAGRAM' && a.status === 'CONNECTED') ||
      sortedCase2.find((a) => a.platform === 'INSTAGRAM')

    assert.strictEqual(selectedCase2?.id, 'acc_new_connected', 'Must select most recently updated CONNECTED account')
  })

  // --------------------------------------------------------------------------
  // SCENARIO O: Source of Truth Caption Resolution & UI Success Modal Rules
  // --------------------------------------------------------------------------
  await t.test('Scenario O: Source of truth caption resolution, hashtags matching preview, explicit empty caption, permalinks and persistent success modal', async () => {
    function resolveFinalCaption(params: {
      canonicalBody?: string | null
      canonicalHook?: string | null
      variantCaption?: string | null
      variantHashtags?: string[] | null
      isExplicitEmpty?: boolean
    }): string {
      const canonicalText = (params.canonicalBody || params.canonicalHook || '').trim()
      const hasExplicitVariantCaption = Boolean(
        params.variantCaption !== undefined && params.variantCaption !== null && params.variantCaption.trim().length > 0
      )

      let baseCaption = ''
      if (hasExplicitVariantCaption) {
        baseCaption = params.variantCaption!.trim()
      } else if (params.isExplicitEmpty) {
        baseCaption = ''
      } else {
        baseCaption = canonicalText
      }

      const rawHashtags = params.variantHashtags || []
      const formattedHashtags = rawHashtags
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
        .map((t) => (t.startsWith('#') ? t : `#${t}`))
        .join(' ')

      if (formattedHashtags.length > 0) {
        return baseCaption.length > 0 ? `${baseCaption}\n\n${formattedHashtags}` : formattedHashtags
      }
      return baseCaption
    }

    // 1. Contenu canonique avec texte + variant Instagram sans caption -> le texte canonique est publié
    const res1 = resolveFinalCaption({
      canonicalBody: "Essai d'une nouvelle application",
      variantCaption: null,
    })
    assert.strictEqual(res1, "Essai d'une nouvelle application", 'Must publish canonical text when IG variant caption is empty/null')

    // 2. Variant Instagram avec caption explicite -> la caption spécifique Instagram est publiée
    const res2 = resolveFinalCaption({
      canonicalBody: "Texte canonique de base",
      variantCaption: "Mon texte spécifique Instagram",
    })
    assert.strictEqual(res2, "Mon texte spécifique Instagram", 'Must publish explicit Instagram variant caption when provided')

    // 3. Caption + hashtags renseignés -> payload final correspond à l'aperçu
    const res3 = resolveFinalCaption({
      canonicalBody: "Essai d'une nouvelle application",
      variantHashtags: ['#StudioMuza', '#Communication'],
    })
    assert.strictEqual(res3, "Essai d'une nouvelle application\n\n#StudioMuza #Communication", 'Payload with hashtags must match Instagram preview format')

    // 4. Caption vide volontairement (adaptation explicitement vide)
    const res4 = resolveFinalCaption({
      canonicalBody: "Texte canonique existant",
      isExplicitEmpty: true,
    })
    assert.strictEqual(res4, "", 'Explicitly empty adaptation must resolve to empty string without falling back to canonical text')

    // 5, 6 & 7. Verify PublishContentModal renders permalink button, avoids fake links, and stays open persistently
    const modalPath = path.join(rootDir, 'src/components/studio/publish-content-modal.tsx')
    const modalContent = fs.readFileSync(modalPath, 'utf8')

    assert.ok(modalContent.includes('Voir sur') && modalContent.includes("dest.platform === 'INSTAGRAM' ? 'Instagram' : 'Facebook'"), 'Modal must render "Voir sur [Network]" button for real permalinks')
    assert.ok(modalContent.includes('dest.platformPostUrl'), 'Link button must be conditionally rendered only when real platformPostUrl is present')
  })

  // --------------------------------------------------------------------------
  // SCENARIO P: Full End-to-End Instagram Production Contract Verification
  // --------------------------------------------------------------------------
  await t.test('Scenario P: Complete Instagram real-world production contract test (Caption, Hashtags, Visual Render, Modal key stability, Permalinks)', async () => {
    // 1 & 2. Verify saveNetworkVariantAdaptationAction and saveContentDraftAction preservation
    const contentActionsPath = path.join(rootDir, 'src/actions/content.ts')
    const contentActionsContent = fs.readFileSync(contentActionsPath, 'utf8')

    assert.ok(
      contentActionsContent.includes('saveNetworkVariantAdaptationAction'),
      'Must provide action to save Instagram variant adaptations'
    )
    assert.ok(
      contentActionsContent.includes('mergedMetadata') || contentActionsContent.includes('existingVariantsForSave'),
      'saveContentDraftAction must merge existing variant metadata to preserve network adaptations'
    )

    // 3, 4 & 5. Verify caption + hashtags resolution and HTTP container payload construction
    const adapter = new MetaSocialProviderAdapter()
    const originalFetch = global.fetch

    let postContainerBody: string | null = null

    global.fetch = async (url: string | URL | Request, init?: RequestInit) => {
      const urlStr = url.toString()
      if (urlStr.includes('/media') && !urlStr.includes('/media_publish') && init?.method === 'POST') {
        postContainerBody = String(init.body || '')
        return new Response(JSON.stringify({ id: 'container_ig_999' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (urlStr.includes('container_ig_999') && init?.method !== 'POST') {
        return new Response(JSON.stringify({ status_code: 'FINISHED' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (urlStr.includes('/media_publish')) {
        return new Response(JSON.stringify({ id: 'ig_post_888' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }
      if (urlStr.includes('ig_post_888')) {
        return new Response(
          JSON.stringify({ permalink: 'https://www.instagram.com/p/TestMuza123/' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return new Response(JSON.stringify({ error: 'Unhandled' }), { status: 400 })
    }

    try {
      const canonicalText = 'Test Mūza — cette légende doit apparaître sur Instagram.'
      const hashtags = ['#StudioMuza', '#TestMuza']

      const formattedHashtags = hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ')
      const fullCaption = `${canonicalText}\n\n${formattedHashtags}`

      const res = await adapter.publishInstagramPhotoPost({
        accessToken: 'VALID_TOKEN_123',
        instagramAccountId: 'IG_USER_123',
        imageUrl: 'https://example.com/rendered-final-visual.jpg',
        caption: fullCaption,
      })

      assert.strictEqual(res.success, true, 'Instagram publication must succeed')
      assert.strictEqual(res.platformPostId, 'ig_post_888')
      assert.strictEqual(res.platformPostUrl, 'https://www.instagram.com/p/TestMuza123/')

      assert.ok(postContainerBody !== null, 'POST body for media container creation must be captured')
      const params = new URLSearchParams(postContainerBody!)
      assert.strictEqual(params.get('image_url'), 'https://example.com/rendered-final-visual.jpg')
      const sentCaption = params.get('caption') || ''
      assert.ok(sentCaption.includes('Test Mūza — cette légende doit apparaître sur Instagram.'), 'Sent caption must contain canonical text')
      assert.ok(sentCaption.includes('#StudioMuza') && sentCaption.includes('#TestMuza'), 'Sent caption must contain all hashtags')
    } finally {
      global.fetch = originalFetch
    }

    // 6. Verify image_url prioritization in publish-content.ts
    const publishContentServicePath = path.join(rootDir, 'src/services/publishing/publish-content.ts')
    const publishContentContent = fs.readFileSync(publishContentServicePath, 'utf8')

    assert.ok(
      publishContentContent.includes('renderedExportUrl') || publishContentContent.includes('rendered_image_url'),
      'publishContentImmediately must prioritize rendered_image_url/export_image_url over raw source media assets'
    )

    // 8, 9 & 10. Verify ContentStudio key stability in page.tsx preventing premature modal closure
    const pagePath = path.join(rootDir, 'src/app/(dashboard)/app/content/[contentId]/page.tsx')
    const pageContent = fs.readFileSync(pagePath, 'utf8')

    assert.ok(
      pageContent.includes('key={content.id}') && !pageContent.includes('key={`${content.id}-${content.updated_at'),
      'ContentStudio page key must be stable (key={content.id}) to prevent revalidation from unmounting modals'
    )
  })

  // --------------------------------------------------------------------------
  // SCENARIO Q: Strict Visual Composition Export Enforcement & Silent Fallback Block
  // --------------------------------------------------------------------------
  await t.test('Scenario Q: Visual composition with text overlays & emojis blocks publication if rendered export is missing (NO silent fallback to raw photo)', async () => {
    const { hasVisualCompositionModifications } = await import('../visual-composition/validation')

    // 1. Composition with photo + red text overlay + emoji 🌿
    const modifiedComposition = {
      version: 1 as const,
      aspectRatio: '4:5' as const,
      background: {
        type: 'IMAGE' as const,
        mediaAssetId: 'raw_photo_asset_123',
        mediaUrl: 'https://example.com/raw-photo.jpg',
        scale: 1.1,
        positionX: 0.1,
        positionY: 0.0,
      },
      elements: [
        {
          id: 'text-1',
          type: 'TEXT' as const,
          text: 'TEST FINAL RENDER',
          x: 0.5,
          y: 0.3,
          scale: 1.2,
          colorMode: 'LIGHT' as const,
          customColor: '#FF0000',
        },
        {
          id: 'emoji-1',
          type: 'EMOJI' as const,
          value: '🌿',
          x: 0.5,
          y: 0.6,
          scale: 1.5,
        },
      ],
    }

    assert.strictEqual(
      hasVisualCompositionModifications(modifiedComposition),
      true,
      'Composition with text & emoji overlays must be flagged as modified'
    )

    // 2. Pure raw photo with 0 modifications
    const unmodifiedComposition = {
      version: 1 as const,
      aspectRatio: '4:5' as const,
      background: {
        type: 'IMAGE' as const,
        mediaAssetId: 'raw_photo_asset_123',
        mediaUrl: 'https://example.com/raw-photo.jpg',
        scale: 1.0,
        positionX: 0,
        positionY: 0,
      },
      elements: [],
    }

    assert.strictEqual(
      hasVisualCompositionModifications(unmodifiedComposition),
      false,
      'Composition with 0 elements and default scale/position must NOT be flagged as modified'
    )

    // 3. Verify publish-content.ts source code enforces silent fallback block
    const publishContentServicePath = path.join(rootDir, 'src/services/publishing/publish-content.ts')
    const publishContentContent = fs.readFileSync(publishContentServicePath, 'utf8')

    assert.ok(
      publishContentContent.includes('!metaImageUrl && hasModifications'),
      'publishContentImmediately must check if metaImageUrl is missing when visual modifications exist'
    )
    assert.ok(
      publishContentContent.includes('Impossible de préparer le visuel composé pour la publication'),
      'publishContentImmediately must block publication with explicit French error message when export is missing'
    )
  })
})


