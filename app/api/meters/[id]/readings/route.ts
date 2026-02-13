// app/api/meters/[id]/readings/route.ts
// Flatro — Meter Readings (enhanced with GET + readingType)
//
// REPLACES the existing route — adds GET for history,
// enhances POST with readingType and notes fields.

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/meters/[id]/readings?limit=20
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: meterId } = await params
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '20')

    // Verify meter belongs to user's property (owner) or user is tenant of that property
    const meter = await prisma.meter.findFirst({
      where: {
        id: meterId,
        OR: [
          { property: { userId: user.id } }, // owner
          {
            property: {
              tenants: {
                some: { tenantUserId: user.id, isActive: true },
              },
            },
          }, // tenant
        ],
      },
      select: { id: true, type: true, unit: true, meterNumber: true },
    })

    if (!meter) {
      return NextResponse.json({ error: 'Meter not found' }, { status: 404 })
    }

    const readings = await prisma.meterReading.findMany({
      where: { meterId },
      orderBy: { readingDate: 'desc' },
      take: Math.min(limit, 100),
      include: {
        tenant: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    })

    return NextResponse.json({
      meter,
      readings,
      count: readings.length,
    })
  } catch (error) {
    console.error('Error fetching readings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/meters/[id]/readings — Submit reading (enhanced)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: meterId } = await params
    const body = await request.json()
    const { value, readingDate, readingType, notes } = body

    if (value === undefined) {
      return NextResponse.json({ error: 'value is required' }, { status: 400 })
    }

    // Check if user is owner of this meter
    const meterAsOwner = await prisma.meter.findFirst({
      where: { id: meterId, property: { userId: user.id } },
    })

    // Check if user is tenant of this meter's property
    let tenantId: string | null = null
    if (!meterAsOwner) {
      const tenant = await prisma.tenant.findFirst({
        where: {
          tenantUserId: user.id,
          isActive: true,
          property: { meters: { some: { id: meterId } } },
        },
      })

      if (!tenant) {
        return NextResponse.json({ error: 'Meter not found' }, { status: 404 })
      }

      tenantId = tenant.id
    }

    // Validate: meter must be ACTIVE
    const meter = await prisma.meter.findUnique({
      where: { id: meterId },
    })

    if (!meter || meter.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Meter is not active — cannot submit readings' },
        { status: 400 }
      )
    }

    // Validate: new reading should not be less than previous (warning, not block)
    const lastReading = await prisma.meterReading.findFirst({
      where: { meterId },
      orderBy: { readingDate: 'desc' },
      select: { value: true },
    })

    const parsedValue = parseFloat(value)

    const reading = await prisma.meterReading.create({
      data: {
        meterId,
        tenantId,
        value: parsedValue,
        readingDate: readingDate ? new Date(readingDate) : new Date(),
        readingType: readingType || 'REGULAR',
        notes: notes || null,
      },
    })

    const response: any = { ...reading }
    if (lastReading && parsedValue < lastReading.value) {
      response.warning = `Nowy odczyt (${parsedValue}) jest mniejszy niż poprzedni (${lastReading.value})`
    }

    return NextResponse.json(response, { status: 201 })
  } catch (error) {
    console.error('Error creating reading:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}