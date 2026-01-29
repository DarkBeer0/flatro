// app/api/contracts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

// GET /api/contracts
export async function GET() {
  try {
    const user = await requireUser()

    const contracts = await prisma.contract.findMany({
      where: {
        property: {
          userId: user.id
        }
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
          }
        },
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(contracts)
  } catch (error) {
    console.error('Error fetching contracts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contracts' },
      { status: 500 }
    )
  }
}

// POST /api/contracts
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()

    // Проверяем что property принадлежит пользователю
    const property = await prisma.property.findFirst({
      where: { id: body.propertyId, userId: user.id }
    })

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    const contract = await prisma.contract.create({
      data: {
        propertyId: body.propertyId,
        tenantId: body.tenantId,
        type: body.type || 'STANDARD',
        startDate: new Date(body.startDate),
        endDate: body.endDate ? new Date(body.endDate) : null,
        rentAmount: parseFloat(body.rentAmount),
        depositAmount: body.depositAmount ? parseFloat(body.depositAmount) : null,
        paymentDay: body.paymentDay ? parseInt(body.paymentDay) : 10,
        status: 'ACTIVE',
        notes: body.notes || null,
      }
    })

    // Обновить статус property на OCCUPIED
    await prisma.property.update({
      where: { id: body.propertyId },
      data: { status: 'OCCUPIED' }
    })

    // Привязать tenant к property
    await prisma.tenant.update({
      where: { id: body.tenantId },
      data: { propertyId: body.propertyId }
    })

    return NextResponse.json(contract, { status: 201 })
  } catch (error) {
    console.error('Error creating contract:', error)
    return NextResponse.json(
      { error: 'Failed to create contract' },
      { status: 500 }
    )
  }
}
