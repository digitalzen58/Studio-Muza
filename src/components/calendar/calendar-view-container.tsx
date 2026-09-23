'use client'

import React, { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Calendar as CalendarIcon, BookOpen } from 'lucide-react'
import { CalendarAgendaView, type CalendarScheduledItem } from './calendar-agenda-view'
import { PublicationsView } from '@/components/publications/publications-view'
import type { PublicationItem } from '@/services/publication-history/types'

interface CalendarViewContainerProps {
  scheduledItems: CalendarScheduledItem[]
  publicationItems: PublicationItem[]
  businessName: string
  initialView?: 'calendar' | 'publications'
}

export function CalendarViewContainer({
  scheduledItems,
  publicationItems,
  businessName,
  initialView = 'calendar',
}: CalendarViewContainerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const currentViewParam = searchParams.get('view')
  const [activeView, setActiveView] = useState<'calendar' | 'publications'>(
    currentViewParam === 'publications' ? 'publications' : initialView
  )

  const handleSwitchView = (view: 'calendar' | 'publications') => {
    setActiveView(view)
    const params = new URLSearchParams(searchParams.toString())
    if (view === 'publications') {
      params.set('view', 'publications')
    } else {
      params.delete('view')
    }
    const query = params.toString() ? `?${params.toString()}` : ''
    router.replace(`/app/calendar${query}`, { scroll: false })
  }

  const publishedCount = publicationItems.filter((p) => p.status === 'PUBLISHED').length

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary-light flex items-center justify-center text-primary">
              {activeView === 'calendar' ? (
                <CalendarIcon className="w-4 h-4" />
              ) : (
                <BookOpen className="w-4 h-4" />
              )}
            </div>
            <h1 className="text-xl font-serif font-bold text-ink">
              {activeView === 'calendar' ? 'Calendrier éditorial' : 'Publications'}
            </h1>
          </div>
          <p className="text-xs text-ink-muted">
            {activeView === 'calendar'
              ? `Visualisez et gérez vos publications planifiées pour ${businessName}.`
              : `Retrouvez l’historique de ce qui a été publié pour ${businessName}.`}
          </p>
        </div>

        {/* Segmented Switch: [ Calendrier ] [ Publications ] */}
        <div className="flex items-center p-1 bg-white border border-cream-border rounded-xl self-start sm:self-auto shadow-2xs">
          <button
            type="button"
            onClick={() => handleSwitchView('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeView === 'calendar'
                ? 'bg-primary text-white shadow-xs font-semibold'
                : 'text-ink-muted hover:text-ink hover:bg-cream-subtle'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Calendrier</span>
            {scheduledItems.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeView === 'calendar'
                    ? 'bg-white/20 text-white'
                    : 'bg-cream-subtle text-ink-muted'
                }`}
              >
                {scheduledItems.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleSwitchView('publications')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              activeView === 'publications'
                ? 'bg-primary text-white shadow-xs font-semibold'
                : 'text-ink-muted hover:text-ink hover:bg-cream-subtle'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Publications</span>
            {publishedCount > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeView === 'publications'
                    ? 'bg-white/20 text-white'
                    : 'bg-cream-subtle text-ink-muted'
                }`}
              >
                {publishedCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main View Body */}
      {activeView === 'calendar' ? (
        <CalendarAgendaView items={scheduledItems} />
      ) : (
        <PublicationsView items={publicationItems} businessName={businessName} />
      )}
    </div>
  )
}
