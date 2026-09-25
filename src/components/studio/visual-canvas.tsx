'use client'

import React, { useState, useRef, useCallback, useMemo } from 'react'
import {
  Image as ImageIcon,
  Type,
  Smile,
  Palette,
  Undo2,
  Trash2,
  Minus,
  Plus,
  Edit3,
  Move,
  Check,
  ArrowDown,
  ArrowRight,
  ArrowDownRight,
  Circle,
} from 'lucide-react'
import {
  type VisualComposition,
  type VisualElement,
  type VisualTextElement,
  type VisualEmojiElement,
  type BackgroundGradientDirection,
  type BackgroundEffectType,
  type BackgroundEffectConfig,
  type TextEffectType,
  BRAND_BACKGROUND_COLORS,
  RICH_BACKGROUND_COLORS,
  CURATED_GRADIENTS,
  CURATED_EFFECTS,
  CURATED_EMOJIS,
  getVisualBackgroundStyle,
} from '@/services/visual-composition/types'
import {
  CURATED_FONTS,
  TEXT_PRESET_COLORS,
  getTextElementCssStyle,
  ensureGoogleFontsLoaded,
} from '@/services/visual-composition/fonts'
import type { BrandMediaAsset } from '@/services/media'

/**
 * Pure CSS background effect overlay layer for Canvas & Thumbnails
 */
export function VisualBackgroundEffectLayer({
  effect,
}: {
  effect?: BackgroundEffectConfig | null
}) {
  if (!effect || effect.type === 'none' || !effect.intensity) return null
  const intensity = effect.intensity

  switch (effect.type) {
    case 'grain':
      return (
        <div
          className="absolute inset-0 pointer-events-none mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
            opacity: intensity * 0.28,
          }}
        />
      )
    case 'paper':
      return (
        <div
          className="absolute inset-0 pointer-events-none mix-blend-multiply"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='paper'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.05' numOctaves='4' result='noise'/%3E%3CfeDiffuseLighting in='noise' lighting-color='%23ffffff' surfaceScale='2'%3E%3CfeDistantLight azimuth='45' elevation='60'/%3E%3C/feDiffuseLighting%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23paper)'/%3E%3C/svg%3E")`,
            opacity: intensity * 0.24,
          }}
        />
      )
    case 'soft':
      return (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(circle at 50% 35%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 70%)',
            opacity: intensity,
          }}
        />
      )
    case 'light':
      return (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at 85% 0%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 65%)',
            opacity: intensity,
          }}
        />
      )
    case 'vignette':
      return (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              'radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(0,0,0,0.35) 100%)',
            opacity: intensity,
          }}
        />
      )
    case 'glass':
      return (
        <div
          className="absolute inset-0 pointer-events-none backdrop-blur-[1px]"
          style={{
            backgroundImage:
              'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.02) 50%, rgba(255,255,255,0.12) 100%)',
            opacity: intensity,
          }}
        />
      )
    default:
      return null
  }
}

interface VisualCanvasProps {
  composition: VisualComposition
  onChange: (newComposition: VisualComposition) => void
  mediaAssets?: BrandMediaAsset[]
  brandColors?: string[]
  brandFonts?: string[]
  onOpenMediaPicker?: () => void
  onOpenStockModal?: () => void
  readOnly?: boolean
}

