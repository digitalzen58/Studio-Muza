import type {
  VisualComposition,
  VisualElement,
  VisualTextElement,
  VisualEmojiElement,
  VisualBackground,
  BackgroundEffectType,
  BackgroundGradientDirection,
  TextEffectType,
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

  // Optional Effect Sanitization
  const validEffectTypes: BackgroundEffectType[] = ['none', 'grain', 'paper', 'soft', 'light', 'vignette', 'glass']
  let sanitizedEffect = undefined
  if (rawBg.effect && typeof rawBg.effect === 'object') {
    const rawEffectType = (rawBg.effect.type || 'none') as BackgroundEffectType
    const effectType = validEffectTypes.includes(rawEffectType) ? rawEffectType : 'none'
    const intensity = clamp(typeof rawBg.effect.intensity === 'number' ? rawBg.effect.intensity : 0.35, 0.0, 1.0)
    sanitizedEffect = {
      type: effectType,
      intensity,
    }
  }

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
      ...(sanitizedEffect ? { effect: sanitizedEffect } : {}),
    }
  } else if (rawBg.type === 'GRADIENT') {
    const validDirections: BackgroundGradientDirection[] = ['to bottom', 'to right', 'to bottom right', 'radial']
    const rawGrad = rawBg.gradient || { from: '#FBF9F5', to: '#EDE4D8', direction: 'to bottom' }
    const from = rawGrad.from && VALID_COLOR_HEX.test(rawGrad.from) ? rawGrad.from : '#FBF9F5'
    const to = rawGrad.to && VALID_COLOR_HEX.test(rawGrad.to) ? rawGrad.to : '#EDE4D8'
    const rawDir = rawGrad.direction as BackgroundGradientDirection
    const direction = validDirections.includes(rawDir) ? rawDir : 'to bottom'

    sanitizedBg = {
      type: 'GRADIENT',
      color: from,
      gradient: {
        from,
        to,
        direction,
      },
      positionX: 0,
      positionY: 0,
      scale: 1.0,
      ...(sanitizedEffect ? { effect: sanitizedEffect } : {}),
    }
  } else if (rawBg.type === 'COLOR') {
    const color = rawBg.color && VALID_COLOR_HEX.test(rawBg.color) ? rawBg.color : '#FDFBF7'
    sanitizedBg = {
      type: 'COLOR',
      color,
      positionX: 0,
      positionY: 0,
      scale: 1.0,
      ...(sanitizedEffect ? { effect: sanitizedEffect } : {}),
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

      // Optional rich text customization fields
      const fontFamily = typeof rawEl.fontFamily === 'string' ? sanitizeString(rawEl.fontFamily).slice(0, 60) : undefined
      const fontSize = typeof rawEl.fontSize === 'number' ? clamp(rawEl.fontSize, 0.4, 4.0) : undefined
      const fontWeight = rawEl.fontWeight === 'bold' || rawEl.fontWeight === 'normal' ? rawEl.fontWeight : undefined
      const fontStyle = rawEl.fontStyle === 'italic' || rawEl.fontStyle === 'normal' ? rawEl.fontStyle : undefined
      const color = typeof rawEl.color === 'string' && (VALID_COLOR_HEX.test(rawEl.color) || rawEl.color.startsWith('rgb')) ? rawEl.color : undefined
      const align = rawEl.align === 'left' || rawEl.align === 'right' || rawEl.align === 'center' ? rawEl.align : undefined
      const letterSpacing = typeof rawEl.letterSpacing === 'string' ? sanitizeString(rawEl.letterSpacing).slice(0, 20) : undefined
      const uppercase = typeof rawEl.uppercase === 'boolean' ? rawEl.uppercase : undefined
      const autoContrast = typeof rawEl.autoContrast === 'boolean' ? rawEl.autoContrast : undefined

      // Optional text effect sanitization
      let sanitizedTextEffect = undefined
      if (rawEl.effect && typeof rawEl.effect === 'object') {
        const validEffectTypes: TextEffectType[] = ['none', 'shadow', 'outline', 'highlight', 'glow', 'relief']
        const rawType = (rawEl.effect.type || 'none') as TextEffectType
        const type = validEffectTypes.includes(rawType) ? rawType : 'none'
        const effectColor = typeof rawEl.effect.color === 'string' && (VALID_COLOR_HEX.test(rawEl.effect.color) || rawEl.effect.color.startsWith('rgb')) ? rawEl.effect.color : undefined
        const intensity = typeof rawEl.effect.intensity === 'number' ? clamp(rawEl.effect.intensity, 0.0, 1.0) : undefined
        const size = typeof rawEl.effect.size === 'number' ? clamp(rawEl.effect.size, 1, 10) : undefined

        sanitizedTextEffect = {
          type,
          ...(effectColor ? { color: effectColor } : {}),
          ...(typeof intensity === 'number' ? { intensity } : {}),
          ...(typeof size === 'number' ? { size } : {}),
        }
      }

      const textEl: VisualTextElement = {
        id,
        type: 'TEXT',
        text: cleanText,
        x,
        y,
        scale,
        colorMode,
        boxStyle,
        ...(fontFamily ? { fontFamily } : {}),
        ...(typeof fontSize === 'number' ? { fontSize } : {}),
        ...(fontWeight ? { fontWeight } : {}),
        ...(fontStyle ? { fontStyle } : {}),
        ...(color ? { color } : {}),
        ...(align ? { align } : {}),
        ...(letterSpacing ? { letterSpacing } : {}),
        ...(typeof uppercase === 'boolean' ? { uppercase } : {}),
        ...(typeof autoContrast === 'boolean' ? { autoContrast } : {}),
        ...(sanitizedTextEffect ? { effect: sanitizedTextEffect } : {}),
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
