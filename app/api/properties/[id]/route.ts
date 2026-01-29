// app/api/properties/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

// GET /api/properties/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params

    const property = await prisma.property.findFirst({
      where: { 
        id,
        userId: user.id 
      },
      include: {
        tenants: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            isActive: true,
          }
        },
        contracts: {
          select: {
            id: true,
            type: true,
            status: true,
            startDate: true,
            endDate: true,
            rentAmount: true,
          }
        },
        meters: true,
      }
    })

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(property)
  } catch (error) {
    console.error('Error fetching property:', error)
    return NextResponse.json(
      { error: 'Failed to fetch property' },
      { status: 500 }
    )
  }
}

// PUT /api/properties/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = await request.json()

    // Проверяем что property принадлежит пользователю
    const existing = await prisma.property.findFirst({
      where: { id, userId: user.id }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    const property = await prisma.property.update({
      where: { id },
      data: {
        name: body.name,
        address: body.address,
        city: body.city,
        postalCode: body.postalCode || null,
        area: body.area ? parseFloat(body.area) : null,
        rooms: body.rooms ? parseInt(body.rooms) : null,
        floor: body.floor ? parseInt(body.floor) : null,
        description: body.description || null,
        status: body.status,
      }
    })

    return NextResponse.json(property)
  } catch (error) {
    console.error('Error updating property:', error)
    return NextResponse.json(
      { error: 'Failed to update property' },
      { status: 500 }
    )
  }
}

// DELETE /api/properties/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params

    // Проверяем что property принадлежит пользователю
    const existing = await prisma.property.findFirst({
      where: { id, userId: user.id }
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    await prisma.property.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting property:', error)
    return NextResponse.json(
      { error: 'Failed to delete property' },
      { status: 500 }
    )
  }
}
