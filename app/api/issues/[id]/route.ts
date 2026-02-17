// app/api/issues/[id]/route.ts
// GET — single issue detail
// PATCH — update status, soft delete
// DELETE — not used (soft delete via PATCH)

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/issues/[id]
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

    const issue = await prisma.issue.findUnique({
      where: { id },
      include: {
        property: {
          select: { id: true, name: true, address: true, userId: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        attachments: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: { select: { messages: true } },
      },
    })

    if (!issue || issue.isDeleted) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    // Access check
    const isOwner = issue.property.userId === user.id
    const isCreator = issue.createdById === user.id
    const isTenantOfProperty = await prisma.tenant.findFirst({
      where: { tenantUserId: user.id, propertyId: issue.propertyId, isActive: true },
    })

    if (!isOwner && !isCreator && !(isTenantOfProperty && !issue.isPrivate)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Generate signed URLs for attachments
    const paths = issue.attachments.map((a) => a.filePath)
    let signedUrls: Record<string, string> = {}

    if (paths.length > 0) {
      const { data: urlsData } = await supabase.storage
        .from('attachments')
        .createSignedUrls(paths, 3600)

      urlsData?.forEach((item) => {
        if (item.signedUrl && item.path) {
          signedUrls[item.path] = item.signedUrl
        }
      })
    }

    return NextResponse.json({
      ...issue,
      createdBy: {
        id: issue.createdBy.id,
        name: [issue.createdBy.firstName, issue.createdBy.lastName].filter(Boolean).join(' '),
      },
      attachments: issue.attachments.map((att) => ({
        ...att,
        signedUrl: signedUrls[att.filePath] || null,
      })),
      messageCount: issue._count.messages,
    })
  } catch (error) {
    console.error('[Issues] GET [id] error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/issues/[id] — update status or soft delete
export async function PATCH(
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
    const { status, isDeleted } = body

    // Find issue
    const issue = await prisma.issue.findUnique({
      where: { id },
      include: {
        property: { select: { userId: true } },
      },
    })

    if (!issue || issue.isDeleted) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    const isOwner = issue.property.userId === user.id
    const isCreator = issue.createdById === user.id

    // Status changes: only owner can change status
    // Soft delete: owner or creator
    if (status && !isOwner) {
      return NextResponse.json(
        { error: 'Tylko właściciel może zmieniać status zgłoszenia' },
        { status: 403 }
      )
    }

    if (isDeleted && !isOwner && !isCreator) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Build update data
    const updateData: any = {}

    if (status) {
      // Validate status transition
      const validTransitions: Record<string, string[]> = {
        OPEN: ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
        IN_PROGRESS: ['OPEN', 'RESOLVED', 'CLOSED'],
        RESOLVED: ['OPEN', 'IN_PROGRESS', 'CLOSED'],
        CLOSED: ['OPEN'],
      }

      if (!validTransitions[issue.status]?.includes(status)) {
        return NextResponse.json(
          { error: `Nie można zmienić statusu z ${issue.status} na ${status}` },
          { status: 400 }
        )
      }

      updateData.status = status

      if (status === 'RESOLVED') {
        updateData.resolvedAt = new Date()
      }
      if (status === 'CLOSED') {
        updateData.closedAt = new Date()
      }
      // Reset timestamps if reopened
      if (status === 'OPEN') {
        updateData.resolvedAt = null
        updateData.closedAt = null
      }
    }

    if (isDeleted === true) {
      updateData.isDeleted = true
      updateData.deletedAt = new Date()
    }

    const updated = await prisma.issue.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        attachments: true,
      },
    })

    return NextResponse.json({
      ...updated,
      createdBy: {
        id: updated.createdBy.id,
        name: [updated.createdBy.firstName, updated.createdBy.lastName].filter(Boolean).join(' '),
      },
    })
  } catch (error) {
    console.error('[Issues] PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
