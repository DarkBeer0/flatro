// lib/supabase/storage.ts
// Helper utilities for Supabase Storage — "attachments" bucket
// 
// FIX: Signed URLs were expiring after 1 hour, breaking images.
// Now supports TWO modes:
//   A) PUBLIC bucket (recommended) — getPublicUrl() → URLs never expire
//   B) PRIVATE bucket (fallback) — createSignedUrl() with 7-day TTL
//
// To enable mode A: Go to Supabase Dashboard → Storage → "attachments" bucket
// → Click ⚙️ → Set "Public" = true → Save
// Then set NEXT_PUBLIC_STORAGE_PUBLIC=true in .env.local

import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

const BUCKET = 'attachments'

// 7 days instead of 1 hour — images won't break for a week
const SIGNED_URL_EXPIRY = 7 * 24 * 60 * 60 // 604800 seconds

// Check if bucket is configured as public
const IS_PUBLIC_BUCKET = process.env.NEXT_PUBLIC_STORAGE_PUBLIC === 'true'

// ============ PUBLIC URL (never expires) ============

/**
 * Get a public URL for an attachment.
 * Only works if the bucket is set to "Public" in Supabase Dashboard.
 */
function getPublicUrl(supabaseUrl: string, path: string): string {
  // Format: {supabase_url}/storage/v1/object/public/{bucket}/{path}
  return `${supabaseUrl}/storage/v1/object/public/${BUCKET}/${path}`
}

// ============ SERVER-SIDE ============

/**
 * Generate URL for an attachment (server-side)
 * Uses public URL if bucket is public, otherwise signed URL with 7-day TTL
 */
export async function getAttachmentUrl(path: string): Promise<string | null> {
  if (!path) return null

  if (IS_PUBLIC_BUCKET) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) return null
    return getPublicUrl(supabaseUrl, path)
  }

  // Fallback: signed URL with 7-day TTL
  return getSignedUrl(path, SIGNED_URL_EXPIRY)
}

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
 * Generate URLs for multiple paths (server-side, batched)
 * Returns a map of path → URL
 */
export async function getAttachmentUrls(
  paths: string[]
): Promise<Record<string, string>> {
  if (!paths.length) return {}

  if (IS_PUBLIC_BUCKET) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (!supabaseUrl) return {}
    
    const map: Record<string, string> = {}
    paths.forEach(path => {
      map[path] = getPublicUrl(supabaseUrl, path)
    })
    return map
  }

  // Fallback: signed URLs with 7-day TTL
  return getSignedUrls(paths, SIGNED_URL_EXPIRY)
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
    return { path: '', error: 'File too large. Maximum: 5 MB' }
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  if (!allowedTypes.includes(file.type)) {
    return { path: '', error: 'Invalid format. Allowed: JPG, PNG, WebP, HEIC' }
  }

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) {
    console.error('[Storage] Upload error:', error.message)
    return { path: '', error: 'Upload error: ' + error.message }
  }

  return { path: data.path, error: null }
}

/**
 * Generate unique filename with timestamp
 */
export function generateStoragePath(
  type: 'chat' | 'issues' | 'property',
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

  if (type === 'property') {
    return `property_${propertyId}/photos/${uniqueName}`
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