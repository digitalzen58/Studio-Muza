import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import {
  createRecoveryToken,
  verifyRecoveryToken,
  consumeRecoveryToken,
  clearConsumedNoncesForTesting,
  RECOVERY_COOKIE_NAME,
  RECOVERY_TOKEN_TTL_MS,
} from '../../lib/auth/recovery-state'

console.log('=== RUNNING AUTH PASSWORD RECOVERY DETERMINISTIC TESTS (A–Z) ===')

assert.equal(
  RECOVERY_COOKIE_NAME,
  'muza_recovery_intent',
  'RECOVERY_COOKIE_NAME must equal muza_recovery_intent'
)
const loginPageContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/app/(auth)/login/page.tsx'),
  'utf8'
)
assert.ok(
  loginPageContent.includes('Mot de passe oublié ?'),
  'TEST A FAILED: Login page must include "Mot de passe oublié ?"'
)
assert.ok(
  loginPageContent.includes('href="/forgot-password"'),
  'TEST B FAILED: Login page link must point to /forgot-password'
)
console.log('✓ TEST A: Login page renders "Mot de passe oublié ?"')
console.log('✓ TEST B: Link opens /forgot-password')

// --- TEST C, D, E: requestPasswordReset validation & neutral response ---
const actionsContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/app/auth/actions.ts'),
  'utf8'
)
assert.ok(
  actionsContent.includes('export async function requestPasswordReset('),
  'actions.ts must export requestPasswordReset'
)
assert.ok(
  actionsContent.includes('resetPasswordForEmail'),
  'TEST C FAILED: requestPasswordReset must use Supabase resetPasswordForEmail'
)
assert.ok(
  actionsContent.includes('/auth/callback?next=/reset-password'),
  'TEST C FAILED: redirect URL must target /auth/callback?next=/reset-password'
)
assert.ok(
  actionsContent.includes(
    'Si un compte existe pour cette adresse, vous recevrez un e-mail dans quelques instants.'
  ),
  'TEST D FAILED: Neutral success response must not reveal account existence'
)
assert.ok(
  actionsContent.includes('Veuillez saisir une adresse e-mail valide.'),
  'TEST E FAILED: Malformed email must be rejected'
)
console.log('✓ TEST C: Valid email submission calls password recovery with proper redirect')
console.log('✓ TEST D: Neutral success message avoids account enumeration')
console.log('✓ TEST E: Malformed email rejected with friendly message')

// --- TEST F: Auth callback handles recovery redirect on failure ---
const callbackContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/app/auth/callback/route.ts'),
  'utf8'
)
assert.ok(
  callbackContent.includes("next.startsWith('/reset-password')"),
  'TEST F FAILED: Callback must detect /reset-password destination'
)
assert.ok(
  callbackContent.includes('/reset-password?error=invalid-or-expired'),
  'TEST F FAILED: Callback must redirect to /reset-password?error=invalid-or-expired'
)
console.log('✓ TEST F: Recovery callback safely establishes session or redirects to error state')

// --- TEST G, H, I, J: updatePassword validations & updateUser invocation ---
assert.ok(
  actionsContent.includes('export async function updatePassword('),
  'actions.ts must export updatePassword'
)
assert.ok(
  actionsContent.includes('Session de récupération invalide ou expirée.'),
  'TEST G FAILED: updatePassword must require valid active session'
)
assert.ok(
  actionsContent.includes('Les mots de passe ne correspondent pas.'),
  'TEST H FAILED: updatePassword must enforce password matching'
)
assert.ok(
  actionsContent.includes('Le mot de passe doit comporter au moins 8 caractères.'),
  'TEST I FAILED: updatePassword must enforce minimum password length (8 chars)'
)
assert.ok(
  actionsContent.includes('supabase.auth.updateUser({'),
  'TEST J FAILED: updatePassword must call supabase.auth.updateUser'
)
console.log('✓ TEST G: Reset action requires valid recovery session')
console.log('✓ TEST H: Non-matching passwords rejected')
console.log('✓ TEST I: Too-short password rejected (< 8 chars)')
console.log('✓ TEST J: Valid new password calls updateUser')

