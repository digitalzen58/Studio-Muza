'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Sparkles, Check, AlertCircle, Image as ImageIcon, Sparkle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { saveContentDraftAction, type CarouselSlideData } from '@/actions/content'

export interface ContentStudioProps {
  content: {
    id: string
    business_id: string
    recommendation_id: string | null
    content_type: string
    topic: string | null
    angle: string | null
    hook: string | null
    body: string | null
    script: string | null
    cta: string | null
    status: string
  }
  variant?: {
    id: string
    format: string | null
    platform: string
    title: string | null
    caption: string | null
    cta: string | null
    hashtags: unknown
    keywords: unknown
    metadata: {
      slides?: CarouselSlideData[]
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
}

export function ContentStudio({
  content,
  variant,
  recommendation,
}: ContentStudioProps) {
  const router = useRouter()

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
      ? variant.metadata.slides
      : [
          { index: 1, type: 'COVER', label: 'Couverture', text: '', media_id: null },
          { index: 2, type: 'SLIDE', label: 'Balade 1', text: '', media_id: null },
          { index: 3, type: 'SLIDE', label: 'Balade 2', text: '', media_id: null },
          { index: 4, type: 'SLIDE', label: 'Balade 3', text: '', media_id: null },
          { index: 5, type: 'CTA', label: 'Conclusion / CTA', text: '', media_id: null },
        ]

  const [slides, setSlides] = useState<CarouselSlideData[]>(initialSlides)
  const [activeSlideIndex, setActiveSlideIndex] = useState(1)

  // Save transition & status
  const [isPending, startTransition] = useTransition()
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)


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

  const activeSlide = slides.find((s) => s.index === activeSlideIndex) || slides[0]

  const handleSlideTextChange = (text: string) => {
    setSlides((prev) =>
      prev.map((s) => (s.index === activeSlideIndex ? { ...s, text } : s))
    )
    setIsDirty(true)
  }

  const executeSave = async (andNavigateTo?: string): Promise<boolean> => {
    setSaveStatus('idle')
    setErrorMessage(null)

    const result = await saveContentDraftAction({
      contentId: content.id,
      workingTitle,
      hook: hook.trim() || null,
      caption: caption.trim() || null,
      cta: cta.trim() || null,
      slides,
    })

    if (result.success) {
      setSaveStatus('saved')
      setIsDirty(false)
      if (andNavigateTo) {
        router.push(andNavigateTo)
        router.refresh()
      } else {
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
      return true
    } else {
      setSaveStatus('error')
      setErrorMessage(result.message)
      return false
    }
  }

  const handleSave = () => {
    startTransition(async () => {
      await executeSave()
    })
  }

  const handleBack = () => {
    if (isDirty) {
      startTransition(async () => {
        await executeSave('/app')
      })
    } else {
      router.push('/app')
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Studio Header */}
      <header className="flex items-center justify-between gap-3 border-b border-ivory-border/60 pb-4">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            disabled={isPending}
            className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-ivory-card border border-ivory-border text-ink hover:text-terracotta hover:border-terracotta/30 transition-colors shadow-xs disabled:opacity-50"
            title={isDirty ? 'Enregistrer et retourner aux idées' : 'Retour aux idées'}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-serif font-bold text-ink">Studio Mūza</h1>
              <Badge variant="ivory" className="text-[11px] font-normal tracking-wide">
                Brouillon
              </Badge>
            </div>
            <p className="text-xs text-ink-muted">
              {isDirty ? 'Modifications en cours' : 'Édition manuelle guidée'}
            </p>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={isPending}
          size="sm"
          className="gap-1.5 shadow-sm"
        >
          {isPending ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Enregistrement...</span>
            </>
          ) : saveStatus === 'saved' ? (
            <>
              <Check className="w-3.5 h-3.5 text-white" />
              <span>Enregistré</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>Enregistrer</span>
            </>
          )}
        </Button>
      </header>

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

      {/* 2. Strategic Context Card */}
      <section className="bg-ivory-card border border-ivory-border/70 rounded-2xl p-4 shadow-xs space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-terracotta tracking-wider uppercase">
            Contexte éditorial
          </span>
          <Badge variant="terracotta" className="text-[10px]">
            {variant?.format === 'CAROUSEL' ? 'Carrousel Instagram (4:5)' : 'Post Instagram'}
          </Badge>
        </div>

        <h2 className="text-sm font-semibold text-ink leading-snug">
          {recommendation?.title || content.topic || 'Idée de contenu'}
        </h2>

        {recommendation?.angle && (
          <p className="text-xs text-ink-muted leading-relaxed italic">
            « {recommendation.angle} »
          </p>
        )}
      </section>

      {/* 3. Main Editorial Form */}
      <section className="space-y-5">
        {/* Working Title */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Titre de travail
          </label>
          <input
            type="text"
            value={workingTitle}
            onChange={(e) => {
              setWorkingTitle(e.target.value)
              setIsDirty(true)
            }}
            placeholder="Ex: 3 balades d'automne incontournables..."
            className="w-full px-3.5 py-2.5 bg-white border border-ivory-border rounded-xl text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
          />
        </div>

        {/* Carousel Slides Scaffold */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Structure du carrousel ({slides.length} slides)
            </label>
            <span className="text-[11px] text-ink-muted">Cliquez pour éditer</span>
          </div>

          {/* Slide Navigation Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {slides.map((slide) => {
              const isActive = slide.index === activeSlideIndex
              const hasText = Boolean(slide.text?.trim())
              return (
                <button
                  key={slide.index}
                  type="button"
                  onClick={() => setActiveSlideIndex(slide.index)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all shrink-0 border ${
                    isActive
                      ? 'bg-terracotta text-white border-terracotta shadow-xs'
                      : hasText
                      ? 'bg-ivory-card text-ink border-terracotta/40'
                      : 'bg-white text-ink-muted border-ivory-border hover:bg-ivory-subtle'
                  }`}
                >
                  <span className="text-[10px] font-bold opacity-80">#{slide.index}</span>
                  <span>{slide.label}</span>
                </button>
              )
            })}
          </div>

          {/* Active Slide Editor Box */}
          <div className="bg-ivory-card/60 border border-ivory-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-ink">
                Slide #{activeSlide.index} — {activeSlide.label}
              </span>
              <span className="text-[11px] text-ink-muted">
                {activeSlide.type === 'COVER'
                  ? 'Accroche visuelle'
                  : activeSlide.type === 'CTA'
                  ? 'Appel à l’action final'
                  : 'Contenu étape'}
              </span>
            </div>

            <textarea
              rows={3}
              value={activeSlide.text}
              onChange={(e) => handleSlideTextChange(e.target.value)}
              placeholder={`Écrivez le texte pour la slide "${activeSlide.label}"...`}
              className="w-full px-3.5 py-2.5 bg-white border border-ivory-border rounded-xl text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all resize-none"
            />
          </div>
        </div>

        {/* Hook / Accroche */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Accroche / Hook (première ligne)
          </label>
          <input
            type="text"
            value={hook}
            onChange={(e) => {
              setHook(e.target.value)
              setIsDirty(true)
            }}
            placeholder="Ex: Et si votre chien avait lui aussi besoin d'un week-end ?"
            className="w-full px-3.5 py-2.5 bg-white border border-ivory-border rounded-xl text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
          />
        </div>

        {/* Caption */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
              Légende du post (Caption)
            </label>
            <span className="text-[11px] text-ink-muted">
              {caption.length} caractères
            </span>
          </div>
          <textarea
            rows={5}
            value={caption}
            onChange={(e) => {
              setCaption(e.target.value)
              setIsDirty(true)
            }}
            placeholder="Rédigez le texte qui accompagnera votre carrousel..."
            className="w-full px-3.5 py-2.5 bg-white border border-ivory-border rounded-xl text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all resize-y"
          />
        </div>

        {/* Call to Action */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-ink-muted uppercase tracking-wider">
            Appel à l&apos;action (CTA)
          </label>
          <input
            type="text"
            value={cta}
            onChange={(e) => {
              setCta(e.target.value)
              setIsDirty(true)
            }}
            placeholder="Ex: Découvrir les disponibilités d'automne via le lien en bio"
            className="w-full px-3.5 py-2.5 bg-white border border-ivory-border rounded-xl text-sm text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta transition-all"
          />
        </div>
      </section>

      {/* 4. Media Section */}
      <section className="bg-ivory-card border border-ivory-border/70 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-terracotta" />
            <h3 className="text-xs font-semibold text-ink uppercase tracking-wider">
              Médias & Visuels
            </h3>
          </div>
          <span className="text-[11px] text-ink-muted">Optionnel pour ce brouillon</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
          {/* Mes médias */}
          <button
            type="button"
            disabled
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-ivory-border bg-ivory-subtle/50 text-ink-muted cursor-not-allowed opacity-60 text-center gap-1"
          >
            <span className="text-xs font-medium">Mes médias</span>
            <span className="text-[10px] text-terracotta bg-terracotta-light/60 px-2 py-0.5 rounded-full font-semibold">
              À venir
            </span>
          </button>

          {/* Photos gratuites */}
          <button
            type="button"
            disabled
            className="flex flex-col items-center justify-center p-3 rounded-xl border border-ivory-border bg-ivory-subtle/50 text-ink-muted cursor-not-allowed opacity-60 text-center gap-1"
          >
            <span className="text-xs font-medium">Photos gratuites</span>
            <span className="text-[10px] text-terracotta bg-terracotta-light/60 px-2 py-0.5 rounded-full font-semibold">
              À venir
            </span>
          </button>

          {/* Plus tard */}
          <div className="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-terracotta/30 bg-terracotta-light/20 text-ink text-center gap-1">
            <span className="text-xs font-medium text-terracotta-dark">Plus tard</span>
            <span className="text-[10px] text-ink-muted">
              Texte d&apos;abord, visuels après
            </span>
          </div>
        </div>
      </section>

      {/* 5. Optional AI Assistance Area */}
      <section className="bg-ivory-subtle/60 border border-ivory-border/50 rounded-2xl p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-terracotta" />
          <h3 className="text-xs font-semibold text-ink tracking-wide">
            Besoin d’un coup de pouce ? ✦
          </h3>
        </div>
        <p className="text-xs text-ink-muted leading-relaxed">
          L&apos;assistance IA ponctuelle sera disponible prochainement pour suggérer des accroches ou peaufiner vos phrases, à votre demande uniquement.
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-ivory-card border border-ivory-border text-ink-muted/60 cursor-not-allowed"
          >
            <Sparkle className="w-3 h-3 text-terracotta/40" />
            <span>Proposer des accroches ✦</span>
          </button>

          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-ivory-card border border-ivory-border text-ink-muted/60 cursor-not-allowed"
          >
            <Sparkle className="w-3 h-3 text-terracotta/40" />
            <span>Améliorer ce texte ✦</span>
          </button>

          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-ivory-card border border-ivory-border text-ink-muted/60 cursor-not-allowed"
          >
            <Sparkle className="w-3 h-3 text-terracotta/40" />
            <span>Aide pour cette slide ✦</span>
          </button>
        </div>
      </section>
    </div>
  )
}
