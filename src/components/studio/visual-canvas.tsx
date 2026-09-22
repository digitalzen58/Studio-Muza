'use client'

import React, { useState, useRef, useCallback } from 'react'
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
} from 'lucide-react'
import {
  type VisualComposition,
  type VisualElement,
  type VisualTextElement,
  type VisualEmojiElement,
  BRAND_BACKGROUND_COLORS,
  CURATED_EMOJIS,
} from '@/services/visual-composition/types'
import type { BrandMediaAsset } from '@/services/media'

interface VisualCanvasProps {
  composition: VisualComposition
  onChange: (newComposition: VisualComposition) => void
  mediaAssets?: BrandMediaAsset[]
  onOpenMediaPicker?: () => void
  onOpenStockModal?: () => void
  readOnly?: boolean
}

export function VisualCanvas({
  composition,
  onChange,
  onOpenMediaPicker,
  onOpenStockModal,
  readOnly = false,
}: VisualCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null)

  // Selection & active manipulation state
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null)
  const [isEditingText, setIsEditingText] = useState(false)
  const [editingTextValue, setEditingTextValue] = useState('')

  // Popovers
  const [paletteOpen, setPaletteOpen] = useState(false)
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
    const textId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `text-${composition.elements.length + 1}`
    const newText: VisualTextElement = {
      id: textId,
      type: 'TEXT',
      text: 'Votre texte',
      x: 0.5,
      y: 0.5,
      scale: 1.0,
      colorMode: composition.background.type === 'COLOR' && composition.background.color === '#FDFBF7' ? 'DARK' : 'LIGHT',
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
    const emojiId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `emoji-${composition.elements.length + 1}`
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
  // BACKGROUND ACTIONS
  // --------------------------------------------------------------------------
  const handleSelectColorBackground = (hex: string) => {
    pushHistory({
      ...composition,
      background: {
        type: 'COLOR',
        color: hex,
        positionX: 0,
        positionY: 0,
        scale: 1.0,
      },
    })
    setPaletteOpen(false)
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

  const isImageBg = composition.background.type === 'IMAGE' && Boolean(composition.background.mediaUrl)

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
          backgroundColor: !isImageBg ? composition.background.color || '#FDFBF7' : '#1E1E24',
        }}
        className="relative aspect-4/5 w-full max-w-md mx-auto rounded-2xl overflow-hidden border border-ivory-border shadow-md select-none cursor-default"
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
              src={composition.background.mediaUrl as string}
              alt="Arrière-plan"
              className="w-full h-full object-cover"
              draggable={false}
            />
          </div>
        )}

        {/* Fallback Empty Canvas Hint */}
        {!isImageBg && composition.elements.length === 0 && !readOnly && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center pointer-events-none opacity-60">
            <p className="font-serif text-lg font-bold text-ink">
              Votre visuel
            </p>
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
                    ? 'ring-2 ring-terracotta ring-offset-2 ring-offset-black/20 rounded-xl shadow-lg'
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
                className={`absolute cursor-move select-none p-1 transition-shadow ${
                  isSelected && !readOnly
                    ? 'ring-2 ring-terracotta ring-offset-2 ring-offset-black/20 rounded-full shadow-lg'
                    : ''
                }`}
              >
                <span className="text-3xl leading-none drop-shadow-sm filter">
                  {el.value}
                </span>
              </div>
            )
          }

          return null
        })}

        {/* Selected Element Quick Action Bar Overlay */}
        {selectedElement && !readOnly && !isEditingText && (
          <div
            className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-ink/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg animate-fadeIn z-20"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {selectedElement.type === 'TEXT' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditingTextValue(selectedElement.text)
                    setIsEditingText(true)
                  }}
                  className="p-1.5 hover:bg-white/20 rounded-lg text-xs flex items-center gap-1"
                  title="Modifier le texte"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Modifier</span>
                </button>
                <div className="w-px h-3.5 bg-white/20" />
                <button
                  type="button"
                  onClick={handleToggleColorMode}
                  className="p-1.5 hover:bg-white/20 rounded-lg"
                  title="Basculer clair/foncé"
                >
                  {selectedElement.colorMode === 'LIGHT' ? (
                    <SunMedium className="w-3.5 h-3.5 text-amber-300" />
                  ) : (
                    <Moon className="w-3.5 h-3.5 text-blue-300" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleToggleBoxStyle}
                  className={`p-1.5 hover:bg-white/20 rounded-lg text-[10px] font-semibold px-2 ${
                    selectedElement.boxStyle === 'PILL' ? 'bg-terracotta text-white' : ''
                  }`}
                  title="Fond contrasté"
                >
                  Bandeau
                </button>
                <div className="w-px h-3.5 bg-white/20" />
              </>
            )}

            {/* Scale controls */}
            <button
              type="button"
              onClick={() => handleResizeSelected(-0.15)}
              className="p-1.5 hover:bg-white/20 rounded-lg"
              title="Réduire"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleResizeSelected(0.15)}
              className="p-1.5 hover:bg-white/20 rounded-lg"
              title="Agrandir"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>

            <div className="w-px h-3.5 bg-white/20" />

            {/* Delete button */}
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="p-1.5 hover:bg-red-500/30 text-red-400 hover:text-red-300 rounded-lg"
              title="Supprimer l'élément"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Inline Text Edit Overlay Modal */}
        {isEditingText && selectedElement?.type === 'TEXT' && (
          <div
            className="absolute inset-0 bg-ink/70 backdrop-blur-xs flex flex-col items-center justify-center p-4 z-30 animate-fadeIn"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="bg-ivory-card border border-ivory-border p-4 rounded-2xl w-full max-w-xs space-y-3 shadow-xl">
              <label className="block text-xs font-semibold text-ink">
                Texte sur l’image
              </label>
              <textarea
                value={editingTextValue}
                onChange={(e) => setEditingTextValue(e.target.value)}
                placeholder="Votre texte..."
                rows={3}
                autoFocus
                className="w-full text-sm p-2.5 bg-white border border-ivory-border rounded-xl text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 resize-none font-serif"
              />
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingText(false)}
                  className="px-3 py-1.5 text-xs text-ink-muted hover:text-ink font-medium"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleSaveTextEdit}
                  className="px-3.5 py-1.5 bg-terracotta text-white rounded-xl text-xs font-semibold shadow-xs flex items-center gap-1"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Valider</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2. PRIMARY VISUAL TOOLBAR (UNDER CANVAS) */}
      {!readOnly && (
        <div className="flex flex-col gap-2 w-full max-w-md mx-auto">
          {/* Main Actions Row */}
          <div className="flex items-center justify-between gap-1.5 p-2 bg-white border border-ivory-border rounded-2xl shadow-2xs">
            {/* Photo Action */}
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
                    ? 'bg-terracotta-light text-terracotta-dark font-semibold'
                    : 'text-ink hover:bg-ivory-subtle'
                }`}
              >
                <ImageIcon className="w-4 h-4 text-terracotta" />
                <span>Photo</span>
              </button>

              {/* Photo Menu Popover */}
              {photoMenuOpen && (
                <div className="absolute left-0 bottom-full mb-2 bg-ivory-card border border-ivory-border rounded-2xl p-2 shadow-xl flex flex-col gap-1 w-44 z-30 animate-fadeIn">
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoMenuOpen(false)
                      onOpenMediaPicker?.()
                    }}
                    className="text-left px-3 py-2 text-xs font-medium text-ink hover:bg-white rounded-xl transition-colors"
                  >
                    Mes médias
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoMenuOpen(false)
                      onOpenStockModal?.()
                    }}
                    className="text-left px-3 py-2 text-xs font-medium text-ink hover:bg-white rounded-xl transition-colors"
                  >
                    Photos gratuites
                  </button>
                </div>
              )}
            </div>

            {/* Fond (Plain Background) Action */}
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
                    ? 'bg-terracotta-light text-terracotta-dark font-semibold'
                    : 'text-ink hover:bg-ivory-subtle'
                }`}
              >
                <Palette className="w-4 h-4 text-terracotta" />
                <span>Fond</span>
              </button>

              {/* Color Palette Popover */}
              {paletteOpen && (
                <div className="absolute left-0 bottom-full mb-2 bg-ivory-card border border-ivory-border rounded-2xl p-3 shadow-xl flex flex-col gap-2 w-48 z-30 animate-fadeIn">
                  <span className="text-[11px] font-semibold text-ink-muted">
                    Couleur de fond
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {BRAND_BACKGROUND_COLORS.map((bg) => (
                      <button
                        key={bg.hex}
                        type="button"
                        onClick={() => handleSelectColorBackground(bg.hex)}
                        style={{ backgroundColor: bg.hex }}
                        className="w-10 h-10 rounded-xl border border-ivory-border/80 shadow-2xs hover:scale-105 transition-transform"
                        title={bg.label}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Texte Action */}
            <button
              type="button"
              onClick={handleAddText}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-ink hover:bg-ivory-subtle transition-colors"
            >
              <Type className="w-4 h-4 text-terracotta" />
              <span>Texte</span>
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
                    ? 'bg-terracotta-light text-terracotta-dark font-semibold'
                    : 'text-ink hover:bg-ivory-subtle'
                }`}
              >
                <Smile className="w-4 h-4 text-terracotta" />
                <span>😊</span>
              </button>

              {/* Emoji Picker Popover */}
              {emojiPickerOpen && (
                <div className="absolute right-0 bottom-full mb-2 bg-ivory-card border border-ivory-border rounded-2xl p-3 shadow-xl flex flex-col gap-2 w-56 z-30 animate-fadeIn">
                  <span className="text-[11px] font-semibold text-ink-muted">
                    Ajouter un emoji
                  </span>
                  <div className="grid grid-cols-6 gap-1.5">
                    {CURATED_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => handleAddEmoji(emoji)}
                        className="p-1.5 text-xl hover:bg-white rounded-lg transition-transform hover:scale-110 text-center"
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
              className="p-2 text-ink-muted hover:text-ink disabled:opacity-30 rounded-xl hover:bg-ivory-subtle transition-colors ml-auto"
              title="Annuler la dernière action"
            >
              <Undo2 className="w-4 h-4" />
            </button>
          </div>

          {/* Background Image Adjustments Bar (When image is background) */}
          {isImageBg && (
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-ivory-card/80 border border-ivory-border/70 rounded-xl text-[11px] text-ink-muted">
              <span className="flex items-center gap-1">
                <Move className="w-3 h-3 text-terracotta" />
                <span>Glissez pour cadrer la photo</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleZoomBackground(-0.15)}
                  className="px-1.5 py-0.5 border border-ivory-border rounded-md bg-white hover:bg-ivory-subtle text-ink font-semibold"
                  title="Dézoomer photo"
                >
                  −
                </button>
                <button
                  type="button"
                  onClick={() => handleZoomBackground(0.15)}
                  className="px-1.5 py-0.5 border border-ivory-border rounded-md bg-white hover:bg-ivory-subtle text-ink font-semibold"
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
