// app/api/tenant/contracts/[id]/route.ts
// GET  — Tenant views contract detail (read-only)
// POST — Tenant signs the contract
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// GET — tenant views contract (read-only)
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

    // Find tenant profile linked to this user
    const tenantProfile = await prisma.tenant.findFirst({
      where: { tenantUserId: user.id },
      select: { id: true },
    })

    if (!tenantProfile) {
      return NextResponse.json({ error: 'No tenant profile' }, { status: 403 })
    }

    const contract = await prisma.contract.findFirst({
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
            changedAt: true,
            reason: true,
          },
          orderBy: { changedAt: 'desc' },
          take: 10,
        },
      },
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    return NextResponse.json(contract)
  } catch (error) {
    console.error('Error fetching tenant contract:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — tenant signs the contract
export async function POST(
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
    const { action } = body // "sign"

    if (action !== 'sign') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Find tenant profile
    const tenantProfile = await prisma.tenant.findFirst({
      where: { tenantUserId: user.id },
      select: { id: true },
    })

    if (!tenantProfile) {
      return NextResponse.json({ error: 'No tenant profile' }, { status: 403 })
    }

    // Find contract
    const contract = await prisma.contract.findFirst({
      where: {
        id,
        tenantId: tenantProfile.id,
      },
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Tenant can only sign if status is PENDING_SIGNATURE or DRAFT
    if (!['DRAFT', 'PENDING_SIGNATURE'].includes(contract.status)) {
      return NextResponse.json(
        { error: 'Contract cannot be signed in current status' },
        { status: 400 }
      )
    }

    // Already signed
    if (contract.signedByTenant) {
      return NextResponse.json(
        { error: 'Contract already signed by tenant' },
        { status: 400 }
      )
    }

    const now = new Date()

    // Determine if both parties signed → auto-transition to SIGNED
    const bothSigned = contract.signedByOwner // owner already signed + tenant signing now
    const newStatus = bothSigned ? 'SIGNED' : contract.status

    // Update contract
    const updated = await prisma.$transaction(async (tx) => {
      // Update contract
      const updatedContract = await tx.contract.update({
        where: { id },
        data: {
          signedByTenant: true,
          tenantSignedAt: now,
          ...(bothSigned
            ? {
                status: 'SIGNED',
                signedAt: now,
                statusUpdatedAt: now,
                statusUpdatedBy: user.id,
              }
            : {}),
        },
        include: {
          tenant: { select: { id: true, firstName: true, lastName: true } },
          property: { select: { id: true, name: true, address: true } },
        },
      })

      // Log status change if status transitioned
      if (bothSigned && contract.status !== 'SIGNED') {
        await tx.contractStatusHistory.create({
          data: {
            contractId: id,
            oldStatus: contract.status,
            newStatus: 'SIGNED',
            changedBy: user.id,
            reason: 'Tenant signed — both parties confirmed',
          },
        })
      }

      return updatedContract
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error signing contract:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}