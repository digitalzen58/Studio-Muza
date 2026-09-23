'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { FileEdit, ArrowRight, Clock, Trash2, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { deleteContentDraftAction } from '@/actions/content'

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

function getFormatBadgeLabel(format?: string | null): string {
  if (format === 'CAROUSEL') return 'Carrousel'
  if (format === 'REEL') return 'Vidéo courte'
  if (format === 'STORY') return 'Story'
  return 'Publication'
}

export function DraftContentsSection({ drafts }: DraftContentsSectionProps) {
  const [deletedIds, setDeletedIds] = useState<string[]>([])
  const [draftToDelete, setDraftToDelete] = useState<DraftContentSummary | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  const items = (drafts || []).filter((d) => !deletedIds.includes(d.id))

  if (!items || items.length === 0) {
    return null
  }

  const handleConfirmDelete = async () => {
    if (!draftToDelete) return
    setIsDeleting(true)
    const deletedId = draftToDelete.id

    try {
      const res = await deleteContentDraftAction(deletedId)
      if (res.success) {
        setDeletedIds((prev) => [...prev, deletedId])
        setDraftToDelete(null)
        setFeedbackMessage('Brouillon supprimé.')
        setTimeout(() => setFeedbackMessage(null), 4000)
      }
    } catch (err) {
      console.error('Failed to delete draft:', err)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <section className="flex flex-col gap-3.5 w-full pt-2 pb-1">
      {/* Section Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileEdit className="w-5 h-5 text-terracotta" />
          <h2 className="font-serif text-xl font-bold text-ink">
            Vos brouillons en cours
          </h2>
        </div>
        <Badge variant="ivory" className="text-xs font-normal">
          {items.length} {items.length > 1 ? 'brouillons' : 'brouillon'}
        </Badge>
      </div>

      <p className="text-xs text-ink-muted -mt-1 leading-relaxed">
        Reprenez vos créations là où vous les avez laissées avant d’explorer de nouvelles idées.
      </p>

      {/* Discrete Feedback Banner */}
      {feedbackMessage && (
        <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs animate-in fade-in duration-200">
          <Check className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      {/* Draft Cards Responsive Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {items.map((draft) => {
          const primaryVariant = draft.content_variants?.[0]
          const formatBadge = getFormatBadgeLabel(primaryVariant?.format)
          const displayTitle =
            draft.topic || primaryVariant?.title || 'Brouillon sans titre'

          return (
            <div
              key={draft.id}
              className="bg-white border border-ivory-border/80 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between gap-3 h-full group"
            >
              <div className="flex flex-col gap-2.5">
                {/* Top Row: Format & Status & Quick Delete */}
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="terracotta" className="text-[10px]">
                    {formatBadge}
                  </Badge>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-[11px] text-ink-muted">
                      <Clock className="w-3 h-3" />
                      <span>{formatRelativeTime(draft.updated_at)}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDraftToDelete(draft)}
                      className="text-ink-muted/60 hover:text-red-600 transition-colors p-1 rounded-md hover:bg-red-50 opacity-80 group-hover:opacity-100"
                      title="Supprimer le brouillon"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-sm font-semibold text-ink line-clamp-2 leading-snug">
                  {displayTitle}
                </h3>
              </div>

              {/* Bottom Row: State & CTA */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-ivory-subtle">
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

      {/* Delete Draft Confirmation Modal */}
      {draftToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
          <div className="bg-ivory-card border border-ivory-border rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="space-y-1">
              <h3 className="text-sm font-serif font-bold text-ink">
                Supprimer ce brouillon ?
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Cette action est définitive.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDraftToDelete(null)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 text-xs text-ink-muted hover:text-ink font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-3.5 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs disabled:opacity-50 transition-colors"
              >
                {isDeleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
