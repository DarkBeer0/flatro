// app/api/payments/[id]/route.ts  (UPDATED)
// ============================================================
// KEY CHANGE: PUT now enforces edit restrictions based on status.
//
// Status-based edit rules:
//   PENDING    → Owner can edit everything (amount, type, period,
//                dueDate, notes, tenantId)
//   OVERDUE    → Same as PENDING — owner can still fix details
//   PENDING_CONFIRMATION (= tenant marked as paid)
//              → Amount, period, dueDate are LOCKED.
//                Owner may still update notes only.
//   PAID / REJECTED / CANCELLED
//              → Fully immutable. No edits allowed.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

// Statuses where a payment is fully editable by the owner
const FULLY_EDITABLE_STATUSES = ['PENDING', 'OVERDUE'] as const

// Statuses where only notes can be changed (tenant has already acted)
const NOTES_ONLY_STATUSES = ['PENDING_CONFIRMATION'] as const

// Statuses where nothing can be changed
const IMMUTABLE_STATUSES = ['PAID', 'REJECTED', 'CANCELLED'] as const

type PaymentStatus = typeof FULLY_EDITABLE_STATUSES[number]
  | typeof NOTES_ONLY_STATUSES[number]
  | typeof IMMUTABLE_STATUSES[number]

function isFullyEditable(status: string): boolean {
  return (FULLY_EDITABLE_STATUSES as readonly string[]).includes(status)
}

function isNotesOnlyEditable(status: string): boolean {
  return (NOTES_ONLY_STATUSES as readonly string[]).includes(status)
}

function isImmutable(status: string): boolean {
  return (IMMUTABLE_STATUSES as readonly string[]).includes(status)
}

// GET /api/payments/[id]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params

    const payment = await prisma.payment.findFirst({
      where: { id, userId: user.id },
      include: {
        tenant: { include: { property: true } },
      },
    })

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Attach edit capabilities so UI can reflect correct state
    const editability = getEditability(payment.status)
    return NextResponse.json({ ...payment, _editability: editability })
  } catch (error) {
    console.error('Error fetching payment:', error)
    return NextResponse.json({ error: 'Failed to fetch payment' }, { status: 500 })
  }
}

// PUT /api/payments/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.payment.findFirst({
      where: { id, userId: user.id },
      select: { id: true, status: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    const status = existing.status

    // ── Guard: fully immutable ─────────────────────────────
    if (isImmutable(status)) {
      return NextResponse.json(
        {
          error: `Payment with status "${status}" is immutable and cannot be edited.`,
          editability: getEditability(status),
        },
        { status: 409 }
      )
    }

    let updateData: Record<string, any>

    // ── Guard: tenant has already declared payment ─────────
    if (isNotesOnlyEditable(status)) {
      // Only notes can change; all financial/timing fields are locked
      if (
        body.amount   !== undefined ||
        body.period   !== undefined ||
        body.dueDate  !== undefined ||
        body.type     !== undefined ||
        body.tenantId !== undefined
      ) {
        return NextResponse.json(
          {
            error:
              'Payment amount, period, due date, type, and tenant cannot be edited ' +
              'after the tenant has marked it as paid. Only notes can be updated.',
            editability: getEditability(status),
          },
          { status: 409 }
        )
      }

      updateData = {
        notes: body.notes !== undefined ? body.notes : undefined,
      }
    } else {
      // ── Fully editable (PENDING / OVERDUE) ────────────────
      updateData = {
        tenantId: body.tenantId,
        amount:   body.amount   ? parseFloat(body.amount) : undefined,
        type:     body.type,
        dueDate:  body.dueDate  ? new Date(body.dueDate)  : undefined,
        paidDate: body.paidDate ? new Date(body.paidDate)  : null,
        period:   body.period,
        notes:    body.notes,
      }
    }

    // Strip undefined keys so Prisma doesn't overwrite with null
    const cleanData = Object.fromEntries(
      Object.entries(updateData).filter(([, v]) => v !== undefined)
    )

    if (Object.keys(cleanData).length === 0) {
      return NextResponse.json({ error: 'No updatable fields provided.' }, { status: 400 })
    }

    const payment = await prisma.payment.update({
      where: { id },
      data: cleanData,
    })

    return NextResponse.json(payment)
  } catch (error) {
    console.error('Error updating payment:', error)
    return NextResponse.json({ error: 'Failed to update payment' }, { status: 500 })
  }
}

// DELETE /api/payments/[id]
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params

    const existing = await prisma.payment.findFirst({
      where: { id, userId: user.id },
      select: { id: true, status: true },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 })
    }

    // Cannot delete confirmed payments — use CANCELLED status instead
    if (existing.status === 'PAID') {
      return NextResponse.json(
        { error: 'Confirmed payments cannot be deleted. Cancel them instead.' },
        { status: 409 }
      )
    }

    await prisma.payment.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting payment:', error)
    return NextResponse.json({ error: 'Failed to delete payment' }, { status: 500 })
  }
}

// ── Helpers ────────────────────────────────────────────────

interface Editability {
  canEditAmount:   boolean
  canEditPeriod:   boolean
  canEditDueDate:  boolean
  canEditType:     boolean
  canEditTenant:   boolean
  canEditNotes:    boolean
  canDelete:       boolean
  reason: string | null
}

function getEditability(status: string): Editability {
  if (isImmutable(status)) {
    return {
      canEditAmount:  false,
      canEditPeriod:  false,
      canEditDueDate: false,
      canEditType:    false,
      canEditTenant:  false,
      canEditNotes:   false,
      canDelete:      false,
      reason: status === 'PAID'
        ? 'Payment is confirmed and fully immutable.'
        : `Payment is ${status.toLowerCase()} and cannot be edited.`,
    }
  }

  if (isNotesOnlyEditable(status)) {
    return {
      canEditAmount:  false,
      canEditPeriod:  false,
      canEditDueDate: false,
      canEditType:    false,
      canEditTenant:  false,
      canEditNotes:   true,
      canDelete:      false,
      reason: 'Tenant has marked this payment as paid. Only notes can be edited.',
    }
  }

  // PENDING / OVERDUE — fully editable
  return {
    canEditAmount:  true,
    canEditPeriod:  true,
    canEditDueDate: true,
    canEditType:    true,
    canEditTenant:  true,
    canEditNotes:   true,
    canDelete:      true,
    reason:         null,
  }
}