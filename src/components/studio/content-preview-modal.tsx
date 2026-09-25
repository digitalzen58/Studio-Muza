'use client'

import React, { useState } from 'react'
import {
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Send,
  Heart,
  MessageCircle,
  Bookmark,
  ThumbsUp,
  MessageSquare,
  Share2,
  Globe,
  Sparkles,
  Check,
} from 'lucide-react'
import { VisualCanvas } from './visual-canvas'
import { saveNetworkVariantAdaptationAction } from '@/actions/content'
import type { VisualComposition } from '@/services/visual-composition/types'
import type { BrandMediaAsset } from '@/services/media'
import type { CarouselSlideData } from '@/actions/content'

export function InstagramIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  )
}

export function FacebookIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  )
}

export interface SocialAccountPreviewInfo {
  platform: string
  accountName?: string | null
  status?: string
}

interface ContentPreviewModalProps {
  isOpen: boolean
  onClose: () => void
  onProceedToSchedule: () => void
  onProceedToPublish?: () => void
  contentId?: string
  format: 'POST' | 'CAROUSEL'
  workingTitle: string
  hook?: string | null
  caption?: string | null
  cta?: string | null
  action?: {
    type?: string | null
    destination?: string | null
  } | null
  primaryMedia?: BrandMediaAsset | null
  visualComposition?: VisualComposition | null
  slides?: CarouselSlideData[]
  mediaAssets?: BrandMediaAsset[]
  isScheduled?: boolean
  businessName?: string
  socialAccounts?: SocialAccountPreviewInfo[]
  onCaptionChange?: (newCaption: string) => void
}

