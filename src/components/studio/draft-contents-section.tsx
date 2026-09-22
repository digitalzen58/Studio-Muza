import React from 'react'
import Link from 'next/link'
import { FileEdit, ArrowRight, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export interface DraftContentSummary {
  id: string
  business_id: string
  recommendation_id: string | null
  content_type: string
  topic: string | null
  hook: string | null
  cta: string | null
  status: string
  created_at: string
  updated_at: string
  content_variants?: Array<{
    id: string
    format: string | null
    platform: string
    title: string | null
    caption: string | null
  }> | null
}

interface DraftContentsSectionProps {
  drafts: DraftContentSummary[]
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMin / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMin < 2) return 'Modifié à l’instant'
    if (diffMin < 60) return `Modifié il y a ${diffMin} min`
    if (diffHours < 24) return `Modifié il y a ${diffHours} h`
    if (diffDays === 1) return 'Modifié hier'
    return `Modifié le ${date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`
  } catch {
    return 'Modifié récemment'
  }
}

function getFormatBadgeLabel(format?: string | null, platform?: string | null): string {
  if (format === 'CAROUSEL') return 'Carrousel Instagram'
  if (format === 'REEL') return 'Reel Instagram'
  if (format === 'STORY') return 'Story'
  if (platform === 'FACEBOOK') return 'Post Facebook'
  return 'Post Instagram'
}

export function DraftContentsSection({ drafts }: DraftContentsSectionProps) {
  if (!drafts || drafts.length === 0) {
    return null
  }

  return (
    <section className="flex flex-col gap-3.5 w-full max-w-xl mx-auto pt-2 pb-1">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileEdit className="w-5 h-5 text-terracotta" />
          <h2 className="font-serif text-xl font-bold text-ink">
            Vos brouillons en cours
          </h2>
        </div>
        <Badge variant="ivory" className="text-xs font-normal">
          {drafts.length} {drafts.length > 1 ? 'brouillons' : 'brouillon'}
        </Badge>
      </div>

      <p className="text-xs text-ink-muted -mt-1 leading-relaxed">
        Reprenez vos créations là où vous les avez laissées avant d’explorer de nouvelles idées.
      </p>

      {/* Draft Cards List */}
      <div className="flex flex-col gap-3">
        {drafts.map((draft) => {
          const primaryVariant = draft.content_variants?.[0]
          const formatBadge = getFormatBadgeLabel(
            primaryVariant?.format,
            primaryVariant?.platform
          )
          const displayTitle =
            draft.topic || primaryVariant?.title || 'Brouillon sans titre'

          return (
            <div
              key={draft.id}
              className="bg-white border border-ivory-border/80 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col gap-3"
            >
              {/* Top Row: Format & Status */}
              <div className="flex items-center justify-between gap-2">
                <Badge variant="terracotta" className="text-[10px]">
                  {formatBadge}
                </Badge>

                <div className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                  <Clock className="w-3 h-3" />
                  <span>{formatRelativeTime(draft.updated_at)}</span>
                </div>
              </div>

              {/* Title */}
              <h3 className="text-sm font-semibold text-ink line-clamp-2 leading-snug">
                {displayTitle}
              </h3>

              {/* Bottom Row: State & CTA */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-ivory-subtle">
                <span className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">
                  Brouillon
                </span>

                <Link href={`/app/content/${draft.id}`}>
                  <Button
                    variant="primary"
                    size="sm"
                    className="gap-1.5 text-xs py-1.5 px-3.5 shadow-xs"
                  >
                    <span>Continuer</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
