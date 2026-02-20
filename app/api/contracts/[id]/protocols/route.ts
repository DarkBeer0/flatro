// app/api/contracts/[id]/protocols/route.ts
// Flatro — V9: Handover Protocols CRUD (Owner only)
// POST saves protocol + creates MeterReadings in one Prisma transaction

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import type { CreateProtocolInput, ProtocolMeterReading } from '@/lib/contracts/lifecycle-types'

// ──────────────────────────────────────────────────────────────
// GET /api/contracts/[id]/protocols
// ──────────────────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id: contractId } = await params

    // Validate: contract belongs to this owner
    const contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        property: { userId: user.id },
      },
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const protocols = await prisma.protocol.findMany({
      where: { contractId },
      orderBy: { date: 'desc' },
      include: {
        contract: {
          select: {
            id: true,
            property: { select: { name: true, address: true, city: true } },
            tenant: { select: { firstName: true, lastName: true } },
          },
        },
      },
    })

    return NextResponse.json(protocols)
  } catch (error) {
    console.error('Error fetching protocols:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/contracts/[id]/protocols
// ──────────────────────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id: contractId } = await params
    const body: CreateProtocolInput = await request.json()

    // ─── Validation ───────────────────────────────────────
    const { type, date, meterReadings, keysHandedOver, roomsCondition, generalNotes } = body

    if (!type || !['MOVE_IN', 'MOVE_OUT'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be MOVE_IN or MOVE_OUT' },
        { status: 400 }
      )
    }

    if (!date) {
      return NextResponse.json(
        { error: 'date is required' },
        { status: 400 }
      )
    }

    // ─── Verify contract ownership ────────────────────────
    const contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        property: { userId: user.id },
      },
      include: {
        property: {
          include: {
            meters: {
              where: { status: 'ACTIVE' },
              select: { id: true, type: true, meterNumber: true },
            },
          },
        },
        tenant: { select: { id: true } },
      },
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // ─── Check for duplicate protocol type ────────────────
    const existingProtocol = await prisma.protocol.findFirst({
      where: { contractId, type },
    })

    if (existingProtocol) {
      return NextResponse.json(
        { error: `Protokół ${type === 'MOVE_IN' ? 'wydania' : 'zwrotu'} już istnieje dla tego kontraktu` },
        { status: 409 }
      )
    }

    // For MOVE_OUT, ensure MOVE_IN exists first
    if (type === 'MOVE_OUT') {
      const moveInExists = await prisma.protocol.findFirst({
        where: { contractId, type: 'MOVE_IN' },
      })
      if (!moveInExists) {
        return NextResponse.json(
          { error: 'Protokół wydania (MOVE_IN) musi istnieć przed protokołem zwrotu' },
          { status: 400 }
        )
      }
    }

    // ─── Validate meter IDs ───────────────────────────────
    const validMeterIds = new Set(contract.property.meters.map((m) => m.id))
    const readings = (meterReadings || []) as ProtocolMeterReading[]

    for (const reading of readings) {
      if (!validMeterIds.has(reading.meterId)) {
        return NextResponse.json(
          { error: `Meter ${reading.meterId} not found or not active for this property` },
          { status: 400 }
        )
      }
      if (typeof reading.value !== 'number' || reading.value < 0) {
        return NextResponse.json(
          { error: `Invalid meter reading value for meter ${reading.meterId}` },
          { status: 400 }
        )
      }
    }

    // ─── Transaction: Create Protocol + MeterReadings ─────
    const readingType = type === 'MOVE_IN' ? 'INITIAL' : 'FINAL'

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Protocol record
      const protocol = await tx.protocol.create({
        data: {
          contractId,
          type,
          date: new Date(date),
          meterReadings: readings as any,
          keysHandedOver: (keysHandedOver || []) as any,
          roomsCondition: (roomsCondition || []) as any,
          generalNotes: generalNotes || null,
        },
      })

      // 2. Create MeterReading records (INITIAL or FINAL)
      if (readings.length > 0) {
        await tx.meterReading.createMany({
          data: readings.map((r) => ({
            meterId: r.meterId,
            tenantId: contract.tenant.id,
            value: r.value,
            readingDate: new Date(date),
            readingType: readingType as any,
            notes: `Auto: Protokół ${type === 'MOVE_IN' ? 'wydania' : 'zwrotu'} lokalu`,
          })),
        })
      }

      // 3. If MOVE_IN and contract is SIGNED → optionally activate it
      // (This is a convenience — owner can still do it manually)
      if (type === 'MOVE_IN' && contract.status === 'SIGNED') {
        await tx.contract.update({
          where: { id: contractId },
          data: {
            status: 'ACTIVE',
            statusUpdatedAt: new Date(),
            statusUpdatedBy: user.id,
          },
        })

        // Log status change
        await tx.contractStatusHistory.create({
          data: {
            contractId,
            oldStatus: 'SIGNED',
            newStatus: 'ACTIVE',
            changedBy: user.id,
            reason: 'Automatyczna aktywacja po protokole wydania',
          },
        })
      }

      return protocol
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating protocol:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}