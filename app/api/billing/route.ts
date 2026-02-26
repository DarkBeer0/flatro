// app/api/billing/route.ts
// Flatro V10 — Billing Documents API
// GET  /api/billing         — list documents for the authenticated owner
// POST /api/billing         — create a new billing document (DRAFT)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { allocateDocumentNumber } from '@/lib/billing/numbering'
import { DEFAULT_VAT_EXEMPT_REMARK } from '@/lib/billing/types'
import type {
  BillingLineItem,
  CreateBillingDocumentInput,
  NumberingCycle,
} from '@/lib/billing/types'
import { v4 as uuidv4 } from 'uuid'

// ─── GET /api/billing ─────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)

    const status   = searchParams.get('status')   // DRAFT|ISSUED|PAID|CANCELLED
    const type     = searchParams.get('type')     // FAKTURA_VAT|…
    const tenantId = searchParams.get('tenantId')
    const limit    = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset   = parseInt(searchParams.get('offset') || '0')

    const documents = await prisma.billingDocument.findMany({
      where: {
        ownerId: user.id,
        ...(status   && { status:   status   as any }),
        ...(type     && { type:     type     as any }),
        ...(tenantId && { tenantId }),
      },
      include: {
        tenant: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            property: {
              select: { name: true, address: true, city: true },
            },
          },
        },
      },
      orderBy: { issueDate: 'desc' },
      take: limit,
      skip: offset,
    })

    const total = await prisma.billingDocument.count({
      where: {
        ownerId: user.id,
        ...(status   && { status:   status   as any }),
        ...(type     && { type:     type     as any }),
        ...(tenantId && { tenantId }),
      },
    })

    return NextResponse.json({ documents, total, limit, offset })
  } catch (error) {
    console.error('[GET /api/billing]', error)
    return NextResponse.json({ error: 'Failed to fetch billing documents' }, { status: 500 })
  }
}

// ─── POST /api/billing ────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body: CreateBillingDocumentInput = await request.json()

    // ── Validate tenant belongs to this owner ─────────────
    const tenant = await prisma.tenant.findFirst({
      where: { id: body.tenantId, userId: user.id },
      include: {
        property: { select: { name: true, address: true, city: true, postalCode: true } },
      },
    })
    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // ── Validate contract (if provided) ───────────────────
    if (body.contractId) {
      const contract = await prisma.contract.findFirst({
        where: { id: body.contractId, tenantId: body.tenantId },
      })
      if (!contract) {
        return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
      }
    }

    // ── Fetch owner profile ────────────────────────────────
    const owner = await prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
        firstName: true,
        lastName: true,
        address: true,
        city: true,
        postalCode: true,
        nationalId: true,
        nationalIdType: true,
        iban: true,
        bankName: true,
        accountHolder: true,
      },
    })

    // ── Build line items with IDs ──────────────────────────
    const items: BillingLineItem[] = body.items.map((item) => ({
      ...item,
      id: uuidv4(),
    }))

    // ── Compute totals ────────────────────────────────────
    let totalNet   = 0
    let totalVat   = 0
    let totalGross = 0

    for (const item of items) {
      totalNet   += item.netAmount
      totalGross += item.grossAmount
      totalVat   += item.grossAmount - item.netAmount
    }

    // ── Allocate document number (atomic) ─────────────────
    const cycle: NumberingCycle = body.numberingCycle ?? 'MONTHLY'
    const issueDate = new Date(body.issueDate)
    const docNumber = await allocateDocumentNumber(
      prisma as any,
      user.id,
      body.type,
      issueDate,
      cycle,
    )

    // ── Build party snapshots (immutable at issue time) ───
    const ownerName = [owner.firstName, owner.lastName].filter(Boolean).join(' ')
    const ownerAddress = [owner.address, owner.postalCode, owner.city]
      .filter(Boolean)
      .join(', ')

    const tenantAddress = [
      tenant.registrationAddress || tenant.property?.address || '',
      tenant.property?.postalCode || '',
      tenant.property?.city || '',
    ]
      .filter(Boolean)
      .join(', ')

    const sellerSnapshot = {
      name: ownerName,
      address: ownerAddress,
      nip:   owner.nationalIdType === 'NIP'   ? owner.nationalId : undefined,
      pesel: owner.nationalIdType === 'PESEL' ? owner.nationalId : undefined,
      iban:  owner.iban          ?? undefined,
      bankName:      owner.bankName      ?? undefined,
      accountHolder: owner.accountHolder ?? undefined,
    }

    const buyerSnapshot = {
      name: `${tenant.firstName} ${tenant.lastName}`,
      address: tenantAddress,
      nip:   tenant.nationalIdType === 'NIP'   ? tenant.nationalId : undefined,
      pesel: tenant.nationalIdType === 'PESEL' ? tenant.nationalId : undefined,
    }

    // ── Auto-add VAT-exempt remark for FAKTURA_BEZ_VAT ───
    let remarks = body.remarks
    if (body.type === 'FAKTURA_BEZ_VAT' && !remarks) {
      remarks = DEFAULT_VAT_EXEMPT_REMARK
    }

    // ── Create document ───────────────────────────────────
    const document = await prisma.billingDocument.create({
      data: {
        ownerId:    user.id,
        tenantId:   body.tenantId,
        contractId: body.contractId ?? null,
        type:       body.type,
        number:     docNumber,
        issueDate:  new Date(body.issueDate),
        saleDate:   new Date(body.saleDate),
        dueDate:    new Date(body.dueDate),
        items:      items as any,
        totalNet:   Math.round(totalNet   * 100) / 100,
        totalVat:   Math.round(totalVat   * 100) / 100,
        totalGross: Math.round(totalGross * 100) / 100,
        status:     'DRAFT',
        remarks:    remarks ?? null,
        sellerSnapshot: sellerSnapshot as any,
        buyerSnapshot:  buyerSnapshot  as any,
      },
      include: {
        tenant: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            property: { select: { name: true, address: true, city: true } },
          },
        },
      },
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error('[POST /api/billing]', error)
    return NextResponse.json({ error: 'Failed to create billing document' }, { status: 500 })
  }
}