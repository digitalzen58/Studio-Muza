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
import { type OAuthStatePayload } from '../social/types'

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

  // 11. Step 162 — Real Meta OAuth URL & Facebook Login for Business config_id
  await t.test('11. Meta Login for Business config_id support, OAuth URL generation & zero publishing calls', async () => {
    // Test with mock env variables
    const originalEnv = { ...process.env }
    try {
      process.env.META_APP_ID = 'test-meta-app-id-123'
      process.env.META_APP_SECRET = 'test-meta-secret-456'
      process.env.META_CONFIG_ID = 'test-meta-business-config-789'
      process.env.CREDENTIAL_ENCRYPTION_KEY = 'test-key-32-bytes-for-unit-testing-vault'
      process.env.NEXT_PUBLIC_SITE_URL = 'https://studio-muza.vercel.app'

      const adapter = new MetaSocialProviderAdapter()
      const config = adapter.getAuthConfig()

      assert.strictEqual(config.isConfigured, true)
      assert.strictEqual(config.appIdPresent, true)
      assert.strictEqual(config.appSecretPresent, true)
      assert.strictEqual(config.configIdPresent, true)

      const authRes = await adapter.getAuthorizationUrl({
        userId: 'u1',
        businessId: 'b1',
        platform: 'INSTAGRAM',
      })

      assert.ok(authRes !== null, 'authRes must not be null')
      assert.ok(authRes.url.startsWith('https://www.facebook.com/v21.0/dialog/oauth'), 'Must use Graph API v21.0 OAuth dialog')

      const parsed = new URL(authRes.url)
      assert.strictEqual(parsed.searchParams.get('client_id'), 'test-meta-app-id-123')
      assert.strictEqual(parsed.searchParams.get('config_id'), 'test-meta-business-config-789')
      assert.strictEqual(parsed.searchParams.get('redirect_uri'), 'https://studio-muza.vercel.app/api/auth/social/meta/callback')
      assert.strictEqual(parsed.searchParams.get('state'), authRes.state)
      assert.strictEqual(parsed.searchParams.get('response_type'), 'code')

      // Verify the generated state contains our userId and businessId securely
      const verifiedState = verifyOAuthState<OAuthStatePayload>(authRes.state)
      assert.ok(verifiedState !== null, 'Generated state must be cryptographically valid')
      assert.strictEqual(verifiedState.userId, 'u1')
      assert.strictEqual(verifiedState.businessId, 'b1')
      assert.strictEqual(verifiedState.provider, 'META')
      assert.strictEqual(verifiedState.platform, 'INSTAGRAM')

      // Ensure no publishing calls exist in the adapter
      const adapterCode = fs.readFileSync(path.join(rootDir, 'src/services/social/adapters/meta-adapter.ts'), 'utf8')
      assert.ok(!adapterCode.includes('media_publish'), 'Adapter must NOT contain media publish endpoints in Step 162')
      assert.ok(!adapterCode.includes('/media_publish'), 'Adapter must NOT contain /media_publish calls')
    } finally {
      process.env = originalEnv
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
})

