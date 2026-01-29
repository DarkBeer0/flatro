// app/api/dashboard/stats/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

// GET /api/dashboard/stats
export async function GET() {
  try {
    const user = await requireUser()

    // Получаем все данные параллельно
    const [properties, tenants, payments, contracts] = await Promise.all([
      prisma.property.findMany({
        where: { userId: user.id },
        select: { id: true, status: true }
      }),
      prisma.tenant.findMany({
        where: { userId: user.id },
        select: { id: true, isActive: true }
      }),
      prisma.payment.findMany({
        where: { userId: user.id },
        select: { id: true, status: true, amount: true, dueDate: true }
      }),
      prisma.contract.findMany({
        where: {
          property: { userId: user.id },
          status: 'ACTIVE'
        },
        select: { id: true, rentAmount: true, endDate: true }
      })
    ])

    // Статистика по недвижимости
    const totalProperties = properties.length
    const occupiedProperties = properties.filter(p => p.status === 'OCCUPIED').length
    const vacantProperties = properties.filter(p => p.status === 'VACANT').length

    // Статистика по арендаторам
    const totalTenants = tenants.length
    const activeTenants = tenants.filter(t => t.isActive).length

    // Статистика по платежам
    const pendingPayments = payments.filter(p => p.status === 'PENDING').length
    const overduePayments = payments.filter(p => p.status === 'OVERDUE').length
    const pendingAmount = payments
      .filter(p => p.status === 'PENDING')
      .reduce((sum, p) => sum + p.amount, 0)
    const overdueAmount = payments
      .filter(p => p.status === 'OVERDUE')
      .reduce((sum, p) => sum + p.amount, 0)

    // Месячный доход (сумма активных контрактов)
    const monthlyIncome = contracts.reduce((sum, c) => sum + c.rentAmount, 0)

    // Истекающие контракты (в течение 30 дней)
    const now = new Date()
    const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
    const expiringContracts = contracts.filter(c => 
      c.endDate && new Date(c.endDate) <= thirtyDaysLater
    ).length

    return NextResponse.json({
      properties: {
        total: totalProperties,
        occupied: occupiedProperties,
        vacant: vacantProperties,
      },
      tenants: {
        total: totalTenants,
        active: activeTenants,
      },
      payments: {
        pending: pendingPayments,
        overdue: overduePayments,
        pendingAmount,
        overdueAmount,
      },
      contracts: {
        active: contracts.length,
        expiring: expiringContracts,
      },
      monthlyIncome,
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
