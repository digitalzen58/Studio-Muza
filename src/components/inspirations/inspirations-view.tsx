'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Clock, Check, RefreshCw } from 'lucide-react'
import {
  generateRecommendationsAction,
  recordRecommendationFeedbackAction,
  recordBatchFeedbackAction,
} from '@/app/(dashboard)/app/actions'
import { createOrGetContentDraftAction } from '@/actions/content'
import {
  BATCH_FEEDBACK_OPTIONS,
  FEEDBACK_REASON_LABELS,
  type RecommendationFeedbackReason,
} from '@/types/muza-recommendation-feedback'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MuzaSymbol } from '@/components/ui/muza-symbol'
import { sanitizeRecommendationTitle } from '@/services/title-sanitizer'
import type { BrandMediaAsset } from '@/services/media'
import type {
  MuzaPersistedRecommendationBatch,
  MuzaRecommendation,
  RecommendationFormat,
} from '@/types/muza-recommendation-engine'

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

interface InspirationsViewProps {
  initialPersistedBatch: MuzaPersistedRecommendationBatch | null
  strategicContext: StrategicContext
  draftRecommendationIds?: string[]
}

const FORMAT_LABELS: Record<string, string> = {
  INSTAGRAM_POST: 'Publication',
  INSTAGRAM_CAROUSEL: 'Carrousel',
  FACEBOOK_POST: 'Publication',
  LINKEDIN_POST: 'Publication',
  OTHER: 'Publication',
}

/**
 * Filters recommendations to only actionable content creation formats supported in Studio (Post, Carousel).
 * Filters out SEO, website pages, and unsupported video editor formats from Home creation feed.
 */
function isActionableContentRecommendation(rec: MuzaRecommendation): boolean {
  if (rec.type !== 'CONTENT') return false
  const format = rec.suggestedFormats?.[0]
  if (!format) return true
  const unsupported = [
    'INSTAGRAM_REEL',
    'TIKTOK',
    'YOUTUBE_SHORT',
    'BLOG_ARTICLE',
    'WEBSITE_PAGE',
    'GOOGLE_BUSINESS_PROFILE',
  ]
  return !unsupported.includes(format)
}

/**
 * Inspirations = Your Community Manager View
 * Proactively displays balanced, concrete editorial assignments prepared by Mūza.
 */
