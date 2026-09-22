import { createClient } from '@/lib/supabase/server'

export interface BusinessContactInfo {
  phone: string | null
  bookingUrl: string | null
  appointmentUrl: string | null
}

export interface BusinessContactInfoInput {
  phone?: string | null
  bookingUrl?: string | null
  appointmentUrl?: string | null
}

export interface ValidationResult {
  valid: boolean
  error?: string
  sanitized?: BusinessContactInfo
}

/**
 * Validates a phone string safely.
 * Allows digits, spaces, +, -, ., (), and ensures reasonable length (6-30 chars) and at least 6 digits.
 */
export function validatePhone(phone: string): { valid: boolean; sanitized?: string; error?: string } {
  const trimmed = phone.trim()
  if (!trimmed) {
    return { valid: true, sanitized: undefined }
  }

  // Check forbidden characters / scripts
  if (/[<>{}]|javascript:|data:/i.test(trimmed)) {
    return { valid: false, error: 'Format de numéro de téléphone invalide.' }
  }

  // Allowed phone characters
  const phoneRegex = /^[+]?[\d\s\-().]{6,30}$/
  if (!phoneRegex.test(trimmed)) {
    return { valid: false, error: 'Le numéro de téléphone est invalide (trop court ou caractères non supportés).' }
  }

  const digitsOnly = trimmed.replace(/\D/g, '')
  if (digitsOnly.length < 6 || digitsOnly.length > 20) {
    return { valid: false, error: 'Le numéro de téléphone doit contenir entre 6 et 20 chiffres.' }
  }

  return { valid: true, sanitized: trimmed }
}

/**
 * Validates a web URL safely.
 * Enforces http or https protocol, rejects javascript: and data: URLs.
 */
export function validateUrl(rawUrl: string): { valid: boolean; sanitized?: string; error?: string } {
  const trimmed = rawUrl.trim()
  if (!trimmed) {
    return { valid: true, sanitized: undefined }
  }

  if (/^(javascript|data|vbscript|file):/i.test(trimmed)) {
    return { valid: false, error: 'Lien non sécurisé ou invalide (seuls https:// et http:// sont acceptés).' }
  }

  let parsed: URL
  try {
    // If protocol is missing, try prepending https://
    const urlToTest = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed) ? trimmed : `https://${trimmed}`
    parsed = new URL(urlToTest)
  } catch {
    return { valid: false, error: 'Format d’adresse web (URL) invalide.' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { valid: false, error: 'Seuls les liens débutant par http:// ou https:// sont acceptés.' }
  }

  if (!parsed.hostname || parsed.hostname.length < 3 || !parsed.hostname.includes('.')) {
    return { valid: false, error: 'Nom de domaine invalide dans le lien.' }
  }

  return { valid: true, sanitized: parsed.toString() }
}

/**
 * Validates complete business contact info input.
 */
export function validateBusinessContactInfo(input: BusinessContactInfoInput): ValidationResult {
  let sanitizedPhone: string | null = null
  let sanitizedBookingUrl: string | null = null
  let sanitizedAppointmentUrl: string | null = null

  if (input.phone !== undefined && input.phone !== null && input.phone.trim() !== '') {
    const phoneRes = validatePhone(input.phone)
    if (!phoneRes.valid) {
      return { valid: false, error: phoneRes.error }
    }
    sanitizedPhone = phoneRes.sanitized || null
  }

  if (input.bookingUrl !== undefined && input.bookingUrl !== null && input.bookingUrl.trim() !== '') {
    const bookingRes = validateUrl(input.bookingUrl)
    if (!bookingRes.valid) {
      return { valid: false, error: bookingRes.error }
    }
    sanitizedBookingUrl = bookingRes.sanitized || null
  }

  if (input.appointmentUrl !== undefined && input.appointmentUrl !== null && input.appointmentUrl.trim() !== '') {
    const apptRes = validateUrl(input.appointmentUrl)
    if (!apptRes.valid) {
      return { valid: false, error: apptRes.error }
    }
    sanitizedAppointmentUrl = apptRes.sanitized || null
  }

  return {
    valid: true,
    sanitized: {
      phone: sanitizedPhone,
      bookingUrl: sanitizedBookingUrl,
      appointmentUrl: sanitizedAppointmentUrl,
    },
  }
}

