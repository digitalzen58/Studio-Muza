import type { MuzaBusinessModel } from '@/types/muza-industry-playbook'

/**
 * Result of resolving a business model from industry and subindustry strings.
 */
export type MuzaIndustryResolution = {
  businessModel: MuzaBusinessModel
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  matchedKeywords: string[]
}

type KeywordConfig = {
  phrase: string
  confidence?: 'HIGH' | 'MEDIUM'
}

type ModelRule = {
  model: MuzaBusinessModel
  priority: number
  keywords: (string | KeywordConfig)[]
}

/**
 * COLLISION PRIORITY HIERARCHY (Explicitly specified):
 * 1. ECOMMERCE - Explicit sales model overrides product type (e.g. online store for handmade jewelry)
 * 2. HOSPITALITY - Specific accommodation / travel business model
 * 3. FOOD_BEVERAGE - Catering, restaurant, dining business model
 * 4. HEALTH_WELLNESS - Non-medical wellness and care services
 * 5. ARTISAN - Crafting and handmade production
 * 6. LOCAL_SERVICE - On-site / local personal services
 * 7. PROFESSIONAL_SERVICE - B2B or specialized consulting & professional services
 * 8. CREATOR_EXPERT - Coaching, training, and content creation
 * 9. RETAIL - Physical retail store / boutique
 * 10. OTHER - Fallback when no clear match is identified
 */
const MODEL_RULES: ModelRule[] = [
  {
    model: 'ECOMMERCE',
    priority: 1,
    keywords: [
      'ecommerce',
      'e-commerce',
      'e commerce',
      'boutique en ligne',
      'online store',
      'online shop',
      'dropshipping',
    ],
  },
  {
    model: 'HOSPITALITY',
    priority: 2,
    keywords: [
      'gite',
      'gites',
      'gîte',
      'gîtes',
      "chambre d'hotes",
      "chambres d'hotes",
      "chambre d'hote",
      "chambres d'hote",
      'chambre d’hotes',
      'chambres d’hotes',
      'chambre d’hôtes',
      'chambres d’hôtes',
      'hotel',
      'hotels',
      'hôtel',
      'hôtels',
      { phrase: 'hebergement', confidence: 'MEDIUM' },
      { phrase: 'hébergement', confidence: 'MEDIUM' },
      'location saisonniere',
      'location saisonnière',
      'locations saisonnieres',
      'locations saisonnières',
      'holiday rental',
      'vacation rental',
      'guesthouse',
      'bed and breakfast',
      'b&b',
      'camping',
      'campings',
    ],
  },
  {
    model: 'FOOD_BEVERAGE',
    priority: 3,
    keywords: [
      'restaurant',
      'restaurants',
      'cafe',
      'cafes',
      'café',
      'cafés',
      'bar',
      'bars',
      'bistrot',
      'bistrots',
      'bistro',
      'bistros',
      'brasserie',
      'brasseries',
      'traiteur',
      'traiteurs',
      'catering',
      'bakery',
      'boulangerie',
      'boulangeries',
      'patisserie',
      'patisseries',
      'pâtisserie',
      'pâtisseries',
      'food truck',
      'foodtruck',
    ],
  },
  {
    model: 'HEALTH_WELLNESS',
    priority: 4,
    keywords: [
      'spa',
      'spas',
      'massage',
      'massages',
      'masseur',
      'masseurs',
      'masseuse',
      'masseuses',
      'therapeute',
      'thérapeute',
      'therapeutes',
      'thérapeutes',
      'naturopathe',
      'naturopathes',
      'sophrologue',
      'sophrologues',
      'yoga',
      'pilates',
      { phrase: 'bien etre', confidence: 'MEDIUM' },
      { phrase: 'bien-être', confidence: 'MEDIUM' },
      { phrase: 'wellness', confidence: 'MEDIUM' },
    ],
  },
  {
    model: 'ARTISAN',
    priority: 5,
    keywords: [
      'artisan',
      'artisans',
      'artisanat',
      'artisanal',
      'artisanale',
      'artisanaux',
      'menuisier',
      'menuisiers',
      'menuiserie',
      'ebeniste',
      'ébéniste',
      'ebenistes',
      'ébénistes',
      'ebenisterie',
      'potier',
      'potiers',
      'poterie',
      'ceramiste',
      'céramiste',
      'ceramistes',
      'céramistes',
      'ceramique',
      'céramique',
      'couturier',
      'couturiere',
      'couturière',
      'couturiers',
      'couturières',
      'couture',
      'bijoutier',
      'bijoutiere',
      'bijoutière',
      'bijoutiers',
      'bijoutières',
      'bijouterie',
      'bijoux',
      'fleuriste',
      'fleuristes',
      'savonnier',
      'savonniers',
      'savonnerie',
      'savonneries',
    ],
  },
  {
    model: 'LOCAL_SERVICE',
    priority: 6,
    keywords: [
      'coiffeur',
      'coiffeuse',
      'coiffeurs',
      'coiffeuses',
      'coiffure',
      'coiffures',
      'barber',
      'barbers',
      'barbier',
      'barbiers',
      'estheticienne',
      'esthéticienne',
      'estheticiennes',
      'esthéticiennes',
      'esthetique',
      'esthétique',
      'toiletteur',
      'toiletteurs',
      'toilettage',
      'photographe',
      'photographes',
      'photographie',
      { phrase: 'nettoyage', confidence: 'MEDIUM' },
      { phrase: 'cleaning', confidence: 'MEDIUM' },
      'jardinier',
      'jardiniers',
      'jardinage',
      'paysagiste',
      'paysagistes',
    ],
  },
  {
    model: 'PROFESSIONAL_SERVICE',
    priority: 7,
    keywords: [
      'consultant',
      'consultante',
      'consultants',
      'consultantes',
      'consulting',
      'comptable',
      'comptables',
      'comptabilite',
      'accountant',
      'accounting',
      'avocat',
      'avocate',
      'avocats',
      'avocates',
      'lawyer',
      'lawyers',
      'architecte',
      'architectes',
      { phrase: 'agence', confidence: 'MEDIUM' },
      { phrase: 'agency', confidence: 'MEDIUM' },
      { phrase: 'freelance', confidence: 'MEDIUM' },
      { phrase: 'designer', confidence: 'MEDIUM' },
      { phrase: 'designers', confidence: 'MEDIUM' },
      'developpeur',
      'développeur',
      'developpeurs',
      'développeurs',
      'developer',
      'developers',
    ],
  },
  {
    model: 'CREATOR_EXPERT',
    priority: 8,
    keywords: [
      'coach',
      'coaches',
      'coaching',
      'formateur',
      'formatrice',
      'formateurs',
      'formatrices',
      'formation',
      'formations',
      'trainer',
      'trainers',
      { phrase: 'creator', confidence: 'MEDIUM' },
      { phrase: 'createur', confidence: 'MEDIUM' },
      { phrase: 'créateur', confidence: 'MEDIUM' },
      'influenceur',
      'influenceuse',
      'influenceurs',
      'influenceuses',
      'mentor',
      'mentors',
      'mentorat',
      'conferencier',
      'conférencier',
      'conferenciers',
      'conférenciers',
    ],
  },
  {
    model: 'RETAIL',
    priority: 9,
    keywords: [
      { phrase: 'boutique', confidence: 'MEDIUM' },
      { phrase: 'boutiques', confidence: 'MEDIUM' },
      { phrase: 'magasin', confidence: 'MEDIUM' },
      { phrase: 'magasins', confidence: 'MEDIUM' },
      { phrase: 'shop', confidence: 'MEDIUM' },
      { phrase: 'shops', confidence: 'MEDIUM' },
      { phrase: 'store', confidence: 'MEDIUM' },
      { phrase: 'stores', confidence: 'MEDIUM' },
      'concept store',
      'concept-store',
      'concept stores',
      'librairie',
      'librairies',
    ],
  },
]

