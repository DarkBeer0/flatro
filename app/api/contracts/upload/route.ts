// app/api/contracts/upload/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

const BUCKET = 'contracts'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB

// Bucket "contracts" must exist in Supabase Dashboard → Storage
// Created manually (anon key cannot list/create buckets due to RLS)

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Validate non-empty
    if (file.size === 0) {
      return NextResponse.json(
        { error: 'File is empty (0 bytes)' },
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
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const filePath = `${user.id}/${contractId || 'temp'}/${uuidv4()}_${sanitizedName}`

    // Upload to Supabase Storage using Uint8Array (Buffer can corrupt binary data)
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, uint8Array, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Supabase upload error:', uploadError)

      if (uploadError.message?.includes('Bucket not found')) {
        return NextResponse.json(
          {
            error: 'Storage bucket "contracts" not found. Please create it in Supabase Dashboard → Storage.',
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

    // Return the PATH (not signed URL) — URL is generated on-demand via download route
    // contractFileUrl in DB stores the storage path
    return NextResponse.json({
      url: filePath,
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