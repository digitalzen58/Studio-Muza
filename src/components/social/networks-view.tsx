'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  Video,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Info,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { MuzaSymbol } from '@/components/ui/muza-symbol'
import {
  type SocialAccountSummary,
  type ProviderAuthConfig,
  type SocialPlatform,
} from '@/services/social/types'

function InstagramIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

function FacebookIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

function LinkedinIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  )
}
import {
  disconnectSocialAccountAction,
  verifySocialAccountAction,
  getSocialAuthUrlAction,
} from '@/actions/social-accounts'

export interface NetworksViewProps {
  businessName: string
  accounts: SocialAccountSummary[]
  metaConfig: ProviderAuthConfig
  initialError?: string | null
  initialSuccess?: string | null
}

export function NetworksView({
  businessName,
  accounts,
  metaConfig,
  initialError,
  initialSuccess,
}: NetworksViewProps) {
  const [loadingAction, setLoadingAction] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError || null)
  const [successMessage, setSuccessMessage] = useState<string | null>(initialSuccess || null)

  // Find accounts by platform - prioritize CONNECTED accounts, then active/reauth accounts
  const instagramAccount =
    accounts.find((a) => a.platform?.toUpperCase() === 'INSTAGRAM' && a.status === 'CONNECTED') ||
    accounts.find((a) => a.platform?.toUpperCase() === 'INSTAGRAM' && a.status === 'REAUTH_REQUIRED') ||
    accounts.find((a) => a.platform?.toUpperCase() === 'INSTAGRAM')

  const facebookAccount =
    accounts.find((a) => a.platform?.toUpperCase() === 'FACEBOOK' && a.status === 'CONNECTED') ||
    accounts.find((a) => a.platform?.toUpperCase() === 'FACEBOOK' && a.status === 'REAUTH_REQUIRED') ||
    accounts.find((a) => a.platform?.toUpperCase() === 'FACEBOOK')

  const isInstagramConnected = instagramAccount?.status === 'CONNECTED'
  const isInstagramReauth =
    instagramAccount?.status === 'REAUTH_REQUIRED' || instagramAccount?.status === 'ERROR'

  const isFacebookConnected = facebookAccount?.status === 'CONNECTED'
  const isFacebookReauth =
    facebookAccount?.status === 'REAUTH_REQUIRED' || facebookAccount?.status === 'ERROR'

  const handleConnect = async (platform: SocialPlatform) => {
    setLoadingAction(`connect-${platform}`)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const res = await getSocialAuthUrlAction(platform)
      if (res.error) {
        setErrorMessage(res.error)
        setLoadingAction(null)
      } else if (res.url) {
        window.location.href = res.url
      } else {
        setErrorMessage('Impossible de générer le lien d’autorisation.')
        setLoadingAction(null)
      }
    } catch {
      setErrorMessage('Une erreur est survenue lors de la tentative de connexion.')
      setLoadingAction(null)
    }
  }

  const handleDisconnect = async (accountId: string, platformName: string) => {
    if (!confirm(`Souhaitez-vous vraiment déconnecter ${platformName} ? Vos publications historiques seront conservées.`)) {
      return
    }

    setLoadingAction(`disconnect-${accountId}`)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const res = await disconnectSocialAccountAction(accountId)
      if (res.error) {
        setErrorMessage(res.error)
      } else {
        setSuccessMessage(`${platformName} a été déconnecté avec succès.`)
      }
    } catch {
      setErrorMessage('Erreur lors de la déconnexion.')
    } finally {
      setLoadingAction(null)
    }
  }

  const handleVerify = async (accountId: string) => {
    setLoadingAction(`verify-${accountId}`)
    setErrorMessage(null)
    setSuccessMessage(null)

    try {
      const res = await verifySocialAccountAction(accountId)
      if (res.error) {
        setErrorMessage(`Vérification : ${res.error}`)
      } else {
        setSuccessMessage('Connexion vérifiée avec succès auprès du réseau.')
      }
    } catch {
      setErrorMessage('Erreur lors de la vérification.')
    } finally {
      setLoadingAction(null)
    }
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-7 pb-12">
      {/* 1. Breadcrumb & Back */}
      <div className="flex items-center gap-2">
        <Link
          href="/app/settings"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-ink-muted hover:text-terracotta transition-colors py-1 px-2 rounded-lg hover:bg-terracotta-light/40"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Retour aux paramètres</span>
        </Link>
      </div>

      {/* 2. Header */}
      <header className="space-y-2 border-b border-ivory-border/60 pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-terracotta tracking-wide uppercase">
          <MuzaSymbol size="sm" />
          <span>Réseaux sociaux</span>
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-ink">
          Vos réseaux connectés
        </h1>
        <p className="text-sm text-ink-muted max-w-2xl leading-relaxed">
          Connectez vos réseaux pour permettre à Mūza de publier directement vos contenus préparés pour <strong className="text-ink font-semibold">{businessName}</strong>.
        </p>
      </header>

      {/* Feedback Messages */}
      {errorMessage && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-xs text-red-800 flex items-start gap-2.5 animate-in fade-in-50">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium">Information de connexion</p>
            <p className="text-red-700">{errorMessage}</p>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-800 flex items-start gap-2.5 animate-in fade-in-50">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p>{successMessage}</p>
        </div>
      )}

      {/* 3. Networks List */}
      <div className="space-y-4">
        {/* Instagram Card */}
        <Card className="p-5 sm:p-6 rounded-2xl border border-ivory-border/80 bg-ivory-card shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <InstagramIcon className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm sm:text-base text-ink">Instagram</h3>
                  {isInstagramConnected ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      Connecté
                    </span>
                  ) : isInstagramReauth ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                      <AlertCircle className="w-3 h-3" />
                      Autorisation à renouveler
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-ivory-border/60 text-ink-muted">
                      Non connecté
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-muted">
                  {isInstagramConnected && instagramAccount
                    ? `Compte associé : ${instagramAccount.accountName || instagramAccount.externalAccountId}`
                    : isInstagramReauth
                    ? 'L’autorisation a expiré ou doit être renouvelée. Veuillez reconnecter votre compte Instagram Professionnel.'
                    : 'Pour publier vos posts et carrousels directement sur votre compte Instagram Professionnel.'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 sm:pt-0 self-end sm:self-center">
              {isInstagramConnected && instagramAccount ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleVerify(instagramAccount.id)}
                    disabled={loadingAction === `verify-${instagramAccount.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ivory-border text-xs font-medium text-ink-muted hover:text-ink hover:bg-white transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingAction === `verify-${instagramAccount.id}` ? 'animate-spin' : ''}`} />
                    <span>Vérifier</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDisconnect(instagramAccount.id, 'Instagram')}
                    disabled={loadingAction === `disconnect-${instagramAccount.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Déconnecter</span>
                  </button>
                </>
              ) : isInstagramReauth && instagramAccount ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleConnect('INSTAGRAM')}
                    disabled={loadingAction === 'connect-INSTAGRAM'}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
                  >
                    {loadingAction === 'connect-INSTAGRAM' ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Connexion…</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Reconnecter</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDisconnect(instagramAccount.id, 'Instagram')}
                    disabled={loadingAction === `disconnect-${instagramAccount.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Déconnecter</span>
                  </button>
                </>
              ) : metaConfig.isConfigured ? (
                <button
                  type="button"
                  onClick={() => handleConnect('INSTAGRAM')}
                  disabled={loadingAction === 'connect-INSTAGRAM'}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-70"
                >
                  {loadingAction === 'connect-INSTAGRAM' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Connexion…</span>
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Connecter Instagram</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Configuration en attente"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-ivory-border/50 text-ink-muted text-xs font-medium cursor-not-allowed opacity-80"
                >
                  <span>Connexion bientôt disponible</span>
                </button>
              )}
            </div>
          </div>

          {!isInstagramConnected && !isInstagramReauth && !metaConfig.isConfigured && (
            <div className="p-3 rounded-xl bg-ivory-bg/80 border border-ivory-border/60 text-[11px] text-ink-muted flex items-center gap-2">
              <Info className="w-4 h-4 text-terracotta shrink-0" />
              <span>La connexion à Instagram sera activée dès la configuration des identifiants d’application Meta.</span>
            </div>
          )}
        </Card>

        {/* Facebook Card */}
        <Card className="p-5 sm:p-6 rounded-2xl border border-ivory-border/80 bg-ivory-card shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <FacebookIcon className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm sm:text-base text-ink">Facebook</h3>
                  {isFacebookConnected ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      Connecté
                    </span>
                  ) : isFacebookReauth ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                      <AlertCircle className="w-3 h-3" />
                      Autorisation à renouveler
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-ivory-border/60 text-ink-muted">
                      Non connecté
                    </span>
                  )}
                </div>
                <p className="text-xs text-ink-muted">
                  {isFacebookConnected && facebookAccount
                    ? `Page associée : ${facebookAccount.accountName || facebookAccount.externalAccountId}`
                    : isFacebookReauth
                    ? 'L’autorisation a expiré ou doit être renouvelée. Veuillez reconnecter votre Page Facebook.'
                    : 'Pour publier vos actualités et visuels directement sur votre Page Facebook professionnelle.'}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 sm:pt-0 self-end sm:self-center">
              {isFacebookConnected && facebookAccount ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleVerify(facebookAccount.id)}
                    disabled={loadingAction === `verify-${facebookAccount.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ivory-border text-xs font-medium text-ink-muted hover:text-ink hover:bg-white transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loadingAction === `verify-${facebookAccount.id}` ? 'animate-spin' : ''}`} />
                    <span>Vérifier</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDisconnect(facebookAccount.id, 'Facebook')}
                    disabled={loadingAction === `disconnect-${facebookAccount.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Déconnecter</span>
                  </button>
                </>
              ) : isFacebookReauth && facebookAccount ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleConnect('FACEBOOK')}
                    disabled={loadingAction === 'connect-FACEBOOK'}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold transition-all shadow-xs cursor-pointer"
                  >
                    {loadingAction === 'connect-FACEBOOK' ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Connexion…</span>
                      </>
                    ) : (
                      <>
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Reconnecter</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDisconnect(facebookAccount.id, 'Facebook')}
                    disabled={loadingAction === `disconnect-${facebookAccount.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Déconnecter</span>
                  </button>
                </>
              ) : metaConfig.isConfigured ? (
                <button
                  type="button"
                  onClick={() => handleConnect('FACEBOOK')}
                  disabled={loadingAction === 'connect-FACEBOOK'}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-terracotta hover:bg-terracotta-dark text-white text-xs font-semibold transition-all shadow-xs cursor-pointer disabled:opacity-70"
                >
                  {loadingAction === 'connect-FACEBOOK' ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Connexion…</span>
                    </>
                  ) : (
                    <>
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Connecter Facebook</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  title="Configuration en attente"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-ivory-border/50 text-ink-muted text-xs font-medium cursor-not-allowed opacity-80"
                >
                  <span>Connexion bientôt disponible</span>
                </button>
              )}
            </div>
          </div>

          {!isFacebookConnected && !isFacebookReauth && !metaConfig.isConfigured && (
            <div className="p-3 rounded-xl bg-ivory-bg/80 border border-ivory-border/60 text-[11px] text-ink-muted flex items-center gap-2">
              <Info className="w-4 h-4 text-terracotta shrink-0" />
              <span>La connexion à Facebook sera activée dès la configuration des identifiants d’application Meta.</span>
            </div>
          )}
        </Card>

        {/* Future Platforms (Clean, unobtrusive) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          {/* LinkedIn */}
          <div className="p-4 rounded-xl border border-ivory-border/60 bg-ivory-card/50 flex items-center justify-between opacity-80">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-sky-700 text-white flex items-center justify-center">
                <LinkedinIcon className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-ink block">LinkedIn</span>
                <span className="text-[10px] text-ink-muted block">Réseau professionnel</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-ivory-border/50 text-ink-muted">
              Bientôt
            </span>
          </div>

          {/* TikTok */}
          <div className="p-4 rounded-xl border border-ivory-border/60 bg-ivory-card/50 flex items-center justify-between opacity-80">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-neutral-900 text-white flex items-center justify-center">
                <Video className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-ink block">TikTok</span>
                <span className="text-[10px] text-ink-muted block">Vidéos courtes</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-ivory-border/50 text-ink-muted">
              Bientôt
            </span>
          </div>
        </div>
      </div>

      {/* 4. Security & Privacy Notice */}
      <div className="p-4 rounded-2xl border border-ivory-border/60 bg-ivory-card/60 text-xs text-ink-muted leading-relaxed space-y-1.5">
        <div className="flex items-center gap-1.5 font-medium text-ink">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Sécurité et respect de vos données</span>
        </div>
        <p>
          Studio Mūza utilise les protocoles d’autorisation officiels. Vos autorisations de connexion sont stockées de manière chiffrée et ne sont jamais affichées dans l’application. Vous restez maître de vos accès et pouvez déconnecter vos réseaux à tout moment.
        </p>
      </div>
    </div>
  )
}
