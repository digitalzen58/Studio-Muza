'use client'

import React, { useState, useEffect, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Save,
  Check,
  AlertCircle,
  Calendar as CalendarIcon,
  Eye,
  Trash2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  saveContentDraftAction,
  deleteContentDraftAction,
  type CarouselSlideData,
  type SaveContentDraftPayload,
} from '@/actions/content'
import { MediaPickerModal } from './media-picker-modal'
import { StockMediaModal } from './stock-media-modal'
import { ContentReadinessModal } from './content-readiness-modal'
import { ScheduleContentModal } from './schedule-content-modal'
import { ContentPreviewModal } from './content-preview-modal'
import { PostEditor } from './post-editor'
import { CarouselEditor } from './carousel-editor'
import { requestWritingAssistanceAction } from '@/actions/ai-assistance'
import { validateCarouselReadiness } from '@/services/content-readiness/carousel-readiness'
import { validatePostReadiness } from '@/services/content-readiness/post-readiness'
import { scheduleContentAction, cancelScheduledContentAction } from '@/actions/scheduling'
import {
  type VisualComposition,
  createDefaultVisualComposition,
} from '@/services/visual-composition/types'
import type { ReadinessIssue, ContentReadinessResult } from '@/services/content-readiness/types'
import type { WritingOperation, WritingTargetType } from '@/services/ai-assistance/types'
import type { BrandMediaAsset } from '@/services/media'
import type { BusinessContactInfo } from '@/services/business-contact'
import type { ContentActionType } from '@/actions/content'

export interface ContentStudioProps {
  content: {
    id: string
    business_id: string
    recommendation_id: string | null
    status: string
    topic: string | null
    hook: string | null
    body: string | null
    cta: string | null
    scheduled_at: string | null
    title?: string | null
    created_at: string
    updated_at: string | null
  }
  variant?: {
    id: string
    format: string | null
    platform: string
    title: string | null
    hook: string | null
    caption: string | null
    cta: string | null
    hashtags: unknown
    keywords: unknown
    metadata: {
      slides?: CarouselSlideData[]
      primary_media_id?: string | null
      media_id?: string | null
      visual_composition?: VisualComposition | null
      action?: {
        type?: ContentActionType
        destination?: string | null
        is_override?: boolean
      } | null
    } | null
  } | null
  recommendation?: {
    id: string
    title: string
    concept: string | null
    angle: string | null
    cta: string | null
    suggested_formats: string[] | null
  } | null
  initialMediaAssets?: BrandMediaAsset[]
  initialContactInfo?: BusinessContactInfo
}

interface ActiveAssistanceState {
  targetType: WritingTargetType
  targetIndex?: number
  operation: WritingOperation
  isPending: boolean
  options: string[]
  error: string | null
  originalTextHash?: string
}