/**
 * Retrieves business contact & conversion info from knowledge_facts & businesses.
 */
export async function getBusinessContactInfo(businessId: string): Promise<BusinessContactInfo> {
  const supabase = await createClient()

  const [factsRes, bizRes] = await Promise.all([
    supabase
      .from('knowledge_facts')
      .select('fact_key, value, status')
      .eq('business_id', businessId)
      .eq('namespace', 'contact')
      .eq('status', 'APPROVED'),
    supabase
      .from('businesses')
      .select('booking_url')
      .eq('id', businessId)
      .maybeSingle(),
  ])

  let phone: string | null = null
  let bookingUrl: string | null = bizRes.data?.booking_url || null
  let appointmentUrl: string | null = null

  if (factsRes.data) {
    for (const fact of factsRes.data) {
      const val = typeof fact.value === 'object' && fact.value !== null && 'value' in fact.value
        ? String((fact.value as { value: unknown }).value)
        : null

      if (!val) continue

      if (fact.fact_key === 'phone') {
        phone = val
      } else if (fact.fact_key === 'booking_url') {
        bookingUrl = val
      } else if (fact.fact_key === 'appointment_url') {
        appointmentUrl = val
      }
    }
  }

  return {
    phone,
    bookingUrl,
    appointmentUrl,
  }
}

/**
 * Atomically saves business contact info into knowledge_facts and businesses.booking_url.
 */
export async function saveBusinessContactInfo(
  businessId: string,
  input: BusinessContactInfoInput
): Promise<{ success: boolean; data?: BusinessContactInfo; error?: string }> {
  const validation = validateBusinessContactInfo(input)
  if (!validation.valid || !validation.sanitized) {
    return { success: false, error: validation.error || 'Informations de contact invalides.' }
  }

  const supabase = await createClient()

  // 1. Sync businesses.booking_url if bookingUrl was provided
  if (input.bookingUrl !== undefined) {
    const { error: bizErr } = await supabase
      .from('businesses')
      .update({
        booking_url: validation.sanitized.bookingUrl,
        updated_at: new Date().toISOString(),
      })
      .eq('id', businessId)

    if (bizErr) {
      console.error('Error updating businesses.booking_url:', bizErr)
    }
  }

  // 2. Upsert into knowledge_facts for each provided key
  const keysToProcess: Array<{ key: 'phone' | 'booking_url' | 'appointment_url'; val: string | null }> = []

  if (input.phone !== undefined) {
    keysToProcess.push({ key: 'phone', val: validation.sanitized.phone })
  }
  if (input.bookingUrl !== undefined) {
    keysToProcess.push({ key: 'booking_url', val: validation.sanitized.bookingUrl })
  }
  if (input.appointmentUrl !== undefined) {
    keysToProcess.push({ key: 'appointment_url', val: validation.sanitized.appointmentUrl })
  }

  for (const item of keysToProcess) {
    // First remove previous approved fact for this key
    await supabase
      .from('knowledge_facts')
      .delete()
      .eq('business_id', businessId)
      .eq('namespace', 'contact')
      .eq('fact_key', item.key)

    if (item.val) {
      const { error: insertErr } = await supabase
        .from('knowledge_facts')
        .insert({
          business_id: businessId,
          namespace: 'contact',
          fact_key: item.key,
          value: { value: item.val },
          origin: 'USER_DECLARED',
          confidence: 1.0,
          status: 'APPROVED',
        })

      if (insertErr) {
        console.error(`Error inserting knowledge_fact for ${item.key}:`, insertErr)
      }
    }
  }

  const updated = await getBusinessContactInfo(businessId)
  return { success: true, data: updated }
}
