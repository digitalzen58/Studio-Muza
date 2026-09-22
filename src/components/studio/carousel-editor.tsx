'use client'

import React from 'react'
import {
  Sparkles,
  ImageIcon,
  Sparkle,
  Trash2,
  RefreshCw,
} from 'lucide-react'
import { WritingAssistancePanel } from './writing-assistance-panel'
import type { BrandMediaAsset } from '@/services/media'
import type { CarouselSlideData } from '@/actions/content'
import type { WritingOperation, WritingTargetType } from '@/services/ai-assistance/types'

interface ActiveAssistanceState {
  targetType: WritingTargetType
  targetIndex?: number
  operation: WritingOperation
  isPending: boolean
  options: string[]
  error: string | null
  originalTextHash?: string
}

interface CarouselEditorProps {
  workingTitle: string
  setWorkingTitle: (v: string) => void
  hook: string
  setHook: (v: string) => void
  caption: string
  setCaption: (v: string) => void
  cta: string
  setCta: (v: string) => void
  slides: CarouselSlideData[]
  setSlides: React.Dispatch<React.SetStateAction<CarouselSlideData[]>>
  activeSlideIndex: number
  setActiveSlideIndex: (i: number) => void
  mediaAssets: BrandMediaAsset[]
  setIsDirty: (dirty: boolean) => void
  onOpenMediaPicker: () => void
  onOpenStockModal: () => void
  onRequestAssistance: (targetType: WritingTargetType, op: WritingOperation, index?: number) => void
  assistanceState: ActiveAssistanceState | null
  onDismissAssistance: () => void
  slideTextareaRef: React.RefObject<HTMLTextAreaElement | null>
  captionTextareaRef: React.RefObject<HTMLTextAreaElement | null>
}

