// app/api/issues/route.ts
// GET — list issues for a property
// POST — create a new issue (zgłoszenie)

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/issues?propertyId=xxx
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')
    const status = searchParams.get('status')

    if (!propertyId) {
      return NextResponse.json({ error: 'propertyId is required' }, { status: 400 })
    }

    // Check access: owner or active tenant
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        userId: true,
        tenants: {
          where: { isActive: true },
          select: { tenantUserId: true },
        },
      },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const isOwner = property.userId === user.id
    const isTenant = property.tenants.some((t) => t.tenantUserId === user.id)

    if (!isOwner && !isTenant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build filter
    const where: any = {
      propertyId,
      isDeleted: false,
    }

    if (status) {
      where.status = status
    }

    // Tenant privacy filter: can see own issues + public issues
    if (isTenant && !isOwner) {
      where.OR = [
        { createdById: user.id },
        { isPrivate: false },
      ]
    }

    const issues = await prisma.issue.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        attachments: {
          select: {
            id: true,
            filePath: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            metadata: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { messages: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Generate signed URLs for attachment thumbnails
    const allPaths = issues.flatMap((i) => i.attachments.map((a) => a.filePath))

    let signedUrls: Record<string, string> = {}
    if (allPaths.length > 0) {
      const { data: urlsData } = await supabase.storage
        .from('attachments')
        .createSignedUrls(allPaths, 3600)

      urlsData?.forEach((item) => {
        if (item.signedUrl && item.path) {
          signedUrls[item.path] = item.signedUrl
        }
      })
    }

    // Map signed URLs into response
    const result = issues.map((issue) => ({
      ...issue,
      createdBy: {
        id: issue.createdBy.id,
        name: [issue.createdBy.firstName, issue.createdBy.lastName].filter(Boolean).join(' ') || 'Użytkownik',
      },
      attachments: issue.attachments.map((att) => ({
        ...att,
        signedUrl: signedUrls[att.filePath] || null,
      })),
      messageCount: issue._count.messages,
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('[Issues] GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/issues — create issue
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      propertyId,
      title,
      description,
      category = 'OTHER',
      priority = 'MEDIUM',
      isPrivate = false,
      attachments = [], // Array of { filePath, fileName, fileSize, mimeType, metadata }
    } = body

    // Validation
    if (!propertyId || !title?.trim() || !description?.trim()) {
      return NextResponse.json(
        { error: 'propertyId, title, and description are required' },
        { status: 400 }
      )
    }

    // Verify tenant access
    const tenantRecord = await prisma.tenant.findFirst({
      where: {
        tenantUserId: user.id,
        propertyId,
        isActive: true,
      },
    })

    // Also allow owner to create issues (for testing/admin)
    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: { userId: true },
    })

    if (!tenantRecord && property?.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Create issue with attachments
    const issue = await prisma.issue.create({
      data: {
        propertyId,
        createdById: user.id,
        title: title.trim(),
        description: description.trim(),
        category,
        priority,
        isPrivate,
        ...(attachments.length > 0
          ? {
              attachments: {
                create: attachments.map((att: any, index: number) => ({
                  filePath: att.filePath,
                  fileName: att.fileName,
                  fileSize: att.fileSize || null,
                  mimeType: att.mimeType || null,
                  metadata: att.metadata || null,
                  sortOrder: index,
                })),
              },
            }
          : {}),
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        attachments: true,
      },
    })

    return NextResponse.json(
      {
        ...issue,
        createdBy: {
          id: issue.createdBy.id,
          name: [issue.createdBy.firstName, issue.createdBy.lastName].filter(Boolean).join(' '),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Issues] POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
