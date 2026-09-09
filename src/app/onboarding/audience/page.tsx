'use client'

import { useState, useTransition } from 'react'
import { MuzaSymbol } from '@/components/ui/muza-symbol'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { submitAudienceAction } from './actions'

export default function OnboardingAudiencePage() {
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const res = await submitAudienceAction(formData)
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
        {/* Audience Header */}
        <div className="flex flex-col gap-2 text-center items-center">
          <div className="inline-flex items-center gap-1.5 text-terracotta font-medium text-xs mb-1">
            <MuzaSymbol size="sm" />
            <span>Étape 4 — Audience cible</span>
          </div>

          <h1 className="font-serif text-3xl md:text-4xl text-ink leading-tight">
            Qui est votre client idéal ?
          </h1>

          <p className="text-xs text-ink-muted leading-relaxed max-w-md">
            Mūza apprend à connaître vos futurs clients pour leur parler avec les bons mots.
          </p>
        </div>

        {/* Form Card */}
        <Card className="flex flex-col gap-5 bg-ivory-card border-ivory-border shadow-xs">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Nom de l'audience */}
            <div className="flex flex-col gap-1">
              <label htmlFor="name" className="text-xs font-semibold text-ink uppercase tracking-wider">
                Nom de l’audience *
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-0.5">
                Donnez un nom simple à ce type de client pour que Mūza puisse le reconnaître.
              </p>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Ex. Couples urbains avec chien"
                className="w-full px-3.5 py-2.5 rounded-xl border border-ivory-border bg-white text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
              />
            </div>

            {/* Qui sont-ils ? */}
            <div className="flex flex-col gap-1">
              <label htmlFor="description" className="text-xs font-semibold text-ink uppercase tracking-wider">
                Qui sont-ils ?
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-0.5">
                Décrivez simplement les personnes que vous souhaitez attirer.
              </p>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Ex. Couples de 30 à 55 ans vivant en ville, qui veulent partir quelques jours dans la nature avec leur chien."
                className="w-full px-3.5 py-2.5 rounded-xl border border-ivory-border bg-white text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all resize-none"
              />
            </div>

            {/* Ce qu'ils recherchent */}
            <div className="flex flex-col gap-1">
              <label htmlFor="needs" className="text-xs font-semibold text-ink uppercase tracking-wider">
                Ce qu’ils recherchent
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-0.5">
                Qu’espèrent-ils trouver lorsqu’ils choisissent une entreprise comme la vôtre ?
              </p>
              <input
                id="needs"
                name="needs"
                type="text"
                placeholder="Ex. Calme, Nature, Déconnexion, Accueil des chiens, Confort"
                className="w-full px-3.5 py-2.5 rounded-xl border border-ivory-border bg-white text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
              />
              <span className="text-[10px] text-ink-muted/70 mt-0.5">Séparés par des virgules ou retours à la ligne</span>
            </div>

            {/* Ce qu'ils désirent / rêvent d'obtenir */}
            <div className="flex flex-col gap-1">
              <label htmlFor="desires" className="text-xs font-semibold text-ink uppercase tracking-wider">
                Ce qu’ils désirent / rêvent d’obtenir
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-0.5">
                Leurs désirs profonds ou l&apos;expérience idéale qu&apos;ils imaginent.
              </p>
              <input
                id="desires"
                name="desires"
                type="text"
                placeholder="Ex. Se ressourcer, Profiter du Morvan, Partager un séjour avec leur chien"
                className="w-full px-3.5 py-2.5 rounded-xl border border-ivory-border bg-white text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
              />
              <span className="text-[10px] text-ink-muted/70 mt-0.5">Séparés par des virgules ou retours à la ligne</span>
            </div>

            {/* Leurs problèmes ou frustrations */}
            <div className="flex flex-col gap-1">
              <label htmlFor="problems" className="text-xs font-semibold text-ink uppercase tracking-wider">
                Leurs problèmes ou frustrations
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-0.5">
                Qu’est-ce qui complique leur recherche ou les déçoit habituellement ?
              </p>
              <input
                id="problems"
                name="problems"
                type="text"
                placeholder="Ex. Peu d’hébergements acceptent vraiment les chiens, Informations peu claires"
                className="w-full px-3.5 py-2.5 rounded-xl border border-ivory-border bg-white text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
              />
              <span className="text-[10px] text-ink-muted/70 mt-0.5">Séparés par des virgules ou retours à la ligne</span>
            </div>

            {/* Leurs objections / freins */}
            <div className="flex flex-col gap-1">
              <label htmlFor="objections" className="text-xs font-semibold text-ink uppercase tracking-wider">
                Leurs objections ou freins
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-0.5">
                Qu&apos;est-ce qui fait hésiter vos clients avant de réserver ou d&apos;acheter ?
              </p>
              <input
                id="objections"
                name="objections"
                type="text"
                placeholder="Ex. Peur des frais cachés, Doute sur le confort, Distance"
                className="w-full px-3.5 py-2.5 rounded-xl border border-ivory-border bg-white text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
              />
              <span className="text-[10px] text-ink-muted/70 mt-0.5">Séparés par des virgules ou retours à la ligne</span>
            </div>

            {/* Ce qui les motive */}
            <div className="flex flex-col gap-1">
              <label htmlFor="motivations" className="text-xs font-semibold text-ink uppercase tracking-wider">
                Ce qui les motive
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-0.5">
                Quels facteurs positifs les poussent à faire appel à vous ?
              </p>
              <input
                id="motivations"
                name="motivations"
                type="text"
                placeholder="Ex. Nature, Calme, Moment à deux, Faire plaisir à leur chien"
                className="w-full px-3.5 py-2.5 rounded-xl border border-ivory-border bg-white text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
              />
              <span className="text-[10px] text-ink-muted/70 mt-0.5">Séparés par des virgules ou retours à la ligne</span>
            </div>

            {/* Questions qu'ils se posent */}
            <div className="flex flex-col gap-1">
              <label htmlFor="questions" className="text-xs font-semibold text-ink uppercase tracking-wider">
                Questions qu’ils se posent
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-0.5">
                Les interrogations fréquentes qu&apos;ils ont en tête.
              </p>
              <input
                id="questions"
                name="questions"
                type="text"
                placeholder="Ex. Les chiens sont-ils vraiment les bienvenus ?, Que peut-on faire autour du gîte ?"
                className="w-full px-3.5 py-2.5 rounded-xl border border-ivory-border bg-white text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
              />
              <span className="text-[10px] text-ink-muted/70 mt-0.5">Séparés par des virgules ou retours à la ligne</span>
            </div>

            {/* Déclencheurs d'achat / réservation */}
            <div className="flex flex-col gap-1">
              <label htmlFor="buyingTriggers" className="text-xs font-semibold text-ink uppercase tracking-wider">
                Déclencheurs d’achat ou de réservation
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-0.5">
                Qu’est-ce qui peut leur donner envie de passer à l’action maintenant ?
              </p>
              <input
                id="buyingTriggers"
                name="buyingTriggers"
                type="text"
                placeholder="Ex. Un week-end disponible, Une période calme, Une météo agréable, Un coup de cœur"
                className="w-full px-3.5 py-2.5 rounded-xl border border-ivory-border bg-white text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
              />
              <span className="text-[10px] text-ink-muted/70 mt-0.5">Séparés par des virgules ou retours à la ligne</span>
            </div>

            {/* Mots / expressions qu'ils utilisent */}
            <div className="flex flex-col gap-1">
              <label htmlFor="languagePatterns" className="text-xs font-semibold text-ink uppercase tracking-wider">
                Mots & expressions qu’ils utilisent
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-0.5">
                Les termes exacts que vos clients utilisent pour décrire ce qu&apos;ils cherchent.
              </p>
              <input
                id="languagePatterns"
                name="languagePatterns"
                type="text"
                placeholder="Ex. week-end nature, vacances avec chien, gîte dog-friendly, déconnexion"
                className="w-full px-3.5 py-2.5 rounded-xl border border-ivory-border bg-white text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
              />
              <span className="text-[10px] text-ink-muted/70 mt-0.5">Séparés par des virgules ou retours à la ligne</span>
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex flex-col gap-3">
              <Button type="submit" variant="primary" size="lg" fullWidth disabled={isPending}>
                {isPending ? 'Enregistrement...' : 'Continuer ✦'}
              </Button>

              <p className="text-center text-xs text-ink-muted/80 italic">
                Vous pourrez affiner ou ajouter d&apos;autres audiences plus tard.
              </p>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
