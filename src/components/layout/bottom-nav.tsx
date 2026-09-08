'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Lightbulb, PlusCircle, Calendar } from 'lucide-react'
import { MuzaSymbol } from '@/components/ui/muza-symbol'

export function BottomNav() {
  const pathname = usePathname()

  const navItems = [
    { label: 'Accueil', href: '/app', icon: Home },
    { label: 'Inspirations', href: '/app/inspirations', icon: Lightbulb },
    { label: 'Créer', href: '/app/create', icon: PlusCircle, isPrimary: true },
    { label: 'Calendrier', href: '/app/calendar', icon: Calendar },
    { label: 'Mūza', href: '/app/muza', isMuza: true },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-ivory-card/95 backdrop-blur-md border-t border-ivory-border px-3 py-2 pb-safe">
      <div className="max-w-md mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          const Icon = item.icon

          if (item.isPrimary) {
            return (
              <Link
                key={item.label}
                href={item.href}
                className="flex flex-col items-center justify-center text-terracotta hover:scale-105 transition-transform"
              >
                <div className="bg-terracotta text-white p-2.5 rounded-full shadow-md shadow-terracotta/30">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-medium text-terracotta mt-0.5">
                  {item.label}
                </span>
              </Link>
            )
          }

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex flex-col items-center justify-center px-2 py-1 rounded-xl transition-colors ${
                isActive
                  ? 'text-terracotta font-medium'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              {item.isMuza ? (
                <div className={`p-1 rounded-lg ${isActive ? 'bg-terracotta-light' : ''}`}>
                  <MuzaSymbol size="md" />
                </div>
              ) : Icon ? (
                <Icon className={`w-5 h-5 ${isActive ? 'text-terracotta' : ''}`} />
              ) : null}
              <span className="text-[10px] mt-1">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
