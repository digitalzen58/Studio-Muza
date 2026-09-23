'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  Sparkles,
  Compass,
  Building2,
  Users,
  Feather,
  Target,
  Palette,
  ArrowRight,
  Calendar,
  Lightbulb,
  FileText,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { MuzaSymbol } from '@/components/ui/muza-symbol'
import {
  type StrategicPrioritySummary,
  type CoachNextAction,
  type BusinessUnderstandingFact,
  type CommunicationRhythmSummary,
} from '@/services/muza-coach'

export interface MuzaViewProps {
  businessName: string
  firstName?: string
  priority: StrategicPrioritySummary
  nextAction: CoachNextAction
  businessFacts: BusinessUnderstandingFact[]
  communicationState: CommunicationRhythmSummary
}

export function MuzaView({
  businessName,
  firstName,
  priority,
  nextAction,
  businessFacts,
  communicationState,
}: MuzaViewProps) {
  const [showCorrectionInfo, setShowCorrectionInfo] = useState(false)

  // Map icon types to appropriate Lucide icons
  const getFactIcon = (type: BusinessUnderstandingFact['iconType']) => {
    switch (type) {
      case 'business':
        return Building2
      case 'audience':
        return Users
      case 'tone':
        return Feather
      case 'priority':
        return Target
      case 'creator':
        return Palette
      default:
        return Sparkles
    }
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 pb-12">
      {/* 1. Page Header */}
      <header className="space-y-2 border-b border-cream-border/60 pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-primary tracking-wide uppercase">
          <MuzaSymbol size="sm" />
          <span>Votre coach de visibilité</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-ink">
            Mūza
            {firstName && <span className="text-ink-muted font-normal text-xl sm:text-2xl ml-2.5">pour {firstName}</span>}
          </h1>
          <span className="text-xs text-ink-muted font-medium">
            {businessName}
          </span>
        </div>
        <p className="text-sm sm:text-base text-ink-muted max-w-3xl leading-relaxed">
          Voici ce que je retiens de votre activité et ce qui mérite votre attention maintenant pour développer votre visibilité.
        </p>
      </header>

      {/* 2. Primary Hero: Ce qui compte maintenant */}
      <section className="space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
          <Compass className="w-4 h-4 text-primary" />
          <span>Ce qui compte maintenant</span>
        </div>

        <div className="relative overflow-hidden rounded-2xl border border-primary-border/60 bg-linear-to-br from-primary-light/60 via-white to-white p-6 sm:p-7 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
            <div className="space-y-3 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary text-white shadow-xs">
                  <Sparkles className="w-3 h-3" />
                  Objectif prioritaire
                </span>
                {priority.timeframe && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-cream-subtle text-ink-muted border border-cream-border">
                    {priority.timeframe}
                  </span>
                )}
              </div>

              <h2 className="font-serif text-xl sm:text-2xl font-bold text-ink leading-snug">
                {priority.goalTitle}
              </h2>

              <p className="text-sm sm:text-base text-ink/90 leading-relaxed font-normal">
                {priority.coachInterpretation}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Two-Column Balanced Area: Next Action + Communication State */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (Wider): Ce que je vous conseille maintenant */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Ce que je vous conseille maintenant</span>
          </div>

          <Card className="flex-1 flex flex-col justify-between border border-cream-border bg-white p-6 rounded-2xl shadow-xs space-y-5">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-primary-light text-primary border border-primary-border/60">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{nextAction.badgeLabel}</span>
              </div>

              <h3 className="font-serif text-lg sm:text-xl font-bold text-ink leading-snug">
                {nextAction.title}
              </h3>

              <p className="text-sm text-ink-muted leading-relaxed">
                {nextAction.description}
              </p>
            </div>

            <div className="pt-2 border-t border-cream-border/60">
              <Link
                href={nextAction.ctaHref}
                className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-5 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white text-sm font-semibold transition-all shadow-xs hover:shadow-sm"
              >
                <span>{nextAction.ctaLabel}</span>
              </Link>
            </div>
          </Card>
        </div>

        {/* Right Column: Votre communication en ce moment */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
            <Calendar className="w-4 h-4 text-primary" />
            <span>Votre communication en ce moment</span>
          </div>

          <Card className="flex-1 flex flex-col justify-between border border-cream-border bg-white p-6 rounded-2xl shadow-xs space-y-4">
            <div className="space-y-3">
              <p className="text-xs font-medium text-ink-muted">
                {communicationState.summarySentence}
              </p>

              {/* Status items */}
              <div className="space-y-2.5 pt-1">
                {/* Drafts */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-cream-subtle border border-cream-border/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                      <FileText className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium text-ink">Brouillons en cours</span>
                  </div>
                  <span className="text-xs font-bold text-ink bg-white px-2 py-0.5 rounded-md border border-cream-border">
                    {communicationState.activeDraftsCount}
                  </span>
                </div>

                {/* Scheduled */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-cream-subtle border border-cream-border/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-medium text-ink block">Publications prévues</span>
                      {communicationState.nextScheduledDateLabel && (
                        <span className="text-[10px] text-ink-muted block capitalize">
                          Prochaine : {communicationState.nextScheduledDateLabel}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-ink bg-white px-2 py-0.5 rounded-md border border-cream-border">
                    {communicationState.scheduledCount}
                  </span>
                </div>

                {/* Recommendations */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-cream-subtle border border-cream-border/60">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary-light text-primary flex items-center justify-center">
                      <Lightbulb className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium text-ink">Idées disponibles</span>
                  </div>
                  <span className="text-xs font-bold text-ink bg-white px-2 py-0.5 rounded-md border border-cream-border">
                    {communicationState.usableRecommendationsCount}
                  </span>
                </div>
              </div>
            </div>

            {/* Direct Links */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-cream-border/60 text-xs font-medium">
              <Link
                href="/app/inspirations"
                className="inline-flex items-center gap-1 text-primary hover:underline py-1"
              >
                <span>Ouvrir Inspirations</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
              <span className="text-ink-muted/40 self-center">•</span>
              <Link
                href="/app/calendar"
                className="inline-flex items-center gap-1 text-ink-muted hover:text-ink hover:underline py-1"
              >
                <span>Voir le calendrier</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </Card>
        </div>
      </section>

      {/* 4. Bottom Section: Ce que j'ai compris de votre activité */}
      <section className="space-y-4 pt-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <div className="space-y-0.5">
            <h2 className="font-serif text-lg sm:text-xl font-bold text-ink">
              Ce que j’ai compris de votre activité
            </h2>
            <p className="text-xs text-ink-muted">
              Mūza adapte ses recommandations et son ton à ce que vous lui avez partagé.
            </p>
          </div>
        </div>

        {/* 5 High-value memory cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {businessFacts.map((fact) => {
            const Icon = getFactIcon(fact.iconType)
            return (
              <Card
                key={fact.id}
                className="p-4 sm:p-5 rounded-2xl border border-cream-border bg-white space-y-2 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-2 text-xs font-medium text-ink-muted">
                  <div className="w-6 h-6 rounded-md bg-primary-light text-primary flex items-center justify-center">
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span>{fact.label}</span>
                </div>

                <div className="font-medium text-xs sm:text-sm text-ink leading-snug">
                  {fact.value}
                </div>

                {fact.detail && (
                  <p className="text-[11px] sm:text-xs text-ink-muted leading-relaxed pt-0.5">
                    {fact.detail}
                  </p>
                )}
              </Card>
            )
          })}
        </div>

        {/* Trust & Correction section */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowCorrectionInfo(!showCorrectionInfo)}
            className="inline-flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-colors cursor-pointer py-1"
          >
            <Info className="w-3.5 h-3.5 text-primary" />
            <span className="underline underline-offset-2">Corriger ou mettre à jour ce que Mūza sait</span>
            {showCorrectionInfo ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showCorrectionInfo && (
            <div className="mt-3 p-4 rounded-xl border border-cream-border bg-white text-xs text-ink-muted leading-relaxed space-y-2 animate-in fade-in-50 duration-200">
              <p>
                <strong className="text-ink font-semibold">Comment Mūza apprend de vous :</strong> Les informations ci-dessus proviennent de votre configuration initiale (votre profil d’activité, votre clientèle cible, votre ton de marque et vos préférences de création).
              </p>
              <p>
                Elles guident la pertinence de votre Community Manager (Inspirations) et de vos suggestions de contenu dans le Studio. Vous pourrez bientôt ajuster ces informations directement depuis votre espace de paramètres.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
