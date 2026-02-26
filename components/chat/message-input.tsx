// components/chat/message-input.tsx
// ============================================================
// FIX: Pass localPreviewUrl through AttachmentData
// ============================================================
// PROBLEM: When a user sent a photo, the upload happened
//   correctly but the optimistic message had no image source —
//   showing only a bare timestamp until the server responded.
//
// FIX: After upload completes we store the blob URL (already
//   created for the preview) in `attachment.localPreviewUrl`.
//   ChatWindow uses this as a temporary `attachmentUrl` in the
//   optimistic message. The blob URL is revoked after the server
//   response replaces the temp message.
// ============================================================
'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, ImagePlus, Camera, X, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocale } from '@/lib/i18n/context'

// UPDATED: localPreviewUrl added for instant photo preview
interface AttachmentData {
  path: string
  metadata: { width: number; height: number; size: number; mime_type: string }
  localPreviewUrl?: string
}

interface AttachmentPreview {
  file: File
  previewUrl: string
  width?: number
  height?: number
}

interface MessageInputProps {
  onSend: (content: string, attachment?: AttachmentData) => Promise<void> | void
  disabled?: boolean
  placeholder?: string
  propertyId?: string
}

export function MessageInput({
  onSend,
  disabled = false,
  placeholder,
  propertyId,
}: MessageInputProps) {
  const { t } = useLocale()
  const chatDict = (t as any).chat || {}
  const resolvedPlaceholder = placeholder || t.messages.typeMessage

  const [message, setMessage] = useState('')
  const [attachment, setAttachment] = useState<AttachmentData | null>(null)
  const [preview, setPreview] = useState<AttachmentPreview | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const MAX_SIZE = 5 * 1024 * 1024 // 5MB

  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`
    }
  }, [message])

  const getImageDimensions = (file: File): Promise<{ width: number; height: number }> =>
    new Promise((resolve) => {
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

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return

      setUploadError(null)

      if (file.size > MAX_SIZE) {
        setUploadError(chatDict.fileTooLarge || 'File is too large. Max 5 MB')
        return
      }
      if (!file.type.startsWith('image/')) {
        setUploadError(chatDict.onlyPhotos || 'Only photos are allowed')
        return
      }

      const dimensions = await getImageDimensions(file)
      // Keep the previewUrl alive — we'll pass it to the optimistic message
      const previewUrl = URL.createObjectURL(file)
      setPreview({ file, previewUrl, ...dimensions })

      if (!propertyId) {
        setUploadError(chatDict.noPropertyId || 'Missing property ID')
        return
      }

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
          throw new Error(data.error || chatDict.uploadError || 'Upload failed')
        }

        const data = await res.json()

        // ── FIX: store localPreviewUrl so ChatWindow can show the
        //   photo immediately in the optimistic message ──────────
        setAttachment({
          path: data.path,
          metadata: {
            width: dimensions.width,
            height: dimensions.height,
            size: file.size,
            mime_type: file.type,
          },
          localPreviewUrl: previewUrl, // blob URL kept alive until server responds
        })
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : chatDict.uploadError || 'Upload failed'
        )
        // Clean up blob URL on failure
        URL.revokeObjectURL(previewUrl)
        setPreview(null)
      } finally {
        setUploading(false)
      }

      e.target.value = ''
    },
    [propertyId, chatDict]
  )

  const removePreview = useCallback(() => {
    if (preview?.previewUrl) {
      URL.revokeObjectURL(preview.previewUrl)
    }
    setPreview(null)
    setAttachment(null)
    setUploadError(null)
  }, [preview])

  const handleSubmit = () => {
    const trimmed = message.trim()
    const hasAttachment = !!attachment
    if (!trimmed && !hasAttachment) return
    if (disabled || uploading) return

    setMessage('')
    const currentAttachment = attachment
    // Don't revoke previewUrl here — ChatWindow will revoke it after
    // the server response replaces the optimistic message
    setPreview(null)
    setAttachment(null)
    setUploadError(null)

    textareaRef.current?.focus()
    Promise.resolve(onSend(trimmed, currentAttachment || undefined)).catch((err) => {
      console.error('Failed to send message:', err)
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const canSend = (message.trim() || attachment) && !disabled && !uploading

  return (
    <div className="border-t bg-white p-3">
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

      {/* Upload error */}
      {uploadError && (
        <div className="flex items-center gap-1.5 p-2 mb-2 bg-red-50 text-red-600 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="ml-auto p-0.5">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Attachment preview */}
      {preview && (
        <div className="flex items-center gap-2 p-2 mb-2 bg-gray-50 rounded-lg border">
          <div className="relative w-14 h-14 rounded-md overflow-hidden flex-shrink-0 bg-gray-200">
            <img
              src={preview.previewUrl}
              alt={chatDict.photo || 'Photo'}
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
              {preview.width ? ` · ${preview.width}×${preview.height}` : ''}
            </p>
            {uploading && (
              <p className="text-xs text-blue-600">{t.common.loading}</p>
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

      {/* Input row */}
      <div className="flex items-end gap-2">
        {propertyId && !preview && (
          <div className="flex items-center gap-0.5 pb-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled || uploading}
              className="text-gray-400 hover:text-blue-600 p-2 h-9 w-9"
            >
              <ImagePlus className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => cameraInputRef.current?.click()}
              disabled={disabled || uploading}
              className="text-gray-400 hover:text-blue-600 p-2 h-9 w-9 sm:hidden"
            >
              <Camera className="h-5 w-5" />
            </Button>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={resolvedPlaceholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-full border border-gray-300 px-4 py-2.5 text-sm 
                     focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500
                     disabled:bg-gray-50 disabled:text-gray-500
                     max-h-[120px] overflow-y-auto"
        />

        <button
          onClick={handleSubmit}
          disabled={!canSend}
          className="shrink-0 w-10 h-10 rounded-full bg-blue-600 text-white 
                     flex items-center justify-center
                     hover:bg-blue-700 transition-colors
                     disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}