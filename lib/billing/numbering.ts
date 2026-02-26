// lib/billing/numbering.ts
// Flatro V10 — Document auto-numbering with Prisma transactions
// Ensures no duplicate numbers even under concurrent requests.

import { PrismaClient } from '@prisma/client'
import type { BillingDocumentType, NumberingCycle } from './types'
import { DOCUMENT_TYPE_PREFIX } from './types'

/**
 * Allocate the next sequence number for a billing document in a
 * serialised Prisma transaction.  Uses SELECT ... FOR UPDATE semantics
 * via Prisma's `$transaction` + `upsert` pattern on the DocumentSequence
 * table to prevent phantom duplicates.
 *
 * Number formats
 *   MONTHLY: {PREFIX}/{YEAR}/{MM}/{SEQ:03}    e.g. FV/2026/05/001
 *   YEARLY:  {PREFIX}/{YEAR}/{SEQ:03}         e.g. R/2026/001
 *
 * @returns The formatted document number (e.g. "FV/2026/05/001")
 */
export async function allocateDocumentNumber(
  prisma: PrismaClient,
  ownerId: string,
  docType: BillingDocumentType,
  issueDate: Date,
  cycle: NumberingCycle = 'MONTHLY'
): Promise<string> {
  const year  = issueDate.getFullYear()
  const month = cycle === 'MONTHLY' ? issueDate.getMonth() + 1 : null

  // We use executeRawUnsafe / $transaction to get row-level locking.
  // Prisma's upsert is NOT atomic enough on its own for high-concurrency,
  // so we use a raw CTE that atomically increments and returns the new seq.
  const result = await prisma.$transaction(async (tx) => {
    // Upsert + atomic increment in one statement
    // Using standard SQL UPSERT with RETURNING
    const rows = await tx.$queryRaw<{ last_seq: number }[]>`
      INSERT INTO document_sequences (id, owner_id, doc_type, cycle, year, month, last_seq)
      VALUES (
        gen_random_uuid()::text,
        ${ownerId},
        ${docType}::"BillingDocumentType",
        ${cycle}::"NumberingCycle",
        ${year},
        ${month},
        1
      )
      ON CONFLICT (owner_id, doc_type, year, month)
      DO UPDATE SET last_seq = document_sequences.last_seq + 1
      RETURNING last_seq
    `

    if (!rows || rows.length === 0) {
      throw new Error('Failed to allocate document sequence')
    }

    return rows[0].last_seq
  })

  return formatDocumentNumber(docType, year, month, result)
}

/**
 * Format a human-readable document number.
 */
export function formatDocumentNumber(
  docType: BillingDocumentType,
  year: number,
  month: number | null,
  seq: number
): string {
  const prefix = DOCUMENT_TYPE_PREFIX[docType]
  const seqPadded = String(seq).padStart(3, '0')

  if (month !== null) {
    const monthPadded = String(month).padStart(2, '0')
    return `${prefix}/${year}/${monthPadded}/${seqPadded}`
  }

  return `${prefix}/${year}/${seqPadded}`
}

/**
 * Preview what the NEXT number would be without reserving it.
 * Useful for UI "preview" before the user confirms.
 */
export async function previewNextDocumentNumber(
  prisma: PrismaClient,
  ownerId: string,
  docType: BillingDocumentType,
  issueDate: Date,
  cycle: NumberingCycle = 'MONTHLY'
): Promise<string> {
  const year  = issueDate.getFullYear()
  const month = cycle === 'MONTHLY' ? issueDate.getMonth() + 1 : null

  const existing = await prisma.documentSequence.findUnique({
    where: {
      ownerId_docType_year_month: {
        ownerId,
        docType,
        year,
        month: month ?? 0, // Prisma requires a value; we use 0 for null (yearly)
      },
    },
  })

  const nextSeq = (existing?.lastSeq ?? 0) + 1
  return formatDocumentNumber(docType, year, month, nextSeq)
}