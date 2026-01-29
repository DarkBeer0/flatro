// app/api/properties/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

// GET /api/properties - получить список недвижимости
export async function GET() {
  try {
    const user = await requireUser()

    const properties = await prisma.property.findMany({
      where: { userId: user.id },
      include: {
        tenants: {
          where: { isActive: true },
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        contracts: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            rentAmount: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(properties)
  } catch (error) {
    console.error('Error fetching properties:', error)
    return NextResponse.json(
      { error: 'Failed to fetch properties' },
      { status: 500 }
    )
  }
}

// POST /api/properties - создать недвижимость
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()

    const property = await prisma.property.create({
      data: {
        userId: user.id,
        name: body.name,
        address: body.address,
        city: body.city,
        postalCode: body.postalCode || null,
        area: body.area ? parseFloat(body.area) : null,
        rooms: body.rooms ? parseInt(body.rooms) : null,
        floor: body.floor ? parseInt(body.floor) : null,
        description: body.description || null,
        status: body.status || 'VACANT',
      }
    })

    return NextResponse.json(property, { status: 201 })
  } catch (error) {
    console.error('Error creating property:', error)
    return NextResponse.json(
      { error: 'Failed to create property' },
      { status: 500 }
    )
  }
}
