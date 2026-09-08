import React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
}

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-terracotta/40 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100'

  const variantStyles = {
    primary: 'bg-terracotta text-white hover:bg-terracotta-hover shadow-sm shadow-terracotta/20',
    secondary: 'bg-terracotta-light text-terracotta-dark hover:bg-terracotta-border/40',
    outline: 'border border-ivory-border bg-ivory-card text-ink hover:bg-ivory-subtle hover:border-terracotta/30',
    ghost: 'text-ink-muted hover:text-ink hover:bg-ivory-subtle',
  }

  const sizeStyles = {
    sm: 'px-3.5 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3.5 text-base',
  }

  const widthStyle = fullWidth ? 'w-full' : ''

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyle} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  )
}
