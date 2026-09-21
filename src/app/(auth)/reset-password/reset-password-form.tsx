'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MuzaSymbol } from '@/components/ui/muza-symbol'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { updatePassword } from '@/app/auth/actions'

export function ResetPasswordForm() {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage(null)

    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (!password || !confirmPassword) {
      setErrorMessage('Veuillez renseigner tous les champs.')
      return
    }

    if (password.length < 8) {
      setErrorMessage('Le mot de passe doit comporter au moins 8 caractères.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('Les mots de passe ne correspondent pas.')
      return
    }

    startTransition(async () => {
      const res = await updatePassword(formData)
      if (res?.error) {
        setErrorMessage(res.error)
      } else {
        setIsSuccess(true)
        router.replace('/reset-password?success=true')
      }
    })
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col gap-5 text-center">
        <div>
          <h1 className="font-serif text-2xl text-ink">
            Votre mot de passe a bien été modifié.
          </h1>
          <p className="text-xs text-ink-muted mt-2 leading-relaxed">
            Vous pouvez maintenant continuer vers Studio Mūza.
          </p>
        </div>

        <div className="p-4 bg-terracotta-light/50 border border-terracotta-border/60 text-ink text-xs rounded-xl leading-relaxed flex items-center justify-center gap-2">
          <MuzaSymbol size="sm" />
          <span className="font-medium text-terracotta-dark">
            Mise à jour enregistrée avec succès
          </span>
        </div>

        <Link href="/app" className="w-full">
          <Button variant="primary" size="lg" fullWidth>
            Continuer vers Mūza
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <>
      <div>
        <h1 className="font-serif text-2xl text-ink">
          Choisissez votre nouveau mot de passe
        </h1>
        <p className="text-xs text-ink-muted mt-1 leading-relaxed">
          Définissez un mot de passe sécurisé comportant au moins 8 caractères.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Input
          label="Nouveau mot de passe"
          type="password"
          name="password"
          id="password"
          placeholder="••••••••"
          minLength={8}
          required
          autoFocus
        />

        <Input
          label="Confirmer le mot de passe"
          type="password"
          name="confirmPassword"
          id="confirmPassword"
          placeholder="••••••••"
          minLength={8}
          required
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={isPending}
        >
          {isPending
            ? 'Enregistrement en cours...'
            : 'Enregistrer mon nouveau mot de passe'}
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
    </>
  )
}
