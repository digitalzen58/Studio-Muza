import React from 'react'
import type {
  VisualTextElement,
  VisualBackground,
  TextEffectType,
  TextAlign,
} from './types'

export interface FontOption {
  name: string
  family: string
  category: 'sans-serif' | 'serif' | 'expressive'
  googleFontName: string
}

/**
  Curated Google Fonts selection tailored for social media & Studio Mūza
 */
export const CURATED_FONTS: FontOption[] = [
  // Sans serif
  {
    name: 'Plus Jakarta Sans',
    family: "'Plus Jakarta Sans', sans-serif",
    category: 'sans-serif',
    googleFontName: 'Plus+Jakarta+Sans:ital,wght@0,400;0,600;0,700;1,400',
  },
  {
    name: 'Inter',
    family: "'Inter', sans-serif",
    category: 'sans-serif',
    googleFontName: 'Inter:wght@400;600;700',
  },
  {
    name: 'Poppins',
    family: "'Poppins', sans-serif",
    category: 'sans-serif',
    googleFontName: 'Poppins:ital,wght@0,400;0,600;0,700;1,400',
  },
  {
    name: 'Montserrat',
    family: "'Montserrat', sans-serif",
    category: 'sans-serif',
    googleFontName: 'Montserrat:ital,wght@0,400;0,600;0,700;1,400',
  },
  {
    name: 'DM Sans',
    family: "'DM Sans', sans-serif",
    category: 'sans-serif',
    googleFontName: 'DM+Sans:ital,wght@0,400;0,700;1,400',
  },
  {
    name: 'Manrope',
    family: "'Manrope', sans-serif",
    category: 'sans-serif',
    googleFontName: 'Manrope:wght@400;600;700',
  },

  // Serif
  {
    name: 'Instrument Serif',
    family: "'Instrument Serif', serif",
    category: 'serif',
    googleFontName: 'Instrument+Serif:ital@0;1',
  },
  {
    name: 'Playfair Display',
    family: "'Playfair Display', serif",
    category: 'serif',
    googleFontName: 'Playfair+Display:ital,wght@0,400;0,700;1,400',
  },
  {
    name: 'Lora',
    family: "'Lora', serif",
    category: 'serif',
    googleFontName: 'Lora:ital,wght@0,400;0,700;1,400',
  },
  {
    name: 'Cormorant Garamond',
    family: "'Cormorant Garamond', serif",
    category: 'serif',
    googleFontName: 'Cormorant+Garamond:ital,wght@0,400;0,700;1,400',
  },

  // Expressives
  {
    name: 'Bebas Neue',
    family: "'Bebas Neue', cursive",
    category: 'expressive',
    googleFontName: 'Bebas+Neue',
  },
  {
    name: 'Oswald',
    family: "'Oswald', sans-serif",
    category: 'expressive',
    googleFontName: 'Oswald:wght@400;600;700',
  },
  {
    name: 'Caveat',
    family: "'Caveat', cursive",
    category: 'expressive',
    googleFontName: 'Caveat:wght@400;700',
  },
  {
    name: 'Dancing Script',
    family: "'Dancing Script', cursive",
    category: 'expressive',
    googleFontName: 'Dancing+Script:wght@400;700',
  },
  {
    name: 'Pacifico',
    family: "'Pacifico', cursive",
    category: 'expressive',
    googleFontName: 'Pacifico',
  },
]

/**
  Curated quick palette for text color selection
 */
export const TEXT_PRESET_COLORS = [
  { label: 'Blanc', hex: '#FFFFFF' },
  { label: 'Noir', hex: '#0F1E36' },
  { label: 'Crème', hex: '#FBF9F5' },
  { label: 'Gris', hex: '#64748B' },
  { label: 'Bleu Digital', hex: '#1E4E8C' },
  { label: 'Bleu Marine', hex: '#0F172A' },
  { label: 'Vert Émeraude', hex: '#2D6A4F' },
  { label: 'Jaune Ocre', hex: '#E2A43B' },
  { label: 'Orange Terracotta', hex: '#D97757' },
  { label: 'Rouge Brique', hex: '#C53030' },
  { label: 'Rose Blush', hex: '#EC4899' },
  { label: 'Violet Prune', hex: '#7B2CBF' },
]

