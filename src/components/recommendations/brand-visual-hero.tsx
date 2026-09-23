import React from 'react'
import { Badge } from '@/components/ui/badge'
import { MuzaSymbol } from '@/components/ui/muza-symbol'
import type { StrategicContext } from './recommendation-section'

interface BrandGreetingHeroProps {
  context: StrategicContext
  onOpenCreate?: () => void
}

export interface BrandVisualHeroProps {
  context: StrategicContext
}

/**
 * Greeting and Headline Header for Studio Mūza Home.
 * Displays greeting, business name, industry badge, and main editorial headline.
 */
export function BrandGreetingHero({ context }: BrandGreetingHeroProps) {
  const greeting = context.firstName ? `Bonjour ${context.firstName}` : 'Bonjour'

  return (
    <div className="flex flex-col gap-2.5 w-full py-1">
      {/* Top Greeting & Business Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-ink">
            {greeting}
          </h1>
          <Badge variant="primary" showSymbol className="text-[11px] py-0.5 px-2.5">
            {context.businessName}
          </Badge>
        </div>
      </div>

      {/* Main Editorial Headline - Compact Height */}
      <h2 className="font-serif text-2xl sm:text-3xl lg:text-3.5xl text-ink font-normal leading-tight text-balance max-w-3xl">
        Et si on trouvait quoi raconter{' '}
        <span className="italic text-primary font-serif">cette semaine ?</span>
      </h2>
    </div>
  )
}

/**
 * Editorial Moodboard Visual Showcase Component for Studio Mūza (Studio Visuel).
 * Supports progressive visual enrichment:
 * Level 1: Real brand media assets
 * Level 2: Graphic content templates derived from Brand Identity & Visual Identity
 * Level 3: Studio Mūza foundational visual system
 */
