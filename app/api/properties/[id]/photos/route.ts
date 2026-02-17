// app/api/properties/[id]/photos/route.ts
// Manage property photos — upload, list, delete
// Photos stored in Supabase Storage: attachments/property_{id}/photos/

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { getAttachmentUrls } from '@/lib/supabase/storage'

const BUCKET = 'attachments'
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_PHOTOS = 10

// GET /api/properties/[id]/photos — list photos with URLs
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check access: owner OR tenant of property
    const property = await prisma.property.findUnique({
      where: { id },
      select: {
        userId: true,
        photos: true,
        tenants: {
          where: { isActive: true, tenantUserId: user.id },
          select: { id: true },
        },
      },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const isOwner = property.userId === user.id
    const isTenant = property.tenants.length > 0

    if (!isOwner && !isTenant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Generate URLs for all photos
    const photos = property.photos || []
    const urls = await getAttachmentUrls(photos)

    const result = photos.map((path, index) => ({
      path,
      url: urls[path] || null,
      index,
    }))

    return NextResponse.json({ photos: result })
  } catch (error) {
    console.error('[Property Photos] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/properties/[id]/photos — upload a photo
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Owner only
    const property = await prisma.property.findFirst({
      where: { id, userId: user.id },
      select: { photos: true },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found or access denied' }, { status: 404 })
    }

    // Check limit
    if ((property.photos || []).length >= MAX_PHOTOS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_PHOTOS} photos allowed` },
        { status: 400 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large. Max 5 MB' }, { status: 400 })
    }

    if (file.size === 0) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid format. Allowed: JPG, PNG, WebP, HEIC' },
        { status: 400 }
      )
    }

    // Upload to storage
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const uniqueName = `${Date.now()}_${uuidv4().slice(0, 8)}_${sanitizedName}`
    const filePath = `property_${id}/photos/${uniqueName}`

    const arrayBuffer = await file.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, uint8Array, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('[Property Photos] Upload error:', uploadError)
      return NextResponse.json(
        { error: 'Upload failed: ' + uploadError.message },
        { status: 500 }
      )
    }

    // Add path to property.photos array
    const updatedProperty = await prisma.property.update({
      where: { id },
      data: {
        photos: {
          push: uploadData.path,
        },
      },
      select: { photos: true },
    })

    // Generate URL for the new photo
    const urls = await getAttachmentUrls([uploadData.path])

    return NextResponse.json({
      path: uploadData.path,
      url: urls[uploadData.path] || null,
      totalPhotos: updatedProperty.photos.length,
    })
  } catch (error) {
    console.error('[Property Photos] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/properties/[id]/photos — remove a photo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { path } = body as { path: string }

    if (!path) {
      return NextResponse.json({ error: 'path is required' }, { status: 400 })
    }

    // Owner only
    const property = await prisma.property.findFirst({
      where: { id, userId: user.id },
      select: { photos: true },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found or access denied' }, { status: 404 })
    }

    // Remove from array
    const updatedPhotos = (property.photos || []).filter((p) => p !== path)

    await prisma.property.update({
      where: { id },
      data: { photos: updatedPhotos },
    })

    // Delete from storage (non-blocking)
    supabase.storage.from(BUCKET).remove([path]).catch((err) => {
      console.error('[Property Photos] Storage delete error:', err)
    })

    return NextResponse.json({ success: true, totalPhotos: updatedPhotos.length })
  } catch (error) {
    console.error('[Property Photos] DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}