/**
  Single combined Google Fonts stylesheet link for fast, non-blocking loading
 */
export const GOOGLE_FONTS_STYLESHEET_URL =
  'https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Caveat:wght@400;700&family=Cormorant+Garamond:ital,wght@0,400;0,700;1,400&family=Dancing+Script:wght@400;700&family=DM+Sans:ital,wght@0,400;0,700;1,400&family=Instrument+Serif:ital@0;1&family=Inter:wght@400;600;700&family=Lora:ital,wght@0,400;0,700;1,400&family=Manrope:wght@400;600;700&family=Montserrat:ital,wght@0,400;0,700;1,400&family=Oswald:wght@400;600;700&family=Pacifico&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Poppins:ital,wght@0,400;0,600;0,700;1,400&family=Plus+Jakarta+Sans:ital,wght@0,400;0,600;0,700;1,400&display=swap'

/**
  Ensures that Google Fonts stylesheet is injected into <head> on client-side
 */
export function ensureGoogleFontsLoaded(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  const existing = document.getElementById('muza-google-fonts')
  if (existing) return

  const link = document.createElement('link')
  link.id = 'muza-google-fonts'
  link.rel = 'stylesheet'
  link.href = GOOGLE_FONTS_STYLESHEET_URL
  document.head.appendChild(link)
}

/**
  Computes WCAG relative luminance of a HEX color (0.0 to 1.0)
 */
export function getRelativeLuminance(hexColor: string): number {
  const cleanHex = hexColor.replace('#', '').trim()
  if (cleanHex.length !== 6 && cleanHex.length !== 3) return 0.5

  let fullHex = cleanHex
  if (cleanHex.length === 3) {
    fullHex = cleanHex
      .split('')
      .map((c) => c + c)
      .join('')
  }

  const rInt = parseInt(fullHex.substring(0, 2), 16)
  const gInt = parseInt(fullHex.substring(2, 4), 16)
  const bInt = parseInt(fullHex.substring(4, 6), 16)

  if (isNaN(rInt) || isNaN(gInt) || isNaN(bInt)) return 0.5

  const cal = (c: number) => {
    const val = c / 255
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4)
  }

  return 0.2126 * cal(rInt) + 0.7152 * cal(gInt) + 0.0722 * cal(bInt)
}

/**
  Deterministic auto-contrast: chooses light (#FFFFFF) or dark (#0F1E36) text based on background color or gradient
 */
export function computeAutoContrastColor(bg?: VisualBackground | null): string {
  if (!bg) return '#0F1E36'

  if (bg.type === 'COLOR' && bg.color) {
    const lum = getRelativeLuminance(bg.color)
    return lum > 0.45 ? '#0F1E36' : '#FFFFFF'
  }

  if (bg.type === 'GRADIENT' && bg.gradient) {
    const lumFrom = getRelativeLuminance(bg.gradient.from)
    const lumTo = getRelativeLuminance(bg.gradient.to)
    const avgLum = (lumFrom + lumTo) / 2
    return avgLum > 0.45 ? '#0F1E36' : '#FFFFFF'
  }

  // Default for images or unrecognized backgrounds: white text for maximum legibility on photos
  return '#FFFFFF'
}

/**
  Single source of truth for text element CSS styles across Canvas, Thumbnails, and Previews
 */
