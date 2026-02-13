// lib/utilities/settlement-calculator.ts
// Flatro — Settlement Calculator
//
// Orchestrates the full settlement calculation:
// 1. Find active tenants in period
// 2. Process metered utilities (readings × rate snapshot)
// 3. Process fixed utilities (period cost, per-person logic)
// 4. Smart split across tenants
// 5. Handle advance payments (zaliczki) if applicable

import { prisma } from '@/lib/prisma'
import { calculateSmartSplit, calculateActiveDays, roundPLN } from './smart-split'
import { METER_TYPE_LABELS } from './types'
import type {
  CalculateSettlementInput,
  CalculatedSettlement,
  CalculatedItem,
  TenantPeriod,
  MeterType,
  BillingApproach,
} from './types'

export async function calculateSettlement(
  input: CalculateSettlementInput
): Promise<CalculatedSettlement> {
  const { propertyId, periodStart, periodEnd, approach } = input
  const warnings: string[] = []
  const items: CalculatedItem[] = []

  // ─── 1. Active tenants in period ───────────────────────

  const tenants = await prisma.tenant.findMany({
    where: {
      propertyId,
      moveInDate: { lte: periodEnd },
      OR: [
        { moveOutDate: null },
        { moveOutDate: { gte: periodStart } },
      ],
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      moveInDate: true,
      moveOutDate: true,
    },
  })

  if (tenants.length === 0) {
    warnings.push('Brak aktywnych najemców w wybranym okresie')
  }

  // Build tenant periods for smart split
  const tenantPeriods: TenantPeriod[] = tenants
    .filter(t => t.moveInDate !== null)
    .map(t => ({
      tenantId: t.id,
      leaseStart: t.moveInDate!,
      leaseEnd: t.moveOutDate,
    }))

  // ─── 2. Process METERED utilities ─────────────────────

  const meters = await prisma.meter.findMany({
    where: { propertyId, status: 'ACTIVE' },
    include: {
      readings: {
        where: {
          readingDate: { lte: periodEnd },
          // Exclude INITIAL readings of different periods
        },
        orderBy: { readingDate: 'desc' },
        take: 10, // enough to find prev + curr
      },
    },
  })

  for (const meter of meters) {
    // Find the two most relevant readings for this period
    // Current = latest reading on or before periodEnd
    // Previous = latest reading before current
    const allReadings = meter.readings

    if (allReadings.length < 2) {
      warnings.push(
        `Brak wystarczających odczytów dla ${getMeterLabel(meter.type as MeterType)} ` +
        `(${meter.meterNumber || meter.id.slice(0, 8)})`
      )
      continue
    }

    const currReading = allReadings[0]
    const prevReading = allReadings[1]

    // Get rate snapshot at periodEnd
    const rate = await getEffectiveRate(propertyId, meter.type as MeterType, periodEnd)

    if (!rate) {
      // Fallback to meter's own pricePerUnit
      if (!meter.pricePerUnit) {
        warnings.push(`Brak taryfy dla ${getMeterLabel(meter.type as MeterType)}`)
        continue
      }
    }

    const snapshotRate = rate?.pricePerUnit ?? meter.pricePerUnit!
    const consumption = roundPLN(currReading.value - prevReading.value)

    if (consumption < 0) {
      warnings.push(
        `Ujemne zużycie (${consumption}) dla ${getMeterLabel(meter.type as MeterType)} ` +
        `— sprawdź odczyty (${prevReading.value} → ${currReading.value})`
      )
    }

    items.push({
      meterId: meter.id,
      label: getMeterLabel(meter.type as MeterType),
      unit: meter.unit,
      prevReading: prevReading.value,
      currReading: currReading.value,
      consumption,
      rate: snapshotRate,
      totalCost: roundPLN(Math.max(0, consumption) * snapshotRate),
      splitMethod: 'BY_DAYS',
    })
  }

  // ─── 3. Process FIXED utilities ───────────────────────

  const fixedUtilities = await prisma.fixedUtility.findMany({
    where: { propertyId, isActive: true },
  })

  for (const fu of fixedUtilities) {
    let cost = fu.periodCost

    // Per-person billing: cost × number of active tenants
    if (fu.isPerPerson) {
      const activeTenantCount = tenantPeriods.filter(t =>
        calculateActiveDays(periodStart, periodEnd, t) > 0
      ).length
      cost = fu.periodCost * Math.max(1, activeTenantCount)
    }

    items.push({
      fixedUtilityId: fu.id,
      label: fu.name,
      periodCost: fu.periodCost,
      totalCost: roundPLN(cost),
      splitMethod: fu.splitMethod as any,
    })
  }

  // ─── 4. Calculate total ───────────────────────────────

  const totalAmount = roundPLN(
    items.reduce((sum, item) => sum + item.totalCost, 0)
  )

  // ─── 5. Smart split ───────────────────────────────────

  const shares = calculateSmartSplit(
    periodStart,
    periodEnd,
    totalAmount,
    tenantPeriods
  )

  // ─── 6. Handle advance payments (zaliczki) ────────────

  if (approach === 'ADVANCE_PAYMENT') {
    for (const share of shares) {
      const advancesSum = await getAdvancesPaidInPeriod(
        share.tenantId,
        propertyId,
        periodStart,
        periodEnd
      )
      // Store for later use during finalization
      ;(share as any).advancesPaid = advancesSum
      ;(share as any).balanceDue = roundPLN(share.amount - advancesSum)
    }
  }

  return { items, shares, totalAmount, warnings }
}

// ============================================
// Helper: Get effective rate at a point in time
// ============================================

async function getEffectiveRate(
  propertyId: string,
  meterType: MeterType,
  atDate: Date
) {
  return prisma.utilityRate.findFirst({
    where: {
      propertyId,
      meterType,
      effectiveFrom: { lte: atDate },
      OR: [
        { effectiveTo: null },
        { effectiveTo: { gte: atDate } },
      ],
    },
    orderBy: { effectiveFrom: 'desc' },
  })
}

// ============================================
// Helper: Sum advance payments in a period
// ============================================

async function getAdvancesPaidInPeriod(
  tenantId: string,
  propertyId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<number> {
  // Look for UTILITIES payments marked as paid within the period
  const payments = await prisma.payment.findMany({
    where: {
      tenantId,
      type: 'UTILITIES',
      status: 'PAID',
      paidDate: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
    select: { amount: true },
  })

  return roundPLN(payments.reduce((sum, p) => sum + p.amount, 0))
}

// ============================================
// Helper: Polish label for meter type
// ============================================

function getMeterLabel(type: MeterType): string {
  return METER_TYPE_LABELS[type]?.pl ?? type
}