import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'
import {
  type VisualComposition,
  type VisualTextElement,
} from '@/services/visual-composition/types'
import { validateVisualComposition } from '@/services/visual-composition/validation'
import {
  CURATED_FONTS,
  TEXT_PRESET_COLORS,
  computeAutoContrastColor,
  getTextElementCssStyle,
} from '@/services/visual-composition/fonts'

test('=== STUDIO MŪZA — RICH TEXT CUSTOMIZATION IN STUDIO ===', async (t) => {
  const rootDir = process.cwd()

  await t.test('1. Font selector supports curated families and brand font prioritization', () => {
    const fontNames = CURATED_FONTS.map((f) => f.name)
    assert.ok(fontNames.includes('Plus Jakarta Sans'), 'Must include Plus Jakarta Sans')
    assert.ok(fontNames.includes('Inter'), 'Must include Inter')
    assert.ok(fontNames.includes('Poppins'), 'Must include Poppins')
    assert.ok(fontNames.includes('Montserrat'), 'Must include Montserrat')
    assert.ok(fontNames.includes('DM Sans'), 'Must include DM Sans')
    assert.ok(fontNames.includes('Manrope'), 'Must include Manrope')
    assert.ok(fontNames.includes('Instrument Serif'), 'Must include Instrument Serif')
    assert.ok(fontNames.includes('Playfair Display'), 'Must include Playfair Display')
    assert.ok(fontNames.includes('Lora'), 'Must include Lora')
    assert.ok(fontNames.includes('Cormorant Garamond'), 'Must include Cormorant Garamond')
    assert.ok(fontNames.includes('Bebas Neue'), 'Must include Bebas Neue')
    assert.ok(fontNames.includes('Oswald'), 'Must include Oswald')
    assert.ok(fontNames.includes('Caveat'), 'Must include Caveat')

    const textEl: VisualTextElement = {
      id: 't-1',
      type: 'TEXT',
      text: 'Titre Principal',
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      colorMode: 'LIGHT',
      fontFamily: 'Instrument Serif',
    }

    const cssStyle = getTextElementCssStyle(textEl)
    assert.strictEqual(cssStyle.fontFamily, "'Instrument Serif', serif")
  })

  await t.test('2. Preset colors and custom HEX color picker support', () => {
    assert.ok(TEXT_PRESET_COLORS.length >= 10, 'Preset palette must contain at least 10 colors')
    assert.ok(TEXT_PRESET_COLORS.some((c) => c.hex === '#FFFFFF'), 'Must include white')
    assert.ok(TEXT_PRESET_COLORS.some((c) => c.hex === '#1E4E8C'), 'Must include digital blue')

    // Preset color
    const textElPreset: VisualTextElement = {
      id: 't-preset',
      type: 'TEXT',
      text: 'Texte Bleu',
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      colorMode: 'LIGHT',
      color: '#1E4E8C',
    }
    assert.strictEqual(getTextElementCssStyle(textElPreset).color, '#1E4E8C')

    // Custom HEX color
    const textElCustom: VisualTextElement = {
      id: 't-custom',
      type: 'TEXT',
      text: 'Texte Vert Custom',
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      colorMode: 'LIGHT',
      color: '#10B981',
    }
    assert.strictEqual(getTextElementCssStyle(textElCustom).color, '#10B981')
  })

  await t.test('3. Text styling properties (bold, italic, alignment, uppercase, letter spacing)', () => {
    const textEl: VisualTextElement = {
      id: 't-styled',
      type: 'TEXT',
      text: 'Offre Spéciale',
      x: 0.5,
      y: 0.5,
      scale: 1.2,
      colorMode: 'LIGHT',
      fontWeight: 'bold',
      fontStyle: 'italic',
      align: 'right',
      uppercase: true,
      letterSpacing: '3.5px',
    }

    const cssStyle = getTextElementCssStyle(textEl)
    assert.strictEqual(cssStyle.fontWeight, 'bold')
    assert.strictEqual(cssStyle.fontStyle, 'italic')
    assert.strictEqual(cssStyle.textAlign, 'right')
    assert.strictEqual(cssStyle.textTransform, 'uppercase')
    assert.strictEqual(cssStyle.letterSpacing, '3.5px')
  })

  await t.test('4. Text effects (shadow, outline, highlight, glow, relief, none)', () => {
    // Ombre
    const shadowEl: VisualTextElement = {
      id: 't-shadow',
      type: 'TEXT',
      text: 'Ombre',
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      colorMode: 'LIGHT',
      effect: { type: 'shadow', intensity: 0.8 },
    }
    assert.ok(getTextElementCssStyle(shadowEl).textShadow?.includes('rgba(0,0,0,'))

    // Contour
    const outlineEl: VisualTextElement = {
      id: 't-outline',
      type: 'TEXT',
      text: 'Contour',
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      colorMode: 'LIGHT',
      color: '#FFFFFF',
      effect: { type: 'outline', color: '#000000', size: 2 },
    }
    assert.strictEqual(getTextElementCssStyle(outlineEl).WebkitTextStroke, '2px #000000')

    // Surligné
    const highlightEl: VisualTextElement = {
      id: 't-highlight',
      type: 'TEXT',
      text: 'Surligné',
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      colorMode: 'LIGHT',
      effect: { type: 'highlight', color: '#D97757' },
    }
    const highlightCss = getTextElementCssStyle(highlightEl)
    assert.strictEqual(highlightCss.backgroundColor, '#D97757')
    assert.strictEqual(highlightCss.borderRadius, '12px')

    // Éclat
    const glowEl: VisualTextElement = {
      id: 't-glow',
      type: 'TEXT',
      text: 'Éclat',
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      colorMode: 'LIGHT',
      effect: { type: 'glow', color: '#E2A43B', intensity: 0.7 },
    }
    assert.ok(getTextElementCssStyle(glowEl).textShadow?.includes('#E2A43B'))

    // Relief
    const reliefEl: VisualTextElement = {
      id: 't-relief',
      type: 'TEXT',
      text: 'Relief',
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      colorMode: 'LIGHT',
      effect: { type: 'relief' },
    }
    assert.ok(getTextElementCssStyle(reliefEl).textShadow !== undefined)

    // Aucun
    const noneEl: VisualTextElement = {
      id: 't-none',
      type: 'TEXT',
      text: 'Aucun',
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      colorMode: 'LIGHT',
      effect: { type: 'none' },
    }
    assert.strictEqual(getTextElementCssStyle(noneEl).backgroundColor, undefined)
  })

  await t.test('5. Deterministic auto-contrast calculation without AI', () => {
    // White background -> Dark text (#0F1E36)
    const darkOnWhite = computeAutoContrastColor({ type: 'COLOR', color: '#FFFFFF' })
    assert.strictEqual(darkOnWhite, '#0F1E36')

    // Cream background -> Dark text (#0F1E36)
    const darkOnCreme = computeAutoContrastColor({ type: 'COLOR', color: '#FBF9F5' })
    assert.strictEqual(darkOnCreme, '#0F1E36')

    // Navy background -> Light text (#FFFFFF)
    const lightOnNavy = computeAutoContrastColor({ type: 'COLOR', color: '#0F1E36' })
    assert.strictEqual(lightOnNavy, '#FFFFFF')

    // Dark gradient -> Light text (#FFFFFF)
    const lightOnDarkGrad = computeAutoContrastColor({
      type: 'GRADIENT',
      gradient: { from: '#1E293B', to: '#0F172A', direction: 'to bottom' },
    })
    assert.strictEqual(lightOnDarkGrad, '#FFFFFF')
  })

  await t.test('6. Complete independence between multiple text blocks', () => {
    const composition: VisualComposition = {
      version: 1,
      aspectRatio: '4:5',
      background: { type: 'COLOR', color: '#FBF9F5' },
      elements: [
        {
          id: 'title-block',
          type: 'TEXT',
          text: 'Super Titre',
          x: 0.5,
          y: 0.3,
          scale: 1.4,
          colorMode: 'LIGHT',
          fontFamily: 'Instrument Serif',
          color: '#D97757',
          fontWeight: 'bold',
          align: 'center',
          effect: { type: 'shadow', intensity: 0.7 },
        },
        {
          id: 'subtitle-block',
          type: 'TEXT',
          text: 'Sous-titre descriptif',
          x: 0.5,
          y: 0.6,
          scale: 0.9,
          colorMode: 'DARK',
          fontFamily: 'Plus Jakarta Sans',
          color: '#1E4E8C',
          fontWeight: 'normal',
          align: 'left',
          effect: { type: 'none' },
        },
      ],
    }

    const titleEl = composition.elements[0] as VisualTextElement
    const subtitleEl = composition.elements[1] as VisualTextElement

    const titleStyle = getTextElementCssStyle(titleEl)
    const subtitleStyle = getTextElementCssStyle(subtitleEl)

    assert.strictEqual(titleStyle.fontFamily, "'Instrument Serif', serif")
    assert.strictEqual(titleStyle.color, '#D97757')
    assert.ok(titleStyle.textShadow?.includes('rgba(0,0,0,'))

    assert.strictEqual(subtitleStyle.fontFamily, "'Plus Jakarta Sans', sans-serif")
    assert.strictEqual(subtitleStyle.color, '#1E4E8C')
    assert.strictEqual(subtitleStyle.backgroundColor, undefined)
  })

  await t.test('7. Validation, sanitization, and save/restoration of rich text payload', () => {
    const rawPayload = {
      version: 1,
      aspectRatio: '4:5',
      background: {
        type: 'GRADIENT',
        gradient: { from: '#A7D8DE', to: '#1E4E8C', direction: 'to bottom right' },
      },
      elements: [
        {
          id: 'rich-text-1',
          type: 'TEXT',
          text: 'Nouveau Texte Stylisé',
          x: 0.5,
          y: 0.4,
          scale: 1.2,
          colorMode: 'LIGHT',
          fontFamily: 'Montserrat',
          color: '#FFFFFF',
          fontWeight: 'bold',
          fontStyle: 'italic',
          align: 'center',
          letterSpacing: '1.5px',
          uppercase: true,
          effect: {
            type: 'glow',
            color: '#FFFFFF',
            intensity: 0.6,
          },
        },
      ],
    }

    const res = validateVisualComposition(rawPayload)
    assert.strictEqual(res.valid, true)
    assert.ok(res.sanitized !== undefined)

    const sanitizedEl = res.sanitized!.elements[0] as VisualTextElement
    assert.strictEqual(sanitizedEl.fontFamily, 'Montserrat')
    assert.strictEqual(sanitizedEl.color, '#FFFFFF')
    assert.strictEqual(sanitizedEl.uppercase, true)
    assert.strictEqual(sanitizedEl.effect?.type, 'glow')
  })

  await t.test('8. Full backward compatibility with legacy draft compositions', () => {
    const legacyPayload = {
      version: 1,
      aspectRatio: '4:5',
      background: { type: 'COLOR', color: '#FBF9F5' },
      elements: [
        {
          id: 'legacy-text-1',
          type: 'TEXT',
          text: 'Ancien brouillon',
          x: 0.5,
          y: 0.5,
          scale: 1.0,
          colorMode: 'DARK',
          boxStyle: 'PILL',
        },
      ],
    }

    const res = validateVisualComposition(legacyPayload)
    assert.strictEqual(res.valid, true)
    const legacyEl = res.sanitized!.elements[0] as VisualTextElement
    assert.strictEqual(legacyEl.text, 'Ancien brouillon')
    assert.strictEqual(legacyEl.colorMode, 'DARK')
    assert.strictEqual(legacyEl.boxStyle, 'PILL')

    const cssStyle = getTextElementCssStyle(legacyEl)
    assert.strictEqual(cssStyle.fontFamily, "'Plus Jakarta Sans', sans-serif")
    assert.strictEqual(cssStyle.color, '#0F1E36')
    assert.strictEqual(cssStyle.borderRadius, '12px')
  })

  await t.test('9. Unified component code rendering integration', () => {
    const canvasCode = fs.readFileSync(path.join(rootDir, 'src/components/studio/visual-canvas.tsx'), 'utf8')
    const thumbnailCode = fs.readFileSync(path.join(rootDir, 'src/components/publications/publication-thumbnail.tsx'), 'utf8')
    const fontsCode = fs.readFileSync(path.join(rootDir, 'src/services/visual-composition/fonts.ts'), 'utf8')

    assert.ok(canvasCode.includes('getTextElementCssStyle'), 'VisualCanvas must use getTextElementCssStyle')
    assert.ok(canvasCode.includes('CURATED_FONTS'), 'VisualCanvas must use CURATED_FONTS')
    assert.ok(canvasCode.includes('TEXT_PRESET_COLORS'), 'VisualCanvas must use TEXT_PRESET_COLORS')
    assert.ok(canvasCode.includes('autoContrast'), 'VisualCanvas must support autoContrast')
    assert.ok(thumbnailCode.includes('getTextElementCssStyle'), 'Thumbnail must use getTextElementCssStyle')
    assert.ok(fontsCode.includes('ensureGoogleFontsLoaded'), 'Fonts module must support Google Fonts loading')
  })
})
