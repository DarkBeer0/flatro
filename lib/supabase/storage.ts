// lib/supabase/storage.ts
// Helper utilities for Supabase Storage — "attachments" bucket
// Generates signed URLs for secure image rendering

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

const BUCKET = 'attachments'
const SIGNED_URL_EXPIRY = 3600 // 1 hour in seconds

// ============ SERVER-SIDE ============

/**
 * Generate a signed URL for an attachment (server-side)
 */
export async function getSignedUrl(path: string, expiresIn = SIGNED_URL_EXPIRY): Promise<string | null> {
  if (!path) return null

  const supabase = await createServerClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn)

  if (error) {
    console.error('[Storage] Signed URL error:', error.message)
    return null
  }

  return data.signedUrl
}

/**
 * Generate signed URLs for multiple paths (server-side, batched)
 */
export async function getSignedUrls(
  paths: string[],
  expiresIn = SIGNED_URL_EXPIRY
): Promise<Record<string, string>> {
  if (!paths.length) return {}

  const supabase = await createServerClient()
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, expiresIn)

  if (error) {
    console.error('[Storage] Batch signed URL error:', error.message)
    return {}
  }

  const map: Record<string, string> = {}
  data?.forEach((item) => {
    if (item.signedUrl && item.path) {
      map[item.path] = item.signedUrl
    }
  })
  return map
}

/**
 * Delete a file from storage (server-side)
 */
export async function deleteFile(path: string): Promise<boolean> {
  if (!path) return false

  const supabase = await createServerClient()
  const { error } = await supabase.storage.from(BUCKET).remove([path])

  if (error) {
    console.error('[Storage] Delete error:', error.message)
    return false
  }
  return true
}

// ============ CLIENT-SIDE ============

/**
 * Upload a file to the attachments bucket (client-side)
 * Returns the relative path in storage
 */
export async function uploadAttachment(
  file: File,
  storagePath: string,
  onProgress?: (percent: number) => void
): Promise<{ path: string; error: string | null }> {
  const supabase = createBrowserClient()

  // Validate
  const MAX_SIZE = 5 * 1024 * 1024 // 5MB
  if (file.size > MAX_SIZE) {
    return { path: '', error: 'Plik jest za duży. Maksymalny rozmiar: 5 MB' }
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  if (!allowedTypes.includes(file.type)) {
    return { path: '', error: 'Nieprawidłowy format. Dozwolone: JPG, PNG, WebP, HEIC' }
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    console.error('[Storage] Upload error:', error.message)
    return { path: '', error: 'Błąd przesyłania: ' + error.message }
  }

  return { path: data.path, error: null }
}

/**
 * Generate unique filename with timestamp
 */
export function generateStoragePath(
  type: 'chat' | 'issues',
  propertyId: string,
  userId: string,
  fileName: string,
  issueId?: string
): string {
  const timestamp = Date.now()
  const sanitized = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const uniqueName = `${timestamp}_${sanitized}`

  if (type === 'chat') {
    return `property_${propertyId}/chat/user_${userId}/${uniqueName}`
  }

  // Issues
  const folder = issueId || 'temp'
  return `property_${propertyId}/issues/${folder}/${uniqueName}`
}

/**
 * Get image dimensions from a File (client-side)
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
      URL.revokeObjectURL(img.src)
    }
    img.onerror = () => {
      reject(new Error('Failed to load image'))
      URL.revokeObjectURL(img.src)
    }
    img.src = URL.createObjectURL(file)
  })
}
