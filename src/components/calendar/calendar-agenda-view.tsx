'use client'

import React from 'react'
import Link from 'next/link'
import { Calendar, Clock, ArrowRight, Sparkles, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface CalendarScheduledItem {
  id: string
  contentId: string
  title: string
  hook?: string | null
  platform: string
  format: string
  scheduledAt: string
  status: string
  coverMediaUrl?: string | null
  coverMediaAlt?: string | null
}

interface CalendarAgendaViewProps {
  items: CalendarScheduledItem[]
}

function formatScheduleTime(isoString: string): string {
  try {
    const d = new Date(isoString)
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d)
  } catch {
    return ''
  }
}

function formatGroupDate(isoString: string): string {
  try {
    const target = new Date(isoString)
    const now = new Date()

    const isToday =
      target.getDate() === now.getDate() &&
      target.getMonth() === now.getMonth() &&
      target.getFullYear() === now.getFullYear()

    const tomorrow = new Date(now)
    tomorrow.setDate(now.getDate() + 1)
    const isTomorrow =
      target.getDate() === tomorrow.getDate() &&
      target.getMonth() === tomorrow.getMonth() &&
      target.getFullYear() === tomorrow.getFullYear()

    if (isToday) return "Aujourd'hui"
    if (isTomorrow) return 'Demain'

    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(target)
  } catch {
    return 'Date inconnue'
  }
}

export function CalendarAgendaView({ items }: CalendarAgendaViewProps) {
  if (!items || items.length === 0) {
    return (
      <div className="bg-white border border-cream-border rounded-2xl p-8 text-center space-y-4 shadow-2xs">
        <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center mx-auto text-primary">
          <Calendar className="w-6 h-6" />
        </div>
        <div className="space-y-1 max-w-sm mx-auto">
          <h3 className="text-base font-serif font-bold text-ink">
            Aucun contenu planifié
          </h3>
          <p className="text-xs text-ink-muted leading-relaxed">
            Finalisez un brouillon depuis vos idées recommandées pour le planifier dans votre calendrier.
          </p>
        </div>
        <div className="pt-2">
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-primary text-white hover:bg-primary-hover transition-colors shadow-xs"
          >
            <span>Voir mes contenus</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    )
  }

  // Group items by day
  const grouped = items.reduce<Record<string, CalendarScheduledItem[]>>((acc, item) => {
    const dateKey = item.scheduledAt ? item.scheduledAt.slice(0, 10) : 'unknown'
    if (!acc[dateKey]) acc[dateKey] = []
    acc[dateKey].push(item)
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([dateKey, dayItems]) => {
        const dateLabel = dayItems[0]?.scheduledAt
          ? formatGroupDate(dayItems[0].scheduledAt)
          : dateKey

        return (
          <div key={dateKey} className="space-y-3">
            {/* Day Header */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-serif font-bold text-ink capitalize">
                {dateLabel}
              </span>
              <div className="h-px flex-1 bg-cream-border/60" />
            </div>

            {/* Items */}
            <div className="space-y-2.5">
              {dayItems.map((item) => {
                const timeStr = formatScheduleTime(item.scheduledAt)
                const isPublished = item.status === 'PUBLISHED'

                return (
                  <Link
                    key={item.id}
                    href={`/app/content/${item.contentId}`}
                    className="block bg-white border border-cream-border hover:border-primary/40 rounded-2xl p-4 transition-all shadow-2xs hover:shadow-xs group"
                  >
                    <div className="flex items-start gap-3">
                      {/* Thumbnail or Icon */}
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-cream-subtle border border-cream-border shrink-0 flex items-center justify-center">
                        {item.coverMediaUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.coverMediaUrl}
                            alt={item.coverMediaAlt || item.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                        ) : (
                          <Sparkles className="w-5 h-5 text-primary/40" />
                        )}
                      </div>

                      {/* Content details */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                            <Clock className="w-3 h-3 text-primary" />
                            <span>{timeStr}</span>
                          </span>

                          <Badge
                            variant={isPublished ? 'secondary' : 'primary'}
                            className={`text-[10px] px-2 py-0.2 ${
                              isPublished ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : ''
                            }`}
                          >
                            {isPublished ? 'Publié' : 'Planifié'}
                          </Badge>

                          <span className="text-[10px] text-ink-muted">
                            {item.platform} · {item.format}
                          </span>
                        </div>

                        <h4 className="text-sm font-semibold text-ink line-clamp-1 group-hover:text-primary transition-colors">
                          {item.title}
                        </h4>

                        {item.hook && (
                          <p className="text-xs text-ink-muted line-clamp-1 italic">
                            « {item.hook} »
                          </p>
                        )}
                      </div>

                      {/* Arrow */}
                      <div className="self-center pl-1 text-ink-muted/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
