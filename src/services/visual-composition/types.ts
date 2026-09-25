/**
 * Visual Composition Data Model for Studio Mūza.
 * Uses normalized (0 to 1) coordinates and relative scale factors to ensure
 * cross-device responsiveness and multi-network adaptability.
 */

export type VisualElementType = 'TEXT' | 'EMOJI'
export type VisualBackgroundType = 'IMAGE' | 'COLOR' | 'GRADIENT'
export type VisualColorMode = 'LIGHT' | 'DARK'
export type VisualBoxStyle = 'NONE' | 'PILL'

export type BackgroundGradientDirection = 'to bottom' | 'to right' | 'to bottom right' | 'radial'

export type BackgroundEffectType = 'none' | 'grain' | 'paper' | 'soft' | 'light' | 'vignette' | 'glass'

export interface BackgroundGradientConfig {
  from: string
  to: string
  direction: BackgroundGradientDirection
}

export interface BackgroundEffectConfig {
  type: BackgroundEffectType
  intensity: number // 0.0 to 1.0 (default 0.35)
}

export type TextEffectType = 'none' | 'shadow' | 'outline' | 'highlight' | 'glow' | 'relief'
export type TextAlign = 'left' | 'center' | 'right'
export type FontWeight = 'normal' | 'bold'
export type FontStyle = 'normal' | 'italic'

export interface TextEffectConfig {
  type: TextEffectType
  color?: string
  intensity?: number // 0.1 to 1.0 (default 0.5)
  size?: number // 1 to 10 (default 2)
}

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

  // Rich text customization
  fontFamily?: string
  fontSize?: number
  fontWeight?: FontWeight
  fontStyle?: FontStyle
  color?: string
  align?: TextAlign
  letterSpacing?: string
  uppercase?: boolean
  autoContrast?: boolean
  effect?: TextEffectConfig
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
  gradient?: BackgroundGradientConfig
  effect?: BackgroundEffectConfig
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
 * Brand default colors for Studio Mūza
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
 * Rich 24-color curated palette for Studio Mūza
 */
export const RICH_BACKGROUND_COLORS = [
  // Neutres & Clairs
  { label: 'Blanc Pur', hex: '#FFFFFF', textMode: 'DARK' as const },
  { label: 'Crème Zen', hex: '#FBF9F5', textMode: 'DARK' as const },
  { label: 'Sable Doux', hex: '#F5EFEB', textMode: 'DARK' as const },
  { label: 'Lin Naturel', hex: '#EAE4DC', textMode: 'DARK' as const },
  { label: 'Gris Perle', hex: '#F1F5F9', textMode: 'DARK' as const },
  { label: 'Ciment Épuré', hex: '#E2E8F0', textMode: 'DARK' as const },

  // Chauds & Terracotta
  { label: 'Pêche Poudrée', hex: '#FDE8E1', textMode: 'DARK' as const },
  { label: 'Blush Rose', hex: '#F7D7DA', textMode: 'DARK' as const },
  { label: 'Terracotta', hex: '#D97757', textMode: 'LIGHT' as const },
  { label: 'Rouge Brique', hex: '#C53030', textMode: 'LIGHT' as const },
  { label: 'Ocre Doré', hex: '#E2A43B', textMode: 'DARK' as const },
  { label: 'Caramel Chaud', hex: '#B45309', textMode: 'LIGHT' as const },

  // Végétaux & Verts
  { label: 'Sauge Douce', hex: '#E3EBDD', textMode: 'DARK' as const },
  { label: 'Menthe Fraîche', hex: '#D1FAE5', textMode: 'DARK' as const },
  { label: 'Vert Sauge', hex: '#84A98C', textMode: 'DARK' as const },
  { label: 'Vert Émeraude', hex: '#2D6A4F', textMode: 'LIGHT' as const },
  { label: 'Olive Sombre', hex: '#3F4E3F', textMode: 'LIGHT' as const },

  // Bleus & Océan
  { label: 'Bleu Ciel', hex: '#EDF4FC', textMode: 'DARK' as const },
  { label: 'Turquoise Doux', hex: '#A7D8DE', textMode: 'DARK' as const },
  { label: 'Bleu Canard', hex: '#0D7685', textMode: 'LIGHT' as const },
  { label: 'Bleu Digital Zen', hex: '#1E4E8C', textMode: 'LIGHT' as const },
  { label: 'Bleu Nuit', hex: '#0F1E36', textMode: 'LIGHT' as const },

  // Mauves & Violet
  { label: 'Lavande Douce', hex: '#EBE4F7', textMode: 'DARK' as const },
  { label: 'Prune Sombre', hex: '#7B2CBF', textMode: 'LIGHT' as const },
]

