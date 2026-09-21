import Link from 'next/link'
import { cookies } from 'next/headers'
import { MuzaSymbol } from '@/components/ui/muza-symbol'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import {
  RECOVERY_COOKIE_NAME,
  verifyRecoveryToken,
} from '@/lib/auth/recovery-state'
import { ResetPasswordForm } from './reset-password-form'

interface ResetPasswordPageProps {
  searchParams: Promise<{
    error?: string
    error_code?: string
    error_description?: string
    success?: string
  }>
}

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const resolvedParams = await searchParams
  const hasParamError = Boolean(resolvedParams?.error)
  const isSuccess = resolvedParams?.success === 'true'

  let isValidRecoverySession = false

  // SECURITY INVARIANT: Verify BOTH active Supabase user and recovery-specific state
  if (!hasParamError && !isSuccess) {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (!error && user) {
      const cookieStore = await cookies()
      const recoveryToken = cookieStore.get(RECOVERY_COOKIE_NAME)?.value
      const verification = verifyRecoveryToken(recoveryToken, user.id)
      isValidRecoverySession = verification.valid
    }
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
            Sécurité du compte
          </p>
        </div>

        <Card className="p-8 border border-ivory-border bg-ivory-card shadow-sm flex flex-col gap-6">
          {isSuccess ? (
            /* Official Success State */
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
          ) : !isValidRecoverySession ? (
            /* Expired / Invalid Recovery Session UX */
            <div className="flex flex-col gap-5 text-center">
              <div>
                <h1 className="font-serif text-2xl text-ink">
                  Ce lien n’est plus valide ou a expiré.
                </h1>
                <p className="text-xs text-ink-muted mt-2 leading-relaxed">
                  Pour des raisons de sécurité, les liens de réinitialisation ont une durée de validité limitée. Vous pouvez demander un nouveau lien à tout moment depuis la page de récupération.
                </p>
              </div>

              <div className="p-4 bg-ivory border border-ivory-border text-ink-muted text-xs rounded-xl leading-relaxed flex items-center justify-center gap-2 text-left">
                <span className="text-terracotta font-serif font-bold text-sm">✦</span>
                <span>
                  Vous pouvez demander un nouveau lien à tout moment depuis la page de récupération.
                </span>
              </div>

              <Link href="/forgot-password" className="w-full">
                <Button variant="primary" size="lg" fullWidth>
                  Recevoir un nouveau lien
                </Button>
              </Link>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-xs text-ink-muted hover:text-ink transition-colors"
                >
                  Retour à la connexion
                </Link>
              </div>
            </div>
          ) : (
            <ResetPasswordForm />
          )}
        </Card>

        {/* Footer Link */}
        <p className="text-center text-xs text-ink-muted">
          Studio Mūza — Assistant éditorial & communication
        </p>
      </div>
    </div>
  )
}
