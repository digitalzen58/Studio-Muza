'use client'

import React from 'react'
import { AlertCircle, AlertTriangle, ArrowRight, X } from 'lucide-react'
import type { ReadinessIssue } from '@/services/content-readiness/types'

interface ContentReadinessModalProps {
  isOpen: boolean
  onClose: () => void
  blockingIssues: ReadinessIssue[]
  warnings: ReadinessIssue[]
  onSelectIssue?: (issue: ReadinessIssue) => void
  onProceedAnyway?: () => void
}

export function ContentReadinessModal({
  isOpen,
  onClose,
  blockingIssues,
  warnings,
  onSelectIssue,
  onProceedAnyway,
}: ContentReadinessModalProps) {
  if (!isOpen) return null

  const hasBlocking = blockingIssues.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
      <div className="bg-white border border-cream-border rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-serif font-bold text-ink">
              Encore une petite chose ✦
            </h3>
            <p className="text-xs text-ink-muted">
              {hasBlocking
                ? 'Pour que votre contenu soit prêt à être programmé :'
                : 'Votre contenu peut être planifié, mais voici quelques suggestions :'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ink-muted hover:text-ink p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Blocking Issues */}
        {blockingIssues.length > 0 && (
          <div className="space-y-2">
            {blockingIssues.map((issue) => (
              <div
                key={issue.id}
                onClick={() => {
                  onSelectIssue?.(issue)
                  onClose()
                }}
                className="flex items-center justify-between p-3 bg-red-50/80 border border-red-200/80 rounded-xl text-xs text-red-900 cursor-pointer hover:bg-red-100/80 transition-colors group"
              >
                <div className="flex items-center gap-2 pr-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span className="font-medium">{issue.message}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-red-600 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </div>
            ))}
          </div>
        )}

        {/* Non-blocking Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-2">
            {warnings.map((warning) => (
              <div
                key={warning.id}
                onClick={() => {
                  onSelectIssue?.(warning)
                  onClose()
                }}
                className="flex items-center justify-between p-3 bg-amber-50/70 border border-amber-200/70 rounded-xl text-xs text-amber-900 cursor-pointer hover:bg-amber-100/70 transition-colors group"
              >
                <div className="flex items-center gap-2 pr-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="font-medium">{warning.message}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-amber-700 shrink-0 group-hover:translate-x-0.5 transition-transform" />
              </div>
            ))}
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-between gap-2 border-t border-cream-border/60">
          {hasBlocking ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-ink-muted hover:text-ink transition-colors"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors shadow-xs"
              >
                Je complète
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 text-xs font-medium text-ink-muted hover:text-ink transition-colors"
              >
                Je complète
              </button>
              {onProceedAnyway && (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onProceedAnyway()
                  }}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors shadow-xs"
                >
                  Planifier quand même
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
