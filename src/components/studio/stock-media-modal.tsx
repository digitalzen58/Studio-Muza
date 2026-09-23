'use client'

import React, { useState, useTransition } from 'react'
import {
  X,
  Search,
  Check,
  Loader2,
  ExternalLink,
  AlertCircle,
  Sparkles,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { searchStockMediaAction, importStockMediaAction } from '@/actions/stock-media'
import type { StockMediaItem } from '@/services/stock-media'
import type { BrandMediaAsset } from '@/services/media'

interface StockMediaModalProps {
  isOpen: boolean
  onClose: () => void
  businessId: string
  onSelectMedia: (media: BrandMediaAsset) => void
  onMediaImported: (media: BrandMediaAsset) => void
  slideIndex?: number
}

const SEARCH_SUGGESTIONS = [
  'Forêt en automne',
  'Lac du Morvan',
  'Randonnée avec un chien',
  'Nature en Bourgogne',
  'Feuilles d’automne',
]

export function StockMediaModal({
  isOpen,
  onClose,
  businessId,
  onSelectMedia,
  onMediaImported,
  slideIndex,
}: StockMediaModalProps) {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState<StockMediaItem[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [isSearching, startSearchTransition] = useTransition()

  const [importingId, setImportingId] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSearch = (searchQuery: string) => {
    const trimmed = searchQuery.trim()
    if (!trimmed) return

    setSearchError(null)
    setImportError(null)

    startSearchTransition(async () => {
      const result = await searchStockMediaAction(trimmed, 1)
      setHasSearched(true)
      if (result.success) {
        setItems(result.result.items)
      } else {
        setSearchError(result.message)
        setItems([])
      }
    })
  }

  const handleSelectSuggestion = (suggestion: string) => {
    setQuery(suggestion)
    handleSearch(suggestion)
  }

  const handleImportAndAssign = async (item: StockMediaItem) => {
    setImportingId(item.externalId)
    setImportError(null)

    try {
      const result = await importStockMediaAction({
        businessId,
        stockItem: item,
      })

      if (result.success) {
        onMediaImported(result.mediaAsset)
        onSelectMedia(result.mediaAsset)
        onClose()
      } else {
        setImportError(result.message)
      }
    } catch {
      setImportError('Une erreur imprévue est survenue lors de l’importation.')
    } finally {
      setImportingId(null)
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-media-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-ink/40 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-cream rounded-2xl shadow-xl border border-cream-border flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-cream-border/80 bg-white/80 shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="stock-media-modal-title"
                className="text-base font-serif font-bold text-ink"
              >
                Photos gratuites
              </h2>
              <span className="text-[10px] font-semibold text-primary bg-primary-light/60 border border-primary-border px-2 py-0.5 rounded-full uppercase tracking-wider">
                Pexels
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              {slideIndex ? `Pour la slide #${slideIndex} • ` : ''}
              Photos d’illustration libres de droits
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-ink-muted hover:text-ink hover:bg-cream-subtle transition-colors"
            aria-label="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Suggestions */}
        <div className="p-4 sm:p-5 bg-cream-subtle/70 border-b border-cream-border/60 space-y-3 shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSearch(query)
            }}
            className="flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-ink-muted absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ex: forêt en automne, brume, nature..."
                className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-cream-border rounded-xl text-xs sm:text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-2xs"
              />
            </div>
            <Button
              type="submit"
              disabled={isSearching || !query.trim()}
              size="sm"
              className="gap-1.5 shrink-0 px-4"
            >
              {isSearching ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Recherche...</span>
                </>
              ) : (
                <>
                  <Search className="w-3.5 h-3.5" />
                  <span>Rechercher</span>
                </>
              )}
            </Button>
          </form>

          {/* Suggestions Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            <span className="text-[11px] text-ink-muted shrink-0 font-medium mr-1">
              Idées :
            </span>
            {SEARCH_SUGGESTIONS.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleSelectSuggestion(suggestion)}
                className="px-2.5 py-1 rounded-full text-[11px] bg-white border border-cream-border text-ink hover:border-primary/40 hover:bg-primary-light/20 transition-colors shrink-0"
              >
                {suggestion}
              </button>
            ))}
          </div>

          {/* Business Authenticity Warning */}
          <div className="flex items-start gap-2 p-2.5 bg-amber-50/70 border border-amber-200/70 rounded-xl text-[11px] text-amber-900 leading-snug">
            <Info className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
            <span>
              <strong>Photos d’illustration :</strong> Utilisez ces images pour évoquer une atmosphère ou des paysages. Ne les présentez pas comme des photos réelles de vos hébergements ou de vos animaux.
            </span>
          </div>
        </div>

        {/* Error Banners */}
        {searchError && (
          <div className="mx-4 sm:mx-5 mt-3 flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{searchError}</span>
          </div>
        )}

        {importError && (
          <div className="mx-4 sm:mx-5 mt-3 flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{importError}</span>
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 min-h-[260px]">
          {isSearching ? (
            <div className="flex flex-col items-center justify-center h-48 gap-2 text-ink-muted">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">Recherche de photos sur Pexels...</p>
            </div>
          ) : !hasSearched ? (
            <div className="flex flex-col items-center justify-center h-48 text-center p-6 text-ink-muted space-y-2">
              <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center text-primary">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-xs sm:text-sm font-medium text-ink">
                Trouvez de superbes photos d’ambiance
              </p>
              <p className="text-xs text-ink-muted max-w-sm">
                Saisissez un mot-clé ou cliquez sur une suggestion ci-dessus pour lancer une recherche gratuite.
              </p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-center p-6 text-ink-muted space-y-1.5">
              <p className="text-xs sm:text-sm font-medium text-ink">
                Aucun résultat pour « {query} »
              </p>
              <p className="text-xs text-ink-muted">
                Essayez d’autres termes (ex: « nature », « automne », « forêt »).
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {items.map((item) => {
                const isImporting = importingId === item.externalId

                return (
                  <div
                    key={item.externalId}
                    className="group relative rounded-2xl overflow-hidden border border-cream-border bg-white hover:border-primary/40 hover:shadow-sm transition-all flex flex-col"
                  >
                    {/* Image Preview */}
                    <div className="relative aspect-4/3 overflow-hidden bg-cream-subtle">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.previewUrl}
                        alt={item.altDescription || 'Photo Pexels'}
                        className="w-full h-full object-cover transition-transform group-hover:scale-102"
                        loading="lazy"
                      />

                      <span className="absolute top-2 left-2 text-[9px] font-medium bg-ink/70 text-white px-2 py-0.5 rounded-full backdrop-blur-xs">
                        Illustration
                      </span>
                    </div>

                    {/* Meta & Photographer Attribution */}
                    <div className="p-2.5 flex flex-col justify-between flex-1 gap-2">
                      <div className="min-w-0">
                        <a
                          href={item.creatorUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-ink hover:text-primary font-medium truncate w-full group/link"
                          title={`Voir le profil de ${item.creatorName} sur Pexels`}
                        >
                          <span className="truncate">{item.creatorName}</span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0 group-hover/link:opacity-100" />
                        </a>
                        <a
                          href={item.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-ink-muted hover:text-primary truncate block"
                          title="Voir sur Pexels"
                        >
                          sur Pexels
                        </a>
                      </div>

                      {/* Select CTA */}
                      <button
                        type="button"
                        onClick={() => handleImportAndAssign(item)}
                        disabled={Boolean(importingId)}
                        className="w-full py-1.5 px-2 bg-primary text-white rounded-xl text-xs font-medium hover:bg-primary-hover transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {isImporting ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Import...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Choisir</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:px-5 bg-white border-t border-cream-border/80 flex items-center justify-between text-[11px] text-ink-muted shrink-0">
          <span>
            Photos fournies gratuitement par{' '}
            <a
              href="https://www.pexels.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              Pexels
            </a>
          </span>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-xs">
            Annuler
          </Button>
        </div>
      </div>
    </div>
  )
}
