'use client'

import React, { useState, useRef, useTransition } from 'react'
import { X, UploadCloud, Plus, Check, Image as ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { uploadBusinessMediaAction } from '@/actions/media'
import type { BrandMediaAsset } from '@/services/media'

interface MediaPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onSelectMedia: (media: BrandMediaAsset) => void
  businessId: string
  mediaList: BrandMediaAsset[]
  onMediaUploaded: (newMedia: BrandMediaAsset) => void
  currentSelectedMediaId?: string | null
  slideIndex?: number
}

export function MediaPickerModal({
  isOpen,
  onClose,
  onSelectMedia,
  businessId,
  mediaList,
  onMediaUploaded,
  currentSelectedMediaId,
  slideIndex,
}: MediaPickerModalProps) {
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [isUploading, startUploadTransition] = useTransition()
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError(null)

    // Client-side quick size validation (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('L’image est trop volumineuse (maximum 10 Mo).')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // Client-side quick MIME validation
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type.toLowerCase())) {
      setUploadError('Format non supporté. Veuillez choisir un fichier JPEG, PNG ou WebP.')
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('businessId', businessId)

    startUploadTransition(async () => {
      const result = await uploadBusinessMediaAction(formData)
      if (result.success) {
        onMediaUploaded(result.mediaAsset)
        onSelectMedia(result.mediaAsset)
        onClose()
      } else {
        setUploadError(result.message)
      }
      if (fileInputRef.current) fileInputRef.current.value = ''
    })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Médiathèque personnelle"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/40 backdrop-blur-xs animate-fadeIn"
    >
      <div className="bg-cream w-full max-w-xl max-h-[85vh] rounded-3xl border border-cream-border shadow-xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-cream-border/80 bg-white">
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              <h2 className="font-serif text-lg sm:text-xl font-bold text-ink">
                Mes médias
              </h2>
            </div>
            <p className="text-xs text-ink-muted">
              {slideIndex
                ? `Choisissez une photo pour la slide #${slideIndex}`
                : 'Sélectionnez une photo de votre médiathèque'}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-cream-subtle text-ink-muted hover:text-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Action Bar */}
        <div className="p-3 sm:px-5 sm:py-3 bg-cream-subtle/70 border-b border-cream-border/60 flex items-center justify-between gap-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
            id="muza-media-upload-input"
          />

          <Button
            variant="primary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="gap-1.5 text-xs py-2 px-3.5 shadow-2xs"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Envoi en cours...</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter une photo</span>
              </>
            )}
          </Button>

          <span className="text-[11px] text-ink-muted">
            {mediaList.length} {mediaList.length > 1 ? 'photos' : 'photo'} • JPEG, PNG, WebP
          </span>
        </div>

        {/* Error Alert */}
        {uploadError && (
          <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
            <span>{uploadError}</span>
            <button
              type="button"
              onClick={() => setUploadError(null)}
              className="text-red-700 hover:text-red-900 text-xs px-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Media Grid or Empty State */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {mediaList.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-10 px-4 gap-3 bg-white/70 border border-dashed border-cream-border rounded-2xl">
              <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center text-primary">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="flex flex-col gap-1 max-w-xs">
                <h3 className="font-serif text-base font-bold text-ink">
                  Votre médiathèque est encore vide.
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Ajoutez vos premières photos (paysages, hébergement, moments de vie) pour illustrer vos créations.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="mt-1 gap-1.5 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter une photo</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {mediaList.map((media) => {
                const isSelected = media.id === currentSelectedMediaId
                return (
                  <button
                    key={media.id}
                    type="button"
                    onClick={() => {
                      onSelectMedia(media)
                      onClose()
                    }}
                    className={`group relative rounded-2xl overflow-hidden border-2 text-left transition-all aspect-square bg-white flex flex-col focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                      isSelected
                        ? 'border-primary ring-2 ring-primary/30 shadow-xs'
                        : 'border-cream-border hover:border-primary/40 hover:shadow-xs'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={media.url}
                      alt={media.alt}
                      className="w-full h-full object-cover transition-transform group-hover:scale-103"
                    />

                    {/* Gradient Overlay for Title */}
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-gradient-to-t from-ink/60 via-transparent to-transparent opacity-80 group-hover:opacity-90 transition-opacity"
                    />

                    {/* Selected Checkmark Badge */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-primary text-white rounded-full p-1 shadow-xs z-10">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                    )}

                    {/* Stock Media Illustration Badge */}
                    {media.source?.startsWith('STOCK') && (
                      <div className="absolute top-2 left-2 bg-slate-900/80 text-white text-[9px] font-medium px-2 py-0.5 rounded-full backdrop-blur-xs">
                        Photo gratuite
                      </div>
                    )}

                    {/* Filename / Alt caption at bottom */}
                    <div className="absolute bottom-2 left-2 right-2 text-[10px] text-white font-medium truncate drop-shadow-xs">
                      {media.creator_name ? `Pexels • ${media.creator_name}` : media.alt}
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:px-5 border-t border-cream-border/80 bg-white flex items-center justify-between text-xs text-ink-muted">
          <span>Taille maximale par fichier : 10 Mo</span>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Fermer
          </Button>
        </div>
      </div>
    </div>
  )
}
