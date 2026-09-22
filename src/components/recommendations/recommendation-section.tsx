'use client'

import React, { useState, useTransition } from 'react'
import {
  generateRecommendationsAction,
  recordBatchFeedbackAction,
} from '@/app/(dashboard)/app/actions'
import {
  BATCH_FEEDBACK_OPTIONS,
  FEEDBACK_REASON_LABELS,
  type RecommendationFeedbackReason,
} from '@/types/muza-recommendation-feedback'
import { RecommendationEmptyState } from './recommendation-empty-state'
import { RecommendationLoading } from './recommendation-loading'
import { RecommendationPreviewCard } from './recommendation-preview-card'
import { BrandGreetingHero, BrandVisualHero } from './brand-visual-hero'
import { DraftContentsSection, type DraftContentSummary } from '@/components/studio/draft-contents-section'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MuzaSymbol } from '@/components/ui/muza-symbol'
import type { BrandMediaAsset } from '@/services/media'
import type { MuzaPersistedRecommendationBatch } from '@/types/muza-recommendation-engine'

export interface StrategicContext {
  businessName: string
  industry: string
  goalTitle: string
  audienceName: string
  weeklyMinutes: number
  offerName: string
  firstName: string
  positioning?: string | null
  personality?: string[]
  mediaAssets?: BrandMediaAsset[]
}

interface RecommendationSectionProps {
  initialPersistedBatch: MuzaPersistedRecommendationBatch | null
  strategicContext: StrategicContext
  draftContents?: DraftContentSummary[]
}

/**
 * Main Interactive Recommendation Section Component on /app.
 * Orchestrates brand visual hero, single contextual chip, recommendation cards preview system,
 * weekly communication strip, creation moment CTA, empty state, loading state, error state,
 * and structured batch dissatisfaction feedback ("Rien ne me convient").
 */