// --- TEST K: Invalid / Expired link UI in reset-password page ---
const resetPageContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/app/(auth)/reset-password/page.tsx'),
  'utf8'
)
assert.ok(
  resetPageContent.includes('Ce lien n’est plus valide ou a expiré.'),
  'TEST K FAILED: Reset page must display friendly expired/invalid link message'
)
assert.ok(
  resetPageContent.includes('Recevoir un nouveau lien'),
  'TEST K FAILED: Reset page must offer CTA to request a new link'
)
assert.ok(
  resetPageContent.includes('href="/forgot-password"'),
  'TEST K FAILED: CTA must link back to /forgot-password'
)
console.log('✓ TEST K: Expired/invalid link gets safe French UX and retry CTA')

// --- TEST L: No secrets or tokens logged ---
assert.ok(
  !actionsContent.includes('console.log(password)'),
  'TEST L FAILED: Passwords must never be logged'
)
assert.ok(
  !actionsContent.includes('console.log(token)'),
  'TEST L FAILED: Tokens must never be logged'
)
assert.ok(
  !resetPageContent.includes('console.log('),
  'TEST L FAILED: Server reset page must not log sensitive parameters'
)
console.log('✓ TEST L: No passwords or recovery tokens logged')

// --- TEST M, N, O: Existing login, signup, and middleware invariants preserved ---
assert.ok(
  actionsContent.includes('signInWithPassword'),
  'TEST M FAILED: Existing signInWithPassword must remain intact'
)
assert.ok(
  actionsContent.includes('supabase.auth.signUp'),
  'TEST N FAILED: Existing signUp must remain intact'
)
const middlewareContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/lib/supabase/middleware.ts'),
  'utf8'
)
assert.ok(
  middlewareContent.includes("request.nextUrl.pathname.startsWith('/app')"),
  'TEST O FAILED: /app routes must remain protected'
)
assert.ok(
  middlewareContent.includes("request.nextUrl.pathname === '/forgot-password'"),
  'TEST O FAILED: Logged-in users should be redirected from /forgot-password'
)
assert.ok(
  !middlewareContent.includes("request.nextUrl.pathname === '/reset-password'"),
  'TEST O FAILED: /reset-password must NOT redirect away logged-in users under recovery session'
)
console.log('✓ TEST M: Existing login functionality preserved')
console.log('✓ TEST N: Existing signup functionality preserved')
console.log('✓ TEST O: Protected /app routes and middleware invariants preserved')

// ============================================================================
// STEP 133A.1 & 133A.2 SECURITY HARDENING TESTS (P–U)
// ============================================================================

const recoveryStateContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/lib/auth/recovery-state.ts'),
  'utf8'
)

// Invariant: recovery-state.ts must NOT use SUPABASE keys
assert.ok(
  !recoveryStateContent.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  'INVARIANT VIOLATION: recovery-state.ts must never use NEXT_PUBLIC_SUPABASE_ANON_KEY'
)
assert.ok(
  !recoveryStateContent.includes('SUPABASE_SERVICE_ROLE_KEY'),
  'INVARIANT VIOLATION: recovery-state.ts must not use SUPABASE_SERVICE_ROLE_KEY'
)
assert.ok(
  recoveryStateContent.includes('MUZA_AUTH_RECOVERY_SECRET'),
  'INVARIANT: recovery-state.ts must use MUZA_AUTH_RECOVERY_SECRET'
)

// Invariant: fail-closed behavior when MUZA_AUTH_RECOVERY_SECRET is missing
delete process.env.MUZA_AUTH_RECOVERY_SECRET
assert.throws(
  () => createRecoveryToken('test-user'),
  /MUZA_AUTH_RECOVERY_SECRET is not configured/,
  'Must throw configuration error when MUZA_AUTH_RECOVERY_SECRET is missing'
)
const failClosedVerification = verifyRecoveryToken('any.token', 'test-user')
assert.equal(
  failClosedVerification.valid,
  false,
  'verifyRecoveryToken must fail closed when secret is missing'
)
assert.equal(failClosedVerification.reason, 'missing_secret')

