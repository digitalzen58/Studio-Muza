'use client'

import React, { useState, useTransition } from 'react'
import { Phone, Calendar, BookmarkCheck, Ban, Edit2, Check, Loader2 } from 'lucide-react'
import type { BusinessContactInfo } from '@/services/business-contact'
import type { ContentActionType } from '@/actions/content'
import { saveBusinessContactAction } from '@/actions/business-contact'

interface ConversionActionSelectorProps {
  businessId: string
  actionType: ContentActionType
  setActionType: (type: ContentActionType) => void
  actionDestination: string | null
  setActionDestination: (dest: string | null) => void
  actionIsOverride: boolean
  setActionIsOverride: (isOverride: boolean) => void
  businessContactInfo: BusinessContactInfo
  setBusinessContactInfo: (info: BusinessContactInfo) => void
  setIsDirty: (dirty: boolean) => void
}

export function ConversionActionSelector({
  businessId,
  actionType,
  setActionType,
  actionDestination,
  setActionDestination,
  actionIsOverride,
  setActionIsOverride,
  businessContactInfo,
  setBusinessContactInfo,
  setIsDirty,
}: ConversionActionSelectorProps) {
  const [isPending, startTransition] = useTransition()
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Determine current resolved destination
  const getBusinessDefault = (type: ContentActionType): string | null => {
    switch (type) {
      case 'PHONE':
        return businessContactInfo.phone
      case 'BOOKING':
        return businessContactInfo.bookingUrl
      case 'APPOINTMENT':
        return businessContactInfo.appointmentUrl
      default:
        return null
    }
  }

  const effectiveDestination =
    actionIsOverride && actionDestination
      ? actionDestination
      : getBusinessDefault(actionType) || actionDestination

  const handleSelectType = (type: ContentActionType) => {
    setActionType(type)
    setIsDirty(true)
    setIsEditing(false)
    setErrorMessage(null)

    if (type === 'NONE') {
      setActionDestination(null)
      setActionIsOverride(false)
    } else {
      const bizDefault = getBusinessDefault(type)
      if (bizDefault) {
        setActionDestination(bizDefault)
        setActionIsOverride(false)
      } else {
        setActionDestination(null)
        setActionIsOverride(false)
        setEditValue('')
      }
    }
  }

  const handleSaveMissingForBusiness = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editValue.trim()) return
    setErrorMessage(null)

    startTransition(async () => {
      const payload: Partial<BusinessContactInfo> = {}
      if (actionType === 'PHONE') payload.phone = editValue.trim()
      if (actionType === 'BOOKING') payload.bookingUrl = editValue.trim()
      if (actionType === 'APPOINTMENT') payload.appointmentUrl = editValue.trim()

      const res = await saveBusinessContactAction(businessId, payload)
      if (!res.success || !res.data) {
        setErrorMessage(res.message || 'Erreur lors de l’enregistrement.')
        return
      }

      setBusinessContactInfo(res.data)
      setActionDestination(editValue.trim())
      setActionIsOverride(false)
      setIsDirty(true)
      setIsEditing(false)
    })
  }

  const handleSaveOverrideForPost = () => {
    if (!editValue.trim()) return
    setActionDestination(editValue.trim())
    setActionIsOverride(true)
    setIsDirty(true)
    setIsEditing(false)
  }

  const handleSaveUpdateForBusiness = () => {
    if (!editValue.trim()) return
    setErrorMessage(null)

    startTransition(async () => {
      const payload: Partial<BusinessContactInfo> = {}
      if (actionType === 'PHONE') payload.phone = editValue.trim()
      if (actionType === 'BOOKING') payload.bookingUrl = editValue.trim()
      if (actionType === 'APPOINTMENT') payload.appointmentUrl = editValue.trim()

      const res = await saveBusinessContactAction(businessId, payload)
      if (!res.success || !res.data) {
        setErrorMessage(res.message || 'Erreur lors de la mise à jour.')
        return
      }

      setBusinessContactInfo(res.data)
      setActionDestination(editValue.trim())
      setActionIsOverride(false)
      setIsDirty(true)
      setIsEditing(false)
    })
  }

  return (
    <div className="space-y-3 pt-4 border-t border-cream-border/60">
      <div className="space-y-0.5">
        <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
          Que voulez-vous que les gens fassent ?
        </label>
        <p className="text-[11px] text-ink-muted">
          Choisissez l&apos;action souhaitée pour cette publication.
        </p>
      </div>

      {/* Action choices buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <button
          type="button"
          onClick={() => handleSelectType('NONE')}
          className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
            actionType === 'NONE'
              ? 'bg-primary text-white border-primary shadow-xs'
              : 'bg-white text-ink border-cream-border hover:border-primary/40'
          }`}
        >
          <Ban className="w-3.5 h-3.5" />
          <span>Rien</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectType('PHONE')}
          className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
            actionType === 'PHONE'
              ? 'bg-primary text-white border-primary shadow-xs'
              : 'bg-white text-ink border-cream-border hover:border-primary/40'
          }`}
        >
          <Phone className="w-3.5 h-3.5" />
          <span>Appeler</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectType('BOOKING')}
          className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
            actionType === 'BOOKING'
              ? 'bg-primary text-white border-primary shadow-xs'
              : 'bg-white text-ink border-cream-border hover:border-primary/40'
          }`}
        >
          <BookmarkCheck className="w-3.5 h-3.5" />
          <span>Réserver</span>
        </button>

        <button
          type="button"
          onClick={() => handleSelectType('APPOINTMENT')}
          className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-medium border transition-all ${
            actionType === 'APPOINTMENT'
              ? 'bg-primary text-white border-primary shadow-xs'
              : 'bg-white text-ink border-cream-border hover:border-primary/40'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Prendre RDV</span>
        </button>
      </div>

      {/* Confirmation & Missing Info Handling */}
      {actionType !== 'NONE' && (
        <div className="p-3.5 bg-cream-subtle/80 border border-cream-border rounded-xl space-y-2">
          {errorMessage && (
            <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {errorMessage}
            </div>
          )}

          {/* Case 1: Destination exists and not editing -> Human Confirmation */}
          {effectiveDestination && !isEditing ? (
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-ink space-y-0.5">
                <span className="text-ink-muted block text-[11px]">
                  {actionType === 'PHONE'
                    ? 'Numéro appelé :'
                    : 'Les personnes seront dirigées vers :'}
                </span>
                <span className="font-medium text-ink break-all">
                  {effectiveDestination}
                </span>
                {actionIsOverride && (
                  <span className="inline-block ml-1.5 px-1.5 py-0.5 bg-primary-light text-primary text-[10px] rounded font-medium">
                    Pour cette publication
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={() => {
                  setEditValue(effectiveDestination)
                  setIsEditing(true)
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-ink bg-white border border-cream-border rounded-lg hover:border-primary/40 transition-colors shrink-0 shadow-2xs"
              >
                <Edit2 className="w-3 h-3 text-ink-muted" />
                <span>Modifier</span>
              </button>
            </div>
          ) : null}

          {/* Case 2: Destination missing -> Prompt to save once for business (Stacked full-width mobile-first) */}
          {!effectiveDestination && !isEditing ? (
            <form onSubmit={handleSaveMissingForBusiness} className="space-y-2.5">
              <label className="block text-xs font-medium text-ink">
                {actionType === 'PHONE' && 'Quel est votre numéro de téléphone ?'}
                {actionType === 'BOOKING' && 'Quel est votre lien de réservation ?'}
                {actionType === 'APPOINTMENT' && 'Quel est votre lien de rendez-vous ?'}
              </label>

              <div className="flex flex-col gap-2">
                <input
                  type={actionType === 'PHONE' ? 'tel' : 'url'}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder={
                    actionType === 'PHONE'
                      ? 'Ex: 06 12 34 56 78'
                      : 'Ex: https://mon-etablissement.fr/reservation'
                  }
                  required
                  className="w-full px-3 py-2.5 bg-white border border-cream-border rounded-xl text-xs text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />

                <button
                  type="submit"
                  disabled={isPending || !editValue.trim()}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-primary text-white rounded-xl text-xs font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors shadow-2xs"
                >
                  {isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>Enregistrer pour mon activité</span>
                </button>
              </div>
            </form>
          ) : null}

          {/* Case 3: Editing existing destination -> Choose Override vs Business update */}
          {isEditing && (
            <div className="space-y-3 pt-1">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-ink">
                  Modifier la destination :
                </label>
                <input
                  type={actionType === 'PHONE' ? 'tel' : 'url'}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder={
                    actionType === 'PHONE'
                      ? 'Ex: 06 12 34 56 78'
                      : 'Ex: https://...'
                  }
                  className="w-full px-3 py-2.5 bg-white border border-cream-border rounded-xl text-xs text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSaveOverrideForPost}
                  disabled={isPending || !editValue.trim()}
                  className="w-full sm:w-auto px-3 py-2 bg-white border border-cream-border hover:border-primary/50 text-ink rounded-xl text-xs font-medium transition-colors text-center shadow-2xs"
                >
                  Pour cette publication
                </button>

                <button
                  type="button"
                  onClick={handleSaveUpdateForBusiness}
                  disabled={isPending || !editValue.trim()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1 px-3 py-2 bg-primary text-white rounded-xl text-xs font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors text-center shadow-2xs"
                >
                  {isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  <span>Pour mon activité</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false)
                    setErrorMessage(null)
                  }}
                  className="px-2 py-1.5 text-xs text-ink-muted hover:text-ink transition-colors sm:ml-auto text-center"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
