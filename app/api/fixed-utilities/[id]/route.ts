// app/api/fixed-utilities/[id]/route.ts
// Flatro — Update/Delete a fixed utility

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

// PUT /api/fixed-utilities/[id]
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params
    const body = await request.json()

    const existing = await prisma.fixedUtility.findFirst({
      where: { id, property: { userId: user.id } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Fixed utility not found' }, { status: 404 })
    }

    const updated = await prisma.fixedUtility.update({
      where: { id },
      data: {
        name: body.name !== undefined ? body.name : undefined,
        type: body.type || undefined,
        periodCost: body.periodCost !== undefined ? parseFloat(body.periodCost) : undefined,
        splitMethod: body.splitMethod || undefined,
        isPerPerson: body.isPerPerson !== undefined ? body.isPerPerson : undefined,
        isActive: body.isActive !== undefined ? body.isActive : undefined,
        notes: body.notes !== undefined ? body.notes : undefined,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating fixed utility:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/fixed-utilities/[id] — Soft delete (deactivate)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id } = await params

    const existing = await prisma.fixedUtility.findFirst({
      where: { id, property: { userId: user.id } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Fixed utility not found' }, { status: 404 })
    }

    // Soft delete: deactivate rather than hard delete (preserves settlement history)
    const updated = await prisma.fixedUtility.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error deactivating fixed utility:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}