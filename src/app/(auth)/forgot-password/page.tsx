'use client'

import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MuzaSymbol } from '@/components/ui/muza-symbol'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { requestPasswordReset } from '@/app/auth/actions'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Prevent authenticated users from staying on stale forgot-password screen
  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace('/app')
      }
    })
  }, [router])

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const res = await requestPasswordReset(formData)
      if (res?.error) {
        setErrorMessage(res.error)
      } else if (res?.success) {
        setSuccessMessage(res.message)
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
            Récupération d’accès
          </p>
        </div>

        {/* Form Card */}
        <Card className="flex flex-col gap-6">
          <div>
            <h1 className="font-serif text-2xl text-ink">Mot de passe oublié ?</h1>
            <p className="text-xs text-ink-muted mt-1 leading-relaxed">
              Indiquez votre adresse e-mail. Nous vous enverrons un lien pour
              choisir un nouveau mot de passe.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {errorMessage}
            </div>
          )}

          {successMessage ? (
            <div className="flex flex-col gap-4">
              <div className="p-4 bg-terracotta-light/50 border border-terracotta-border/60 text-ink text-xs rounded-xl leading-relaxed flex flex-col gap-2">
                <div className="flex items-center gap-2 text-terracotta-dark font-medium">
                  <MuzaSymbol size="sm" />
                  <span>Demande transmise</span>
                </div>
                <p className="text-ink/80">{successMessage}</p>
              </div>

              <Link href="/login" className="w-full">
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  fullWidth
                >
                  Retour à la connexion
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="Adresse Email"
                type="email"
                name="email"
                id="email"
                placeholder="votre@entreprise.com"
                required
                autoFocus
              />

              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                disabled={isPending}
              >
                {isPending ? 'Envoi en cours...' : 'Recevoir le lien'}
              </Button>

              <div className="pt-2 text-center">
                <Link
                  href="/login"
                  className="text-xs text-ink-muted hover:text-ink transition-colors"
                >
                  Retour à la connexion
                </Link>
              </div>
            </form>
          )}
        </Card>

        {/* Footer Info */}
        <p className="text-center text-xs text-ink-muted">
          Besoin d’aide supplémentaire ?{' '}
          <a
            href="mailto:digital.zen.58@gmail.com"
            className="text-terracotta font-medium hover:underline"
          >
            Contacter le support
          </a>
        </p>
      </div>
    </div>
  )
}
