'use client'

import React from 'react'
import Link from 'next/link'
import { Eye, Edit2, Calendar, Clock, AlertCircle } from 'lucide-react'
import type { PublicationItem } from '@/services/publication-history/types'
import { mapFormatLabel, mapPlatformLabel } from '@/services/publication-history/types'
import { PublicationThumbnail } from './publication-thumbnail'
import { PublicationStatusBadge } from './publication-status-badge'

interface PublicationCardProps {
  item: PublicationItem
  onView: (item: PublicationItem) => void
}

function formatDateFr(isoString?: string | null): string {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d)
  } catch {
    return isoString
  }
}

function formatDateTimeFr(isoString?: string | null): string {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return isoString
  }
}

export function PublicationCard({ item, onView }: PublicationCardProps) {
  const platformLabel = mapPlatformLabel(item.platform)
  const formatLabel = mapFormatLabel(item.format)

  return (
    <div className="w-full bg-white border border-ivory-border hover:border-terracotta/40 rounded-2xl p-3.5 sm:p-4 shadow-2xs transition-all flex gap-3.5 sm:gap-4 items-stretch">
      {/* Thumbnail: ~30-35% on mobile */}
      <div className="w-[100px] sm:w-[125px] shrink-0 self-start">
        <PublicationThumbnail item={item} />
      </div>

      {/* Info Body: ~65-70% */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-[11px] text-ink-muted font-medium">
              {formatLabel} {platformLabel ? `• ${platformLabel}` : ''}
            </span>
            <PublicationStatusBadge status={item.status} />
          </div>

          <h3
            className="font-serif font-bold text-sm sm:text-base text-ink line-clamp-2 leading-snug"
            title={item.title}
          >
            {item.title}
          </h3>

          {/* Date / Status text */}
          <div className="text-xs text-ink-muted leading-relaxed">
            {item.status === 'PUBLISHED' && item.publishedAt && (
              <span className="flex items-center gap-1.5 text-ink-muted">
                <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Publiée le {formatDateFr(item.publishedAt)}</span>
              </span>
            )}

            {item.status === 'SCHEDULED' && item.scheduledAt && (
              <span className="flex items-center gap-1.5 text-ink-muted">
                <Calendar className="w-3.5 h-3.5 text-terracotta shrink-0" />
                <span>Prévue le {formatDateTimeFr(item.scheduledAt)}</span>
              </span>
            )}

            {item.status === 'FAILED' && (
              <span className="flex items-center gap-1.5 text-rose-700 font-medium">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Publication non envoyée</span>
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 flex items-center gap-2 flex-wrap mt-auto">
          <button
            type="button"
            onClick={() => onView(item)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-ivory-card border border-ivory-border text-ink hover:bg-white transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-ink-muted" />
            <span>Voir</span>
          </button>

          {item.status === 'SCHEDULED' && (
            <Link
              href={`/app/content/${item.contentId}`}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium bg-white border border-ivory-border text-ink hover:border-terracotta/40 transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5 text-ink-muted" />
              <span>Modifier</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
