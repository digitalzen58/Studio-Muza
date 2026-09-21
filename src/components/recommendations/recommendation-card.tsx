import React from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MuzaSymbol } from '@/components/ui/muza-symbol'
import type {
  MuzaRecommendation,
  RecommendationType,
  RecommendationFormat,
} from '@/types/muza-recommendation-engine'

const TYPE_LABELS: Record<RecommendationType, string> = {
  CONTENT: 'Contenu',
  SEO: 'SEO',
  OFFER: 'Offre',
  VISIBILITY: 'Visibilité',
  ENGAGEMENT: 'Engagement',
}

const FORMAT_LABELS: Record<RecommendationFormat, string> = {
  INSTAGRAM_POST: 'Post Instagram',
  INSTAGRAM_CAROUSEL: 'Carrousel Instagram',
  INSTAGRAM_REEL: 'Reel Instagram',
  INSTAGRAM_STORY: 'Story Instagram',
  FACEBOOK_POST: 'Post Facebook',
  TIKTOK: 'TikTok',
  LINKEDIN_POST: 'Post LinkedIn',
  YOUTUBE_SHORT: 'Short YouTube',
  BLOG_ARTICLE: 'Article de blog',
  WEBSITE_PAGE: 'Page du site',
  GOOGLE_BUSINESS_PROFILE: 'Fiche Google',
  OTHER: 'Autre',
}

function getCtaLabel(type: RecommendationType): string {
  switch (type) {
    case 'CONTENT':
      return 'Créer ce contenu'
    case 'SEO':
      return 'Travailler cette action'
    case 'OFFER':
      return 'Voir cette offre'
    case 'VISIBILITY':
    case 'ENGAGEMENT':
    default:
      return 'Voir cette action'
  }
}

/**
 * Format-specific visual accent and indicator helper.
 * Provides distinct card border accents and visual tags according to format.
 */
function getFormatVisualTreatment(
  primaryFormat: RecommendationFormat | null,
  type: RecommendationType
) {
  if (
    primaryFormat === 'INSTAGRAM_REEL' ||
    primaryFormat === 'TIKTOK' ||
    primaryFormat === 'YOUTUBE_SHORT'
  ) {
    return {
      borderAccent: 'border-l-4 border-l-terracotta',
      previewTag: 'Mini-aperçu Reel Vertical',
    }
  }
  if (primaryFormat === 'INSTAGRAM_CAROUSEL') {
    return {
      borderAccent: 'border-l-4 border-l-amber-700/80',
      previewTag: 'Structure Carrousel Slides',
    }
  }
  if (primaryFormat === 'INSTAGRAM_STORY') {
    return {
      borderAccent: 'border-l-4 border-l-rose-600/80',
      previewTag: 'Format Story Frame',
    }
  }
  if (
    primaryFormat === 'BLOG_ARTICLE' ||
    primaryFormat === 'WEBSITE_PAGE' ||
    type === 'SEO'
  ) {
    return {
      borderAccent: 'border-l-4 border-l-emerald-700/80',
      previewTag: 'Structure Éditoriale / SEO',
    }
  }
  return {
    borderAccent: 'border-l-4 border-l-ink/70',
    previewTag: 'Action de Visibilité',
  }
}

interface RecommendationCardProps {
  recommendation: MuzaRecommendation
}

/**
 * Editorial card component displaying an individual Mūza recommendation.
 * Presents core metadata, whyNow reasoning, format-specific visual treatment, constraints, and primary CTA.
 */
export function RecommendationCard({ recommendation }: RecommendationCardProps) {
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

  const primaryFormat = suggestedFormats.length > 0 ? suggestedFormats[0] : null
  const formatLabel = primaryFormat ? FORMAT_LABELS[primaryFormat] || primaryFormat : null
  const { borderAccent, previewTag } = getFormatVisualTreatment(primaryFormat, type)

  return (
    <Card
      variant="default"
      className={`flex flex-col gap-4 py-5 px-5 transition-shadow hover:shadow-sm ${borderAccent}`}
    >
      {/* Top Metadata Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge variant="terracotta" showSymbol>
            {TYPE_LABELS[type] || type}
          </Badge>
          {formatLabel && (
            <span className="text-[11px] font-medium text-ink-muted bg-ivory-subtle border border-ivory-border px-2.5 py-0.5 rounded-full">
              {formatLabel}
            </span>
          )}
          <span className="text-[10px] font-semibold tracking-wider text-terracotta-dark/80 bg-terracotta-light/60 border border-terracotta-border/40 px-2 py-0.5 rounded-full">
            ✦ {previewTag}
          </span>
        </div>

        {estimatedEffortMinutes !== null && estimatedEffortMinutes > 0 && (
          <span className="text-[11px] font-medium text-ink-muted flex items-center gap-1">
            <span>⏱</span> ~{estimatedEffortMinutes} min
          </span>
        )}
      </div>

      {/* Main Content */}
      <div className="flex flex-col gap-1.5">
        <h3 className="font-serif text-xl font-bold text-ink leading-snug">
          {title}
        </h3>
        <p className="text-sm font-medium text-ink/85 leading-relaxed">
          {summary}
        </p>
      </div>

      {/* "Pourquoi Mūza vous le propose" section */}
      {whyNow && (
        <div className="bg-terracotta-light/60 p-3.5 rounded-xl border border-terracotta-border/30 flex flex-col gap-1">
          <p className="text-[11px] font-semibold text-terracotta uppercase tracking-wider flex items-center gap-1">
            <MuzaSymbol size="sm" />
            <span>Pourquoi maintenant ?</span>
          </p>
          <p className="text-xs font-medium text-terracotta-dark leading-relaxed">
            {whyNow}
          </p>
        </div>
      )}

      {/* Constraints Metadata */}
      {(requiresCamera || requiresVoiceover) && (
        <div className="flex items-center gap-2 flex-wrap text-[11px] text-ink-muted">
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

      {/* Primary Action Button (Placeholder) */}
      <div className="pt-1">
        <Button
          variant="primary"
          size="md"
          fullWidth
          disabled
          title="Fonctionnalité de création à venir"
          aria-label={`${getCtaLabel(type)} - Fonctionnalité à venir`}
        >
          <span>{getCtaLabel(type)}</span>
          <MuzaSymbol size="sm" className="ml-1 text-white opacity-80" />
        </Button>
      </div>
    </Card>
  )
}

