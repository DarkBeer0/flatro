// app/api/messages/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// GET /api/messages - получить список чатов
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
                    firstName: true,
                    lastName: true,
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

      const chats = await Promise.all(
        properties.map(async (property) => {
          const [lastMessage, unreadCount] = await Promise.all([
            prisma.message.findFirst({
              where: { propertyId: property.id },
              orderBy: { createdAt: 'desc' },
              select: {
                id: true,
                content: true,
                createdAt: true,
                senderId: true,
              }
            }),
            prisma.message.count({
              where: {
                propertyId: property.id,
                receiverId: authUser.id,
                isRead: false,
              }
            })
          ])

          return {
            propertyId: property.id,
            propertyName: property.name,
            propertyAddress: property.address,
            tenants: property.tenants.map(t => ({
              id: t.id,
              name: `${t.firstName} ${t.lastName}`.trim(),
              tenantUserId: t.tenantUserId,
            })),
            lastMessage: lastMessage ? {
              id: lastMessage.id,
              content: lastMessage.content.substring(0, 100),
              createdAt: lastMessage.createdAt,
              isOwn: lastMessage.senderId === authUser.id,
            } : null,
            unreadCount,
          }
        })
      )

      return NextResponse.json({
        role: 'owner',
        chats: chats.sort((a, b) => {
          if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount
          const aDate = a.lastMessage?.createdAt || new Date(0)
          const bDate = b.lastMessage?.createdAt || new Date(0)
          return new Date(bDate).getTime() - new Date(aDate).getTime()
        })
      })
    }

    // Для арендатора
    if (dbUser.isTenant && dbUser.tenantProfile) {
      const tenantProfile = dbUser.tenantProfile
      
      if (!tenantProfile.property) {
        return NextResponse.json({
          role: 'tenant',
          chat: null,
          message: 'Нет привязанной квартиры'
        })
      }

      const [lastMessage, unreadCount] = await Promise.all([
        prisma.message.findFirst({
          where: { propertyId: tenantProfile.propertyId! },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            content: true,
            createdAt: true,
            senderId: true,
          }
        }),
        prisma.message.count({
          where: {
            propertyId: tenantProfile.propertyId!,
            receiverId: authUser.id,
            isRead: false,
          }
        })
      ])

      const ownerName = [
        tenantProfile.property.user.firstName, 
        tenantProfile.property.user.lastName
      ].filter(Boolean).join(' ') || 'Владелец'

      return NextResponse.json({
        role: 'tenant',
        chat: {
          propertyId: tenantProfile.property.id,
          propertyName: tenantProfile.property.name,
          propertyAddress: tenantProfile.property.address,
          owner: {
            id: tenantProfile.property.user.id,
            name: ownerName,
            email: tenantProfile.property.user.email,
          },
          lastMessage: lastMessage ? {
            id: lastMessage.id,
            content: lastMessage.content.substring(0, 100),
            createdAt: lastMessage.createdAt,
            isOwn: lastMessage.senderId === authUser.id,
          } : null,
          unreadCount,
        }
      })
    }

    return NextResponse.json({
      role: 'none',
      message: 'Нет доступных чатов'
    })
  } catch (error) {
    console.error('Error fetching chats:', error)
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 })
  }
}