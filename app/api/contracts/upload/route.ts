// app/api/contracts/upload/route.ts
// REPLACE existing file — fixes bucket 404 error
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

const BUCKET = 'contracts'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

/**
 * Ensures the storage bucket exists. Creates it if missing.
 * Uses service role or catches "already exists" gracefully.
 */
async function ensureBucket(supabase: any): Promise<{ ok: boolean; error?: string }> {
  // First, try to list the bucket to see if it exists
  const { data: buckets, error: listError } = await supabase.storage.listBuckets()

  if (listError) {
    console.error('Error listing buckets:', listError)
    // Don't fail — try creating anyway
  }

  const exists = buckets?.some((b: any) => b.name === BUCKET)

  if (exists) return { ok: true }

  // Bucket doesn't exist — try to create it
  const { error: createError } = await supabase.storage.createBucket(BUCKET, {
    public: false,
    fileSizeLimit: MAX_FILE_SIZE,
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  })

  if (createError) {
    // "already exists" is fine (race condition)
    if (createError.message?.includes('already exists')) {
      return { ok: true }
    }

    // Bucket creation requires service_role key or admin access
    // If using anon key, bucket must be created manually in Supabase Dashboard
    console.error('Cannot create bucket:', createError)
    return {
      ok: false,
      error:
        'Storage bucket "contracts" does not exist. ' +
        'Please create it in Supabase Dashboard → Storage → New Bucket (name: "contracts", private). ' +
        'Error: ' + createError.message,
    }
  }

  return { ok: true }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure bucket exists
    const bucketCheck = await ensureBucket(supabase)
    if (!bucketCheck.ok) {
      return NextResponse.json(
        { error: bucketCheck.error, code: 'BUCKET_NOT_FOUND' },
        { status: 500 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const contractId = formData.get('contractId') as string | null
    const attachmentType = (formData.get('type') as string) || 'OTHER'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File too large. Maximum size: 10 MB' },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: PDF, JPG, PNG' },
        { status: 400 }
      )
    }

    // Generate unique file path
    const ext = file.name.split('.').pop() || 'pdf'
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${user.id}/${contractId || 'temp'}/${uuidv4()}_${sanitizedName}`

    // Upload to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer())
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)

      // Provide helpful error messages
      if (uploadError.message?.includes('Bucket not found')) {
        return NextResponse.json(
          {
            error:
              'Storage bucket "contracts" not found. Please create it in Supabase Dashboard → Storage.',
            code: 'BUCKET_NOT_FOUND',
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { error: 'Upload failed: ' + uploadError.message },
        { status: 500 }
      )
    }

    // Get signed URL (for private bucket) or public URL
    // For private bucket, use createSignedUrl; for public, use getPublicUrl
    let fileUrl: string

    const { data: signedData, error: signedError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(filePath, 60 * 60 * 24 * 365) // 1 year

    if (signedError || !signedData?.signedUrl) {
      // Fallback to public URL
      const { data: urlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(filePath)
      fileUrl = urlData.publicUrl
    } else {
      fileUrl = signedData.signedUrl
    }

    return NextResponse.json({
      url: fileUrl,
      path: filePath,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      type: attachmentType,
    })
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}