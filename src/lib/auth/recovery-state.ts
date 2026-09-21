import crypto from 'node:crypto'

export const RECOVERY_COOKIE_NAME = 'muza_recovery_intent'
export const RECOVERY_TOKEN_TTL_MS = 15 * 60 * 1000 // 15 minutes

// Server-side in-memory set of consumed nonces to prevent replay/reuse within the TTL window
const consumedNonces = new Set<string>()

function getSecretKey(): string {
  const secret = process.env.MUZA_AUTH_RECOVERY_SECRET
  if (!secret) {
    throw new Error(
      'Server configuration error: MUZA_AUTH_RECOVERY_SECRET is not configured.'
    )
  }
  return secret
}

/**
 * Creates a cryptographically signed recovery token bound to a specific user.
 * Format: `<userId>:<issuedAt>:<nonce>.<signature>`
 */
export function createRecoveryToken(userId: string): string {
  const issuedAt = Date.now()
  const nonce = crypto.randomBytes(16).toString('hex')
  const payload = `${userId}:${issuedAt}:${nonce}`
  const signature = crypto
    .createHmac('sha256', getSecretKey())
    .update(payload)
    .digest('hex')
  return `${payload}.${signature}`
}

export interface VerifyRecoveryResult {
  valid: boolean
  reason?:
    | 'missing'
    | 'malformed'
    | 'invalid_signature'
    | 'user_mismatch'
    | 'expired'
    | 'already_consumed'
    | 'missing_secret'
  userId?: string
}

/**
 * Verifies that a recovery token is structurally valid, has an authentic HMAC signature,
 * matches the expected user ID, has not expired, and has not already been consumed.
 */
export function verifyRecoveryToken(
  token: string | undefined | null,
  expectedUserId: string
): VerifyRecoveryResult {
  if (!token || typeof token !== 'string') {
    return { valid: false, reason: 'missing' }
  }

  const parts = token.split('.')
  if (parts.length !== 2) {
    return { valid: false, reason: 'malformed' }
  }

  const [payload, signature] = parts
  let expectedSignature: string
  try {
    expectedSignature = crypto
      .createHmac('sha256', getSecretKey())
      .update(payload)
      .digest('hex')
  } catch {
    return { valid: false, reason: 'missing_secret' }
  }

  // Timing-safe signature comparison
  if (
    signature.length !== expectedSignature.length ||
    !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
  ) {
    return { valid: false, reason: 'invalid_signature' }
  }

  const payloadParts = payload.split(':')
  if (payloadParts.length !== 3) {
    return { valid: false, reason: 'malformed' }
  }

  const [tokenUserId, issuedAtStr, nonce] = payloadParts
  const issuedAt = parseInt(issuedAtStr, 10)

  if (isNaN(issuedAt)) {
    return { valid: false, reason: 'malformed' }
  }

  if (tokenUserId !== expectedUserId) {
    return { valid: false, reason: 'user_mismatch' }
  }

  const now = Date.now()
  if (now - issuedAt > RECOVERY_TOKEN_TTL_MS || issuedAt > now + 5000) {
    return { valid: false, reason: 'expired' }
  }

  if (consumedNonces.has(nonce)) {
    return { valid: false, reason: 'already_consumed' }
  }

  return { valid: true, userId: tokenUserId }
}

/**
 * Marks a recovery token's nonce as consumed so it cannot be reused.
 */
export function consumeRecoveryToken(token: string | undefined | null): boolean {
  if (!token || typeof token !== 'string') return false
  const parts = token.split('.')
  if (parts.length !== 2) return false
  const payloadParts = parts[0].split(':')
  if (payloadParts.length !== 3) return false
  const nonce = payloadParts[2]
  consumedNonces.add(nonce)

  // Keep bounded cache size
  if (consumedNonces.size > 10000) {
    consumedNonces.clear()
  }
  return true
}

/**
 * Testing utility to clear consumed nonces between unit test runs.
 */
export function clearConsumedNoncesForTesting(): void {
  consumedNonces.clear()
}
