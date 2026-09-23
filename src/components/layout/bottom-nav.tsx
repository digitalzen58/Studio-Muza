'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Lightbulb, PlusCircle, Calendar } from 'lucide-react'
import { MuzaSymbol } from '@/components/ui/muza-symbol'
import { CreationChooserModal } from '@/components/studio/creation-chooser-modal'

export function BottomNav() {
  const pathname = usePathname()
  const [chooserOpen, setChooserOpen] = useState(false)

  const navItems: Array<{
    label: string
    href?: string
    icon?: React.ComponentType<{ className?: string }>
    isPrimary?: boolean
    isMuza?: boolean
    disabled?: boolean
  }> = [
    { label: 'Accueil', href: '/app', icon: Home },
    { label: 'Inspirations', href: '/app/inspirations', icon: Lightbulb },
    { label: 'Créer', icon: PlusCircle, isPrimary: true },
    { label: 'Calendrier', href: '/app/calendar', icon: Calendar },
    { label: 'Mūza', href: '/app/muza', isMuza: true },
  ]

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-cream-border px-3 py-2 pb-safe">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = item.href ? pathname === item.href : false
            const Icon = item.icon

            if (item.isPrimary) {
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setChooserOpen(true)}
                  className="flex flex-col items-center justify-center text-primary hover:scale-105 transition-transform cursor-pointer"
                  aria-label="Créer un nouveau contenu"
                >
                  <div className="bg-primary text-white p-2.5 rounded-full shadow-md shadow-primary/25">
                    <PlusCircle className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-medium text-primary mt-0.5">
                    {item.label}
                  </span>
                </button>
              )
            }

            if (item.disabled || !item.href) {
              return (
                <div
                  key={item.label}
                  aria-disabled="true"
                  className="flex flex-col items-center justify-center px-2 py-1 rounded-xl text-ink-muted/50 cursor-default select-none"
                >
                  {item.isMuza ? (
                    <div className="p-1 rounded-lg opacity-60">
                      <MuzaSymbol size="md" />
                    </div>
                  ) : Icon ? (
                    <Icon className="w-5 h-5 opacity-60" />
                  ) : null}
                  <span className="text-[10px] mt-1">{item.label}</span>
                </div>
              )
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`flex flex-col items-center justify-center px-2 py-1 rounded-xl transition-colors ${
                  isActive
                    ? 'text-primary font-medium'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                {item.isMuza ? (
                  <div className={`p-1 rounded-lg ${isActive ? 'bg-primary-light' : ''}`}>
                    <MuzaSymbol size="md" />
                  </div>
                ) : Icon ? (
                  <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                ) : null}
                <span className="text-[10px] mt-1">{item.label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* Shared Creation Chooser Modal */}
      <CreationChooserModal
        isOpen={chooserOpen}
        onClose={() => setChooserOpen(false)}
      />
    </>
  )
}