export function RecommendationSection({
  initialPersistedBatch,
  strategicContext,
  draftContents = [],
}: RecommendationSectionProps) {
  const [batch, setBatch] = useState<MuzaPersistedRecommendationBatch | null>(
    initialPersistedBatch
  )
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Batch Feedback State ("Rien ne me convient")
  const [batchFeedbackOpen, setBatchFeedbackOpen] = useState(false)
  const [selectedBatchReason, setSelectedBatchReason] =
    useState<RecommendationFeedbackReason>('TOO_REPETITIVE')
  const [batchNote, setBatchNote] = useState('')
  const [batchSuccessNotice, setBatchSuccessNotice] = useState<string | null>(null)
  const [batchActionError, setBatchActionError] = useState<string | null>(null)
  const [isBatchPending, startBatchTransition] = useTransition()

  const handleBatchFeedbackSubmit = () => {
    if (!batch || !batch.persistence.recommendationIds.length) {
      setBatchSuccessNotice('Votre avis a bien été noté.')
      setBatchFeedbackOpen(false)
      return
    }

    setBatchActionError(null)
    startBatchTransition(async () => {
      const res = await recordBatchFeedbackAction(
        batch.persistence.recommendationIds,
        selectedBatchReason,
        batchNote
      )
      if (res.success) {
        setBatchSuccessNotice(
          'Votre avis sur ce lot a bien été enregistré. Il guidera les prochaines suggestions de Mūza.'
        )
        setBatchFeedbackOpen(false)
      } else {
        setBatchActionError(res.message)
      }
    })
  }

  const handleGenerate = () => {
    if (isPending) return
    setError(null)
    startTransition(async () => {
      const res = await generateRecommendationsAction()
      if (res.success) {
        setBatch(res.data)
        setError(null)
      } else {
        setError(res.message)
      }
    })
  }

  // 1. Loading State
  if (isPending && (!batch || batch.batch.recommendations.length === 0)) {
    return <RecommendationLoading />
  }

  // 2. Error State (when active business has no existing batch)
  if (error && (!batch || batch.batch.recommendations.length === 0)) {
    return (
      <Card variant="accent" className="flex flex-col gap-4 py-6 px-5 text-center items-center max-w-xl mx-auto">
        <div className="flex flex-col gap-1.5 max-w-sm">
          <h3 className="font-serif text-xl font-bold text-terracotta-dark">
            Mūza n’a pas réussi à préparer vos idées.
          </h3>
          <p className="text-xs text-ink/80 leading-relaxed">
            Vos informations sont bien conservées. Vous pourrez réessayer dans quelques instants.
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={handleGenerate}
          disabled={isPending}
        >
          <span>Réessayer</span>
          <MuzaSymbol size="sm" className="ml-1 text-white" />
        </Button>
      </Card>
    )
  }

  // 3. Batch Available State
  if (batch && batch.batch.recommendations.length > 0) {
    const goalContext = strategicContext.goalTitle
      ? strategicContext.goalTitle.toLowerCase()
      : "remplir vos séjours d’automne"

    return (
      <div className="flex flex-col gap-5 w-full max-w-xl mx-auto py-1">
        {/* 1. BRAND GREETING HERO */}
        <BrandGreetingHero context={strategicContext} />

        {/* 2. SINGLE CONTEXTUAL CHIP */}
        <div className="w-full flex justify-center">
          <div className="inline-flex items-center gap-2 bg-terracotta-light/70 border border-terracotta-border/60 px-3.5 py-1.5 rounded-full text-[11px] font-semibold text-terracotta-dark shadow-2xs text-center">
            <MuzaSymbol size="sm" />
            <span>Cette semaine, Mūza vous aide à {goalContext}.</span>
          </div>
        </div>

        {/* 2.5 ACTIVE DRAFTS AREA (VOS BROUILLONS EN COURS) */}
        {draftContents && draftContents.length > 0 && (
          <DraftContentsSection drafts={draftContents} />
        )}

        {/* 3. VISUAL RECOMMENDATIONS AREA */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <MuzaSymbol size="md" />
              <h2 className="font-serif text-2xl font-bold text-ink">
                {batch.batch.recommendations.length}{' '}
                {batch.batch.recommendations.length > 1 ? 'idées' : 'idée'} pour cette semaine
              </h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerate}
              disabled={isPending}
              title="Générer un nouveau lot de recommandations"
              className="text-xs"
            >
              <span>Nouvelles idées</span>
              <MuzaSymbol size="sm" className="ml-1" />
            </Button>
          </div>

          {/* Error notification banner if new generation attempt failed, preserving existing batch */}
          {error && (
            <div className="bg-terracotta-light/60 border border-terracotta-border/80 p-3.5 rounded-xl flex items-center justify-between gap-3 text-xs text-ink animate-fadeIn">
              <div className="flex flex-col gap-0.5 text-left">
                <span className="font-serif font-bold text-terracotta-dark">
                  Mūza n’a pas réussi à préparer de nouvelles idées.
                </span>
                <span className="text-[11px] text-ink-muted">
                  Vos recommandations actuelles sont conservées. Vous pourrez réessayer dans quelques instants.
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerate}
                  disabled={isPending}
                  className="text-xs py-1 px-2.5 h-auto"
                >
                  Réessayer
                </Button>
                <button
                  type="button"
                  onClick={() => setError(null)}
                  className="text-xs text-ink-muted hover:text-ink px-1.5 py-1"
                  aria-label="Fermer l'alerte"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Recommendations Visual Preview Cards List */}
          <div className="flex flex-col gap-4">
            {batch.batch.recommendations.map((recommendation, idx) => {
              const recId = batch.persistence.recommendationIds?.[idx]
              const hasDraft = Boolean(
                recommendation.status === 'ACCEPTED' ||
                  (recId && draftContents?.some((d) => d.recommendation_id === recId))
              )

              return (
                <RecommendationPreviewCard
                  key={`${batch.persistence.batchId}-${idx}`}
                  recommendation={recommendation}
                  recommendationId={recId}
                  hasExistingDraft={hasDraft}
                  mediaAssets={strategicContext.mediaAssets}
                  cardIndex={idx}
                />
              )
            })}
          </div>

          {/* Batch Dissatisfaction Confirmation Notice */}
          {batchSuccessNotice && (
            <div className="bg-ivory-subtle border border-terracotta-border/40 p-3 rounded-xl flex items-center justify-between gap-2 text-xs text-ink-muted animate-fadeIn">
              <div className="flex items-center gap-2">
                <span className="text-terracotta font-serif font-bold text-sm">✦</span>
                <span className="text-ink">{batchSuccessNotice}</span>
              </div>
              <span className="text-[10px] uppercase font-semibold text-terracotta">Enregistré</span>
            </div>
          )}

          {/* Action D: "Rien ne me convient" Batch Dissatisfaction Panel */}
          {batchFeedbackOpen ? (
            <div className="flex flex-col gap-3 p-4 bg-ivory-subtle/90 border border-terracotta-border/50 rounded-2xl animate-fadeIn shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-serif font-bold text-ink flex items-center gap-1.5">
                  <MuzaSymbol size="sm" />
                  Rien ne vous convient dans ce lot ?
                </span>
                <button
                  onClick={() => setBatchFeedbackOpen(false)}
                  className="text-xs text-ink-muted hover:text-ink transition-colors"
                >
                  ✕
                </button>
              </div>

              <p className="text-[11px] text-ink-muted leading-relaxed">
                Indiquez pourquoi ce lot ne vous convient pas. Mūza mémorise votre préférence pour orienter ses prochaines idées sans relancer de génération automatique.
              </p>

              {/* 6 Concise Batch Dissatisfaction Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                {BATCH_FEEDBACK_OPTIONS.map((opt) => {
                  const isSelected = selectedBatchReason === opt.reason
                  return (
                    <button
                      key={opt.reason}
                      type="button"
                      onClick={() => setSelectedBatchReason(opt.reason)}
                      className={`text-left p-2.5 rounded-lg text-xs transition-all border ${
                        isSelected
                          ? 'bg-terracotta-light border-terracotta text-terracotta-dark font-semibold shadow-2xs'
                          : 'bg-white/80 border-ivory-border text-ink hover:bg-white'
                      }`}
                    >
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-[10px] text-ink-muted mt-0.5 line-clamp-1">
                        {FEEDBACK_REASON_LABELS[opt.reason]?.description}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Optional Batch Free-text Note */}
              <div className="flex flex-col gap-1 pt-1">
                <div className="flex items-center justify-between text-[11px] text-ink-muted">
                  <span>Précision pour Mūza (facultatif)</span>
                  <span>{batchNote.length}/300</span>
                </div>
                <textarea
                  value={batchNote}
                  onChange={(e) => setBatchNote(e.target.value.slice(0, 300))}
                  placeholder="Ex: Je souhaite plutôt axer mes publications sur le calme et l'arrière-saison..."
                  className="w-full text-xs p-2.5 rounded-lg border border-ivory-border bg-white focus:outline-none focus:ring-1 focus:ring-terracotta/40 resize-none min-h-[58px]"
                  maxLength={300}
                />
              </div>

              {batchActionError && (
                <p className="text-xs text-terracotta font-medium">{batchActionError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setBatchFeedbackOpen(false)}
                  disabled={isBatchPending}
                >
                  Annuler
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleBatchFeedbackSubmit}
                  disabled={isBatchPending}
                >
                  {isBatchPending ? 'Enregistrement...' : 'Enregistrer mon retour'}
                </Button>
              </div>
            </div>
          ) : (
            !batchSuccessNotice && (
              <div className="flex justify-center pt-1">
                <button
                  type="button"
                  onClick={() => setBatchFeedbackOpen(true)}
                  className="text-xs text-ink-muted hover:text-terracotta font-medium transition-colors inline-flex items-center gap-1.5 py-1 px-3 rounded-full hover:bg-ivory-subtle"
                >
                  <span>✦ Rien ne me convient dans ces idées</span>
                </button>
              </div>
            )
          )}
        </div>

        {/* 4. STUDIO VISUAL SHOWCASE */}
        <BrandVisualHero context={strategicContext} />

        {/* 5. PRIMARY CREATION MOMENT CTA */}
        <div className="flex flex-col items-center gap-2 pt-2 pb-4">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled
            title="Fonctionnalité de création Magic Flow à venir"
            className="min-h-[46px] text-base shadow-md font-medium"
          >
            <span>Créer avec Mūza</span>
            <span className="ml-2 text-white text-lg">✦</span>
          </Button>
          <span className="text-[11px] text-ink-muted font-medium">
            Transformez directement vos idées Mūza en contenus finalisés
          </span>
        </div>
      </div>
    )
  }

  // 4. Empty State (Pre-generation)
  return (
    <RecommendationEmptyState
      onGenerate={handleGenerate}
      isPending={isPending}
      strategicContext={strategicContext}
      draftContents={draftContents}
    />
  )
}