export function BrandVisualHero({ context }: BrandVisualHeroProps) {
  const media = context.mediaAssets || []
  const primaryMedia = media.length > 0 ? media[0] : null
  const secondaryMedia = media.length > 1 ? media[1] : primaryMedia
  const tertiaryMedia = media.length > 2 ? media[2] : primaryMedia

  return (
    <div className="w-full py-1">
      {/* Visual Moodboard Canvas Composition */}
      <div className="relative w-full rounded-2xl bg-white border border-cream-border p-3.5 sm:p-4 overflow-hidden shadow-2xs">
        {/* Soft Organic Background Accent Glow */}
        <div
          aria-hidden="true"
          className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary-light/70 blur-2xl pointer-events-none"
        />

        {/* Moodboard Header Tag */}
        <div className="flex items-center justify-between mb-2 text-[10px] font-bold tracking-widest text-ink-muted uppercase relative z-10">
          <span className="flex items-center gap-1">
            <MuzaSymbol size="sm" /> Studio Visuel • {context.businessName}
          </span>
          <span className="text-primary font-semibold">
            {media.length > 0 ? 'Matière Marque' : 'Gabarits Studio'}
          </span>
        </div>

        {/* Asymmetrical Media Frames Grid */}
        <div className="relative min-h-[150px] sm:min-h-[170px] flex items-center justify-center my-0.5">
          {/* Main Dominant Visual Canvas */}
          <div className="w-full sm:w-[84%] h-36 sm:h-42 rounded-xl border border-primary-border/60 flex flex-col justify-between relative overflow-hidden shadow-2xs bg-linear-to-br from-primary-light via-white to-blue-50/40">
            {primaryMedia ? (
              <>
                <img
                  src={primaryMedia.url}
                  alt={primaryMedia.alt}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-ink/80 via-ink/20 to-transparent" />
                <div className="relative z-10 p-3 flex flex-col justify-between h-full">
                  <span className="self-start text-[9px] font-bold text-white uppercase tracking-wider bg-black/40 backdrop-blur-xs px-2 py-0.5 rounded-full border border-white/20">
                    Matière Marque
                  </span>
                  <div className="text-white">
                    <p className="font-serif text-base sm:text-lg font-medium leading-tight">
                      « {context.businessName} »
                    </p>
                    <span className="text-[10px] text-white/80 block mt-0.5">
                      {context.offerName || 'Univers Visuel'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              /* LEVEL 2 / LEVEL 3: Graphic Content Template Canvas */
              <div className="p-3.5 flex flex-col justify-between h-full relative z-10 bg-linear-to-br from-primary-light/90 via-white to-blue-50/50">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-primary uppercase tracking-wider bg-white/90 backdrop-blur-xs border border-primary-border/50 px-2 py-0.5 rounded-full">
                    ✦ Identity Canvas
                  </span>
                  <span className="text-[9px] font-mono text-ink-muted">
                    {context.offerName || 'Studio Template'}
                  </span>
                </div>

                <div className="my-auto">
                  <p className="font-serif text-lg sm:text-xl font-medium text-ink leading-tight">
                    « {context.businessName} »
                  </p>
                  <p className="text-[10px] text-ink-muted mt-1 italic leading-snug max-w-[240px]">
                    {context.positioning || "Studio Mūza compose votre univers de marque."}
                  </p>
                </div>

                <div className="flex items-center justify-between text-[10px] text-ink-muted font-medium pt-1 border-t border-primary-border/30">
                  <span>Modèle de Studio Visuel</span>
                  <span className="text-primary-dark font-semibold">✦ Mūza Graphic</span>
                </div>
              </div>
            )}
          </div>

          {/* Overlapping Media Fragment 1: Mini Reel Frame */}
          <div className="absolute -left-1 sm:left-1 bottom-0.5 w-22 sm:w-26 h-26 sm:h-30 rounded-xl bg-ink text-white p-2 flex flex-col justify-between shadow-md transform -rotate-[5deg] hover:rotate-0 transition-transform duration-300 border border-white/20 z-20 overflow-hidden">
            {secondaryMedia ? (
              <>
                <img
                  src={secondaryMedia.url}
                  alt={secondaryMedia.alt}
                  className="absolute inset-0 w-full h-full object-cover opacity-80"
                />
                <div aria-hidden="true" className="absolute inset-0 bg-black/40" />
                <div className="relative z-10 flex items-center justify-between text-[8px] font-bold text-primary-light uppercase">
                  <span>Reel</span>
                  <span>0:30</span>
                </div>
                <div className="relative z-10 my-auto text-center">
                  <span className="w-5 h-5 mx-auto rounded-full bg-primary flex items-center justify-center text-white text-[9px] shadow-xs">
                    ▶
                  </span>
                </div>
                <span className="relative z-10 text-[8px] text-white/90 text-center font-semibold truncate">
                  Reel Cover
                </span>
              </>
            ) : (
              /* Level 2/3 Reel Graphic Template */
              <>
                <div className="flex items-center justify-between text-[8px] font-bold text-primary-light uppercase">
                  <span>Reel</span>
                  <span>0:30</span>
                </div>
                <div className="my-auto text-center">
                  <span className="w-5 h-5 mx-auto rounded-full bg-primary flex items-center justify-center text-white text-[9px] shadow-xs">
                    ▶
                  </span>
                  <p className="font-serif text-[9px] font-medium leading-tight mt-1 text-white/90 italic">
                    Gabarit Reel
                  </p>
                </div>
                <span className="text-[8px] text-primary-light text-center font-mono">✦ 9:16</span>
              </>
            )}
          </div>

          {/* Overlapping Media Fragment 2: Mini Story Frame */}
          <div className="absolute -right-1 sm:right-1 top-0.5 w-22 sm:w-26 h-26 sm:h-30 rounded-xl bg-linear-to-b from-primary-light to-white p-2 flex flex-col justify-between shadow-md transform rotate-[4deg] hover:rotate-0 transition-transform duration-300 border-2 border-primary/40 z-20 overflow-hidden">
            {tertiaryMedia ? (
              <>
                <img
                  src={tertiaryMedia.url}
                  alt={tertiaryMedia.alt}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-black/30" />
                <div className="relative z-10 flex items-center gap-1 text-[8px] font-bold text-white uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>Story</span>
                </div>
                <div className="relative z-10 text-[8px] font-bold text-white text-center">
                  ✦ Moment Mūza
                </div>
              </>
            ) : (
              /* Level 2/3 Story Graphic Template */
              <>
                <div className="flex items-center gap-1 text-[8px] font-bold text-primary uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span>Story</span>
                </div>
                <div className="my-auto text-center px-0.5">
                  <p className="font-serif text-[9px] font-semibold text-ink leading-tight italic">
                    {context.businessName}
                  </p>
                  <span className="text-[7px] text-primary bg-white/80 px-1 py-0.2 rounded-full inline-block mt-0.5 font-bold">
                    Interactive
                  </span>
                </div>
                <div className="text-[8px] text-primary-dark font-bold text-center">
                  ✦ Gabarit Story
                </div>
              </>
            )}
          </div>

          {/* Central Decorative Mūza Star Badge */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-base shadow-md border-2 border-white">
              ✦
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export const StudioVisualShowcase = BrandVisualHero