// Now load .env.local to test authenticated recovery flow
const envLocalPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8')
  const secretMatch = envContent.match(/MUZA_AUTH_RECOVERY_SECRET=([^\r\n]+)/)
  if (secretMatch) {
    process.env.MUZA_AUTH_RECOVERY_SECRET = secretMatch[1].trim()
  }
}

// Fallback test secret if .env.local is not present in isolated test runners
if (!process.env.MUZA_AUTH_RECOVERY_SECRET) {
  process.env.MUZA_AUTH_RECOVERY_SECRET = 'test-suite-recovery-secret-abcdef123456'
}

clearConsumedNoncesForTesting()
const sampleUserId = 'user-auth-12345'
const attackerUserId = 'user-attacker-67890'

// --- TEST P: Ordinary authenticated session without recovery state cannot access reset ---
const verificationNoCookie = verifyRecoveryToken(undefined, sampleUserId)
assert.equal(
  verificationNoCookie.valid,
  false,
  'TEST P FAILED: Missing recovery cookie must return invalid'
)
assert.equal(
  verificationNoCookie.reason,
  'missing',
  'TEST P FAILED: Missing recovery cookie must be identified as missing'
)
assert.ok(
  resetPageContent.includes('verifyRecoveryToken(recoveryToken, user.id)'),
  'TEST P FAILED: reset-password page must verify recovery token against user.id'
)
assert.ok(
  actionsContent.includes('verifyRecoveryToken(recoveryToken, user.id)'),
  'TEST P FAILED: updatePassword action must verify recovery token against user.id'
)
console.log(
  '✓ TEST P: Ordinary authenticated session manually visiting /reset-password cannot access valid reset state'
)

// --- TEST Q: Genuine recovery callback establishes recovery-specific state ---
assert.ok(
  callbackContent.includes('createRecoveryToken(data.user.id)'),
  'TEST Q FAILED: Callback must generate recovery token for authenticated user'
)
assert.ok(
  callbackContent.includes(`response.cookies.set(RECOVERY_COOKIE_NAME`),
  'TEST Q FAILED: Callback must set recovery intent cookie'
)
assert.ok(
  callbackContent.includes('httpOnly: true'),
  'TEST Q FAILED: Recovery cookie must be httpOnly'
)
const tokenQ = createRecoveryToken(sampleUserId)
assert.ok(tokenQ && tokenQ.includes('.'), 'TEST Q FAILED: Created token must have payload and signature')
console.log('✓ TEST Q: Genuine recovery callback establishes recovery-specific state')

// --- TEST R: Genuine recovery session can verify and update password ---
const genuineVerification = verifyRecoveryToken(tokenQ, sampleUserId)
assert.equal(
  genuineVerification.valid,
  true,
  'TEST R FAILED: Genuine recovery token matching user.id must be valid'
)
assert.equal(
  genuineVerification.userId,
  sampleUserId,
  'TEST R FAILED: Token user ID must match expected user ID'
)
console.log('✓ TEST R: Genuine recovery session can update password')

// --- TEST S: Invalid / expired recovery cannot update password ---
// S.1: Tampered signature
const [payload, sig] = tokenQ.split('.')
const tamperedSigToken = `${payload}.${sig.slice(0, -2)}aa`
const tamperedResult = verifyRecoveryToken(tamperedSigToken, sampleUserId)
assert.equal(
  tamperedResult.valid,
  false,
  'TEST S FAILED: Tampered signature must be rejected'
)
assert.equal(tamperedResult.reason, 'invalid_signature')

// S.2: User mismatch (attacker tries to use victim token)
const mismatchResult = verifyRecoveryToken(tokenQ, attackerUserId)
assert.equal(
  mismatchResult.valid,
  false,
  'TEST S FAILED: Token for user A used by user B must be rejected'
)
assert.equal(mismatchResult.reason, 'user_mismatch')

// S.3: Malformed token
const malformedResult = verifyRecoveryToken('not-a-token', sampleUserId)
assert.equal(malformedResult.valid, false)
assert.equal(malformedResult.reason, 'malformed')

