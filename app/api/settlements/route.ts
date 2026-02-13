// app/api/settlements/route.ts
// Flatro — Settlements CRUD (Owner only)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { roundPLN } from '@/lib/utilities/smart-split'

// GET /api/settlements?propertyId=...&status=...
export async function GET(request: NextRequest) {
  try {
    const user = await requireUser()
    const { searchParams } = new URL(request.url)
    const propertyId = searchParams.get('propertyId')
    const status = searchParams.get('status')

    const settlements = await prisma.utilitySettlement.findMany({
      where: {
        property: { userId: user.id },
        ...(propertyId && { propertyId }),
        ...(status && { status: status as any }),
      },
      include: {
        property: { select: { id: true, name: true } },
        items: {
          select: {
            id: true,
            utilityLabel: true,
            totalCost: true,
          },
        },
        shares: {
          select: {
            id: true,
            tenantId: true,
            finalAmount: true,
            isPaid: true,
          },
        },
        _count: { select: { items: true, shares: true } },
      },
      orderBy: { periodStart: 'desc' },
    })

    return NextResponse.json(settlements)
  } catch (error) {
    console.error('Error fetching settlements:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/settlements — Create a DRAFT settlement with calculated items & shares
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()

    const {
      propertyId,
      periodStart,
      periodEnd,
      title,
      approach = 'MONTHLY',
      invoiceNumber,
      invoiceDate,
      invoiceFileUrl,
      notes,
      items,   // CalculatedItem[] from /calculate dry-run
      shares,  // SplitResult[] from /calculate dry-run
    } = body

    // Validate property ownership
    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId: user.id },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    if (!items || !shares || items.length === 0) {
      return NextResponse.json(
        { error: 'Items and shares are required. Run /calculate first.' },
        { status: 400 }
      )
    }

    // Calculate total
    const totalAmount = roundPLN(
      items.reduce((sum: number, item: any) => sum + item.totalCost, 0)
    )

    // Create settlement with items and shares in one transaction
    const settlement = await prisma.$transaction(async (tx) => {
      // 1. Create settlement header
      const header = await tx.utilitySettlement.create({
        data: {
          propertyId,
          createdById: user.id,
          periodStart: new Date(periodStart),
          periodEnd: new Date(periodEnd),
          title: title || null,
          approach,
          totalAmount,
          invoiceNumber: invoiceNumber || null,
          invoiceDate: invoiceDate ? new Date(invoiceDate) : null,
          invoiceFileUrl: invoiceFileUrl || null,
          status: 'DRAFT',
          notes: notes || null,
        },
      })

      // 2. Create settlement items (line items with rate snapshots)
      for (const item of items) {
        await tx.settlementItem.create({
          data: {
            settlementId: header.id,
            meterId: item.meterId || null,
            fixedUtilityId: item.fixedUtilityId || null,
            utilityLabel: item.label,
            unitLabel: item.unit || null,
            prevReading: item.prevReading ?? null,
            currReading: item.currReading ?? null,
            consumption: item.consumption ?? null,
            snapshotRate: item.rate ?? null,
            periodCost: item.periodCost ?? null,
            totalCost: item.totalCost,
            splitMethod: item.splitMethod || 'BY_DAYS',
          },
        })
      }

      // 3. Create settlement shares (tenant portions)
      for (const share of shares) {
        await tx.settlementShare.create({
          data: {
            settlementId: header.id,
            tenantId: share.tenantId,
            activeDays: share.activeDays,
            totalDays: share.totalDays,
            shareRatio: share.shareRatio,
            calculatedAmount: share.amount,
            finalAmount: share.amount, // owner can adjust later
            advancesPaid: (share as any).advancesPaid || 0,
            balanceDue: (share as any).balanceDue || share.amount,
          },
        })
      }

      return header
    })

    // Return full settlement with relations
    const result = await prisma.utilitySettlement.findUnique({
      where: { id: settlement.id },
      include: {
        items: true,
        shares: {
          include: {
            tenant: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error creating settlement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}