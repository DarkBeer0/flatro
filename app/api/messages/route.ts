// app/api/messages/route.ts
// FIX 1: Поддержка пользователей с обеими ролями (owner + tenant)
// Проблема: если user.isOwner=true, tenant-ветка никогда не выполнялась
// Решение: возвращаем данные для ОБЕИХ ролей

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function createSupabaseClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component
          }
        },
      },
    }
  )
}

export async function GET() {
  try {
    const supabase = await createSupabaseClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        isOwner: true,
        isTenant: true,
      }
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Результат с поддержкой обеих ролей
    const result: {
      ownerChats?: any[]
      tenantChat?: any
      role: 'owner' | 'tenant' | 'both' | 'none'
      // Для обратной совместимости
      chats?: any[]
      chat?: any
    } = {
      role: 'none'
    }

    // === OWNER: получаем чаты как владелец ===
    if (dbUser.isOwner) {
      const properties = await prisma.property.findMany({
        where: { userId: authUser.id },
        include: {
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

      const ownerChats = await Promise.all(
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
              userId: t.tenantUserId,
            })),
            lastMessage: lastMessage ? {
              id: lastMessage.id,
              content: lastMessage.content.substring(0, 100),
              createdAt: lastMessage.createdAt,
              isFromMe: lastMessage.senderId === authUser.id,
              isRead: true,
            } : null,
            unreadCount,
          }
        })
      )

      result.ownerChats = ownerChats.sort((a, b) => {
        if (a.unreadCount !== b.unreadCount) return b.unreadCount - a.unreadCount
        const aDate = a.lastMessage?.createdAt || new Date(0)
        const bDate = b.lastMessage?.createdAt || new Date(0)
        return new Date(bDate).getTime() - new Date(aDate).getTime()
      })

      // Для обратной совместимости со старым кодом
      result.chats = result.ownerChats
    }

    // === TENANT: получаем чат как арендатор ===
    // ВАЖНО: эта ветка теперь выполняется НЕЗАВИСИМО от isOwner
    if (dbUser.isTenant) {
      const tenantProfile = await prisma.tenant.findFirst({
        where: {
          tenantUserId: authUser.id,
          isActive: true,
        },
        include: {
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
      })

      if (tenantProfile?.property) {
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

        result.tenantChat = {
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

        // Для обратной совместимости
        result.chat = result.tenantChat
      }
    }

    // Определяем роль для ответа
    if (dbUser.isOwner && dbUser.isTenant && result.tenantChat) {
      result.role = 'both'
    } else if (dbUser.isOwner && result.ownerChats) {
      result.role = 'owner'
    } else if (dbUser.isTenant && result.tenantChat) {
      result.role = 'tenant'
    } else if (dbUser.isOwner) {
      // Owner без квартир
      result.role = 'owner'
      result.ownerChats = []
      result.chats = []
    } else if (dbUser.isTenant) {
      // Tenant без привязки
      result.role = 'tenant'
      result.tenantChat = null
      result.chat = null
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error fetching chats:', error)
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 })
  }
}
