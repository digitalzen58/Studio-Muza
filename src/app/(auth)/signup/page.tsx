'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { MuzaSymbol } from '@/components/ui/muza-symbol'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { signup } from '@/app/auth/actions'

export default function SignupPage() {
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const res = await signup(formData)
      if (res?.error) {
        setErrorMessage(res.error)
      }
    })
  }

  return (
    <div className="min-h-screen bg-ivory text-ink flex flex-col justify-center items-center p-6 max-w-md mx-auto">
      <div className="w-full flex flex-col gap-8">
        {/* Brand Header */}
        <div className="flex flex-col items-center gap-2 text-center">
          <Link href="/" className="flex items-center gap-2">
            <span className="font-serif text-3xl font-bold tracking-tight text-ink">
              Studio Mūza
            </span>
            <MuzaSymbol size="lg" />
          </Link>
          <p className="text-xs text-ink-muted uppercase tracking-widest pt-1">
            Créer votre espace
          </p>
        </div>

        {/* Form Card */}
        <Card className="flex flex-col gap-6">
          <div>
            <h1 className="font-serif text-2xl text-ink">Inscription</h1>
            <p className="text-xs text-ink-muted mt-1">
              Activez votre assistant de visibilité intelligent.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              label="Prénom et Nom"
              type="text"
              name="fullName"
              placeholder="Ex: Marie Dupont"
              required
            />

            <Input
              label="Adresse Email"
              type="email"
              name="email"
              placeholder="votre@entreprise.com"
              required
            />

            <Input
              label="Mot de passe"
              type="password"
              name="password"
              placeholder="••••••••"
              required
              hint="Minimum 6 caractères"
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              disabled={isPending}
            >
              {isPending ? 'Création de l\'espace...' : 'Créer mon espace'}
            </Button>
          </form>
        </Card>

        {/* Footer Link */}
        <p className="text-center text-xs text-ink-muted">
          Vous avez déjà un compte ?{' '}
          <Link
            href="/login"
            className="text-terracotta font-medium hover:underline"
          >
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  )
}
