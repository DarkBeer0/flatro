// app/api/messages/[propertyId]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// GET /api/messages/[propertyId] - получить историю чата для квартиры
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

    // Проверяем доступ к чату
    const [property, dbUser, tenantRecord] = await Promise.all([
      prisma.property.findUnique({
        where: { id: propertyId },
        select: {
          id: true,
          name: true,
          address: true,
          userId: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            }
          },
          tenants: {
            where: { isActive: true },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              tenantUserId: true,
            }
          }
        }
      }),
      prisma.user.findUnique({
        where: { id: authUser.id },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          isOwner: true,
          isTenant: true,
        }
      }),
      prisma.tenant.findFirst({
        where: {
          tenantUserId: authUser.id,
          propertyId: propertyId,
          isActive: true,
        },
        select: { id: true }
      })
    ])

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const isOwner = property.userId === authUser.id
    const isTenantOfProperty = !!tenantRecord

    if (!isOwner && !isTenantOfProperty) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Получаем сообщения
    const messages = await prisma.message.findMany({
      where: { propertyId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1,
      }),
      select: {
        id: true,
        content: true,
        createdAt: true,
        isRead: true,
        senderId: true,
        receiverId: true,
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    })

    // Помечаем непрочитанные как прочитанные
    const unreadIds = messages
      .filter(m => !m.isRead && m.receiverId === authUser.id)
      .map(m => m.id)

    if (unreadIds.length > 0) {
      await prisma.message.updateMany({
        where: { id: { in: unreadIds } },
        data: { isRead: true }
      })
    }

    const ownerName = [property.user.firstName, property.user.lastName].filter(Boolean).join(' ') || 'Владелец'
    const userName = [dbUser.firstName, dbUser.lastName].filter(Boolean).join(' ') || 'Пользователь'

    // Определяем собеседника
    let chatPartner: { id: string; name: string; email?: string } | null = null

    if (isOwner) {
      // Владелец → собеседник = первый активный tenant
      const firstTenant = property.tenants[0]
      if (firstTenant?.tenantUserId) {
        chatPartner = {
          id: firstTenant.tenantUserId,
          name: `${firstTenant.firstName} ${firstTenant.lastName}`.trim() || 'Арендатор',
        }
      }
    } else if (isTenantOfProperty) {
      // Tenant → собеседник = владелец квартиры
      chatPartner = {
        id: property.user.id,
        name: ownerName,
        email: property.user.email,
      }
    }

    return NextResponse.json({
      property: {
        id: property.id,
        name: property.name,
        address: property.address,
        owner: {
          id: property.user.id,
          name: ownerName,
          email: property.user.email,
        },
        tenants: property.tenants.map(t => ({
          id: t.id,
          name: `${t.firstName} ${t.lastName}`.trim(),
          tenantUserId: t.tenantUserId,
        }))
      },
      messages: messages.map(m => ({
        ...m,
        sender: {
          id: m.sender.id,
          name: [m.sender.firstName, m.sender.lastName].filter(Boolean).join(' ') || 'Пользователь',
        }
      })).reverse(),
      currentUser: {
        id: dbUser.id,
        name: userName,
        isOwner,
        isTenantOfProperty,
      },
      chatPartner,
      currentUserId: authUser.id,
      hasMore: messages.length === limit,
      nextCursor: messages.length === limit ? messages[messages.length - 1].id : null,
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
  }
}

// POST /api/messages/[propertyId] - отправить сообщение
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
    const { content, receiverId } = body

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    const property = await prisma.property.findUnique({
      where: { id: propertyId },
      select: {
        id: true,
        userId: true,
        tenants: {
          where: { isActive: true },
          select: { tenantUserId: true }
        }
      }
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const isOwner = property.userId === authUser.id
    const isTenant = property.tenants.some(t => t.tenantUserId === authUser.id)

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

    const message = await prisma.message.create({
      data: {
        propertyId,
        senderId: authUser.id,
        receiverId: targetReceiverId,
        content: content.trim(),
        isRead: false,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        isRead: true,
        senderId: true,
        receiverId: true,
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      }
    })

    return NextResponse.json({
      ...message,
      sender: {
        id: message.sender.id,
        name: [message.sender.firstName, message.sender.lastName].filter(Boolean).join(' ') || 'Пользователь',
      }
    }, { status: 201 })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}

// PATCH /api/messages/[propertyId] - пометить сообщения как прочитанные
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
      }
    })

    return NextResponse.json({ updated: result.count })
  } catch (error) {
    console.error('Error marking messages as read:', error)
    return NextResponse.json({ error: 'Failed to update messages' }, { status: 500 })
  }
}