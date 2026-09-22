'use client'

import React from 'react'
import type { PublicationItem } from '@/services/publication-history/types'
import { ImageIcon, Layers } from 'lucide-react'

interface PublicationThumbnailProps {
  item: PublicationItem
  className?: string
}

export function PublicationThumbnail({ item, className = '' }: PublicationThumbnailProps) {
  const isPost = item.format === 'POST'
  const composition = item.visualComposition

  // 1. Post with Visual Composition
  if (isPost && composition) {
    const bg = composition.background
    const bgColor = bg?.color || '#FFFFFF'
    const bgImage = bg?.mediaUrl || item.coverMediaUrl

    return (
      <div
        className={`relative aspect-[4/5] rounded-xl overflow-hidden shadow-2xs border border-ivory-border/80 select-none ${className}`}
        style={{ backgroundColor: bgColor }}
      >
        {bg?.type === 'IMAGE' && bgImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={bgImage}
            alt={item.coverMediaAlt || item.title}
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            style={{
              transform: `scale(${bg.scale ?? 1}) translate(${((bg.positionX ?? 0) * 50)}%, ${((bg.positionY ?? 0) * 50)}%)`,
            }}
          />
        )}

        {/* Scaled Visual Elements */}
        {composition.elements?.map((el) => {
          if (el.type === 'TEXT') {
            const isLight = el.colorMode === 'LIGHT'
            return (
              <div
                key={el.id}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none px-1 rounded max-w-[90%] ${
                  el.boxStyle === 'PILL'
                    ? isLight
                      ? 'bg-ink/75 text-white shadow-xs'
                      : 'bg-white/85 text-ink shadow-xs'
                    : isLight
                    ? 'text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]'
                    : 'text-ink drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]'
                }`}
                style={{
                  left: `${el.x * 100}%`,
                  top: `${el.y * 100}%`,
                  fontSize: `clamp(7px, 2vw, ${Math.max(8, (el.scale || 1) * 9)}px)`,
                  fontWeight: 600,
                  textAlign: 'center',
                  lineHeight: 1.1,
                }}
              >
                <span className="line-clamp-2">{el.text}</span>
              </div>
            )
          }

          if (el.type === 'EMOJI') {
            return (
              <div
                key={el.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none"
                style={{
                  left: `${el.x * 100}%`,
                  top: `${el.y * 100}%`,
                  fontSize: `clamp(8px, 2.5vw, ${Math.max(10, (el.scale || 1) * 12)}px)`,
                  lineHeight: 1,
                }}
              >
                {el.value}
              </div>
            )
          }

          return null
        })}
      </div>
    )
  }

  // 2. Carousel or direct photo cover
  if (item.coverMediaUrl) {
    return (
      <div
        className={`relative aspect-[4/5] rounded-xl overflow-hidden shadow-2xs border border-ivory-border/80 bg-ivory-card ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.coverMediaUrl}
          alt={item.coverMediaAlt || item.title}
          className="w-full h-full object-cover"
        />
        {item.format === 'CAROUSEL' && (
          <div className="absolute bottom-1.5 right-1.5 p-1 bg-ink/70 text-white rounded-md backdrop-blur-xs">
            <Layers className="w-3 h-3" />
          </div>
        )}
      </div>
    )
  }

  // 3. Fallback placeholder
  return (
    <div
      className={`relative aspect-[4/5] rounded-xl overflow-hidden shadow-2xs border border-ivory-border/80 bg-ivory flex items-center justify-center text-ink-muted/50 ${className}`}
    >
      {item.format === 'CAROUSEL' ? (
        <Layers className="w-5 h-5" />
      ) : (
        <ImageIcon className="w-5 h-5" />
      )}
    </div>
  )
}
