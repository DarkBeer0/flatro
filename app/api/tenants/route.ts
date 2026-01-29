// app/api/tenants/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

// GET /api/tenants
export async function GET() {
  try {
    const user = await requireUser()

    const tenants = await prisma.tenant.findMany({
      where: { userId: user.id },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(tenants)
  } catch (error) {
    console.error('Error fetching tenants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tenants' },
      { status: 500 }
    )
  }
}

// POST /api/tenants
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()

    const tenant = await prisma.tenant.create({
      data: {
        userId: user.id,
        propertyId: body.propertyId || null,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email || null,
        phone: body.phone || null,
        pesel: body.pesel || null,
        moveInDate: body.moveInDate ? new Date(body.moveInDate) : null,
        isActive: true,
      }
    })

    // Если привязан к property - обновить статус property
    if (body.propertyId) {
      await prisma.property.update({
        where: { id: body.propertyId },
        data: { status: 'OCCUPIED' }
      })
    }

    return NextResponse.json(tenant, { status: 201 })
  } catch (error) {
    console.error('Error creating tenant:', error)
    return NextResponse.json(
      { error: 'Failed to create tenant' },
      { status: 500 }
    )
  }
}
