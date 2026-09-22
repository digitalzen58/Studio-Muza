'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { X, Calendar, Clock, Edit2, Phone, BookmarkCheck, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import type { PublicationItem } from '@/services/publication-history/types'
import { mapFormatLabel, mapPlatformLabel } from '@/services/publication-history/types'
import { PublicationStatusBadge } from './publication-status-badge'
import { VisualCanvas } from '@/components/studio/visual-canvas'

interface PublicationDetailModalProps {
  item: PublicationItem | null
  isOpen: boolean
  onClose: () => void
}

function formatFullDate(isoString?: string | null): string {
  if (!isoString) return ''
  try {
    const d = new Date(isoString)
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return isoString
  }
}

export function PublicationDetailModal({
  item,
  isOpen,
  onClose,
}: PublicationDetailModalProps) {
  const [carouselIndex, setCarouselIndex] = useState(1)

  if (!isOpen || !item) return null

  const platformLabel = mapPlatformLabel(item.platform)
  const formatLabel = mapFormatLabel(item.format)
  const slides = item.slides || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-ivory-card border border-ivory-border rounded-2xl max-w-md w-full p-4 sm:p-5 space-y-4 shadow-xl my-auto animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-ivory-border">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="font-serif font-bold text-base text-ink">
                Détail de la publication
              </h3>
              <PublicationStatusBadge status={item.status} />
            </div>
            <p className="text-[11px] text-ink-muted">
              {formatLabel} {platformLabel ? `• ${platformLabel}` : ''}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-ink-muted hover:text-ink rounded-lg hover:bg-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
          {/* Visual Presentation */}
          {item.format === 'POST' ? (
            item.visualComposition ? (
              <div className="w-full max-w-[280px] mx-auto">
                <VisualCanvas
                  composition={item.visualComposition}
                  onChange={() => {}}
                  readOnly={true}
                />
              </div>
            ) : item.coverMediaUrl ? (
              <div className="w-full max-w-[280px] mx-auto aspect-[4/5] rounded-xl overflow-hidden border border-ivory-border shadow-xs">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.coverMediaUrl}
                  alt={item.coverMediaAlt || item.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : null
          ) : (
            // Carousel Slides Preview
            <div className="space-y-2">
              {slides.length > 0 ? (
                <div className="relative w-full max-w-[280px] mx-auto aspect-[4/5] bg-white rounded-xl border border-ivory-border overflow-hidden flex flex-col justify-between p-4 shadow-xs">
                  <div className="space-y-2">
                    <span className="text-[10px] font-semibold text-terracotta tracking-wider uppercase">
                      Page {carouselIndex} / {slides.length}
                    </span>
                    <h4 className="font-serif font-bold text-sm text-ink">
                      {slides[carouselIndex - 1]?.headline || item.title}
                    </h4>
                    {slides[carouselIndex - 1]?.body && (
                      <p className="text-xs text-ink-muted leading-relaxed">
                        {slides[carouselIndex - 1]?.body}
                      </p>
                    )}
                  </div>

                  {slides.length > 1 && (
                    <div className="flex items-center justify-between pt-2 border-t border-ivory-border/60">
                      <button
                        type="button"
                        onClick={() => setCarouselIndex((prev) => (prev > 1 ? prev - 1 : slides.length))}
                        className="p-1 rounded bg-ivory text-ink hover:bg-ivory-border transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-[11px] text-ink-muted">
                        {carouselIndex} / {slides.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCarouselIndex((prev) => (prev < slides.length ? prev + 1 : 1))}
                        className="p-1 rounded bg-ivory text-ink hover:bg-ivory-border transition-colors"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ) : item.coverMediaUrl ? (
                <div className="w-full max-w-[280px] mx-auto aspect-[4/5] rounded-xl overflow-hidden border border-ivory-border shadow-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.coverMediaUrl}
                    alt={item.coverMediaAlt || item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : null}
            </div>
          )}

          {/* Title & Topic */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
              Titre / Sujet
            </span>
            <p className="text-sm font-medium text-ink bg-white/70 p-2.5 rounded-xl border border-ivory-border">
              {item.title}
            </p>
          </div>

          {/* Caption / Publication Text */}
          {item.caption && (
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
                Texte de publication
              </span>
              <p className="text-xs text-ink leading-relaxed whitespace-pre-wrap bg-white/70 p-3 rounded-xl border border-ivory-border">
                {item.caption}
              </p>
            </div>
          )}

          {/* Commercial Action if present */}
          {item.action && item.action.type && item.action.type !== 'NONE' && (
            <div className="space-y-1">
              <span className="text-[11px] font-semibold text-ink-muted uppercase tracking-wider block">
                Action commerciale
              </span>
              <div className="flex items-center gap-2 p-2.5 bg-terracotta-light/40 border border-terracotta/20 rounded-xl text-xs text-ink">
                {item.action.type === 'PHONE' && <Phone className="w-3.5 h-3.5 text-terracotta" />}
                {item.action.type === 'BOOKING' && <BookmarkCheck className="w-3.5 h-3.5 text-terracotta" />}
                {item.action.type === 'APPOINTMENT' && <Calendar className="w-3.5 h-3.5 text-terracotta" />}
                <div className="space-y-0.5">
                  <span className="font-medium">
                    {item.action.type === 'PHONE' && 'Appeler : '}
                    {item.action.type === 'BOOKING' && 'Réserver : '}
                    {item.action.type === 'APPOINTMENT' && 'Prendre RDV : '}
                  </span>
                  <span className="text-ink-muted break-all">
                    {item.action.destination || 'Non renseigné'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Date Information */}
          <div className="p-3 bg-white rounded-xl border border-ivory-border space-y-1.5 text-xs text-ink">
            {item.status === 'PUBLISHED' && item.publishedAt && (
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span>Publiée le <strong>{formatFullDate(item.publishedAt)}</strong></span>
              </div>
            )}

            {item.status === 'SCHEDULED' && item.scheduledAt && (
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-terracotta shrink-0" />
                <span>Prévue le <strong>{formatFullDate(item.scheduledAt)}</strong></span>
              </div>
            )}

            {item.status === 'FAILED' && (
              <div className="flex items-start gap-2 text-rose-700">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>{item.failureReason || 'Un problème est survenu lors de la publication.'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-ivory-border flex items-center justify-between gap-2">
          {item.status === 'SCHEDULED' ? (
            <Link
              href={`/app/content/${item.contentId}`}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-terracotta text-white rounded-xl text-xs font-medium hover:bg-terracotta-dark transition-colors shadow-xs w-full sm:w-auto"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Modifier le contenu</span>
            </Link>
          ) : (
            <span className="text-[11px] text-ink-muted">
              {item.status === 'PUBLISHED' ? 'Publication archivée en lecture seule' : ''}
            </span>
          )}

          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 text-xs font-medium text-ink bg-white border border-ivory-border rounded-xl hover:bg-ivory transition-colors ml-auto"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
