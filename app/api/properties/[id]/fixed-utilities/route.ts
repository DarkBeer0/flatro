// app/api/properties/[id]/fixed-utilities/route.ts
// Flatro — Fixed Utilities CRUD (Internet, Garbage, Admin fees, etc.)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

// GET /api/properties/[id]/fixed-utilities
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id: propertyId } = await params

    // Validate ownership
    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId: user.id },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const utilities = await prisma.fixedUtility.findMany({
      where: { propertyId },
      orderBy: [{ isActive: 'desc' }, { type: 'asc' }],
    })

    return NextResponse.json(utilities)
  } catch (error) {
    console.error('Error fetching fixed utilities:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/properties/[id]/fixed-utilities
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id: propertyId } = await params
    const body = await request.json()

    // Validate ownership
    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId: user.id },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const { type, name, periodCost, splitMethod, isPerPerson, notes } = body

    if (!type || !name || periodCost === undefined) {
      return NextResponse.json(
        { error: 'type, name, and periodCost are required' },
        { status: 400 }
      )
    }

    const utility = await prisma.fixedUtility.create({
      data: {
        propertyId,
        type,
        name,
        periodCost: parseFloat(periodCost),
        splitMethod: splitMethod || 'BY_DAYS',
        isPerPerson: isPerPerson || false,
        notes: notes || null,
      },
    })

    return NextResponse.json(utility, { status: 201 })
  } catch (error) {
    console.error('Error creating fixed utility:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}