// components/issues/issue-form.tsx
// Comprehensive zgłoszenie (issue) creation form
// Features: privacy toggle, category/priority selection, multi-photo upload
'use client'

import { useState, useRef, useCallback } from 'react'
import {
  ImagePlus, Camera, X, Loader2, AlertCircle,
  Lock, Globe, Wrench, Zap, Droplets,
  Thermometer, Bug, Sparkles, HelpCircle,
  Send, ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

// ============ Types ============

interface UploadedFile {
  id: string // local temp ID
  file: File
  previewUrl: string
  filePath?: string // from server after upload
  fileName: string
  fileSize: number
  mimeType: string
  metadata?: { width: number; height: number }
  uploading: boolean
  error?: string
}

interface IssueFormProps {
  propertyId: string
  showPrivacyToggle: boolean // only show if >1 tenant
  onSubmit: (data: IssueFormData) => Promise<void>
  onCancel?: () => void
}

export interface IssueFormData {
  title: string
  description: string
  category: string
  priority: string
  isPrivate: boolean
  attachments: {
    filePath: string
    fileName: string
    fileSize: number
    mimeType: string
    metadata?: { width: number; height: number }
  }[]
}

// ============ Constants ============

const CATEGORIES = [
  { value: 'PLUMBING', label: 'Hydraulika', icon: Droplets },
  { value: 'ELECTRICAL', label: 'Elektryka', icon: Zap },
  { value: 'HEATING', label: 'Ogrzewanie', icon: Thermometer },
  { value: 'APPLIANCE', label: 'Sprzęt AGD', icon: Wrench },
  { value: 'STRUCTURAL', label: 'Konstrukcja', icon: Wrench },
  { value: 'PEST_CONTROL', label: 'Dezynsekcja', icon: Bug },
  { value: 'CLEANING', label: 'Czystość', icon: Sparkles },
  { value: 'OTHER', label: 'Inne', icon: HelpCircle },
]

const PRIORITIES = [
  { value: 'LOW', label: 'Niski', desc: 'Może poczekać' },
  { value: 'MEDIUM', label: 'Średni', desc: 'Normalna pilność' },
  { value: 'HIGH', label: 'Wysoki', desc: 'Wymaga szybkiej reakcji' },
  { value: 'URGENT', label: 'Pilne', desc: 'Natychmiastowa interwencja' },
]

const MAX_PHOTOS = 5
const MAX_FILE_SIZE = 5 * 1024 * 1024

// ============ Component ============

export function IssueForm({
  propertyId,
  showPrivacyToggle,
  onSubmit,
  onCancel,
}: IssueFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('OTHER')
  const [priority, setPriority] = useState('MEDIUM')
  const [isPrivate, setIsPrivate] = useState(false)
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  // ---- File handling ----

  const addFiles = useCallback(
    async (fileList: FileList) => {
      const newFiles: UploadedFile[] = []

      for (let i = 0; i < fileList.length; i++) {
        if (files.length + newFiles.length >= MAX_PHOTOS) break

        const file = fileList[i]

        if (file.size > MAX_FILE_SIZE) {
          continue // skip oversized
        }
        if (!file.type.startsWith('image/')) {
          continue // skip non-images
        }

        const id = `${Date.now()}_${i}`
        const previewUrl = URL.createObjectURL(file)
        const dimensions = await getImageDimensions(file)

        newFiles.push({
          id,
          file,
          previewUrl,
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type,
          metadata: dimensions,
          uploading: true,
        })
      }

      setFiles((prev) => [...prev, ...newFiles])

      // Upload each file
      for (const f of newFiles) {
        try {
          const formData = new FormData()
          formData.append('file', f.file)
          formData.append('type', 'issue')
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

          setFiles((prev) =>
            prev.map((item) =>
              item.id === f.id
                ? { ...item, filePath: data.path, uploading: false }
                : item
            )
          )
        } catch (err) {
          setFiles((prev) =>
            prev.map((item) =>
              item.id === f.id
                ? {
                    ...item,
                    uploading: false,
                    error: err instanceof Error ? err.message : 'Błąd',
                  }
                : item
            )
          )
        }
      }
    },
    [files.length, propertyId]
  )

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id)
      if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl)
      return prev.filter((f) => f.id !== id)
    })
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      addFiles(e.target.files)
      e.target.value = ''
    }
  }

  // ---- Submit ----

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!title.trim()) newErrors.title = 'Tytuł jest wymagany'
    if (!description.trim()) newErrors.description = 'Opis jest wymagany'
    if (title.trim().length < 3) newErrors.title = 'Tytuł musi mieć min. 3 znaki'

    const stillUploading = files.some((f) => f.uploading)
    if (stillUploading) newErrors.files = 'Poczekaj na zakończenie przesyłania zdjęć'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      const uploadedAttachments = files
        .filter((f) => f.filePath && !f.error)
        .map((f) => ({
          filePath: f.filePath!,
          fileName: f.fileName,
          fileSize: f.fileSize,
          mimeType: f.mimeType,
          metadata: f.metadata,
        }))

      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        isPrivate,
        attachments: uploadedAttachments,
      })
    } catch (err) {
      setErrors({ general: err instanceof Error ? err.message : 'Wystąpił błąd' })
    } finally {
      setSubmitting(false)
    }
  }

  const anyUploading = files.some((f) => f.uploading)

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* General error */}
      {errors.general && (
        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{errors.general}</span>
        </div>
      )}

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="issue-title">
          Tytuł <span className="text-red-500">*</span>
        </Label>
        <Input
          id="issue-title"
          placeholder="np. Cieknący kran w łazience"
          value={title}
          onChange={(e) => {
            setTitle(e.target.value)
            if (errors.title) setErrors((p) => ({ ...p, title: '' }))
          }}
          className={errors.title ? 'border-red-400' : ''}
        />
        {errors.title && (
          <p className="text-red-500 text-xs">{errors.title}</p>
        )}
      </div>

      {/* Category + Priority row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Category */}
        <div className="space-y-1.5">
          <Label>Kategoria</Label>
          <div className="relative">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-10 px-3 pr-8 border rounded-md text-sm bg-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Priority */}
        <div className="space-y-1.5">
          <Label>Priorytet</Label>
          <div className="grid grid-cols-4 gap-1">
            {PRIORITIES.map((p) => (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className={`px-2 py-1.5 text-xs rounded-md border transition-colors ${
                  priority === p.value
                    ? p.value === 'URGENT'
                      ? 'bg-red-100 border-red-300 text-red-700'
                      : p.value === 'HIGH'
                      ? 'bg-orange-100 border-orange-300 text-orange-700'
                      : p.value === 'MEDIUM'
                      ? 'bg-blue-100 border-blue-300 text-blue-700'
                      : 'bg-gray-100 border-gray-300 text-gray-700'
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
                title={p.desc}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="issue-desc">
          Opis usterki <span className="text-red-500">*</span>
        </Label>
        <textarea
          id="issue-desc"
          rows={4}
          placeholder="Opisz problem szczegółowo..."
          value={description}
          onChange={(e) => {
            setDescription(e.target.value)
            if (errors.description) setErrors((p) => ({ ...p, description: '' }))
          }}
          className={`w-full px-3 py-2 border rounded-md text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.description ? 'border-red-400' : 'border-gray-300'
          }`}
        />
        {errors.description && (
          <p className="text-red-500 text-xs">{errors.description}</p>
        )}
      </div>

      {/* Photos */}
      <div className="space-y-2">
        <Label className="flex items-center justify-between">
          <span>Zdjęcia (maks. {MAX_PHOTOS})</span>
          <span className="text-xs text-gray-400 font-normal">
            {files.length}/{MAX_PHOTOS}
          </span>
        </Label>

        {/* Photo previews */}
        {files.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {files.map((f) => (
              <div
                key={f.id}
                className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-100 group"
              >
                <img
                  src={f.previewUrl}
                  alt={f.fileName}
                  className="w-full h-full object-cover"
                />
                {f.uploading && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-white" />
                  </div>
                )}
                {f.error && (
                  <div className="absolute inset-0 bg-red-500/60 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(f.id)}
                  className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {errors.files && (
          <p className="text-red-500 text-xs">{errors.files}</p>
        )}

        {/* Add photo buttons */}
        {files.length < MAX_PHOTOS && (
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileInput}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileInput}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="text-sm"
            >
              <ImagePlus className="h-4 w-4 mr-1.5" />
              Dodaj zdjęcie
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => cameraInputRef.current?.click()}
              className="text-sm sm:hidden"
            >
              <Camera className="h-4 w-4 mr-1.5" />
              Aparat
            </Button>
          </div>
        )}
      </div>

      {/* Privacy toggle */}
      {showPrivacyToggle && (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isPrivate ? (
                <Lock className="h-5 w-5 text-gray-500" />
              ) : (
                <Globe className="h-5 w-5 text-blue-500" />
              )}
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {isPrivate ? 'Prywatne zgłoszenie' : 'Zgłoszenie publiczne'}
                </p>
                <p className="text-xs text-gray-500">
                  {isPrivate
                    ? 'Widoczne tylko dla Ciebie i właściciela'
                    : 'Widoczne dla wszystkich lokatorów tego mieszkania'}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isPrivate}
              onClick={() => setIsPrivate((prev) => !prev)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                isPrivate ? 'bg-gray-400' : 'bg-blue-600'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${
                  isPrivate ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </Card>
      )}

      {/* Submit */}
      <div className="flex gap-3 pt-2">
        <Button
          type="submit"
          disabled={submitting || anyUploading}
          className="flex-1"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          {submitting ? 'Wysyłanie...' : 'Wyślij zgłoszenie'}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
          >
            Anuluj
          </Button>
        )}
      </div>
    </form>
  )
}

// ============ Helper ============

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
