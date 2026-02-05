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
    const cursor = searchParams.get('cursor') // ID последнего сообщения для пагинации
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
              name: true,
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
          name: true,
          isOwner: true,
          isTenant: true,
        }
      }),
      // Проверяем является ли пользователь арендатором этой квартиры
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

    // Проверяем права доступа
    const isOwner = property.userId === authUser.id
    const isTenantOfProperty = !!tenantRecord

    if (!isOwner && !isTenantOfProperty) {
      return NextResponse.json(
        { error: 'You do not have access to this chat' },
        { status: 403 }
      )
    }

    // Получаем сообщения с пагинацией
    const messages = await prisma.message.findMany({
      where: { propertyId },
      orderBy: { createdAt: 'desc' },
      take: limit + 1, // +1 чтобы определить есть ли ещё
      ...(cursor && {
        cursor: { id: cursor },
        skip: 1, // Пропускаем cursor
      }),
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        content: true,
        isRead: true,
        readAt: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    // Проверяем есть ли ещё сообщения
    const hasMore = messages.length > limit
    if (hasMore) {
      messages.pop() // Убираем лишнее сообщение
    }

    // Определяем собеседника
    let chatPartner: { id: string; name: string | null; email?: string }

    if (isOwner) {
      // Для владельца — информация об арендаторе
      const tenant = property.tenants[0]
      chatPartner = {
        id: tenant?.tenantUserId || '',
        name: tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Нет арендатора',
      }
    } else {
      // Для арендатора — информация о владельце
      chatPartner = {
        id: property.user.id,
        name: property.user.name,
        email: property.user.email,
      }
    }

    return NextResponse.json({
      property: {
        id: property.id,
        name: property.name,
        address: property.address,
      },
      chatPartner,
      messages: messages.reverse(), // Возвращаем в хронологическом порядке
      hasMore,
      nextCursor: hasMore ? messages[messages.length - 1]?.id : null,
      currentUserId: authUser.id,
    })

  } catch (error) {
    console.error('Error fetching chat history:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
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

    // Проверяем доступ к чату
    const [property, tenantRecord] = await Promise.all([
      prisma.property.findUnique({
        where: { id: propertyId },
        select: { id: true, userId: true }
      }),
      // Проверяем является ли пользователь арендатором этой квартиры
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
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const isOwner = property.userId === authUser.id
    const isTenantOfProperty = !!tenantRecord

    if (!isOwner && !isTenantOfProperty) {
      return NextResponse.json(
        { error: 'You do not have access to this chat' },
        { status: 403 }
      )
    }

    // Помечаем все непрочитанные сообщения адресованные текущему пользователю
    const updated = await prisma.message.updateMany({
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

    return NextResponse.json({
      success: true,
      markedAsRead: updated.count,
    })

  } catch (error) {
    console.error('Error marking messages as read:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
