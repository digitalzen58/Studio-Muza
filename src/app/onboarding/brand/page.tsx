'use client'

import { useState, useTransition } from 'react'
import { MuzaSymbol } from '@/components/ui/muza-symbol'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { submitBrandAction } from './actions'

export default function OnboardingBrandPage() {
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const res = await submitBrandAction(formData)
      if (res?.error) {
        setErrorMessage(res.error)
      }
    })
  }

  return (
    <div className="min-h-screen bg-ivory text-ink flex flex-col justify-center items-center p-4 md:p-6 max-w-lg mx-auto relative">
      {/* Decorative ambient blur */}
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-terracotta-light rounded-full blur-3xl opacity-50 pointer-events-none" />

      <div className="w-full flex flex-col gap-6 py-6 z-10">
        {/* Brand Header */}
        <div className="flex flex-col gap-2 text-center items-center">
          <div className="inline-flex items-center gap-1.5 text-terracotta font-medium text-xs mb-1">
            <MuzaSymbol size="sm" />
            <span>Étape 2 — Profil de marque</span>
          </div>

          <h1 className="font-serif text-3xl md:text-4xl text-ink leading-tight">
            Quelle personnalité a votre marque ?
          </h1>

          <p className="text-xs text-ink-muted leading-relaxed max-w-md">
            Mūza apprend votre façon de parler pour créer des contenus qui vous ressemblent.
          </p>
        </div>

        {/* Onboarding Form Card */}
        <Card className="flex flex-col gap-5 bg-ivory-card border-ivory-border shadow-xs">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Promesse principale */}
            <div className="flex flex-col gap-1">
              <label htmlFor="promise" className="text-xs font-semibold text-ink uppercase tracking-wider">
                Promesse principale
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-0.5">
                En une phrase, qu’est-ce que vos clients viennent chercher ou obtenir chez vous ?
              </p>
              <input
                id="promise"
                name="promise"
                type="text"
                placeholder="Ex. Des vacances pour chiens. Humains acceptés."
                className="w-full px-3.5 py-2.5 rounded-xl border border-ivory-border bg-white text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
              />
            </div>

            {/* Positionnement */}
            <div className="flex flex-col gap-1">
              <label htmlFor="positioning" className="text-xs font-semibold text-ink uppercase tracking-wider">
                Positionnement
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-0.5">
                Qu’est-ce qui vous rend différent et pour qui votre offre est-elle faite ?
              </p>
              <input
                id="positioning"
                name="positioning"
                type="text"
                placeholder="Ex. Un gîte chaleureux et dog-friendly au cœur du Morvan."
                className="w-full px-3.5 py-2.5 rounded-xl border border-ivory-border bg-white text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
              />
            </div>

            {/* Ton de marque */}
            <div className="flex flex-col gap-1">
              <label htmlFor="toneDescription" className="text-xs font-semibold text-ink uppercase tracking-wider">
                Ton de marque
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-0.5">
                Comment voulez-vous que Mūza s’exprime lorsqu’elle écrit pour vous ?
              </p>
              <input
                id="toneDescription"
                name="toneDescription"
                type="text"
                placeholder="Ex. Chaleureux, complice et humoristique."
                className="w-full px-3.5 py-2.5 rounded-xl border border-ivory-border bg-white text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
              />
            </div>

            {/* Personnalité de marque */}
            <div className="flex flex-col gap-1">
              <label htmlFor="personality" className="text-xs font-semibold text-ink uppercase tracking-wider">
                Personnalité de marque
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-0.5">
                Si votre marque était une personne, quels mots décriraient son caractère ?
              </p>
              <input
                id="personality"
                name="personality"
                type="text"
                placeholder="Ex. Authentique, nature, accueillante, espiègle."
                className="w-full px-3.5 py-2.5 rounded-xl border border-ivory-border bg-white text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
              />
              <span className="text-[10px] text-ink-muted/70 mt-0.5">Séparés par des virgules ou retours à la ligne</span>
            </div>

            {/* Valeurs principales */}
            <div className="flex flex-col gap-1">
              <label htmlFor="values" className="text-xs font-semibold text-ink uppercase tracking-wider">
                Valeurs principales
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-0.5">
                Quels principes sont importants dans votre activité et votre façon d’accueillir vos clients ?
              </p>
              <input
                id="values"
                name="values"
                type="text"
                placeholder="Ex. Accueil des chiens, nature, simplicité, convivialité."
                className="w-full px-3.5 py-2.5 rounded-xl border border-ivory-border bg-white text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
              />
              <span className="text-[10px] text-ink-muted/70 mt-0.5">Séparés par des virgules ou retours à la ligne</span>
            </div>

            {/* Signature / slogan */}
            <div className="flex flex-col gap-1">
              <label htmlFor="signaturePhrases" className="text-xs font-semibold text-ink uppercase tracking-wider">
                Signature / Slogan
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-0.5">
                Une phrase que vous utilisez souvent et que Mūza pourra reconnaître et réutiliser.
              </p>
              <input
                id="signaturePhrases"
                name="signaturePhrases"
                type="text"
                placeholder="Ex. Le gîte où on a le droit de faire des bêtises !"
                className="w-full px-3.5 py-2.5 rounded-xl border border-ivory-border bg-white text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
              />
            </div>

            {/* Mots & expressions préférés */}
            <div className="flex flex-col gap-1">
              <label htmlFor="preferredVocabulary" className="text-xs font-semibold text-ink uppercase tracking-wider">
                Mots & expressions préférés
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-0.5">
                Les mots que vous aimez employer et qui ressemblent à votre univers.
              </p>
              <input
                id="preferredVocabulary"
                name="preferredVocabulary"
                type="text"
                placeholder="Ex. vacances, chiens, Morvan, bêtises."
                className="w-full px-3.5 py-2.5 rounded-xl border border-ivory-border bg-white text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
              />
              <span className="text-[10px] text-ink-muted/70 mt-0.5">Séparés par des virgules ou retours à la ligne</span>
            </div>

            {/* Mots & expressions à éviter */}
            <div className="flex flex-col gap-1">
              <label htmlFor="avoidedVocabulary" className="text-xs font-semibold text-ink uppercase tracking-wider">
                Mots & expressions à éviter
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-0.5">
                Les mots, expressions ou styles que vous ne voulez pas retrouver dans vos contenus.
              </p>
              <input
                id="avoidedVocabulary"
                name="avoidedVocabulary"
                type="text"
                placeholder="Ex. luxe, protocolaire, formel."
                className="w-full px-3.5 py-2.5 rounded-xl border border-ivory-border bg-white text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
              />
              <span className="text-[10px] text-ink-muted/70 mt-0.5">Séparés par des virgules ou retours à la ligne</span>
            </div>

            {/* Histoire & Notes de communication */}
            <div className="flex flex-col gap-1">
              <label htmlFor="story" className="text-xs font-semibold text-ink uppercase tracking-wider">
                Histoire & Notes de communication
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-0.5">
                Ajoutez ici ce que Mūza devrait connaître pour mieux raconter votre histoire et parler comme vous.
              </p>
              <textarea
                id="story"
                name="story"
                rows={3}
                placeholder="Ex. L’histoire du lieu, une anecdote, vos habitudes, ce qui compte particulièrement pour vous…"
                className="w-full px-3.5 py-2.5 rounded-xl border border-ivory-border bg-white text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all resize-none"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex flex-col gap-3">
              <Button type="submit" variant="primary" size="lg" fullWidth disabled={isPending}>
                {isPending ? 'Enregistrement...' : 'Continuer ✦'}
              </Button>

              <p className="text-center text-xs text-ink-muted/80 italic">
                Vous pourrez modifier tout cela plus tard.
              </p>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
