import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'accent' | 'outlined'
}

export function Card({
  children,
  variant = 'default',
  className = '',
  ...props
}: CardProps) {
  const variantStyles = {
    default: 'bg-ivory-card border border-ivory-border/70 shadow-xs shadow-ink/5',
    accent: 'bg-terracotta-light border border-terracotta-border/50 text-terracotta-dark',
    outlined: 'bg-transparent border border-ivory-border',
  }

  return (
    <div
      className={`rounded-2xl p-5 md:p-6 transition-all duration-200 ${variantStyles[variant]} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
