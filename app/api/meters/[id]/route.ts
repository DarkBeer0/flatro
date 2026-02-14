// app/api/meters/[id]/route.ts
// Flatro — Single Meter CRUD (Owner only)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createClient } from '@/lib/supabase/server'

// GET /api/meters/[id] — Full meter details with recent readings
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

    const { id } = await params

    const meter = await prisma.meter.findFirst({
      where: {
        id,
        OR: [
          { property: { userId: user.id } },
          {
            property: {
              tenants: {
                some: { tenantUserId: user.id, isActive: true },
              },
            },
          },
        ],
      },
      include: {
        property: { select: { id: true, name: true, address: true } },
        readings: {
          orderBy: { readingDate: 'desc' },
          take: 10,
          include: {
            tenant: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
        replacedBy: {
          select: { id: true, meterNumber: true, status: true },
        },
        replaces: {
          select: { id: true, meterNumber: true, status: true },
        },
      },
    })

    if (!meter) {
      return NextResponse.json({ error: 'Meter not found' }, { status: 404 })
    }

    return NextResponse.json(meter)
  } catch (error) {
    console.error('Error fetching meter:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/meters/[id] — Update meter (Owner only, ACTIVE meters)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    const existing = await prisma.meter.findFirst({
      where: { id, property: { userId: user.id } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Meter not found' }, { status: 404 })
    }

    const updated = await prisma.meter.update({
      where: { id },
      data: {
        meterNumber: body.meterNumber !== undefined ? (body.meterNumber || null) : undefined,
        serialNumber: body.serialNumber !== undefined ? (body.serialNumber || null) : undefined,
        unit: body.unit || undefined,
        pricePerUnit: body.pricePerUnit !== undefined
          ? (body.pricePerUnit !== null && body.pricePerUnit !== '' ? parseFloat(body.pricePerUnit) : null)
          : undefined,
        installDate: body.installDate ? new Date(body.installDate) : undefined,
      },
      include: {
        property: { select: { id: true, name: true } },
        readings: {
          orderBy: { readingDate: 'desc' },
          take: 2,
          select: { id: true, value: true, readingDate: true },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating meter:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/meters/[id] — Decommission meter (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.meter.findFirst({
      where: { id, property: { userId: user.id } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Meter not found' }, { status: 404 })
    }

    if (existing.status === 'DECOMMISSIONED') {
      return NextResponse.json({ error: 'Meter is already decommissioned' }, { status: 400 })
    }

    // Soft delete: decommission rather than hard delete (preserves settlement history)
    const updated = await prisma.meter.update({
      where: { id },
      data: {
        status: 'DECOMMISSIONED',
        archiveDate: new Date(),
        archiveNote: 'Zlikwidowany przez właściciela',
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error decommissioning meter:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}