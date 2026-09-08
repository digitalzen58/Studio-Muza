import React from 'react'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export function Input({
  label,
  error,
  hint,
  id,
  className = '',
  ...props
}: InputProps) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-ink-muted uppercase tracking-wider"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`w-full px-4 py-3 bg-ivory-card border rounded-xl text-sm text-ink placeholder:text-ink-light transition-all focus:outline-none focus:ring-2 focus:ring-terracotta/30 focus:border-terracotta ${
          error ? 'border-red-400 focus:ring-red-200' : 'border-ivory-border hover:border-ivory-border/80'
        } ${className}`}
        {...props}
      />
      {hint && !error && <p className="text-xs text-ink-light">{hint}</p>}
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  )
}