export function VisualCanvas({
  composition,
  onChange,
  mediaAssets = [],
  brandColors,
  brandFonts = [],
  onOpenMediaPicker,
  onOpenStockModal,
  readOnly = false,
}: VisualCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const customColorInputRef = useRef<HTMLInputElement>(null)
  const customGradFromInputRef = useRef<HTMLInputElement>(null)
  const customGradToInputRef = useRef<HTMLInputElement>(null)

  // Ensure Google Fonts stylesheet loaded on client
  React.useEffect(() => {
    ensureGoogleFontsLoaded()
  }, [])

  // Brand colors list
  const activeBrandColors = useMemo(() => {
    if (brandColors && brandColors.length > 0) {
      return brandColors.map((hex, idx) => ({
        hex,
        label: `Couleur de marque ${idx + 1}`,
        textMode: 'LIGHT' as const,
      }))
    }
    return BRAND_BACKGROUND_COLORS
  }, [brandColors])

  // Brand fonts list
  const activeBrandFonts = useMemo(() => {
    return brandFonts || []
  }, [brandFonts])

  // Selection & active manipulation state
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [isEditingText, setIsEditingText] = useState(false)
  const [editingTextValue, setEditingTextValue] = useState('')
  const [textTab, setTextTab] = useState<'FONT' | 'COLOR' | 'STYLE' | 'EFFECT'>('FONT')

  // Popovers & Background category tab
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [paletteTab, setPaletteTab] = useState<'COLORS' | 'GRADIENTS' | 'EFFECTS'>('COLORS')
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false)
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false)

  // Drag interaction tracking (pointer events)
  const dragRef = useRef<{
    isDragging: boolean
    target: 'ELEMENT' | 'BACKGROUND'
    elementId?: string
    startPointerX: number
    startPointerY: number
    startElemX: number
    startElemY: number
    startBgX: number
    startBgY: number
  }>({
    isDragging: false,
    target: 'ELEMENT',
    startPointerX: 0,
    startPointerY: 0,
    startElemX: 0,
    startElemY: 0,
    startBgX: 0,
    startBgY: 0,
  })

  // Undo history stack
  const [history, setHistory] = useState<VisualComposition[]>([])

  const pushHistory = useCallback(
    (nextComposition: VisualComposition) => {
      setHistory((prev) => [...prev.slice(-15), composition])
      onChange(nextComposition)
    },
    [composition, onChange]
  )

  const handleUndo = () => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory((h) => h.slice(0, -1))
    onChange(prev)
    setSelectedElementId(null)
    setIsEditingText(false)
  }

  // Selected element
  const selectedElement = composition.elements.find((el) => el.id === selectedElementId) || null

  // --------------------------------------------------------------------------
  // POINTER INTERACTIONS (DRAG & DIRECT MANIPULATION)
  // --------------------------------------------------------------------------
  const handlePointerDownElement = (
    e: React.PointerEvent<HTMLDivElement>,
    element: VisualElement
  ) => {
    if (readOnly) return
    e.stopPropagation()

    setSelectedElementId(element.id)
    setIsEditingText(false)

    const canvas = canvasRef.current
    if (!canvas) return

    dragRef.current = {
      isDragging: true,
      target: 'ELEMENT',
      elementId: element.id,
      startPointerX: e.clientX,
      startPointerY: e.clientY,
      startElemX: element.x,
      startElemY: element.y,
      startBgX: 0,
      startBgY: 0,
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // ignore
    }
  }

  const handlePointerDownCanvas = (e: React.PointerEvent<HTMLDivElement>) => {
    if (readOnly) return

    // Tapping canvas background deselects element
    setSelectedElementId(null)
    setIsEditingText(false)
    setPaletteOpen(false)
    setEmojiPickerOpen(false)
    setPhotoMenuOpen(false)

    if (composition.background.type === 'IMAGE') {
      const bg = composition.background
      dragRef.current = {
        isDragging: true,
        target: 'BACKGROUND',
        startPointerX: e.clientX,
        startPointerY: e.clientY,
        startElemX: 0,
        startElemY: 0,
        startBgX: bg.positionX || 0,
        startBgY: bg.positionY || 0,
      }

      try {
        e.currentTarget.setPointerCapture(e.pointerId)
      } catch {
        // ignore
      }
    }
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.isDragging || readOnly) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const deltaX = (e.clientX - dragRef.current.startPointerX) / rect.width
    const deltaY = (e.clientY - dragRef.current.startPointerY) / rect.height

    if (dragRef.current.target === 'ELEMENT' && dragRef.current.elementId) {
      const targetId = dragRef.current.elementId
      const newX = Math.max(0.05, Math.min(0.95, dragRef.current.startElemX + deltaX))
      const newY = Math.max(0.05, Math.min(0.95, dragRef.current.startElemY + deltaY))

      onChange({
        ...composition,
        elements: composition.elements.map((el) =>
          el.id === targetId ? { ...el, x: newX, y: newY } : el
        ),
      })
    } else if (dragRef.current.target === 'BACKGROUND') {
      const newBgX = Math.max(-0.8, Math.min(0.8, dragRef.current.startBgX + deltaX * 1.5))
      const newBgY = Math.max(-0.8, Math.min(0.8, dragRef.current.startBgY + deltaY * 1.5))

      onChange({
        ...composition,
        background: {
          ...composition.background,
          positionX: newBgX,
          positionY: newBgY,
        },
      })
    }
  }

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // ignore
      }
    }
  }

  // --------------------------------------------------------------------------
  // ELEMENT ACTIONS (ADD / EDIT / RESIZE / DELETE / RICH TEXT MUTATIONS)
  // --------------------------------------------------------------------------
  const handleAddText = () => {
    const textId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `text-${composition.elements.length + 1}`

    const newText: VisualTextElement = {
      id: textId,
      type: 'TEXT',
      text: 'Votre texte',
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      colorMode: 'LIGHT',
      fontFamily: 'Plus Jakarta Sans',
      fontWeight: 'bold',
      fontStyle: 'normal',
      align: 'center',
      autoContrast: false,
    }

    pushHistory({
      ...composition,
      elements: [...composition.elements, newText],
    })
    setSelectedElementId(newText.id)
    setEditingTextValue('Votre texte')
    setIsEditingText(true)
  }

  const handleAddEmoji = (emoji: string) => {
    const emojiId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `emoji-${composition.elements.length + 1}`
    const newEmoji: VisualEmojiElement = {
      id: emojiId,
      type: 'EMOJI',
      value: emoji,
      x: 0.5,
      y: 0.5,
      scale: 1.3,
    }

    pushHistory({
      ...composition,
      elements: [...composition.elements, newEmoji],
    })
    setSelectedElementId(newEmoji.id)
    setEmojiPickerOpen(false)
  }

  const handleSaveTextEdit = () => {
    if (!selectedElementId || !editingTextValue.trim()) {
      setIsEditingText(false)
      return
    }

    pushHistory({
      ...composition,
      elements: composition.elements.map((el) =>
        el.id === selectedElementId && el.type === 'TEXT'
          ? { ...el, text: editingTextValue.trim() }
          : el
      ),
    })
    setIsEditingText(false)
  }

  const handleResizeSelected = (delta: number) => {
    if (!selectedElementId) return
    pushHistory({
      ...composition,
      elements: composition.elements.map((el) => {
        if (el.id !== selectedElementId) return el
        const newScale = Math.max(0.5, Math.min(3.0, Number((el.scale + delta).toFixed(1))))
        return { ...el, scale: newScale }
      }),
    })
  }

  const handleUpdateSelectedText = (updates: Partial<VisualTextElement>) => {
    if (!selectedElementId) return
    pushHistory({
      ...composition,
      elements: composition.elements.map((el) => {
        if (el.id !== selectedElementId || el.type !== 'TEXT') return el
        return { ...el, ...updates }
      }),
    })
  }

  const handleDeleteSelected = () => {
    if (!selectedElementId) return
    pushHistory({
      ...composition,
      elements: composition.elements.filter((el) => el.id !== selectedElementId),
    })
    setSelectedElementId(null)
    setIsEditingText(false)
  }

  // --------------------------------------------------------------------------
  // BACKGROUND ACTIONS (COLORS, GRADIENTS, EFFECTS)
  // --------------------------------------------------------------------------
  const handleSelectColorBackground = (hex: string) => {
    pushHistory({
      ...composition,
      background: {
        type: 'COLOR',
        color: hex,
        gradient: undefined,
        effect: composition.background.effect,
        positionX: 0,
        positionY: 0,
        scale: 1.0,
      },
    })
  }

  const handleSelectGradient = (
    from: string,
    to: string,
    direction: BackgroundGradientDirection = 'to bottom'
  ) => {
    pushHistory({
      ...composition,
      background: {
        type: 'GRADIENT',
        color: from,
        gradient: {
          from,
          to,
          direction,
        },
        effect: composition.background.effect,
        positionX: 0,
        positionY: 0,
        scale: 1.0,
      },
    })
  }

  const handleSetGradientDirection = (direction: BackgroundGradientDirection) => {
    if (composition.background.type !== 'GRADIENT' || !composition.background.gradient) {
      handleSelectGradient('#FBF9F5', '#1E4E8C', direction)
      return
    }
    pushHistory({
      ...composition,
      background: {
        ...composition.background,
        gradient: {
          ...composition.background.gradient,
          direction,
        },
      },
    })
  }

  const handleSelectEffect = (type: BackgroundEffectType) => {
    const currentIntensity = composition.background.effect?.intensity || 0.35
    pushHistory({
      ...composition,
      background: {
        ...composition.background,
        effect: type === 'none' ? undefined : { type, intensity: currentIntensity },
      },
    })
  }

  const handleSetEffectIntensity = (intensity: number) => {
    const currentType = composition.background.effect?.type || 'grain'
    if (currentType === 'none') return
    pushHistory({
      ...composition,
      background: {
        ...composition.background,
        effect: {
          type: currentType,
          intensity,
        },
      },
    })
  }

  const handleZoomBackground = (delta: number) => {
    if (composition.background.type !== 'IMAGE') return
    const currentScale = composition.background.scale || 1.0
    const nextScale = Math.max(1.0, Math.min(3.0, Number((currentScale + delta).toFixed(1))))

    pushHistory({
      ...composition,
      background: {
        ...composition.background,
        scale: nextScale,
      },
    })
  }

  const handleResetBackground = () => {
    if (composition.background.type !== 'IMAGE') return
    pushHistory({
      ...composition,
      background: {
        ...composition.background,
        positionX: 0,
        positionY: 0,
        scale: 1.0,
      },
    })
  }

  const matchingAsset = composition.background.mediaAssetId
    ? mediaAssets?.find((m) => m.id === composition.background.mediaAssetId)
    : null
  const effectiveMediaUrl = matchingAsset?.url || composition.background.mediaUrl || null
  const isImageBg = composition.background.type === 'IMAGE' && Boolean(effectiveMediaUrl)

  // Active gradient & effect states
  const activeGradient =
    composition.background.type === 'GRADIENT' ? composition.background.gradient : null
  const activeEffect = composition.background.effect || null

  return (
    <div className="flex flex-col gap-3 w-full">
      {/* 1. VISUAL CANVAS SURFACE (4:5 PORTRAIT RATIO) */}
      <div
        ref={canvasRef}
        onPointerDown={handlePointerDownCanvas}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          touchAction: 'none',
          ...(!isImageBg
            ? getVisualBackgroundStyle(composition.background)
            : { backgroundColor: '#0F1E36' }),
        }}
        className="relative aspect-4/5 w-full max-w-md mx-auto rounded-2xl overflow-hidden border border-cream-border shadow-md select-none cursor-default"
        aria-label="Surface de composition visuelle"
      >
        {/* Background Image Layer */}
        {isImageBg && (
          <div
            className="absolute inset-0 w-full h-full pointer-events-none transition-transform duration-75"
            style={{
              transform: `translate(${(composition.background.positionX || 0) * 100}%, ${(composition.background.positionY || 0) * 100}%) scale(${composition.background.scale || 1.0})`,
              transformOrigin: 'center center',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={effectiveMediaUrl as string}
              alt="Arrière-plan"
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        )}

        {/* Background Effect Layer */}
        <VisualBackgroundEffectLayer effect={composition.background.effect} />

        {/* Fallback Empty Canvas Hint */}
        {!isImageBg && composition.elements.length === 0 && !readOnly && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none opacity-60">
            <p className="font-serif text-lg font-bold text-ink">Votre visuel</p>
            <p className="text-xs text-ink-muted mt-1 max-w-[220px]">
              Choisissez une photo ou un fond, puis ajoutez votre texte et vos emojis.
            </p>
          </div>
        )}

        {/* Visual Elements Layer */}
        {composition.elements.map((el) => {
          const isSelected = el.id === selectedElementId

          if (el.type === 'TEXT') {
            const computedStyle = getTextElementCssStyle(el, composition.background)

            return (
              <div
                key={el.id}
                onPointerDown={(e) => handlePointerDownElement(e, el)}
                style={{
                  left: `${el.x * 100}%`,
                  top: `${el.y * 100}%`,
                  transform: `translate(-50%, -50%) scale(${el.scale})`,
                  touchAction: 'none',
                }}
                className={`absolute cursor-move select-none p-2 max-w-[85%] transition-shadow ${
                  isSelected && !readOnly
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-black/20 rounded-xl shadow-lg'
                    : ''
                }`}
              >
                <div
                  style={computedStyle}
                  className="text-base leading-snug text-balance"
                >
                  {el.text}
                </div>
              </div>
            )
          }

          if (el.type === 'EMOJI') {
            return (
              <div
                key={el.id}
                onPointerDown={(e) => handlePointerDownElement(e, el)}
                style={{
                  left: `${el.x * 100}%`,
                  top: `${el.y * 100}%`,
                  transform: `translate(-50%, -50%) scale(${el.scale})`,
                  touchAction: 'none',
                }}
                className={`absolute cursor-move select-none p-1 text-3xl leading-none transition-shadow ${
                  isSelected && !readOnly
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-black/20 rounded-full shadow-lg'
                    : ''
                }`}
              >
                {el.value}
              </div>
            )
          }

          return null
        })}
      </div>

      {/* 2. CANVAS CONTROLS & TOOLBAR */}
      {!readOnly && (
        <div className="flex flex-col gap-2 w-full max-w-md mx-auto">
          {/* Active Element Context & Rich Customization Inspector */}
          {selectedElement && selectedElement.type === 'TEXT' && (
            <div className="flex flex-col gap-2.5 p-3 bg-white border border-cream-border rounded-2xl shadow-md animate-fadeIn text-xs">
              {/* Header / Text inline edit bar */}
              <div className="flex items-center justify-between gap-2 pb-2 border-b border-cream-border">
                {isEditingText ? (
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <input
                      type="text"
                      value={editingTextValue}
                      onChange={(e) => setEditingTextValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveTextEdit()
                        if (e.key === 'Escape') setIsEditingText(false)
                      }}
                      autoFocus
                      placeholder="Modifier le texte..."
                      className="w-full px-2.5 py-1 bg-cream-subtle border border-cream-border rounded-lg text-xs text-ink focus:outline-none focus:ring-1 focus:ring-primary font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleSaveTextEdit}
                      className="p-1.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                      title="Valider"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingTextValue(selectedElement.text)
                        setIsEditingText(true)
                      }}
                      className="flex items-center gap-1.5 px-2.5 py-1 bg-cream-subtle hover:bg-cream-border rounded-lg text-ink truncate font-medium"
                      title="Éditer le texte"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate max-w-[170px] font-semibold">{selectedElement.text}</span>
                    </button>
                  </div>
                )}

                {/* Resize & Delete */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleResizeSelected(-0.15)}
                    className="p-1.5 hover:bg-cream-subtle rounded-md text-ink-muted hover:text-ink"
                    title="Réduire"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleResizeSelected(0.15)}
                    className="p-1.5 hover:bg-cream-subtle rounded-md text-ink-muted hover:text-ink"
                    title="Agrandir"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                  <div className="w-px h-4 bg-cream-border mx-0.5" />
                  <button
                    type="button"
                    onClick={handleDeleteSelected}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    title="Supprimer le bloc texte"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Inspector Section Tabs: [ Police ] [ Couleur ] [ Style ] [ Effet ] */}
              <div className="flex items-center gap-1 p-1 bg-cream-subtle rounded-xl border border-cream-border/60">
                <button
                  type="button"
                  onClick={() => setTextTab('FONT')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs transition-all ${
                    textTab === 'FONT'
                      ? 'bg-white text-ink shadow-2xs font-bold'
                      : 'text-ink-muted hover:text-ink font-medium'
                  }`}
                >
                  Police
                </button>
                <button
                  type="button"
                  onClick={() => setTextTab('COLOR')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs transition-all ${
                    textTab === 'COLOR'
                      ? 'bg-white text-ink shadow-2xs font-bold'
                      : 'text-ink-muted hover:text-ink font-medium'
                  }`}
                >
                  Couleur
                </button>
                <button
                  type="button"
                  onClick={() => setTextTab('STYLE')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs transition-all ${
                    textTab === 'STYLE'
                      ? 'bg-white text-ink shadow-2xs font-bold'
                      : 'text-ink-muted hover:text-ink font-medium'
                  }`}
                >
                  Style
                </button>
                <button
                  type="button"
                  onClick={() => setTextTab('EFFECT')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-xs transition-all ${
                    textTab === 'EFFECT'
                      ? 'bg-white text-ink shadow-2xs font-bold'
                      : 'text-ink-muted hover:text-ink font-medium'
                  }`}
                >
                  Effet
                </button>
              </div>

              {/* 1. TAB: POLICE */}
              {textTab === 'FONT' && (
                <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                  {/* Vos polices de marque (if available) */}
                  {activeBrandFonts.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1.5">
                        Vos polices
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {activeBrandFonts.map((fName) => {
                          const isSelected = selectedElement.fontFamily === fName
                          const fontObj = CURATED_FONTS.find((f) => f.name === fName)
                          const familyCss = fontObj ? fontObj.family : `'${fName}', sans-serif`

                          return (
                            <button
                              key={fName}
                              type="button"
                              onClick={() => handleUpdateSelectedText({ fontFamily: fName })}
                              className={`p-2 rounded-xl border text-left flex items-center justify-between transition-all ${
                                isSelected
                                  ? 'bg-primary-light/40 border-primary shadow-xs font-bold'
                                  : 'bg-white border-cream-border hover:bg-cream-subtle'
                              }`}
                            >
                              <span style={{ fontFamily: familyCss }} className="text-sm truncate">
                                {fName}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1" />}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Autres polices */}
                  <div>
                    <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1.5">
                      {activeBrandFonts.length > 0 ? 'Autres polices' : 'Polices disponibles'}
                    </span>
                    <div className="space-y-2">
                      {/* Sans serif */}
                      <div>
                        <span className="text-[10px] font-semibold text-ink-muted/80 block mb-1">Sans serif</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {CURATED_FONTS.filter((f) => f.category === 'sans-serif').map((font) => {
                            const isSelected = (selectedElement.fontFamily || 'Plus Jakarta Sans') === font.name
                            return (
                              <button
                                key={font.name}
                                type="button"
                                onClick={() => handleUpdateSelectedText({ fontFamily: font.name })}
                                className={`p-2 rounded-xl border text-left flex items-center justify-between transition-all ${
                                  isSelected
                                    ? 'bg-primary-light/40 border-primary shadow-xs font-bold'
                                    : 'bg-white border-cream-border hover:bg-cream-subtle'
                                }`}
                              >
                                <span style={{ fontFamily: font.family }} className="text-sm truncate">
                                  {font.name}
                                </span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1" />}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Serif */}
                      <div>
                        <span className="text-[10px] font-semibold text-ink-muted/80 block mb-1">Serif</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {CURATED_FONTS.filter((f) => f.category === 'serif').map((font) => {
                            const isSelected = selectedElement.fontFamily === font.name
                            return (
                              <button
                                key={font.name}
                                type="button"
                                onClick={() => handleUpdateSelectedText({ fontFamily: font.name })}
                                className={`p-2 rounded-xl border text-left flex items-center justify-between transition-all ${
                                  isSelected
                                    ? 'bg-primary-light/40 border-primary shadow-xs font-bold'
                                    : 'bg-white border-cream-border hover:bg-cream-subtle'
                                }`}
                              >
                                <span style={{ fontFamily: font.family }} className="text-sm truncate">
                                  {font.name}
                                </span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1" />}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Expressives */}
                      <div>
                        <span className="text-[10px] font-semibold text-ink-muted/80 block mb-1">Expressives</span>
                        <div className="grid grid-cols-2 gap-1.5">
                          {CURATED_FONTS.filter((f) => f.category === 'expressive').map((font) => {
                            const isSelected = selectedElement.fontFamily === font.name
                            return (
                              <button
                                key={font.name}
                                type="button"
                                onClick={() => handleUpdateSelectedText({ fontFamily: font.name })}
                                className={`p-2 rounded-xl border text-left flex items-center justify-between transition-all ${
                                  isSelected
                                    ? 'bg-primary-light/40 border-primary shadow-xs font-bold'
                                    : 'bg-white border-cream-border hover:bg-cream-subtle'
                                }`}
                              >
                                <span style={{ fontFamily: font.family }} className="text-sm truncate">
                                  {font.name}
                                </span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1" />}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. TAB: COULEUR */}
              {textTab === 'COLOR' && (
                <div className="space-y-3">
                  {/* Contraste Automatique Switch */}
                  <div className="flex items-center justify-between p-2.5 bg-cream-subtle/80 rounded-xl border border-cream-border/60">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-ink">Contraste automatique</span>
                      <span className="text-[10px] text-ink-muted">Ajuste le texte (Clair/Foncé) selon le fond</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateSelectedText({
                          autoContrast: !selectedElement.autoContrast,
                        })
                      }
                      className={`w-10 h-6 flex items-center rounded-full p-1 transition-colors ${
                        selectedElement.autoContrast ? 'bg-primary justify-end' : 'bg-cream-border justify-start'
                      }`}
                    >
                      <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
                    </button>
                  </div>

                  {!selectedElement.autoContrast && (
                    <>
                      {/* Vos couleurs */}
                      {activeBrandColors.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1.5">
                            Vos couleurs
                          </span>
                          <div className="grid grid-cols-6 gap-2">
                            {activeBrandColors.map((bg) => {
                              const isSelected = selectedElement.color?.toUpperCase() === bg.hex.toUpperCase()
                              return (
                                <button
                                  key={bg.hex}
                                  type="button"
                                  onClick={() => handleUpdateSelectedText({ color: bg.hex })}
                                  style={{ backgroundColor: bg.hex }}
                                  className={`w-8 h-8 rounded-xl border transition-all flex items-center justify-center ${
                                    isSelected
                                      ? 'ring-2 ring-primary ring-offset-1 scale-105 border-primary shadow-xs'
                                      : 'border-cream-border/80 hover:scale-105'
                                  }`}
                                  title={bg.label}
                                >
                                  {isSelected && (
                                    <Check
                                      className={`w-3.5 h-3.5 ${
                                        bg.textMode === 'LIGHT' ? 'text-white' : 'text-ink'
                                      }`}
                                    />
                                  )}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {/* Couleurs rapides */}
                      <div>
                        <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block mb-1.5">
                          Couleurs
                        </span>
                        <div className="grid grid-cols-6 gap-2">
                          {TEXT_PRESET_COLORS.map((c) => {
                            const isSelected = selectedElement.color?.toUpperCase() === c.hex.toUpperCase()
                            return (
                              <button
                                key={c.hex}
                                type="button"
                                onClick={() => handleUpdateSelectedText({ color: c.hex })}
                                style={{ backgroundColor: c.hex }}
                                className={`w-8 h-8 rounded-xl border transition-all flex items-center justify-center ${
                                  isSelected
                                    ? 'ring-2 ring-primary ring-offset-1 scale-105 border-primary shadow-xs'
                                    : 'border-cream-border/80 hover:scale-105'
                                }`}
                                title={c.label}
                              >
                                {isSelected && (
                                  <Check
                                    className={`w-3.5 h-3.5 ${
                                      c.hex === '#FFFFFF' || c.hex === '#FBF9F5' ? 'text-ink' : 'text-white'
                                    }`}
                                  />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Custom HEX color (+) */}
                      <div className="pt-2 border-t border-cream-border/60 flex items-center justify-between">
                        <span className="text-xs font-medium text-ink">Couleur personnalisée</span>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={selectedElement.color || '#FFFFFF'}
                            onChange={(e) => handleUpdateSelectedText({ color: e.target.value })}
                            className="w-7 h-7 rounded-lg cursor-pointer border border-cream-border p-0 bg-transparent"
                            title="Choisir une couleur"
                          />
                          <input
                            type="text"
                            value={selectedElement.color || '#FFFFFF'}
                            onChange={(e) => handleUpdateSelectedText({ color: e.target.value })}
                            placeholder="#FFFFFF"
                            className="w-20 px-2 py-1 bg-cream-subtle border border-cream-border rounded-lg text-xs font-mono text-ink"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* 3. TAB: STYLE */}
              {textTab === 'STYLE' && (
                <div className="space-y-3">
                  {/* Gras & Italique & Uppercase */}
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateSelectedText({
                          fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold',
                        })
                      }
                      className={`py-2 px-3 rounded-xl border font-bold text-xs flex items-center justify-center gap-1 transition-all ${
                        selectedElement.fontWeight === 'bold'
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-white border-cream-border text-ink hover:bg-cream-subtle'
                      }`}
                    >
                      <span>B</span>
                      <span>Gras</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateSelectedText({
                          fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic',
                        })
                      }
                      className={`py-2 px-3 rounded-xl border italic text-xs flex items-center justify-center gap-1 transition-all ${
                        selectedElement.fontStyle === 'italic'
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-white border-cream-border text-ink hover:bg-cream-subtle'
                      }`}
                    >
                      <span>I</span>
                      <span>Italique</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleUpdateSelectedText({
                          uppercase: !selectedElement.uppercase,
                        })
                      }
                      className={`py-2 px-3 rounded-xl border text-xs flex items-center justify-center gap-1 transition-all ${
                        selectedElement.uppercase
                          ? 'bg-primary text-white border-primary shadow-xs font-bold'
                          : 'bg-white border-cream-border text-ink hover:bg-cream-subtle'
                      }`}
                    >
                      <span>AA</span>
                      <span>Majuscules</span>
                    </button>
                  </div>

                  {/* Alignement */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
                      Alignement
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateSelectedText({ align: 'left' })}
                        className={`py-1.5 px-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                          selectedElement.align === 'left'
                            ? 'bg-primary text-white border-primary shadow-xs'
                            : 'bg-white border-cream-border text-ink hover:bg-cream-subtle'
                        }`}
                      >
                        Gauche
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateSelectedText({ align: 'center' })}
                        className={`py-1.5 px-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                          (!selectedElement.align || selectedElement.align === 'center')
                            ? 'bg-primary text-white border-primary shadow-xs'
                            : 'bg-white border-cream-border text-ink hover:bg-cream-subtle'
                        }`}
                      >
                        Centre
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateSelectedText({ align: 'right' })}
                        className={`py-1.5 px-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                          selectedElement.align === 'right'
                            ? 'bg-primary text-white border-primary shadow-xs'
                            : 'bg-white border-cream-border text-ink hover:bg-cream-subtle'
                        }`}
                      >
                        Droite
                      </button>
                    </div>
                  </div>

                  {/* Espacement des lettres */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-ink-muted uppercase tracking-wider block">
                      Espacement des lettres
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateSelectedText({ letterSpacing: 'normal' })}
                        className={`py-1.5 px-2 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all ${
                          (!selectedElement.letterSpacing || selectedElement.letterSpacing === 'normal')
                            ? 'bg-primary text-white border-primary shadow-xs'
                            : 'bg-white border-cream-border text-ink hover:bg-cream-subtle'
                        }`}
                      >
                        Normal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateSelectedText({ letterSpacing: '1.5px' })}
                        className={`py-1.5 px-2 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all ${
                          selectedElement.letterSpacing === '1.5px'
                            ? 'bg-primary text-white border-primary shadow-xs'
                            : 'bg-white border-cream-border text-ink hover:bg-cream-subtle'
                        }`}
                      >
                        Espacé
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateSelectedText({ letterSpacing: '3.5px' })}
                        className={`py-1.5 px-2 rounded-xl border text-xs font-semibold flex items-center justify-center transition-all ${
                          selectedElement.letterSpacing === '3.5px'
                            ? 'bg-primary text-white border-primary shadow-xs'
                            : 'bg-white border-cream-border text-ink hover:bg-cream-subtle'
                        }`}
                      >
                        Très espacé
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 4. TAB: EFFET */}
              {textTab === 'EFFECT' && (
                <div className="space-y-3">
                  {/* Effet type selector */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { type: 'none', label: 'Aucun' },
                      { type: 'shadow', label: 'Ombre' },
                      { type: 'outline', label: 'Contour' },
                      { type: 'highlight', label: 'Surligné' },
                      { type: 'glow', label: 'Éclat' },
                      { type: 'relief', label: 'Relief' },
                    ].map((eff) => {
                      const isSelected =
                        (!selectedElement.effect && eff.type === (selectedElement.boxStyle === 'PILL' ? 'highlight' : 'none')) ||
                        selectedElement.effect?.type === eff.type
                      return (
                        <button
                          key={eff.type}
                          type="button"
                          onClick={() =>
                            handleUpdateSelectedText({
                              effect: {
                                type: eff.type as TextEffectType,
                                intensity: selectedElement.effect?.intensity ?? 0.5,
                                color: selectedElement.effect?.color,
                              },
                              boxStyle: eff.type === 'highlight' ? 'PILL' : 'NONE',
                            })
                          }
                          className={`py-2 px-2.5 rounded-xl border text-xs font-semibold text-center transition-all ${
                            isSelected
                              ? 'bg-primary text-white border-primary shadow-xs'
                              : 'bg-white border-cream-border text-ink hover:bg-cream-subtle'
                          }`}
                        >
                          {eff.label}
                        </button>
                      )
                    })}
                  </div>

                  {/* Effect Sub-controls */}
                  {selectedElement.effect && selectedElement.effect.type !== 'none' && (
                    <div className="pt-2 border-t border-cream-border/60 space-y-2.5">
                      {/* Ombre options */}
                      {selectedElement.effect.type === 'shadow' && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-ink-muted uppercase tracking-wider text-[10px]">
                              Intensité de l’ombre
                            </span>
                            <span className="font-mono text-ink font-semibold">
                              {Math.round((selectedElement.effect.intensity ?? 0.5) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.05"
                            value={selectedElement.effect.intensity ?? 0.5}
                            onChange={(e) =>
                              handleUpdateSelectedText({
                                effect: {
                                  ...selectedElement.effect!,
                                  intensity: parseFloat(e.target.value),
                                },
                              })
                            }
                            className="w-full accent-primary h-1.5 bg-cream-border rounded-lg cursor-pointer"
                          />
                        </div>
                      )}

                      {/* Contour options */}
                      {selectedElement.effect.type === 'outline' && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-ink-muted uppercase tracking-wider text-[10px]">
                              Couleur du contour
                            </span>
                            <input
                              type="color"
                              value={selectedElement.effect.color || '#000000'}
                              onChange={(e) =>
                                handleUpdateSelectedText({
                                  effect: {
                                    ...selectedElement.effect!,
                                    color: e.target.value,
                                  },
                                })
                              }
                              className="w-6 h-6 rounded-md cursor-pointer border border-cream-border p-0"
                            />
                          </div>
                        </div>
                      )}

                      {/* Surligné options */}
                      {selectedElement.effect.type === 'highlight' && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-ink-muted uppercase tracking-wider text-[10px]">
                              Couleur de fond
                            </span>
                            <div className="flex items-center gap-1.5">
                              {['rgba(15, 30, 54, 0.75)', 'rgba(255, 255, 255, 0.90)', '#1E4E8C', '#D97757'].map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() =>
                                    handleUpdateSelectedText({
                                      effect: {
                                        ...selectedElement.effect!,
                                        color: c,
                                      },
                                    })
                                  }
                                  style={{ backgroundColor: c }}
                                  className="w-5 h-5 rounded-md border border-cream-border"
                                />
                              ))}
                              <input
                                type="color"
                                value={selectedElement.effect.color || '#1E4E8C'}
                                onChange={(e) =>
                                  handleUpdateSelectedText({
                                    effect: {
                                      ...selectedElement.effect!,
                                      color: e.target.value,
                                    },
                                  })
                                }
                                className="w-5 h-5 rounded-md cursor-pointer border border-cream-border p-0"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Éclat options */}
                      {selectedElement.effect.type === 'glow' && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-ink-muted uppercase tracking-wider text-[10px]">
                              Couleur de l’éclat
                            </span>
                            <input
                              type="color"
                              value={selectedElement.effect.color || selectedElement.color || '#FFFFFF'}
                              onChange={(e) =>
                                handleUpdateSelectedText({
                                  effect: {
                                    ...selectedElement.effect!,
                                    color: e.target.value,
                                  },
                                })
                              }
                              className="w-6 h-6 rounded-md cursor-pointer border border-cream-border p-0"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Main Visual Toolbar */}
          <div className="flex items-center gap-1.5 p-1.5 bg-white border border-cream-border rounded-2xl shadow-xs relative">
            {/* Photo Action Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setPhotoMenuOpen((prev) => !prev)
                  setPaletteOpen(false)
                  setEmojiPickerOpen(false)
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  photoMenuOpen
                    ? 'bg-primary-light text-primary-dark font-semibold'
                    : 'text-ink hover:bg-cream-subtle'
                }`}
              >
                <ImageIcon className="w-4 h-4 text-primary" />
                <span>Photo</span>
              </button>

              {/* Photo Menu Popover */}
              {photoMenuOpen && (
                <div className="absolute left-0 bottom-full mb-2 bg-white border border-cream-border rounded-2xl p-1.5 shadow-xl flex flex-col gap-1 w-44 z-30 animate-fadeIn">
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoMenuOpen(false)
                      onOpenMediaPicker?.()
                    }}
                    className="text-left px-3 py-2 text-xs font-medium text-ink hover:bg-cream-subtle rounded-xl transition-colors"
                  >
                    Mes médias
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoMenuOpen(false)
                      onOpenStockModal?.()
                    }}
                    className="text-left px-3 py-2 text-xs font-medium text-ink hover:bg-cream-subtle rounded-xl transition-colors"
                  >
                    Photos gratuites
                  </button>
                </div>
              )}
            </div>

            {/* Fond Action (Enriched 4-Category Background Picker) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setPaletteOpen((prev) => !prev)
                  setPhotoMenuOpen(false)
                  setEmojiPickerOpen(false)
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  paletteOpen
                    ? 'bg-primary-light text-primary-dark font-semibold'
                    : 'text-ink hover:bg-cream-subtle'
                }`}
              >
                <Palette className="w-4 h-4 text-primary" />
                <span>Fond</span>
              </button>

              {/* Enriched Background Selector Popover */}
              {paletteOpen && (
                <div className="absolute left-0 bottom-full mb-2 bg-white border border-cream-border rounded-2xl p-3 shadow-2xl flex flex-col gap-3 w-72 sm:w-80 max-h-[420px] overflow-y-auto z-40 animate-fadeIn">
                  {/* Category Switcher Tabs */}
                  <div className="flex items-center gap-1 p-1 bg-cream-subtle rounded-xl border border-cream-border/60">
                    <button
                      type="button"
                      onClick={() => setPaletteTab('COLORS')}
                      className={`flex-1 py-1 px-2 rounded-lg text-xs transition-all ${
                        paletteTab === 'COLORS'
                          ? 'bg-white text-ink shadow-2xs font-bold'
                          : 'text-ink-muted hover:text-ink font-medium'
                      }`}
                    >
                      Couleurs
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaletteTab('GRADIENTS')}
                      className={`flex-1 py-1 px-2 rounded-lg text-xs transition-all ${
                        paletteTab === 'GRADIENTS'
                          ? 'bg-white text-ink shadow-2xs font-bold'
                          : 'text-ink-muted hover:text-ink font-medium'
                      }`}
                    >
                      Dégradés
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaletteTab('EFFECTS')}
                      className={`flex-1 py-1 px-2 rounded-lg text-xs transition-all ${
                        paletteTab === 'EFFECTS'
                          ? 'bg-white text-ink shadow-2xs font-bold'
                          : 'text-ink-muted hover:text-ink font-medium'
                      }`}
                    >
                      Effets
                    </button>
                  </div>

                  {/* 1. TAB: COULEURS */}
                  {paletteTab === 'COLORS' && (
                    <div className="space-y-3">
                      {/* Section 1: Vos couleurs de marque */}
                      <div>
                        <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block mb-1.5">
                          Vos couleurs
                        </span>
                        <div className="grid grid-cols-6 gap-2">
                          {activeBrandColors.map((bg) => {
                            const isSelected =
                              composition.background.type === 'COLOR' &&
                              composition.background.color?.toUpperCase() === bg.hex.toUpperCase()
                            return (
                              <button
                                key={bg.hex}
                                type="button"
                                onClick={() => handleSelectColorBackground(bg.hex)}
                                style={{ backgroundColor: bg.hex }}
                                className={`w-8 h-8 rounded-xl border transition-all flex items-center justify-center ${
                                  isSelected
                                    ? 'ring-2 ring-primary ring-offset-1 scale-105 border-primary shadow-xs'
                                    : 'border-cream-border/80 hover:scale-105'
                                }`}
                                title={bg.label}
                              >
                                {isSelected && (
                                  <Check
                                    className={`w-3.5 h-3.5 ${
                                      bg.textMode === 'LIGHT' ? 'text-white' : 'text-ink'
                                    }`}
                                  />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Section 2: Autres couleurs */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                            Autres couleurs
                          </span>
                          <span className="text-[10px] text-ink-muted">24 nuances</span>
                        </div>
                        <div className="grid grid-cols-6 gap-2">
                          {RICH_BACKGROUND_COLORS.map((bg) => {
                            const isSelected =
                              composition.background.type === 'COLOR' &&
                              composition.background.color?.toUpperCase() === bg.hex.toUpperCase()
                            return (
                              <button
                                key={bg.hex}
                                type="button"
                                onClick={() => handleSelectColorBackground(bg.hex)}
                                style={{ backgroundColor: bg.hex }}
                                className={`w-8 h-8 rounded-xl border transition-all flex items-center justify-center ${
                                  isSelected
                                    ? 'ring-2 ring-primary ring-offset-1 scale-105 border-primary shadow-xs'
                                    : 'border-cream-border/80 hover:scale-105'
                                }`}
                                title={bg.label}
                              >
                                {isSelected && (
                                  <Check
                                    className={`w-3.5 h-3.5 ${
                                      bg.textMode === 'LIGHT' ? 'text-white' : 'text-ink'
                                    }`}
                                  />
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Section 3: Couleur personnalisée (+) */}
                      <div className="pt-1 border-t border-cream-border/60 flex items-center justify-between">
                        <span className="text-xs font-medium text-ink">Couleur libre</span>
                        <div className="flex items-center gap-2">
                          <input
                            ref={customColorInputRef}
                            type="color"
                            value={composition.background.color || '#FBF9F5'}
                            onChange={(e) => handleSelectColorBackground(e.target.value)}
                            className="w-7 h-7 rounded-lg cursor-pointer border border-cream-border p-0 bg-transparent"
                            title="Sélectionner une couleur personnalisée"
                          />
                          <button
                            type="button"
                            onClick={() => customColorInputRef.current?.click()}
                            className="flex items-center gap-1 px-2.5 py-1 bg-cream-subtle hover:bg-cream-border rounded-lg text-xs font-semibold text-ink transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5 text-primary" />
                            <span>Choisir</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 2. TAB: DÉGRADÉS */}
                  {paletteTab === 'GRADIENTS' && (
                    <div className="space-y-3">
                      {/* Presets Grid */}
                      <div>
                        <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block mb-1.5">
                          Dégradés prêts à l’emploi
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          {CURATED_GRADIENTS.map((grad) => {
                            const isSelected =
                              activeGradient &&
                              activeGradient.from.toUpperCase() === grad.from.toUpperCase() &&
                              activeGradient.to.toUpperCase() === grad.to.toUpperCase()
                            const gradientCss = `linear-gradient(135deg, ${grad.from}, ${grad.to})`

                            return (
                              <button
                                key={grad.id}
                                type="button"
                                onClick={() =>
                                  handleSelectGradient(
                                    grad.from,
                                    grad.to,
                                    activeGradient?.direction || grad.defaultDirection
                                  )
                                }
                                style={{ background: gradientCss }}
                                className={`h-11 rounded-xl border p-1 text-left flex flex-col justify-end transition-all relative overflow-hidden ${
                                  isSelected
                                    ? 'ring-2 ring-primary ring-offset-1 border-primary shadow-xs scale-102'
                                    : 'border-cream-border hover:scale-102'
                                }`}
                                title={grad.label}
                              >
                                {isSelected && (
                                  <div className="absolute top-1 right-1 bg-white/90 p-0.5 rounded-full shadow-2xs">
                                    <Check className="w-2.5 h-2.5 text-primary" />
                                  </div>
                                )}
                                <span className="text-[9px] font-bold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] truncate">
                                  {grad.label}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Gradient Orientation Controls (Shown when gradient active or selected) */}
                      <div className="pt-2 border-t border-cream-border/60 space-y-1.5">
                        <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block">
                          Orientation du dégradé
                        </span>
                        <div className="grid grid-cols-4 gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSetGradientDirection('to bottom')}
                            className={`py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                              activeGradient?.direction === 'to bottom'
                                ? 'bg-primary text-white shadow-xs'
                                : 'bg-cream-subtle text-ink hover:bg-cream-border'
                            }`}
                            title="Vertical (Haut vers bas)"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                            <span>Vertical</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetGradientDirection('to right')}
                            className={`py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                              activeGradient?.direction === 'to right'
                                ? 'bg-primary text-white shadow-xs'
                                : 'bg-cream-subtle text-ink hover:bg-cream-border'
                            }`}
                            title="Horizontal (Gauche vers droite)"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            <span>Horiz.</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetGradientDirection('to bottom right')}
                            className={`py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                              activeGradient?.direction === 'to bottom right'
                                ? 'bg-primary text-white shadow-xs'
                                : 'bg-cream-subtle text-ink hover:bg-cream-border'
                            }`}
                            title="Diagonal"
                          >
                            <ArrowDownRight className="w-3.5 h-3.5" />
                            <span>Diag.</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSetGradientDirection('radial')}
                            className={`py-1.5 px-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                              activeGradient?.direction === 'radial'
                                ? 'bg-primary text-white shadow-xs'
                                : 'bg-cream-subtle text-ink hover:bg-cream-border'
                            }`}
                            title="Radial (Centre vers extérieur)"
                          >
                            <Circle className="w-3.5 h-3.5" />
                            <span>Radial</span>
                          </button>
                        </div>
                      </div>

                      {/* Custom Gradient (Couleur 1 / Couleur 2) */}
                      <div className="pt-2 border-t border-cream-border/60 flex items-center justify-between">
                        <span className="text-xs font-medium text-ink">Dégradé sur-mesure</span>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <input
                              ref={customGradFromInputRef}
                              type="color"
                              value={activeGradient?.from || '#FBF9F5'}
                              onChange={(e) =>
                                handleSelectGradient(
                                  e.target.value,
                                  activeGradient?.to || '#1E4E8C',
                                  activeGradient?.direction || 'to bottom'
                                )
                              }
                              className="w-6 h-6 rounded-md cursor-pointer border border-cream-border p-0"
                              title="Couleur 1"
                            />
                            <span className="text-[10px] text-ink-muted">→</span>
                            <input
                              ref={customGradToInputRef}
                              type="color"
                              value={activeGradient?.to || '#1E4E8C'}
                              onChange={(e) =>
                                handleSelectGradient(
                                  activeGradient?.from || '#FBF9F5',
                                  e.target.value,
                                  activeGradient?.direction || 'to bottom'
                                )
                              }
                              className="w-6 h-6 rounded-md cursor-pointer border border-cream-border p-0"
                              title="Couleur 2"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 3. TAB: EFFETS */}
                  {paletteTab === 'EFFECTS' && (
                    <div className="space-y-3">
                      <div>
                        <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block mb-1.5">
                          Effet de matière & lumière
                        </span>
                        <div className="grid grid-cols-2 gap-2">
                          {CURATED_EFFECTS.map((eff) => {
                            const isSelected =
                              (!activeEffect && eff.id === 'none') ||
                              activeEffect?.type === eff.id
                            return (
                              <button
                                key={eff.id}
                                type="button"
                                onClick={() => handleSelectEffect(eff.id)}
                                className={`p-2 rounded-xl border text-left flex flex-col gap-0.5 transition-all ${
                                  isSelected
                                    ? 'bg-primary-light/40 border-primary shadow-xs'
                                    : 'bg-cream-subtle/50 border-cream-border hover:bg-cream-subtle'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-bold text-ink">{eff.label}</span>
                                  {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                                </div>
                                <span className="text-[10px] text-ink-muted leading-tight line-clamp-1">
                                  {eff.description}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      {/* Intensity Controls (When an effect is active) */}
                      {activeEffect && activeEffect.type !== 'none' && (
                        <div className="pt-2 border-t border-cream-border/60 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-ink-muted uppercase tracking-wider text-[11px]">
                              Intensité
                            </span>
                            <span className="font-mono text-ink font-semibold">
                              {Math.round(activeEffect.intensity * 100)}%
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSetEffectIntensity(0.2)}
                              className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all ${
                                activeEffect.intensity <= 0.25
                                  ? 'bg-primary text-white shadow-xs'
                                  : 'bg-cream-subtle text-ink hover:bg-cream-border'
                              }`}
                            >
                              Subtil
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetEffectIntensity(0.4)}
                              className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all ${
                                activeEffect.intensity > 0.25 && activeEffect.intensity <= 0.55
                                  ? 'bg-primary text-white shadow-xs'
                                  : 'bg-cream-subtle text-ink hover:bg-cream-border'
                              }`}
                            >
                              Équilibré
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetEffectIntensity(0.7)}
                              className={`flex-1 py-1 rounded-lg text-xs font-semibold transition-all ${
                                activeEffect.intensity > 0.55
                                  ? 'bg-primary text-white shadow-xs'
                                  : 'bg-cream-subtle text-ink hover:bg-cream-border'
                              }`}
                            >
                              Prononcé
                            </button>
                          </div>

                          <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.05"
                            value={activeEffect.intensity}
                            onChange={(e) => handleSetEffectIntensity(parseFloat(e.target.value))}
                            className="w-full accent-primary h-1.5 bg-cream-border rounded-lg cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Texte Action */}
            <button
              type="button"
              onClick={handleAddText}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-ink hover:bg-cream-subtle transition-colors"
              title="Texte sur l’image"
            >
              <Type className="w-4 h-4 text-primary" />
              <span>Texte sur l’image</span>
            </button>

            {/* Emoji Action */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setEmojiPickerOpen((prev) => !prev)
                  setPaletteOpen(false)
                  setPhotoMenuOpen(false)
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  emojiPickerOpen
                    ? 'bg-primary-light text-primary-dark font-semibold'
                    : 'text-ink hover:bg-cream-subtle'
                }`}
              >
                <Smile className="w-4 h-4 text-primary" />
                <span>😊</span>
              </button>

              {/* Emoji Picker Popover */}
              {emojiPickerOpen && (
                <div className="absolute right-0 bottom-full mb-2 bg-white border border-cream-border rounded-2xl p-3 shadow-xl flex flex-col gap-2 w-56 z-30 animate-fadeIn">
                  <span className="text-[11px] font-semibold text-ink-muted">Ajouter un emoji</span>
                  <div className="grid grid-cols-6 gap-1.5">
                    {CURATED_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleAddEmoji(emoji)}
                        className="p-1.5 text-xl hover:bg-cream-subtle rounded-lg transition-transform hover:scale-110 text-center"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Undo Action */}
            <button
              type="button"
              onClick={handleUndo}
              disabled={history.length === 0}
              className="p-2 text-ink-muted hover:text-ink disabled:opacity-30 rounded-xl hover:bg-cream-subtle transition-colors ml-auto"
              title="Annuler la dernière action"
            >
              <Undo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Background Image Adjustments Bar (When image is background) */}
          {isImageBg && (
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-white border border-cream-border rounded-xl text-[11px] text-ink-muted shadow-2xs">
              <span className="flex items-center gap-1">
                <Move className="w-3 h-3 text-primary" />
                <span>Glissez pour cadrer la photo</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleZoomBackground(-0.15)}
                  className="px-1.5 py-0.5 border border-cream-border rounded-md bg-white hover:bg-cream-subtle text-ink font-semibold"
                  title="Dézoomer photo"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => handleZoomBackground(0.15)}
                  className="px-1.5 py-0.5 border border-cream-border rounded-md bg-white hover:bg-cream-subtle text-ink font-semibold"
                  title="Zoomer photo"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={handleResetBackground}
                  className="px-2 py-0.5 text-[10px] text-ink-muted hover:text-ink ml-1"
                >
                  Recentrer
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
