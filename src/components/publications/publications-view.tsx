'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { Calendar, CheckCircle2, AlertCircle, Plus } from 'lucide-react'
import type { PublicationItem, PublicationFilter } from '@/services/publication-history/types'
import { PublicationCard } from './publication-card'
import { PublicationDetailModal } from './publication-detail-modal'

interface PublicationsViewProps {
  items: PublicationItem[]
  businessName: string
}

export function PublicationsView({ items, businessName }: PublicationsViewProps) {
  const [activeFilter, setActiveFilter] = useState<PublicationFilter>('PUBLISHED')
  const [selectedItem, setSelectedItem] = useState<PublicationItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Filter items based on active tab
  const publishedItems = items.filter((i) => i.status === 'PUBLISHED')
  const upcomingItems = items.filter((i) => i.status === 'SCHEDULED')
  const failedItems = items.filter((i) => i.status === 'FAILED')

  const currentList =
    activeFilter === 'PUBLISHED'
      ? publishedItems
      : activeFilter === 'SCHEDULED'
      ? upcomingItems
      : failedItems

  const handleOpenDetail = (item: PublicationItem) => {
    setSelectedItem(item)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-5">
      {/* Sub-Header & Explanation */}
      <div className="space-y-1">
        <p className="text-xs text-ink-muted leading-relaxed">
          Retrouvez ici ce qui a été publié pour votre activité.
        </p>
      </div>

      {/* Filter Tabs: [ Publiées ] [ À venir ] [ Échec ] */}
      <div className="flex items-center gap-1.5 p-1 bg-white border border-cream-border rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveFilter('PUBLISHED')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeFilter === 'PUBLISHED'
              ? 'bg-primary text-white shadow-xs font-semibold'
              : 'text-ink-muted hover:text-ink hover:bg-cream-subtle'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Publiées</span>
          {publishedItems.length > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeFilter === 'PUBLISHED'
                  ? 'bg-white/20 text-white'
                  : 'bg-cream text-ink-muted'
              }`}
            >
              {publishedItems.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('SCHEDULED')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeFilter === 'SCHEDULED'
              ? 'bg-primary text-white shadow-xs font-semibold'
              : 'text-ink-muted hover:text-ink hover:bg-cream-subtle'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>À venir</span>
          {upcomingItems.length > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeFilter === 'SCHEDULED'
                  ? 'bg-white/20 text-white'
                  : 'bg-cream text-ink-muted'
              }`}
            >
              {upcomingItems.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('FAILED')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
            activeFilter === 'FAILED'
              ? 'bg-primary text-white shadow-xs font-semibold'
              : 'text-ink-muted hover:text-ink hover:bg-cream-subtle'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Échec</span>
          {failedItems.length > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeFilter === 'FAILED'
                  ? 'bg-white/20 text-white'
                  : 'bg-rose-100 text-rose-700'
              }`}
            >
              {failedItems.length}
            </span>
          )}
        </button>
      </div>

      {/* Content List or Empty State */}
      {currentList.length > 0 ? (
        <div className="flex flex-col gap-3 w-full">
          {currentList.map((item) => (
            <PublicationCard
              key={item.id}
              item={item}
              onView={handleOpenDetail}
            />
          ))}
        </div>
      ) : (
        /* Friendly Empty States */
        <div className="bg-white border border-cream-border rounded-2xl p-8 text-center space-y-4 shadow-2xs">
          {activeFilter === 'PUBLISHED' && (
            <>
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="text-base font-serif font-bold text-ink">
                  Aucune publication pour le moment.
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Vos publications apparaîtront ici une fois publiées.
                </p>
              </div>
            </>
          )}

          {activeFilter === 'SCHEDULED' && (
            <>
              <div className="w-12 h-12 rounded-full bg-primary-light text-primary flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="text-base font-serif font-bold text-ink">
                  Rien de prévu pour le moment.
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Finalisez un contenu ou planifiez une idée pour la retrouver ici.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/app"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary-hover transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Planifier un contenu</span>
                </Link>
              </div>
            </>
          )}

          {activeFilter === 'FAILED' && (
            <>
              <div className="w-12 h-12 rounded-full bg-cream-subtle text-ink-muted flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div className="space-y-1 max-w-sm mx-auto">
                <h3 className="text-base font-serif font-bold text-ink">
                  Aucun problème de publication.
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Tout fonctionne normalement pour {businessName}.
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Publication Detail Modal */}
      <PublicationDetailModal
        item={selectedItem}
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  )
}