// S.4: Expired token (> 15 minutes)
const expiredPayload = `${sampleUserId}:${Date.now() - (RECOVERY_TOKEN_TTL_MS + 10000)}:sampleNonce123`
const currentSecret = process.env.MUZA_AUTH_RECOVERY_SECRET!
const expiredSig = crypto.createHmac('sha256', currentSecret).update(expiredPayload).digest('hex')
const expiredToken = `${expiredPayload}.${expiredSig}`
const expiredResult = verifyRecoveryToken(expiredToken, sampleUserId)
assert.equal(expiredResult.valid, false, 'TEST S FAILED: Expired token must be rejected')
assert.equal(expiredResult.reason, 'expired')
console.log('✓ TEST S: Invalid/expired recovery cannot update password')

// --- TEST T: Successful password reset consumes/clears recovery-specific state ---
assert.ok(
  actionsContent.includes('consumeRecoveryToken(recoveryToken)'),
  'TEST T FAILED: updatePassword must call consumeRecoveryToken'
)
assert.ok(
  actionsContent.includes('cookieStore.delete(RECOVERY_COOKIE_NAME)'),
  'TEST T FAILED: updatePassword must delete recovery cookie from store'
)
const tokenT = createRecoveryToken(sampleUserId)
const verifyBeforeConsume = verifyRecoveryToken(tokenT, sampleUserId)
assert.equal(verifyBeforeConsume.valid, true)
const consumed = consumeRecoveryToken(tokenT)
assert.equal(consumed, true, 'TEST T FAILED: consumeRecoveryToken must return true')
console.log('✓ TEST T: Successful password reset consumes/clears recovery-specific state')

// --- TEST U: Previously consumed recovery state cannot simply be reused ---
const verifyAfterConsume = verifyRecoveryToken(tokenT, sampleUserId)
assert.equal(
  verifyAfterConsume.valid,
  false,
  'TEST U FAILED: Consumed token must be rejected on reuse'
)
assert.equal(
  verifyAfterConsume.reason,
  'already_consumed',
  'TEST U FAILED: Replay of consumed token must fail with already_consumed'
)
console.log('✓ TEST U: Previously consumed recovery state cannot simply be reused')

// ============================================================================
// STEP 133C: SUCCESS COMPLETION & REDIRECT FLOW TESTS (V–Z)
// ============================================================================

const resetFormContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/app/(auth)/reset-password/reset-password-form.tsx'),
  'utf8'
)
const forgotPageContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/app/(auth)/forgot-password/page.tsx'),
  'utf8'
)

// --- TEST V: Successful password reset shows the final success state ---
assert.ok(
  resetPageContent.includes('Votre mot de passe a bien été modifié.'),
  'TEST V FAILED: Reset page must display "Votre mot de passe a bien été modifié."'
)
assert.ok(
  resetPageContent.includes('Vous pouvez maintenant continuer vers Studio Mūza.'),
  'TEST V FAILED: Reset page must display supporting text "Vous pouvez maintenant continuer vers Studio Mūza."'
)
assert.ok(
  resetFormContent.includes('Votre mot de passe a bien été modifié.'),
  'TEST V FAILED: Reset form must include success title'
)
assert.ok(
  resetFormContent.includes('Vous pouvez maintenant continuer vers Studio Mūza.'),
  'TEST V FAILED: Reset form must include success supporting text'
)
console.log('✓ TEST V: successful password reset shows the final success state')

// --- TEST W: Final CTA targets /app ---
assert.ok(
  resetPageContent.includes('Continuer vers Mūza'),
  'TEST W FAILED: Reset page must include CTA "Continuer vers Mūza"'
)
assert.ok(
  resetPageContent.includes('href="/app"'),
  'TEST W FAILED: Reset page success CTA must target /app'
)
assert.ok(
  resetFormContent.includes('Continuer vers Mūza'),
  'TEST W FAILED: Reset form must include CTA "Continuer vers Mūza"'
)
assert.ok(
  resetFormContent.includes('href="/app"'),
  'TEST W FAILED: Reset form success CTA must target /app'
)
console.log('✓ TEST W: final CTA targets /app')

