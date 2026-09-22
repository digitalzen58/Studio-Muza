'use client'

import React from 'react'
import { Sparkles } from 'lucide-react'
import { VisualCanvas } from './visual-canvas'
import { WritingAssistancePanel } from './writing-assistance-panel'
import { ConversionActionSelector } from './conversion-action-selector'
import type { BrandMediaAsset } from '@/services/media'
import type { VisualComposition } from '@/services/visual-composition/types'
import type { BusinessContactInfo } from '@/services/business-contact'
import type { ContentActionType } from '@/actions/content'
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

interface PostEditorProps {
  businessId: string
  workingTitle: string
  setWorkingTitle: (title: string) => void
  caption: string
  setCaption: (caption: string) => void
  visualComposition: VisualComposition
  setVisualComposition: (comp: VisualComposition) => void
  actionType: ContentActionType
  setActionType: (type: ContentActionType) => void
  actionDestination: string | null
  setActionDestination: (dest: string | null) => void
  actionIsOverride: boolean
  setActionIsOverride: (isOverride: boolean) => void
  businessContactInfo: BusinessContactInfo
  setBusinessContactInfo: (info: BusinessContactInfo) => void
  mediaAssets: BrandMediaAsset[]
  setIsDirty: (dirty: boolean) => void
  onOpenMediaPicker: () => void
  onOpenStockModal: () => void
  onRequestAssistance: (targetType: WritingTargetType, op: WritingOperation) => void
  assistanceState: ActiveAssistanceState | null
  onApplyAssistance: (text: string) => void
  onDismissAssistance: () => void
  captionTextareaRef: React.RefObject<HTMLTextAreaElement | null>
}

export function PostEditor({
  businessId,
  workingTitle,
  setWorkingTitle,
  caption,
  setCaption,
  visualComposition,
  setVisualComposition,
  actionType,
  setActionType,
  actionDestination,
  setActionDestination,
  actionIsOverride,
  setActionIsOverride,
  businessContactInfo,
  setBusinessContactInfo,
  mediaAssets,
  setIsDirty,
  onOpenMediaPicker,
  onOpenStockModal,
  onRequestAssistance,
  assistanceState,
  onApplyAssistance,
  onDismissAssistance,
  captionTextareaRef,
}: PostEditorProps) {
  const handleCompositionChange = (newComp: VisualComposition) => {
    setVisualComposition(newComp)
    setIsDirty(true)
  }

  return (
    <section className="space-y-6">
      {/* 1. Working Title */}
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
          placeholder="Ex: Les nouveaux horaires de la terrasse..."
          className="w-full px-3.5 py-2.5 bg-white border border-ivory-border rounded-xl text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
        />
      </div>

      {/* Responsive Grid: Left = Visual Composer, Right = Settings & Caption */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Column: LIVE VISUAL CANVAS / COMPOSER */}
        <div className="lg:col-span-5 xl:col-span-5 lg:sticky lg:top-6 space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Votre visuel
            </label>
            <span className="text-[11px] text-ink-muted">Format 4:5 • Déplacez et personnalisez</span>
          </div>

          <VisualCanvas
            composition={visualComposition}
            onChange={handleCompositionChange}
            mediaAssets={mediaAssets}
            onOpenMediaPicker={onOpenMediaPicker}
            onOpenStockModal={onOpenStockModal}
          />
        </div>

        {/* Right Column: PUBLICATION TEXT & COMMERCIAL ACTIONS */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-6 min-w-0">
          {/* 3. PUBLICATION TEXT AREA (Texte de la publication) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
                Texte de la publication
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
              placeholder="Rédigez le texte qui accompagnera votre publication..."
              style={{ minHeight: '160px', maxHeight: '320px' }}
              className="w-full px-3.5 py-2.5 bg-white border border-ivory-border rounded-xl text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all resize-none min-h-[160px] max-h-[320px] leading-relaxed"
            />

            {/* AI Writing Assistance Panel for Post Caption */}
            {assistanceState?.targetType === 'CAPTION' && (
              <WritingAssistancePanel
                operation={assistanceState.operation}
                targetType={assistanceState.targetType}
                options={assistanceState.options}
                isPending={assistanceState.isPending}
                error={assistanceState.error}
                originalTextHash={assistanceState.originalTextHash}
                currentEditorText={caption}
                onApply={onApplyAssistance}
                onRetry={() => onRequestAssistance('CAPTION', assistanceState.operation)}
                onDismiss={onDismissAssistance}
              />
            )}
          </div>

          {/* 4. Action & Conversion Intent (Que voulez-vous que les gens fassent ?) */}
          <ConversionActionSelector
            businessId={businessId}
            actionType={actionType}
            setActionType={setActionType}
            actionDestination={actionDestination}
            setActionDestination={setActionDestination}
            actionIsOverride={actionIsOverride}
            setActionIsOverride={setActionIsOverride}
            businessContactInfo={businessContactInfo}
            setBusinessContactInfo={setBusinessContactInfo}
            setIsDirty={setIsDirty}
          />
        </div>
      </div>
    </section>
  )
}
