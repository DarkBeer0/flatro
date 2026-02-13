// lib/utilities/meter-exchange.ts
// Flatro — Meter Exchange (Wymiana licznika)
//
// When a physical meter is replaced:
// 1. Record final reading on old meter (type: METER_EXCHANGE)
// 2. Create new meter with INITIAL reading
// 3. Archive old meter and link to new one via replacedById chain
//
// This preserves the full audit trail and ensures consumption
// calculations don't break across meter exchanges.

import { prisma } from '@/lib/prisma'

interface MeterExchangeParams {
  oldMeterId: string
  finalReading: number
  newMeterNumber?: string
  newSerialNumber?: string
  newInitialReading: number  // Usually 0, but not always
  notes?: string
}

interface MeterExchangeResult {
  oldMeter: {
    id: string
    status: string
    archiveDate: Date
  }
  newMeter: {
    id: string
    meterNumber: string | null
    status: string
  }
  finalReadingId: string
  initialReadingId: string
}

export async function exchangeMeter(
  params: MeterExchangeParams,
  userId: string
): Promise<MeterExchangeResult> {
  const {
    oldMeterId,
    finalReading,
    newMeterNumber,
    newSerialNumber,
    newInitialReading,
    notes,
  } = params

  return prisma.$transaction(async (tx) => {
    // ─── 1. Validate old meter ────────────────────────

    const oldMeter = await tx.meter.findUnique({
      where: { id: oldMeterId },
      include: {
        property: { select: { id: true, userId: true } },
        readings: {
          orderBy: { readingDate: 'desc' },
          take: 1,
          select: { value: true },
        },
      },
    })

    if (!oldMeter) {
      throw new Error('Meter not found')
    }

    if (oldMeter.property.userId !== userId) {
      throw new Error('Unauthorized: meter does not belong to your property')
    }

    if (oldMeter.status !== 'ACTIVE') {
      throw new Error(`Meter is already ${oldMeter.status} — cannot exchange`)
    }

    // Validate final reading is >= last reading
    const lastReading = oldMeter.readings[0]
    if (lastReading && finalReading < lastReading.value) {
      throw new Error(
        `Final reading (${finalReading}) cannot be less than last reading (${lastReading.value})`
      )
    }

    const now = new Date()

    // ─── 2. Record final reading on old meter ─────────

    const finalReadingRecord = await tx.meterReading.create({
      data: {
        meterId: oldMeterId,
        value: finalReading,
        readingDate: now,
        readingType: 'METER_EXCHANGE',
        notes: notes || 'Odczyt końcowy przed wymianą licznika',
      },
    })

    // ─── 3. Create new meter ──────────────────────────

    const newMeter = await tx.meter.create({
      data: {
        propertyId: oldMeter.propertyId,
        type: oldMeter.type,
        meterNumber: newMeterNumber || null,
        serialNumber: newSerialNumber || null,
        unit: oldMeter.unit,
        pricePerUnit: oldMeter.pricePerUnit,
        status: 'ACTIVE',
        installDate: now,
      },
    })

    // ─── 4. Record initial reading on new meter ───────

    const initialReadingRecord = await tx.meterReading.create({
      data: {
        meterId: newMeter.id,
        value: newInitialReading,
        readingDate: now,
        readingType: 'INITIAL',
        notes: 'Odczyt początkowy nowego licznika',
      },
    })

    // ─── 5. Archive old meter and link to new ─────────

    const updatedOld = await tx.meter.update({
      where: { id: oldMeterId },
      data: {
        status: 'ARCHIVED',
        archiveDate: now,
        archiveNote: `Wymieniony na ${newMeterNumber || newMeter.id.slice(0, 8)}`,
        replacedById: newMeter.id,
      },
    })

    return {
      oldMeter: {
        id: updatedOld.id,
        status: updatedOld.status,
        archiveDate: updatedOld.archiveDate!,
      },
      newMeter: {
        id: newMeter.id,
        meterNumber: newMeter.meterNumber,
        status: newMeter.status,
      },
      finalReadingId: finalReadingRecord.id,
      initialReadingId: initialReadingRecord.id,
    }
  })
}