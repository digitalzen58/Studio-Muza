'use client'

import { useState, useTransition } from 'react'
import { MuzaSymbol } from '@/components/ui/muza-symbol'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { submitGoalAction } from './actions'

const GOAL_TYPES = [
  { value: 'BOOKINGS', label: 'Obtenir plus de réservations / ventes', desc: 'Booster les réservations directes et les ventes immédiates' },
  { value: 'VISIBILITY', label: 'Gagner en visibilité', desc: 'Se faire connaître auprès de nouvelles personnes' },
  { value: 'ACQUISITION', label: 'Attirer de nouveaux clients', desc: 'Transformer des personnes intéressées en premiers clients' },
  { value: 'RETENTION', label: 'Fidéliser les clients existants', desc: 'Faire revenir vos clients actuels et renforcer le lien' },
  { value: 'OFFER_LAUNCH', label: 'Faire connaître une nouvelle offre', desc: 'Lancer un nouveau service, produit ou événement' },
  { value: 'LEADS', label: 'Développer les demandes de contact', desc: 'Générer des devis, messages et demandes d\'information' },
  { value: 'LOCAL_VISIBILITY', label: 'Améliorer ma visibilité locale', desc: 'Attirer les clients situés à proximité de chez vous' },
]

const PRIORITIES = [
  { value: '3', label: 'Secondaire', desc: 'Un objectif de fond à travailler à votre rythme' },
  { value: '7', label: 'Important', desc: 'Un axe fort pour les semaines à venir' },
  { value: '10', label: 'Prioritaire', desc: 'Votre priorité absolue en ce moment' },
]

export default function OnboardingGoalsPage() {
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [selectedType, setSelectedType] = useState<string>('BOOKINGS')
  const [selectedPriority, setSelectedPriority] = useState<string>('10')

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)
    const formData = new FormData(e.currentTarget)
    formData.set('type', selectedType)
    formData.set('priority', selectedPriority)

    startTransition(async () => {
      const res = await submitGoalAction(formData)
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
            <span>Étape 5 — Objectif principal</span>
          </div>

          <h1 className="font-serif text-3xl md:text-4xl text-ink leading-tight">
            Quel est votre objectif prioritaire ?
          </h1>

          <p className="text-xs text-ink-muted leading-relaxed max-w-md">
            Mūza adaptera ses conseils et ses idées de contenu en fonction de votre priorité du moment.
          </p>
        </div>

        {/* Form Card */}
        <Card className="flex flex-col gap-5 bg-ivory-card border-ivory-border shadow-xs">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* Champ 1 — Objectif principal */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider">
                Objectif principal *
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-1">
                Quelle est la priorité de votre communication en ce moment ?
              </p>

              <div className="flex flex-col gap-2">
                {GOAL_TYPES.map((goal) => {
                  const isSelected = selectedType === goal.value
                  return (
                    <button
                      key={goal.value}
                      type="button"
                      onClick={() => setSelectedType(goal.value)}
                      className={`text-left p-3 rounded-xl border transition-all flex flex-col gap-0.5 ${
                        isSelected
                          ? 'border-terracotta bg-terracotta/5 shadow-xs'
                          : 'border-ivory-border bg-white hover:border-terracotta/40'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-ink">{goal.label}</span>
                        <div
                          className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                            isSelected ? 'border-terracotta bg-terracotta' : 'border-ink-muted/30'
                          }`}
                        >
                          {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                        </div>
                      </div>
                      <span className="text-[11px] text-ink-muted">{goal.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Champ 2 — Nom de l'objectif */}
            <div className="flex flex-col gap-1">
              <label htmlFor="title" className="text-xs font-semibold text-ink uppercase tracking-wider">
                Nom de l’objectif *
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-0.5">
                Donnez un nom concret à cet objectif pour que Mūza puisse le suivre.
              </p>
              <input
                id="title"
                name="title"
                type="text"
                required
                placeholder="Remplir les séjours d’automne"
                className="w-full px-3.5 py-2.5 rounded-xl border border-ivory-border bg-white text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
              />
            </div>

            {/* Champ 3 — Résultat recherché */}
            <div className="flex flex-col gap-1">
              <label htmlFor="description" className="text-xs font-semibold text-ink uppercase tracking-wider">
                Résultat recherché
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-0.5">
                Qu’aimeriez-vous obtenir concrètement ?
              </p>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Obtenir davantage de réservations directes pour octobre et novembre."
                className="w-full px-3.5 py-2.5 rounded-xl border border-ivory-border bg-white text-ink text-sm placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all resize-none"
              />
            </div>

            {/* Champ 4 — Période */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider">
                Période
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-1">
                Cet objectif concerne-t-il une période particulière ? (facultatif)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label htmlFor="startsAt" className="text-[11px] font-medium text-ink-muted">
                    Date de début
                  </label>
                  <input
                    id="startsAt"
                    name="startsAt"
                    type="date"
                    className="w-full px-3 py-2 rounded-xl border border-ivory-border bg-white text-ink text-xs focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="endsAt" className="text-[11px] font-medium text-ink-muted">
                    Date de fin
                  </label>
                  <input
                    id="endsAt"
                    name="endsAt"
                    type="date"
                    className="w-full px-3 py-2 rounded-xl border border-ivory-border bg-white text-ink text-xs focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Champ 5 — Priorité */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider">
                Priorité
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-1">
                À quel point cet objectif est-il important actuellement ?
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
                Vous pourrez créer d&apos;autres objectifs ou les modifier depuis votre tableau de bord.
              </p>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
