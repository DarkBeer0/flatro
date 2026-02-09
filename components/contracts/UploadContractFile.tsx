// components/contracts/UploadContractFile.tsx
'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, FileText, X, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface UploadContractFileProps {
  label: string
  description?: string
  accept?: string
  maxSizeMb?: number
  value?: string | null // existing file URL
  fileName?: string | null
  onUpload: (file: File) => Promise<string> // returns URL
  onRemove?: () => void
  required?: boolean
  disabled?: boolean
}

export default function UploadContractFile({
  label,
  description,
  accept = '.pdf,.jpg,.jpeg,.png',
  maxSizeMb = 10,
  value,
  fileName,
  onUpload,
  onRemove,
  required = false,
  disabled = false,
}: UploadContractFileProps) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = useCallback(
    async (file: File) => {
      setError(null)

      // Validate size
      if (file.size > maxSizeMb * 1024 * 1024) {
        setError(`Plik jest za duży. Maksymalny rozmiar: ${maxSizeMb} MB`)
        return
      }

      // Validate type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
      if (!allowedTypes.includes(file.type)) {
        setError('Nieobsługiwany format pliku. Dozwolone: PDF, JPG, PNG')
        return
      }

      setUploading(true)
      try {
        await onUpload(file)
      } catch (err) {
        setError('Błąd podczas wgrywania pliku. Spróbuj ponownie.')
        console.error('Upload error:', err)
      } finally {
        setUploading(false)
      }
    },
    [maxSizeMb, onUpload]
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset input so same file can be re-uploaded
    if (inputRef.current) inputRef.current.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = () => setDragOver(false)

  // File already uploaded
  if (value) {
    return (
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-800 truncate">
              {fileName || 'Plik wgrany'}
            </p>
            <a
              href={value}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-green-600 hover:underline"
            >
              Zobacz plik
            </a>
          </div>
          {onRemove && !disabled && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="text-gray-400 hover:text-red-500"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {description && (
        <p className="text-xs text-gray-500">{description}</p>
      )}

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
        className={`
          relative flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg
          transition-colors cursor-pointer
          ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${error ? 'border-red-300 bg-red-50' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled || uploading}
        />

        {uploading ? (
          <>
            <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
            <p className="text-sm text-gray-600">Wgrywanie...</p>
          </>
        ) : (
          <>
            <Upload className="h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm font-medium text-gray-700">Wybierz plik</p>
            <p className="text-xs text-gray-500 mt-1">
              lub przeciągnij i upuść tutaj
            </p>
            <p className="text-xs text-gray-400 mt-1">
              PDF, JPG, PNG · maks. {maxSizeMb} MB
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}