/**
 * Curated gradient presets for 1-click rich backgrounds
 */
export const CURATED_GRADIENTS = [
  { id: 'creme-beige', label: 'Crème → Beige', from: '#FBF9F5', to: '#EDE4D8', defaultDirection: 'to bottom' as const },
  { id: 'rose-peche', label: 'Rose → Pêche', from: '#FCE7F3', to: '#FFEDD5', defaultDirection: 'to bottom right' as const },
  { id: 'jaune-orange', label: 'Jaune → Orange', from: '#FEF3C7', to: '#FED7AA', defaultDirection: 'to bottom right' as const },
  { id: 'sauge-vert', label: 'Sauge → Vert profond', from: '#E3EBDD', to: '#2D6A4F', defaultDirection: 'to bottom' as const },
  { id: 'turquoise-bleu', label: 'Turquoise → Bleu', from: '#A7D8DE', to: '#1E4E8C', defaultDirection: 'to bottom right' as const },
  { id: 'bleu-marine', label: 'Bleu → Marine', from: '#38BDF8', to: '#0F1E36', defaultDirection: 'to bottom' as const },
  { id: 'violet-rose', label: 'Violet → Rose', from: '#A855F7', to: '#EC4899', defaultDirection: 'to bottom right' as const },
  { id: 'coucher-soleil', label: 'Coucher de soleil', from: '#F43F5E', to: '#F59E0B', defaultDirection: 'to bottom right' as const },
  { id: 'ciel-aura', label: 'Ciel & Aura', from: '#E0F2FE', to: '#F3E8FF', defaultDirection: 'to bottom' as const },
  { id: 'sombre-premium', label: 'Sombre premium', from: '#1E293B', to: '#0F172A', defaultDirection: 'to bottom' as const },
  { id: 'terre-ambre', label: 'Terre & Ambre', from: '#451A03', to: '#78350F', defaultDirection: 'to bottom right' as const },
  { id: 'aurore-boreale', label: 'Aurore boréale', from: '#064E3B', to: '#0F172A', defaultDirection: 'to bottom' as const },
]

/**
 * Curated background overlay effects
 */
export const CURATED_EFFECTS: { id: BackgroundEffectType; label: string; description: string }[] = [
  { id: 'none', label: 'Aucun', description: 'Sans effet additionnel' },
  { id: 'grain', label: 'Grain', description: 'Texture grain photo subtile' },
  { id: 'paper', label: 'Papier', description: 'Texture feutre papier délicat' },
  { id: 'soft', label: 'Doux', description: 'Lueur centrale diffuse' },
  { id: 'light', label: 'Lumière', description: 'Éclat lumineux zénithal' },
  { id: 'vignette', label: 'Vignette', description: 'Ombre douce sur les bords' },
  { id: 'glass', label: 'Verre', description: 'Reflet satiné semi-translucide' },
]

/**
 * Helper to compute inline CSS style for background rendering (Solid or Gradient)
 */
export function getVisualBackgroundStyle(bg?: VisualBackground | null): {
  backgroundColor?: string
  backgroundImage?: string
} {
  if (!bg) {
    return { backgroundColor: '#FBF9F5' }
  }

  if (bg.type === 'IMAGE') {
    return { backgroundColor: '#0F1E36' }
  }

  if (bg.type === 'GRADIENT' && bg.gradient) {
    const { from, to, direction } = bg.gradient
    let bgImage = ''
    switch (direction) {
      case 'to right':
        bgImage = `linear-gradient(to right, ${from}, ${to})`
        break
      case 'to bottom right':
        bgImage = `linear-gradient(135deg, ${from}, ${to})`
        break
      case 'radial':
        bgImage = `radial-gradient(circle at center, ${from}, ${to})`
        break
      case 'to bottom':
      default:
        bgImage = `linear-gradient(to bottom, ${from}, ${to})`
        break
    }
    return {
      backgroundColor: from,
      backgroundImage: bgImage,
    }
  }

  return {
    backgroundColor: bg.color || '#FBF9F5',
  }
}

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
