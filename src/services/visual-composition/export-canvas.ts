import {
  type VisualComposition,
  type VisualTextElement,
  type VisualEmojiElement,
} from './types'
import { getTextElementCssStyle } from './fonts'

/**
 * Pure client-side HTML5 Canvas 2D exporter.
 * Renders a VisualComposition onto a 1080x1350 canvas (standard 4:5 ratio for Instagram/Facebook posts)
 * with all backgrounds, colors, gradients, effects, text elements, fonts, colors, and emojis.
 */
export async function renderVisualCompositionToDataUrl(
  composition: VisualComposition,
  mediaAssets?: Array<{ id: string; url: string }>
): Promise<string | null> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return null
  }

  const width = 1080
  const height = 1350

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height

  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  // 1. Draw Background Layer
  const bg = composition.background
  if (bg.type === 'COLOR' && bg.color) {
    ctx.fillStyle = bg.color
    ctx.fillRect(0, 0, width, height)
  } else if (bg.type === 'GRADIENT' && bg.gradient) {
    let grad: CanvasGradient
    const dir = bg.gradient.direction || 'to bottom'
    if (dir === 'to right') grad = ctx.createLinearGradient(0, 0, width, 0)
    else if (dir === 'to bottom right') grad = ctx.createLinearGradient(0, 0, width, height)
    else grad = ctx.createLinearGradient(0, 0, 0, height) // default to bottom

    grad.addColorStop(0, bg.gradient.from)
    grad.addColorStop(1, bg.gradient.to)
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, width, height)
  } else if (bg.type === 'IMAGE') {
    ctx.fillStyle = '#0F1E36'
    ctx.fillRect(0, 0, width, height)

    const assetId = bg.mediaAssetId
    const bgUrl = assetId ? mediaAssets?.find((m) => m.id === assetId)?.url || bg.mediaUrl : bg.mediaUrl

    if (bgUrl) {
      try {
        const img = await loadImage(bgUrl)
        const scale = bg.scale || 1.0
        const posX = bg.positionX || 0
        const posY = bg.positionY || 0

        const imgRatio = img.width / img.height
        const canvasRatio = width / height

        let renderW = width
        let renderH = height
        if (imgRatio > canvasRatio) {
          renderW = height * imgRatio
        } else {
          renderH = width / imgRatio
        }

        renderW *= scale
        renderH *= scale

        const offsetX = (width - renderW) / 2 + posX * width
        const offsetY = (height - renderH) / 2 + posY * height

        ctx.drawImage(img, offsetX, offsetY, renderW, renderH)
      } catch (err) {
        console.error('Error loading background image for canvas render:', err)
      }
    }
  } else {
    ctx.fillStyle = '#FBF9F5'
    ctx.fillRect(0, 0, width, height)
  }

  // 2. Draw Background Effect Layer
  if (bg.effect && bg.effect.type !== 'none') {
    const intensity = bg.effect.intensity || 0.35
    if (bg.effect.type === 'vignette') {
      const grad = ctx.createRadialGradient(width / 2, height / 2, width * 0.25, width / 2, height / 2, width * 0.75)
      grad.addColorStop(0, 'rgba(0,0,0,0)')
      grad.addColorStop(1, `rgba(0,0,0,${0.35 * intensity})`)
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)
    } else if (bg.effect.type === 'soft') {
      const grad = ctx.createRadialGradient(width / 2, height * 0.35, 0, width / 2, height * 0.35, width * 0.5)
      grad.addColorStop(0, `rgba(255,255,255,${0.45 * intensity})`)
      grad.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)
    } else if (bg.effect.type === 'light') {
      const grad = ctx.createRadialGradient(width * 0.85, 0, 0, width * 0.85, 0, width * 0.65)
      grad.addColorStop(0, `rgba(255,255,255,${0.5 * intensity})`)
      grad.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, width, height)
    }
  }

  // 3. Draw Elements (TEXT & EMOJI)
  if (Array.isArray(composition.elements)) {
    for (const el of composition.elements) {
      if (el.type === 'TEXT') {
        drawTextElement(ctx, el, bg, width, height)
      } else if (el.type === 'EMOJI') {
        drawEmojiElement(ctx, el, width, height)
      }
    }
  }

  return canvas.toDataURL('image/jpeg', 0.95)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = (e) => reject(e)
    img.src = src
  })
}

function drawTextElement(
  ctx: CanvasRenderingContext2D,
  el: VisualTextElement,
  bg: VisualComposition['background'],
  width: number,
  height: number
) {
  const cssStyle = getTextElementCssStyle(el, bg)
  const scale = el.scale || 1.0
  const fontSize = Math.round(36 * scale * 1.8) // Scaled font size for 1080x1350 canvas

  const x = el.x * width
  const y = el.y * height

  ctx.save()

  const fontStyle = el.fontStyle === 'italic' ? 'italic' : 'normal'
  const fontWeight = el.fontWeight === 'bold' ? 'bold' : 'normal'
  const fontFamily = el.fontFamily || 'Plus Jakarta Sans'
  ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px "${fontFamily}", sans-serif`
  ctx.textAlign = el.align || 'center'
  ctx.textBaseline = 'middle'

  let textColor = cssStyle.color || '#FFFFFF'
  if (el.color) textColor = el.color
  else if (el.colorMode === 'LIGHT') textColor = '#FFFFFF'
  else if (el.colorMode === 'DARK') textColor = '#0F1E36'
  else if (el.colorMode === 'PRIMARY') textColor = '#1E4E8C'
  else if (el.colorMode === 'CREAM') textColor = '#FBF9F5'

  // Highlight pill badge background if set
  if (cssStyle.backgroundColor && cssStyle.backgroundColor !== 'transparent') {
    const metrics = ctx.measureText(el.text)
    const textW = metrics.width
    const textH = fontSize * 1.3
    const paddingX = 24
    const paddingY = 12

    let rectX = x - textW / 2 - paddingX
    if (el.align === 'left') rectX = x - paddingX
    else if (el.align === 'right') rectX = x - textW - paddingX

    const rectY = y - textH / 2 - paddingY / 2
    const rectW = textW + paddingX * 2
    const rectH = textH + paddingY

    ctx.fillStyle = cssStyle.backgroundColor
    ctx.beginPath()
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(rectX, rectY, rectW, rectH, 16)
    } else {
      ctx.rect(rectX, rectY, rectW, rectH)
    }
    ctx.fill()
  }

  // Text Shadow effect
  if (cssStyle.textShadow && cssStyle.textShadow !== 'none') {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.65)'
    ctx.shadowBlur = 16
    ctx.shadowOffsetY = 6
  }

  ctx.fillStyle = textColor
  ctx.fillText(el.text, x, y)
  ctx.restore()
}

function drawEmojiElement(
  ctx: CanvasRenderingContext2D,
  el: VisualEmojiElement,
  width: number,
  height: number
) {
  const scale = el.scale || 1.0
  const fontSize = Math.round(54 * scale * 1.6)

  const x = el.x * width
  const y = el.y * height

  ctx.save()
  ctx.font = `${fontSize}px "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(el.value, x, y)
  ctx.restore()
}
