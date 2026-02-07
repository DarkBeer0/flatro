// app/api/tenant/dashboard/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Найти tenant запись для этого пользователя
    const tenant = await prisma.tenant.findFirst({
      where: { tenantUserId: authUser.id },
      include: {
        property: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              }
            }
          }
        }
      }
    })

    if (!tenant) {
      return NextResponse.json({
        property: null,
        payments: { pending: 0, pendingAmount: 0, overdue: 0, overdueAmount: 0 },
        unreadMessages: 0,
        openTickets: 0,
      })
    }

    // Получить статистику по платежам
    const payments = await prisma.payment.findMany({
      where: { tenantId: tenant.id },
      select: { status: true, amount: true }
    })

    const pendingPayments = payments.filter(p => p.status === 'PENDING' || p.status === 'PENDING_CONFIRMATION')
    const overduePayments = payments.filter(p => p.status === 'OVERDUE')

    // Получить непрочитанные сообщения
    const unreadMessages = await prisma.message.count({
      where: {
        receiverId: authUser.id,
        isRead: false,
      }
    })

    // Получить открытые заявки
    const openTickets = await prisma.ticket.count({
      where: {
        createdById: authUser.id,
        status: { in: ['NEW', 'IN_PROGRESS'] }
      }
    })

    // Собираем полное имя владельца
    const ownerName = tenant.property?.user 
      ? [tenant.property.user.firstName, tenant.property.user.lastName].filter(Boolean).join(' ') || 'Владелец'
      : 'Владелец'

    return NextResponse.json({
      property: tenant.property ? {
        id: tenant.property.id,
        name: tenant.property.name,
        address: tenant.property.address,
        city: tenant.property.city,
        rooms: tenant.property.rooms,
        area: tenant.property.area,
        owner: {
          name: ownerName,
          email: tenant.property.user.email,
          phone: tenant.property.user.phone,
        }
      } : null,
      payments: {
        pending: pendingPayments.length,
        pendingAmount: pendingPayments.reduce((sum, p) => sum + p.amount, 0),
        overdue: overduePayments.length,
        overdueAmount: overduePayments.reduce((sum, p) => sum + p.amount, 0),
      },
      unreadMessages,
      openTickets,
    })
  } catch (error) {
    console.error('Error fetching tenant dashboard:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}