/**
 * Timezone & local wall-clock conversion utilities for Studio Mūza.
 * Strictly deterministic, 0 external AI calls.
 */

/**
 * Validates that an IANA timezone string is recognized and supported by the runtime.
 */
export function isValidIanaTimeZone(timeZone: string): boolean {
  if (!timeZone || typeof timeZone !== 'string' || timeZone.length > 50) {
    return false
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone })
    return true
  } catch {
    return false
  }
}

export interface WallClockConversionResult {
  success: boolean
  utcIsoString?: string
  utcDate?: Date
  message?: string
}

/**
 * Converts a validated local wall-clock date and time in an IANA timezone into a UTC ISO 8601 string.
 *
 * Algorithm:
 * - Validates formats (YYYY-MM-DD, HH:mm).
 * - Checks calendar validity (leap years, 28-31 days).
 * - Uses iterative Intl.DateTimeFormat projection to resolve the exact UTC instant matching
 *   the user's local wall-clock hour and minute in that timezone, correctly handling DST offsets.
 * - Rejects dates in the past (minimum 60 seconds from now).
 */
export function convertLocalWallClockToUTC(
  localDate: string,
  localTime: string,
  timeZone: string,
  referenceNowMs: number = Date.now()
): WallClockConversionResult {
  // 1. Timezone validation
  if (!isValidIanaTimeZone(timeZone)) {
    return {
      success: false,
      message: `Fuseau horaire invalide ou non supporté : "${timeZone}".`,
    }
  }

  // 2. Format validation
  const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/
  const timeRegex = /^(\d{2}):(\d{2})$/

  const dateMatch = localDate?.trim().match(dateRegex)
  const timeMatch = localTime?.trim().match(timeRegex)

  if (!dateMatch) {
    return {
      success: false,
      message: 'Format de date invalide (attendu: AAAA-MM-JJ).',
    }
  }

  if (!timeMatch) {
    return {
      success: false,
      message: 'Format d’heure invalide (attendu: HH:MM).',
    }
  }

  const year = parseInt(dateMatch[1], 10)
  const month = parseInt(dateMatch[2], 10)
  const day = parseInt(dateMatch[3], 10)
  const hour = parseInt(timeMatch[1], 10)
  const minute = parseInt(timeMatch[2], 10)

  if (month < 1 || month > 12) {
    return { success: false, message: 'Mois invalide.' }
  }

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return { success: false, message: 'Heure invalide (00:00 à 23:59).' }
  }

  // Check valid day of month
  const testUtc = new Date(Date.UTC(year, month - 1, day))
  if (
    testUtc.getUTCFullYear() !== year ||
    testUtc.getUTCMonth() !== month - 1 ||
    testUtc.getUTCDate() !== day
  ) {
    return { success: false, message: 'Jour du mois inexistant pour cette date.' }
  }

  // 3. Iterative wall-clock to UTC projection
  // Start with target wall-clock as an initial UTC guess:
  let guessMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0)

  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })

  // Format parts to see what local wall-clock time `guessMs` projects to in `timeZone`:
  for (let iteration = 0; iteration < 4; iteration++) {
    const parts = dtf.formatToParts(new Date(guessMs))
    const pYear = parseInt(parts.find((p) => p.type === 'year')?.value || '0', 10)
    const pMonth = parseInt(parts.find((p) => p.type === 'month')?.value || '0', 10)
    const pDay = parseInt(parts.find((p) => p.type === 'day')?.value || '0', 10)
    const pHour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10)
    const pMin = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10)

    const projectedLocalMs = Date.UTC(pYear, pMonth - 1, pDay, pHour, pMin, 0, 0)
    const targetLocalMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0)
    const diffMs = targetLocalMs - projectedLocalMs

    if (diffMs === 0) {
      break
    }
    guessMs += diffMs
  }

  const resultUtcDate = new Date(guessMs)

  // 4. Validate not in the past (must be at least 60 seconds in the future)
  if (resultUtcDate.getTime() < referenceNowMs + 60_000) {
    return {
      success: false,
      message: 'La date et l’heure de planification doivent être dans le futur.',
    }
  }

  return {
    success: true,
    utcIsoString: resultUtcDate.toISOString(),
    utcDate: resultUtcDate,
  }
}
