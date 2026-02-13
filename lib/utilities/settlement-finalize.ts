// lib/utilities/settlement-finalize.ts
// Flatro — Settlement Finalization
//
// When an owner confirms a settlement:
// 1. Validate it's in DRAFT/CALCULATED status
// 2. Update status to FINALIZED
// 3. Create TenantLedger entries for each tenant
// 4. Handle advance payment offsets (zaliczki)
// 5. Carry forward saldo to running balance

import { prisma } from '@/lib/prisma'
import { roundPLN } from './smart-split'

interface FinalizeResult {
  settlementId: string
  status: string
  ledgerEntries: number
  finalizedAt: Date
}

export async function finalizeSettlement(
  settlementId: string,
  userId: string
): Promise<FinalizeResult> {
  return prisma.$transaction(async (tx) => {
    // ─── 1. Load and validate settlement ────────────────

    const settlement = await tx.utilitySettlement.findFirst({
      where: {
        id: settlementId,
        property: { userId },
        status: { in: ['DRAFT', 'CALCULATED'] },
      },
      include: {
        shares: true,
        items: true,
      },
    })

    if (!settlement) {
      throw new Error('Settlement not found or not in DRAFT/CALCULATED status')
    }

    if (settlement.shares.length === 0) {
      throw new Error('Settlement has no tenant shares — cannot finalize')
    }

    const now = new Date()
    let ledgerEntriesCount = 0

    // ─── 2. Update settlement status ────────────────────

    await tx.utilitySettlement.update({
      where: { id: settlementId },
      data: {
        status: 'FINALIZED',
        finalizedAt: now,
      },
    })

    // ─── 3. Create ledger entries for each tenant ───────

    for (const share of settlement.shares) {
      // Get current balance (last ledger entry)
      const lastEntry = await tx.tenantLedger.findFirst({
        where: {
          tenantId: share.tenantId,
          propertyId: settlement.propertyId,
        },
        orderBy: { createdAt: 'desc' },
        select: { balanceAfter: true },
      })

      let currentBalance = lastEntry?.balanceAfter ?? 0
      const chargeAmount = share.finalAmount

      // Build period label for description
      const periodLabel = formatPeriodLabel(
        settlement.periodStart,
        settlement.periodEnd
      )

      // ── CHARGE entry ──
      currentBalance = roundPLN(currentBalance + chargeAmount)

      await tx.tenantLedger.create({
        data: {
          tenantId: share.tenantId,
          propertyId: settlement.propertyId,
          entryType: 'CHARGE',
          amount: chargeAmount,
          settlementId,
          description: settlement.title
            ? `Rozliczenie mediów: ${settlement.title}`
            : `Rozliczenie mediów za ${periodLabel}`,
          balanceAfter: currentBalance,
        },
      })
      ledgerEntriesCount++

      // ── ADVANCE_PAYMENT offset (if zaliczki approach) ──
      if (settlement.approach === 'ADVANCE_PAYMENT' && share.advancesPaid > 0) {
        currentBalance = roundPLN(currentBalance - share.advancesPaid)

        await tx.tenantLedger.create({
          data: {
            tenantId: share.tenantId,
            propertyId: settlement.propertyId,
            entryType: 'ADVANCE_PAYMENT',
            amount: -share.advancesPaid, // negative = reduces debt
            settlementId,
            description: `Zaliczki za ${periodLabel}`,
            balanceAfter: currentBalance,
          },
        })
        ledgerEntriesCount++

        // Update the share's balanceDue
        await tx.settlementShare.update({
          where: { id: share.id },
          data: {
            balanceDue: roundPLN(chargeAmount - share.advancesPaid),
          },
        })
      }
    }

    return {
      settlementId,
      status: 'FINALIZED',
      ledgerEntries: ledgerEntriesCount,
      finalizedAt: now,
    }
  })
}

/**
 * Void a finalized settlement.
 * Creates reverse ledger entries to undo the charges.
 */
export async function voidSettlement(
  settlementId: string,
  userId: string,
  reason: string
): Promise<{ settlementId: string; status: string }> {
  return prisma.$transaction(async (tx) => {
    const settlement = await tx.utilitySettlement.findFirst({
      where: {
        id: settlementId,
        property: { userId },
        status: 'FINALIZED',
      },
      include: { shares: true },
    })

    if (!settlement) {
      throw new Error('Settlement not found or not FINALIZED')
    }

    // Create reverse ledger entries
    for (const share of settlement.shares) {
      const lastEntry = await tx.tenantLedger.findFirst({
        where: {
          tenantId: share.tenantId,
          propertyId: settlement.propertyId,
        },
        orderBy: { createdAt: 'desc' },
        select: { balanceAfter: true },
      })

      const currentBalance = lastEntry?.balanceAfter ?? 0
      const reverseAmount = -share.finalAmount // negative charge = credit

      await tx.tenantLedger.create({
        data: {
          tenantId: share.tenantId,
          propertyId: settlement.propertyId,
          entryType: 'ADJUSTMENT',
          amount: reverseAmount,
          settlementId,
          description: `Anulowanie rozliczenia: ${reason}`,
          balanceAfter: roundPLN(currentBalance + reverseAmount),
        },
      })
    }

    // Update settlement status
    await tx.utilitySettlement.update({
      where: { id: settlementId },
      data: {
        status: 'VOIDED',
        voidedAt: new Date(),
        voidReason: reason,
      },
    })

    return { settlementId, status: 'VOIDED' }
  })
}

// ============================================
// Helpers
// ============================================

function formatPeriodLabel(start: Date, end: Date): string {
  const months = [
    'Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec',
    'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień',
  ]

  const startMonth = months[start.getMonth()]
  const endMonth = months[end.getMonth()]
  const startYear = start.getFullYear()
  const endYear = end.getFullYear()

  if (start.getMonth() === end.getMonth() && startYear === endYear) {
    return `${startMonth} ${startYear}`
  }

  if (startYear === endYear) {
    return `${startMonth} — ${endMonth} ${startYear}`
  }

  return `${startMonth} ${startYear} — ${endMonth} ${endYear}`
}