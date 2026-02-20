// lib/contracts/effective-contract.ts
// Flatro — V9: "Effective Date" Architecture Pattern
//
// ═══════════════════════════════════════════════════════════════
// ARCHITECTURAL DECISION: Direct Mutation on SIGN
// ═══════════════════════════════════════════════════════════════
//
// For this MVP, we use a HYBRID approach:
//
// 1. When an Annex status changes to SIGNED → we DIRECTLY mutate
//    the Contract table fields (rentAmount, endDate) in the same
//    Prisma transaction. This keeps queries simple — every read of
//    Contract.rentAmount always returns the "current" value.
//
// 2. The Annex.changes JSONB field stores the AUDIT TRAIL
//    (previousRent → newRent), so we never lose historical data.
//
// WHY NOT a cron job or getter function?
// - Cron: adds ops complexity for MVP, race conditions with reads
//   between cron runs, and requires infrastructure (Vercel Cron,
//   pg_cron, etc.).
// - Getter (getCurrentRent): forces every consumer to call a
//   helper instead of reading the field, easy to forget, and
//   complicates PDF generation / reports that need "current" values.
//
// FUTURE: If we need scheduled future annexes (effectiveDate > now),
// we can add a status PENDING and a lightweight daily cron that
// activates them. For now, SIGNED = immediately effective.
// ═══════════════════════════════════════════════════════════════

import { prisma } from '@/lib/prisma'
import type { AnnexType, RentChangeData, ExtensionChangeData } from './lifecycle-types'

/**
 * Apply annex mutations to the parent contract.
 * Called inside a Prisma transaction when annex status → SIGNED.
 */
export async function applyAnnexToContract(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  contractId: string,
  annexType: AnnexType,
  changes: Record<string, unknown>,
) {
  switch (annexType) {
    case 'RENT_CHANGE': {
      const { newRent } = changes as unknown as RentChangeData
      await tx.contract.update({
        where: { id: contractId },
        data: { rentAmount: newRent },
      })
      break
    }

    case 'EXTENSION': {
      const { newEndDate } = changes as unknown as ExtensionChangeData
      await tx.contract.update({
        where: { id: contractId },
        data: {
          endDate: newEndDate ? new Date(newEndDate) : null,
        },
      })
      break
    }

    case 'OTHER':
      // OTHER annexes don't mutate contract fields.
      // They're text-only clauses appended to the contract.
      break
  }
}

/**
 * Get the next sequential annex number for a contract.
 */
export async function getNextAnnexNumber(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  contractId: string,
): Promise<number> {
  const lastAnnex = await tx.contractAnnex.findFirst({
    where: { contractId },
    orderBy: { annexNumber: 'desc' },
    select: { annexNumber: true },
  })
  return (lastAnnex?.annexNumber ?? 0) + 1
}

/**
 * Get all pending annexes for a contract (not yet signed).
 */
export async function getPendingAnnexes(contractId: string) {
  return prisma.contractAnnex.findMany({
    where: {
      contractId,
      status: 'DRAFT',
    },
    orderBy: { effectiveDate: 'asc' },
  })
}

/**
 * Get effective rent considering future annexes (for display only).
 * Shows upcoming changes even before they're signed.
 */
export async function getUpcomingChanges(contractId: string) {
  const now = new Date()

  const upcomingAnnexes = await prisma.contractAnnex.findMany({
    where: {
      contractId,
      status: 'DRAFT',
      effectiveDate: { gte: now },
    },
    orderBy: { effectiveDate: 'asc' },
  })

  return upcomingAnnexes.map((annex) => ({
    id: annex.id,
    type: annex.type,
    effectiveDate: annex.effectiveDate,
    changes: annex.changes as unknown as Record<string, unknown>,
    annexNumber: annex.annexNumber,
  }))
}