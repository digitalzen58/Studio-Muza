'use client'

import React, { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { VisualCanvas } from './visual-canvas'
import type { VisualComposition } from '@/services/visual-composition/types'
import type { BrandMediaAsset } from '@/services/media'
import type { CarouselSlideData } from '@/actions/content'

interface ContentPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  onProceedToSchedule: () => void
  format: 'POST' | 'CAROUSEL'
  workingTitle: string
  hook?: string | null
  caption?: string | null
  cta?: string | null
  action?: {
    type?: string | null
    destination?: string | null
  } | null
  primaryMedia?: BrandMediaAsset | null
  visualComposition?: VisualComposition | null
  slides?: CarouselSlideData[]
  mediaAssets?: BrandMediaAsset[]
  isScheduled?: boolean
}

export function ContentPreviewModal({
  isOpen,
  onClose,
  onProceedToSchedule,
  format,
  workingTitle,
  hook,
  caption,
  cta,
  action,
  primaryMedia,
  visualComposition,
  slides = [],
  mediaAssets = [],
  isScheduled = false,
}: ContentPreviewModalProps) {
  const [carouselPageIndex, setCarouselPageIndex] = useState(1)

  if (!isOpen) return null

  const activeSlide = slides.find((s) => s.index === carouselPageIndex) || slides[0]
  const activeSlideMedia = activeSlide?.media_id
    ? mediaAssets.find((m) => m.id === activeSlide.media_id)
    : null

  const handlePrevPage = () => {
    setCarouselPageIndex((prev) => (prev > 1 ? prev - 1 : slides.length))
  }

  const handleNextPage = () => {
    setCarouselPageIndex((prev) => (prev < slides.length ? prev + 1 : 1))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-cream-border rounded-2xl max-w-md w-full p-4 sm:p-5 space-y-4 shadow-xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-cream-border">
          <div>
            <h3 className="font-semibold text-sm text-ink">
              Aperçu de la publication
            </h3>
            <p className="text-[11px] text-ink-muted">
              {format === 'POST'
                ? 'Format Publication (4:5)'
                : format === 'CAROUSEL'
                ? `Carrousel • ${slides.length} pages`
                : 'Aperçu'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-ink-muted hover:text-ink rounded-lg hover:bg-cream-subtle transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Working Title Reminder */}
        {workingTitle && (
          <div className="text-xs text-ink-muted bg-cream-subtle/70 px-3 py-1.5 rounded-lg border border-cream-border/50">
            <span className="font-medium text-ink">Titre de travail : </span>
            <span>{workingTitle}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {format === 'POST' ? (
            /* ================= POST PREVIEW ================= */
            <div className="space-y-3">
              {/* Composed Visual Canvas Preview */}
              <div className="relative aspect-4/5 w-full bg-cream-subtle rounded-xl overflow-hidden border border-cream-border">
                {visualComposition ? (
                  <VisualCanvas
                    composition={visualComposition}
                    onChange={() => {}}
                    mediaAssets={mediaAssets}
                    readOnly={true}
                  />
                ) : primaryMedia ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={primaryMedia.url}
                    alt={primaryMedia.alt || primaryMedia.original_filename || 'Visuel'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-ink-muted gap-2">
                    <span className="text-xs">Aucun visuel sélectionné</span>
                  </div>
                )}
              </div>

              {/* Publication text / Caption */}
              <div className="bg-white border border-cream-border rounded-xl p-3.5 space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted block">
                  Texte de la publication
                </span>
                {caption?.trim() ? (
                  <p className="text-xs text-ink whitespace-pre-wrap leading-relaxed">
                    {caption.trim()}
                  </p>
                ) : (
                  <p className="text-xs text-ink-muted/50 italic">
                    Aucun texte rédigé pour le moment.
                  </p>
                )}
              </div>

              {/* Conversion Action / Call to action (if present) */}
              {action?.type && action.type !== 'NONE' ? (
                <div className="flex items-center gap-2 p-2.5 bg-primary-light/40 border border-primary-border/60 rounded-xl text-xs text-primary-dark font-medium">
                  {action.type === 'PHONE' && (
                    <>
                      <span>📞</span>
                      <span>Appeler : {action.destination || 'Numéro de l’entreprise'}</span>
                    </>
                  )}
                  {action.type === 'BOOKING' && (
                    <>
                      <span>🔗</span>
                      <span>Réserver : {action.destination || 'Lien de réservation'}</span>
                    </>
                  )}
                  {action.type === 'APPOINTMENT' && (
                    <>
                      <span>📅</span>
                      <span>Prendre RDV : {action.destination || 'Lien de rendez-vous'}</span>
                    </>
                  )}
                </div>
              ) : cta?.trim() ? (
                <div className="flex items-center gap-2 p-2.5 bg-primary-light/30 border border-primary-border/50 rounded-xl text-xs text-primary-dark">
                  <span className="font-semibold">Action :</span>
                  <span>{cta.trim()}</span>
                </div>
              ) : null}
            </div>
          ) : (
            /* ================= CAROUSEL PREVIEW ================= */
            <div className="space-y-3">
              {/* Carousel Page Stepper */}
              {slides.length > 0 && activeSlide ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-ink font-medium">
                    <span>
                      Page {activeSlide.index} sur {slides.length} — {activeSlide.label}
                    </span>
                    <span className="text-[10px] text-ink-muted">
                      {activeSlide.type === 'COVER'
                        ? 'Couverture'
                        : activeSlide.type === 'CTA'
                        ? 'Conclusion'
                        : 'Étape'}
                    </span>
                  </div>

                  {/* Slide visual card */}
                  <div className="relative aspect-4/5 w-full bg-cream-subtle rounded-xl overflow-hidden border border-cream-border flex flex-col justify-between p-4">
                    {activeSlideMedia && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={activeSlideMedia.url}
                        alt={activeSlideMedia.alt || activeSlideMedia.original_filename || 'Visuel'}
                        className="absolute inset-0 w-full h-full object-cover z-0"
                      />
                    )}

                    {/* Dark gradient overlay if image exists so text remains legible */}
                    {activeSlideMedia && (
                      <div className="absolute inset-0 bg-linear-to-t from-ink/75 via-ink/25 to-transparent z-1" />
                    )}

                    <div className="relative z-2 flex justify-between items-start">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        activeSlideMedia
                          ? 'bg-black/50 text-white backdrop-blur-xs'
                          : 'bg-white text-ink border border-cream-border'
                      }`}>
                        Page {activeSlide.index}
                      </span>
                    </div>

                    <div className="relative z-2 space-y-1.5 mt-auto">
                      {activeSlide.text?.trim() ? (
                        <p className={`text-xs sm:text-sm font-medium leading-snug ${
                          activeSlideMedia ? 'text-white' : 'text-ink'
                        }`}>
                          {activeSlide.text.trim()}
                        </p>
                      ) : (
                        <p className={`text-xs italic ${
                          activeSlideMedia ? 'text-white/70' : 'text-ink-muted/50'
                        }`}>
                          Texte de la page vide
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Page Navigation Controls */}
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handlePrevPage}
                      className="inline-flex items-center gap-1 text-xs text-ink hover:text-primary px-2 py-1 rounded-lg border border-cream-border bg-white transition-colors"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Précédent</span>
                    </button>

                    <div className="flex items-center gap-1.5">
                      {slides.map((s) => (
                        <button
                          key={s.index}
                          type="button"
                          onClick={() => setCarouselPageIndex(s.index)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            s.index === carouselPageIndex
                              ? 'w-4 bg-primary'
                              : 'bg-cream-border hover:bg-primary/40'
                          }`}
                          title={`Page ${s.index}`}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={handleNextPage}
                      className="inline-flex items-center gap-1 text-xs text-ink hover:text-primary px-2 py-1 rounded-lg border border-cream-border bg-white transition-colors"
                    >
                      <span>Suivant</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : null}

              {/* Hook (if present) */}
              {hook?.trim() && (
                <div className="bg-white border border-cream-border rounded-xl p-3 space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted block">
                    Accroche principale
                  </span>
                  <p className="text-xs font-medium text-ink">
                    {hook.trim()}
                  </p>
                </div>
              )}

              {/* Caption / Publication text */}
              <div className="bg-white border border-cream-border rounded-xl p-3 space-y-1">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted block">
                  Légende du carrousel
                </span>
                {caption?.trim() ? (
                  <p className="text-xs text-ink whitespace-pre-wrap leading-relaxed">
                    {caption.trim()}
                  </p>
                ) : (
                  <p className="text-xs text-ink-muted/50 italic">
                    Aucune légende rédigée.
                  </p>
                )}
              </div>

              {/* Call to action (if present) */}
              {cta?.trim() && (
                <div className="flex items-center gap-2 p-2.5 bg-primary-light/30 border border-primary-border/50 rounded-xl text-xs text-primary-dark">
                  <span className="font-semibold">Action :</span>
                  <span>{cta.trim()}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-2 border-t border-cream-border/60 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-ink-muted hover:text-ink transition-colors"
          >
            Modifier
          </button>

          <button
            type="button"
            onClick={() => {
              onClose()
              onProceedToSchedule()
            }}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors shadow-xs inline-flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{isScheduled ? 'Changer la date' : 'Planifier'}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
