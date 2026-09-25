import assert from 'node:assert/strict'
import test from 'node:test'
import fs from 'node:fs'
import path from 'node:path'
import {
  type VisualComposition,
  getVisualBackgroundStyle,
  BRAND_BACKGROUND_COLORS,
  RICH_BACKGROUND_COLORS,
  CURATED_GRADIENTS,
  CURATED_EFFECTS,
} from '@/services/visual-composition/types'
import { validateVisualComposition } from '@/services/visual-composition/validation'
import { validatePostReadiness } from '@/services/content-readiness/post-readiness'

test('=== STUDIO MŪZA — ENRICHED VISUAL BACKGROUNDS (COLORS, GRADIENTS & EFFECTS) ===', async (t) => {
  const rootDir = process.cwd()

  // 1. Palette completeness & curation
  await t.test('1. Rich curated palette and presets availability', () => {
    assert.ok(BRAND_BACKGROUND_COLORS.length >= 6, 'Brand background colors must contain at least 6 colors')
    assert.ok(RICH_BACKGROUND_COLORS.length >= 20, 'Rich palette must contain 20 to 24 curated colors')
    assert.ok(CURATED_GRADIENTS.length >= 10, 'Must provide curated gradient presets')
    assert.ok(CURATED_EFFECTS.length >= 6, 'Must provide curated background effects')

    // Confirm presence of key requested colors
    const hexes = RICH_BACKGROUND_COLORS.map(c => c.hex.toUpperCase())
    assert.ok(hexes.includes('#FFFFFF'), 'Must include pure white')
    assert.ok(hexes.includes('#FBF9F5'), 'Must include cream')
    assert.ok(hexes.includes('#D97757'), 'Must include terracotta')
    assert.ok(hexes.includes('#E3EBDD') || hexes.includes('#84A98C'), 'Must include sage')
    assert.ok(hexes.includes('#0F1E36') || hexes.includes('#1E4E8C'), 'Must include navy/digital zen blue')
  })

  // 2. Solid Color saved and validated
  await t.test('2. Solid Color saved and validated correctly', () => {
    const solidComp: VisualComposition = {
      version: 1,
      aspectRatio: '4:5',
      background: {
        type: 'COLOR',
        color: '#D97757',
        positionX: 0,
        positionY: 0,
        scale: 1.0,
      },
      elements: [
        {
          id: 'text-1',
          type: 'TEXT',
          text: 'Découvrez notre nouvelle collection',
          x: 0.5,
          y: 0.5,
          scale: 1.2,
          colorMode: 'LIGHT',
          boxStyle: 'PILL',
        },
      ],
    }

    const validation = validateVisualComposition(solidComp)
    assert.strictEqual(validation.valid, true)
    assert.strictEqual(validation.sanitized?.background.type, 'COLOR')
    assert.strictEqual(validation.sanitized?.background.color, '#D97757')

    const style = getVisualBackgroundStyle(validation.sanitized?.background)
    assert.strictEqual(style.backgroundColor, '#D97757')

    const readiness = validatePostReadiness({
      workingTitle: 'Collection d’automne',
      body: 'Venez découvrir nos pièces uniques en boutique cette semaine !',
      visualComposition: validation.sanitized,
    })
    assert.strictEqual(readiness.ready, true, 'Solid color background must satisfy readiness criteria')
  })

  // 3. Custom Color saved and validated
  await t.test('3. Custom Color (#2A9D8F) saved, validated, and normalized', () => {
    const customComp: VisualComposition = {
      version: 1,
      aspectRatio: '4:5',
      background: {
        type: 'COLOR',
        color: '#2A9D8F',
      },
      elements: [],
    }

    const validation = validateVisualComposition(customComp)
    assert.strictEqual(validation.valid, true)
    assert.strictEqual(validation.sanitized?.background.color, '#2A9D8F')

    const style = getVisualBackgroundStyle(validation.sanitized?.background)
    assert.strictEqual(style.backgroundColor, '#2A9D8F')
  })

  // 4. Gradient saved with from, to, and orientation
  await t.test('4. Gradient saved with from, to, and directions', () => {
    const directions = ['to bottom', 'to right', 'to bottom right', 'radial'] as const

    for (const dir of directions) {
      const gradComp: VisualComposition = {
        version: 1,
        aspectRatio: '4:5',
        background: {
          type: 'GRADIENT',
          color: '#F43F5E',
          gradient: {
            from: '#F43F5E',
            to: '#F59E0B',
            direction: dir,
          },
        },
        elements: [],
      }

      const validation = validateVisualComposition(gradComp)
      assert.strictEqual(validation.valid, true)
      assert.strictEqual(validation.sanitized?.background.type, 'GRADIENT')
      assert.strictEqual(validation.sanitized?.background.gradient?.from, '#F43F5E')
      assert.strictEqual(validation.sanitized?.background.gradient?.to, '#F59E0B')
      assert.strictEqual(validation.sanitized?.background.gradient?.direction, dir)

      const style = getVisualBackgroundStyle(validation.sanitized?.background)
      assert.strictEqual(style.backgroundColor, '#F43F5E')
      assert.ok(style.backgroundImage !== undefined)

      if (dir === 'radial') {
        assert.ok(style.backgroundImage?.includes('radial-gradient(circle at center, #F43F5E, #F59E0B)'))
      } else if (dir === 'to bottom right') {
        assert.ok(style.backgroundImage?.includes('linear-gradient(135deg, #F43F5E, #F59E0B)'))
      } else {
        assert.ok(style.backgroundImage?.includes(`linear-gradient(${dir}, #F43F5E, #F59E0B)`))
      }

      const readiness = validatePostReadiness({
        workingTitle: 'Coucher de soleil',
        body: 'Un moment suspendu à partager ensemble.',
        visualComposition: validation.sanitized,
      })
      assert.strictEqual(readiness.ready, true, 'Gradient background must satisfy readiness criteria')
    }
  })

  // 5. Overlay Effects saved with intensity and combined with color or gradient
  await t.test('5. Overlay Effects (grain, paper, soft, light, vignette, glass) and combinations', () => {
    const effects = ['grain', 'paper', 'soft', 'light', 'vignette', 'glass'] as const

    for (const eff of effects) {
      const comboComp: VisualComposition = {
        version: 1,
        aspectRatio: '4:5',
        background: {
          type: 'GRADIENT',
          gradient: {
            from: '#E3EBDD',
            to: '#2D6A4F',
            direction: 'to bottom',
          },
          effect: {
            type: eff,
            intensity: 0.45,
          },
        },
        elements: [
          {
            id: 'el-1',
            type: 'EMOJI',
            value: '🌿',
            x: 0.5,
            y: 0.3,
            scale: 1.5,
          },
        ],
      }

      const validation = validateVisualComposition(comboComp)
      assert.strictEqual(validation.valid, true)
      assert.strictEqual(validation.sanitized?.background.effect?.type, eff)
      assert.strictEqual(validation.sanitized?.background.effect?.intensity, 0.45)
      assert.strictEqual(validation.sanitized?.elements.length, 1)
      assert.strictEqual(validation.sanitized?.elements[0].type, 'EMOJI')
    }
  })

  // 6. Legacy draft compatibility
  await t.test('6. Legacy draft without new properties remains 100% compatible', () => {
    const legacyComp = {
      version: 1,
      aspectRatio: '4:5',
      background: {
        type: 'COLOR',
        color: '#FBF9F5',
        positionX: 0,
        positionY: 0,
        scale: 1.0,
      },
      elements: [
        {
          id: 'text-old',
          type: 'TEXT',
          text: 'Ancien brouillon Mūza',
          x: 0.5,
          y: 0.5,
          scale: 1.0,
          colorMode: 'DARK',
          boxStyle: 'NONE',
        },
      ],
    }

    const validation = validateVisualComposition(legacyComp)
    assert.strictEqual(validation.valid, true)
    assert.strictEqual(validation.sanitized?.background.type, 'COLOR')
    assert.strictEqual(validation.sanitized?.background.color, '#FBF9F5')
    assert.strictEqual(validation.sanitized?.background.gradient, undefined)
    assert.strictEqual(validation.sanitized?.background.effect, undefined)

    const style = getVisualBackgroundStyle(validation.sanitized?.background)
    assert.strictEqual(style.backgroundColor, '#FBF9F5')
  })

  // 7. Image background preservation
  await t.test('7. Image backgrounds with crop, zoom, and pan remain completely untouched', () => {
    const imageComp: VisualComposition = {
      version: 1,
      aspectRatio: '4:5',
      background: {
        type: 'IMAGE',
        mediaAssetId: 'media-asset-777',
        mediaUrl: 'https://example.com/terrasse.jpg',
        positionX: 0.25,
        positionY: -0.15,
        scale: 1.4,
        effect: {
          type: 'vignette',
          intensity: 0.3,
        },
      },
      elements: [],
    }

    const validation = validateVisualComposition(imageComp)
    assert.strictEqual(validation.valid, true)
    assert.strictEqual(validation.sanitized?.background.type, 'IMAGE')
    assert.strictEqual(validation.sanitized?.background.mediaAssetId, 'media-asset-777')
    assert.strictEqual(validation.sanitized?.background.positionX, 0.25)
    assert.strictEqual(validation.sanitized?.background.positionY, -0.15)
    assert.strictEqual(validation.sanitized?.background.scale, 1.4)
    assert.strictEqual(validation.sanitized?.background.effect?.type, 'vignette')
  })

  // 8. Static component code verification
  await t.test('8. VisualCanvas, ContentPreviewModal and PublicationThumbnail implement unified background rendering', () => {
    const canvasCode = fs.readFileSync(path.join(rootDir, 'src/components/studio/visual-canvas.tsx'), 'utf8')
    const thumbnailCode = fs.readFileSync(path.join(rootDir, 'src/components/publications/publication-thumbnail.tsx'), 'utf8')
    const previewCode = fs.readFileSync(path.join(rootDir, 'src/components/studio/content-preview-modal.tsx'), 'utf8')

    // Canvas checks
    assert.ok(canvasCode.includes('VisualBackgroundEffectLayer'), 'VisualCanvas must export/use VisualBackgroundEffectLayer')
    assert.ok(canvasCode.includes('CURATED_GRADIENTS'), 'VisualCanvas must offer curated gradients')
    assert.ok(canvasCode.includes('RICH_BACKGROUND_COLORS'), 'VisualCanvas must offer 24 rich colors')
    assert.ok(canvasCode.includes('CURATED_EFFECTS'), 'VisualCanvas must offer curated overlay effects')
    assert.ok(canvasCode.includes('getVisualBackgroundStyle'), 'VisualCanvas must compute background style')
    assert.ok(canvasCode.includes('to bottom right'), 'VisualCanvas must support diagonal gradients')
    assert.ok(canvasCode.includes('radial'), 'VisualCanvas must support radial gradients')

    // Thumbnail and Preview checks
    assert.ok(thumbnailCode.includes('getVisualBackgroundStyle'), 'Thumbnail must use getVisualBackgroundStyle')
    assert.ok(thumbnailCode.includes('VisualBackgroundEffectLayer'), 'Thumbnail must render VisualBackgroundEffectLayer')
    assert.ok(previewCode.includes('VisualCanvas'), 'Preview modal must render VisualCanvas')
  })
})