/**
 * Normalizes a text string for deterministic matching:
 * - Converts to lower case
 * - Strips accents and diacritics
 * - Replaces punctuation and separators with spaces
 * - Collapses multiple spaces into single spaces
 * - Trims leading and trailing whitespace
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’\-–—_/.,;:!&()?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Safely escapes special regex characters.
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Checks if a normalized keyword phrase matches inside normalized target text
 * using exact token / word boundaries to prevent false substring matches.
 */
function matchesKeyword(normalizedText: string, keywordPhrase: string): boolean {
  const normKw = normalizeText(keywordPhrase)
  if (!normKw) return false

  const regex = new RegExp(`(?:^|\\s)${escapeRegex(normKw)}(?:$|\\s)`, 'i')
  return regex.test(normalizedText)
}

/**
 * Deterministically resolves a MuzaBusinessModel based on industry and subindustry text.
 * Pure function: no side-effects, no network, no environment variables.
 *
 * @param industry - Primary industry description
 * @param subindustry - Optional subindustry description
 * @returns MuzaIndustryResolution containing resolved business model, confidence, and matched keywords
 */
export function resolveMuzaBusinessModel(
  industry: string,
  subindustry: string | null
): MuzaIndustryResolution {
  const normalizedIndustry = normalizeText(industry || '')
  const normalizedSubindustry = subindustry ? normalizeText(subindustry) : ''

  const combinedText = [normalizedIndustry, normalizedSubindustry]
    .filter(Boolean)
    .join(' ')

  if (!combinedText) {
    return {
      businessModel: 'OTHER',
      confidence: 'LOW',
      matchedKeywords: [],
    }
  }

  type CandidateMatch = {
    model: MuzaBusinessModel
    priority: number
    matchedKeywords: string[]
    hasHighConfidenceMatch: boolean
  }

  const candidateMatches: CandidateMatch[] = []

  for (const rule of MODEL_RULES) {
    const matchedKeywordsForModel: string[] = []
    let hasHighConfidence = false

    for (const kwItem of rule.keywords) {
      const phrase = typeof kwItem === 'string' ? kwItem : kwItem.phrase
      const kwConfidence = typeof kwItem === 'string' ? 'HIGH' : (kwItem.confidence ?? 'HIGH')

      if (matchesKeyword(combinedText, phrase)) {
        const normPhrase = normalizeText(phrase)
        if (!matchedKeywordsForModel.includes(normPhrase)) {
          matchedKeywordsForModel.push(normPhrase)
        }
        if (kwConfidence === 'HIGH') {
          hasHighConfidence = true
        }
      }
    }

    if (matchedKeywordsForModel.length > 0) {
      candidateMatches.push({
        model: rule.model,
        priority: rule.priority,
        matchedKeywords: matchedKeywordsForModel,
        hasHighConfidenceMatch: hasHighConfidence,
      })
    }
  }

  if (candidateMatches.length === 0) {
    return {
      businessModel: 'OTHER',
      confidence: 'LOW',
      matchedKeywords: [],
    }
  }

  // Sort by collision priority (ascending order: 1 is highest priority)
  candidateMatches.sort((a, b) => a.priority - b.priority)

  const winningMatch = candidateMatches[0]

  return {
    businessModel: winningMatch.model,
    confidence: winningMatch.hasHighConfidenceMatch ? 'HIGH' : 'MEDIUM',
    matchedKeywords: winningMatch.matchedKeywords,
  }
}
