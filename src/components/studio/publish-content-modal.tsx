'use client'

import React, { useState, useEffect } from 'react'
import {
  X,
  Send,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getPublishingReadinessAction,
  publishContentImmediatelyAction,
} from '@/actions/publishing'
import type {
  PublishingDestinationPlatform,
  PublishingReadinessInfo,
  PublishContentImmediatelyResult,
} from '@/services/publishing/types'

function InstagramIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

function FacebookIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  )
}

interface PublishContentModalProps {
  isOpen: boolean
  onClose: () => void
  contentId: string
  format: 'POST' | 'CAROUSEL'
  workingTitle?: string | null
  hasVisual?: boolean
  onPublishSuccess?: () => void
}

type ModalStep = 'SELECT_NETWORKS' | 'CONFIRMATION' | 'PUBLISHING' | 'RESULT'

export function PublishContentModal({
  isOpen,
  onClose,
  contentId,
  workingTitle,
  hasVisual,
  onPublishSuccess,
}: PublishContentModalProps) {
  const [step, setStep] = useState<ModalStep>('SELECT_NETWORKS')
  const [readinessInfo, setReadinessInfo] = useState<PublishingReadinessInfo | null>(null)
  const [readinessError, setReadinessError] = useState<string | null>(null)
  const [loadingReadiness, startReadinessTransition] = React.useTransition()

  const [selectedPlatforms, setSelectedPlatforms] = useState<PublishingDestinationPlatform[]>([])
  const [publishResult, setPublishResult] = useState<PublishContentImmediatelyResult | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClose = () => {
    setStep('SELECT_NETWORKS')
    setReadinessInfo(null)
    setReadinessError(null)
    setSelectedPlatforms([])
    setPublishResult(null)
    setIsSubmitting(false)
    onClose()
  }

  // Load readiness & connected accounts when modal opens
  useEffect(() => {
    if (!isOpen) return

    let isMounted = true

    startReadinessTransition(async () => {
      const res = await getPublishingReadinessAction(contentId)
      if (!isMounted) return

      if (res.success && res.data) {
        setReadinessInfo(res.data)
        // Auto-select all connected platforms by default
        const connectedPlatforms = res.data.availableDestinations
          .filter((d) => d.isConnected)
          .map((d) => d.platform)
        setSelectedPlatforms(connectedPlatforms)
      } else {
        setReadinessError(res.error || 'Impossible de charger vos réseaux sociaux.')
      }
    })

    return () => {
      isMounted = false
    }
  }, [isOpen, contentId])

  if (!isOpen) return null

  const togglePlatform = (platform: PublishingDestinationPlatform) => {
    if (isSubmitting) return
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    )
  }

  const handleProceedToConfirm = () => {
    if (selectedPlatforms.length === 0) return
    setStep('CONFIRMATION')
  }

  const handleExecutePublish = async (platformsToPublish?: PublishingDestinationPlatform[]) => {
    const targets = platformsToPublish || selectedPlatforms
    if (targets.length === 0 || isSubmitting) return

    setIsSubmitting(true)
    setStep('PUBLISHING')

    try {
      const res = await publishContentImmediatelyAction({
        contentId,
        targetPlatforms: targets,
      })

      setPublishResult(res)
      setStep('RESULT')

      if (res.overallStatus === 'ALL_SUCCESS' && onPublishSuccess) {
        onPublishSuccess()
      }
    } catch {
      setPublishResult({
        success: false,
        overallStatus: 'ALL_FAILED',
        contentId,
        destinations: [],
        message: 'Impossible de publier pour le moment. Votre contenu est conservé dans Mūza.',
      })
      setStep('RESULT')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRetryFailedDestination = (platform: PublishingDestinationPlatform) => {
    handleExecutePublish([platform])
  }

  const connectedInstagram = readinessInfo?.availableDestinations.find(
    (d) => d.platform === 'INSTAGRAM' && d.isConnected
  )
  const connectedFacebook = readinessInfo?.availableDestinations.find(
    (d) => d.platform === 'FACEBOOK' && d.isConnected
  )

  const isInstagramSelected = selectedPlatforms.includes('INSTAGRAM')
  const isFacebookSelected = selectedPlatforms.includes('FACEBOOK')

  // Check Instagram visual requirement
  const isInstagramBlockedByVisual = isInstagramSelected && !hasVisual && !readinessInfo?.hasMedia

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-cream-border rounded-2xl max-w-md w-full p-4 sm:p-6 space-y-5 shadow-xl my-auto animate-in fade-in zoom-in-95 duration-150">
        
        {/* ================= STEP 1: SELECT NETWORKS ================= */}
        {step === 'SELECT_NETWORKS' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-cream-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-primary">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-ink">
                    Où voulez-vous publier ?
                  </h3>
                  <p className="text-[11px] text-ink-muted">
                    Sélectionnez les destinations pour votre publication
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 text-ink-muted hover:text-ink rounded-lg hover:bg-cream-subtle transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {loadingReadiness ? (
              <div className="py-12 flex flex-col items-center justify-center gap-2 text-center text-ink-muted">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span className="text-xs">Vérification de vos comptes connectés...</span>
              </div>
            ) : readinessError ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2 text-xs text-red-700">
                <div className="flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <span>{readinessError}</span>
                </div>
                <p className="text-[11px] text-red-600/80">
                  Assurez-vous que vos comptes sont bien configurés dans vos paramètres.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Instagram Option */}
                {connectedInstagram ? (
                  <label
                    onClick={() => togglePlatform('INSTAGRAM')}
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isInstagramSelected
                        ? 'bg-primary-light/40 border-primary shadow-2xs'
                        : 'bg-white border-cream-border hover:bg-cream-subtle/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center border border-pink-100">
                        <InstagramIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-ink">Instagram</span>
                          <Badge variant="ivory" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-800 border-emerald-200">
                            Connecté
                          </Badge>
                        </div>
                        <span className="text-[11px] text-ink-muted">
                          {connectedInstagram.accountName}
                        </span>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={isInstagramSelected}
                      onChange={() => {}} // Controlled by wrapper click
                      className="w-4 h-4 rounded text-primary border-cream-border focus:ring-primary"
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-dashed border-cream-border bg-cream-subtle/30 opacity-70">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-cream-subtle text-ink-muted flex items-center justify-center border border-cream-border">
                        <InstagramIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-ink">Instagram</span>
                          <span className="text-[10px] text-ink-muted">Non connecté</span>
                        </div>
                        <span className="text-[11px] text-ink-muted">
                          Connectez votre compte dans Paramètres &gt; Réseaux
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Facebook Option */}
                {connectedFacebook ? (
                  <label
                    onClick={() => togglePlatform('FACEBOOK')}
                    className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isFacebookSelected
                        ? 'bg-primary-light/40 border-primary shadow-2xs'
                        : 'bg-white border-cream-border hover:bg-cream-subtle/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                        <FacebookIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-ink">Facebook</span>
                          <Badge variant="ivory" className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-800 border-emerald-200">
                            Connecté
                          </Badge>
                        </div>
                        <span className="text-[11px] text-ink-muted">
                          {connectedFacebook.accountName}
                        </span>
                      </div>
                    </div>

                    <input
                      type="checkbox"
                      checked={isFacebookSelected}
                      onChange={() => {}} // Controlled by wrapper click
                      className="w-4 h-4 rounded text-primary border-cream-border focus:ring-primary"
                    />
                  </label>
                ) : (
                  <div className="flex items-center justify-between p-3.5 rounded-xl border border-dashed border-cream-border bg-cream-subtle/30 opacity-70">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-cream-subtle text-ink-muted flex items-center justify-center border border-cream-border">
                        <FacebookIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-ink">Facebook</span>
                          <span className="text-[10px] text-ink-muted">Non connecté</span>
                        </div>
                        <span className="text-[11px] text-ink-muted">
                          Connectez votre page dans Paramètres &gt; Réseaux
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Warning if Instagram selected without visual */}
                {isInstagramBlockedByVisual && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>
                      Instagram exige une image pour publier. Veuillez ajouter un visuel à votre publication ou décocher Instagram.
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Footer Actions */}
            <div className="pt-3 border-t border-cream-border flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="text-xs text-ink-muted"
              >
                Annuler
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={handleProceedToConfirm}
                disabled={
                  loadingReadiness ||
                  selectedPlatforms.length === 0 ||
                  isInstagramBlockedByVisual ||
                  (!connectedInstagram && !connectedFacebook)
                }
                className="gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs"
              >
                <span>Continuer</span>
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ================= STEP 2: CONFIRMATION ================= */}
        {step === 'CONFIRMATION' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-cream-border">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary-light flex items-center justify-center text-primary">
                  <Send className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-ink">
                    Publier maintenant ?
                  </h3>
                  <p className="text-[11px] text-ink-muted">
                    Confirmation avant envoi
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 text-ink-muted hover:text-ink rounded-lg hover:bg-cream-subtle transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-ink leading-relaxed">
                Votre publication sera envoyée immédiatement sur{' '}
                <span className="font-semibold">
                  {selectedPlatforms
                    .map((p) => (p === 'INSTAGRAM' ? 'Instagram' : 'Facebook'))
                    .join(' et ')}
                </span>
                .
              </p>

              {workingTitle && (
                <div className="bg-cream-subtle/80 border border-cream-border p-3 rounded-xl text-xs space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-ink-muted block">
                    Publication
                  </span>
                  <span className="font-medium text-ink">{workingTitle}</span>
                </div>
              )}

              <div className="text-[11px] text-ink-muted bg-primary-light/30 border border-primary-border/50 p-2.5 rounded-xl">
                ✦ Mūza s’occupe de la mise en ligne sécurisée auprès de vos réseaux sociaux.
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-cream-border flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setStep('SELECT_NETWORKS')}
                className="text-xs"
              >
                Retour
              </Button>

              <Button
                type="button"
                size="sm"
                onClick={() => handleExecutePublish()}
                disabled={isSubmitting}
                className="gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs"
              >
                <span>Publier</span>
                <Send className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}

        {/* ================= STEP 3: PUBLISHING (IN PROGRESS) ================= */}
        {step === 'PUBLISHING' && (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-primary-light flex items-center justify-center text-primary">
                <Send className="w-6 h-6 animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>

            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-ink">
                Publication en cours...
              </h3>
              <p className="text-xs text-ink-muted">
                Envoi vers{' '}
                {selectedPlatforms
                  .map((p) => (p === 'INSTAGRAM' ? 'Instagram' : 'Facebook'))
                  .join(' et ')}
              </p>
            </div>
          </div>
        )}

        {/* ================= STEP 4: RESULT ================= */}
        {step === 'RESULT' && publishResult && (
          <div className="space-y-4">
            {/* Case A: ALL SUCCESS */}
            {publishResult.overallStatus === 'ALL_SUCCESS' && (
              <div className="space-y-4">
                <div className="text-center space-y-2 pt-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-serif font-bold text-ink">
                    Publication réussie ✦
                  </h3>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    {publishResult.message}
                  </p>
                </div>

                {/* Destinations summary with external links if available */}
                <div className="space-y-2">
                  {publishResult.destinations.map((dest) => (
                    <div
                      key={dest.platform}
                      className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/50 border border-emerald-200/80 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        {dest.platform === 'INSTAGRAM' ? (
                          <InstagramIcon className="w-4 h-4 text-pink-600" />
                        ) : (
                          <FacebookIcon className="w-4 h-4 text-blue-600" />
                        )}
                        <span className="font-medium text-ink">
                          {dest.platform === 'INSTAGRAM' ? 'Instagram' : 'Facebook'}
                        </span>
                        <span className="text-ink-muted">({dest.accountName})</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-emerald-700 font-medium">Publié</span>
                        {dest.platformPostUrl && (
                          <a
                            href={dest.platformPostUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline ml-1"
                          >
                            <span>Voir</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-cream-border flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleClose}
                    className="bg-primary hover:bg-primary-hover text-white text-xs font-medium"
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            )}

            {/* Case B: PARTIAL SUCCESS */}
            {publishResult.overallStatus === 'PARTIAL_SUCCESS' && (
              <div className="space-y-4">
                <div className="text-center space-y-2 pt-2">
                  <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-100">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-serif font-bold text-ink">
                    Publication partiellement réussie
                  </h3>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    Une destination a été publiée avec succès, mais une autre n’a pas abouti.
                  </p>
                </div>

                {/* Destinations list */}
                <div className="space-y-2">
                  {publishResult.destinations.map((dest) => (
                    <div
                      key={dest.platform}
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs ${
                        dest.status === 'PUBLISHED'
                          ? 'bg-emerald-50/50 border-emerald-200/80'
                          : 'bg-red-50/50 border-red-200/80'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {dest.platform === 'INSTAGRAM' ? (
                          <InstagramIcon className="w-4 h-4 text-pink-600" />
                        ) : (
                          <FacebookIcon className="w-4 h-4 text-blue-600" />
                        )}
                        <span className="font-medium text-ink">
                          {dest.platform === 'INSTAGRAM' ? 'Instagram' : 'Facebook'}
                        </span>
                      </div>

                      {dest.status === 'PUBLISHED' ? (
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-700 font-medium">Publié</span>
                          {dest.platformPostUrl && (
                            <a
                              href={dest.platformPostUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline ml-1"
                            >
                              <span>Voir</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRetryFailedDestination(dest.platform)}
                          disabled={isSubmitting}
                          className="h-7 text-[11px] gap-1 text-red-700 border-red-200 hover:bg-red-50"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Réessayer {dest.platform === 'INSTAGRAM' ? 'Instagram' : 'Facebook'}</span>
                        </Button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="pt-3 border-t border-cream-border flex items-center justify-between">
                  <span className="text-[11px] text-ink-muted">
                    Votre brouillon reste préservé dans Mūza.
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="text-xs"
                  >
                    Fermer
                  </Button>
                </div>
              </div>
            )}

            {/* Case C: ALL FAILED */}
            {publishResult.overallStatus === 'ALL_FAILED' && (
              <div className="space-y-4">
                <div className="text-center space-y-2 pt-2">
                  <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-serif font-bold text-ink">
                    Impossible de publier pour le moment
                  </h3>
                  <p className="text-xs text-ink-muted leading-relaxed">
                    Votre contenu est précieusement conservé dans Mūza.
                  </p>
                </div>

                {publishResult.destinations.map((dest) => (
                  <div
                    key={dest.platform}
                    className="p-3 rounded-xl bg-red-50/60 border border-red-200 text-xs text-red-800 space-y-1"
                  >
                    <div className="flex items-center justify-between font-medium">
                      <span>{dest.platform === 'INSTAGRAM' ? 'Instagram' : 'Facebook'}</span>
                      <span className="text-[11px] text-red-600">Non publié</span>
                    </div>
                    {dest.errorMessage && (
                      <p className="text-[11px] text-red-700/80">
                        {dest.errorMessage}
                      </p>
                    )}
                  </div>
                ))}

                <div className="pt-3 border-t border-cream-border flex items-center justify-between">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClose}
                    className="text-xs"
                  >
                    Fermer
                  </Button>

                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleExecutePublish()}
                    disabled={isSubmitting}
                    className="gap-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Réessayer</span>
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
