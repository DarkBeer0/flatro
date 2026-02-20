// app/api/contracts/[id]/annexes/route.ts
// Flatro — V9: Contract Annexes CRUD (Owner only)
// POST creates draft annex; PATCH signs and applies mutation in one transaction

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { getNextAnnexNumber, applyAnnexToContract } from '@/lib/contracts/effective-contract'
import type {
  CreateAnnexInput,
  AnnexType,
  RentChangeData,
  ExtensionChangeData,
} from '@/lib/contracts/lifecycle-types'

// ──────────────────────────────────────────────────────────────
// GET /api/contracts/[id]/annexes
// ──────────────────────────────────────────────────────────────
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id: contractId } = await params

    const contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        property: { userId: user.id },
      },
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const annexes = await prisma.contractAnnex.findMany({
      where: { contractId },
      orderBy: { annexNumber: 'asc' },
      include: {
        contract: {
          select: {
            id: true,
            rentAmount: true,
            endDate: true,
            property: { select: { name: true, address: true, city: true } },
            tenant: { select: { firstName: true, lastName: true } },
          },
        },
      },
    })

    return NextResponse.json(annexes)
  } catch (error) {
    console.error('Error fetching annexes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ──────────────────────────────────────────────────────────────
// POST /api/contracts/[id]/annexes — Create DRAFT annex
// ──────────────────────────────────────────────────────────────
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id: contractId } = await params
    const body: CreateAnnexInput = await request.json()

    const { type, effectiveDate, changes, customText } = body

    // ─── Validation ───────────────────────────────────────
    if (!type || !['RENT_CHANGE', 'EXTENSION', 'OTHER'].includes(type)) {
      return NextResponse.json(
        { error: 'type must be RENT_CHANGE, EXTENSION, or OTHER' },
        { status: 400 }
      )
    }

    if (!effectiveDate) {
      return NextResponse.json(
        { error: 'effectiveDate is required' },
        { status: 400 }
      )
    }

    // ─── Verify contract ownership & status ───────────────
    const contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        property: { userId: user.id },
      },
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    if (!['ACTIVE', 'SIGNED'].includes(contract.status)) {
      return NextResponse.json(
        { error: 'Aneks można dodać tylko do aktywnej lub podpisanej umowy' },
        { status: 400 }
      )
    }

    // ─── Type-specific validation ─────────────────────────
    if (type === 'RENT_CHANGE') {
      const rentChanges = changes as unknown as RentChangeData
      if (!rentChanges.newRent || rentChanges.newRent <= 0) {
        return NextResponse.json(
          { error: 'newRent is required and must be positive' },
          { status: 400 }
        )
      }
    }

    if (type === 'EXTENSION') {
      const extensionChanges = changes as unknown as ExtensionChangeData
      if (!extensionChanges.newEndDate) {
        return NextResponse.json(
          { error: 'newEndDate is required for EXTENSION annex' },
          { status: 400 }
        )
      }
    }

    if (type === 'OTHER' && !customText?.trim()) {
      return NextResponse.json(
        { error: 'customText is required for OTHER annex type' },
        { status: 400 }
      )
    }

    // ─── Build changes with audit trail ───────────────────
    let auditChanges: Record<string, unknown> = {}

    switch (type) {
      case 'RENT_CHANGE':
        auditChanges = {
          previousRent: contract.rentAmount,
          newRent: (changes as unknown as RentChangeData).newRent,
        }
        break

      case 'EXTENSION':
        auditChanges = {
          previousEndDate: contract.endDate?.toISOString() ?? null,
          newEndDate: (changes as unknown as ExtensionChangeData).newEndDate,
        }
        break

      case 'OTHER':
        auditChanges = {}
        break
    }

    // ─── Transaction: Get next number + create annex ──────
    const annex = await prisma.$transaction(async (tx) => {
      const annexNumber = await getNextAnnexNumber(tx, contractId)

      return tx.contractAnnex.create({
        data: {
          contractId,
          annexNumber,
          type,
          status: 'DRAFT',
          effectiveDate: new Date(effectiveDate),
          changes: auditChanges as Prisma.InputJsonValue,
          customText: customText?.trim() || null,
        },
        include: {
          contract: {
            select: {
              id: true,
              rentAmount: true,
              endDate: true,
              property: { select: { name: true, address: true, city: true } },
              tenant: { select: { firstName: true, lastName: true } },
            },
          },
        },
      })
    })

    return NextResponse.json(annex, { status: 201 })
  } catch (error) {
    console.error('Error creating annex:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ──────────────────────────────────────────────────────────────
// PATCH /api/contracts/[id]/annexes — Sign annex (applies mutation)
// Body: { annexId: string, action: 'sign' }
// ──────────────────────────────────────────────────────────────
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser()
    const { id: contractId } = await params
    const { annexId, action } = await request.json()

    if (action !== 'sign') {
      return NextResponse.json({ error: 'Only action "sign" is supported' }, { status: 400 })
    }

    if (!annexId) {
      return NextResponse.json({ error: 'annexId is required' }, { status: 400 })
    }

    // ─── Verify ownership ─────────────────────────────────
    const contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        property: { userId: user.id },
      },
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // ─── Verify annex ─────────────────────────────────────
    const annex = await prisma.contractAnnex.findFirst({
      where: {
        id: annexId,
        contractId,
        status: 'DRAFT',
      },
    })

    if (!annex) {
      return NextResponse.json(
        { error: 'Aneks nie został znaleziony lub jest już podpisany' },
        { status: 404 }
      )
    }

    // ─── Transaction: Sign annex + apply mutation ─────────
    const updatedAnnex = await prisma.$transaction(async (tx) => {
      // 1. Mark annex as SIGNED
      const signed = await tx.contractAnnex.update({
        where: { id: annexId },
        data: {
          status: 'SIGNED',
          signedAt: new Date(),
        },
        include: {
          contract: {
            select: {
              id: true,
              rentAmount: true,
              endDate: true,
              property: { select: { name: true, address: true, city: true } },
              tenant: { select: { firstName: true, lastName: true } },
            },
          },
        },
      })

      // 2. Apply side-effects to the Contract
      await applyAnnexToContract(
        tx,
        contractId,
        annex.type as AnnexType,
        annex.changes as unknown as Record<string, unknown>
      )

      return signed
    })

    return NextResponse.json(updatedAnnex)
  } catch (error) {
    console.error('Error signing annex:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}