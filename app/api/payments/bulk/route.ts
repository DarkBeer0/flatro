// app/api/payments/bulk/route.ts
// POST /api/payments/bulk — generate N recurring payment records
// ============================================================
// Body shape:
// {
//   tenantId:    string
//   type:        'RENT' | 'UTILITIES' | 'DEPOSIT' | 'OTHER'
//   amount:      number
//   notes?:      string
//   startMonth:  string  // 'YYYY-MM' — first period
//   months:      number  // how many payments to generate (1–60)
//   dueDayOfMonth: number  // day of month for dueDate (default: 10)
// }
// Each payment gets its own period (YYYY-MM) and dueDate.
// All share one recurringGroupId so they can be viewed together.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { randomUUID } from 'crypto'

function addMonths(date: Date, n: number): Date {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  return d
}

function formatPeriod(date: Date): string {
  return date.toISOString().slice(0, 7) // 'YYYY-MM'
}

function buildDueDate(year: number, month: number, day: number): Date {
  // Clamp day to actual month length (e.g. Feb 28/29)
  const lastDay = new Date(year, month, 0).getDate() // month is 1-based for Date constructor
  const clampedDay = Math.min(day, lastDay)
  return new Date(year, month - 1, clampedDay) // month-1 for JS Date (0-based)
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()

    // ── Validate input ─────────────────────────────────────
    const { tenantId, type, amount, notes, startMonth, months, dueDayOfMonth } = body

    if (!tenantId || !type || !amount || !startMonth || !months) {
      return NextResponse.json(
        { error: 'Missing required fields: tenantId, type, amount, startMonth, months' },
        { status: 400 }
      )
    }

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      return NextResponse.json({ error: 'amount must be a positive number' }, { status: 400 })
    }

    const parsedMonths = parseInt(months)
    if (isNaN(parsedMonths) || parsedMonths < 1 || parsedMonths > 60) {
      return NextResponse.json({ error: 'months must be between 1 and 60' }, { status: 400 })
    }

    const dueDay = parseInt(dueDayOfMonth) || 10
    if (dueDay < 1 || dueDay > 31) {
      return NextResponse.json({ error: 'dueDayOfMonth must be between 1 and 31' }, { status: 400 })
    }

    // Validate startMonth format
    if (!/^\d{4}-\d{2}$/.test(startMonth)) {
      return NextResponse.json({ error: 'startMonth must be YYYY-MM format' }, { status: 400 })
    }

    // ── Verify tenant belongs to this owner ────────────────
    const tenant = await prisma.tenant.findFirst({
      where: { id: tenantId, userId: user.id },
      select: { id: true }
    })
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // ── Build payment records ──────────────────────────────
    const recurringGroupId = randomUUID()
    const [startYear, startMonthNum] = startMonth.split('-').map(Number)
    const startDate = new Date(startYear, startMonthNum - 1, 1)

    const paymentsData = Array.from({ length: parsedMonths }, (_, i) => {
      const periodDate = addMonths(startDate, i)
      const year = periodDate.getFullYear()
      const month = periodDate.getMonth() + 1 // 1-based

      return {
        userId: user.id,
        tenantId,
        amount: parsedAmount,
        type,
        status: 'PENDING' as const,
        dueDate: buildDueDate(year, month, dueDay),
        period: formatPeriod(periodDate),
        notes: notes || null,
        isRecurring: true,
        recurringGroupId,
        recurringIndex: i + 1,
      }
    })

    // ── Bulk insert in a transaction ────────────────────────
    const created = await prisma.$transaction(
      paymentsData.map((data) => prisma.payment.create({ data }))
    )

    return NextResponse.json(
      {
        recurringGroupId,
        count: created.length,
        payments: created,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error bulk-creating payments:', error)
    return NextResponse.json({ error: 'Failed to create payments' }, { status: 500 })
  }
}

// GET /api/payments/bulk?groupId=... — fetch all payments in a group
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)
    const groupId = searchParams.get('groupId')

    if (!groupId) {
      return NextResponse.json({ error: 'groupId is required' }, { status: 400 })
    }

    const payments = await prisma.payment.findMany({
      where: { userId: user.id, recurringGroupId: groupId },
      include: {
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            property: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { recurringIndex: 'asc' }
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error('Error fetching payment group:', error)
    return NextResponse.json({ error: 'Failed to fetch payment group' }, { status: 500 })
  }
}