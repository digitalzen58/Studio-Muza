'use client'

import React, { useState } from 'react'
import { Calendar, Clock, X } from 'lucide-react'

interface ScheduleContentModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (payload: {
    localDate: string
    localTime: string
    timeZone: string
  }) => Promise<void>
  contentTitle: string
  slideCount: number
  platform?: string
  initialScheduledAt?: string | null
  isPending?: boolean
}

export function ScheduleContentModal({
  isOpen,
  onClose,
  onConfirm,
  initialScheduledAt,
  isPending = false,
}: ScheduleContentModalProps) {
  // Resolve client timezone safely lazily or via state initializer
  const [timeZone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris'
    } catch {
      return 'Europe/Paris'
    }
  })
  
  const [localDate, setLocalDate] = useState(() => {
    if (initialScheduledAt) {
      try {
        const dateObj = new Date(initialScheduledAt)
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris'
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        }).formatToParts(dateObj)
        const y = parts.find((p) => p.type === 'year')?.value
        const m = parts.find((p) => p.type === 'month')?.value
        const d = parts.find((p) => p.type === 'day')?.value
        if (y && m && d) return `${y}-${m}-${d}`
      } catch {
        // fallback
      }
    }
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const y = tomorrow.getFullYear()
    const m = String(tomorrow.getMonth() + 1).padStart(2, '0')
    const d = String(tomorrow.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  })

  const [localTime, setLocalTime] = useState(() => {
    if (initialScheduledAt) {
      try {
        const dateObj = new Date(initialScheduledAt)
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris'
        const parts = new Intl.DateTimeFormat('en-US', {
          timeZone: tz,
          hour: '2-digit',
          minute: '2-digit',
          hourCycle: 'h23',
        }).formatToParts(dateObj)
        const h = parts.find((p) => p.type === 'hour')?.value
        const min = parts.find((p) => p.type === 'minute')?.value
        if (h && min) return `${h}:${min}`
      } catch {
        // fallback
      }
    }
    return '18:00'
  })

  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleConfirm = async () => {
    setError(null)
    if (!localDate) {
      setError('Veuillez sélectionner une date.')
      return
    }
    if (!localTime) {
      setError('Veuillez sélectionner une heure.')
      return
    }

    try {
      await onConfirm({ localDate, localTime, timeZone })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Impossible de planifier ce contenu.')
    }
  }

  // Calculate today's date in YYYY-MM-DD for min attribute
  const todayStr = new Date().toISOString().slice(0, 10)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
      <div className="bg-ivory-card border border-ivory-border rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="text-base font-serif font-bold text-ink">
              Quand voulez-vous publier ?
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="text-ink-muted hover:text-ink p-1 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Date & Time Selectors */}
        <div className="space-y-3 pt-1">
          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-medium text-ink">
              <Calendar className="w-3.5 h-3.5 text-terracotta" />
              <span>Date</span>
            </label>
            <input
              type="date"
              min={todayStr}
              value={localDate}
              onChange={(e) => setLocalDate(e.target.value)}
              disabled={isPending}
              className="w-full px-3 py-2 bg-white border border-ivory-border rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
            />
          </div>

          <div className="space-y-1">
            <label className="flex items-center gap-1.5 text-xs font-medium text-ink">
              <Clock className="w-3.5 h-3.5 text-terracotta" />
              <span>Heure</span>
            </label>
            <input
              type="time"
              value={localTime}
              onChange={(e) => setLocalTime(e.target.value)}
              disabled={isPending}
              className="w-full px-3 py-2 bg-white border border-ivory-border rounded-xl text-sm text-ink focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta"
            />

            {/* Quick time presets */}
            <div className="flex items-center gap-1.5 pt-1.5 flex-wrap">
              {['09:00', '12:30', '18:00', '19:30'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setLocalTime(preset)}
                  disabled={isPending}
                  className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full border transition-colors ${
                    localTime === preset
                      ? 'bg-terracotta text-white border-terracotta'
                      : 'bg-ivory-subtle border-ivory-border text-ink hover:border-terracotta/40'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
            {error}
          </p>
        )}

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="px-3.5 py-2 text-xs font-medium text-ink-muted hover:text-ink transition-colors disabled:opacity-50"
          >
            Retour
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-terracotta text-white hover:bg-terracotta-dark transition-colors shadow-xs disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {isPending ? 'Planification…' : 'Planifier'}
          </button>
        </div>
      </div>
    </div>
  )
}
