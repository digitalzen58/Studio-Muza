import type {
  VisualComposition,
  VisualElement,
  VisualTextElement,
  VisualEmojiElement,
  VisualBackground,
} from './types'

export interface VisualValidationResult {
  valid: boolean
  error?: string
  sanitized?: VisualComposition
}

const MAX_ELEMENTS = 20
const MAX_TEXT_LENGTH = 300
const VALID_ASPECT_RATIOS = ['4:5', '1:1']
const VALID_COLOR_HEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/

function sanitizeString(str: string): string {
  return str.replace(/<[^>]*>?/gm, '').trim()
}

function clamp(val: number, min: number, max: number): number {
  if (typeof val !== 'number' || isNaN(val)) return min
  return Math.max(min, Math.min(max, val))
}

/**
 * Validates and sanitizes a VisualComposition payload received by server actions.
 * Enforces strict boundaries to prevent injection, corrupted payloads, or rendering exploits.
 */
export function validateVisualComposition(input: unknown): VisualValidationResult {
  if (!input || typeof input !== 'object') {
    return { valid: false, error: 'Composition visuelle invalide.' }
  }

  const comp = input as Partial<VisualComposition>

  if (comp.version !== 1) {
    return { valid: false, error: 'Version de composition non supportée.' }
  }

  const aspectRatio = VALID_ASPECT_RATIOS.includes(comp.aspectRatio || '')
    ? (comp.aspectRatio as '4:5' | '1:1')
    : '4:5'

  // 1. Validate Background
  if (!comp.background || typeof comp.background !== 'object') {
    return { valid: false, error: 'Arrière-plan de composition manquant.' }
  }

  const rawBg = comp.background as Partial<VisualBackground>
  let sanitizedBg: VisualBackground

  if (rawBg.type === 'IMAGE') {
    if (!rawBg.mediaAssetId || typeof rawBg.mediaAssetId !== 'string') {
      return { valid: false, error: 'Identifiant de photo manquant pour le fond image.' }
    }
    sanitizedBg = {
      type: 'IMAGE',
      mediaAssetId: sanitizeString(rawBg.mediaAssetId),
      mediaUrl: rawBg.mediaUrl ? sanitizeString(rawBg.mediaUrl) : null,
      positionX: clamp(rawBg.positionX ?? 0, -1.5, 1.5),
      positionY: clamp(rawBg.positionY ?? 0, -1.5, 1.5),
      scale: clamp(rawBg.scale ?? 1.0, 0.8, 4.0),
    }
  } else if (rawBg.type === 'COLOR') {
    const color = rawBg.color && VALID_COLOR_HEX.test(rawBg.color) ? rawBg.color : '#FDFBF7'
    sanitizedBg = {
      type: 'COLOR',
      color,
      positionX: 0,
      positionY: 0,
      scale: 1.0,
    }
  } else {
    return { valid: false, error: 'Type d’arrière-plan non supporté.' }
  }

  // 2. Validate Elements
  const rawElements = Array.isArray(comp.elements) ? comp.elements : []
  if (rawElements.length > MAX_ELEMENTS) {
    return {
      valid: false,
      error: `La composition ne peut pas contenir plus de ${MAX_ELEMENTS} éléments.`,
    }
  }

  const sanitizedElements: VisualElement[] = []

  for (const rawEl of rawElements) {
    if (!rawEl || typeof rawEl !== 'object' || !rawEl.id || typeof rawEl.id !== 'string') {
      continue
    }

    const id = sanitizeString(rawEl.id).slice(0, 50)
    const x = clamp(rawEl.x ?? 0.5, -0.2, 1.2)
    const y = clamp(rawEl.y ?? 0.5, -0.2, 1.2)
    const scale = clamp(rawEl.scale ?? 1.0, 0.4, 4.0)

    if (rawEl.type === 'TEXT') {
      const rawText = typeof rawEl.text === 'string' ? rawEl.text : ''
      const cleanText = sanitizeString(rawText).slice(0, MAX_TEXT_LENGTH)
      if (!cleanText) continue

      const colorMode = rawEl.colorMode === 'LIGHT' ? 'LIGHT' : 'DARK'
      const boxStyle = rawEl.boxStyle === 'PILL' ? 'PILL' : 'NONE'

      const textEl: VisualTextElement = {
        id,
        type: 'TEXT',
        text: cleanText,
        x,
        y,
        scale,
        colorMode,
        boxStyle,
      }
      sanitizedElements.push(textEl)
    } else if (rawEl.type === 'EMOJI') {
      const rawVal = typeof rawEl.value === 'string' ? rawEl.value : ''
      const cleanVal = sanitizeString(rawVal).slice(0, 10)
      if (!cleanVal) continue

      const emojiEl: VisualEmojiElement = {
        id,
        type: 'EMOJI',
        value: cleanVal,
        x,
        y,
        scale,
      }
      sanitizedElements.push(emojiEl)
    }
  }

  return {
    valid: true,
    sanitized: {
      version: 1,
      aspectRatio,
      background: sanitizedBg,
      elements: sanitizedElements,
    },
  }
}
