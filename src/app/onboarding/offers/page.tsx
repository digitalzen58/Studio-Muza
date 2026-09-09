'use client'

import { useState, useTransition } from 'react'
import { MuzaSymbol } from '@/components/ui/muza-symbol'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { submitOfferAction } from './actions'

const PRIORITIES = [
  { value: '3', label: 'Secondaire', desc: 'Une offre secondaire à valoriser occasionnellement' },
  { value: '7', label: 'Importante', desc: 'Une offre forte qui génère du chiffre d’affaires' },
  { value: '10', label: 'Principale', desc: 'Votre offre phare, priorité de votre activité' },
]

export default function OnboardingOffersPage() {
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [selectedPriority, setSelectedPriority] = useState<string>('10')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)
    const formData = new FormData(e.currentTarget)
    formData.set('priority', selectedPriority)

    startTransition(async () => {
      const res = await submitOfferAction(formData)
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
        {/* Header */}
        <div className="flex flex-col gap-2 text-center items-center">
          <div className="inline-flex items-center gap-1.5 text-terracotta font-medium text-xs mb-1">
            <MuzaSymbol size="sm" />
            <span>Étape 6 — Offre principale</span>
          </div>

          <h1 className="font-serif text-3xl md:text-4xl text-ink leading-tight">
            Quelle est votre offre principale ?
          </h1>

          <p className="text-xs text-ink-muted leading-relaxed max-w-md">
            Mūza a besoin de comprendre ce que vous vendez ou proposez pour créer du contenu à fort impact.
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
            <input type="hidden" name="currency" value="EUR" />

            {/* Champ 1 — Nom de l’offre */}
            <div className="flex flex-col gap-1">
              <label htmlFor="name" className="text-xs font-semibold text-ink uppercase tracking-wider">
                Nom de l’offre *
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-0.5">
                Qu’est-ce que vos clients peuvent réserver, acheter ou demander chez vous ?
              </p>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="Séjour au Gîte des Marguerites"
                className="w-full px-3.5 py-2.5 rounded-xl border border-ivory-border bg-white text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
              />
            </div>

            {/* Champ 2 — Description */}
            <div className="flex flex-col gap-1">
              <label htmlFor="description" className="text-xs font-semibold text-ink uppercase tracking-wider">
                Description
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-0.5">
                Décrivez simplement ce que comprend cette offre et ce qui la rend intéressante.
              </p>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Un séjour nature dans le Morvan, pensé pour les humains qui voyagent avec leur chien."
                className="w-full px-3.5 py-2.5 rounded-xl border border-ivory-border bg-white text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all resize-none"
              />
            </div>

            {/* Champ 3 — Tarif */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider">
                Tarif (en €)
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-1">
                Indiquez une fourchette si le prix varie. Vous pouvez laisser ces champs vides.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="priceFrom" className="text-[11px] font-medium text-ink-muted">
                    À partir de
                  </label>
                  <input
                    id="priceFrom"
                    name="priceFrom"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="120"
                    className="w-full px-3 py-2 rounded-xl border border-ivory-border bg-white text-ink text-xs focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="priceTo" className="text-[11px] font-medium text-ink-muted">
                    Jusqu’à
                  </label>
                  <input
                    id="priceTo"
                    name="priceTo"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="250"
                    className="w-full px-3 py-2 rounded-xl border border-ivory-border bg-white text-ink text-xs focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Champ 4 — Bénéfices principaux */}
            <div className="flex flex-col gap-1">
              <label htmlFor="benefits" className="text-xs font-semibold text-ink uppercase tracking-wider">
                Bénéfices principaux
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-0.5">
                Qu’est-ce que vos clients apprécient ou obtiennent grâce à cette offre ?
              </p>
              <input
                id="benefits"
                name="benefits"
                type="text"
                placeholder="Ex. Accueil des chiens, calme, nature, jardin, déconnexion"
                className="w-full px-3.5 py-2.5 rounded-xl border border-ivory-border bg-white text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
              />
              <span className="text-[10px] text-ink-muted/70 mt-0.5">Séparés par des virgules ou retours à la ligne</span>
            </div>

            {/* Champ 5 — Freins ou objections */}
            <div className="flex flex-col gap-1">
              <label htmlFor="objections" className="text-xs font-semibold text-ink uppercase tracking-wider">
                Freins ou objections
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-0.5">
                Qu’est-ce qui pourrait faire hésiter un client avant de réserver ou acheter ?
              </p>
              <input
                id="objections"
                name="objections"
                type="text"
                placeholder="Ex. Distance, budget, disponibilité, peur des frais supplémentaires"
                className="w-full px-3.5 py-2.5 rounded-xl border border-ivory-border bg-white text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
              />
              <span className="text-[10px] text-ink-muted/70 mt-0.5">Séparés par des virgules ou retours à la ligne</span>
            </div>

            {/* Champ 6 — Appel à l’action */}
            <div className="flex flex-col gap-1">
              <label htmlFor="cta" className="text-xs font-semibold text-ink uppercase tracking-wider">
                Appel à l’action
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-0.5">
                Quelle action voulez-vous que les personnes fassent après avoir découvert cette offre ?
              </p>
              <input
                id="cta"
                name="cta"
                type="text"
                placeholder="Réserver votre séjour"
                className="w-full px-3.5 py-2.5 rounded-xl border border-ivory-border bg-white text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
              />
            </div>

            {/* Champ 7 — Lien */}
            <div className="flex flex-col gap-1">
              <label htmlFor="url" className="text-xs font-semibold text-ink uppercase tracking-wider">
                Lien
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-0.5">
                Où peut-on consulter ou réserver cette offre ?
              </p>
              <input
                id="url"
                name="url"
                type="text"
                placeholder="https://gite-des-marguerites.fr/reserver"
                className="w-full px-3.5 py-2.5 rounded-xl border border-ivory-border bg-white text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
              />
            </div>

            {/* Champ 8 — Disponibilité */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider">
                Disponibilité
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-1">
                Cette offre est-elle disponible seulement pendant une période précise ? (facultatif)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="availableFrom" className="text-[11px] font-medium text-ink-muted">
                    Disponible à partir du
                  </label>
                  <input
                    id="availableFrom"
                    name="availableFrom"
                    type="date"
                    className="w-full px-3 py-2 rounded-xl border border-ivory-border bg-white text-ink text-xs focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="availableUntil" className="text-[11px] font-medium text-ink-muted">
                    Disponible jusqu’au
                  </label>
                  <input
                    id="availableUntil"
                    name="availableUntil"
                    type="date"
                    className="w-full px-3 py-2 rounded-xl border border-ivory-border bg-white text-ink text-xs focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Champ 9 — Saisonnalité */}
            <div className="flex flex-col gap-1">
              <label htmlFor="seasonality" className="text-xs font-semibold text-ink uppercase tracking-wider">
                Saisonnalité
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-0.5">
                Y a-t-il des périodes où cette offre est particulièrement importante ?
              </p>
              <input
                id="seasonality"
                name="seasonality"
                type="text"
                placeholder="Automne, week-ends, vacances scolaires"
                className="w-full px-3.5 py-2.5 rounded-xl border border-ivory-border bg-white text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
              />
            </div>

            {/* Champ 10 — Priorité */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider">
                Priorité
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-1">
                À quel point cette offre est-elle importante dans votre activité ?
              </p>
              <div className="grid grid-cols-3 gap-2">
                {PRIORITIES.map((p) => {
                  const isSelected = selectedPriority === p.value
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setSelectedPriority(p.value)}
                      className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1 ${
                        isSelected
                          ? 'border-terracotta bg-terracotta/5 shadow-xs'
                          : 'border-ivory-border bg-white hover:border-terracotta/40'
                      }`}
                    >
                      <span className="text-xs font-medium text-ink">{p.label}</span>
                      <span className="text-[10px] text-ink-muted leading-tight hidden sm:block">{p.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-2 flex flex-col gap-3">
              <Button type="submit" variant="primary" size="lg" fullWidth disabled={isPending}>
                {isPending ? 'Enregistrement...' : 'Continuer ✦'}
              </Button>

              <p className="text-center text-xs text-ink-muted/80 italic">
                Vous pourrez ajouter d&apos;autres offres ou les modifier depuis votre tableau de bord.
              </p>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
