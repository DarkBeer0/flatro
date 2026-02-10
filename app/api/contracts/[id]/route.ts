// app/api/contracts/[id]/route.ts
// REPLACE your existing file with this version
// Changes: status history logging, rollback support, owner signing, tenant access
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// Valid status transitions for owner (including rollback)
const OWNER_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PENDING_SIGNATURE', 'TERMINATED'],
  PENDING_SIGNATURE: ['DRAFT', 'SIGNED', 'TERMINATED'], // Can rollback to DRAFT
  SIGNED: ['ACTIVE', 'PENDING_SIGNATURE', 'TERMINATED'], // Can rollback to PENDING_SIGNATURE
  ACTIVE: ['SIGNED', 'TERMINATED', 'EXPIRED'], // Can rollback to SIGNED
  EXPIRED: ['ACTIVE'], // Can rollback to ACTIVE
  TERMINATED: ['DRAFT'], // Can rollback to DRAFT (re-open)
}

// GET — contract detail (owner OR tenant)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Try owner access first
    let contract = await prisma.contract.findFirst({
      where: {
        id,
        property: { userId: user.id },
      },
      include: {
        tenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            nationalId: true,
            nationalIdType: true,
            citizenship: true,
            registrationAddress: true,
          },
        },
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            postalCode: true,
            area: true,
          },
        },
        attachments: {
          select: {
            id: true,
            type: true,
            label: true,
            fileUrl: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        statusHistory: {
          select: {
            id: true,
            oldStatus: true,
            newStatus: true,
            changedBy: true,
            changedAt: true,
            reason: true,
          },
          orderBy: { changedAt: 'desc' },
          take: 20,
        },
      },
    })

    if (contract) {
      return NextResponse.json({ ...contract, _role: 'owner' })
    }

    // Try tenant access
    const tenantProfile = await prisma.tenant.findFirst({
      where: { tenantUserId: user.id },
      select: { id: true },
    })

    if (tenantProfile) {
      contract = await prisma.contract.findFirst({
        where: {
          id,
          tenantId: tenantProfile.id,
        },
        include: {
          tenant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              nationalId: true,
              nationalIdType: true,
              citizenship: true,
              registrationAddress: true,
            },
          },
          property: {
            select: {
              id: true,
              name: true,
              address: true,
              city: true,
              postalCode: true,
              area: true,
            },
          },
          attachments: {
            select: {
              id: true,
              type: true,
              label: true,
              fileUrl: true,
              fileName: true,
              fileSize: true,
              mimeType: true,
              createdAt: true,
            },
            orderBy: { createdAt: 'asc' },
          },
          statusHistory: {
            select: {
              id: true,
              oldStatus: true,
              newStatus: true,
              changedBy: true,
              changedAt: true,
              reason: true,
            },
            orderBy: { changedAt: 'desc' },
            take: 20,
          },
        },
      })

      if (contract) {
        return NextResponse.json({ ...contract, _role: 'tenant' })
      }
    }

    return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  } catch (error) {
    console.error('Error fetching contract:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT — update contract (owner only)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Verify ownership
    const existing = await prisma.contract.findFirst({
      where: { id, property: { userId: user.id } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const updateData: any = {}
    const now = new Date()

    // ---- STATUS CHANGE (with history + rollback support) ----
    if (body.status && body.status !== existing.status) {
      const allowedNext = OWNER_STATUS_TRANSITIONS[existing.status] || []
      if (!allowedNext.includes(body.status)) {
        return NextResponse.json(
          {
            error: `Cannot transition from ${existing.status} to ${body.status}. Allowed: ${allowedNext.join(', ')}`,
          },
          { status: 400 }
        )
      }

      updateData.status = body.status
      updateData.statusUpdatedAt = now
      updateData.statusUpdatedBy = user.id

      if (body.status === 'SIGNED') {
        updateData.signedAt = now
      }
    }

    // ---- OWNER SIGNING ----
    if (body.action === 'owner_sign') {
      if (existing.signedByOwner) {
        return NextResponse.json({ error: 'Already signed by owner' }, { status: 400 })
      }

      updateData.signedByOwner = true
      updateData.ownerSignedAt = now

      // If tenant also signed → auto-transition to SIGNED
      if (existing.signedByTenant) {
        updateData.status = 'SIGNED'
        updateData.signedAt = now
        updateData.statusUpdatedAt = now
        updateData.statusUpdatedBy = user.id
      }
    }

    // Dates
    if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null

    // Financial
    if (body.rentAmount !== undefined) updateData.rentAmount = parseFloat(body.rentAmount)
    if (body.adminFee !== undefined) updateData.adminFee = parseFloat(body.adminFee)
    if (body.utilitiesAdvance !== undefined) updateData.utilitiesAdvance = parseFloat(body.utilitiesAdvance)

    // Contract file
    if (body.contractFileUrl !== undefined) updateData.contractFileUrl = body.contractFileUrl

    // Notes
    if (body.notes !== undefined) updateData.notes = body.notes

    // V4: Legal fields
    if (body.noticePeriod !== undefined) updateData.noticePeriod = parseInt(body.noticePeriod) || 1
    if (body.additionalTerms !== undefined) updateData.additionalTerms = body.additionalTerms || null

    // Substitute property
    if (body.substituteAddress !== undefined) updateData.substituteAddress = body.substituteAddress
    if (body.substituteCity !== undefined) updateData.substituteCity = body.substituteCity
    if (body.substitutePostalCode !== undefined) updateData.substitutePostalCode = body.substitutePostalCode

    // Use transaction for status change + history logging
    const contract = await prisma.$transaction(async (tx) => {
      const updatedContract = await tx.contract.update({
        where: { id },
        data: updateData,
        include: {
          tenant: {
            select: { id: true, firstName: true, lastName: true },
          },
          property: {
            select: { id: true, name: true, address: true },
          },
          attachments: true,
          statusHistory: {
            orderBy: { changedAt: 'desc' },
            take: 20,
          },
        },
      })

      // Log status change in history
      if (body.status && body.status !== existing.status) {
        await tx.contractStatusHistory.create({
          data: {
            contractId: id,
            oldStatus: existing.status,
            newStatus: body.status,
            changedBy: user.id,
            reason: body.statusReason || null,
          },
        })
      }

      // Log auto-transition from owner signing
      if (
        body.action === 'owner_sign' &&
        existing.signedByTenant &&
        existing.status !== 'SIGNED'
      ) {
        await tx.contractStatusHistory.create({
          data: {
            contractId: id,
            oldStatus: existing.status,
            newStatus: 'SIGNED',
            changedBy: user.id,
            reason: 'Owner signed — both parties confirmed',
          },
        })
      }

      return updatedContract
    })

    return NextResponse.json(contract)
  } catch (error) {
    console.error('Error updating contract:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE — delete contract (owner only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const existing = await prisma.contract.findFirst({
      where: { id, property: { userId: user.id } },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    await prisma.contract.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contract:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}