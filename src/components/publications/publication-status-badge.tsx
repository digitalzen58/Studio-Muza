'use client'

import React from 'react'
import type { PublicationStatus } from '@/services/publication-history/types'
import { mapPublicationStatusLabel } from '@/services/publication-history/types'
import { CheckCircle2, Clock, AlertCircle } from 'lucide-react'

interface PublicationStatusBadgeProps {
  status: PublicationStatus
}

export function PublicationStatusBadge({ status }: PublicationStatusBadgeProps) {
  const label = mapPublicationStatusLabel(status)

  if (status === 'PUBLISHED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 className="w-3 h-3" />
        <span>{label}</span>
      </span>
    )
  }

  if (status === 'SCHEDULED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-primary-light text-primary border border-primary-border/60">
        <Clock className="w-3 h-3" />
        <span>{label}</span>
      </span>
    )
  }

  if (status === 'FAILED') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 border border-rose-200">
        <AlertCircle className="w-3 h-3" />
        <span>{label}</span>
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-white text-ink-muted border border-cream-border">
      <span>{label}</span>
    </span>
  )
}
