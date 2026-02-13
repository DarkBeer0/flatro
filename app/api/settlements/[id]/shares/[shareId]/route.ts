// app/api/settlements/[id]/shares/[shareId]/route.ts
// Flatro — Adjust tenant share (Owner only, DRAFT status only)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

// PUT /api/settlements/[id]/shares/[shareId]
// Body: { adjustedAmount?: number, notes?: string, ownerNotes?: string }
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; shareId: string }> }
) {
  try {
    const user = await requireUser()
    const { id: settlementId, shareId } = await params
    const body = await request.json()

    // Validate: settlement must be DRAFT and belong to owner
    const settlement = await prisma.utilitySettlement.findFirst({
      where: {
        id: settlementId,
        property: { userId: user.id },
        status: 'DRAFT',
      },
    })

    if (!settlement) {
      return NextResponse.json(
        { error: 'Settlement not found or not in DRAFT status' },
        { status: 404 }
      )
    }

    // Validate: share belongs to this settlement
    const share = await prisma.settlementShare.findFirst({
      where: { id: shareId, settlementId },
    })

    if (!share) {
      return NextResponse.json(
        { error: 'Share not found in this settlement' },
        { status: 404 }
      )
    }

    // Update share
    const updated = await prisma.settlementShare.update({
      where: { id: shareId },
      data: {
        adjustedAmount: body.adjustedAmount !== undefined
          ? parseFloat(body.adjustedAmount)
          : undefined,
        finalAmount: body.adjustedAmount !== undefined
          ? parseFloat(body.adjustedAmount)
          : share.calculatedAmount,
        notes: body.notes !== undefined ? body.notes : undefined,
        ownerNotes: body.ownerNotes !== undefined ? body.ownerNotes : undefined,
      },
      include: {
        tenant: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error adjusting share:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}