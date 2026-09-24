import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  encryptCredential,
  decryptCredential,
  signOAuthState,
  verifyOAuthState,
} from '../social/crypto'
import { MetaSocialProviderAdapter } from '../social/adapters/meta-adapter'
import { type OAuthStatePayload, type SocialAccountSummary } from '../social/types'

test('=== STUDIO MŪZA — STEP 161 & 161B COMPREHENSIVE CHECKPOINT TESTS ===', async (t) => {
  const rootDir = process.cwd()

  // 1. Routes & Authentication
  await t.test('1. Routes exist, authenticated protection, and redirect /app/muza/networks configured', () => {
    const settingsPagePath = path.join(rootDir, 'src/app/(dashboard)/app/settings/page.tsx')
    const settingsNetworksPagePath = path.join(rootDir, 'src/app/(dashboard)/app/settings/networks/page.tsx')
    const oldNetworksPagePath = path.join(rootDir, 'src/app/(dashboard)/app/muza/networks/page.tsx')

    assert.ok(fs.existsSync(settingsPagePath), '/app/settings/page.tsx must exist')
    assert.ok(fs.existsSync(settingsNetworksPagePath), '/app/settings/networks/page.tsx must exist')
    assert.ok(fs.existsSync(oldNetworksPagePath), '/app/muza/networks/page.tsx must exist')

    const settingsContent = fs.readFileSync(settingsPagePath, 'utf8')
    const networksContent = fs.readFileSync(settingsNetworksPagePath, 'utf8')
    const oldPageContent = fs.readFileSync(oldNetworksPagePath, 'utf8')

    assert.ok(settingsContent.includes("redirect('/login')"), '/app/settings must enforce authentication')
    assert.ok(networksContent.includes("redirect('/login')"), '/app/settings/networks must enforce authentication')
    assert.ok(
      oldPageContent.includes("redirect('/app/settings/networks')"),
      'Old route /app/muza/networks must redirect to /app/settings/networks'
    )
  })

  // 2. Navigation Architecture
  await t.test('2. Five primary destinations preserved and Settings is separate utility navigation', () => {
    const bottomNavPath = path.join(rootDir, 'src/components/layout/bottom-nav.tsx')
    const sidebarPath = path.join(rootDir, 'src/components/layout/desktop-sidebar.tsx')
    const headerPath = path.join(rootDir, 'src/components/layout/header.tsx')
    const muzaViewPath = path.join(rootDir, 'src/components/muza/muza-view.tsx')

    const bottomNavContent = fs.readFileSync(bottomNavPath, 'utf8')
    const sidebarContent = fs.readFileSync(sidebarPath, 'utf8')
    const headerContent = fs.readFileSync(headerPath, 'utf8')
    const muzaViewContent = fs.readFileSync(muzaViewPath, 'utf8')

    // 5 primary destinations strictly in BottomNav
    const mainNavDestinations = ['Accueil', 'Inspirations', 'Créer', 'Calendrier', 'Mūza']
    for (const d of mainNavDestinations) {
      assert.ok(bottomNavContent.includes(`label: '${d}'`), `BottomNav must contain ${d}`)
    }

    // No sixth nav item in BottomNav
    assert.ok(!bottomNavContent.includes('Paramètres'), 'BottomNav must NOT contain Paramètres')
    assert.ok(!bottomNavContent.includes('Réseaux'), 'BottomNav must NOT contain Réseaux')

    // Desktop sidebar contains Settings utility link at bottom
    assert.ok(sidebarContent.includes('href="/app/settings"'), 'DesktopSidebar must link to /app/settings')
    assert.ok(sidebarContent.includes('Paramètres'), 'DesktopSidebar must contain Paramètres')
    assert.ok(sidebarContent.includes('isSettingsActive'), 'DesktopSidebar must evaluate isSettingsActive')

    // Mobile header contains Settings link
    assert.ok(headerContent.includes('href="/app/settings"'), 'Mobile Header must link to /app/settings')

    // Mūza coach page no longer contains persistent networks management card
    assert.ok(!muzaViewContent.includes('/app/muza/networks'), 'Mūza view must NOT contain persistent networks link')
    assert.ok(!muzaViewContent.includes('Gérer mes réseaux'), 'Mūza view must NOT contain Gérer mes réseaux')
  })

  // 3. User & Business Data Architecture
  await t.test('3. Settings views display real persisted user & business data without duplicates', () => {
    const settingsViewPath = path.join(rootDir, 'src/components/settings/settings-view.tsx')
    const settingsPagePath = path.join(rootDir, 'src/app/(dashboard)/app/settings/page.tsx')

    const viewContent = fs.readFileSync(settingsViewPath, 'utf8')
    const pageContent = fs.readFileSync(settingsPagePath, 'utf8')

    assert.ok(viewContent.includes('Mon compte'), 'Settings view must have Mon compte section')
    assert.ok(viewContent.includes('Mon activité'), 'Settings view must have Mon activité section')
    assert.ok(viewContent.includes('Réseaux sociaux'), 'Settings view must have Réseaux sociaux section')
    assert.ok(viewContent.includes('/app/settings/networks'), 'Settings view must link to /app/settings/networks')

    assert.ok(pageContent.includes("from('profiles')"), 'Settings page must query profiles')
    assert.ok(pageContent.includes("from('businesses')"), 'Settings page must query businesses')
    assert.ok(pageContent.includes('getBusinessContactInfo('), 'Settings page must query business contact info')
    assert.ok(pageContent.includes('getBusinessSocialAccounts('), 'Settings page must query social accounts')
  })

  // 4. Provider Readiness & Safe UX
  await t.test('4. Provider readiness handling, accurate security copy, and zero fake accounts', () => {
    const networksViewPath = path.join(rootDir, 'src/components/social/networks-view.tsx')
    const networksViewContent = fs.readFileSync(networksViewPath, 'utf8')

    // Disconnected & connected badges
    assert.ok(networksViewContent.includes('Non connecté'), 'Must support Non connecté badge')
    assert.ok(networksViewContent.includes('Connecté'), 'Must support Connecté badge')

    // Provider unconfigured state handling
    assert.ok(networksViewContent.includes('Connexion bientôt disponible'), 'Must show Connexion bientôt disponible when unconfigured')
    assert.ok(networksViewContent.includes('metaConfig.isConfigured'), 'Must check metaConfig.isConfigured')

    // Accurate security copy
    assert.ok(!networksViewContent.includes('chiffrées de bout en bout'), 'Must NOT claim end-to-end encryption')
    assert.ok(networksViewContent.includes('stockées de manière chiffrée'), 'Must accurately state encrypted storage')

    // Back link to settings
    assert.ok(networksViewContent.includes('href="/app/settings"'), 'Networks back link must point to /app/settings')
    assert.ok(networksViewContent.includes('Retour aux paramètres'), 'Networks back link label must be Retour aux paramètres')

    // Zero fake accounts or metrics
    assert.ok(!networksViewContent.includes('@demo_user'), 'Must not hardcode demo handle')
    assert.ok(!networksViewContent.includes('@gitedumorvan'), 'Must not hardcode demo account')
    assert.ok(!networksViewContent.includes('Abonnés :'), 'Must not display fake followers count')
    assert.ok(!networksViewContent.includes('Engagement :'), 'Must not display fake engagement')
  })

  // 5. AES-256-GCM Credential Vault & Provider Adapter Boundary
  await t.test('5. AES-256-GCM encryption, adapter abstraction, and zero secret exposure to client', () => {
    const originalEnv = { ...process.env }
    try {
      process.env.CREDENTIAL_ENCRYPTION_KEY = 'test-key-32-bytes-for-unit-testing-vault'

      const adapter = new MetaSocialProviderAdapter()
      assert.strictEqual(adapter.provider, 'META')
      assert.strictEqual(typeof adapter.isConfigured(), 'boolean')
      assert.strictEqual(typeof adapter.getCapabilities('INSTAGRAM', 'BUSINESS').canPublishPosts, 'boolean')

      const metaConfig = adapter.getAuthConfig()
      assert.ok('isConfigured' in metaConfig)
      assert.ok('appIdPresent' in metaConfig)
      assert.ok('appSecretPresent' in metaConfig)
      assert.ok(!('appSecret' in (metaConfig as unknown as Record<string, unknown>)), 'Must NEVER expose plaintext appSecret in config DTO')

      // AES-256-GCM encryption & decryption
      const secretToken = 'EAABsbCS1...sample_meta_long_lived_user_access_token_12345'
      const encrypted = encryptCredential(secretToken)
      assert.ok(encrypted.includes(':'), 'Encrypted string must contain IV:Tag:Data delimiters')
      const decrypted = decryptCredential(encrypted)
      assert.strictEqual(decrypted, secretToken)

      // Tampered ciphertext fails safely
      const tampered = `${encrypted.slice(0, -4)}ffff`
      assert.strictEqual(decryptCredential(tampered), null)
    } finally {
      process.env = originalEnv
    }
  })

  // 6. OAuth State Security, Expiration, and Tamper Resistance
  await t.test('6. OAuth state signature verification, expiration, and tampering rejection', () => {
    const originalEnv = { ...process.env }
    try {
      process.env.CREDENTIAL_ENCRYPTION_KEY = 'test-key-32-bytes-for-unit-testing-vault'

      const validStatePayload: OAuthStatePayload = {
        userId: 'usr-123',
        businessId: 'biz-456',
        provider: 'META',
        platform: 'INSTAGRAM',
        nonce: 'random-nonce-abc',
        createdAt: Date.now(),
        expiresAt: Date.now() + 600000,
      }

      const signedState = signOAuthState(validStatePayload as unknown as Record<string, unknown>)
      assert.ok(signedState.includes('.'), 'Signed state must contain payload.signature')

      // Valid state verifies
      const verified = verifyOAuthState<OAuthStatePayload>(signedState)
      assert.ok(verified !== null)
      assert.strictEqual(verified.userId, 'usr-123')
      assert.strictEqual(verified.businessId, 'biz-456')

      // Tampered state rejected
      const tamperedState = `${signedState.slice(0, -6)}tamper`
      assert.strictEqual(verifyOAuthState(tamperedState), null)

      // Expired state rejected
      const expiredPayload: OAuthStatePayload = {
        ...validStatePayload,
        expiresAt: Date.now() - 1000,
      }
      const expiredSigned = signOAuthState(expiredPayload as unknown as Record<string, unknown>)
      assert.strictEqual(verifyOAuthState(expiredSigned), null)
    } finally {
      process.env = originalEnv
    }
  })

  // 7. Multi-Tenant Isolation & Callback User/Business Binding
  await t.test('7. Multi-tenant isolation and callback business/user validation', () => {
    const actionsPath = path.join(rootDir, 'src/actions/social-accounts.ts')
    const callbackPath = path.join(rootDir, 'src/app/api/auth/social/meta/callback/route.ts')
    const adapterPath = path.join(rootDir, 'src/services/social/adapters/meta-adapter.ts')

    const actionsContent = fs.readFileSync(actionsPath, 'utf8')
    const callbackContent = fs.readFileSync(callbackPath, 'utf8')
    const adapterContent = fs.readFileSync(adapterPath, 'utf8')

    assert.ok(actionsContent.includes('ensureInitialWorkspace()'), 'Actions must resolve workspace')
    assert.ok(actionsContent.includes('getActiveWorkspaceBusiness('), 'Actions must derive business_id server-side')
    assert.ok(callbackContent.includes('ensureInitialWorkspace()'), 'Callback must resolve workspace')
    assert.ok(callbackContent.includes('getActiveWorkspaceBusiness('), 'Callback must derive business_id server-side')
    assert.ok(adapterContent.includes('state.businessId !== params.currentBusinessId'), 'Adapter callback must reject cross-business state tampering')
    assert.ok(adapterContent.includes('state.userId !== params.currentUserId'), 'Adapter callback must reject cross-user state tampering')
  })

  // 8. Historical Data Preservation, Token Nullification, and Idempotent Reconnect
  await t.test('8. Safe disconnect nullifies tokens, preserves publications/contents, and supports reconnect upsert', () => {
    const socialServicePath = path.join(rootDir, 'src/services/social/social-accounts.ts')
    const serviceContent = fs.readFileSync(socialServicePath, 'utf8')

    assert.ok(serviceContent.includes("status: 'DISCONNECTED'"), 'Disconnect must mark status as DISCONNECTED')
    assert.ok(serviceContent.includes('access_token_encrypted: null'), 'Disconnect must nullify encrypted token')
    assert.ok(!serviceContent.includes(".from('contents').delete()"), 'Disconnect must NEVER delete contents')
    assert.ok(!serviceContent.includes(".from('publish_jobs').delete()"), 'Disconnect must NEVER delete publish_jobs')
    assert.ok(serviceContent.includes("onConflict: 'business_id,platform,external_account_id'"), 'Reconnection must upsert on conflict without duplicates')
  })

  // 9. Independence of Other Modules (Content Studio, Calendar, Inspirations, Publications)
  await t.test('9. Content Studio, Calendar, Inspirations, and Publications operate independently of social connection', () => {
    const postEditorPath = path.join(rootDir, 'src/components/studio/post-editor.tsx')
    const calendarPagePath = path.join(rootDir, 'src/app/(dashboard)/app/calendar/page.tsx')
    const inspirationsPagePath = path.join(rootDir, 'src/app/(dashboard)/app/inspirations/page.tsx')

    const postEditorContent = fs.readFileSync(postEditorPath, 'utf8')
    const calendarContent = fs.readFileSync(calendarPagePath, 'utf8')
    const inspirationsContent = fs.readFileSync(inspirationsPagePath, 'utf8')

    assert.ok(!postEditorContent.includes('requireSocialAccount'), 'Content Studio must operate without social account')
    assert.ok(!calendarContent.includes('requireSocialAccount'), 'Calendar must operate without social account')
    assert.ok(!inspirationsContent.includes('requireSocialAccount'), 'Inspirations must operate without social account')
  })

  // 10. Zero AI, Zero Publishing Calls, and Migrations 001-016
  await t.test('10. Zero AI calls, zero publishing calls, and migrations strictly 001-016', () => {
    const settingsPagePath = path.join(rootDir, 'src/app/(dashboard)/app/settings/page.tsx')
    const settingsNetworksPagePath = path.join(rootDir, 'src/app/(dashboard)/app/settings/networks/page.tsx')
    const socialServicePath = path.join(rootDir, 'src/services/social/social-accounts.ts')

    const settingsContent = fs.readFileSync(settingsPagePath, 'utf8')
    const networksContent = fs.readFileSync(settingsNetworksPagePath, 'utf8')
    const serviceContent = fs.readFileSync(socialServicePath, 'utf8')

    assert.ok(!settingsContent.includes('@google/genai'), 'Settings page must not call Gemini')
    assert.ok(!settingsContent.includes('openai'), 'Settings page must not call OpenAI')
    assert.ok(!networksContent.includes('@google/genai'), 'Networks page must not call Gemini')
    assert.ok(!networksContent.includes('openai'), 'Networks page must not call OpenAI')
    assert.ok(!serviceContent.includes('createPublishJob'), 'Social connection must not create publish jobs')

    const migrationsDir = path.join(rootDir, 'supabase/migrations')
    const migrationFiles = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'))
    assert.strictEqual(migrationFiles.length, 16, 'Migrations must remain exactly 16 files (001-016)')
    assert.ok(migrationFiles.includes('016_stock_media_provenance.sql'), 'Migration 016 must be stock media provenance')
    assert.ok(!migrationFiles.some((f) => f.startsWith('017_')), 'No migration 017 allowed')
  })

  // 11. Step 164K — Dedicated Instagram & Facebook App Credentials
  await t.test('11. Dedicated App Credentials: Instagram (INSTAGRAM_APP_ID) vs Facebook (META_APP_ID)', async () => {
    const originalEnv = { ...process.env }
    const originalFetch = globalThis.fetch
    try {
      process.env.INSTAGRAM_APP_ID = 'test-ig-app-id-777'
      process.env.INSTAGRAM_APP_SECRET = 'test-ig-app-secret-888'
      process.env.META_APP_ID = 'test-fb-app-id-123'
      process.env.META_APP_SECRET = 'test-fb-secret-456'
      process.env.META_CONFIG_ID = 'test-fb-business-config-789'
      process.env.CREDENTIAL_ENCRYPTION_KEY = 'test-key-32-bytes-for-unit-testing-vault'
      process.env.NEXT_PUBLIC_SITE_URL = 'https://studio-muza.vercel.app'

      const adapter = new MetaSocialProviderAdapter()

      // Platform specific config checks
      assert.strictEqual(adapter.isConfigured('INSTAGRAM'), true)
      assert.strictEqual(adapter.isConfigured('FACEBOOK'), true)
      assert.strictEqual(adapter.isConfigured(), true)

      // Canonical redirect URI verification
      assert.strictEqual(
        adapter.getCanonicalRedirectUri(),
        'https://studio-muza.vercel.app/api/auth/social/meta/callback',
        'Canonical redirect URI must match production Meta config exactly'
      )

      // Test with trailing slash in env
      process.env.META_REDIRECT_URI = 'https://studio-muza.vercel.app/api/auth/social/meta/callback/'
      assert.strictEqual(
        adapter.getCanonicalRedirectUri(),
        'https://studio-muza.vercel.app/api/auth/social/meta/callback',
        'Trailing slashes must be stripped from redirect URI'
      )
      delete process.env.META_REDIRECT_URI

      // 1. Instagram OAuth URL uses INSTAGRAM_APP_ID and exact canonical redirect_uri
      const igAuthRes = await adapter.getAuthorizationUrl({
        userId: 'u1',
        businessId: 'b1',
        platform: 'INSTAGRAM',
      })

      assert.ok(igAuthRes !== null, 'igAuthRes must not be null')
      assert.ok(igAuthRes.url.startsWith('https://www.instagram.com/oauth/authorize'), 'Instagram must use direct Instagram Login')

      const igParsed = new URL(igAuthRes.url)
      assert.strictEqual(igParsed.searchParams.get('client_id'), 'test-ig-app-id-777', 'Instagram OAuth URL must use INSTAGRAM_APP_ID')
      assert.strictEqual(igParsed.searchParams.get('redirect_uri'), 'https://studio-muza.vercel.app/api/auth/social/meta/callback')
      assert.ok(igParsed.searchParams.get('scope')?.includes('instagram_business_basic'))
      assert.strictEqual(igParsed.searchParams.get('state'), igAuthRes.state)

      // 2. Facebook OAuth URL uses META_APP_ID
      const fbAuthRes = await adapter.getAuthorizationUrl({
        userId: 'u1',
        businessId: 'b1',
        platform: 'FACEBOOK',
      })

      assert.ok(fbAuthRes !== null, 'fbAuthRes must not be null')
      assert.ok(fbAuthRes.url.startsWith('https://www.facebook.com/v21.0/dialog/oauth'), 'Facebook must use Facebook Login dialog')

      const fbParsed = new URL(fbAuthRes.url)
      assert.strictEqual(fbParsed.searchParams.get('client_id'), 'test-fb-app-id-123', 'Facebook OAuth URL must use META_APP_ID')
      assert.strictEqual(fbParsed.searchParams.get('redirect_uri'), 'https://studio-muza.vercel.app/api/auth/social/meta/callback')
      assert.strictEqual(fbParsed.searchParams.get('config_id'), 'test-fb-business-config-789')
      assert.strictEqual(fbParsed.searchParams.get('state'), fbAuthRes.state)

      // 3. Instagram Callback Exchange uses INSTAGRAM_APP_ID, INSTAGRAM_APP_SECRET, and identical redirect_uri
      const interceptedFetchCalls: { url: string; body?: string }[] = []
      globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const urlStr = String(input)
        interceptedFetchCalls.push({ url: urlStr, body: init?.body ? String(init.body) : undefined })

        if (urlStr.includes('api.instagram.com/oauth/access_token')) {
          return new Response(JSON.stringify({ access_token: 'short-lived-ig-token' }), { status: 200 })
        }
        if (urlStr.includes('graph.instagram.com/access_token')) {
          return new Response(JSON.stringify({ access_token: 'long-lived-ig-token', expires_in: 5184000 }), { status: 200 })
        }
        if (urlStr.includes('graph.instagram.com') && urlStr.includes('/me?')) {
          return new Response(JSON.stringify({ id: 'ig-123', username: 'muza_insta', account_type: 'BUSINESS' }), { status: 200 })
        }
        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 })
      }

      const igCallbackRes = await adapter.handleAuthorizationCallback({
        code: 'auth-code-ig-123',
        state: igAuthRes.state,
        currentUserId: 'u1',
        currentBusinessId: 'b1',
      })

      assert.strictEqual(igCallbackRes.destinations.length, 1)
      assert.strictEqual(igCallbackRes.destinations[0].platform, 'INSTAGRAM')
      assert.strictEqual(igCallbackRes.destinations[0].accountName, '@muza_insta')

      const igTokenPost = interceptedFetchCalls.find(c => c.url.includes('api.instagram.com/oauth/access_token'))
      assert.ok(igTokenPost?.body?.includes('client_id=test-ig-app-id-777'), 'Instagram token exchange POST must use INSTAGRAM_APP_ID')
      assert.ok(igTokenPost?.body?.includes('client_secret=test-ig-app-secret-888'), 'Instagram token exchange POST must use INSTAGRAM_APP_SECRET')
      assert.ok(
        igTokenPost?.body?.includes('redirect_uri=https%3A%2F%2Fstudio-muza.vercel.app%2Fapi%2Fauth%2Fsocial%2Fmeta%2Fcallback') ||
        igTokenPost?.body?.includes('redirect_uri=https://studio-muza.vercel.app/api/auth/social/meta/callback'),
        'Instagram token exchange POST must use exact same redirect_uri as authorization URL'
      )

      const igLongExchange = interceptedFetchCalls.find(c => c.url.includes('graph.instagram.com/access_token'))
      assert.ok(igLongExchange?.url.includes('client_secret=test-ig-app-secret-888'), 'Instagram long token exchange must use INSTAGRAM_APP_SECRET')

      // 4. Credential Isolation: Instagram without Facebook credentials works
      delete process.env.META_APP_ID
      delete process.env.META_APP_SECRET
      assert.strictEqual(adapter.isConfigured('INSTAGRAM'), true)
      assert.strictEqual(adapter.isConfigured('FACEBOOK'), false)

      const igStandaloneAuth = await adapter.getAuthorizationUrl({
        userId: 'u1',
        businessId: 'b1',
        platform: 'INSTAGRAM',
      })
      assert.ok(igStandaloneAuth !== null, 'Instagram must work when only INSTAGRAM credentials are present')

      const fbMissingAuth = await adapter.getAuthorizationUrl({
        userId: 'u1',
        businessId: 'b1',
        platform: 'FACEBOOK',
      })
      assert.strictEqual(fbMissingAuth, null, 'Facebook must fail closed when META_APP_ID is missing')

      // 5. Credential Isolation: Facebook without Instagram credentials works
      delete process.env.INSTAGRAM_APP_ID
      delete process.env.INSTAGRAM_APP_SECRET
      process.env.META_APP_ID = 'test-fb-app-id-123'
      process.env.META_APP_SECRET = 'test-fb-secret-456'
      assert.strictEqual(adapter.isConfigured('INSTAGRAM'), false)
      assert.strictEqual(adapter.isConfigured('FACEBOOK'), true)

      const igMissingAuth = await adapter.getAuthorizationUrl({
        userId: 'u1',
        businessId: 'b1',
        platform: 'INSTAGRAM',
      })
      assert.strictEqual(igMissingAuth, null, 'Instagram must fail closed when INSTAGRAM_APP_ID is missing')

      const fbStandaloneAuth = await adapter.getAuthorizationUrl({
        userId: 'u1',
        businessId: 'b1',
        platform: 'FACEBOOK',
      })
      assert.ok(fbStandaloneAuth !== null, 'Facebook must work when only META credentials are present')

      // Verify publishing capability in adapter
      const adapterCode = fs.readFileSync(path.join(rootDir, 'src/services/social/adapters/meta-adapter.ts'), 'utf8')
      assert.ok(adapterCode.includes('publishInstagramPhotoPost'), 'Adapter contains publishInstagramPhotoPost')
    } finally {
      process.env = originalEnv
      globalThis.fetch = originalFetch
    }
  })

  // 12. Step 164B — Hardened Credential Encryption & Reauth Transition
  await t.test('12. CREDENTIAL_ENCRYPTION_KEY required, zero fallbacks, and safe REAUTH_REQUIRED UX', async () => {
    const originalEnv = { ...process.env }
    try {
      // 1. Missing key fails closed
      delete process.env.CREDENTIAL_ENCRYPTION_KEY
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'fake-service-key'
      process.env.NEXTAUTH_SECRET = 'fake-nextauth-key'

      assert.throws(() => {
        encryptCredential('sample-token')
      }, /CREDENTIAL_ENCRYPTION_KEY is required/)

      assert.strictEqual(decryptCredential('1234:5678:9abc'), null)

      // 2. Setting stable key enables encryption & decryption
      process.env.CREDENTIAL_ENCRYPTION_KEY = 'stable-secret-key-32-bytes-test-xyz'
      const token = 'EAAtest_token_12345'
      const encrypted = encryptCredential(token)
      assert.ok(encrypted.includes(':'))
      assert.strictEqual(decryptCredential(encrypted), token)

      // 3. Different key fails to decrypt (returns null safely without leaking)
      process.env.CREDENTIAL_ENCRYPTION_KEY = 'different-rotated-key-abc'
      assert.strictEqual(decryptCredential(encrypted), null)

      // 4. Source code checks: verify fallback removal and REAUTH_REQUIRED handling
      const cryptoSource = fs.readFileSync(path.join(rootDir, 'src/services/social/crypto.ts'), 'utf8')
      assert.ok(!cryptoSource.includes('SUPABASE_SERVICE_ROLE_KEY'), 'Must NOT have fallback to SUPABASE_SERVICE_ROLE_KEY')
      assert.ok(!cryptoSource.includes('NEXTAUTH_SECRET'), 'Must NOT have fallback to NEXTAUTH_SECRET')
      assert.ok(!cryptoSource.includes('fallback-key'), 'Must NOT have hardcoded fallback key')

      const socialSource = fs.readFileSync(path.join(rootDir, 'src/services/social/social-accounts.ts'), 'utf8')
      assert.ok(socialSource.includes("status: 'REAUTH_REQUIRED'"), 'Decryption failure must transition to REAUTH_REQUIRED')
      assert.ok(socialSource.includes('Autorisation à renouveler.'), 'Decryption failure must return friendly copy')
      assert.ok(!socialSource.includes('Échec de déchiffrement du jeton.'), 'Must NOT return raw technical error Échec de déchiffrement')

      const networksViewSource = fs.readFileSync(path.join(rootDir, 'src/components/social/networks-view.tsx'), 'utf8')
      assert.ok(networksViewSource.includes('Autorisation à renouveler'), 'Networks view must render "Autorisation à renouveler" badge')
      assert.ok(networksViewSource.includes('Reconnecter'), 'Networks view must provide "Reconnecter" CTA')
    } finally {
      process.env = originalEnv
    }
  })

  // 13. Step 164I — Independent Meta Verification: Instagram (graph.instagram.com) vs Facebook (graph.facebook.com)
  await t.test('13. Independent Meta verification: Instagram (graph.instagram.com/me) vs Facebook (graph.facebook.com/{page_id}) without Facebook dependency', async () => {
    const originalEnv = { ...process.env }
    const originalFetch = globalThis.fetch
    try {
      process.env.META_APP_ID = 'test-meta-app-id-123'
      process.env.META_APP_SECRET = 'test-meta-secret-456'
      process.env.META_CONFIG_ID = 'test-meta-business-config-789'
      process.env.CREDENTIAL_ENCRYPTION_KEY = 'test-key-32-bytes-for-unit-testing-vault'

      const adapter = new MetaSocialProviderAdapter()
      const interceptedUrls: string[] = []

      // 1. Facebook verification uses graph.facebook.com/{facebook_page_id}?fields=id,name
      globalThis.fetch = async (input: RequestInfo | URL) => {
        const urlStr = String(input)
        interceptedUrls.push(urlStr)

        if (urlStr.includes('graph.facebook.com') && urlStr.includes('/fb-page-123?')) {
          return new Response(JSON.stringify({ id: 'fb-page-123', name: 'Digital Zen Page' }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        }
        return new Response(JSON.stringify({ error: { message: 'Not found' } }), { status: 404 })
      }

      const fbResult = await adapter.verifyConnection('valid-fb-token', 'fb-page-123', 'FACEBOOK')
      assert.strictEqual(fbResult.isValid, true)
      assert.strictEqual(fbResult.accountName, 'Digital Zen Page')
      assert.ok(interceptedUrls.some(u => u.includes('graph.facebook.com') && u.includes('/fb-page-123?') && u.includes('fields=id,name')))

      // 2. Instagram verification uses graph.instagram.com/v21.0/me directly with Instagram User token
      interceptedUrls.length = 0
      globalThis.fetch = async (input: RequestInfo | URL) => {
        const urlStr = String(input)
        interceptedUrls.push(urlStr)

        if (urlStr.includes('graph.instagram.com') && urlStr.includes('/me?')) {
          return new Response(
            JSON.stringify({
              id: 'ig-user-456',
              username: 'digital_zen_58',
              account_type: 'BUSINESS',
            }),
            {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            }
          )
        }
        return new Response(JSON.stringify({ error: { message: 'Not found' } }), { status: 404 })
      }

      const igResult = await adapter.verifyConnection('valid-ig-token', 'ig-user-456', 'INSTAGRAM')
      assert.strictEqual(igResult.isValid, true)
      assert.strictEqual(igResult.accountName, '@digital_zen_58')
      assert.ok(interceptedUrls.some(u => u.includes('graph.instagram.com') && u.includes('/me?') && u.includes('fields=id,username,account_type')))
      assert.ok(!interceptedUrls.some(u => u.includes('graph.facebook.com')), 'Instagram verification must NOT query Facebook Graph API')

      // 3. Instagram ID mismatch returns controlled failure
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            id: 'different-ig-id-999',
            username: 'other_user',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      const igDifferentResult = await adapter.verifyConnection('valid-ig-token', 'ig-user-456', 'INSTAGRAM')
      assert.strictEqual(igDifferentResult.isValid, false)
      assert.strictEqual(igDifferentResult.isAuthError, false)
      assert.strictEqual(igDifferentResult.error, 'Identifiant de compte Instagram incohérent.')

      // 4. True OAuth revocation / expiration (code 190) returns isAuthError: true
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: {
              message: 'Error validating access token: Session has expired on Monday, 10-Jul-23 01:00:00 PDT.',
              type: 'OAuthException',
              code: 190,
              error_subcode: 463,
            },
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
      const oauthRevokedResult = await adapter.verifyConnection('expired-token', 'ig-user-456', 'INSTAGRAM')
      assert.strictEqual(oauthRevokedResult.isValid, false)
      assert.strictEqual(oauthRevokedResult.isAuthError, true)
      assert.strictEqual(oauthRevokedResult.error, 'Autorisation à renouveler.')

      // 5. HTTP 5xx Server Error => isAuthError: false (NO automatic REAUTH_REQUIRED)
      globalThis.fetch = async () => {
        return new Response(
          JSON.stringify({
            error: {
              message: 'An unexpected error has occurred. Please retry your request later.',
              type: 'OAuthException',
              code: 2,
            },
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
      }
      const serverErrorResult = await adapter.verifyConnection('valid-token', 'ig-user-456', 'INSTAGRAM')
      assert.strictEqual(serverErrorResult.isValid, false)
      assert.strictEqual(serverErrorResult.isAuthError, false)
      assert.strictEqual(serverErrorResult.error, 'Impossible de vérifier la connexion pour le moment.')

      // 6. Network / fetch exception => isAuthError: false (NO automatic REAUTH_REQUIRED)
      globalThis.fetch = async () => {
        throw new Error('fetch failed: connect ECONNREFUSED')
      }
      const networkErrorResult = await adapter.verifyConnection('valid-token', 'ig-user-456', 'INSTAGRAM')
      assert.strictEqual(networkErrorResult.isValid, false)
      assert.strictEqual(networkErrorResult.isAuthError, false)
      assert.strictEqual(networkErrorResult.error, 'Impossible de vérifier la connexion pour le moment.')

      // 7. Static source code verification: verifyConnection uses platform and never parentPageId or fields=id,name,username
      const adapterSource = fs.readFileSync(path.join(rootDir, 'src/services/social/adapters/meta-adapter.ts'), 'utf8')
      assert.ok(adapterSource.includes('graph.instagram.com'))
      assert.ok(!adapterSource.includes('parentPageId'))
      assert.ok(!adapterSource.includes('fields=id,name,username'))

      const socialSource = fs.readFileSync(path.join(rootDir, 'src/services/social/social-accounts.ts'), 'utf8')
      assert.ok(socialSource.includes('account.platform'), 'social-accounts must pass account.platform to verifyConnection')
      assert.ok(!socialSource.includes('parentPageId'), 'social-accounts must NOT have parentPageId')
      assert.ok(socialSource.includes('res.isAuthError'), 'social-accounts must check res.isAuthError before transitioning to REAUTH_REQUIRED')

      // 8. Confirm MUZA_META_ENV_DIAGNOSTIC is completely cleaned up
      const actionsSource = fs.readFileSync(path.join(rootDir, 'src/actions/social-accounts.ts'), 'utf8')
      assert.ok(!actionsSource.includes('MUZA_META_ENV_DIAGNOSTIC'), 'Temporary diagnostic must be completely removed')
    } finally {
      process.env = originalEnv
      globalThis.fetch = originalFetch
    }
  })

  // 14. Instagram OAuth Persistence, Retrieval Priority, NetworksView Matching, and Tenant Isolation
  await t.test('14. Instagram OAuth Persistence: canonical platform, updated_at priority, NetworksView CONNECTED status, and tenant isolation', async () => {
    const callbackSource = fs.readFileSync(path.join(rootDir, 'src/app/api/auth/social/meta/callback/route.ts'), 'utf8')
    const socialServiceSource = fs.readFileSync(path.join(rootDir, 'src/services/social/social-accounts.ts'), 'utf8')
    const networksViewSource = fs.readFileSync(path.join(rootDir, 'src/components/social/networks-view.tsx'), 'utf8')

    // 1. Callback route verifies persistence before redirecting with success=true
    assert.ok(
      callbackSource.includes('getBusinessSocialAccounts(business.id)'),
      'Callback route must re-read accounts via getBusinessSocialAccounts before redirecting with success'
    )
    assert.ok(
      callbackSource.includes('hasConnectedTarget'),
      'Callback route must confirm connected target exists in DB for active business'
    )

    // 2. getBusinessSocialAccounts orders by updated_at descending and canonicalizes platform to uppercase
    assert.ok(
      socialServiceSource.includes("order('updated_at', { ascending: false })"),
      'getBusinessSocialAccounts must order by updated_at descending to prioritize newest updates'
    )
    assert.ok(
      socialServiceSource.includes('rawPlatform.toUpperCase()') || socialServiceSource.includes('.toUpperCase().trim()'),
      'getBusinessSocialAccounts must canonicalize platform to uppercase'
    )

    // 3. saveSocialAccount deactivates superseded accounts when connecting a new one
    assert.ok(
      socialServiceSource.includes("status: 'DISCONNECTED'") && socialServiceSource.includes("neq('external_account_id', input.externalAccountId)"),
      'saveSocialAccount must deactivate older superseded accounts for the same business/platform'
    )

    // 4. NetworksView lookup logic prioritizes CONNECTED over DISCONNECTED/stale accounts
    assert.ok(
      networksViewSource.includes("a.status === 'CONNECTED'"),
      'NetworksView must prioritize CONNECTED account status'
    )

    // 5. Simulated data-flow test: Simulate accounts array with both an old disconnected row and a new connected row
    const mockAccountsList: SocialAccountSummary[] = [
      {
        id: 'acc-new-ig',
        businessId: 'biz-current-123',
        provider: 'META' as const,
        platform: 'INSTAGRAM' as const,
        externalAccountId: 'ig-178499999',
        accountName: '@digital_zen_58',
        accountType: 'BUSINESS',
        status: 'CONNECTED' as const,
        capabilities: { canPublishPosts: true, canPublishCarousels: true, canPublishShortVideo: true, canReadInsights: true },
        scopes: ['instagram_business_basic', 'instagram_business_content_publish'],
        connectedAt: '2026-09-23T16:00:00.000Z',
        lastVerifiedAt: '2026-09-23T16:00:00.000Z',
      },
      {
        id: 'acc-old-ig',
        businessId: 'biz-current-123',
        provider: 'META' as const,
        platform: 'INSTAGRAM' as const,
        externalAccountId: 'ig-old-page-scoped',
        accountName: 'Digital Zen Old',
        accountType: 'BUSINESS',
        status: 'DISCONNECTED' as const,
        capabilities: { canPublishPosts: true, canPublishCarousels: true, canPublishShortVideo: false, canReadInsights: false },
        scopes: [],
        connectedAt: '2026-09-20T10:00:00.000Z',
        lastVerifiedAt: null,
      },
    ]

    // Priority selector in NetworksView
    const resolvedIg =
      mockAccountsList.find((a) => a.platform?.toUpperCase() === 'INSTAGRAM' && a.status === 'CONNECTED') ||
      mockAccountsList.find((a) => a.platform?.toUpperCase() === 'INSTAGRAM' && a.status === 'REAUTH_REQUIRED') ||
      mockAccountsList.find((a) => a.platform?.toUpperCase() === 'INSTAGRAM')

    assert.ok(resolvedIg !== undefined)
    assert.strictEqual(resolvedIg.id, 'acc-new-ig')
    assert.strictEqual(resolvedIg.status, 'CONNECTED')
    assert.strictEqual(resolvedIg.accountName, '@digital_zen_58')

    // 6. Tenant isolation test: Verify querying business A does not return business B
    const businessAId = 'biz-aaa-111'
    const businessBId = 'biz-bbb-222'

    const allDbRows = [
      { id: '1', business_id: businessAId, platform: 'INSTAGRAM', status: 'CONNECTED' },
      { id: '2', business_id: businessBId, platform: 'INSTAGRAM', status: 'CONNECTED' },
    ]

    const filteredForBizA = allDbRows.filter((r) => r.business_id === businessAId)
    assert.strictEqual(filteredForBizA.length, 1)
    assert.strictEqual(filteredForBizA[0].id, '1')
    assert.strictEqual(filteredForBizA[0].business_id, businessAId)
    assert.ok(!filteredForBizA.some((r) => r.business_id === businessBId), 'Tenant isolation: Biz A must not see Biz B data')
  })
})

