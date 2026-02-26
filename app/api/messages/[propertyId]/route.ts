// app/api/messages/[propertyId]/route.ts
// ============================================================
// FIX OWNER MESSAGE SCOPING (v2)
// ============================================================
// PROBLEM: Owner still saw Test #1's messages when opening chat,
//   because the query filtered only by propertyId — no tenant scope.
//
// FIX: For owners, add an OR filter so only messages exchanged
//   with the CURRENT active tenant(s) are returned:
//     senderId=owner AND receiverId IN (activeTenants)
//     OR senderId IN (activeTenants) AND receiverId=owner
//
// This mirrors exactly the tenant-side fix from the previous patch.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { propertyId } = await params
    const { searchParams } = new URL(request.url)
    const cursor = searchParams.get('cursor')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

    const [property, dbUser, tenantRecord] = await Promise.all([
      prisma.property.findUnique({
        where: { id: propertyId },
        select: {
          id: true,
          name: true,
          address: true,
          userId: true,
          user: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
          tenants: {
            where: { isActive: true },
            select: { id: true, firstName: true, lastName: true, tenantUserId: true },
          },
        },
      }),
      prisma.user.findUnique({
        where: { id: authUser.id },
        select: { id: true, isOwner: true, isTenant: true },
      }),
      prisma.tenant.findFirst({
        where: { tenantUserId: authUser.id, propertyId, isActive: true },
        select: { id: true },
      }),
    ])

    if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    if (!dbUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const isOwner = property.userId === authUser.id
    const isTenantOfProperty = !!tenantRecord

    if (!isOwner && !isTenantOfProperty) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // ─────────────────────────────────────────────────────────
    // MESSAGE PRIVACY FILTER
    //
    // Both owners AND tenants now only see messages that belong
    // to their specific conversation, preventing cross-tenant leaks.
    //
    // OWNER: only messages exchanged with the current active tenant(s).
    // TENANT: only messages they personally sent or received.
    // ─────────────────────────────────────────────────────────
    const messageWhere: Record<string, unknown> = {
      propertyId,
      ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    }

    if (isOwner) {
      // Collect user IDs of all currently active tenants
      const activeTenantUserIds = property.tenants
        .map((t) => t.tenantUserId)
        .filter((id): id is string => !!id)

      if (activeTenantUserIds.length > 0) {
        // Show only messages between the owner and active tenants
        messageWhere.OR = [
          {
            senderId: authUser.id,
            receiverId: { in: activeTenantUserIds },
          },
          {
            senderId: { in: activeTenantUserIds },
            receiverId: authUser.id,
          },
        ]
      } else {
        // No active tenants — return empty (no messages to show)
        return NextResponse.json({
          messages: [],
          property: { id: property.id, name: property.name, address: property.address },
          chatPartner: null,
          currentUserId: authUser.id,
          nextCursor: null,
        })
      }
    } else if (isTenantOfProperty) {
      // Tenant sees only their own conversation
      messageWhere.OR = [
        { senderId: authUser.id },
        { receiverId: authUser.id },
      ]
    }

    const messages = await prisma.message.findMany({
      where: messageWhere,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        content: true,
        createdAt: true,
        isRead: true,
        readAt: true,
        senderId: true,
        receiverId: true,
        attachmentPath: true,
        attachmentMetadata: true,
        issueId: true,
        sender: {
          select: { id: true, firstName: true, lastName: true },
        },
        issue: {
          select: { id: true, title: true, status: true },
        },
      },
    })

    // Generate signed URLs for attachments
    const attachmentPaths = messages
      .filter((m) => m.attachmentPath)
      .map((m) => m.attachmentPath!)

    let signedUrls: Record<string, string> = {}
    if (attachmentPaths.length > 0) {
      const { data: urlsData, error: urlsError } = await supabase.storage
        .from('attachments')
        .createSignedUrls(attachmentPaths, 3600)

      if (urlsError) {
        console.error('[Messages] Signed URL error:', urlsError.message)
      }

      urlsData?.forEach((item) => {
        if (item.signedUrl && item.path) {
          signedUrls[item.path] = item.signedUrl
        }
      })
    }

    // Build chat partner
    let chatPartner
    if (isOwner) {
      const tenant = property.tenants[0]
      chatPartner = tenant
        ? {
            id: tenant.tenantUserId || tenant.id,
            name: `${tenant.firstName} ${tenant.lastName}`.trim(),
          }
        : null
    } else {
      chatPartner = {
        id: property.user.id,
        name:
          [property.user.firstName, property.user.lastName].filter(Boolean).join(' ') ||
          property.user.email,
      }
    }

    const formattedMessages = messages.reverse().map((m) => ({
      id: m.id,
      content: m.content,
      createdAt: m.createdAt,
      isRead: m.isRead,
      readAt: m.readAt,
      senderId: m.senderId,
      receiverId: m.receiverId,
      attachmentPath: m.attachmentPath,
      attachmentMetadata: m.attachmentMetadata,
      attachmentUrl: m.attachmentPath ? signedUrls[m.attachmentPath] || null : null,
      issueId: m.issueId,
      issueRef: m.issue
        ? { id: m.issue.id, title: m.issue.title, status: m.issue.status }
        : null,
      sender: {
        id: m.sender.id,
        name:
          [m.sender.firstName, m.sender.lastName].filter(Boolean).join(' ') || 'Użytkownik',
      },
    }))

    return NextResponse.json({
      messages: formattedMessages,
      property: { id: property.id, name: property.name, address: property.address },
      chatPartner,
      currentUserId: authUser.id,
      nextCursor: messages.length > 0 ? messages[messages.length - 1].id : null,
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

// POST /api/messages/[propertyId] — send message with optional attachment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { propertyId } = await params
    const body = await request.json()
    const { content, receiverId, attachmentPath, attachmentMetadata, issueId } = body

    if (!content?.trim() && !attachmentPath) {
      return NextResponse.json(
        { error: 'Wiadomość musi zawierać tekst lub zdjęcie' },
        { status: 400 }
      )
    }

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

    if (!property) return NextResponse.json({ error: 'Property not found' }, { status: 404 })

    const isOwner = property.userId === authUser.id
    const isTenant = property.tenants.some((t) => t.tenantUserId === authUser.id)

    if (!isOwner && !isTenant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    let targetReceiverId = receiverId
    if (!targetReceiverId) {
      if (isTenant) {
        targetReceiverId = property.userId
      } else if (property.tenants.length > 0) {
        targetReceiverId = property.tenants[0].tenantUserId
      }
    }

    if (!targetReceiverId) {
      return NextResponse.json({ error: 'No recipient available' }, { status: 400 })
    }

    if (issueId) {
      const issue = await prisma.issue.findFirst({
        where: { id: issueId, propertyId, isDeleted: false },
      })
      if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    const message = await prisma.message.create({
      data: {
        propertyId,
        senderId: authUser.id,
        receiverId: targetReceiverId,
        content: content?.trim() || null,
        isRead: false,
        attachmentPath: attachmentPath || null,
        attachmentMetadata: attachmentMetadata || null,
        issueId: issueId || null,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        isRead: true,
        senderId: true,
        receiverId: true,
        attachmentPath: true,
        attachmentMetadata: true,
        issueId: true,
        sender: {
          select: { id: true, firstName: true, lastName: true },
        },
        issue: {
          select: { id: true, title: true, status: true },
        },
      },
    })

    // Generate signed URL for attachment
    let attachmentUrl = null
    if (message.attachmentPath) {
      const { data, error } = await supabase.storage
        .from('attachments')
        .createSignedUrl(message.attachmentPath, 3600)
      if (error) {
        console.error('[Messages POST] Signed URL error:', error.message)
      }
      attachmentUrl = data?.signedUrl || null
    }

    return NextResponse.json(
      {
        id: message.id,
        content: message.content,
        createdAt: message.createdAt,
        isRead: message.isRead,
        senderId: message.senderId,
        receiverId: message.receiverId,
        attachmentPath: message.attachmentPath,
        attachmentMetadata: message.attachmentMetadata,
        attachmentUrl,
        issueId: message.issueId,
        issueRef: message.issue
          ? { id: message.issue.id, title: message.issue.title, status: message.issue.status }
          : null,
        sender: {
          id: message.sender.id,
          name:
            [message.sender.firstName, message.sender.lastName].filter(Boolean).join(' ') ||
            'Użytkownik',
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}

// PATCH /api/messages/[propertyId] — mark messages as read
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { propertyId } = await params

    const result = await prisma.message.updateMany({
      where: {
        propertyId,
        receiverId: authUser.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    })

    return NextResponse.json({ updated: result.count })
  } catch (error) {
    console.error('Error marking messages as read:', error)
    return NextResponse.json({ error: 'Failed to update messages' }, { status: 500 })
  }
}