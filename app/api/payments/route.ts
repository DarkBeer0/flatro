// app/api/payments/route.ts  (UPDATED)
// ============================================================
// Changes vs. original:
//   POST: now supports isRecurring flag + recurringGroupId
//         (for single payments; bulk uses /api/payments/bulk)
//   GET:  unchanged (added recurringGroupId to response)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

// GET /api/payments
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)

    const status       = searchParams.get('status')
    const type         = searchParams.get('type')
    const propertyId   = searchParams.get('propertyId')
    const groupId      = searchParams.get('groupId')

    const payments = await prisma.payment.findMany({
      where: {
        userId: user.id,
        ...(status    && { status: status as any }),
        ...(type      && { type: type as any }),
        ...(groupId   && { recurringGroupId: groupId }),
        ...(propertyId && { tenant: { propertyId } }),
      },
      include: {
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            property: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { dueDate: 'desc' },
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json({ error: 'Failed to fetch payments' }, { status: 500 })
  }
}

// POST /api/payments  — create a SINGLE payment
// For bulk/recurring use POST /api/payments/bulk instead
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()

    const payment = await prisma.payment.create({
      data: {
        userId:    user.id,
        tenantId:  body.tenantId,
        amount:    parseFloat(body.amount),
        type:      body.type,
        status:    'PENDING',
        dueDate:   new Date(body.dueDate),
        paidDate:  body.paidDate ? new Date(body.paidDate) : null,
        period:    body.period   || null,
        notes:     body.notes    || null,
        isRecurring:      false,
        recurringGroupId: null,
        recurringIndex:   null,
      },
    })

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json({ error: 'Failed to create payment' }, { status: 500 })
  }
}