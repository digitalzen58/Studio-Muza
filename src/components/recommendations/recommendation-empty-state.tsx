'use client'

import React, { useState } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { MuzaSymbol } from '@/components/ui/muza-symbol'
import { BrandGreetingHero } from './brand-visual-hero'
import { DraftContentsSection, type DraftContentSummary } from '@/components/studio/draft-contents-section'
import { CreationChooserModal } from '@/components/studio/creation-chooser-modal'
import type { StrategicContext } from './recommendation-section'

interface RecommendationEmptyStateProps {
  onGenerate: () => void
  isPending: boolean
  strategicContext: StrategicContext
  draftContents?: DraftContentSummary[]
}

/**
 * Creative Studio Visual Empty State for Mūza Home before recommendation generation.
 * Features immediate greeting & objective, prominent create action, prominent first-generation CTA,
 * and format previews below.
 */
export function RecommendationEmptyState({
  onGenerate,
  isPending,
  strategicContext,
  draftContents,
}: RecommendationEmptyStateProps) {
  const [chooserOpen, setChooserOpen] = useState(false)
  const goalContext = strategicContext.goalTitle
    ? strategicContext.goalTitle.toLowerCase()
    : "remplir vos séjours d’automne"

  const media = strategicContext.mediaAssets || []
  const reelAsset = media.length > 0 ? media[0] : null
  const carouselAsset = media.length > 1 ? media[1] : reelAsset
  const storyAsset = media.length > 2 ? media[2] : reelAsset

  return (
    <>
      <div className="flex flex-col gap-5 w-full max-w-5xl lg:max-w-6xl mx-auto py-1">
        {/* 1. TOP / HERO - Greeting & Business Headline */}
        <BrandGreetingHero
          context={strategicContext}
          onOpenCreate={() => setChooserOpen(true)}
        />

        {/* 2. LOWER HERO ROW: WEEKLY OBJECTIVE + PRIMARY CREATE CTA */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-0.5 pb-1">
          {/* Objective Chip */}
          <div className="flex justify-center md:justify-start">
            <div className="inline-flex items-center gap-2 bg-primary-light/70 border border-primary-border/60 px-3.5 py-1.5 rounded-full text-[11px] font-semibold text-primary-dark shadow-2xs text-center md:text-left">
              <MuzaSymbol size="sm" />
              <span>Cette semaine, Mūza vous aide à {goalContext}.</span>
            </div>
          </div>

          {/* Primary Create Action */}
          <div className="flex justify-center md:justify-end">
            <Button
              variant="primary"
              size="lg"
              onClick={() => setChooserOpen(true)}
              className="w-full sm:w-auto min-w-[220px] md:min-w-[190px] min-h-[48px] md:min-h-[44px] py-3 md:py-2.5 px-6 md:px-5 text-sm md:text-base font-semibold shadow-md hover:shadow-lg bg-primary hover:bg-primary-hover text-white rounded-2xl gap-2 transition-all transform active:scale-[0.98] cursor-pointer"
              aria-label="Créer un nouveau contenu"
            >
              <Plus className="w-4 h-4 md:w-5 md:h-5 text-white" />
              <span>Créer un contenu</span>
            </Button>
          </div>
        </div>

        {/* 2.5 ACTIVE DRAFTS AREA (VOS BROUILLONS EN COURS) */}
        {draftContents && draftContents.length > 0 && (
          <DraftContentsSection drafts={draftContents} />
        )}

      {/* 3. PRIMARY GENERATION CTA CARD (PROMINENT ABOVE-THE-FOLD) */}
      <div className="relative w-full rounded-2xl bg-white border border-cream-border p-5 text-center overflow-hidden shadow-2xs flex flex-col items-center gap-3">
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-b from-transparent via-primary-light/15 to-transparent pointer-events-none"
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
          <span className="text-[11px] text-primary-dark/80 font-medium tracking-tight">
            Une sélection sur mesure de 3 à 5 idées
          </span>
        </div>
      </div>

      {/* 4. VISUAL CREATIVE DESK / BRAND CONTENT PREVIEWS */}
      <div className="relative w-full rounded-2xl bg-white border border-cream-border p-4 text-center overflow-hidden shadow-2xs">
        {/* Background Subtle Accent */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-b from-transparent via-primary-light/15 to-transparent pointer-events-none"
        />

        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold tracking-widest text-ink-muted uppercase">
            <MuzaSymbol size="sm" />
            <span>Aperçus • Votre univers en formats</span>
          </div>

          {/* 3 Visual Format Preview Cards (Level 1: Real Media / Level 2: Brand Identity Templates) */}
          <div className="grid grid-cols-3 gap-2.5 w-full max-w-md my-1">
            {/* Reel Preview */}
            <div className="h-28 sm:h-32 rounded-xl border border-primary-border/60 bg-primary-light/40 p-2 flex flex-col justify-between items-center text-center relative overflow-hidden shadow-2xs">
              {reelAsset ? (
                <>
                  <img src={reelAsset.url} alt={reelAsset.alt} className="absolute inset-0 w-full h-full object-cover" />
                  <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent" />
                  <span className="relative z-10 text-[8px] font-bold text-white uppercase tracking-wider bg-black/40 px-1.5 py-0.5 rounded-full">
                    Reel
                  </span>
                  <div className="relative z-10 my-auto">
                    <span className="w-5 h-5 mx-auto rounded-full bg-primary flex items-center justify-center text-white text-[9px] shadow-xs">
                      ▶
                    </span>
                  </div>
                  <span className="relative z-10 text-[8px] font-medium text-white/90 truncate max-w-full px-1">
                    Votre prochain Reel
                  </span>
                </>
              ) : (
                /* Level 2: Designed Graphic Cover Template */
                <div className="w-full h-full flex flex-col justify-between p-1 relative z-10 bg-linear-to-br from-primary-light via-white to-primary-light/50">
                  <span className="text-[8px] font-bold text-primary uppercase tracking-wider bg-white/80 px-1.5 py-0.5 rounded-full self-center border border-primary-border/30">
                    Gabarit Reel
                  </span>
                  <div className="my-auto">
                    <span className="w-5 h-5 mx-auto rounded-full bg-primary text-white flex items-center justify-center text-[9px] shadow-xs mb-1">
                      ▶
                    </span>
                    <p className="font-serif text-[9px] font-bold text-ink leading-tight line-clamp-1 italic">
                      « {strategicContext.businessName} »
                    </p>
                  </div>
                  <span className="text-[8px] text-primary-dark font-semibold">Votre prochain Reel</span>
                </div>
              )}
            </div>

            {/* Carousel Preview */}
            <div className="h-28 sm:h-32 rounded-xl border border-cream-border bg-cream-subtle/60 p-2 flex flex-col justify-between items-center text-center relative overflow-hidden shadow-2xs">
              <div className="absolute right-1 top-1 w-full h-full rounded-xl border border-cream-border/60 bg-white/40 transform rotate-2 pointer-events-none -z-10" />
              {carouselAsset ? (
                <>
                  <img src={carouselAsset.url} alt={carouselAsset.alt} className="absolute inset-0 w-full h-full object-cover" />
                  <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
                  <span className="relative z-10 text-[8px] font-bold text-white uppercase tracking-wider bg-black/40 px-1.5 py-0.5 rounded-full">
                    Carrousel 1/3
                  </span>
                  <span className="relative z-10 text-[8px] font-medium text-white/90 truncate max-w-full px-1 my-auto">
                    Votre prochain carrousel
                  </span>
                </>
              ) : (
                /* Level 2: Designed Stacked Graphic Slides Template */
                <div className="w-full h-full flex flex-col justify-between p-1 relative z-10 bg-white">
                  <span className="text-[8px] font-bold text-ink-muted uppercase tracking-wider bg-cream-subtle px-1.5 py-0.5 rounded-full self-center border border-cream-border">
                    Carrousel 1/3
                  </span>
                  <div className="my-auto px-0.5">
                    <p className="font-serif text-[9px] font-bold text-ink leading-tight line-clamp-2">
                      Slide 1 • Modèle Marque
                    </p>
                  </div>
                  <span className="text-[8px] text-primary font-semibold">Votre carrousel ➔</span>
                </div>
              )}
            </div>

            {/* Story Preview */}
            <div className="h-28 sm:h-32 rounded-xl border border-blue-200 bg-blue-50/30 p-2 flex flex-col justify-between items-center text-center relative overflow-hidden shadow-2xs">
              {storyAsset ? (
                <>
                  <img src={storyAsset.url} alt={storyAsset.alt} className="absolute inset-0 w-full h-full object-cover" />
                  <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-black/30" />
                  <span className="relative z-10 text-[8px] font-bold text-white uppercase tracking-wider bg-primary px-1.5 py-0.5 rounded-full">
                    Story
                  </span>
                  <span className="relative z-10 text-[8px] font-medium text-white/90 truncate max-w-full px-1 my-auto">
                    Votre prochaine Story
                  </span>
                </>
              ) : (
                /* Level 2: Designed Editorial Story Template */
                <div className="w-full h-full flex flex-col justify-between p-1 relative z-10 bg-linear-to-b from-blue-50/50 to-primary-light/40">
                  <span className="text-[8px] font-bold text-primary uppercase tracking-wider bg-white/80 px-1.5 py-0.5 rounded-full self-center border border-primary-border/40">
                    Format Story
                  </span>
                  <div className="my-auto px-0.5">
                    <p className="font-serif text-[9px] font-bold text-ink leading-tight italic">
                      ✦ Story Frame
                    </p>
                    <span className="text-[7px] text-primary bg-white px-1 py-0.2 rounded-full inline-block mt-0.5 font-semibold border border-primary-border/30">
                      Sticker
                    </span>
                  </div>
                  <span className="text-[8px] text-primary-dark font-semibold">Votre Story</span>
                </div>
              )}
            </div>
          </div>

          {/* ZERO-MEDIA ONBOARDING NUDGE */}
          {media.length === 0 && (
            <div className="w-full bg-cream-subtle/90 border border-cream-border/80 rounded-xl p-3 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-left my-1">
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

    {/* Creation Chooser Modal */}
    <CreationChooserModal
      isOpen={chooserOpen}
      onClose={() => setChooserOpen(false)}
    />
  </>
  )
}
