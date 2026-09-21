'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { MuzaSymbol } from '@/components/ui/muza-symbol'

/**
 * Animated Visual Loading State for Mūza Recommendation Generation.
 * Animates visual format skeletons (Reels, Stories, Posts) calmly without fake progress bars or percentages.
 */
export function RecommendationLoading() {
  return (
    <Card
      variant="accent"
      aria-live="polite"
      aria-busy="true"
      className="flex flex-col items-center text-center py-8 px-5 gap-5 border-terracotta-border/40 bg-terracotta-light/70 max-w-xl mx-auto"
    >
      <div className="p-3 bg-ivory/90 rounded-full shadow-xs border border-terracotta-border/40 animate-pulse">
        <MuzaSymbol size="lg" />
      </div>

      <div className="flex flex-col gap-1 max-w-xs">
        <h3 className="font-serif text-2xl text-terracotta-dark font-medium">
          Mūza réfléchit…
        </h3>
        <p className="text-xs text-ink/80 leading-relaxed font-normal">
          Mūza compose les meilleures idées visuelles pour votre activité et votre objectif.
        </p>
      </div>

      {/* Visual Animated Format Placeholders Skeleton */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm pt-2">
        {/* Animated Reel Frame */}
        <div className="h-28 rounded-xl bg-terracotta-light border border-terracotta-border/60 p-2 flex flex-col justify-between items-center animate-pulse">
          <div className="w-10 h-2 bg-terracotta/20 rounded-full" />
          <div className="w-6 h-6 rounded-full bg-terracotta/30" />
          <div className="w-12 h-2 bg-terracotta/20 rounded-full" />
        </div>

        {/* Animated Carousel Frame */}
        <div className="h-28 rounded-xl bg-ivory-card border border-ivory-border/80 p-2 flex flex-col justify-between items-center animate-pulse delay-150">
          <div className="w-12 h-2 bg-ink/10 rounded-full" />
          <div className="w-8 h-8 rounded-md bg-ink/10" />
          <div className="w-10 h-2 bg-ink/10 rounded-full" />
        </div>

        {/* Animated Story Frame */}
        <div className="h-28 rounded-xl bg-rose-50/60 border border-rose-200/80 p-2 flex flex-col justify-between items-center animate-pulse delay-300">
          <div className="w-10 h-2 bg-rose-300/40 rounded-full" />
          <div className="w-6 h-6 rounded-full bg-rose-300/40" />
          <div className="w-12 h-2 bg-rose-300/40 rounded-full" />
        </div>
      </div>
    </Card>
  )
}
