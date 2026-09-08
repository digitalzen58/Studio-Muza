import React from 'react'
import { MuzaSymbol } from './muza-symbol'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'terracotta' | 'ivory' | 'ink'
  showSymbol?: boolean
}

export function Badge({
  children,
  variant = 'terracotta',
  showSymbol = false,
  className = '',
  ...props
}: BadgeProps) {
  const variantStyles = {
    terracotta: 'bg-terracotta-light text-terracotta-dark border border-terracotta-border/50',
    ivory: 'bg-ivory-card text-ink border border-ivory-border',
    ink: 'bg-ink text-ivory-card',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {showSymbol && <MuzaSymbol size="sm" />}
      {children}
    </span>
  )
}
