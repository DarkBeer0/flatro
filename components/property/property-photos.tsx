// components/property/property-photos.tsx
// Photo gallery for property cards
// Owner: can upload + delete photos
// Tenant: view-only
'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  ImagePlus, X, Loader2, Camera, ChevronLeft, ChevronRight,
  Trash2, AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useLocale } from '@/lib/i18n/context'

interface Photo {
  path: string
  url: string | null
  index: number
}

interface PropertyPhotosProps {
  propertyId: string
  isOwner: boolean
  maxPhotos?: number
}

export function PropertyPhotos({
  propertyId,
  isOwner,
  maxPhotos = 10,
}: PropertyPhotosProps) {
  const { t } = useLocale()
  // Property photos keys not yet in dictionary type — safe access via `prop`
  const prop = (t.properties || {}) as unknown as Record<string, string>
  const common = (t.common || {}) as unknown as Record<string, string>
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch photos
  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch(`/api/properties/${propertyId}/photos`)
      if (!res.ok) throw new Error('Failed to load photos')
      const data = await res.json()
      setPhotos(data.photos || [])
    } catch (err) {
      console.error('Error loading photos:', err)
    } finally {
      setLoading(false)
    }
  }, [propertyId])

  useEffect(() => {
    fetchPhotos()
  }, [fetchPhotos])

  // Upload photo
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)

    if (file.size > 5 * 1024 * 1024) {
      setError(common.error || 'File too large. Max 5 MB')
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('Only images allowed')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch(`/api/properties/${propertyId}/photos`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Upload failed')
      }

      await fetchPhotos()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  // Delete photo
  const handleDelete = async (path: string) => {
    if (deleting) return
    setDeleting(path)

    try {
      const res = await fetch(`/api/properties/${propertyId}/photos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path }),
      })

      if (!res.ok) throw new Error('Failed to delete')

      setPhotos(prev => prev.filter(p => p.path !== path))
      if (selectedIndex !== null) setSelectedIndex(null)
    } catch (err) {
      console.error('Delete error:', err)
    } finally {
      setDeleting(null)
    }
  }

  // Lightbox navigation
  const goNext = () => {
    if (selectedIndex === null) return
    setSelectedIndex((selectedIndex + 1) % photos.length)
  }

  const goPrev = () => {
    if (selectedIndex === null) return
    setSelectedIndex((selectedIndex - 1 + photos.length) % photos.length)
  }

  // Loading state
  if (loading) {
    return (
      <Card className="p-4 lg:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Camera className="h-5 w-5 text-indigo-600" />
          <h3 className="font-semibold">{prop.photos || 'Photos'}</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </Card>
    )
  }

  return (
    <>
      <Card className="p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Camera className="h-5 w-5 text-indigo-600" />
            {prop.photos || 'Photos'}
            {photos.length > 0 && (
              <span className="text-xs font-normal text-gray-400">
                ({photos.length}/{maxPhotos})
              </span>
            )}
          </h3>

          {isOwner && photos.length < maxPhotos && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <ImagePlus className="h-4 w-4 mr-1" />
              )}
              {common.add || 'Add'}
            </Button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUpload}
            disabled={uploading}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-1.5 p-2 mb-3 bg-red-50 text-red-600 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Photo grid */}
        {photos.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Camera className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {isOwner
                ? (prop.addPhotosHint || 'Add photos of your property')
                : (prop.noPhotos || 'No photos yet')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {photos.map((photo, idx) => (
              <div
                key={photo.path}
                className="relative group aspect-[4/3] rounded-lg overflow-hidden bg-gray-100 cursor-pointer"
                onClick={() => setSelectedIndex(idx)}
              >
                {photo.url ? (
                  <img
                    src={photo.url}
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Camera className="h-6 w-6 text-gray-300" />
                  </div>
                )}

                {/* Delete button (owner only) */}
                {isOwner && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDelete(photo.path)
                    }}
                    disabled={deleting === photo.path}
                    className="absolute top-1.5 right-1.5 p-1 bg-black/60 rounded-full text-white 
                               opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                  >
                    {deleting === photo.path ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </div>
            ))}

            {/* Upload placeholder for owner */}
            {isOwner && photos.length < maxPhotos && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="aspect-[4/3] rounded-lg border-2 border-dashed border-gray-300 
                           flex flex-col items-center justify-center gap-1 text-gray-400 
                           hover:border-blue-400 hover:text-blue-500 transition-colors"
              >
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="h-6 w-6" />
                    <span className="text-xs">{common.add || 'Add'}</span>
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </Card>

      {/* Lightbox */}
      {selectedIndex !== null && photos[selectedIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setSelectedIndex(null)}
        >
          {/* Close */}
          <button
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white z-10"
            onClick={() => setSelectedIndex(null)}
          >
            <X className="h-6 w-6" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 text-white/60 text-sm">
            {selectedIndex + 1} / {photos.length}
          </div>

          {/* Navigation */}
          {photos.length > 1 && (
            <>
              <button
                className="absolute left-2 p-2 text-white/60 hover:text-white z-10"
                onClick={(e) => { e.stopPropagation(); goPrev() }}
              >
                <ChevronLeft className="h-8 w-8" />
              </button>
              <button
                className="absolute right-2 p-2 text-white/60 hover:text-white z-10"
                onClick={(e) => { e.stopPropagation(); goNext() }}
              >
                <ChevronRight className="h-8 w-8" />
              </button>
            </>
          )}

          {/* Image */}
          <img
            src={photos[selectedIndex].url || ''}
            alt={`Photo ${selectedIndex + 1}`}
            className="max-w-[90vw] max-h-[85vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Delete in lightbox (owner only) */}
          {isOwner && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete(photos[selectedIndex].path)
              }}
              disabled={deleting === photos[selectedIndex].path}
              className="absolute bottom-6 bg-red-600/80 text-white px-4 py-2 rounded-lg 
                         hover:bg-red-600 transition-colors flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {common.delete || 'Delete'}
            </button>
          )}
        </div>
      )}
    </>
  )
}