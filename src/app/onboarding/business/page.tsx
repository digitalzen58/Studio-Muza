'use client'

import { useState, useTransition } from 'react'
import { MuzaSymbol } from '@/components/ui/muza-symbol'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { submitBusinessAction } from './actions'

export default function BusinessOnboardingPage() {
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const res = await submitBusinessAction(formData)
      if (res?.error) {
        setErrorMessage(res.error)
      }
    })
  }

  return (
    <div className="min-h-screen bg-ivory text-ink flex flex-col justify-center items-center p-4 md:p-6 max-w-md mx-auto relative">
      {/* Decorative ambient blur */}
      <div className="absolute -top-16 -right-16 w-64 h-64 bg-terracotta-light rounded-full blur-3xl opacity-50 pointer-events-none" />

      <div className="w-full flex flex-col gap-6 py-6 z-10">
        {/* Brand Badge & Header */}
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-1.5 text-terracotta font-medium text-xs">
            <MuzaSymbol size="sm" />
            <span>Étape 1 sur 1 — Identité de votre activité</span>
          </div>

          <h1 className="font-serif text-3xl md:text-4xl text-ink leading-tight">
            Parlez-moi de votre activité
          </h1>

          <p className="text-xs text-ink-muted leading-relaxed">
            Mūza commence par comprendre ce que vous faites. Quelques informations suffisent pour démarrer.
          </p>
        </div>

        {/* Form Card */}
        <Card className="flex flex-col gap-5 bg-ivory-card border-ivory-border shadow-xs">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Nom de l'entreprise / marque *"
              type="text"
              name="name"
              placeholder="Ex: Le Gîte des Marguerites"
              required
            />

            <Input
              label="Secteur d'activité *"
              type="text"
              name="industry"
              placeholder="Ex: Tourisme, Artisanat, Santé..."
              required
            />

            <Input
              label="Sous-secteur / activité précise"
              type="text"
              name="subindustry"
              placeholder="Ex: Hébergement touristique, Boulangerie bio..."
              hint="Permet d'affiner les suggestions de Mūza"
            />

            <div className="flex flex-col gap-1.5 w-full">
              <label
                htmlFor="description"
                className="text-xs font-medium text-ink-muted uppercase tracking-wider"
              >
                Description courte de l&apos;activité
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Ex: Gîte familial de charme situé au cœur de la Provence..."
                className="w-full px-4 py-3 bg-ivory-card border border-ivory-border rounded-xl text-sm text-ink placeholder:text-ink-light transition-all focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta resize-none"
              />
            </div>

            <Input
              label="Site web (optionnel)"
              type="url"
              name="websiteUrl"
              placeholder="https://mon-entreprise.fr"
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Ville (optionnel)"
                type="text"
                name="city"
                placeholder="Ex: Aix-en-Provence"
              />

              <Input
                label="Région (optionnel)"
                type="text"
                name="region"
                placeholder="Ex: PACA"
              />
            </div>

            <input type="hidden" name="countryCode" value="FR" />

            <div className="pt-2">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={isPending}
              >
                {isPending ? 'Enregistrement...' : 'Continuer avec Mūza ✦'}
              </Button>
            </div>
          </form>
        </Card>

        {/* Footer info */}
        <p className="text-center text-[11px] text-ink-light">
          Studio Mūza ✦ Les données de votre entreprise restent confidentielles et protégées.
        </p>
      </div>
    </div>
  )
}
