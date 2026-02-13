// app/api/settlements/[id]/route.ts
// Flatro — Settlement detail, update, delete (Owner only)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

// GET /api/settlements/[id] — Full settlement details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params

    const settlement = await prisma.utilitySettlement.findFirst({
      where: { id, property: { userId: user.id } },
      include: {
        property: { select: { id: true, name: true, address: true } },
        items: {
          include: {
            meter: { select: { id: true, type: true, meterNumber: true } },
            fixedUtility: { select: { id: true, type: true, name: true } },
          },
        },
        shares: {
          include: {
            tenant: {
              select: { id: true, firstName: true, lastName: true, email: true },
            },
          },
        },
      },
    })

    if (!settlement) {
      return NextResponse.json({ error: 'Settlement not found' }, { status: 404 })
    }

    return NextResponse.json(settlement)
  } catch (error) {
    console.error('Error fetching settlement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/settlements/[id] — Update DRAFT settlement
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = await request.json()

    // Only DRAFT settlements can be updated
    const existing = await prisma.utilitySettlement.findFirst({
      where: { id, property: { userId: user.id }, status: 'DRAFT' },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Settlement not found or not in DRAFT status' },
        { status: 404 }
      )
    }

    const updated = await prisma.utilitySettlement.update({
      where: { id },
      data: {
        title: body.title !== undefined ? body.title : undefined,
        approach: body.approach || undefined,
        invoiceNumber: body.invoiceNumber !== undefined ? body.invoiceNumber : undefined,
        invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : undefined,
        invoiceFileUrl: body.invoiceFileUrl !== undefined ? body.invoiceFileUrl : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating settlement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/settlements/[id] — Delete DRAFT settlement
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params

    const existing = await prisma.utilitySettlement.findFirst({
      where: { id, property: { userId: user.id }, status: 'DRAFT' },
    })

    if (!existing) {
      return NextResponse.json(
        { error: 'Settlement not found or not in DRAFT status (finalized settlements cannot be deleted, only voided)' },
        { status: 404 }
      )
    }

    await prisma.utilitySettlement.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting settlement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}