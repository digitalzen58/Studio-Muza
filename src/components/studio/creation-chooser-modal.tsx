'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X, Image as ImageIcon, Layers, Video, Loader2 } from 'lucide-react'
import { createManualContentDraftAction } from '@/actions/content'
import { Badge } from '@/components/ui/badge'

interface CreationChooserModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreationChooserModal({
  isOpen,
  onClose,
}: CreationChooserModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [selectedFormat, setSelectedFormat] = useState<'POST' | 'CAROUSEL' | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleCreate = (format: 'POST' | 'CAROUSEL') => {
    if (isPending) return
    setError(null)
    setSelectedFormat(format)

    startTransition(async () => {
      const res = await createManualContentDraftAction(format)
      if (res.success) {
        onClose()
        router.push(`/app/content/${res.contentId}`)
      } else {
        setError(res.message)
        setSelectedFormat(null)
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="creation-chooser-title"
    >
      <div className="bg-ivory-card border border-ivory-border rounded-3xl w-full max-w-sm shadow-xl p-5 flex flex-col gap-4 animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2
            id="creation-chooser-title"
            className="font-serif text-lg sm:text-xl font-bold text-ink"
          >
            Que voulez-vous créer ?
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="p-1.5 text-ink-muted hover:text-ink rounded-full hover:bg-ivory-subtle transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
            {error}
          </div>
        )}

        {/* Options List */}
        <div className="flex flex-col gap-2.5 pt-1">
          {/* Option 1: Une publication */}
          <button
            type="button"
            onClick={() => handleCreate('POST')}
            disabled={isPending}
            className="w-full text-left p-4 rounded-2xl border border-ivory-border bg-white hover:border-terracotta hover:bg-terracotta-light/20 transition-all group flex items-start gap-3.5 shadow-2xs hover:shadow-xs active:scale-[0.99]"
          >
            <div className="w-10 h-10 rounded-xl bg-terracotta-light text-terracotta flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              {isPending && selectedFormat === 'POST' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <ImageIcon className="w-5 h-5" />
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-ink group-hover:text-terracotta-dark transition-colors">
                Une publication
              </span>
              <span className="text-xs text-ink-muted leading-relaxed">
                Une photo et un texte
              </span>
            </div>
          </button>

          {/* Option 2: Un carrousel */}
          <button
            type="button"
            onClick={() => handleCreate('CAROUSEL')}
            disabled={isPending}
            className="w-full text-left p-4 rounded-2xl border border-ivory-border bg-white hover:border-terracotta hover:bg-terracotta-light/20 transition-all group flex items-start gap-3.5 shadow-2xs hover:shadow-xs active:scale-[0.99]"
          >
            <div className="w-10 h-10 rounded-xl bg-terracotta-light text-terracotta flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              {isPending && selectedFormat === 'CAROUSEL' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Layers className="w-5 h-5" />
              )}
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold text-ink group-hover:text-terracotta-dark transition-colors">
                Un carrousel
              </span>
              <span className="text-xs text-ink-muted leading-relaxed">
                Plusieurs pages à faire défiler
              </span>
            </div>
          </button>

          {/* Option 3: Une vidéo courte (Bientôt) */}
          <div
            className="w-full text-left p-4 rounded-2xl border border-dashed border-ivory-border bg-ivory-subtle/50 opacity-65 flex items-start justify-between gap-3 cursor-not-allowed select-none"
            aria-disabled="true"
          >
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-ivory-border/50 text-ink-muted flex items-center justify-center shrink-0">
                <Video className="w-5 h-5" />
              </div>
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-semibold text-ink-muted">
                  Une vidéo courte
                </span>
                <span className="text-xs text-ink-muted/80 leading-relaxed">
                  Pour Reel, TikTok et Shorts
                </span>
              </div>
            </div>
            <Badge variant="ivory" className="text-[10px] text-ink-muted shrink-0 font-normal">
              Bientôt
            </Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