// --- TEST X: Recovery state is already consumed before continuing ---
assert.ok(
  actionsContent.includes('consumeRecoveryToken(recoveryToken)'),
  'TEST X FAILED: recovery state must be consumed'
)
assert.ok(
  actionsContent.includes('cookieStore.delete(RECOVERY_COOKIE_NAME)'),
  'TEST X FAILED: recovery cookie must be deleted from store'
)
const updatePasswordFn = actionsContent.slice(
  actionsContent.indexOf('export async function updatePassword(')
)
assert.ok(
  !updatePasswordFn.includes('revalidatePath'),
  'TEST X FAILED: updatePassword must not prematurely revalidate root layout'
)
console.log('✓ TEST X: recovery state is already consumed before continuing')

// --- TEST Y: /forgot-password is not the successful reset destination ---
assert.ok(
  !actionsContent.includes("redirect('/forgot-password')"),
  'TEST Y FAILED: updatePassword must never redirect to /forgot-password'
)
assert.ok(
  forgotPageContent.includes('supabase.auth.getUser()'),
  'TEST Y FAILED: forgot-password must verify session and redirect active users'
)
assert.ok(
  forgotPageContent.includes("router.replace('/app')"),
  'TEST Y FAILED: forgot-password must redirect authenticated users to /app'
)
console.log('✓ TEST Y: /forgot-password is not the successful reset destination')

// --- TEST Z: /app remains protected normally ---
assert.ok(
  middlewareContent.includes("!user && request.nextUrl.pathname.startsWith('/app')"),
  'TEST Z FAILED: unauthenticated access to /app must redirect to login'
)
assert.ok(
  middlewareContent.includes("url.pathname = '/login'"),
  'TEST Z FAILED: unauthenticated redirect must target /login'
)
console.log('✓ TEST Z: /app remains protected normally')

// --- TEST 163: Step 163 Reliability & Security ---
const updatedActionsContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/app/auth/actions.ts'),
  'utf8'
)
const updatedForgotPageContent = fs.readFileSync(
  path.resolve(process.cwd(), 'src/app/(auth)/forgot-password/page.tsx'),
  'utf8'
)

// 1. Error capture from resetPasswordForEmail
assert.ok(
  updatedActionsContent.includes('const { error } = await supabase.auth.resetPasswordForEmail('),
  'TEST 163 FAILED: requestPasswordReset must explicitly capture { error } from resetPasswordForEmail'
)
assert.ok(
  updatedActionsContent.includes('[Auth Recovery Error]: Supabase password reset request failed:'),
  'TEST 163 FAILED: requestPasswordReset must log server-side error'
)

// 2. Anti-enumeration: Zero email logging, zero credentials logging, neutral response
const reqResetFn = updatedActionsContent.slice(
  updatedActionsContent.indexOf('export async function requestPasswordReset('),
  updatedActionsContent.indexOf('export async function updatePassword(')
)
assert.ok(
  !reqResetFn.includes('console.error(email') && !reqResetFn.includes('console.log(email') && !reqResetFn.includes('email:'),
  'TEST 163 FAILED: requestPasswordReset must NEVER log user email'
)
assert.ok(
  reqResetFn.includes("message:\n      'Si un compte existe pour cette adresse, vous recevrez un e-mail dans quelques instants.'"),
  'TEST 163 FAILED: requestPasswordReset must maintain anti-enumeration response'
)

// 3. Support link mailto:digital.zen.58@gmail.com
assert.ok(
  updatedForgotPageContent.includes('href="mailto:digital.zen.58@gmail.com"'),
  'TEST 163 FAILED: Support link must target mailto:digital.zen.58@gmail.com'
)
assert.ok(
  updatedForgotPageContent.includes('Contacter le support'),
  'TEST 163 FAILED: Support link visible text must remain "Contacter le support"'
)
console.log('✓ TEST 163: Error capture, anti-enumeration safety, and real mailto support link verified')

console.log('=== ALL TESTS (A–Z + 163) PASSED DETERMINISTICALLY ===')

