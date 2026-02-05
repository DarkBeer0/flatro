// app/api/messages/unread/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// Время в минутах, после которого непрочитанное сообщение считается "пропущенным"
const MISSED_THRESHOLD_MINUTES = 15

// GET /api/messages/unread - получить количество непрочитанных сообщений
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const thresholdDate = new Date(Date.now() - MISSED_THRESHOLD_MINUTES * 60 * 1000)

    // Считаем все непрочитанные сообщения для текущего пользователя
    const [totalUnread, missedCount, unreadByProperty] = await Promise.all([
      // Общее количество непрочитанных
      prisma.message.count({
        where: {
          receiverId: authUser.id,
          isRead: false,
        }
      }),
      // Количество "пропущенных" (старше 15 минут)
      prisma.message.count({
        where: {
          receiverId: authUser.id,
          isRead: false,
          createdAt: { lt: thresholdDate },
        }
      }),
      // Разбивка по квартирам
      prisma.message.groupBy({
        by: ['propertyId'],
        where: {
          receiverId: authUser.id,
          isRead: false,
        },
        _count: {
          id: true,
        },
        _min: {
          createdAt: true, // Самое старое непрочитанное
        }
      })
    ])

    return NextResponse.json({
      total: totalUnread,
      missed: missedCount, // Количество пропущенных (для badge)
      showBadge: missedCount > 0, // Показывать badge если есть пропущенные
      byProperty: unreadByProperty.map(item => ({
        propertyId: item.propertyId,
        count: item._count.id,
        oldestUnread: item._min.createdAt,
        hasMissed: item._min.createdAt ? item._min.createdAt < thresholdDate : false,
      }))
    })

  } catch (error) {
    console.error('Error fetching unread count:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
