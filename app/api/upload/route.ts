// app/api/upload/route.ts
// General-purpose upload handler for the "attachments" bucket
// Supports chat images and issue photos

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

const BUCKET = 'attachments'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const type = (formData.get('type') as string) || 'chat' // 'chat' | 'issue'
    const propertyId = formData.get('propertyId') as string
    const issueId = formData.get('issueId') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId is required' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Plik jest za duży. Maksymalny rozmiar: 5 MB' },
        { status: 400 }
      )
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'Plik jest pusty' }, { status: 400 })
    }

    // Validate file type — images only
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Nieprawidłowy format. Dozwolone: JPG, PNG, WebP, HEIC' },
        { status: 400 }
      )
    }

    // Build storage path
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const uniqueName = `${Date.now()}_${uuidv4().slice(0, 8)}_${sanitizedName}`

    let filePath: string
    if (type === 'chat') {
      filePath = `property_${propertyId}/chat/user_${user.id}/${uniqueName}`
    } else {
      const folder = issueId || 'temp_' + uuidv4().slice(0, 8)
      filePath = `property_${propertyId}/issues/${folder}/${uniqueName}`
    }

    // Upload
    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, uint8Array, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[Upload] Supabase error:', uploadError)

      if (uploadError.message?.includes('Bucket not found')) {
        return NextResponse.json(
          {
            error: 'Bucket "attachments" nie istnieje. Utwórz go w Supabase Dashboard → Storage.',
            code: 'BUCKET_NOT_FOUND',
          },
          { status: 500 }
        )
      }

      return NextResponse.json(
        { error: 'Błąd przesyłania: ' + uploadError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      path: uploadData.path,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    })
  } catch (error) {
    console.error('[Upload] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
