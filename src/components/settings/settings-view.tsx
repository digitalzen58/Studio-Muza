'use client'

import React from 'react'
import Link from 'next/link'
import {
  User,
  Building2,
  Share2,
  ArrowRight,
  MapPin,
  Globe,
  Phone,
  CalendarCheck,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { MuzaSymbol } from '@/components/ui/muza-symbol'
import { type SocialAccountSummary } from '@/services/social/types'

export interface SettingsUserSummary {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  fullName: string
}

export interface SettingsBusinessSummary {
  id: string
  name: string
  industry: string
  subindustry: string | null
  city: string | null
  region: string | null
  countryCode: string | null
  websiteUrl: string | null
  phone: string | null
  bookingUrl: string | null
}

export interface SettingsViewProps {
  user: SettingsUserSummary
  business: SettingsBusinessSummary
  connectedAccounts: SocialAccountSummary[]
}

export function SettingsView({ user, business, connectedAccounts }: SettingsViewProps) {
  const activeCount = connectedAccounts.filter((a) => a.status === 'CONNECTED').length

  const locationLabel = [business.city, business.region, business.countryCode]
    .filter(Boolean)
    .join(', ')

  return (
    <div className="w-full max-w-4xl mx-auto space-y-8 pb-12">
      {/* 1. Page Header */}
      <header className="space-y-2 border-b border-ivory-border/60 pb-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-terracotta tracking-wide uppercase">
          <MuzaSymbol size="sm" />
          <span>Configuration</span>
        </div>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-ink">
          Paramètres
        </h1>
        <p className="text-sm text-ink-muted max-w-2xl leading-relaxed">
          Gérez votre compte, les informations de votre activité et vos services connectés.
        </p>
      </header>

      {/* 2. Settings Grid / Sections */}
      <div className="space-y-6">
        {/* Section 1: Mon Compte */}
        <Card className="p-5 sm:p-6 rounded-2xl border border-ivory-border/80 bg-ivory-card shadow-xs space-y-4">
          <div className="flex items-center gap-3 border-b border-ivory-border/60 pb-3">
            <div className="w-8 h-8 rounded-xl bg-terracotta-light text-terracotta flex items-center justify-center shrink-0">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink">Mon compte</h2>
              <p className="text-xs text-ink-muted">Votre identité de connexion à Studio Mūza</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-ivory-bg/70 border border-ivory-border/60 space-y-1">
              <span className="text-[11px] font-medium text-ink-muted uppercase tracking-wider block">
                Nom d’utilisateur
              </span>
              <span className="text-sm font-medium text-ink block truncate">
                {user.fullName || 'Non renseigné'}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-ivory-bg/70 border border-ivory-border/60 space-y-1">
              <span className="text-[11px] font-medium text-ink-muted uppercase tracking-wider block">
                Adresse e-mail
              </span>
              <span className="text-sm font-medium text-ink block truncate">
                {user.email || 'Non renseignée'}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-ink-muted italic">
            Les informations de compte sont associées à votre profil authentifié sécurisé.
          </p>
        </Card>

        {/* Section 2: Mon Activité */}
        <Card className="p-5 sm:p-6 rounded-2xl border border-ivory-border/80 bg-ivory-card shadow-xs space-y-4">
          <div className="flex items-center gap-3 border-b border-ivory-border/60 pb-3">
            <div className="w-8 h-8 rounded-xl bg-terracotta-light text-terracotta flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink">Mon activité</h2>
              <p className="text-xs text-ink-muted">Les informations que Mūza utilise pour votre communication</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-ivory-bg/70 border border-ivory-border/60 space-y-1">
              <span className="text-[11px] font-medium text-ink-muted uppercase tracking-wider block">
                Nom de l’entreprise
              </span>
              <span className="text-sm font-semibold text-ink block truncate">
                {business.name}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-ivory-bg/70 border border-ivory-border/60 space-y-1">
              <span className="text-[11px] font-medium text-ink-muted uppercase tracking-wider block">
                Secteur d’activité
              </span>
              <span className="text-sm font-medium text-ink block truncate">
                {business.industry}
                {business.subindustry ? ` · ${business.subindustry}` : ''}
              </span>
            </div>

            {locationLabel && (
              <div className="p-3.5 rounded-xl bg-ivory-bg/70 border border-ivory-border/60 space-y-1">
                <span className="text-[11px] font-medium text-ink-muted uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  Localisation
                </span>
                <span className="text-xs font-medium text-ink block truncate">
                  {locationLabel}
                </span>
              </div>
            )}

            {business.websiteUrl && (
              <div className="p-3.5 rounded-xl bg-ivory-bg/70 border border-ivory-border/60 space-y-1">
                <span className="text-[11px] font-medium text-ink-muted uppercase tracking-wider flex items-center gap-1">
                  <Globe className="w-3 h-3" />
                  Site web
                </span>
                <a
                  href={business.websiteUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-terracotta hover:underline block truncate"
                >
                  {business.websiteUrl}
                </a>
              </div>
            )}

            {business.phone && (
              <div className="p-3.5 rounded-xl bg-ivory-bg/70 border border-ivory-border/60 space-y-1">
                <span className="text-[11px] font-medium text-ink-muted uppercase tracking-wider flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  Téléphone
                </span>
                <span className="text-xs font-medium text-ink block truncate">
                  {business.phone}
                </span>
              </div>
            )}

            {business.bookingUrl && (
              <div className="p-3.5 rounded-xl bg-ivory-bg/70 border border-ivory-border/60 space-y-1">
                <span className="text-[11px] font-medium text-ink-muted uppercase tracking-wider flex items-center gap-1">
                  <CalendarCheck className="w-3 h-3" />
                  Lien de prise de rendez-vous
                </span>
                <a
                  href={business.bookingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-terracotta hover:underline block truncate"
                >
                  {business.bookingUrl}
                </a>
              </div>
            )}
          </div>

          <p className="text-[11px] text-ink-muted">
            Ces informations sont utilisées pour personnaliser vos publications et vos appels à l’action dans le Studio de création.
          </p>
        </Card>

        {/* Section 3: Réseaux Sociaux */}
        <Card className="p-5 sm:p-6 rounded-2xl border border-ivory-border/80 bg-ivory-card shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-terracotta-light text-terracotta flex items-center justify-center shrink-0">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-ink">Réseaux sociaux</h2>
                <p className="text-xs text-ink-muted">
                  {activeCount > 0
                    ? `${activeCount} réseau${activeCount > 1 ? 'x' : ''} connecté${activeCount > 1 ? 's' : ''} pour la publication directe`
                    : 'Connectez Instagram et Facebook pour permettre à Mūza de publier pour vous'}
                </p>
              </div>
            </div>

            <Link
              href="/app/settings/networks"
              className="inline-flex items-center gap-2 px-4 py-2 bg-terracotta hover:bg-terracotta-dark text-white rounded-xl text-xs font-semibold transition-all shadow-xs shrink-0 self-start sm:self-center"
            >
              <span>Gérer mes réseaux</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {activeCount > 0 ? (
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/70 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {activeCount === 1
                  ? '1 compte connecté prêt pour la publication.'
                  : `${activeCount} comptes connectés prêts pour la publication.`}
              </span>
            </div>
          ) : (
            <div className="p-3.5 rounded-xl bg-ivory-bg/70 border border-ivory-border/60 text-xs text-ink-muted">
              Aucun réseau social connecté pour le moment.
            </div>
          )}
        </Card>
      </div>

      {/* 3. Security Guarantee Note */}
      <div className="p-4 rounded-2xl border border-ivory-border/60 bg-ivory-card/60 text-xs text-ink-muted leading-relaxed space-y-1.5">
        <div className="flex items-center gap-1.5 font-medium text-ink">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Données et confidentialité</span>
        </div>
        <p>
          Vos identifiants et données de connexion sont stockés de manière chiffrée et restent strictement isolés à votre entreprise.
        </p>
      </div>
    </div>
  )
}
