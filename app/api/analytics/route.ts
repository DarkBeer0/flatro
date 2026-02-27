// app/api/analytics/route.ts
// Flatro — Financial Analytics API
// GET /api/analytics — aggregated payment data for the last 12 months

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()

    const now = new Date()
    const twelveMonthsAgo = new Date(now)
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11)
    twelveMonthsAgo.setDate(1)
    twelveMonthsAgo.setHours(0, 0, 0, 0)

    const currentYearStart = new Date(now.getFullYear(), 0, 1)

    // Fetch all payments for the owner in the last 12 months
    const payments = await prisma.payment.findMany({
      where: {
        userId: user.id,
        dueDate: { gte: twelveMonthsAgo },
      },
      include: {
        tenant: {
          select: {
            property: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    })

    // ── 1. Revenue by month (last 12 months) ─────────────────
    const monthLabels: string[] = []
    const monthMap: Record<string, number> = {}

    for (let i = 11; i >= 0; i--) {
      const d = new Date(now)
      d.setMonth(d.getMonth() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('pl-PL', { month: 'short', year: '2-digit' })
      monthLabels.push(label)
      monthMap[key] = 0
    }

    const monthKeys = Object.keys(monthMap)

    for (const p of payments) {
      if (p.status === 'PAID' || p.status === 'PENDING_CONFIRMATION') {
        const key = `${p.dueDate.getFullYear()}-${String(p.dueDate.getMonth() + 1).padStart(2, '0')}`
        if (key in monthMap) {
          monthMap[key] += p.amount
        }
      }
    }

    const revenueByMonth = monthKeys.map((key, i) => ({
      month: monthLabels[i],
      revenue: Math.round(monthMap[key] * 100) / 100,
    }))

    // ── 2. Revenue by property (pie chart) ───────────────────
    const propertyMap: Record<string, { name: string; revenue: number }> = {}

    for (const p of payments) {
      if (p.status === 'PAID' || p.status === 'PENDING_CONFIRMATION') {
        const prop = p.tenant?.property
        if (prop) {
          if (!propertyMap[prop.id]) {
            propertyMap[prop.id] = { name: prop.name, revenue: 0 }
          }
          propertyMap[prop.id].revenue += p.amount
        }
      }
    }

    const revenueByProperty = Object.values(propertyMap)
      .map((p) => ({ name: p.name, value: Math.round(p.revenue * 100) / 100 }))
      .sort((a, b) => b.value - a.value)

    // ── 3. Payment statuses (doughnut) ───────────────────────
    const statusCounts: Record<string, number> = {
      PAID: 0,
      PENDING: 0,
      OVERDUE: 0,
      PENDING_CONFIRMATION: 0,
      REJECTED: 0,
      CANCELLED: 0,
    }

    for (const p of payments) {
      if (p.status in statusCounts) {
        statusCounts[p.status]++
      }
    }

    const paymentStatuses = Object.entries(statusCounts)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({ status, count }))

    // ── 4. Summary cards ─────────────────────────────────────
    const currentYearPayments = payments.filter(
      (p) =>
        p.dueDate >= currentYearStart &&
        (p.status === 'PAID' || p.status === 'PENDING_CONFIRMATION')
    )

    const totalRevenueYear = currentYearPayments.reduce((sum, p) => sum + p.amount, 0)

    // Average monthly revenue (last 12 months, only months with data)
    const nonZeroMonths = Object.values(monthMap).filter((v) => v > 0)
    const avgMonthlyRevenue =
      nonZeroMonths.length > 0
        ? nonZeroMonths.reduce((a, b) => a + b, 0) / nonZeroMonths.length
        : 0

    // On-time payment rate: paid before or on dueDate
    const paidPayments = payments.filter((p) => p.status === 'PAID' && p.paidDate)
    const paidOnTime = paidPayments.filter(
      (p) => p.paidDate && p.paidDate <= p.dueDate
    )
    const onTimeRate =
      paidPayments.length > 0
        ? Math.round((paidOnTime.length / paidPayments.length) * 100)
        : 0

    // Most profitable property
    const topProperty =
      revenueByProperty.length > 0 ? revenueByProperty[0] : null

    return NextResponse.json({
      revenueByMonth,
      revenueByProperty,
      paymentStatuses,
      summary: {
        totalRevenueYear: Math.round(totalRevenueYear * 100) / 100,
        avgMonthlyRevenue: Math.round(avgMonthlyRevenue * 100) / 100,
        onTimeRate,
        topProperty: topProperty
          ? { name: topProperty.name, revenue: topProperty.value }
          : null,
      },
    })
  } catch (error) {
    console.error('[/api/analytics]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}