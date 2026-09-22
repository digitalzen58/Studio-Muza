'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { MuzaSymbol } from '@/components/ui/muza-symbol'
import { BrandGreetingHero } from './brand-visual-hero'
import { DraftContentsSection, type DraftContentSummary } from '@/components/studio/draft-contents-section'
import type { StrategicContext } from './recommendation-section'

interface RecommendationEmptyStateProps {
  onGenerate: () => void
  isPending: boolean
  strategicContext: StrategicContext
  draftContents?: DraftContentSummary[]
}

/**
 * Creative Studio Visual Empty State for Mūza Home before recommendation generation.
 * Features immediate greeting & objective, prominent first-generation CTA above-the-fold,
 * and format previews below.
 */
export function RecommendationEmptyState({
  onGenerate,
  isPending,
  strategicContext,
  draftContents,
}: RecommendationEmptyStateProps) {
  const goalContext = strategicContext.goalTitle
    ? strategicContext.goalTitle.toLowerCase()
    : "remplir vos séjours d’automne"

  const media = strategicContext.mediaAssets || []
  const reelAsset = media.length > 0 ? media[0] : null
  const carouselAsset = media.length > 1 ? media[1] : reelAsset
  const storyAsset = media.length > 2 ? media[2] : reelAsset

  return (
    <div className="flex flex-col gap-4 w-full max-w-xl mx-auto py-1">
      {/* 1. TOP / HERO - Greeting & Business Headline */}
      <BrandGreetingHero context={strategicContext} />

      {/* 2. SINGLE CONTEXTUAL CHIP */}
      <div className="w-full flex justify-center">
        <div className="inline-flex items-center gap-2 bg-terracotta-light/70 border border-terracotta-border/60 px-3.5 py-1.5 rounded-full text-[11px] font-semibold text-terracotta-dark shadow-2xs text-center">
          <MuzaSymbol size="sm" />
          <span>Cette semaine, Mūza vous aide à {goalContext}.</span>
        </div>
      </div>

      {/* 2.5 ACTIVE DRAFTS AREA (VOS BROUILLONS EN COURS) */}
      {draftContents && draftContents.length > 0 && (
        <DraftContentsSection drafts={draftContents} />
      )}

      {/* 3. PRIMARY GENERATION CTA CARD (PROMINENT ABOVE-THE-FOLD) */}
      <div className="relative w-full rounded-2xl bg-ivory-card border border-ivory-border/80 p-5 text-center overflow-hidden shadow-xs flex flex-col items-center gap-3">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-transparent via-terracotta-light/15 to-transparent pointer-events-none"
        />

        <div className="relative z-10 flex flex-col items-center gap-1.5 max-w-sm">
          <p className="font-serif text-xl sm:text-2xl font-bold text-ink leading-snug">
            Mūza prépare votre première sélection d’idées sur mesure.
          </p>
          <p className="text-xs text-ink-muted leading-relaxed">
            En un instant, Mūza compose une première sélection d’idées visuelles pensées spécifiquement pour votre activité et votre objectif.
          </p>
        </div>

        <div className="flex flex-col items-center gap-2 w-full max-w-xs sm:max-w-sm mx-auto pt-1 relative z-10">
          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={onGenerate}
            disabled={isPending}
            className="min-h-[46px] py-3 px-6 text-base shadow-md font-medium tracking-wide hover:shadow-lg transform transition-all duration-200 active:scale-[0.98]"
          >
            <span>Créer mes premières idées</span>
            <span className="ml-2 text-white text-lg">✦</span>
          </Button>
          <span className="text-[11px] text-terracotta-dark/80 font-medium tracking-tight">
            Une sélection sur mesure de 3 à 5 idées
          </span>
        </div>
      </div>

      {/* 4. VISUAL CREATIVE DESK / BRAND CONTENT PREVIEWS */}
      <div className="relative w-full rounded-2xl bg-ivory-card border border-ivory-border/80 p-4 text-center overflow-hidden shadow-xs">
        {/* Background Subtle Accent */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-transparent via-terracotta-light/15 to-transparent pointer-events-none"
        />

        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-ink-muted uppercase">
            <MuzaSymbol size="sm" />
            <span>Aperçus • Votre univers en formats</span>
          </div>

          {/* 3 Visual Format Preview Cards (Level 1: Real Media / Level 2: Brand Identity Templates) */}
          <div className="grid grid-cols-3 gap-2.5 w-full max-w-md my-1">
            {/* Reel Preview */}
            <div className="h-28 sm:h-32 rounded-xl border border-terracotta-border/60 bg-terracotta-light/40 p-2 flex flex-col justify-between items-center text-center relative overflow-hidden shadow-xs">
              {reelAsset ? (
                <>
                  <img src={reelAsset.url} alt={reelAsset.alt} className="absolute inset-0 w-full h-full object-cover" />
                  <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                  <span className="relative z-10 text-[8px] font-bold text-white uppercase tracking-wider bg-black/40 px-1.5 py-0.5 rounded-full">
                    Reel
                  </span>
                  <div className="relative z-10 my-auto">
                    <span className="w-5 h-5 mx-auto rounded-full bg-terracotta flex items-center justify-center text-white text-[9px] shadow-xs">
                      ▶
                    </span>
                  </div>
                  <span className="relative z-10 text-[8px] font-medium text-white/90 truncate max-w-full px-1">
                    Votre prochain Reel
                  </span>
                </>
              ) : (
                /* Level 2: Designed Graphic Cover Template */
                <div className="w-full h-full flex flex-col justify-between p-1 relative z-10 bg-gradient-to-br from-terracotta-light via-ivory-card to-terracotta-light/50">
                  <span className="text-[8px] font-bold text-terracotta uppercase tracking-wider bg-white/80 px-1.5 py-0.5 rounded-full self-center border border-terracotta-border/30">
                    Gabarit Reel
                  </span>
                  <div className="my-auto">
                    <span className="w-5 h-5 mx-auto rounded-full bg-terracotta text-white flex items-center justify-center text-[9px] shadow-xs mb-1">
                      ▶
                    </span>
                    <p className="font-serif text-[9px] font-bold text-ink leading-tight line-clamp-1 italic">
                      « {strategicContext.businessName} »
                    </p>
                  </div>
                  <span className="text-[8px] text-terracotta-dark font-semibold">Votre prochain Reel</span>
                </div>
              )}
            </div>

            {/* Carousel Preview */}
            <div className="h-28 sm:h-32 rounded-xl border border-ivory-border bg-ivory-subtle/60 p-2 flex flex-col justify-between items-center text-center relative overflow-hidden shadow-xs">
              <div className="absolute right-1 top-1 w-full h-full rounded-xl border border-ivory-border/60 bg-white/40 transform rotate-2 pointer-events-none -z-10" />
              {carouselAsset ? (
                <>
                  <img src={carouselAsset.url} alt={carouselAsset.alt} className="absolute inset-0 w-full h-full object-cover" />
                  <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <span className="relative z-10 text-[8px] font-bold text-white uppercase tracking-wider bg-black/40 px-1.5 py-0.5 rounded-full">
                    Carrousel 1/3
                  </span>
                  <span className="relative z-10 text-[8px] font-medium text-white/90 truncate max-w-full px-1 my-auto">
                    Votre prochain carrousel
                  </span>
                </>
              ) : (
                /* Level 2: Designed Stacked Graphic Slides Template */
                <div className="w-full h-full flex flex-col justify-between p-1 relative z-10 bg-ivory-card">
                  <span className="text-[8px] font-bold text-ink-muted uppercase tracking-wider bg-ivory-subtle px-1.5 py-0.5 rounded-full self-center border border-ivory-border">
                    Carrousel 1/3
                  </span>
                  <div className="my-auto px-0.5">
                    <p className="font-serif text-[9px] font-bold text-ink leading-tight line-clamp-2">
                      Slide 1 • Modèle Marque
                    </p>
                  </div>
                  <span className="text-[8px] text-terracotta font-semibold">Votre carrousel ➔</span>
                </div>
              )}
            </div>

            {/* Story Preview */}
            <div className="h-28 sm:h-32 rounded-xl border border-rose-200 bg-rose-50/30 p-2 flex flex-col justify-between items-center text-center relative overflow-hidden shadow-xs">
              {storyAsset ? (
                <>
                  <img src={storyAsset.url} alt={storyAsset.alt} className="absolute inset-0 w-full h-full object-cover" />
                  <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
                  <span className="relative z-10 text-[8px] font-bold text-white uppercase tracking-wider bg-terracotta px-1.5 py-0.5 rounded-full">
                    Story
                  </span>
                  <span className="relative z-10 text-[8px] font-medium text-white/90 truncate max-w-full px-1 my-auto">
                    Votre prochaine Story
                  </span>
                </>
              ) : (
                /* Level 2: Designed Editorial Story Template */
                <div className="w-full h-full flex flex-col justify-between p-1 relative z-10 bg-gradient-to-b from-rose-50 to-terracotta-light/40">
                  <span className="text-[8px] font-bold text-rose-700 uppercase tracking-wider bg-white/80 px-1.5 py-0.5 rounded-full self-center border border-rose-200">
                    Format Story
                  </span>
                  <div className="my-auto px-0.5">
                    <p className="font-serif text-[9px] font-bold text-ink leading-tight italic">
                      ✦ Story Frame
                    </p>
                    <span className="text-[7px] text-terracotta bg-white px-1 py-0.2 rounded-full inline-block mt-0.5 font-semibold border border-terracotta-border/30">
                      Sticker
                    </span>
                  </div>
                  <span className="text-[8px] text-rose-800 font-semibold">Votre Story</span>
                </div>
              )}
            </div>
          </div>

          {/* ZERO-MEDIA ONBOARDING NUDGE */}
          {media.length === 0 && (
            <div className="w-full bg-ivory-subtle/90 border border-ivory-border/80 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-left my-1">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <MuzaSymbol size="sm" /> Votre studio manque encore un peu de vous.
                </span>
                <p className="text-[11px] text-ink-muted leading-relaxed">
                  Ajoutez quelques photos ou vidéos pour que Mūza puisse imaginer des contenus qui vous ressemblent encore davantage.
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                disabled
                title="Fonctionnalité d'ajout de médias à venir"
                className="shrink-0 text-xs min-h-[36px] font-medium"
              >
                Ajouter mes médias
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
