'use client'

import { useState, useTransition } from 'react'
import { MuzaSymbol } from '@/components/ui/muza-symbol'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { submitCreatorAction } from './actions'

export default function OnboardingCreatorPage() {
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const res = await submitCreatorAction(formData)
      if (res?.error) {
        setErrorMessage(res.error)
      }
    })
  }

  const preferredOptions = [
    'Photos',
    'Vidéos courtes',
    'Stories',
    'Carrousels',
    'Textes / légendes',
    'Voix off',
    'Coulisses / quotidien',
  ]

  const avoidedOptions = [
    'Face caméra',
    'Lives',
    'Vidéos longues',
    'Contenu trop commercial',
    'Publications trop fréquentes',
  ]

  const barrierOptions = [
    'Manque de temps',
    'Manque d’idées',
    'Peur de se montrer',
    'Difficulté à être régulier',
    'Technique',
  ]

  const strengthOptions = [
    'Écriture',
    'Photos',
    'Authenticité',
    'Relation client',
    'Connaissance métier',
    'Créativité',
  ]

  const comfortLevels = [
    { value: 5, label: "J'adore" },
    { value: 4, label: 'Ça me va' },
    { value: 3, label: 'Ça dépend' },
    { value: 1, label: 'Pas très à l’aise' },
    { value: 0, label: 'Je préfère éviter' },
  ]

  return (
    <div className="min-h-screen bg-ivory text-ink flex flex-col justify-center items-center p-4 md:p-6 max-w-xl mx-auto relative">
      {/* Decorative ambient blur */}
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-terracotta-light rounded-full blur-3xl opacity-50 pointer-events-none" />

      <div className="w-full flex flex-col gap-6 py-6 z-10">
        {/* Creator Header */}
        <div className="flex flex-col gap-2 text-center items-center">
          <div className="inline-flex items-center gap-1.5 text-terracotta font-medium text-xs mb-1">
            <MuzaSymbol size="sm" />
            <span>Étape 3 — Profil créateur</span>
          </div>

          <h1 className="font-serif text-3xl md:text-4xl text-ink leading-tight">
            Vos contraintes et préférences de création
          </h1>

          <p className="text-xs text-ink-muted leading-relaxed max-w-md">
            Mūza s&apos;adapte à votre réalité pour vous proposer des contenus faciles et agréables à réaliser.
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
            {/* Temps disponible par semaine */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider">
                Temps disponible par semaine
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-1">
                Combien de temps pouvez-vous réellement consacrer à votre communication chaque semaine ?
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { value: 20, label: 'Moins de 30 min' },
                  { value: 60, label: 'Environ 1 h' },
                  { value: 150, label: '2 à 3 h' },
                  { value: 240, label: 'Plus de 3 h' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center justify-center p-2.5 rounded-xl border border-ivory-border bg-white text-xs font-medium text-ink cursor-pointer hover:border-terracotta/40 has-[:checked]:border-terracotta has-[:checked]:bg-terracotta-light/30 transition-all text-center"
                  >
                    <input
                      type="radio"
                      name="weeklyMinutes"
                      value={option.value}
                      className="sr-only"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* À l'aise face caméra */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider">
                À l’aise face caméra ?
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-1">
                Cela aide Mūza à éviter de vous proposer des formats que vous n’avez pas envie de faire.
              </p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 5, label: 'Oui, j’aime ça' },
                  { value: 3, label: 'Ça dépend' },
                  { value: 0, label: 'Non, je préfère éviter' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center justify-center p-2.5 rounded-xl border border-ivory-border bg-white text-xs font-medium text-ink cursor-pointer hover:border-terracotta/40 has-[:checked]:border-terracotta has-[:checked]:bg-terracotta-light/30 transition-all text-center"
                  >
                    <input
                      type="radio"
                      name="cameraComfort"
                      value={option.value}
                      className="sr-only"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Confort par format de média */}
            <div className="flex flex-col gap-3 pt-1 border-t border-ivory-border/40">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider">
                Niveau de confort par format
              </label>

              {[
                { name: 'voiceoverComfort', label: 'Voix off' },
                { name: 'writingComfort', label: 'Écriture de textes' },
                { name: 'photoComfort', label: 'Prise de photos' },
                { name: 'videoComfort', label: 'Tournage vidéo' },
              ].map((media) => (
                <div key={media.name} className="flex flex-col gap-1.5 bg-white p-3 rounded-xl border border-ivory-border">
                  <span className="text-xs font-medium text-ink">{media.label}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {comfortLevels.map((lvl) => (
                      <label
                        key={lvl.value}
                        className="flex-1 min-w-[70px] text-center px-2 py-1.5 rounded-lg border border-ivory-border text-[11px] font-medium text-ink cursor-pointer hover:border-terracotta/40 has-[:checked]:border-terracotta has-[:checked]:bg-terracotta-light/40 transition-all"
                      >
                        <input
                          type="radio"
                          name={media.name}
                          value={lvl.value}
                          className="sr-only"
                        />
                        <span>{lvl.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Formats préférés */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-ivory-border/40">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider">
                Formats préférés
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-1">
                Quels types de contenus vous semblent les plus naturels à créer ?
              </p>
              <div className="flex flex-wrap gap-2">
                {preferredOptions.map((option) => (
                  <label
                    key={option}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ivory-border bg-white text-xs font-medium text-ink cursor-pointer hover:border-terracotta/40 has-[:checked]:border-terracotta has-[:checked]:bg-terracotta-light/40 transition-all"
                  >
                    <input
                      type="checkbox"
                      name="preferredFormats"
                      value={option}
                      className="rounded text-terracotta focus:ring-terracotta/30"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Ce que vous préférez éviter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider">
                Ce que vous préférez éviter
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-1">
                Mūza en tiendra compte dans ses recommandations.
              </p>
              <div className="flex flex-wrap gap-2">
                {avoidedOptions.map((option) => (
                  <label
                    key={option}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ivory-border bg-white text-xs font-medium text-ink cursor-pointer hover:border-terracotta/40 has-[:checked]:border-terracotta has-[:checked]:bg-terracotta-light/40 transition-all"
                  >
                    <input
                      type="checkbox"
                      name="avoidedFormats"
                      value={option}
                      className="rounded text-terracotta focus:ring-terracotta/30"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Niveau réseaux sociaux */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-ivory-border/40">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider">
                Niveau sur les réseaux sociaux
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-1">
                Quel est votre niveau de maîtrise des outils et réseaux actuels ?
              </p>
              <div className="grid grid-cols-3 gap-2">
                {['Débutant', 'À l’aise', 'Autonome'].map((lvl) => (
                  <label
                    key={lvl}
                    className="flex items-center justify-center p-2.5 rounded-xl border border-ivory-border bg-white text-xs font-medium text-ink cursor-pointer hover:border-terracotta/40 has-[:checked]:border-terracotta has-[:checked]:bg-terracotta-light/30 transition-all text-center"
                  >
                    <input
                      type="radio"
                      name="socialSkillLevel"
                      value={lvl}
                      className="sr-only"
                    />
                    <span>{lvl}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Obstacles & Freins */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider">
                Obstacles ou freins principaux
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-1">
                Qu&apos;est-ce qui vous freine aujourd&apos;hui dans votre communication ?
              </p>
              <div className="flex flex-wrap gap-2">
                {barrierOptions.map((option) => (
                  <label
                    key={option}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ivory-border bg-white text-xs font-medium text-ink cursor-pointer hover:border-terracotta/40 has-[:checked]:border-terracotta has-[:checked]:bg-terracotta-light/40 transition-all"
                  >
                    <input
                      type="checkbox"
                      name="barriers"
                      value={option}
                      className="rounded text-terracotta focus:ring-terracotta/30"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Points forts */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider">
                Vos points forts
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-1">
                Sur quoi pouvez-vous vous appuyer le plus naturellement ?
              </p>
              <div className="flex flex-wrap gap-2">
                {strengthOptions.map((option) => (
                  <label
                    key={option}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ivory-border bg-white text-xs font-medium text-ink cursor-pointer hover:border-terracotta/40 has-[:checked]:border-terracotta has-[:checked]:bg-terracotta-light/40 transition-all"
                  >
                    <input
                      type="checkbox"
                      name="strengths"
                      value={option}
                      className="rounded text-terracotta focus:ring-terracotta/30"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Effort maximum acceptable */}
            <div className="flex flex-col gap-1.5 pt-1 border-t border-ivory-border/40">
              <label className="text-xs font-semibold text-ink uppercase tracking-wider">
                Effort maximum acceptable
              </label>
              <p className="text-[11px] text-ink-muted leading-tight mb-1">
                Quel niveau de complexité êtes-vous prêt à accepter pour créer un contenu ?
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: 1, label: 'Très simple' },
                  { value: 2, label: 'Simple' },
                  { value: 3, label: 'Modéré' },
                  { value: 4, label: 'Temps libre' },
                ].map((option) => (
                  <label
                    key={option.value}
                    className="flex items-center justify-center p-2.5 rounded-xl border border-ivory-border bg-white text-xs font-medium text-ink cursor-pointer hover:border-terracotta/40 has-[:checked]:border-terracotta has-[:checked]:bg-terracotta-light/30 transition-all text-center"
                  >
                    <input
                      type="radio"
                      name="maxEffortLevel"
                      value={option.value}
                      className="sr-only"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-3 flex flex-col gap-3">
              <Button type="submit" variant="primary" size="lg" fullWidth disabled={isPending}>
                {isPending ? 'Enregistrement...' : 'Continuer ✦'}
              </Button>

              <p className="text-center text-xs text-ink-muted/80 italic">
                Vous pourrez ajuster ces paramètres à tout moment.
              </p>
            </div>
          </form>
        </Card>
      </div>
    </div>
  )
}
