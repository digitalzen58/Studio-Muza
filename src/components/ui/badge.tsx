import React from 'react'
import { MuzaSymbol } from './muza-symbol'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'ivory' | 'ink' | 'terracotta'
  showSymbol?: boolean
}

export function Badge({
  children,
  variant = 'primary',
  showSymbol = false,
  className = '',
  ...props
}: BadgeProps) {
  const variantStyles = {
    primary: 'bg-primary-light text-primary-dark border border-primary-border/60',
    secondary: 'bg-cream-subtle text-ink-muted border border-cream-border',
    terracotta: 'bg-primary-light text-primary-dark border border-primary-border/60',
    ivory: 'bg-white text-ink border border-cream-border shadow-2xs',
    ink: 'bg-ink text-white',
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
