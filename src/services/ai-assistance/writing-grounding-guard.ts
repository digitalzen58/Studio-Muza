import type { WritingOperation } from './types'

export interface GroundingValidationContext {
  operation: WritingOperation
  currentText: string
  hasStockMedia?: boolean
  businessName?: string
}

export interface GroundingValidationResult {
  isValid: boolean
  reason?: string
}

const FORBIDDEN_PATTERNS: Array<{ regex: RegExp; label: string }> = [
  // Prices and monetary claims
  { regex: /\b\d+[\s,]*(?:€|euros?)\b/i, label: 'prix ou tarif précis' },
  { regex: /\b(?:tarif|prix)\s+de\s+\d+/i, label: 'tarif chiffré' },

  // Percentages and statistical claims
  { regex: /\b\d+\s?%\b/i, label: 'pourcentage non vérifié' },

  // Ratings and reviews
  { regex: /\b\d+(?:[.,]\d+)?\s?\/\s?5\b/i, label: 'note sur 5' },
  { regex: /\b\d+\s*étoiles?\b/i, label: 'classement étoilé' },
  { regex: /\b(?:avis\s+google|avis\s+tripadvisor|noté\s+\d+)\b/i, label: 'référence d’avis tiers' },

  // Superlative / awards claims
  { regex: /\b(?:numéro\s+1|n°\s?1|le\s+meilleur|la\s+meilleure|élu\s+meilleur|primé\s+par)\b/i, label: 'affirmation de supériorité ou récompense' },

  // Travel times and distances
  { regex: /\bà\s+\d+\s*(?:km|kilomètres?|minutes?|min|h|heures?)\b/i, label: 'distance ou temps de trajet chiffré' },

  // Specific dates / opening guarantees
  { regex: /\b(?:ouvert\s+du|dès\s+le\s+\d{1,2}|réservation\s+garantie)\b/i, label: 'date précise ou garantie contractuelle' },

  // Fabricated customer quotes
  { regex: /\b(?:selon\s+nos\s+clients|nos\s+hôtes\s+disent|témoignage\s+de)\b/i, label: 'citation client non vérifiée' },

  // Search volume / live trend claims
  { regex: /\b(?:le\s+plus\s+recherché|en\s+tendance|volume\s+de\s+recherche)\b/i, label: 'affirmation de volume de recherche' },

  // Unverified luxury amenities (common hallucinations)
  { regex: /\b(?:jacuzzi|spa\s+privatif|piscine\s+chauffée|sauna\s+finlandais|borne\s+tesla)\b/i, label: 'équipement spécifique non déclaré' },
]

const STOCK_ILLUSTRATION_PROHIBITED = [
  /\bvoici\s+notre\s+(?:jardin|chambre|terrasse|salon|piscine|propriété)\b/i,
  /\bdécouvrez\s+notre\s+(?:chambre|suite|lit|salle\s+de\s+bains)\b/i,
  /\bchez\s+nous,\s+voici\s+la\s+vue\b/i,
  /\bphoto\s+de\s+notre\s+(?:chambre|gîte|établissement)\b/i,
]

/**
 * Validates generated writing suggestions against deterministic anti-invention constraints.
 * Fails closed without modifying user text.
 */
export function validateWritingAssistanceGrounding(
  text: string,
  context: GroundingValidationContext
): GroundingValidationResult {
  const normalized = text.trim()
  if (!normalized) {
    return {
      isValid: false,
      reason: 'La suggestion reçue est vide.',
    }
  }

  // 1. Check general forbidden patterns (prices, ratings, awards, unverified claims)
  for (const { regex, label } of FORBIDDEN_PATTERNS) {
    // If the pattern was already present in the user's original text, permit it
    const presentInOriginal = context.currentText && regex.test(context.currentText)
    if (!presentInOriginal && regex.test(normalized)) {
      return {
        isValid: false,
        reason: `La suggestion comportait des éléments non vérifiés (${label}) et n’a pas été appliquée. Votre texte est resté intact.`,
      }
    }
  }

  // 2. Stock image authenticity protection
  // If the slide is illustrated by stock media, reject claiming the image as authentic property/room evidence
  if (context.hasStockMedia) {
    for (const pattern of STOCK_ILLUSTRATION_PROHIBITED) {
      if (pattern.test(normalized)) {
        return {
          isValid: false,
          reason: 'La suggestion présentait une photo d’illustration comme une preuve réelle de l’établissement et a été rejetée. Votre texte est resté intact.',
        }
      }
    }
  }

  // 3. Factual containment for IMPROVE_TEXT and SHORTEN_TEXT
  // Should not invent brand new numeric quantities if none existed in original text
  if (context.operation === 'IMPROVE_TEXT' || context.operation === 'SHORTEN_TEXT') {
    const originalNumbers = (context.currentText.match(/\b\d+\b/g) || []).map(Number)
    const suggestedNumbers = (normalized.match(/\b\d+\b/g) || []).map(Number)

    for (const num of suggestedNumbers) {
      // Allow minor numbers (e.g. 1, 2, 3 in bullet points or steps) but reject new quantities/years/metrics
      if (!originalNumbers.includes(num) && num > 5) {
        return {
          isValid: false,
          reason: 'La suggestion introduisait de nouvelles données chiffrées absentes de votre texte et a été rejetée. Votre texte est resté intact.',
        }
      }
    }
  }

  return { isValid: true }
}
