// app/api/messages/unread/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// GET /api/messages/unread - получить количество непрочитанных сообщений
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Считаем все непрочитанные сообщения для текущего пользователя
    const unreadCount = await prisma.message.count({
      where: {
        receiverId: authUser.id,
        isRead: false,
      }
    })

    // Также получаем разбивку по квартирам (для владельца)
    const unreadByProperty = await prisma.message.groupBy({
      by: ['propertyId'],
      where: {
        receiverId: authUser.id,
        isRead: false,
      },
      _count: {
        id: true,
      }
    })

    return NextResponse.json({
      total: unreadCount,
      byProperty: unreadByProperty.map(item => ({
        propertyId: item.propertyId,
        count: item._count.id,
      }))
    })

  } catch (error) {
    console.error('Error fetching unread count:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