export function getTextElementCssStyle(
  el: VisualTextElement,
  bg?: VisualBackground | null
): React.CSSProperties {
  const fontObj = CURATED_FONTS.find(
    (f) => f.name.toLowerCase() === (el.fontFamily || '').toLowerCase()
  )
  const fontFamily = fontObj
    ? fontObj.family
    : el.fontFamily
    ? `'${el.fontFamily}', sans-serif`
    : el.boxStyle === 'PILL'
    ? "'Plus Jakarta Sans', sans-serif"
    : "'Instrument Serif', serif"

  let textColor = el.color
  if (el.autoContrast && bg) {
    textColor = computeAutoContrastColor(bg)
  } else if (!textColor) {
    textColor = el.colorMode === 'LIGHT' ? '#FFFFFF' : '#0F1E36'
  }

  const fontWeight = el.fontWeight || (el.type === 'TEXT' ? 'bold' : 'normal')
  const fontStyle = el.fontStyle || 'normal'
  const textAlign = (el.align || 'center') as TextAlign
  const textTransform = el.uppercase ? 'uppercase' : 'none'
  const letterSpacing = el.letterSpacing || 'normal'

  let textShadow: string | undefined = undefined
  let textStroke: string | undefined = undefined
  let backgroundColor: string | undefined = undefined
  let padding: string | undefined = undefined
  let borderRadius: string | undefined = undefined
  let backdropFilter: string | undefined = undefined

  // Effect calculation with fallback to boxStyle === 'PILL'
  const effectType: TextEffectType =
    el.effect?.type || (el.boxStyle === 'PILL' ? 'highlight' : 'none')
  const effectColor = el.effect?.color
  const effectIntensity = el.effect?.intensity ?? 0.5

  switch (effectType) {
    case 'shadow': {
      const alpha = 0.35 + effectIntensity * 0.45
      const blur = Math.round(4 + effectIntensity * 12)
      textShadow = `0 4px ${blur}px rgba(0,0,0,${alpha.toFixed(2)})`
      break
    }
    case 'outline': {
      const strokeColor =
        effectColor ||
        (textColor.toUpperCase() === '#FFFFFF' || textColor.toUpperCase() === '#FBF9F5'
          ? '#0F1E36'
          : '#FFFFFF')
      const strokeWidth = el.effect?.size ? `${el.effect.size}px` : '1.5px'
      textStroke = `${strokeWidth} ${strokeColor}`
      break
    }
    case 'highlight': {
      if (effectColor) {
        backgroundColor = effectColor
      } else {
        const isLightText =
          textColor.toUpperCase() === '#FFFFFF' || textColor.toUpperCase() === '#FBF9F5'
        backgroundColor = isLightText ? 'rgba(15, 30, 54, 0.75)' : 'rgba(255, 255, 255, 0.90)'
      }
      padding = '6px 14px'
      borderRadius = '12px'
      backdropFilter = 'blur(4px)'
      break
    }
    case 'glow': {
      const glowCol = effectColor || textColor
      const size = Math.round(8 + effectIntensity * 16)
      textShadow = `0 0 ${size}px ${glowCol}, 0 0 ${Math.round(size / 2)}px ${glowCol}`
      break
    }
    case 'relief': {
      const isLightText =
        textColor.toUpperCase() === '#FFFFFF' || textColor.toUpperCase() === '#FBF9F5'
      textShadow = isLightText
        ? '1px 1.5px 0px rgba(0,0,0,0.7), -0.5px -0.5px 0px rgba(255,255,255,0.4)'
        : '1px 1.5px 0px rgba(255,255,255,0.8), -0.5px -0.5px 0px rgba(0,0,0,0.35)'
      break
    }
    case 'none':
    default: {
      if (el.colorMode === 'LIGHT' && !el.color) {
        textShadow = '0 2px 4px rgba(0,0,0,0.8)'
      } else if (el.colorMode === 'DARK' && !el.color) {
        textShadow = '0 1px 2px rgba(255,255,255,0.8)'
      }
      break
    }
  }

  return {
    fontFamily,
    color: textColor,
    fontWeight,
    fontStyle,
    textAlign,
    textTransform: textTransform as React.CSSProperties['textTransform'],
    letterSpacing,
    textShadow,
    WebkitTextStroke: textStroke,
    backgroundColor,
    padding,
    borderRadius,
    backdropFilter,
  }
}
