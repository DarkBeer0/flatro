// app/api/billing/[id]/route.ts
// Flatro V10 — Billing Document Detail
// GET    /api/billing/:id — fetch document
// PATCH  /api/billing/:id — update DRAFT, or change status (issue/pay/cancel)
// DELETE /api/billing/:id — delete DRAFT only

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import type { UpdateBillingDocumentInput, BillingLineItem } from '@/lib/billing/types'
import { v4 as uuidv4 } from 'uuid'

type RouteContext = { params: Promise<{ id: string }> }

// ─── GET /api/billing/:id ────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser()
    const { id } = await params

    const document = await prisma.billingDocument.findFirst({
      where: { id, ownerId: user.id },
      include: {
        tenant: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            nationalId: true,
            nationalIdType: true,
            property: {
              select: { name: true, address: true, city: true, postalCode: true },
            },
          },
        },
        contract: {
          select: {
            id: true,
            rentAmount: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error('[GET /api/billing/:id]', error)
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 })
  }
}

// ─── PATCH /api/billing/:id ──────────────────────────────────

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.billingDocument.findFirst({
      where: { id, ownerId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // ── Status transitions ─────────────────────────────────
    if (body.action) {
      return handleStatusAction(id, existing.status, body.action)
    }

    // ── Edit guard — only DRAFTs can be edited ─────────────
    if (existing.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only DRAFT documents can be edited. Issue the document first.' },
        { status: 409 }
      )
    }

    // ── Compute new totals if items changed ────────────────
    let updateData: any = {}

    if (body.issueDate) updateData.issueDate = new Date(body.issueDate)
    if (body.saleDate)  updateData.saleDate  = new Date(body.saleDate)
    if (body.dueDate)   updateData.dueDate   = new Date(body.dueDate)
    if (body.remarks !== undefined) updateData.remarks = body.remarks

    if (body.items) {
      const items: BillingLineItem[] = (body.items as Omit<BillingLineItem, 'id'>[]).map(
        (item) => ({ ...item, id: uuidv4() })
      )
      let totalNet = 0, totalVat = 0, totalGross = 0
      for (const item of items) {
        totalNet   += item.netAmount
        totalGross += item.grossAmount
        totalVat   += item.grossAmount - item.netAmount
      }
      updateData.items      = items as any
      updateData.totalNet   = Math.round(totalNet   * 100) / 100
      updateData.totalVat   = Math.round(totalVat   * 100) / 100
      updateData.totalGross = Math.round(totalGross * 100) / 100
    }

    const updated = await prisma.billingDocument.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/billing/:id]', error)
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
  }
}

// ─── DELETE /api/billing/:id ─────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    const user = await requireUser()
    const { id } = await params

    const existing = await prisma.billingDocument.findFirst({
      where: { id, ownerId: user.id },
    })
    if (!existing) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (existing.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only DRAFT documents can be deleted. Cancel it first.' },
        { status: 409 }
      )
    }

    await prisma.billingDocument.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/billing/:id]', error)
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
  }
}

// ─── Status-transition helper ────────────────────────────────

const VALID_TRANSITIONS: Record<string, Record<string, string>> = {
  DRAFT:     { issue: 'ISSUED' },
  ISSUED:    { pay: 'PAID', cancel: 'CANCELLED' },
  PAID:      { cancel: 'CANCELLED' },
  CANCELLED: {},
}

async function handleStatusAction(
  id: string,
  currentStatus: string,
  action: string
): Promise<NextResponse> {
  const nextStatus = VALID_TRANSITIONS[currentStatus]?.[action]

  if (!nextStatus) {
    return NextResponse.json(
      {
        error: `Cannot perform action "${action}" on a document with status "${currentStatus}".`,
        validActions: Object.keys(VALID_TRANSITIONS[currentStatus] ?? {}),
      },
      { status: 409 }
    )
  }

  const timestamps: Record<string, Date> = {}
  if (nextStatus === 'ISSUED')    timestamps.issuedAt    = new Date()
  if (nextStatus === 'PAID')      timestamps.paidAt      = new Date()
  if (nextStatus === 'CANCELLED') timestamps.cancelledAt = new Date()

  const updated = await prisma.billingDocument.update({
    where: { id },
    data: { status: nextStatus as any, ...timestamps },
  })

  return NextResponse.json(updated)
}