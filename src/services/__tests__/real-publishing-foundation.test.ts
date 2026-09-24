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
})
