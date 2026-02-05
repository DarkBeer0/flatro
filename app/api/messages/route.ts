// app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// GET /api/messages - получить список чатов
// Для владельца: список квартир с последним сообщением
// Для арендатора: информация о чате с владельцем
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Получаем информацию о пользователе
    // Примечание: tenantProfile — связь один-к-одному, не массив
    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        isOwner: true,
        isTenant: true,
        tenantProfile: {
          select: {
            id: true,
            propertyId: true,
            isActive: true,
            property: {
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
                }
              }
            }
          }
        }
      }
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Для владельца: получаем все квартиры с чатами
    if (dbUser.isOwner) {
      const properties = await prisma.property.findMany({
        where: { userId: authUser.id },
        select: {
          id: true,
          name: true,
          address: true,
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
      })

      // Для каждой квартиры получаем последнее сообщение и счётчик непрочитанных
      const chats = await Promise.all(
        properties.map(async (property) => {
          const lastMessage = await prisma.message.findFirst({
            where: { propertyId: property.id },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              content: true,
              createdAt: true,
              senderId: true,
              isRead: true,
            }
          })

          const unreadCount = await prisma.message.count({
            where: {
              propertyId: property.id,
              receiverId: authUser.id,
              isRead: false,
            }
          })

          return {
            propertyId: property.id,
            propertyName: property.name,
            propertyAddress: property.address,
            tenants: property.tenants.map(t => ({
              id: t.id,
              name: `${t.firstName} ${t.lastName}`,
              userId: t.tenantUserId,
            })),
            lastMessage: lastMessage ? {
              content: lastMessage.content.length > 50 
                ? lastMessage.content.substring(0, 50) + '...' 
                : lastMessage.content,
              createdAt: lastMessage.createdAt,
              isFromMe: lastMessage.senderId === authUser.id,
              isRead: lastMessage.isRead,
            } : null,
            unreadCount,
          }
        })
      )

      // Сортируем: сначала чаты с непрочитанными, затем по дате последнего сообщения
      const sortedChats = chats.sort((a, b) => {
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1
        if (a.unreadCount === 0 && b.unreadCount > 0) return 1
        
        const aDate = a.lastMessage?.createdAt || new Date(0)
        const bDate = b.lastMessage?.createdAt || new Date(0)
        return new Date(bDate).getTime() - new Date(aDate).getTime()
      })

      return NextResponse.json({
        role: 'owner',
        chats: sortedChats,
      })
    }

    // Для арендатора: может быть несколько квартир
    // Ищем все активные Tenant записи для этого пользователя
    if (dbUser.isTenant) {
      const tenantRecords = await prisma.tenant.findMany({
        where: {
          tenantUserId: authUser.id,
          isActive: true,
          propertyId: { not: null },
        },
        select: {
          id: true,
          property: {
            select: {
              id: true,
              name: true,
              address: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                }
              }
            }
          }
        }
      })

      if (tenantRecords.length === 0) {
        return NextResponse.json({
          role: 'tenant',
          chats: [],
        })
      }

      // Для каждой квартиры получаем последнее сообщение и непрочитанные
      const chats = await Promise.all(
        tenantRecords
          .filter(t => t.property)
          .map(async (tenant) => {
            const property = tenant.property!

            const lastMessage = await prisma.message.findFirst({
              where: { propertyId: property.id },
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                content: true,
                createdAt: true,
                senderId: true,
                isRead: true,
              }
            })

            const unreadCount = await prisma.message.count({
              where: {
                propertyId: property.id,
                receiverId: authUser.id,
                isRead: false,
              }
            })

            return {
              propertyId: property.id,
              propertyName: property.name,
              propertyAddress: property.address,
              owner: {
                id: property.user.id,
                name: property.user.name,
                email: property.user.email,
              },
              lastMessage: lastMessage ? {
                content: lastMessage.content.length > 50 
                  ? lastMessage.content.substring(0, 50) + '...' 
                  : lastMessage.content,
                createdAt: lastMessage.createdAt,
                isFromMe: lastMessage.senderId === authUser.id,
                isRead: lastMessage.isRead,
              } : null,
              unreadCount,
            }
          })
      )

      // Сортируем: непрочитанные сверху, потом по дате
      const sortedChats = chats.sort((a, b) => {
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1
        if (a.unreadCount === 0 && b.unreadCount > 0) return 1
        
        const aDate = a.lastMessage?.createdAt || new Date(0)
        const bDate = b.lastMessage?.createdAt || new Date(0)
        return new Date(bDate).getTime() - new Date(aDate).getTime()
      })

      return NextResponse.json({
        role: 'tenant',
        chats: sortedChats,
      })
    }

    // Нет активных чатов
    return NextResponse.json({
      role: dbUser.isOwner ? 'owner' : 'tenant',
      chats: [],
      chat: null,
    })

  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/messages - отправить новое сообщение
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { propertyId, content } = body

    if (!propertyId || !content?.trim()) {
      return NextResponse.json(
        { error: 'Property ID and content are required' },
        { status: 400 }
      )
    }

    // Получаем информацию о пользователе и квартире
    const [dbUser, property, tenantRecord] = await Promise.all([
      prisma.user.findUnique({
        where: { id: authUser.id },
        select: {
          id: true,
          isOwner: true,
          isTenant: true,
        }
      }),
      prisma.property.findUnique({
        where: { id: propertyId },
        select: {
          id: true,
          userId: true,
          tenants: {
            where: { isActive: true },
            select: {
              tenantUserId: true,
            }
          }
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

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Определяем получателя
    let receiverId: string

    // Проверяем, является ли пользователь арендатором этой квартиры
    const isTenantOfThisProperty = !!tenantRecord

    if (property.userId === authUser.id) {
      // Владелец пишет арендатору
      // Берём первого активного арендатора с аккаунтом
      const tenantWithAccount = property.tenants.find(t => t.tenantUserId)
      if (!tenantWithAccount?.tenantUserId) {
        return NextResponse.json(
          { error: 'No tenant with account found for this property' },
          { status: 400 }
        )
      }
      receiverId = tenantWithAccount.tenantUserId
    } else if (isTenantOfThisProperty) {
      // Арендатор пишет владельцу
      receiverId = property.userId
    } else {
      return NextResponse.json(
        { error: 'You do not have access to this chat' },
        { status: 403 }
      )
    }

    // Создаём сообщение
    const message = await prisma.message.create({
      data: {
        senderId: authUser.id,
        receiverId,
        propertyId,
        content: content.trim(),
      },
      select: {
        id: true,
        senderId: true,
        receiverId: true,
        propertyId: true,
        content: true,
        isRead: true,
        createdAt: true,
        sender: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    return NextResponse.json(message, { status: 201 })

  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
