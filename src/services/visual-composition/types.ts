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
  { label: 'Ivoire chaud', hex: '#FDFBF7', textMode: 'DARK' as const },
  { label: 'Terracotta', hex: '#C85A32', textMode: 'LIGHT' as const },
  { label: 'Terracotta clair', hex: '#F4ECE6', textMode: 'DARK' as const },
  { label: 'Sable chaud', hex: '#E8DFD8', textMode: 'DARK' as const },
  { label: 'Sauge', hex: '#5A6B5C', textMode: 'LIGHT' as const },
  { label: 'Charbon doux', hex: '#1E1E24', textMode: 'LIGHT' as const },
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
          color: '#FDFBF7',
          positionX: 0,
          positionY: 0,
          scale: 1.0,
        },
    elements: [],
  }
}
