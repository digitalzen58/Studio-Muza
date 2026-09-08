import React from 'react'

interface MuzaSymbolProps {
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function MuzaSymbol({ className = '', size = 'md' }: MuzaSymbolProps) {
  const sizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center text-terracotta select-none ${sizeClasses[size]} ${className}`}
    >
      ✦
    </span>
  )
}