export function CarouselEditor({
  workingTitle,
  setWorkingTitle,
  hook,
  setHook,
  caption,
  setCaption,
  cta,
  setCta,
  slides,
  setSlides,
  activeSlideIndex,
  setActiveSlideIndex,
  mediaAssets,
  setIsDirty,
  onOpenMediaPicker,
  onOpenStockModal,
  onRequestAssistance,
  assistanceState,
  onDismissAssistance,
  slideTextareaRef,
  captionTextareaRef,
}: CarouselEditorProps) {
  const activeSlide = slides.find((s) => s.index === activeSlideIndex) || slides[0]
  const activeSlideMedia = activeSlide?.media_id
    ? mediaAssets.find((m) => m.id === activeSlide.media_id)
    : null

  const handleSlideTextChange = (text: string) => {
    setSlides((prev) =>
      prev.map((s) => (s.index === activeSlideIndex ? { ...s, text } : s))
    )
    setIsDirty(true)
  }

  const handleRemoveSlideMedia = () => {
    setSlides((prev) =>
      prev.map((s) => (s.index === activeSlideIndex ? { ...s, media_id: null } : s))
    )
    setIsDirty(true)
  }

  return (
    <div className="space-y-6">
      {/* 1. Main Editorial Form */}
      <section className="space-y-5">
        {/* Working Title */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Titre de travail
          </label>
          <input
            type="text"
            value={workingTitle}
            onChange={(e) => {
              setWorkingTitle(e.target.value)
              setIsDirty(true)
            }}
            placeholder="Ex: 3 balades d'automne incontournables..."
            className="w-full px-3.5 py-2.5 bg-white border border-ivory-border rounded-xl text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
          />
        </div>

        {/* Carousel Slides Scaffold */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Pages du carrousel ({slides.length} pages)
            </label>
            <span className="text-[11px] text-ink-muted">Cliquez pour modifier</span>
          </div>

          {/* Slide Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {slides.map((slide) => {
              const isActive = slide.index === activeSlideIndex
              const hasText = Boolean(slide.text?.trim())
              return (
                <button
                  key={slide.index}
                  type="button"
                  onClick={() => setActiveSlideIndex(slide.index)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all shrink-0 border ${
                    isActive
                      ? 'bg-terracotta text-white border-terracotta shadow-xs'
                      : hasText || slide.media_id
                      ? 'bg-ivory-card text-ink border-terracotta/40'
                      : 'bg-white text-ink-muted border-ivory-border hover:bg-ivory-subtle'
                  }`}
                >
                  <span className="text-[10px] font-bold opacity-80">Page {slide.index}</span>
                  <span>{slide.label}</span>
                  {slide.media_id && (
                    <ImageIcon className={`w-3 h-3 ${isActive ? 'text-white/90' : 'text-terracotta'} shrink-0`} />
                  )}
                </button>
              )
            })}
          </div>

          {/* Active Slide Editor Box */}
          <div className="bg-ivory-card/60 border border-ivory-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink">
                Page {activeSlide.index} sur {slides.length} — {activeSlide.label}
              </span>
              <span className="text-[11px] text-ink-muted">
                {activeSlide.type === 'COVER'
                  ? 'Accroche visuelle'
                  : activeSlide.type === 'CTA'
                  ? 'Appel à l’action final'
                  : 'Contenu'}
              </span>
            </div>

            {/* Slide Visual / Media Assignment */}
            {activeSlideMedia ? (
              <div className="flex items-center gap-3 p-3 bg-white border border-ivory-border rounded-xl">
                <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-ivory-border bg-ivory-subtle shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activeSlideMedia.url}
                    alt={activeSlideMedia.alt || activeSlideMedia.original_filename || 'Visuel'}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-xs font-medium text-ink truncate max-w-[200px]">
                      {activeSlideMedia.original_filename || 'Photo choisie'}
                    </p>
                    {activeSlideMedia.source?.startsWith('STOCK') && (
                      <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/80 border border-amber-200/80 px-2 py-0.2 rounded-full">
                        Photo d’illustration
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-ink-muted">
                    {activeSlideMedia.source === 'STOCK_PEXELS'
                      ? 'Banque libre de droit Pexels'
                      : 'Média personnel'}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={onOpenMediaPicker}
                    className="p-1.5 text-xs text-ink hover:text-terracotta border border-ivory-border rounded-lg hover:bg-ivory-subtle transition-colors"
                    title="Changer de photo"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveSlideMedia}
                    className="p-1.5 text-xs text-red-600 hover:text-red-700 border border-red-200/80 rounded-lg hover:bg-red-50 transition-colors"
                    title="Retirer la photo de cette page"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 bg-white/70 border border-dashed border-ivory-border rounded-xl">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-ink-muted/60" />
                  <span className="text-xs text-ink-muted">
                    Aucune photo pour cette page
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onOpenMediaPicker}
                    className="text-xs font-medium text-terracotta hover:underline"
                  >
                    Mes médias
                  </button>
                  <span className="text-xs text-ink-muted/40">•</span>
                  <button
                    type="button"
                    onClick={onOpenStockModal}
                    className="text-xs font-medium text-terracotta hover:underline"
                  >
                    Photos gratuites
                  </button>
                </div>
              </div>
            )}

            {/* Slide Copy Area */}
            <div className="space-y-1.5 pt-1">
              <label className="block text-[11px] font-semibold text-ink-muted uppercase tracking-wider">
                Texte de la page {activeSlide.index}
              </label>
              <textarea
                ref={slideTextareaRef}
                value={activeSlide.text}
                onChange={(e) => handleSlideTextChange(e.target.value)}
                placeholder={`Écrivez le texte pour la page "${activeSlide.label}"...`}
                style={{ minHeight: '160px', maxHeight: '260px' }}
                className="w-full px-3.5 py-2.5 bg-white border border-ivory-border rounded-xl text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all resize-none min-h-[160px] max-h-[260px] leading-relaxed"
              />

              {/* Contextual writing assistance for slide */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] text-ink-muted">
                  {activeSlide.text.length} caractères
                </span>
                <div className="flex items-center gap-2">
                  {!activeSlide.text.trim() ? (
                    <button
                      type="button"
                      onClick={() =>
                        onRequestAssistance('CAROUSEL_SLIDE', 'HELP_WRITE', activeSlide.index)
                      }
                      disabled={Boolean(assistanceState?.isPending)}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-terracotta hover:underline disabled:opacity-50"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>M’aider à écrire ✦</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          onRequestAssistance('CAROUSEL_SLIDE', 'IMPROVE_TEXT', activeSlide.index)
                        }
                        disabled={Boolean(assistanceState?.isPending)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-terracotta hover:underline disabled:opacity-50"
                      >
                        <span>Améliorer ✦</span>
                      </button>
                      <span className="text-ink-muted/40 text-xs">•</span>
                      <button
                        type="button"
                        onClick={() =>
                          onRequestAssistance('CAROUSEL_SLIDE', 'SHORTEN_TEXT', activeSlide.index)
                        }
                        disabled={Boolean(assistanceState?.isPending)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-terracotta hover:underline disabled:opacity-50"
                      >
                        <span>Raccourcir ✦</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Assistance Panel for Carousel Slide */}
              {assistanceState?.targetType === 'CAROUSEL_SLIDE' &&
                assistanceState.targetIndex === activeSlide.index && (
                  <WritingAssistancePanel
                    operation={assistanceState.operation}
                    targetType={assistanceState.targetType}
                    targetIndex={assistanceState.targetIndex}
                    options={assistanceState.options}
                    isPending={assistanceState.isPending}
                    error={assistanceState.error}
                    originalTextHash={assistanceState.originalTextHash}
                    currentEditorText={activeSlide.text}
                    onApply={(text) => {
                      handleSlideTextChange(text)
                      onDismissAssistance()
                    }}
                    onRetry={() =>
                      onRequestAssistance(
                        'CAROUSEL_SLIDE',
                        assistanceState.operation,
                        activeSlide.index
                      )
                    }
                    onDismiss={onDismissAssistance}
                  />
                )}
            </div>
          </div>
        </div>

        {/* Hook / Accroche */}
        <div className="space-y-1.5 pt-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Accroche principale
            </label>
            <button
              type="button"
              onClick={() => onRequestAssistance('HOOK', 'SUGGEST_HOOKS')}
              disabled={Boolean(assistanceState?.isPending)}
              className="inline-flex items-center gap-1 text-[11px] font-medium text-terracotta hover:underline disabled:opacity-50"
            >
              <Sparkles className="w-3 h-3" />
              <span>Proposer des accroches ✦</span>
            </button>
          </div>
          <input
            type="text"
            value={hook}
            onChange={(e) => {
              setHook(e.target.value)
              setIsDirty(true)
            }}
            placeholder="Ex: Et si votre chien avait lui aussi besoin d'un week-end ?"
            className="w-full px-3.5 py-2.5 bg-white border border-ivory-border rounded-xl text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
          />

          {assistanceState?.targetType === 'HOOK' && (
            <WritingAssistancePanel
              operation={assistanceState.operation}
              targetType={assistanceState.targetType}
              options={assistanceState.options}
              isPending={assistanceState.isPending}
              error={assistanceState.error}
              originalTextHash={assistanceState.originalTextHash}
              currentEditorText={hook}
              onApply={(text) => {
                setHook(text)
                setIsDirty(true)
                onDismissAssistance()
              }}
              onRetry={() => onRequestAssistance('HOOK', 'SUGGEST_HOOKS')}
              onDismiss={onDismissAssistance}
            />
          )}
        </div>

        {/* Caption */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Légende du post (Caption)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-ink-muted">
                {caption.length} caractères
              </span>
              <span className="text-ink-muted/40 text-xs">•</span>
              {!caption.trim() ? (
                <button
                  type="button"
                  onClick={() => onRequestAssistance('CAPTION', 'HELP_WRITE')}
                  disabled={Boolean(assistanceState?.isPending)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-terracotta hover:underline disabled:opacity-50"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>M’aider à écrire ✦</span>
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onRequestAssistance('CAPTION', 'IMPROVE_TEXT')}
                    disabled={Boolean(assistanceState?.isPending)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-terracotta hover:underline disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Améliorer ✦</span>
                  </button>
                  <span className="text-ink-muted/40 text-xs">•</span>
                  <button
                    type="button"
                    onClick={() => onRequestAssistance('CAPTION', 'SHORTEN_TEXT')}
                    disabled={Boolean(assistanceState?.isPending)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-terracotta hover:underline disabled:opacity-50"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Raccourcir ✦</span>
                  </button>
                </>
              )}
            </div>
          </div>
          <textarea
            ref={captionTextareaRef}
            value={caption}
            onChange={(e) => {
              setCaption(e.target.value)
              setIsDirty(true)
            }}
            placeholder="Rédigez le texte qui accompagnera votre carrousel..."
            style={{ minHeight: '160px', maxHeight: '280px' }}
            className="w-full px-3.5 py-2.5 bg-white border border-ivory-border rounded-xl text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all resize-none min-h-[160px] max-h-[280px] leading-relaxed"
          />

          {assistanceState?.targetType === 'CAPTION' && (
            <WritingAssistancePanel
              operation={assistanceState.operation}
              targetType={assistanceState.targetType}
              options={assistanceState.options}
              isPending={assistanceState.isPending}
              error={assistanceState.error}
              originalTextHash={assistanceState.originalTextHash}
              currentEditorText={caption}
              onApply={(text) => {
                setCaption(text)
                setIsDirty(true)
                onDismissAssistance()
              }}
              onRetry={() => onRequestAssistance('CAPTION', assistanceState.operation)}
              onDismiss={onDismissAssistance}
            />
          )}
        </div>

        {/* Call to Action */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Appel à l&apos;action (CTA)
          </label>
          <input
            type="text"
            value={cta}
            onChange={(e) => {
              setCta(e.target.value)
              setIsDirty(true)
            }}
            placeholder="Ex: Découvrir les disponibilités d'automne via le lien en bio"
            className="w-full px-3.5 py-2.5 bg-white border border-ivory-border rounded-xl text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
          />
        </div>
      </section>

      {/* 2. Media Section */}
      <section className="bg-ivory-card border border-ivory-border/70 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-terracotta" />
            <h3 className="text-xs font-semibold text-ink uppercase tracking-wider">
              Médias & Visuels
            </h3>
          </div>
          <span className="text-[11px] text-ink-muted">Optionnel pour ce brouillon</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          {/* Mes médias */}
          <button
            type="button"
            onClick={onOpenMediaPicker}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-ivory-border bg-white hover:bg-terracotta-light/15 hover:border-terracotta/40 text-ink text-center gap-1 transition-all group shadow-xs"
          >
            <span className="text-xs font-medium group-hover:text-terracotta transition-colors">Mes médias</span>
            <span className="text-[10px] text-ink-muted">
              {mediaAssets.length > 0
                ? `${mediaAssets.length} photo${mediaAssets.length > 1 ? 's' : ''}`
                : 'Ajouter une photo'}
            </span>
          </button>

          {/* Photos gratuites */}
          <button
            type="button"
            onClick={onOpenStockModal}
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-ivory-border bg-white hover:bg-terracotta-light/15 hover:border-terracotta/40 text-ink text-center gap-1 transition-all group shadow-xs"
          >
            <span className="text-xs font-medium group-hover:text-terracotta transition-colors">Photos gratuites</span>
            <span className="text-[10px] text-ink-muted">Banque Pexels</span>
          </button>

          {/* Plus tard */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-terracotta/30 bg-terracotta-light/20 text-ink text-center gap-1">
            <span className="text-xs font-medium text-terracotta-dark">Plus tard</span>
            <span className="text-[10px] text-ink-muted">Texte d&apos;abord, visuels après</span>
          </div>
        </div>
      </section>

      {/* 3. Optional AI Assistance Area */}
      <section className="bg-ivory-subtle/60 border border-ivory-border/50 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-terracotta" />
          <h3 className="text-xs font-semibold text-ink tracking-wide">
            Besoin d’un coup de pouce ? ✦
          </h3>
        </div>
        <p className="text-xs text-ink-muted leading-relaxed">
          L&apos;assistance IA ponctuelle est disponible pour suggérer des accroches ou peaufiner vos phrases, à votre demande uniquement.
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={() => onRequestAssistance('HOOK', 'SUGGEST_HOOKS')}
            disabled={Boolean(assistanceState?.isPending)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-ivory-card border border-ivory-border hover:border-terracotta/40 hover:bg-terracotta-light/10 text-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
          >
            <Sparkle className="w-3 h-3 text-terracotta" />
            <span>Proposer des accroches ✦</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onRequestAssistance(
                'CAROUSEL_SLIDE',
                activeSlide.text.trim() ? 'IMPROVE_TEXT' : 'HELP_WRITE',
                activeSlide.index
              )
            }
            disabled={Boolean(assistanceState?.isPending)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-ivory-card border border-ivory-border hover:border-terracotta/40 hover:bg-terracotta-light/10 text-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
          >
            <Sparkle className="w-3 h-3 text-terracotta" />
            <span>Améliorer ce texte ✦</span>
          </button>

          <button
            type="button"
            onClick={() =>
              onRequestAssistance('CAROUSEL_SLIDE', 'HELP_WRITE', activeSlide.index)
            }
            disabled={Boolean(assistanceState?.isPending)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-ivory-card border border-ivory-border hover:border-terracotta/40 hover:bg-terracotta-light/10 text-ink transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-2xs"
          >
            <Sparkle className="w-3 h-3 text-terracotta" />
            <span>Aide pour cette page ✦</span>
          </button>
        </div>
      </section>
    </div>
  )
}
