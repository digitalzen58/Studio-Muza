/**
 * Visual Composition Data Model for Studio Mūza.
 * Uses normalized (0 to 1) coordinates and relative scale factors to ensure
 * cross-device responsiveness and multi-network adaptability.
 */

export type VisualElementType = 'TEXT' | 'EMOJI'
export type VisualBackgroundType = 'IMAGE' | 'COLOR'
export type VisualColorMode = 'LIGHT' | 'DARK'
export type VisualBoxStyle = 'NONE' | 'PILL'

export interface VisualTextElement {
  id: string
  type: 'TEXT'
  text: string
  // Normalized center coordinates (0.0 to 1.0)
  x: number
  y: number
  // Relative scale (0.5 to 3.0, default 1.0)
  scale: number
  // Visual color mode (LIGHT = white text with subtle shadow, DARK = dark text)
  colorMode: VisualColorMode
  // Optional background pill for high contrast
  boxStyle?: VisualBoxStyle
}

export interface VisualEmojiElement {
  id: string
  type: 'EMOJI'
  value: string
  // Normalized center coordinates (0.0 to 1.0)
  x: number
  y: number
  // Relative scale (0.5 to 3.0, default 1.0)
  scale: number
}

export type VisualElement = VisualTextElement | VisualEmojiElement

export interface VisualBackground {
  type: VisualBackgroundType
  mediaAssetId?: string | null
  mediaUrl?: string | null
  color?: string
  // Normalized pan offset (-1.0 to 1.0, default 0)
  positionX?: number
  positionY?: number
  // Zoom scale (1.0 to 3.0, default 1.0)
  scale?: number
}

export interface VisualComposition {
  version: 1
  aspectRatio: '4:5' | '1:1'
  background: VisualBackground
  elements: VisualElement[]
}

/**
 * Curated brand background colors for Studio Mūza
 */
export const BRAND_BACKGROUND_COLORS = [
  { label: 'Crème Zen', hex: '#FBF9F5', textMode: 'DARK' as const },
  { label: 'Bleu Digital Zen', hex: '#1E4E8C', textMode: 'LIGHT' as const },
  { label: 'Bleu ciel doux', hex: '#EDF4FC', textMode: 'DARK' as const },
  { label: 'Bleu nuit', hex: '#0F1E36', textMode: 'LIGHT' as const },
  { label: 'Bleu grisé', hex: '#E2E8F0', textMode: 'DARK' as const },
  { label: 'Blanc pur', hex: '#FFFFFF', textMode: 'DARK' as const },
]

/**
 * Curated compact emoji set for quick visual embellishment
 */
export const CURATED_EMOJIS = [
  '❤️', '✨', '🐾', '🍂', '🌿', '☀️',
  '😊', '😍', '📍', '🎉', '👉', '⭐',
  '🐶', '🥐', '🍷', '🏖️', '🌲', '☕',
]

/**
 * Creates a default visual composition for a post
 */
export function createDefaultVisualComposition(
  primaryMediaId?: string | null,
  mediaUrl?: string | null
): VisualComposition {
  return {
    version: 1,
    aspectRatio: '4:5',
    background: primaryMediaId
      ? {
          type: 'IMAGE',
          mediaAssetId: primaryMediaId,
          mediaUrl: mediaUrl || null,
          positionX: 0,
          positionY: 0,
          scale: 1.0,
        }
      : {
          type: 'COLOR',
          color: '#FBF9F5',
          positionX: 0,
          positionY: 0,
          scale: 1.0,
        },
    elements: [],
  }
}
