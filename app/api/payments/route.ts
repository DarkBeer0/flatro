// app/api/payments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

// GET /api/payments
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)
    
    // Фильтры
    const status = searchParams.get('status')
    const type = searchParams.get('type')
    const propertyId = searchParams.get('propertyId')

    const payments = await prisma.payment.findMany({
      where: {
        userId: user.id,
        ...(status && { status: status as any }),
        ...(type && { type: type as any }),
        ...(propertyId && {
          tenant: {
            propertyId: propertyId
          }
        })
      },
      include: {
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            property: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      },
      orderBy: { dueDate: 'desc' }
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error('Error fetching payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}

// POST /api/payments
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()

    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        tenantId: body.tenantId,
        amount: parseFloat(body.amount),
        type: body.type,
        status: body.status || 'PENDING',
        dueDate: new Date(body.dueDate),
        paidDate: body.paidDate ? new Date(body.paidDate) : null,
        period: body.period || null,
        notes: body.notes || null,
      }
    })

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error('Error creating payment:', error)
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}
