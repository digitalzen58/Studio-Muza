'use client'

import React, { useState } from 'react'
import { Sparkles, Loader2, Check, AlertCircle, RotateCcw, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { WritingOperation, WritingTargetType } from '@/services/ai-assistance/types'

export interface WritingAssistancePanelProps {
  operation: WritingOperation
  targetType: WritingTargetType
  targetIndex?: number
  options: string[]
  isPending: boolean
  error: string | null
  originalTextHash?: string
  currentEditorText: string
  onApply: (selectedText: string) => void
  onRetry: () => void
  onDismiss: () => void
}

export function WritingAssistancePanel({
  operation,
  options,
  isPending,
  error,
  originalTextHash,
  currentEditorText,
  onApply,
  onRetry,
  onDismiss,
}: WritingAssistancePanelProps) {
  const [stalePendingText, setStalePendingText] = useState<string | null>(null)

  // Fast simple hash check matching server algorithm
  const computeHash = (text: string) => {
    let hash = 0
    const str = text.trim()
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i)
      hash |= 0
    }
    return Math.abs(hash).toString(16).slice(0, 12)
  }

  const handleSelectOption = (text: string) => {
    // Stale text check: If hash is provided, compare length and content
    // Note: If user modified text while request was in flight, confirm before replacing
    if (originalTextHash && originalTextHash !== 'empty' && currentEditorText.trim() !== '') {
      const currentHash = computeHash(currentEditorText)
      // Check if user edited noticeably
      if (currentHash !== originalTextHash && stalePendingText === null) {
        setStalePendingText(text)
        return
      }
    }

    onApply(text)
    setStalePendingText(null)
  }

  const handleConfirmStaleReplace = () => {
    if (stalePendingText) {
      onApply(stalePendingText)
      setStalePendingText(null)
    }
  }

  // 1. Loading State
  if (isPending) {
    return (
      <div className="mt-2 p-3.5 bg-primary-light/40 border border-primary-border/60 rounded-xl flex items-center justify-between animate-in fade-in duration-150 shadow-2xs">
        <div className="flex items-center gap-2.5 text-xs text-primary-dark font-medium">
          <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
          <span>✦ Mūza prépare une suggestion…</span>
        </div>
        <span className="text-[10px] text-ink-muted">Patience, zéro raccourci IA</span>
      </div>
    )
  }

  // 2. Error State
  if (error) {
    return (
      <div className="mt-2 p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl space-y-2.5 animate-in fade-in duration-150 shadow-2xs">
        <div className="flex items-start gap-2 text-xs text-amber-950">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">{error}</p>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-200/50">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-7 px-2.5 text-xs text-ink-muted hover:text-ink"
          >
            Fermer
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="h-7 px-3 text-xs gap-1.5 border-amber-300 text-amber-950 hover:bg-amber-100"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Réessayer ✦</span>
          </Button>
        </div>
      </div>
    )
  }

  // 3. Stale Text Warning Dialog Inline
  if (stalePendingText !== null) {
    return (
      <div className="mt-2 p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2.5 animate-in fade-in duration-150 shadow-xs">
        <div className="flex items-start gap-2 text-xs text-amber-950 font-medium">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-900">Vous avez modifié votre texte entre-temps.</p>
            <p className="text-[11px] text-amber-800 leading-relaxed font-normal">
              Voulez-vous remplacer vos modifications manuelles par la suggestion de Mūza ?
            </p>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setStalePendingText(null)}
            className="h-7 px-2.5 text-xs text-ink"
          >
            Garder mon texte
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleConfirmStaleReplace}
            className="h-7 px-3 text-xs bg-primary hover:bg-primary-hover text-white font-medium"
          >
            Utiliser la suggestion
          </Button>
        </div>
      </div>
    )
  }

  // 4. No options available
  if (!options || options.length === 0) {
    return null
  }

  // 5. Hooks Selection (Multiple Options)
  if (operation === 'SUGGEST_HOOKS') {
    return (
      <div className="mt-2 p-3.5 bg-white border border-primary-border/60 rounded-xl shadow-xs space-y-3 animate-in fade-in duration-150">
        <div className="flex items-center justify-between pb-1 border-b border-cream-border/60">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Mūza vous propose 3 accroches :</span>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="text-ink-muted hover:text-ink p-1 rounded-md"
            aria-label="Fermer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-2">
          {options.map((hookText, idx) => (
            <div
              key={idx}
              className="group p-2.5 rounded-lg border border-cream-border bg-cream-subtle/40 hover:border-primary/40 hover:bg-primary-light/20 transition-all flex items-center justify-between gap-2.5"
            >
              <p className="text-xs text-ink leading-relaxed flex-1 italic">
                « {hookText} »
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => handleSelectOption(hookText)}
                className="h-7 px-3 text-xs bg-primary hover:bg-primary-hover text-white shrink-0 font-medium gap-1"
              >
                <Check className="w-3 h-3" />
                <span>Utiliser</span>
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-cream-border/60">
          <button
            type="button"
            onClick={onRetry}
            className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Réessayer ✦</span>
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="text-[11px] text-ink-muted hover:text-ink"
          >
            Annuler
          </button>
        </div>
      </div>
    )
  }

  // 6. Single Text Suggestion (HELP_WRITE, IMPROVE_TEXT, SHORTEN_TEXT)
  const suggestionText = options[0] || ''

  return (
    <div className="mt-2 p-3.5 bg-white border border-primary-border/60 rounded-xl shadow-xs space-y-2.5 animate-in fade-in duration-150">
      <div className="flex items-center justify-between pb-1 border-b border-cream-border/60">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Mūza vous propose :</span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-ink-muted hover:text-ink p-1 rounded-md"
          aria-label="Fermer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <p className="text-xs text-ink leading-relaxed p-2.5 bg-cream-subtle/50 rounded-lg border border-cream-border/60 italic">
        {suggestionText}
      </p>

      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={onRetry}
          className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Réessayer ✦</span>
        </button>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-7 px-2.5 text-xs text-ink-muted hover:text-ink"
          >
            Annuler
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => handleSelectOption(suggestionText)}
            className="h-7 px-3 text-xs bg-primary hover:bg-primary-hover text-white font-medium gap-1"
          >
            <Check className="w-3 h-3" />
            <span>Utiliser cette version</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
