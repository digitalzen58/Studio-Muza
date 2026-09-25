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
  SunMedium,
  Moon,
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
  BRAND_BACKGROUND_COLORS,
  RICH_BACKGROUND_COLORS,
  CURATED_GRADIENTS,
  CURATED_EFFECTS,
  CURATED_EMOJIS,
  getVisualBackgroundStyle,
} from '@/services/visual-composition/types'
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
  onOpenMediaPicker?: () => void
  onOpenStockModal?: () => void
  readOnly?: boolean
}

export function VisualCanvas({
  composition,
  onChange,
  mediaAssets = [],
  brandColors,
  onOpenMediaPicker,
  onOpenStockModal,
  readOnly = false,
}: VisualCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)
  const customColorInputRef = useRef<HTMLInputElement>(null)
  const customGradFromInputRef = useRef<HTMLInputElement>(null)
  const customGradToInputRef = useRef<HTMLInputElement>(null)

  // Brand colors list (uses custom business brandColors if provided)
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

  // Selection & active manipulation state
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [isEditingText, setIsEditingText] = useState(false)
  const [editingTextValue, setEditingTextValue] = useState('')

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
  // ELEMENT ACTIONS (ADD / EDIT / RESIZE / DELETE / STYLE)
  // --------------------------------------------------------------------------
  const handleAddText = () => {
    const textId =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `text-${composition.elements.length + 1}`
    const isLightBg =
      composition.background.type === 'COLOR'
        ? composition.background.color === '#FFFFFF' ||
          composition.background.color === '#FBF9F5' ||
          composition.background.color === '#EDF4FC'
        : false

    const newText: VisualTextElement = {
      id: textId,
      type: 'TEXT',
      text: 'Votre texte',
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      colorMode: isLightBg ? 'DARK' : 'LIGHT',
      boxStyle: 'PILL',
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

  const handleToggleColorMode = () => {
    if (!selectedElementId) return
    pushHistory({
      ...composition,
      elements: composition.elements.map((el) => {
        if (el.id !== selectedElementId || el.type !== 'TEXT') return el
        const nextMode = el.colorMode === 'LIGHT' ? 'DARK' : 'LIGHT'
        return { ...el, colorMode: nextMode }
      }),
    })
  }

  const handleToggleBoxStyle = () => {
    if (!selectedElementId) return
    pushHistory({
      ...composition,
      elements: composition.elements.map((el) => {
        if (el.id !== selectedElementId || el.type !== 'TEXT') return el
        const nextStyle = el.boxStyle === 'PILL' ? 'NONE' : 'PILL'
        return { ...el, boxStyle: nextStyle }
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
            const isLight = el.colorMode === 'LIGHT'
            const isPill = el.boxStyle === 'PILL'

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
                className={`absolute cursor-move select-none p-2 max-w-[85%] text-center transition-shadow ${
                  isSelected && !readOnly
                    ? 'ring-2 ring-primary ring-offset-2 ring-offset-black/20 rounded-xl shadow-lg'
                    : ''
                }`}
              >
                <div
                  className={`font-serif text-base font-bold leading-snug px-3 py-1.5 rounded-xl text-balance ${
                    isPill
                      ? isLight
                        ? 'bg-black/60 text-white backdrop-blur-xs shadow-xs'
                        : 'bg-white/90 text-ink backdrop-blur-xs shadow-xs'
                      : isLight
                        ? 'text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]'
                        : 'text-ink drop-shadow-[0_1px_2px_rgba(255,255,255,0.8)]'
                  }`}
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
          {/* Active Element Context Bar */}
          {selectedElement && (
            <div className="flex items-center justify-between gap-2 p-2 bg-white border border-cream-border rounded-xl shadow-xs animate-fadeIn text-xs">
              {selectedElement.type === 'TEXT' && (
                <>
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
                        className="w-full px-2 py-1 bg-cream-subtle border border-cream-border rounded-lg text-xs text-ink focus:outline-none focus:ring-1 focus:ring-primary"
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
                          setEditingTextValue(
                            selectedElement.type === 'TEXT' ? selectedElement.text : ''
                          )
                          setIsEditingText(true)
                        }}
                        className="flex items-center gap-1 px-2 py-1 bg-cream-subtle hover:bg-cream-border rounded-lg text-ink truncate font-medium"
                        title="Éditer le texte"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">
                          {selectedElement.type === 'TEXT' ? selectedElement.text : ''}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleColorMode}
                        className="p-1.5 hover:bg-cream-subtle rounded-lg text-ink-muted hover:text-ink transition-colors"
                        title={
                          selectedElement.type === 'TEXT' && selectedElement.colorMode === 'LIGHT'
                            ? 'Passer en texte sombre'
                            : 'Passer en texte clair'
                        }
                      >
                        {selectedElement.type === 'TEXT' &&
                        selectedElement.colorMode === 'LIGHT' ? (
                          <SunMedium className="w-3.5 h-3.5" />
                        ) : (
                          <Moon className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleToggleBoxStyle}
                        className={`px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                          selectedElement.type === 'TEXT' && selectedElement.boxStyle === 'PILL'
                            ? 'bg-primary-light text-primary-dark'
                            : 'bg-cream-subtle text-ink-muted hover:text-ink'
                        }`}
                        title="Fond cartouche (Pill)"
                      >
                        Pill
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Shared Scale & Delete Actions */}
              <div className="flex items-center gap-1 shrink-0 ml-auto">
                <button
                  type="button"
                  onClick={() => handleResizeSelected(-0.15)}
                  className="p-1 hover:bg-cream-subtle rounded-md text-ink-muted hover:text-ink"
                  title="Réduire"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleResizeSelected(0.15)}
                  className="p-1 hover:bg-cream-subtle rounded-md text-ink-muted hover:text-ink"
                  title="Agrandir"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <div className="w-px h-4 bg-cream-border mx-0.5" />
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="p-1 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                  title="Supprimer l’élément"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
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
