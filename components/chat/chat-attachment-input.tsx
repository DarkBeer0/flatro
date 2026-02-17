// components/chat/chat-attachment-input.tsx
// Handles image selection (gallery + camera), preview, removal, and upload
'use client'

import { useState, useRef, useCallback } from 'react'
import { ImagePlus, Camera, X, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AttachmentPreview {
  file: File
  previewUrl: string
  width?: number
  height?: number
}

interface ChatAttachmentInputProps {
  propertyId: string
  onAttachmentReady: (data: {
    path: string
    metadata: { width: number; height: number; size: number; mime_type: string }
  }) => void
  onAttachmentRemoved: () => void
  disabled?: boolean
}

export function ChatAttachmentInput({
  propertyId,
  onAttachmentReady,
  onAttachmentRemoved,
  disabled = false,
}: ChatAttachmentInputProps) {
  const [preview, setPreview] = useState<AttachmentPreview | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const MAX_SIZE = 5 * 1024 * 1024 // 5MB

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setError(null)

      // Validate
      if (file.size > MAX_SIZE) {
        setError('Plik jest za duży. Maks. 5 MB')
        return
      }

      if (!file.type.startsWith('image/')) {
        setError('Dozwolone tylko zdjęcia')
        return
      }

      // Get dimensions
      const dimensions = await getImageDimensions(file)
      const previewUrl = URL.createObjectURL(file)

      setPreview({ file, previewUrl, ...dimensions })

      // Upload immediately
      setUploading(true)
      try {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'chat')
        formData.append('propertyId', propertyId)

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Błąd przesyłania')
        }

        const data = await res.json()

        onAttachmentReady({
          path: data.path,
          metadata: {
            width: dimensions.width,
            height: dimensions.height,
            size: file.size,
            mime_type: file.type,
          },
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Błąd przesyłania')
        removePreview()
      } finally {
        setUploading(false)
      }

      // Reset input
      e.target.value = ''
    },
    [propertyId, onAttachmentReady]
  )

  const removePreview = useCallback(() => {
    if (preview?.previewUrl) {
      URL.revokeObjectURL(preview.previewUrl)
    }
    setPreview(null)
    setError(null)
    onAttachmentRemoved()
  }, [preview, onAttachmentRemoved])

  return (
    <div className="relative">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
        disabled={disabled || uploading}
      />

      {/* Preview bar */}
      {preview && (
        <div className="flex items-center gap-2 p-2 mb-2 bg-gray-50 rounded-lg border">
          <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0 bg-gray-200">
            <img
              src={preview.previewUrl}
              alt="Podgląd"
              className="w-full h-full object-cover"
            />
            {uploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-700 truncate">{preview.file.name}</p>
            <p className="text-xs text-gray-500">
              {(preview.file.size / 1024).toFixed(0)} KB
              {preview.width && ` · ${preview.width}×${preview.height}`}
            </p>
            {uploading && (
              <p className="text-xs text-blue-600">Przesyłanie...</p>
            )}
          </div>
          <button
            onClick={removePreview}
            disabled={uploading}
            className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-1.5 p-2 mb-2 bg-red-50 text-red-600 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className="ml-auto p-0.5">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Attachment buttons — shown when no preview */}
      {!preview && (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="text-gray-500 hover:text-blue-600 p-2"
            title="Dodaj zdjęcie"
          >
            <ImagePlus className="h-5 w-5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => cameraInputRef.current?.click()}
            disabled={disabled}
            className="text-gray-500 hover:text-blue-600 p-2 sm:hidden"
            title="Zrób zdjęcie"
          >
            <Camera className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  )
}

// Helper: get image dimensions
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => {
      resolve({ width: 0, height: 0 })
      URL.revokeObjectURL(img.src)
    }
    img.src = URL.createObjectURL(file)
  })
}
