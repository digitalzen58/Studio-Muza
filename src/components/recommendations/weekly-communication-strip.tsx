'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { MuzaSymbol } from '@/components/ui/muza-symbol'

interface DaySlot {
  day: string
  format: string | null
  platform: string | null
  isAddState?: boolean
}

const WEEK_DAYS: DaySlot[] = [
  { day: 'Lun', format: 'Reel', platform: 'Instagram' },
  { day: 'Mar', format: null, platform: null },
  { day: 'Mer', format: 'Post', platform: 'Facebook' },
  { day: 'Jeu', format: null, platform: null, isAddState: true },
  { day: 'Ven', format: 'Story', platform: 'Instagram' },
  { day: 'Sam', format: null, platform: null, isAddState: true },
  { day: 'Dim', format: null, platform: null, isAddState: true },
]

/**
 * Compact Weekly Communication Strip Component for Studio Mūza.
 * Visual preview of the upcoming weekly publishing rhythm.
 */
export function WeeklyCommunicationStrip() {
  return (
    <Card variant="default" className="flex flex-col gap-3 p-4 sm:p-5 border-ivory-border/80">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <MuzaSymbol size="sm" />
          <h3 className="font-serif text-lg font-bold text-ink">
            Cette semaine
          </h3>
        </div>
        <span className="text-[11px] font-medium text-ink-muted">
          Aperçu du rythme de publication
        </span>
      </div>

      {/* Days Horizontal Strip */}
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2 pt-1 overflow-x-auto">
        {WEEK_DAYS.map((slot, idx) => (
          <div
            key={idx}
            className={`flex flex-col items-center justify-between p-2 rounded-xl text-center min-w-[42px] transition-all ${
              slot.platform
                ? 'bg-terracotta-light/70 border border-terracotta-border/50 text-terracotta-dark shadow-2xs'
                : slot.isAddState
                ? 'bg-ivory-subtle/70 border border-dashed border-ivory-border/90 text-ink-muted hover:border-terracotta/40'
                : 'bg-ivory-card border border-ivory-border/50 text-ink-muted opacity-60'
            }`}
          >
            <span className="text-[10px] font-bold uppercase tracking-wider">
              {slot.day}
            </span>

            <div className="my-2 flex flex-col items-center min-h-[28px] justify-center">
              {slot.platform ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-terracotta mb-0.5" />
                  <span className="text-[9px] font-semibold text-ink leading-tight line-clamp-1">
                    {slot.platform}
                  </span>
                  <span className="text-[8px] text-terracotta-dark font-medium">
                    {slot.format}
                  </span>
                </>
              ) : slot.isAddState ? (
                <span className="text-xs text-ink-light font-bold hover:text-terracotta transition-colors">
                  +
                </span>
              ) : (
                <span className="text-xs text-ink-light font-normal">—</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
