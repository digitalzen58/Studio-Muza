'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MuzaSymbol } from '@/components/ui/muza-symbol'
import { recordRecommendationFeedbackAction } from '@/app/(dashboard)/app/actions'
import { createOrGetContentDraftAction } from '@/actions/content'
import {
  FEEDBACK_REASON_LABELS,
  type RecommendationFeedbackReason,
} from '@/types/muza-recommendation-feedback'
import type { BrandMediaAsset } from '@/services/media'
import type {
  MuzaRecommendation,
  RecommendationFormat,
  RecommendationType,
} from '@/types/muza-recommendation-engine'

const TYPE_LABELS: Record<RecommendationType, string> = {
  CONTENT: 'Contenu',
  SEO: 'SEO',
  OFFER: 'Offre',
  VISIBILITY: 'Visibilité',
  ENGAGEMENT: 'Engagement',
}

const FORMAT_LABELS: Record<RecommendationFormat, string> = {
  INSTAGRAM_POST: 'Publication',
  INSTAGRAM_CAROUSEL: 'Carrousel',
  INSTAGRAM_REEL: 'Vidéo courte',
  INSTAGRAM_STORY: 'Story',
  FACEBOOK_POST: 'Publication',
  TIKTOK: 'Vidéo courte',
  LINKEDIN_POST: 'Publication',
  YOUTUBE_SHORT: 'Vidéo courte',
  BLOG_ARTICLE: 'Article',
  WEBSITE_PAGE: 'Page du site',
  GOOGLE_BUSINESS_PROFILE: 'Fiche Google',
  OTHER: 'Autre',
}

function getCtaLabel(type: RecommendationType, hasExistingDraft?: boolean): string {
  if (type === 'CONTENT') {
    return hasExistingDraft ? 'Continuer' : 'Créer ce contenu'
  }
  if (type === 'OFFER') {
    return 'Découvrir cette offre'
  }
  return 'Voir cette suggestion'
}

interface RecommendationPreviewCardProps {
  recommendation: MuzaRecommendation
  recommendationId?: string
  hasExistingDraft?: boolean
  mediaAssets?: BrandMediaAsset[]
  cardIndex?: number
  onFeedbackRecorded?: (recommendationId: string, reason: RecommendationFeedbackReason) => void
}

/**
 * Rich Visual Format Preview Component for Studio Mūza Recommendations.
 * Integrates real brand media assets deterministically into recommendation card previews,
 * with appropriate CSS object-fit/crop handling (portrait for Reels/Stories, square for Posts, 16:9 for Facebook/Blog).
 */
