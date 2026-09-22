'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Lightbulb, PlusCircle, Calendar, Settings, LogOut } from 'lucide-react'
import { MuzaSymbol } from '@/components/ui/muza-symbol'
import { logout } from '@/app/auth/actions'
import { CreationChooserModal } from '@/components/studio/creation-chooser-modal'

interface DesktopSidebarProps {
  userEmail?: string | null
  userName?: string | null
}

export function DesktopSidebar({ userEmail, userName }: DesktopSidebarProps) {
  const pathname = usePathname()
  const [chooserOpen, setChooserOpen] = useState(false)

  const displayName = userName || userEmail?.split('@')[0] || 'Entrepreneur'
  const isSettingsActive = pathname === '/app/settings' || pathname.startsWith('/app/settings/')

  const navItems: Array<{
    label: string
    href?: string
    icon?: React.ComponentType<{ className?: string }>
    isMuza?: boolean
    disabled?: boolean
  }> = [
    { label: 'Accueil', href: '/app', icon: Home },
    { label: 'Inspirations', href: '/app/inspirations', icon: Lightbulb },
    { label: 'Calendrier', href: '/app/calendar', icon: Calendar },
    { label: 'Mūza', href: '/app/muza', isMuza: true },
  ]

  return (
    <>
      <aside className="hidden md:flex flex-col w-60 lg:w-64 border-r border-ivory-border bg-ivory-card/80 p-5 shrink-0 min-h-screen justify-between sticky top-0 h-screen select-none">
        {/* Top: Logo + Nav */}
        <div className="space-y-6">
          {/* Brand Logo */}
          <Link href="/app" className="flex items-center gap-2 group px-2 py-1">
            <span className="font-serif text-xl font-bold tracking-tight text-ink group-hover:text-terracotta transition-colors">
              Studio Mūza
            </span>
            <MuzaSymbol size="md" />
          </Link>

          {/* Primary Create Button */}
          <button
            type="button"
            onClick={() => setChooserOpen(true)}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-terracotta text-white rounded-xl text-xs font-semibold hover:bg-terracotta-dark transition-all shadow-xs hover:shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Créer un contenu</span>
          </button>

          {/* Primary 5 Destinations Navigation */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const isActive = item.href ? pathname === item.href : false
              const Icon = item.icon

              if (item.disabled || !item.href) {
                return (
                  <div
                    key={item.label}
                    aria-disabled="true"
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-ink-muted/50 cursor-default select-none"
                  >
                    {item.isMuza ? (
                      <div className="w-4 h-4 flex items-center justify-center opacity-60">
                        <MuzaSymbol size="sm" />
                      </div>
                    ) : Icon ? (
                      <Icon className="w-4 h-4 opacity-60" />
                    ) : null}
                    <span>{item.label}</span>
                  </div>
                )
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-terracotta-light/70 text-terracotta font-semibold'
                      : 'text-ink-muted hover:text-ink hover:bg-white/60'
                  }`}
                >
                  {item.isMuza ? (
                    <div className="w-4 h-4 flex items-center justify-center">
                      <MuzaSymbol size="sm" />
                    </div>
                  ) : Icon ? (
                    <Icon className={`w-4 h-4 ${isActive ? 'text-terracotta' : 'text-ink-muted'}`} />
                  ) : null}
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        {/* Bottom Area: Settings Utility Navigation & User Info */}
        <div className="space-y-3">
          {/* Settings Utility Link (Visually separated from primary navigation) */}
          <Link
            href="/app/settings"
            className={`flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
              isSettingsActive
                ? 'bg-terracotta-light/70 text-terracotta font-semibold'
                : 'text-ink-muted hover:text-ink hover:bg-white/60'
            }`}
          >
            <Settings className={`w-4 h-4 ${isSettingsActive ? 'text-terracotta' : 'text-ink-muted'}`} />
            <span>Paramètres</span>
          </Link>

          {/* User Info & Logout */}
          <div className="pt-3 border-t border-ivory-border/80 flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <span className="text-xs font-medium text-ink block truncate" title={displayName}>
                {displayName}
              </span>
              <span className="text-[11px] text-ink-muted block truncate" title={userEmail || ''}>
                {userEmail || ''}
              </span>
            </div>

            <form action={logout}>
              <button
                type="submit"
                title="Se déconnecter"
                className="p-2 text-ink-muted hover:text-terracotta hover:bg-terracotta-light rounded-xl transition-colors flex items-center justify-center text-xs cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Shared Creation Chooser Modal */}
      <CreationChooserModal
        isOpen={chooserOpen}
        onClose={() => setChooserOpen(false)}
      />
    </>
  )
}