export function InspirationsView({
  initialPersistedBatch,
  strategicContext,
  draftRecommendationIds = [],
}: InspirationsViewProps) {
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

  const handleGenerate = () => {
    if (isPending) return
    setError(null)
    startTransition(async () => {
      const res = await generateRecommendationsAction()
      if (res.success) {
        setBatch(res.data)
      } else {
        setError(res.message)
      }
    })
  }

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
          'Votre avis a bien été enregistré. Il guidera les prochaines suggestions de votre Community Manager.'
        )
        setBatchFeedbackOpen(false)
      } else {
        setBatchActionError(res.message)
      }
    })
  }

  const goalContext = strategicContext.goalTitle
    ? strategicContext.goalTitle.toLowerCase()
    : 'développer votre activité'

  // Loading State
  if (isPending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center px-4 w-full max-w-5xl lg:max-w-6xl mx-auto py-8">
        <div className="w-12 h-12 rounded-2xl bg-primary-light flex items-center justify-center animate-pulse">
          <MuzaSymbol size="md" className="text-primary" />
        </div>
        <div className="space-y-1">
          <h3 className="font-serif text-xl font-bold text-ink">
            Votre Community Manager prépare de nouvelles idées...
          </h3>
          <p className="text-xs text-ink-muted max-w-md">
            Mūza analyse votre activité, vos objectifs et vos retours pour composer une sélection sur mesure.
          </p>
        </div>
      </div>
    )
  }

  const rawRecommendations = batch?.batch.recommendations || []
  const actionableItems = rawRecommendations
    .map((rec, idx) => ({
      recommendation: rec,
      recId: batch?.persistence.recommendationIds?.[idx],
      idx,
    }))
    .filter(({ recommendation }) => isActionableContentRecommendation(recommendation))

  // Empty State: No batch or no actionable recommendations
  if (!batch || actionableItems.length === 0) {
    return (
      <div className="flex flex-col gap-6 w-full max-w-5xl lg:max-w-6xl mx-auto py-2">
        {/* Page Header */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
              Inspirations
            </h1>
            <Badge variant="primary" showSymbol className="text-[11px] py-0.5 px-2.5">
              Community Manager
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
            Votre Community Manager a préparé des idées pour votre activité.
          </p>
        </div>

        {/* Empty State Card */}
        <div className="relative w-full rounded-2xl bg-white border border-cream-border p-6 sm:p-8 text-center overflow-hidden shadow-xs flex flex-col items-center gap-4">
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-b from-transparent via-primary-light/30 to-transparent pointer-events-none"
          />

          <div className="w-12 h-12 rounded-2xl bg-primary-light border border-primary-border/60 flex items-center justify-center relative z-10">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>

          <div className="relative z-10 flex flex-col items-center gap-1.5 max-w-md">
            <h2 className="font-serif text-xl sm:text-2xl font-bold text-ink leading-snug">
              Votre Community Manager est prêt à préparer la suite.
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
              En un instant, Mūza compose une sélection d’idées concrètes adaptées à votre activité ({strategicContext.businessName}) et à votre objectif de {goalContext}.
            </p>
          </div>

          {error && (
            <p className="text-xs text-rose-600 font-medium relative z-10">{error}</p>
          )}

          <div className="pt-2 relative z-10">
            <Button
              variant="primary"
              size="lg"
              onClick={handleGenerate}
              disabled={isPending}
              className="min-h-[48px] py-3 px-8 text-sm sm:text-base font-semibold shadow-md hover:shadow-lg bg-primary hover:bg-primary-hover text-white rounded-2xl gap-2 transition-all"
            >
              <span>Préparer mes prochaines idées</span>
              <span className="text-white text-base">✦</span>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl lg:max-w-6xl mx-auto py-2">
      {/* 1. Page Header — Community Manager Identity */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-cream-border pb-4">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
              Inspirations
            </h1>
            <Badge variant="primary" showSymbol className="text-[11px] py-0.5 px-2.5">
              Community Manager
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-ink-muted leading-relaxed">
            Votre Community Manager a préparé des idées pour votre activité.
          </p>
        </div>

        {/* Explicit Refresh CTA — Visually secondary to recommendation creation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={isPending}
            title="Demander à Mūza de préparer d’autres idées"
            className="text-xs font-semibold gap-1.5 shadow-2xs text-ink/80 hover:text-ink hover:bg-white"
          >
            <RefreshCw className="w-3.5 h-3.5 text-primary" />
            <span>Proposez-moi autre chose ✦</span>
          </Button>
        </div>
      </div>

      {/* 2. Contextual Editorial Subheader & Objective */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <MuzaSymbol size="md" />
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-ink">
            Cette semaine, voici ce que vous pourriez raconter
          </h2>
        </div>

        <div className="inline-flex items-center gap-2 bg-primary-light border border-primary-border/60 px-3.5 py-1.5 rounded-full text-[11px] font-semibold text-primary shadow-2xs">
          <span>Objectif : {goalContext}</span>
        </div>
      </div>

      {/* Non-blocking error notification if regenerate attempt failed while existing batch is still intact */}
      {error && (
        <div className="bg-amber-50/90 border border-amber-200/80 p-3 rounded-xl flex items-center justify-between gap-3 text-xs text-ink animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="font-semibold text-amber-900">
              Impossible de préparer de nouvelles idées pour le moment.
            </span>
            <span className="text-amber-800 text-[11px]">
              Vos idées actuelles sont toujours disponibles.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={isPending}
            className="text-xs py-1 px-2.5 h-auto shrink-0 bg-white"
          >
            Réessayer
          </Button>
        </div>
      )}

      {/* 3. Community Manager Recommendation Cards Responsive Grid */}
      <div
        className={
          actionableItems.length === 1
            ? 'w-full max-w-2xl'
            : 'grid grid-cols-1 lg:grid-cols-2 gap-5'
        }
      >
        {actionableItems.map(({ recommendation, recId, idx }) => {
          const hasDraft = Boolean(
            recommendation.status === 'ACCEPTED' ||
              (recId && draftRecommendationIds.includes(recId))
          )

          return (
            <CommunityManagerCard
              key={`${batch.persistence.batchId}-${recId || idx}`}
              recommendation={recommendation}
              recommendationId={recId}
              hasExistingDraft={hasDraft}
              mediaAssets={strategicContext.mediaAssets}
            />
          )
        })}
      </div>

      {/* Batch Feedback Confirmation Notice */}
      {batchSuccessNotice && (
        <div className="bg-cream-subtle border border-primary-border/40 p-3 rounded-xl flex items-center justify-between gap-2 text-xs text-ink-muted animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-primary font-serif font-bold text-sm">✦</span>
            <span className="text-ink">{batchSuccessNotice}</span>
          </div>
          <span className="text-[10px] uppercase font-semibold text-primary">Enregistré</span>
        </div>
      )}

      {/* Batch Feedback Panel */}
      {batchFeedbackOpen ? (
        <div className="flex flex-col gap-3 p-4 bg-cream-subtle/90 border border-primary-border/50 rounded-2xl animate-fadeIn shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-serif font-bold text-ink flex items-center gap-1.5">
              <MuzaSymbol size="sm" />
              Rien ne vous convient dans ces propositions ?
            </span>
            <button
              onClick={() => setBatchFeedbackOpen(false)}
              className="text-xs text-ink-muted hover:text-ink transition-colors"
            >
              ✕
            </button>
          </div>

          <p className="text-[11px] text-ink-muted leading-relaxed">
            Indiquez à votre Community Manager ce qui ne convient pas pour qu’elle ajuste ses prochaines propositions.
          </p>

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
                      ? 'bg-primary-light border-primary text-primary font-semibold shadow-2xs'
                      : 'bg-white/80 border-cream-border text-ink hover:bg-white'
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

          <div className="flex flex-col gap-1 pt-1">
            <div className="flex items-center justify-between text-[11px] text-ink-muted">
              <span>Précision pour votre Community Manager (facultatif)</span>
              <span>{batchNote.length}/300</span>
            </div>
            <textarea
              value={batchNote}
              onChange={(e) => setBatchNote(e.target.value.slice(0, 300))}
              placeholder="Ex: Je souhaite plutôt axer mes publications sur le calme et l'arrière-saison..."
              className="w-full text-xs p-2.5 rounded-lg border border-cream-border bg-white focus:outline-none focus:ring-1 focus:ring-primary/40 resize-none min-h-[58px]"
              maxLength={300}
            />
          </div>

          {batchActionError && (
            <p className="text-xs text-rose-600 font-medium">{batchActionError}</p>
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
          <div className="flex justify-center pt-2 pb-4">
            <button
              type="button"
              onClick={() => setBatchFeedbackOpen(true)}
              className="text-xs text-ink-muted hover:text-primary font-medium transition-colors inline-flex items-center gap-1.5 py-1 px-3 rounded-full hover:bg-cream-subtle cursor-pointer"
            >
              <span>✦ Rien ne me convient dans cette sélection</span>
            </button>
          </div>
        )
      )}
    </div>
  )
}

interface CommunityManagerCardProps {
  recommendation: MuzaRecommendation
  recommendationId?: string
  hasExistingDraft?: boolean
  mediaAssets?: BrandMediaAsset[]
}

/**
 * Individual Community Manager Editorial Assignment Card
 * Clean hierarchy: Format & Draft Status -> Sanitized Title -> Summary -> Rationale -> Actions
 */
function CommunityManagerCard({
  recommendation,
  recommendationId,
  hasExistingDraft = false,
  mediaAssets = [],
}: CommunityManagerCardProps) {
  const router = useRouter()
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [selectedReason, setSelectedReason] = useState<RecommendationFeedbackReason>('NOT_RELEVANT')
  const [recordedFeedback, setRecordedFeedback] = useState<{
    reason: RecommendationFeedbackReason
  } | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isDraftPending, startDraftTransition] = useTransition()
  const [draftError, setDraftError] = useState<string | null>(null)

  const { title, summary, whyNow, suggestedFormats, estimatedEffortMinutes } = recommendation
  const sanitizedTitle = sanitizeRecommendationTitle(title)
  const primaryFormat: RecommendationFormat =
    suggestedFormats.length > 0 ? suggestedFormats[0] : 'INSTAGRAM_POST'
  const formatBadge = FORMAT_LABELS[primaryFormat] || 'Publication'

  const suggestedAssetId = recommendation.assetGuidance?.suggestedAssetIds?.[0] || null
  const assignedMedia = suggestedAssetId
    ? mediaAssets.find((asset) => asset.id === suggestedAssetId) || null
    : null

  const handleCreateDraft = () => {
    if (!recommendationId || isDraftPending) return
    setDraftError(null)
    startDraftTransition(async () => {
      const result = await createOrGetContentDraftAction(recommendationId)
      if (result.success) {
        router.push(`/app/content/${result.contentId}`)
      } else {
        setDraftError(result.message)
      }
    })
  }

  const handleFeedbackSubmit = () => {
    if (!recommendationId) {
      setRecordedFeedback({ reason: selectedReason })
      setFeedbackOpen(false)
      return
    }

    setActionError(null)
    startTransition(async () => {
      const res = await recordRecommendationFeedbackAction(
        recommendationId,
        selectedReason,
        ''
      )
      if (res.success) {
        setRecordedFeedback({ reason: selectedReason })
        setFeedbackOpen(false)
      } else {
        setActionError(res.message)
      }
    })
  }

  return (
    <Card
      variant="default"
      className="flex flex-col justify-between gap-4 p-5 sm:p-6 transition-all hover:shadow-md border-cream-border h-full bg-white rounded-2xl"
    >
      <div className="flex flex-col gap-3.5">
        {/* Top Header: Format badge + Draft status + estimated time */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="primary" showSymbol className="text-[11px] font-semibold py-0.5 px-2.5">
              {formatBadge}
            </Badge>

            {hasExistingDraft && (
              <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">
                Brouillon commencé
              </span>
            )}
          </div>

          {estimatedEffortMinutes !== null && estimatedEffortMinutes > 0 && (
            <span className="text-[11px] font-medium text-ink-muted flex items-center gap-1">
              <Clock className="w-3 h-3" /> ~{estimatedEffortMinutes} min
            </span>
          )}
        </div>

        {/* Real Brand Media Preview (Only if authentic asset exists, no mock prototypes) */}
        {assignedMedia && (
          <div className="relative w-full h-36 sm:h-40 rounded-xl overflow-hidden border border-cream-border shadow-2xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={assignedMedia.url}
              alt={assignedMedia.alt || sanitizedTitle}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black/50 backdrop-blur-xs text-white text-[9px] font-semibold px-2 py-0.5 rounded-md">
              Photo de votre activité
            </div>
          </div>
        )}

        {/* Clean Sanitized Title & Assignment Summary */}
        <div className="flex flex-col gap-1.5 pt-0.5">
          <h3 className="font-serif text-lg sm:text-xl font-bold text-ink leading-snug">
            {sanitizedTitle}
          </h3>
          <p className="text-xs sm:text-sm font-medium text-ink/85 leading-relaxed">
            {summary}
          </p>
        </div>

        {/* Why Mūza Recommends This (Simple, Jargon-Free Strategic Advice) */}
        {whyNow && (
          <div className="bg-primary-light px-3.5 py-2.5 rounded-xl border border-primary-border/60 flex items-start gap-2.5 mt-0.5">
            <MuzaSymbol size="sm" className="mt-0.5 shrink-0" />
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-bold text-primary">
                Pourquoi Mūza vous le conseille
              </span>
              <p className="text-xs text-ink/85 font-medium leading-relaxed">
                « {whyNow} »
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Card Actions / Feedback State */}
      {recordedFeedback ? (
        <div className="bg-cream-subtle border border-cream-border p-3 rounded-xl flex items-center justify-between gap-2 text-xs text-ink-muted animate-fadeIn">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-primary" />
            <span>
              Avis noté :{' '}
              <strong className="text-ink font-semibold">
                {FEEDBACK_REASON_LABELS[recordedFeedback.reason]?.label || recordedFeedback.reason}
              </strong>
              . Mūza en tiendra compte.
            </span>
          </div>
          <span className="text-[10px] uppercase font-semibold text-primary">Enregistré</span>
        </div>
      ) : feedbackOpen ? (
        <div className="flex flex-col gap-2.5 p-3 bg-cream-subtle/90 border border-primary-border/40 rounded-xl animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-serif font-bold text-ink flex items-center gap-1.5">
              <MuzaSymbol size="sm" />
              Pourquoi cette idée ne vous convient pas ?
            </span>
            <button
              onClick={() => setFeedbackOpen(false)}
              className="text-xs text-ink-muted hover:text-ink"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
            {(Object.keys(FEEDBACK_REASON_LABELS) as RecommendationFeedbackReason[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedReason(r)}
                className={`text-left p-2 rounded-lg text-xs transition-all border ${
                  selectedReason === r
                    ? 'bg-primary-light border-primary text-primary font-semibold'
                    : 'bg-white/80 border-cream-border text-ink hover:bg-white'
                }`}
              >
                <div className="font-medium text-[11px] leading-tight">{FEEDBACK_REASON_LABELS[r].label}</div>
              </button>
            ))}
          </div>

          {actionError && (
            <p className="text-xs text-rose-600 font-medium">{actionError}</p>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFeedbackOpen(false)}
              disabled={isPending}
              className="text-xs"
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleFeedbackSubmit}
              disabled={isPending}
              className="text-xs"
            >
              {isPending ? 'Enregistrement...' : 'Valider mon retour'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-cream-subtle">
          <Button
            variant="primary"
            size="md"
            onClick={handleCreateDraft}
            disabled={isDraftPending || !recommendationId}
            className="min-h-[42px] px-5 font-semibold gap-1.5 shadow-xs flex-1 sm:flex-initial"
          >
            {isDraftPending ? (
              <span>Ouverture...</span>
            ) : (
              <>
                <span>{hasExistingDraft ? 'Continuer le brouillon' : 'Créer ce contenu'}</span>
                <span className="text-white text-base">✦</span>
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFeedbackOpen(true)}
            className="text-xs text-ink-muted hover:text-primary shrink-0"
          >
            <span>Pas pour moi</span>
          </Button>

          {draftError && (
            <p className="text-xs text-rose-600 font-medium pt-0.5">{draftError}</p>
          )}
        </div>
      )}
    </Card>
  )
}