export function RecommendationPreviewCard({
  recommendation,
  recommendationId,
  hasExistingDraft = false,
  mediaAssets = [],
  onFeedbackRecorded,
}: RecommendationPreviewCardProps) {
  const {
    type,
    title,
    summary,
    whyNow,
    suggestedFormats,
    estimatedEffortMinutes,
    requiresCamera,
    requiresVoiceover,
  } = recommendation

  const primaryFormat: RecommendationFormat =
    suggestedFormats.length > 0 ? suggestedFormats[0] : 'OTHER'
  const formatLabel = FORMAT_LABELS[primaryFormat] || primaryFormat

  // User Actions State
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [selectedReason, setSelectedReason] = useState<RecommendationFeedbackReason>('NOT_RELEVANT')
  const [note, setNote] = useState('')
  const [recordedFeedback, setRecordedFeedback] = useState<{
    reason: RecommendationFeedbackReason
    message?: string
  } | null>(null)
  const [modifyNoticeOpen, setModifyNoticeOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const [isDraftPending, startDraftTransition] = useTransition()
  const [draftError, setDraftError] = useState<string | null>(null)

  const isContent = type === 'CONTENT'
  const isDraftExisting =
    recommendation.status === 'ACCEPTED' || Boolean(hasExistingDraft)

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

  // Real media only: Look up the first suggested asset ID from deterministic media matching
  const suggestedAssetId = recommendation.assetGuidance?.suggestedAssetIds?.[0] || null
  const assignedMedia = suggestedAssetId
    ? mediaAssets.find((asset) => asset.id === suggestedAssetId) || null
    : null

  const handleFeedbackSubmit = () => {
    if (!recommendationId) {
      // Local fallback if no persistence id available
      setRecordedFeedback({ reason: selectedReason })
      setFeedbackOpen(false)
      onFeedbackRecorded?.('local', selectedReason)
      return
    }

    setActionError(null)
    startTransition(async () => {
      const res = await recordRecommendationFeedbackAction(
        recommendationId,
        selectedReason,
        note
      )
      if (res.success) {
        setRecordedFeedback({ reason: selectedReason })
        setFeedbackOpen(false)
        onFeedbackRecorded?.(recommendationId, selectedReason)
      } else {
        setActionError(res.message)
      }
    })
  }

  const readiness = recommendation.assetGuidance?.assetReadiness

  return (
    <Card variant="default" className="flex flex-col justify-between gap-4 p-4 sm:p-5 transition-all hover:shadow-md border-ivory-border/80 h-full">
      <div className="flex flex-col gap-4">
        {/* Top Header Metadata - Simplified */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="terracotta" showSymbol>
            {formatLabel}
          </Badge>
          {type !== 'CONTENT' && (
            <span className="text-[11px] font-semibold text-ink-muted bg-ivory-subtle border border-ivory-border px-2.5 py-0.5 rounded-full">
              {TYPE_LABELS[type] || type}
            </span>
          )}
        </div>

        {estimatedEffortMinutes !== null && estimatedEffortMinutes > 0 && (
          <span className="text-[11px] font-medium text-ink-muted flex items-center gap-1">
            <span>⏱</span> ~{estimatedEffortMinutes} min
          </span>
        )}
      </div>

      {/* Visual Format Preview Canvas with Real Media or Branded Fallback */}
      <div className="w-full">
        {renderFormatPreview(primaryFormat, title, summary, assignedMedia)}
      </div>

      {/* Title & Short Summary */}
      <div className="flex flex-col gap-1">
        <h3 className="font-serif text-xl font-bold text-ink leading-snug">
          {title}
        </h3>
        <p className="text-xs sm:text-sm font-medium text-ink/85 leading-relaxed">
          {summary}
        </p>
      </div>

      {/* Short Editorial whyNow Insight Badge */}
      {whyNow && (
        <div className="bg-terracotta-light/60 px-3 py-2.5 rounded-xl border border-terracotta-border/30 flex items-start gap-2">
          <MuzaSymbol size="sm" className="mt-0.5 shrink-0" />
          <p className="text-xs text-terracotta-dark font-medium leading-relaxed">
            <strong className="font-semibold text-terracotta">Pourquoi maintenant ?</strong> {whyNow}
          </p>
        </div>
      )}

      {/* Capture Brief Block for PARTIAL or MISSING recommendations */}
      {recommendation.assetGuidance?.captureBrief &&
        (readiness === 'PARTIAL' || readiness === 'MISSING') && (
          <div className="bg-ivory-subtle border border-ivory-border/90 px-3.5 py-2.5 rounded-xl flex items-start gap-2.5">
            <span className="text-terracotta text-xs font-serif font-bold mt-0.5 shrink-0">✦</span>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-bold text-ink uppercase tracking-wider">
                Pour réaliser cette idée…
              </span>
              <p className="text-xs text-ink/80 font-medium leading-relaxed">
                {recommendation.assetGuidance.captureBrief}
              </p>
            </div>
          </div>
        )}

      {/* Constraints Cues */}
      {(requiresCamera || requiresVoiceover) && (
        <div className="flex items-center gap-2 flex-wrap text-[10px] font-semibold text-ink-muted">
          {requiresCamera && (
            <span className="bg-ivory-subtle border border-ivory-border/70 px-2 py-0.5 rounded-md">
              Caméra requise
            </span>
          )}
          {requiresVoiceover && (
            <span className="bg-ivory-subtle border border-ivory-border/70 px-2 py-0.5 rounded-md">
              Voix off requise
            </span>
          )}
        </div>
      )}
      </div>

      {/* Feedback Confirmation State */}
      {recordedFeedback ? (
        <div className="bg-ivory-subtle border border-ivory-border p-3 rounded-xl flex items-center justify-between gap-2 text-xs text-ink-muted animate-fadeIn">
          <div className="flex items-center gap-2">
            <span className="text-terracotta font-serif font-bold text-sm">✦</span>
            <span>
              Avis enregistré :{' '}
              <strong className="text-ink font-semibold">
                {FEEDBACK_REASON_LABELS[recordedFeedback.reason]?.label || recordedFeedback.reason}
              </strong>
              . Mūza apprend de vos choix.
            </span>
          </div>
          <span className="text-[10px] uppercase font-semibold text-terracotta">Enregistré</span>
        </div>
      ) : feedbackOpen ? (
        /* Structured Feedback Selection Panel */
        <div className="flex flex-col gap-3 p-3.5 bg-ivory-subtle/80 border border-terracotta-border/40 rounded-xl animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-serif font-bold text-ink flex items-center gap-1.5">
              <MuzaSymbol size="sm" />
              Pourquoi cette idée ne vous convient pas ?
            </span>
            <button
              onClick={() => setFeedbackOpen(false)}
              className="text-xs text-ink-muted hover:text-ink transition-colors"
            >
              ✕
            </button>
          </div>

          <p className="text-[11px] text-ink-muted leading-relaxed">
            Votre retour est mémorisé sans relancer d’appel IA. Mūza en tiendra compte pour les prochaines propositions.
          </p>

          {/* Reason Selection Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
            {(Object.keys(FEEDBACK_REASON_LABELS) as RecommendationFeedbackReason[]).map((r) => {
              const isSelected = selectedReason === r
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedReason(r)}
                  className={`text-left p-2 rounded-lg text-xs transition-all border ${
                    isSelected
                      ? 'bg-terracotta-light border-terracotta text-terracotta-dark font-semibold shadow-2xs'
                      : 'bg-white/80 border-ivory-border text-ink hover:bg-white'
                  }`}
                >
                  <div className="font-medium leading-tight">{FEEDBACK_REASON_LABELS[r].label}</div>
                  <div className="text-[10px] text-ink-muted mt-0.5 leading-snug line-clamp-1">
                    {FEEDBACK_REASON_LABELS[r].description}
                  </div>
                </button>
              )
            })}
          </div>

          {/* Optional Free-text Note (max 300 chars) */}
          <div className="flex flex-col gap-1 pt-1">
            <div className="flex items-center justify-between text-[11px] text-ink-muted">
              <span>Précision optionnelle (facultatif)</span>
              <span>{note.length}/300</span>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 300))}
              placeholder="Ex: Je parle déjà beaucoup de ce sujet cette semaine..."
              className="w-full text-xs p-2.5 rounded-lg border border-ivory-border bg-white focus:outline-none focus:ring-1 focus:ring-terracotta/40 resize-none min-h-[58px]"
              maxLength={300}
            />
          </div>

          {actionError && (
            <p className="text-xs text-terracotta font-medium">{actionError}</p>
          )}

          {/* Action Buttons inside feedback drawer */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFeedbackOpen(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleFeedbackSubmit}
              disabled={isPending}
            >
              {isPending ? 'Enregistrement...' : 'Valider mon retour'}
            </Button>
          </div>
        </div>
      ) : (
        /* Action Buttons Area */
        <div className="flex flex-col gap-2 pt-1">
          {/* Action A: Créer ce contenu (Enabled for CONTENT, safely disabled for others) */}
          {isContent ? (
            <Button
              variant="primary"
              size="md"
              fullWidth
              onClick={handleCreateDraft}
              disabled={isDraftPending || !recommendationId}
              title={
                isDraftPending
                  ? 'Initialisation du brouillon...'
                  : isDraftExisting
                  ? 'Reprendre le brouillon en cours'
                  : 'Créer ce brouillon'
              }
              aria-label={getCtaLabel(type, isDraftExisting)}
              className="min-h-[44px]"
            >
              {isDraftPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  <span>Ouverture en cours...</span>
                </>
              ) : (
                <>
                  <span>{getCtaLabel(type, isDraftExisting)}</span>
                  <MuzaSymbol size="sm" className="ml-1 text-white opacity-90" />
                </>
              )}
            </Button>
          ) : (
            <Button
              variant="primary"
              size="md"
              fullWidth
              disabled
              title="Fonctionnalité de création à venir"
              aria-label={`${getCtaLabel(type)} - Fonctionnalité à venir`}
              className="min-h-[44px]"
            >
              <span>{getCtaLabel(type)}</span>
              <MuzaSymbol size="sm" className="ml-1 text-white opacity-90" />
            </Button>
          )}

          {draftError && (
            <p className="text-xs text-terracotta font-medium pt-0.5">{draftError}</p>
          )}

          {/* Secondary Action Row: Action B (Modifier l'idée) & Action C (Pas pour moi) */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setModifyNoticeOpen((prev) => !prev)}
              className="text-xs text-ink-muted hover:text-ink"
              title="Préparer une variation de cette idée"
            >
              <span>Modifier l’idée</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setModifyNoticeOpen(false)
                setFeedbackOpen(true)
              }}
              className="text-xs text-ink-muted hover:text-terracotta"
              title="Indiquer à Mūza pourquoi cette proposition ne vous convient pas"
            >
              <span>Pas pour moi</span>
            </Button>
          </div>

          {/* Concept notice for Action B: Modifier l'idée */}
          {modifyNoticeOpen && (
            <div className="bg-ivory-subtle border border-ivory-border p-2.5 rounded-xl text-xs text-ink-muted flex items-start justify-between gap-2">
              <p>
                <strong className="text-ink font-semibold">Modification d’idée :</strong> Cette fonctionnalité permettra d’ajuster l’angle ou le format avec Mūza sans tout recommencer.
              </p>
              <button
                onClick={() => setModifyNoticeOpen(false)}
                className="text-ink-muted hover:text-ink text-xs"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

/**
 * Format-specific visual preview canvas generator with brand media image integration.
 */
function renderFormatPreview(
  format: RecommendationFormat,
  title: string,
  summary: string,
  media: BrandMediaAsset | null
) {
  switch (format) {
    case 'INSTAGRAM_REEL':
    case 'TIKTOK':
    case 'YOUTUBE_SHORT':
      return (
        <div className="relative w-full h-36 sm:h-40 rounded-xl bg-ink text-white p-3 flex flex-col justify-between overflow-hidden shadow-xs border border-white/10">
          {media ? (
            <>
              <img
                src={media.url}
                alt={media.alt}
                className="absolute inset-0 w-full h-full object-cover opacity-75"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            </>
          ) : (
            <div aria-hidden="true" className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-terracotta/30 blur-xl pointer-events-none" />
          )}

          <div className="flex items-center justify-between text-[10px] font-bold text-terracotta-light relative z-10">
            <span className="flex items-center gap-1 uppercase tracking-wider bg-black/40 px-2 py-0.5 rounded-full border border-white/20">
              <span>📱</span> {FORMAT_LABELS[format]} • 9:16
            </span>
            <span className="bg-white/10 px-2 py-0.5 rounded-full font-mono">0:30</span>
          </div>

          <div className="my-auto flex items-center gap-3 relative z-10">
            <div className="w-10 h-10 rounded-full bg-terracotta text-white flex items-center justify-center text-sm shadow-md shrink-0">
              ▶
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-serif font-bold text-white leading-tight line-clamp-1">
                {title}
              </span>
              <span className="text-[10px] text-white/80 line-clamp-1">
                Aperçu vidéo vertical avec sous-titres
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[9px] text-white/70 relative z-10">
            <span>Matière Marque • Studio Mūza</span>
            <span className="text-terracotta-light font-bold">✦ Dynamic Reel</span>
          </div>
        </div>
      )

    case 'INSTAGRAM_CAROUSEL':
      return (
        <div className="relative w-full h-36 sm:h-40 rounded-xl bg-ivory-subtle p-3 flex flex-col justify-between overflow-hidden border border-ivory-border">
          {/* Stacked Cards Background Layers */}
          <div className="absolute right-3 top-3 w-[88%] h-28 rounded-lg bg-ivory-border/60 border border-ivory-border transform rotate-2 pointer-events-none" />
          <div className="absolute right-5 top-2 w-[88%] h-28 rounded-lg bg-terracotta-light/50 border border-terracotta-border/40 transform -rotate-1 pointer-events-none" />

          {/* Top Main Slide */}
          <div className="relative z-10 w-[92%] h-full bg-ivory-card border border-ivory-border rounded-lg p-3 flex flex-col justify-between shadow-xs overflow-hidden">
            {media && (
              <>
                <img
                  src={media.url}
                  alt={media.alt}
                  className="absolute inset-0 w-full h-full object-cover opacity-30"
                />
                <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ivory-card via-ivory-card/80 to-transparent" />
              </>
            )}
            <div className="flex items-center justify-between text-[10px] font-bold text-terracotta uppercase tracking-wider relative z-10">
              <span>📚 Carrousel Multi-Slides</span>
              <span className="bg-terracotta-light text-terracotta-dark px-1.5 py-0.5 rounded-md text-[9px]">
                1 / 4 slides
              </span>
            </div>
            <p className="font-serif text-sm font-bold text-ink leading-tight line-clamp-2 my-auto relative z-10">
              {title}
            </p>
            <div className="flex items-center justify-between text-[9px] text-ink-muted relative z-10">
              <span>Glisser pour voir les slides ➔</span>
              <span className="text-terracotta font-semibold">✦ Mūza Stack</span>
            </div>
          </div>
        </div>
      )

    case 'INSTAGRAM_STORY':
      return (
        <div className="relative w-full h-36 sm:h-40 rounded-xl bg-gradient-to-br from-terracotta-light to-ivory p-3 flex flex-col justify-between border-2 border-terracotta/40 overflow-hidden">
          {media && (
            <>
              <img
                src={media.url}
                alt={media.alt}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40" />
            </>
          )}
          <div className="flex items-center gap-2 relative z-10">
            <div className="w-6 h-6 rounded-full bg-terracotta text-white flex items-center justify-center text-[10px] font-bold ring-2 ring-terracotta-border">
              ✦
            </div>
            <div className="flex flex-col">
              <span className={`text-[10px] font-bold ${media ? 'text-white' : 'text-ink'}`}>Votre Marque</span>
              <span className={`text-[8px] ${media ? 'text-white/80' : 'text-ink-muted'}`}>Story Instagram</span>
            </div>
          </div>

          <div className="my-auto text-center px-2 relative z-10">
            <p className={`font-serif text-sm font-bold leading-tight line-clamp-2 ${media ? 'text-white' : 'text-ink'}`}>
              « {title} »
            </p>
            <span className="inline-block mt-1 text-[9px] font-semibold text-terracotta bg-white/90 px-2 py-0.5 rounded-full border border-terracotta-border/30">
              Sondage / Sticker Interactif
            </span>
          </div>

          <div className={`text-[9px] font-bold text-center relative z-10 ${media ? 'text-white/90' : 'text-terracotta-dark'}`}>
            Format Story Vertical 9:16
          </div>
        </div>
      )

    case 'BLOG_ARTICLE':
    case 'WEBSITE_PAGE':
      return (
        <div className="relative w-full h-36 sm:h-40 rounded-xl bg-ivory-card p-3 flex flex-col justify-between border border-emerald-600/30 overflow-hidden shadow-xs">
          {media && (
            <>
              <img
                src={media.url}
                alt={media.alt}
                className="absolute inset-0 w-full h-full object-cover opacity-20"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ivory-card via-ivory-card/85 to-transparent" />
            </>
          )}
          <div className="flex items-center justify-between border-b border-ivory-border pb-1.5 text-[10px] font-mono text-ink-muted relative z-10">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              https://votre-site.fr/blog/article
            </span>
            <span className="text-emerald-700 font-bold uppercase text-[9px]">Éditorial</span>
          </div>

          <div className="my-auto flex flex-col gap-1 relative z-10">
            <h4 className="font-serif text-sm font-bold text-ink leading-snug line-clamp-1">
              {title}
            </h4>
            <p className="text-[11px] text-ink-muted line-clamp-2 leading-relaxed">
              {summary}
            </p>
          </div>

          <div className="flex items-center justify-between text-[9px] text-ink-muted pt-1 border-t border-ivory-border/60 relative z-10">
            <span>Lecture ~3 min • Optimisé SEO</span>
            <span className="text-emerald-700 font-semibold">✦ Article de fond</span>
          </div>
        </div>
      )

    case 'GOOGLE_BUSINESS_PROFILE':
      return (
        <div className="relative w-full h-36 sm:h-40 rounded-xl bg-blue-50/50 p-3 flex flex-col justify-between border border-blue-200 overflow-hidden">
          {media && (
            <>
              <img
                src={media.url}
                alt={media.alt}
                className="absolute inset-0 w-full h-full object-cover opacity-25"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-blue-50 via-blue-50/80 to-transparent" />
            </>
          )}
          <div className="flex items-center justify-between text-[10px] font-bold text-blue-900 relative z-10">
            <span className="flex items-center gap-1">
              <span>📍</span> Google Business Profile
            </span>
            <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-[9px]">
              Actualité Locale
            </span>
          </div>

          <div className="my-auto flex flex-col gap-1 relative z-10">
            <p className="font-serif text-sm font-bold text-ink leading-tight line-clamp-2">
              {title}
            </p>
            <span className="text-[10px] text-ink-muted line-clamp-1">
              Fiche Google • Visibilité locale & cartes
            </span>
          </div>

          <div className="flex items-center justify-between text-[9px] text-blue-800 font-semibold relative z-10">
            <span>Visiteurs locaux</span>
            <span>✦ Mūza Local</span>
          </div>
        </div>
      )

    case 'INSTAGRAM_POST':
    case 'FACEBOOK_POST':
    case 'LINKEDIN_POST':
    default:
      return (
        <div className="relative w-full h-36 sm:h-40 rounded-xl bg-gradient-to-r from-ivory-card via-terracotta-light/30 to-ivory-card p-3 flex flex-col justify-between border border-ivory-border overflow-hidden">
          {media && (
            <>
              <img
                src={media.url}
                alt={media.alt}
                className="absolute inset-0 w-full h-full object-cover opacity-25"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ivory-card via-ivory-card/80 to-transparent" />
            </>
          )}
          <div className="flex items-center justify-between text-[10px] font-bold text-ink-muted uppercase relative z-10">
            <span>{FORMAT_LABELS[format] || 'Post Social'}</span>
            <span className="text-terracotta">Aperçu Visuel</span>
          </div>

          <div className="my-auto flex items-center gap-3 relative z-10">
            {media ? (
              <img
                src={media.url}
                alt={media.alt}
                className="w-12 h-12 rounded-lg object-cover border border-ivory-border shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-terracotta-light border border-terracotta-border/40 flex items-center justify-center text-terracotta shrink-0 font-serif font-bold text-lg">
                ✦
              </div>
            )}
            <div className="flex flex-col gap-0.5">
              <h4 className="font-serif text-sm font-bold text-ink leading-tight line-clamp-1">
                {title}
              </h4>
              <p className="text-[11px] text-ink-muted line-clamp-2 leading-relaxed">
                {summary}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between text-[9px] text-ink-muted relative z-10">
            <span>Visual Post Format</span>
            <span className="text-terracotta font-semibold">✦ Studio Mūza</span>
          </div>
        </div>
      )
  }
}
