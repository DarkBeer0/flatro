// components/ui/image-lightbox.tsx
// Full-screen image viewer with click-to-expand behavior
'use client'

import { useState, useEffect, useCallback } from 'react'
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
  alt = 'Zdjęcie',
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
      {/* Thumbnail */}
      <button
        onClick={() => open()}
        className={`group relative cursor-pointer rounded-lg overflow-hidden ${thumbnailClassName}`}
      >
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
          <ZoomIn className="h-6 w-6 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
        </div>
      </button>

      {/* Lightbox overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={close}
        >
          {/* Controls */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            {hasMultiple && (
              <span className="text-white/70 text-sm px-3 py-1 bg-black/50 rounded-full">
                {currentIndex + 1} / {allImages.length}
              </span>
            )}
            <a
              href={currentImage.src}
              download
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2 text-white/70 hover:text-white bg-black/50 rounded-full transition-colors"
            >
              <Download className="h-5 w-5" />
            </a>
            <button
              onClick={close}
              className="p-2 text-white/70 hover:text-white bg-black/50 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation arrows */}
          {hasMultiple && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  goPrev()
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-black/50 rounded-full transition-colors z-10"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  goNext()
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-white/70 hover:text-white bg-black/50 rounded-full transition-colors z-10"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          {/* Image */}
          <div
            className="max-w-[90vw] max-h-[90vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            {!loaded && (
              <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            )}
            <img
              src={currentImage.src}
              alt={currentImage.alt || 'Zdjęcie'}
              className={`max-w-full max-h-[90vh] object-contain rounded-lg transition-opacity ${
                loaded ? 'opacity-100' : 'opacity-0 absolute'
              }`}
              onLoad={() => setLoaded(true)}
            />
          </div>
        </div>
      )}
    </>
  )
}
