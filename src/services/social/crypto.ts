import crypto from 'node:crypto'

/**
 * Derives a consistent 32-byte key from CREDENTIAL_ENCRYPTION_KEY.
 * Strictly requires CREDENTIAL_ENCRYPTION_KEY to be set in environment (fail-closed, no fallbacks).
 */
function getEncryptionKey(): Buffer {
  const masterKey = process.env.CREDENTIAL_ENCRYPTION_KEY
  if (!masterKey || masterKey.trim() === '') {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY is required for credential encryption/decryption.')
  }

  return crypto.createHash('sha256').update(masterKey.trim()).digest()
}

/**
 * Encrypts a sensitive string (e.g. OAuth access token) using AES-256-GCM.
 * Output format: iv:authTag:encryptedData (hex encoded)
 */
export function encryptCredential(plaintext: string): string {
  if (!plaintext || plaintext.trim() === '') {
    return ''
  }

  const key = getEncryptionKey()
  const iv = crypto.randomBytes(12) // 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)

  let encrypted = cipher.update(plaintext, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')

  return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

/**
 * Decrypts an AES-256-GCM encrypted credential string.
 * Returns the decrypted plaintext or null if decryption fails.
 */
export function decryptCredential(ciphertext: string): string | null {
  if (!ciphertext || !ciphertext.includes(':')) {
    return null
  }

  try {
    const parts = ciphertext.split(':')
    if (parts.length !== 3) {
      return null
    }

    const [ivHex, authTagHex, encryptedHex] = parts
    const key = getEncryptionKey()
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')

    return decrypted
  } catch (err) {
    console.error('Failed to decrypt credential:', err instanceof Error ? err.message : 'Unknown error')
    return null
  }
}

/**
 * Creates a signed, tamper-proof, short-lived OAuth state payload.
 */
export function signOAuthState(payload: Record<string, unknown>): string {
  const jsonStr = JSON.stringify(payload)
  const encoded = Buffer.from(jsonStr).toString('base64url')
  const key = getEncryptionKey()
  const signature = crypto.createHmac('sha256', key).update(encoded).digest('base64url')
  return `${encoded}.${signature}`
}

/**
 * Verifies and parses a signed OAuth state string.
 * Validates expiration and HMAC signature.
 */
export function verifyOAuthState<T extends { expiresAt?: number }>(signedState: string): T | null {
  if (!signedState || !signedState.includes('.')) {
    return null
  }

  try {
    const [encoded, signature] = signedState.split('.')
    const key = getEncryptionKey()
    const expectedSignature = crypto.createHmac('sha256', key).update(encoded).digest('base64url')

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      console.warn('OAuth state signature mismatch')
      return null
    }

    const jsonStr = Buffer.from(encoded, 'base64url').toString('utf8')
    const payload = JSON.parse(jsonStr) as T

    if (payload.expiresAt && Date.now() > payload.expiresAt) {
      console.warn('OAuth state has expired')
      return null
    }

    return payload
  } catch (err) {
    console.error('Failed to verify OAuth state:', err instanceof Error ? err.message : 'Unknown error')
    return null
  }
}