export function ContentStudio({
  content,
  variant,
  recommendation,
  initialMediaAssets = [],
  initialContactInfo,
}: ContentStudioProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Business Contact Info state
  const initialContactInfoState: BusinessContactInfo = initialContactInfo || {
    phone: null,
    bookingUrl: null,
    appointmentUrl: null,
  }
  const [businessContactInfo, setBusinessContactInfo] =
    useState<BusinessContactInfo>(initialContactInfoState)

  // Determine creation format deterministically
  const isCarousel =
    variant?.format === 'CAROUSEL' ||
    (variant?.metadata?.slides && Array.isArray(variant.metadata.slides) && variant.metadata.slides.length > 0)
  const format: 'POST' | 'CAROUSEL' = isCarousel ? 'CAROUSEL' : 'POST'

  // Conversion Action State (Que voulez-vous que les gens fassent ?)
  const rawAction = variant?.metadata?.action
  let defaultActionType: ContentActionType = 'NONE'
  let defaultActionDestination: string | null = null
  let defaultActionIsOverride = false

  if (rawAction?.type) {
    defaultActionType = rawAction.type
    defaultActionDestination = rawAction.destination || null
    defaultActionIsOverride = Boolean(rawAction.is_override)
  } else if (content.cta || variant?.cta || recommendation?.cta) {
    const rawCta = (content.cta || variant?.cta || recommendation?.cta || '').toLowerCase()
    if (rawCta.includes('appel') || rawCta.includes('téléphon') || rawCta.includes('06') || rawCta.includes('07')) {
      defaultActionType = 'PHONE'
      defaultActionDestination = initialContactInfoState.phone
    } else if (rawCta.includes('réserv') || rawCta.includes('booking')) {
      defaultActionType = 'BOOKING'
      defaultActionDestination = initialContactInfoState.bookingUrl
    } else if (rawCta.includes('rendez-vous') || rawCta.includes('rdv') || rawCta.includes('calendly')) {
      defaultActionType = 'APPOINTMENT'
      defaultActionDestination = initialContactInfoState.appointmentUrl
    }
  }

  const [actionType, setActionType] = useState<ContentActionType>(defaultActionType)
  const [actionDestination, setActionDestination] = useState<string | null>(defaultActionDestination)
  const [actionIsOverride, setActionIsOverride] = useState<boolean>(defaultActionIsOverride)

  // Media state
  const [mediaAssets, setMediaAssets] = useState<BrandMediaAsset[]>(initialMediaAssets)
  const [mediaPickerOpen, setMediaPickerOpen] = useState(false)
  const [stockModalOpen, setStockModalOpen] = useState(false)

  // Primary media & Visual Composition for POST format
  const rawVisualComp = variant?.metadata?.visual_composition as VisualComposition | undefined
  const initialPrimaryMediaId =
    rawVisualComp?.background?.type === 'IMAGE' && rawVisualComp.background.mediaAssetId
      ? rawVisualComp.background.mediaAssetId
      : variant?.metadata?.primary_media_id ||
        variant?.metadata?.media_id ||
        null
  const [primaryMediaId, setPrimaryMediaId] = useState<string | null>(initialPrimaryMediaId)

  const initialPrimaryMediaUrl = initialPrimaryMediaId
    ? initialMediaAssets.find((m) => m.id === initialPrimaryMediaId)?.url || null
    : null

  const initialComposition: VisualComposition = React.useMemo(() => {
    if (rawVisualComp) {
      if (rawVisualComp.background?.type === 'IMAGE') {
        const bgAssetId = rawVisualComp.background.mediaAssetId || initialPrimaryMediaId
        const freshUrl = bgAssetId
          ? initialMediaAssets.find((m) => m.id === bgAssetId)?.url || null
          : null
        return {
          ...rawVisualComp,
          background: {
            ...rawVisualComp.background,
            mediaAssetId: bgAssetId,
            mediaUrl: freshUrl || rawVisualComp.background.mediaUrl || null,
          },
        }
      }
      return rawVisualComp
    }

    return createDefaultVisualComposition(initialPrimaryMediaId, initialPrimaryMediaUrl)
  }, [rawVisualComp, initialPrimaryMediaId, initialPrimaryMediaUrl, initialMediaAssets])

  const [visualComposition, setVisualComposition] = useState<VisualComposition>(initialComposition)

  // Synchronize visualComposition background mediaUrl when mediaAssets list updates
  useEffect(() => {
    if (visualComposition.background.type === 'IMAGE' && visualComposition.background.mediaAssetId) {
      const currentAsset = mediaAssets.find((m) => m.id === visualComposition.background.mediaAssetId)
      if (currentAsset?.url && currentAsset.url !== visualComposition.background.mediaUrl) {
        setVisualComposition((prev) => ({
          ...prev,
          background: {
            ...prev.background,
            mediaUrl: currentAsset.url,
          },
        }))
      }
    }
  }, [mediaAssets, visualComposition.background.type, visualComposition.background.mediaAssetId, visualComposition.background.mediaUrl])

  // AI Writing Assistance state
  const [assistanceState, setAssistanceState] = useState<ActiveAssistanceState | null>(null)

  // Form states
  const [workingTitle, setWorkingTitle] = useState(
    content.topic || variant?.title || recommendation?.title || ''
  )
  const [hook, setHook] = useState(content.hook || '')
  const [caption, setCaption] = useState(variant?.caption || content.body || '')
  const [cta, setCta] = useState(content.cta || variant?.cta || recommendation?.cta || '')

  // Carousel slide state
  const initialSlides: CarouselSlideData[] =
    variant?.metadata?.slides && Array.isArray(variant.metadata.slides) && variant.metadata.slides.length > 0
      ? (variant.metadata.slides as CarouselSlideData[])
      : [
          { index: 1, type: 'COVER', label: 'Couverture', text: '', media_id: null },
          { index: 2, type: 'SLIDE', label: 'Balade 1', text: '', media_id: null },
          { index: 3, type: 'SLIDE', label: 'Balade 2', text: '', media_id: null },
          { index: 4, type: 'SLIDE', label: 'Balade 3', text: '', media_id: null },
          { index: 5, type: 'CTA', label: 'Conclusion / CTA', text: '', media_id: null },
        ]

  const [slides, setSlides] = useState<CarouselSlideData[]>(initialSlides)
  const [activeSlideIndex, setActiveSlideIndex] = useState(1)

  // Save status
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // Scheduling state
  const [currentStatus, setCurrentStatus] = useState(content.status)
  const [currentScheduledAt, setCurrentScheduledAt] = useState<string | null>(content.scheduled_at || null)
  const [previewModalOpen, setPreviewModalOpen] = useState(false)
  const [readinessModalOpen, setReadinessModalOpen] = useState(false)
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [blockingIssues, setBlockingIssues] = useState<ReadinessIssue[]>([])
  const [readinessWarnings, setReadinessWarnings] = useState<ReadinessIssue[]>([])
  const [isScheduling, setIsScheduling] = useState(false)
  const [schedulingFeedback, setSchedulingFeedback] = useState<string | null>(null)

  // Warn on accidental tab close / reload if unsaved changes exist
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  // Textarea comfort: auto-growing with minimum visible lines and max height
  const slideTextareaRef = useRef<HTMLTextAreaElement>(null)
  const captionTextareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = slideTextareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const minH = 160
    const maxH = 260
    const scrollH = el.scrollHeight
    const targetH = Math.min(Math.max(scrollH, minH), maxH)
    el.style.height = `${targetH}px`
    el.style.overflowY = scrollH > maxH ? 'auto' : 'hidden'
  }, [activeSlideIndex, slides])

  useEffect(() => {
    const el = captionTextareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const minH = 160
    const maxH = 320
    const scrollH = el.scrollHeight
    const targetH = Math.min(Math.max(scrollH, minH), maxH)
    el.style.height = `${targetH}px`
    el.style.overflowY = scrollH > maxH ? 'auto' : 'hidden'
  }, [caption])

  const activeSlide = slides.find((s) => s.index === activeSlideIndex) || slides[0]

  const handleAssignSlideMedia = (asset: BrandMediaAsset) => {
    if (format === 'POST') {
      setPrimaryMediaId(asset.id)
      setVisualComposition((prev) => ({
        ...prev,
        background: {
          type: 'IMAGE',
          mediaAssetId: asset.id,
          mediaUrl: asset.url,
          positionX: 0,
          positionY: 0,
          scale: 1.0,
        },
      }))
    } else {
      setSlides((prev) =>
        prev.map((s) => (s.index === activeSlideIndex ? { ...s, media_id: asset.id } : s))
      )
    }
    setIsDirty(true)
  }

  const handleMediaUploaded = (newAsset: BrandMediaAsset) => {
    setMediaAssets((prev) => [newAsset, ...prev])
  }

  const handleStockMediaImported = (importedAsset: BrandMediaAsset) => {
    setMediaAssets((prev) => [
      importedAsset,
      ...prev.filter((a) => a.id !== importedAsset.id),
    ])
  }

  const executeSave = async () => {
    setSaveStatus('idle')
    setErrorMessage(null)

    const effectivePrimaryMediaId =
      format === 'POST'
        ? visualComposition.background.type === 'IMAGE'
          ? visualComposition.background.mediaAssetId || primaryMediaId
          : null
        : null

    const effectiveAction =
      format === 'POST'
        ? {
            type: actionType,
            destination: actionDestination,
            is_override: actionIsOverride,
          }
        : undefined

    const payload: SaveContentDraftPayload = {
      contentId: content.id,
      workingTitle,
      caption,
      cta,
      ...(format === 'CAROUSEL'
        ? { hook, slides }
        : {
            primaryMediaId: effectivePrimaryMediaId,
            visualComposition,
            action: effectiveAction,
          }),
    }

    const res = await saveContentDraftAction(payload)

    if (!res.success) {
      setSaveStatus('error')
      setErrorMessage(res.message)
      throw new Error(res.message)
    }

    setIsDirty(false)
    setSaveStatus('saved')
    setTimeout(() => {
      setSaveStatus('idle')
    }, 3000)
  }

  const handleSave = () => {
    startTransition(async () => {
      try {
        await executeSave()
      } catch {
        // Error state already set inside executeSave
      }
    })
  }

  const handleBack = () => {
    startTransition(async () => {
      if (isDirty) {
        try {
          await executeSave()
        } catch (err) {
          console.error('Failed to auto-save before back navigation:', err)
        }
      }
      router.push('/app')
    })
  }

  const handleRequestAssistance = async (
    targetType: WritingTargetType,
    operation: WritingOperation,
    slideIndex?: number
  ) => {
    if (assistanceState?.isPending) return

    setAssistanceState({
      targetType,
      targetIndex: slideIndex,
      operation,
      isPending: true,
      options: [],
      error: null,
    })

    const targetText =
      targetType === 'HOOK'
        ? hook
        : targetType === 'CAROUSEL_SLIDE'
        ? activeSlide?.text || ''
        : caption

    try {
      const res = await requestWritingAssistanceAction({
        contentId: content.id,
        targetType,
        targetIndex: slideIndex,
        operation,
        currentText: targetText,
      })

      if (res.success) {
        setAssistanceState({
          targetType,
          targetIndex: slideIndex,
          operation,
          isPending: false,
          options: res.options,
          error: null,
          originalTextHash: res.originalTextHash,
        })
      } else {
        setAssistanceState((prev) =>
          prev
            ? {
                ...prev,
                isPending: false,
                error: res.message,
              }
            : null
        )
      }
    } catch (err: unknown) {
      setAssistanceState((prev) =>
        prev
          ? {
              ...prev,
              isPending: false,
              error: err instanceof Error ? err.message : 'Une erreur inattendue est survenue.',
            }
          : null
      )
    }
  }

  const handlePlanifierClick = async () => {
    if (isDirty) {
      await executeSave()
    }

    let readiness: ContentReadinessResult
    if (format === 'CAROUSEL') {
      readiness = validateCarouselReadiness({
        workingTitle,
        hook,
        slides,
        caption,
        cta,
      })
    } else {
      readiness = validatePostReadiness({
        workingTitle,
        body: caption,
        primaryMediaId,
        visualComposition,
        cta,
      })
    }

    setBlockingIssues(readiness.blockingIssues)
    setReadinessWarnings(readiness.warnings)

    if (!readiness.ready) {
      setReadinessModalOpen(true)
    } else {
      setScheduleModalOpen(true)
    }
  }

  const handleConfirmSchedule = async (payload: {
    localDate: string
    localTime: string
    timeZone: string
  }) => {
    setIsScheduling(true)
    try {
      const res = await scheduleContentAction({
        contentId: content.id,
        localDate: payload.localDate,
        localTime: payload.localTime,
        timeZone: payload.timeZone,
      })

      if (res.success) {
        setCurrentStatus('SCHEDULED')
        setCurrentScheduledAt(res.scheduledAt)
        setScheduleModalOpen(false)
        setSchedulingFeedback('Contenu planifié avec succès dans le calendrier.')
        setTimeout(() => setSchedulingFeedback(null), 5000)
      } else {
        throw new Error(res.message)
      }
    } finally {
      setIsScheduling(false)
    }
  }

  const handleConfirmCancelSchedule = async () => {
    setIsScheduling(true)
    try {
      const res = await cancelScheduledContentAction({ contentId: content.id })
      if (res.success) {
        setCurrentStatus('DRAFT')
        setCurrentScheduledAt(null)
        setCancelConfirmOpen(false)
        setSchedulingFeedback('La programmation a été annulée. Votre contenu est de retour dans vos brouillons.')
        setTimeout(() => setSchedulingFeedback(null), 5000)
      } else {
        setErrorMessage(res.message)
      }
    } finally {
      setIsScheduling(false)
    }
  }

  const handleConfirmDeleteDraft = async () => {
    setIsDeleting(true)
    try {
      const res = await deleteContentDraftAction(content.id)
      if (res.success) {
        setDeleteConfirmOpen(false)
        router.push('/app')
      } else {
        setErrorMessage(res.message)
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Erreur lors de la suppression du brouillon.')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleSelectIssue = (issue: ReadinessIssue) => {
    if (format === 'CAROUSEL' && issue.targetType === 'SLIDES' && typeof issue.targetIndex === 'number') {
      setActiveSlideIndex(issue.targetIndex)
    }
  }

  const formatScheduledDateString = (isoString: string): string => {
    try {
      const d = new Date(isoString)
      const formatted = new Intl.DateTimeFormat('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
      }).format(d)
      return `Prévu ${formatted}`
    } catch {
      return 'Planifié'
    }
  }

  const selectedPrimaryMedia = primaryMediaId
    ? mediaAssets.find((m) => m.id === primaryMediaId)
    : null

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Studio Header */}
      <header className="flex items-center justify-between gap-3 border-b border-cream-border/80 pb-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={isPending || isScheduling || isDeleting}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-white border border-cream-border text-ink hover:text-primary hover:border-primary/30 transition-colors shadow-2xs disabled:opacity-50"
            title={isDirty ? 'Enregistrer et retourner aux idées' : 'Retour aux idées'}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-serif font-bold text-ink">Studio Mūza</h1>
              {currentStatus === 'SCHEDULED' ? (
                <Badge variant="ivory" className="text-[11px] font-semibold tracking-wide bg-emerald-50 text-emerald-800 border-emerald-200">
                  Planifié
                </Badge>
              ) : (
                <Badge variant="ivory" className="text-[11px] font-normal tracking-wide">
                  Brouillon
                </Badge>
              )}
            </div>
            <p className="text-xs text-ink-muted">
              {currentStatus === 'SCHEDULED' && currentScheduledAt
                ? formatScheduledDateString(currentScheduledAt)
                : isDirty
                ? 'Modifications en cours'
                : 'Édition manuelle guidée'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {currentStatus !== 'SCHEDULED' && (
            <Button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={isPending || isScheduling || isDeleting}
              variant="ghost"
              size="sm"
              className="gap-1.5 text-ink-muted hover:text-red-600 hover:bg-red-50 text-xs px-2.5"
              title="Supprimer le brouillon"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Supprimer</span>
            </Button>
          )}

          <Button
            type="button"
            onClick={handleSave}
            disabled={isPending || isScheduling || isDeleting}
            variant="outline"
            size="sm"
            className="gap-1.5 shadow-2xs"
          >
            {isPending ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                <span>Enregistrement...</span>
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Enregistré</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Enregistrer</span>
              </>
            )}
          </Button>

          <Button
            type="button"
            onClick={() => setPreviewModalOpen(true)}
            disabled={isPending || isScheduling || isDeleting}
            variant="outline"
            size="sm"
            className="gap-1.5 shadow-2xs text-ink hover:text-primary"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Aperçu</span>
          </Button>

          {currentStatus === 'SCHEDULED' ? (
            <>
              <Button
                type="button"
                onClick={handlePlanifierClick}
                disabled={isPending || isScheduling || isDeleting}
                size="sm"
                className="gap-1.5 bg-primary-light hover:bg-primary-light/80 text-primary-dark border border-primary-border/60 shadow-2xs font-medium"
              >
                <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                <span>Changer</span>
              </Button>
              <button
                type="button"
                onClick={() => setCancelConfirmOpen(true)}
                disabled={isPending || isScheduling || isDeleting}
                className="text-xs text-red-600 hover:text-red-700 hover:underline px-2 py-1 transition-colors disabled:opacity-50 font-medium"
              >
                Annuler
              </button>
            </>
          ) : (
            <Button
              type="button"
              onClick={handlePlanifierClick}
              disabled={isPending || isScheduling || isDeleting}
              size="sm"
              className="gap-1.5 bg-primary hover:bg-primary-hover text-white font-semibold shadow-xs"
            >
              <CalendarIcon className="w-3.5 h-3.5 text-white" />
              <span>Planifier</span>
            </Button>
          )}
        </div>
      </header>

      {/* Scheduling Feedback Banner */}
      {schedulingFeedback && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs">
          <Check className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{schedulingFeedback}</span>
        </div>
      )}

      {/* Save Status Banner */}
      {saveStatus === 'error' && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{errorMessage || 'Erreur lors de l’enregistrement du brouillon.'}</span>
        </div>
      )}

      {isDirty && saveStatus === 'idle' && (
        <div className="text-right">
          <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200/80 px-2.5 py-0.5 rounded-full">
            Modifications non enregistrées
          </span>
        </div>
      )}

      {/* 2. Editorial Context Card (Clean presentation for both recommendation and manual drafts) */}
      {recommendation ? (
        <section className="bg-white border border-cream-border/80 rounded-2xl p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-primary tracking-wider uppercase">
              Contexte éditorial
            </span>
            <Badge variant="primary" className="text-[10px]">
              {format === 'CAROUSEL' ? 'Carrousel' : 'Publication'}
            </Badge>
          </div>

          <h2 className="text-sm font-semibold text-ink leading-snug">
            {recommendation.title || content.topic || 'Idée de contenu'}
          </h2>

          {recommendation.angle && (
            <p className="text-xs text-ink-muted leading-relaxed italic">
              « {recommendation.angle} »
            </p>
          )}
        </section>
      ) : (
        <div className="flex items-center justify-between gap-2 pb-1">
          <Badge variant="primary" className="text-[10px]">
            {format === 'CAROUSEL' ? 'Carrousel' : 'Publication'}
          </Badge>
          <span className="text-[11px] text-ink-muted font-medium">
            Création libre
          </span>
        </div>
      )}

      {/* 3. Format-Specific Editor */}
      {format === 'POST' ? (
        <PostEditor
          businessId={content.business_id}
          workingTitle={workingTitle}
          setWorkingTitle={setWorkingTitle}
          caption={caption}
          setCaption={setCaption}
          visualComposition={visualComposition}
          setVisualComposition={setVisualComposition}
          actionType={actionType}
          setActionType={setActionType}
          actionDestination={actionDestination}
          setActionDestination={setActionDestination}
          actionIsOverride={actionIsOverride}
          setActionIsOverride={setActionIsOverride}
          businessContactInfo={businessContactInfo}
          setBusinessContactInfo={setBusinessContactInfo}
          mediaAssets={mediaAssets}
          setIsDirty={setIsDirty}
          onOpenMediaPicker={() => setMediaPickerOpen(true)}
          onOpenStockModal={() => setStockModalOpen(true)}
          onRequestAssistance={(t, op) => handleRequestAssistance(t, op)}
          assistanceState={assistanceState}
          onApplyAssistance={(text) => {
            setCaption(text)
            setIsDirty(true)
            setAssistanceState(null)
          }}
          onDismissAssistance={() => setAssistanceState(null)}
          captionTextareaRef={captionTextareaRef}
        />
      ) : (
        <CarouselEditor
          workingTitle={workingTitle}
          setWorkingTitle={setWorkingTitle}
          hook={hook}
          setHook={setHook}
          caption={caption}
          setCaption={setCaption}
          cta={cta}
          setCta={setCta}
          slides={slides}
          setSlides={setSlides}
          activeSlideIndex={activeSlideIndex}
          setActiveSlideIndex={setActiveSlideIndex}
          mediaAssets={mediaAssets}
          setIsDirty={setIsDirty}
          onOpenMediaPicker={() => setMediaPickerOpen(true)}
          onOpenStockModal={() => setStockModalOpen(true)}
          onRequestAssistance={handleRequestAssistance}
          assistanceState={assistanceState}
          onDismissAssistance={() => setAssistanceState(null)}
          slideTextareaRef={slideTextareaRef}
          captionTextareaRef={captionTextareaRef}
        />
      )}

      {/* 4. Media Picker Modal */}
      <MediaPickerModal
        isOpen={mediaPickerOpen}
        onClose={() => setMediaPickerOpen(false)}
        businessId={content.business_id}
        mediaList={mediaAssets}
        currentSelectedMediaId={
          format === 'POST'
            ? visualComposition.background.type === 'IMAGE'
              ? visualComposition.background.mediaAssetId || primaryMediaId
              : null
            : activeSlide?.media_id || null
        }
        slideIndex={format === 'CAROUSEL' ? activeSlide?.index : undefined}
        onSelectMedia={handleAssignSlideMedia}
        onMediaUploaded={handleMediaUploaded}
      />

      {/* 5. Stock Media Modal */}
      <StockMediaModal
        isOpen={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
        businessId={content.business_id}
        onSelectMedia={handleAssignSlideMedia}
        onMediaImported={handleStockMediaImported}
        slideIndex={format === 'CAROUSEL' ? activeSlide?.index : undefined}
      />

      {/* 6. Content Readiness Modal */}
      <ContentReadinessModal
        isOpen={readinessModalOpen}
        onClose={() => setReadinessModalOpen(false)}
        blockingIssues={blockingIssues}
        warnings={readinessWarnings}
        onSelectIssue={handleSelectIssue}
        onProceedAnyway={() => setScheduleModalOpen(true)}
      />

      {/* 7. Schedule Content Modal */}
      <ScheduleContentModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        onConfirm={handleConfirmSchedule}
        contentTitle={workingTitle || content.topic || 'Contenu sans titre'}
        slideCount={format === 'CAROUSEL' ? slides.length : 1}
        platform={variant?.platform || 'Instagram'}
        initialScheduledAt={currentScheduledAt}
        isPending={isScheduling}
      />

      {/* 8. Shared Content Preview Modal */}
      <ContentPreviewModal
        isOpen={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        onProceedToSchedule={handlePlanifierClick}
        format={format}
        workingTitle={workingTitle}
        hook={hook}
        caption={caption}
        cta={cta}
        action={format === 'POST' ? { type: actionType, destination: actionDestination } : null}
        primaryMedia={selectedPrimaryMedia}
        visualComposition={format === 'POST' ? visualComposition : null}
        slides={slides}
        mediaAssets={mediaAssets}
        isScheduled={currentStatus === 'SCHEDULED'}
      />

      {/* 9. Cancel Schedule Confirmation Dialog */}
      {cancelConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
          <div className="bg-ivory-card border border-ivory-border rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="space-y-1">
              <h3 className="text-sm font-serif font-bold text-ink">
                Annuler la programmation ?
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Ce contenu ne sera plus diffusé à la date prévue. Vos textes, photos et pages restent intacts dans Studio Mūza.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelConfirmOpen(false)}
                disabled={isScheduling}
                className="px-3 py-1.5 text-xs text-ink-muted hover:text-ink font-medium"
              >
                Garder la planification
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelSchedule}
                disabled={isScheduling}
                className="px-3.5 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs disabled:opacity-50"
              >
                {isScheduling ? 'Annulation…' : 'Confirmer l’annulation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 10. Delete Draft Confirmation Dialog */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-xs">
          <div className="bg-ivory-card border border-ivory-border rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-xl">
            <div className="space-y-1">
              <h3 className="text-sm font-serif font-bold text-ink">
                Supprimer ce brouillon ?
              </h3>
              <p className="text-xs text-ink-muted leading-relaxed">
                Cette action est définitive.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={isDeleting}
                className="px-3.5 py-1.5 text-xs text-ink-muted hover:text-ink font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteDraft}
                disabled={isDeleting}
                className="px-3.5 py-1.5 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-xs disabled:opacity-50 transition-colors"
              >
                {isDeleting ? 'Suppression…' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
