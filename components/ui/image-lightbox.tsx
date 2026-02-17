// components/ui/image-lightbox.tsx
// FIXED: Thumbnail uses next/image for optimization (lazy loading, responsive sizing)
// FIXED: Default alt uses English instead of hardcoded Polish 'Zdjęcie'
// NOTE: Lightbox full-size view keeps native <img> for unconstrained rendering
'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { X, ZoomIn, Download, ChevronLeft, ChevronRight } from 'lucide-react'

interface ImageLightboxProps {
  src: string
  alt?: string
  thumbnailClassName?: string
  /** Multiple images for gallery mode */
  images?: { src: string; alt?: string }[]
  startIndex?: number
}

export function ImageLightbox({
  src,
  alt = 'Photo',
  thumbnailClassName = '',
  images,
  startIndex = 0,
}: ImageLightboxProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(startIndex)
  const [loaded, setLoaded] = useState(false)

  const allImages = images || [{ src, alt }]
  const currentImage = allImages[currentIndex]
  const hasMultiple = allImages.length > 1

  const open = useCallback(
    (index?: number) => {
      setCurrentIndex(index ?? startIndex)
      setIsOpen(true)
      setLoaded(false)
    },
    [startIndex]
  )

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const goNext = useCallback(() => {
    setLoaded(false)
    setCurrentIndex((prev) => (prev + 1) % allImages.length)
  }, [allImages.length])

  const goPrev = useCallback(() => {
    setLoaded(false)
    setCurrentIndex((prev) => (prev - 1 + allImages.length) % allImages.length)
  }, [allImages.length])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'ArrowRight' && hasMultiple) goNext()
      if (e.key === 'ArrowLeft' && hasMultiple) goPrev()
    }
    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [isOpen, close, goNext, goPrev, hasMultiple])

  return (
    <>
      {/* Thumbnail — uses next/image for automatic optimization */}
      <button
        onClick={() => open()}
        className={`group relative cursor-pointer rounded-lg overflow-hidden ${thumbnailClassName}`}
      >
        <Image
          src={src}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 300px"
          className="object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
        </div>
      </button>

      {/* Lightbox overlay — full-size uses native <img> for unconstrained rendering */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={close}
        >
          {/* Controls */}
          <div className="absolute top-4 right-4 flex gap-2 z-10">
            <a
              href={currentImage.src}
              download
              onClick={(e) => e.stopPropagation()}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <Download className="h-5 w-5" />
            </a>
            <button
              onClick={(e) => { e.stopPropagation(); close() }}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Prev/Next */}
          {hasMultiple && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); goPrev() }}
                className="absolute left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); goNext() }}
                className="absolute right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors z-10"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Image */}
          <div className="max-w-[90vw] max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
            {!loaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
            {/* Full-size: native <img> — no resizing needed */}
            <img
              src={currentImage.src}
              alt={currentImage.alt || alt}
              className={`max-w-[90vw] max-h-[90vh] object-contain transition-opacity ${
                loaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoad={() => setLoaded(true)}
            />
          </div>

          {/* Counter */}
          {hasMultiple && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
              {currentIndex + 1} / {allImages.length}
            </div>
          )}
        </div>
      )}
    </>
  )
}