export function ContentPreviewModal({
  isOpen,
  onClose,
  onProceedToSchedule,
  onProceedToPublish,
  contentId,
  format,
  workingTitle,
  hook,
  caption,
  cta,
  action,
  primaryMedia,
  visualComposition,
  slides = [],
  mediaAssets = [],
  isScheduled = false,
  businessName = 'Studio Mūza',
  socialAccounts = [],
  onCaptionChange,
}: ContentPreviewModalProps) {
  // Determine connection status per network
  const igAccount = socialAccounts.find(
    (a) => a.platform.toUpperCase() === 'INSTAGRAM'
  )
  const fbAccount = socialAccounts.find(
    (a) => a.platform.toUpperCase() === 'FACEBOOK'
  )

  const isIgConnected = Boolean(
    igAccount &&
      (igAccount.status?.toUpperCase() === 'CONNECTED' ||
        igAccount.status?.toUpperCase() === 'ACTIVE')
  )
  const isFbConnected = Boolean(
    fbAccount &&
      (fbAccount.status?.toUpperCase() === 'CONNECTED' ||
        fbAccount.status?.toUpperCase() === 'ACTIVE')
  )

  // Default network tab: Instagram if connected, else Facebook if connected, else Instagram
  const initialTab: 'INSTAGRAM' | 'FACEBOOK' = isIgConnected
    ? 'INSTAGRAM'
    : isFbConnected
    ? 'FACEBOOK'
    : 'INSTAGRAM'

  const [activeTab, setActiveTab] = useState<'INSTAGRAM' | 'FACEBOOK'>(initialTab)
  const [carouselPageIndex, setCarouselPageIndex] = useState(1)

  // Network-specific optimization state (Instagram & Facebook discovery / SEO)
  const [prevCaption, setPrevCaption] = useState<string | null | undefined>(caption)
  const [igCaption, setIgCaption] = useState<string>(caption || '')
  const [fbCaption, setFbCaption] = useState<string>(caption || '')

  const [igHashtags, setIgHashtags] = useState<string[]>([])
  const [igKeywords, setIgKeywords] = useState<string[]>([])
  const [igLocation, setIgLocation] = useState<string>('')

  const [fbHashtags, setFbHashtags] = useState<string[]>([])
  const [fbKeywords, setFbKeywords] = useState<string[]>([])
  const [fbLocation, setFbLocation] = useState<string>('')

  // Transient inputs
  const [newTagInput, setNewTagInput] = useState('')
  const [newKeywordInput, setNewKeywordInput] = useState('')
  const [aiFeedback, setAiFeedback] = useState<string | null>(null)
  const [, startTransition] = React.useTransition()

  if (caption !== prevCaption) {
    setPrevCaption(caption)
    setIgCaption(caption || '')
    setFbCaption(caption || '')
  }

  const handlePersistVariantAdaptation = (
    platform: 'INSTAGRAM' | 'FACEBOOK',
    newCaption: string,
    newHashtags: string[],
    newLocation: string
  ) => {
    if (onCaptionChange) {
      onCaptionChange(newCaption)
    }
    if (!contentId) return
    startTransition(async () => {
      await saveNetworkVariantAdaptationAction({
        contentId,
        platform,
        caption: newCaption,
        hashtags: newHashtags,
        location: newLocation,
      })
    })
  }

  if (!isOpen) return null

  // Resolve account handles/names safely
  const rawIgName = igAccount?.accountName || businessName
  const igHandle = rawIgName.startsWith('@')
    ? rawIgName
    : `@${rawIgName.toLowerCase().replace(/[^a-z0-9_]/g, '_')}`

  const fbPageName = fbAccount?.accountName || businessName

  const businessInitial = (businessName || 'M')[0].toUpperCase()

  // Resolve Action Callout Text
  let actionText: string | null = null
  if (action?.type && action.type !== 'NONE') {
    if (action.type === 'PHONE') actionText = 'Appeler'
    else if (action.type === 'BOOKING') actionText = 'Réserver'
    else if (action.type === 'APPOINTMENT') actionText = 'Prendre RDV'
  } else if (cta?.trim()) {
    actionText = cta.trim()
  }

  // Carousel slide resolution
  const activeSlide = slides.find((s) => s.index === carouselPageIndex) || slides[0]
  const activeSlideMedia = activeSlide?.media_id
    ? mediaAssets.find((m) => m.id === activeSlide.media_id)
    : null

  const handlePrevPage = () => {
    setCarouselPageIndex((prev) => (prev > 1 ? prev - 1 : slides.length))
  }

  const handleNextPage = () => {
    setCarouselPageIndex((prev) => (prev < slides.length ? prev + 1 : 1))
  }

  // Suggest hashtags deterministically from topic & caption
  const handleSuggestHashtags = (platform: 'INSTAGRAM' | 'FACEBOOK') => {
    const textToAnalyze = `${workingTitle} ${caption || ''}`
    const words = textToAnalyze
      .toLowerCase()
      .replace(/[^a-z0-9àâéèêëîïôùûüç\s]/gi, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3)

    const uniqueWords = Array.from(new Set(words)).slice(0, 5)
    const suggested = uniqueWords.map((w) => `#${w}`)

    if (platform === 'INSTAGRAM') {
      const merged = Array.from(new Set([...igHashtags, ...suggested]))
      setIgHashtags(merged)
    } else {
      const merged = Array.from(new Set([...fbHashtags, ...suggested.slice(0, 3)]))
      setFbHashtags(merged)
    }

    setAiFeedback(`Hashtags suggérés pour ${platform === 'INSTAGRAM' ? 'Instagram' : 'Facebook'}.`)
    setTimeout(() => setAiFeedback(null), 3500)
  }

  const handleOptimizeNetwork = (platform: 'INSTAGRAM' | 'FACEBOOK') => {
    handleSuggestHashtags(platform)
    setAiFeedback(`Publication optimisée pour ${platform === 'INSTAGRAM' ? 'Instagram' : 'Facebook'}.`)
    setTimeout(() => setAiFeedback(null), 3500)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-ink/40 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white border border-cream-border rounded-3xl max-w-xl w-full p-4 sm:p-5 space-y-4 shadow-xl my-auto">
        {/* Header with Title & Network Selector Tabs */}
        <div className="flex items-center justify-between pb-3 border-b border-cream-border flex-wrap gap-2">
          <div>
            <h3 className="font-serif font-bold text-base sm:text-lg text-ink">
              Aperçu de votre publication
            </h3>
            <p className="text-[11px] text-ink-muted">
              {format === 'CAROUSEL' ? `Carrousel (${slides.length} pages)` : 'Publication 4:5'} • Feed social
            </p>
          </div>

          {/* Network Switcher Tabs: Instagram & Facebook */}
          <div className="flex items-center bg-cream-subtle p-1 rounded-xl border border-cream-border/80">
            <button
              type="button"
              onClick={() => setActiveTab('INSTAGRAM')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'INSTAGRAM'
                  ? 'bg-white text-ink shadow-2xs border border-cream-border/60'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <InstagramIcon className="w-3.5 h-3.5 text-pink-600" />
              <span>Instagram</span>
              {isIgConnected && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"
                  title="Compte Instagram connecté"
                />
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('FACEBOOK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'FACEBOOK'
                  ? 'bg-white text-ink shadow-2xs border border-cream-border/60'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <FacebookIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>Facebook</span>
              {isFbConnected && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"
                  title="Compte Facebook connecté"
                />
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-ink-muted hover:text-ink rounded-lg hover:bg-cream-subtle transition-colors"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Working Title Reminder */}
        {workingTitle && (
          <div className="text-xs text-ink-muted bg-cream-subtle/70 px-3 py-1.5 rounded-xl border border-cream-border/50 flex items-center justify-between">
            <div className="truncate">
              <span className="font-semibold text-ink">Titre : </span>
              <span>{workingTitle}</span>
            </div>
            <span className="text-[10px] text-ink-muted shrink-0 ml-2">
              {activeTab === 'INSTAGRAM'
                ? isIgConnected
                  ? 'Connecté'
                  : 'Aperçu libre'
                : isFbConnected
                ? 'Connecté'
                : 'Aperçu libre'}
            </span>
          </div>
        )}

        {/* AI Feedback Banner */}
        {aiFeedback && (
          <div className="flex items-center gap-2 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium animate-fadeIn">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{aiFeedback}</span>
          </div>
        )}

        {/* Modal Feed & Optimization Container */}
        <div className="space-y-5 max-h-[65vh] overflow-y-auto pr-1">
          {activeTab === 'INSTAGRAM' ? (
            /* ================= 1. INSTAGRAM FEED PREVIEW ================= */
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs max-w-[470px] mx-auto text-slate-900 font-sans">
                {/* Instagram Header */}
                <div className="flex items-center justify-between px-3.5 py-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full p-[1.5px] bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center shrink-0">
                      <div className="w-full h-full bg-white rounded-full flex items-center justify-center p-[1px] overflow-hidden">
                        <span className="text-[11px] font-bold text-primary">
                          {businessInitial}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-semibold text-slate-900 leading-tight">
                        {igHandle}
                      </span>
                      <span className="text-[10px] text-slate-500 leading-none mt-0.5">
                        {businessName}
                      </span>
                    </div>
                  </div>
                  <span className="text-slate-400 text-xs tracking-widest font-bold">•••</span>
                </div>

                {/* Media Layer (Canvas Engine or Carousel) */}
                <div className="relative aspect-4/5 w-full bg-slate-900 overflow-hidden">
                  {format === 'POST' ? (
                    visualComposition ? (
                      <VisualCanvas
                        composition={visualComposition}
                        onChange={() => {}}
                        mediaAssets={mediaAssets}
                        readOnly={true}
                      />
                    ) : primaryMedia ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={primaryMedia.url}
                        alt={primaryMedia.alt || primaryMedia.original_filename || 'Visuel'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 gap-2">
                        <span className="text-xs">Aucun visuel sélectionné</span>
                      </div>
                    )
                  ) : (
                    /* Carousel Slide Display */
                    <div className="relative w-full h-full bg-slate-900 flex flex-col justify-between p-4">
                      {activeSlideMedia && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={activeSlideMedia.url}
                          alt={activeSlideMedia.alt || activeSlideMedia.original_filename || 'Visuel'}
                          className="absolute inset-0 w-full h-full object-cover z-0"
                        />
                      )}

                      {activeSlideMedia && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-1" />
                      )}

                      <div className="relative z-2 flex justify-between items-start">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-xs">
                          {activeSlide?.index} / {slides.length}
                        </span>
                      </div>

                      <div className="relative z-2 space-y-1.5 mt-auto">
                        {activeSlide?.text?.trim() ? (
                          <p className={`text-xs sm:text-sm font-medium leading-snug ${
                            activeSlideMedia ? 'text-white' : 'text-slate-100'
                          }`}>
                            {activeSlide.text.trim()}
                          </p>
                        ) : (
                          <p className="text-xs italic text-slate-400">
                            Texte de la page vide
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Carousel Navigation Overlay for Instagram */}
                  {format === 'CAROUSEL' && slides.length > 1 && (
                    <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex items-center justify-between z-10 pointer-events-none">
                      <button
                        type="button"
                        onClick={handlePrevPage}
                        className="p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-xs pointer-events-auto transition-colors"
                        aria-label="Page précédente"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextPage}
                        className="p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-xs pointer-events-auto transition-colors"
                        aria-label="Page suivante"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Instagram Social Action Icons */}
                <div className="px-3.5 pt-3 pb-2 flex items-center justify-between text-slate-800">
                  <div className="flex items-center gap-4">
                    <Heart className="w-6 h-6 stroke-[1.75] hover:text-rose-500 transition-colors cursor-default" />
                    <MessageCircle className="w-6 h-6 stroke-[1.75] cursor-default" />
                    <Send className="w-6 h-6 stroke-[1.75] cursor-default" />
                  </div>
                  <Bookmark className="w-6 h-6 stroke-[1.75] cursor-default" />
                </div>

                {/* Carousel Page Dots Indicator */}
                {format === 'CAROUSEL' && slides.length > 1 && (
                  <div className="flex items-center justify-center gap-1 pb-2">
                    {slides.map((s) => (
                      <button
                        key={s.index}
                        type="button"
                        onClick={() => setCarouselPageIndex(s.index)}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${
                          s.index === carouselPageIndex ? 'w-3 bg-sky-500' : 'bg-slate-300'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Instagram Caption Section */}
                <div className="px-3.5 pb-4 space-y-2 text-xs text-slate-900 leading-relaxed">
                  <div>
                    <span className="font-semibold text-slate-900 mr-2">{igHandle}</span>
                    {hook?.trim() && (
                      <span className="font-semibold text-slate-900 block mt-1">{hook.trim()}</span>
                    )}
                    {igCaption?.trim() ? (
                      <span className="whitespace-pre-wrap">{igCaption.trim()}</span>
                    ) : caption?.trim() ? (
                      <span className="whitespace-pre-wrap">{caption.trim()}</span>
                    ) : (
                      <span className="text-slate-400 italic">Aucune légende rédigée.</span>
                    )}
                  </div>

                  {/* Display Instagram Hashtags directly inside preview */}
                  {igHashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 text-[11px] text-sky-600 font-medium pt-1">
                      {igHashtags.map((tag, idx) => (
                        <span key={idx}>{tag.startsWith('#') ? tag : `#${tag}`}</span>
                      ))}
                    </div>
                  )}

                  {/* Display Instagram Location if set */}
                  {igLocation && (
                    <div className="text-[10px] text-slate-500 font-medium">
                      📍 {igLocation}
                    </div>
                  )}

                  {/* Conversion Action Tag */}
                  {actionText && (
                    <div className="mt-2 inline-block text-[11px] font-medium text-primary bg-primary-light/40 border border-primary-border/60 px-2.5 py-1 rounded-md">
                      {actionText}
                    </div>
                  )}
                </div>
              </div>

              {/* Optimisation pour Instagram Panel */}
              <div className="bg-cream-subtle/80 border border-cream-border rounded-2xl p-4 space-y-3 max-w-[470px] mx-auto text-xs">
                <div>
                  <h4 className="font-serif font-bold text-sm text-ink flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>Optimisation pour Instagram</span>
                  </h4>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    Ces mots et repères aident les bonnes personnes à trouver et comprendre votre publication.
                  </p>
                </div>

                {/* Légende Instagram */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                    Légende Instagram
                  </label>
                  <textarea
                    rows={3}
                    value={igCaption}
                    onChange={(e) => {
                      const val = e.target.value
                      setIgCaption(val)
                      handlePersistVariantAdaptation('INSTAGRAM', val, igHashtags, igLocation)
                    }}
                    placeholder="Saisissez la légende spécifique pour Instagram..."
                    className="w-full px-3 py-2 bg-white border border-cream-border rounded-xl text-xs text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-1 focus:ring-primary resize-y font-medium"
                  />
                </div>

                {/* Hashtags Instagram */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                    Hashtags Instagram
                  </label>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {igHashtags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-cream-border rounded-full text-xs text-primary font-medium shadow-2xs"
                      >
                        <span>{tag.startsWith('#') ? tag : `#${tag}`}</span>
                        <button
                          type="button"
                          onClick={() => setIgHashtags(igHashtags.filter((_, i) => i !== idx))}
                          className="text-ink-muted hover:text-red-600 text-xs px-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      placeholder="Ajouter un hashtag (ex: #morvan)..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newTagInput.trim()) {
                          e.preventDefault()
                          const val = newTagInput.trim().replace(/^#+/, '')
                          if (val && !igHashtags.includes(`#${val}`)) {
                            setIgHashtags([...igHashtags, `#${val}`])
                          }
                          setNewTagInput('')
                        }
                      }}
                      className="px-2.5 py-1 bg-white border border-cream-border rounded-full text-xs text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-1 focus:ring-primary min-w-[140px]"
                    />
                  </div>
                </div>

                {/* Mots-clés Instagram */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                    Mots-clés de recherche
                  </label>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {igKeywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs text-slate-800 font-medium"
                      >
                        <span>{kw}</span>
                        <button
                          type="button"
                          onClick={() => setIgKeywords(igKeywords.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-red-600 text-xs px-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      placeholder="Ajouter un mot-clé (ex: escapade)..."
                      value={newKeywordInput}
                      onChange={(e) => setNewKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newKeywordInput.trim()) {
                          e.preventDefault()
                          const val = newKeywordInput.trim()
                          if (val && !igKeywords.includes(val)) {
                            setIgKeywords([...igKeywords, val])
                          }
                          setNewKeywordInput('')
                        }
                      }}
                      className="px-2.5 py-1 bg-white border border-cream-border rounded-full text-xs text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-1 focus:ring-primary min-w-[140px]"
                    />
                  </div>
                </div>

                {/* Localisation */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                    Lieu / Localisation (optionnel)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Parc Naturel Régional du Morvan..."
                    value={igLocation}
                    onChange={(e) => setIgLocation(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-cream-border rounded-xl text-xs text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Actions Triggers Mūza Intelligence */}
                <div className="pt-2 flex items-center justify-between gap-2 flex-wrap border-t border-cream-border/60">
                  <button
                    type="button"
                    onClick={() => handleSuggestHashtags('INSTAGRAM')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-primary-border/60 text-primary-dark hover:bg-primary-light/40 rounded-xl font-semibold text-[11px] transition-colors cursor-pointer shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>Suggérer des hashtags ✦</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOptimizeNetwork('INSTAGRAM')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white hover:bg-primary-hover rounded-xl font-semibold text-[11px] transition-colors cursor-pointer shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    <span>Optimiser pour Instagram ✦</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ================= 2. FACEBOOK FEED PREVIEW ================= */
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs max-w-[500px] mx-auto text-slate-900 font-sans">
                {/* Facebook Header */}
                <div className="flex items-center justify-between p-3.5 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden">
                      <span className="text-xs font-bold text-slate-700">
                        {businessInitial}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-900 leading-tight">
                        {fbPageName}
                      </span>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                        <span>Publication</span>
                        <span>•</span>
                        <Globe className="w-3 h-3 text-slate-400" />
                      </div>
                    </div>
                  </div>
                  <span className="text-slate-400 text-xs tracking-widest font-bold">•••</span>
                </div>

                {/* Facebook Caption Section (PLACED BEFORE MEDIA) */}
                <div className="px-3.5 py-2.5 text-xs text-slate-900 leading-relaxed space-y-1.5">
                  {fbLocation && (
                    <div className="text-[11px] text-slate-500 font-medium">
                      📍 {fbLocation}
                    </div>
                  )}
                  {hook?.trim() && (
                    <p className="font-semibold text-slate-900">{hook.trim()}</p>
                  )}
                  {fbCaption?.trim() ? (
                    <p className="whitespace-pre-wrap">{fbCaption.trim()}</p>
                  ) : caption?.trim() ? (
                    <p className="whitespace-pre-wrap">{caption.trim()}</p>
                  ) : (
                    <p className="text-slate-400 italic">Aucun texte rédigé pour le moment.</p>
                  )}

                  {/* Display Facebook Hashtags if present */}
                  {fbHashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1 text-[11px] text-blue-600 font-medium pt-1">
                      {fbHashtags.map((tag, idx) => (
                        <span key={idx}>{tag.startsWith('#') ? tag : `#${tag}`}</span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Media Layer */}
                <div className="relative aspect-4/5 w-full bg-slate-900 overflow-hidden">
                  {format === 'POST' ? (
                    visualComposition ? (
                      <VisualCanvas
                        composition={visualComposition}
                        onChange={() => {}}
                        mediaAssets={mediaAssets}
                        readOnly={true}
                      />
                    ) : primaryMedia ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={primaryMedia.url}
                        alt={primaryMedia.alt || primaryMedia.original_filename || 'Visuel'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400 gap-2">
                        <span className="text-xs">Aucun visuel sélectionné</span>
                      </div>
                    )
                  ) : (
                    /* Carousel Slide Display */
                    <div className="relative w-full h-full bg-slate-900 flex flex-col justify-between p-4">
                      {activeSlideMedia && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={activeSlideMedia.url}
                          alt={activeSlideMedia.alt || activeSlideMedia.original_filename || 'Visuel'}
                          className="absolute inset-0 w-full h-full object-cover z-0"
                        />
                      )}

                      {activeSlideMedia && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent z-1" />
                      )}

                      <div className="relative z-2 flex justify-between items-start">
                        <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-xs">
                          Page {activeSlide?.index} sur {slides.length}
                        </span>
                      </div>

                      <div className="relative z-2 space-y-1.5 mt-auto">
                        {activeSlide?.text?.trim() ? (
                          <p className={`text-xs sm:text-sm font-medium leading-snug ${
                            activeSlideMedia ? 'text-white' : 'text-slate-100'
                          }`}>
                            {activeSlide.text.trim()}
                          </p>
                        ) : (
                          <p className="text-xs italic text-slate-400">
                            Texte de la page vide
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Carousel Navigation Overlay for Facebook */}
                  {format === 'CAROUSEL' && slides.length > 1 && (
                    <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 flex items-center justify-between z-10 pointer-events-none">
                      <button
                        type="button"
                        onClick={handlePrevPage}
                        className="p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-xs pointer-events-auto transition-colors"
                        aria-label="Page précédente"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={handleNextPage}
                        className="p-1.5 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-xs pointer-events-auto transition-colors"
                        aria-label="Page suivante"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Facebook Action Callout Banner if action present */}
                {actionText && (
                  <div className="bg-slate-50 border-t border-slate-100 p-2.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 truncate">{fbPageName}</span>
                    <span className="px-3 py-1 bg-primary text-white font-medium rounded-md text-[11px] shadow-2xs">
                      {actionText}
                    </span>
                  </div>
                )}

                {/* Facebook Social Actions Bar */}
                <div className="px-2 py-1.5 border-t border-slate-100 grid grid-cols-3 gap-1 text-xs text-slate-600 font-medium text-center">
                  <button
                    type="button"
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default"
                  >
                    <ThumbsUp className="w-4 h-4 text-slate-500" />
                    <span>J&apos;aime</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default"
                  >
                    <MessageSquare className="w-4 h-4 text-slate-500" />
                    <span>Commenter</span>
                  </button>
                  <button
                    type="button"
                    className="flex items-center justify-center gap-1.5 py-2 rounded-lg hover:bg-slate-50 transition-colors cursor-default"
                  >
                    <Share2 className="w-4 h-4 text-slate-500" />
                    <span>Partager</span>
                  </button>
                </div>
              </div>

              {/* Optimisation pour Facebook Panel */}
              <div className="bg-cream-subtle/80 border border-cream-border rounded-2xl p-4 space-y-3 max-w-[500px] mx-auto text-xs">
                <div>
                  <h4 className="font-serif font-bold text-sm text-ink flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>Optimisation pour Facebook</span>
                  </h4>
                  <p className="text-[11px] text-ink-muted mt-0.5">
                    Ces mots-clés aident Facebook à diffuser votre publication auprès de l’audience la plus pertinente.
                  </p>
                </div>

                {/* Texte Facebook */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                    Texte Facebook
                  </label>
                  <textarea
                    rows={3}
                    value={fbCaption}
                    onChange={(e) => {
                      const val = e.target.value
                      setFbCaption(val)
                      handlePersistVariantAdaptation('FACEBOOK', val, fbHashtags, fbLocation)
                    }}
                    placeholder="Saisissez le texte spécifique pour Facebook..."
                    className="w-full px-3 py-2 bg-white border border-cream-border rounded-xl text-xs text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-1 focus:ring-primary resize-y font-medium"
                  />
                </div>

                {/* Mots-clés Facebook */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                    Mots-clés de recherche Facebook
                  </label>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {fbKeywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-cream-border rounded-full text-xs text-blue-700 font-medium shadow-2xs"
                      >
                        <span>{kw}</span>
                        <button
                          type="button"
                          onClick={() => setFbKeywords(fbKeywords.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-red-600 text-xs px-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      placeholder="Ajouter un mot-clé..."
                      value={newKeywordInput}
                      onChange={(e) => setNewKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newKeywordInput.trim()) {
                          e.preventDefault()
                          const val = newKeywordInput.trim()
                          if (val && !fbKeywords.includes(val)) {
                            setFbKeywords([...fbKeywords, val])
                          }
                          setNewKeywordInput('')
                        }
                      }}
                      className="px-2.5 py-1 bg-white border border-cream-border rounded-full text-xs text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-1 focus:ring-primary min-w-[140px]"
                    />
                  </div>
                </div>

                {/* Hashtags pertinents Facebook */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                    Hashtags pertinents (optionnel)
                  </label>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {fbHashtags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs text-slate-800 font-medium"
                      >
                        <span>{tag.startsWith('#') ? tag : `#${tag}`}</span>
                        <button
                          type="button"
                          onClick={() => setFbHashtags(fbHashtags.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-red-600 text-xs px-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                    <input
                      type="text"
                      placeholder="Ajouter un hashtag Facebook..."
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newTagInput.trim()) {
                          e.preventDefault()
                          const val = newTagInput.trim().replace(/^#+/, '')
                          if (val && !fbHashtags.includes(`#${val}`)) {
                            setFbHashtags([...fbHashtags, `#${val}`])
                          }
                          setNewTagInput('')
                        }
                      }}
                      className="px-2.5 py-1 bg-white border border-cream-border rounded-full text-xs text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-1 focus:ring-primary min-w-[140px]"
                    />
                  </div>
                </div>

                {/* Localisation Facebook */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                    Lieu / Localisation (optionnel)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Bourgogne-Franche-Comté..."
                    value={fbLocation}
                    onChange={(e) => setFbLocation(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-cream-border rounded-xl text-xs text-ink placeholder:text-ink-muted/50 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>

                {/* Actions Triggers Mūza Intelligence */}
                <div className="pt-2 flex items-center justify-between gap-2 flex-wrap border-t border-cream-border/60">
                  <button
                    type="button"
                    onClick={() => handleSuggestHashtags('FACEBOOK')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-primary-border/60 text-primary-dark hover:bg-primary-light/40 rounded-xl font-semibold text-[11px] transition-colors cursor-pointer shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>Suggérer des hashtags ✦</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOptimizeNetwork('FACEBOOK')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white hover:bg-primary-hover rounded-xl font-semibold text-[11px] transition-colors cursor-pointer shadow-2xs"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                    <span>Optimiser pour Facebook ✦</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="pt-3 border-t border-cream-border/80 flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-xs font-medium text-ink-muted hover:text-ink transition-colors cursor-pointer"
          >
            Fermer
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose()
                onProceedToSchedule()
              }}
              className="px-3.5 py-2 text-xs font-medium rounded-xl border border-cream-border text-ink hover:bg-cream-subtle transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Calendar className="w-3.5 h-3.5 text-ink-muted" />
              <span>{isScheduled ? 'Changer la date' : 'Planifier'}</span>
            </button>

            {onProceedToPublish && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onProceedToPublish()
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover transition-colors shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-white" />
                <span>Publier maintenant</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
