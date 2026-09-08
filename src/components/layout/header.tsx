'use client'

import Link from 'next/link'
import { MuzaSymbol } from '@/components/ui/muza-symbol'
import { logout } from '@/app/auth/actions'
import { LogOut } from 'lucide-react'

interface HeaderProps {
  userEmail?: string | null
  userName?: string | null
}

export function Header({ userEmail, userName }: HeaderProps) {
  const displayName = userName || userEmail?.split('@')[0] || 'Entrepreneur'

  return (
    <header className="sticky top-0 z-30 bg-ivory/95 backdrop-blur-md border-b border-ivory-border/80 px-4 py-3">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* Brand logo */}
        <Link href="/app" className="flex items-center gap-1.5 group">
          <span className="font-serif text-xl font-bold tracking-tight text-ink group-hover:text-terracotta transition-colors">
            Studio Mūza
          </span>
          <MuzaSymbol size="md" />
        </Link>

        {/* User menu & logout */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-muted hidden sm:inline-block max-w-[120px] truncate">
            {displayName}
          </span>
          <form action={logout}>
            <button
              type="submit"
              title="Se déconnecter"
              className="p-2 text-ink-muted hover:text-terracotta hover:bg-terracotta-light rounded-full transition-colors flex items-center justify-center text-xs"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </header>
  )
}
