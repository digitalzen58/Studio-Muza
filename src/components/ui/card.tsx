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
    default: 'bg-white border border-cream-border/80 shadow-2xs shadow-ink/5',
    accent: 'bg-primary-light border border-primary-border/60 text-primary-dark',
    outlined: 'bg-transparent border border-cream-border',
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
