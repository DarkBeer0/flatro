// app/api/settlements/calculate/route.ts
// Flatro — Dry-run settlement calculation (no DB writes)

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { calculateSettlement } from '@/lib/utilities/settlement-calculator'
import type { BillingApproach } from '@/lib/utilities/types'

// POST /api/settlements/calculate
// Body: { propertyId, periodStart, periodEnd, approach? }
// Returns: { preview: true, items, shares, totalAmount, warnings }
export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()

    const { propertyId, periodStart, periodEnd, approach = 'MONTHLY' } = body

    if (!propertyId || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: 'propertyId, periodStart, and periodEnd are required' },
        { status: 400 }
      )
    }

    // Validate property ownership
    const property = await prisma.property.findFirst({
      where: { id: propertyId, userId: user.id },
      select: { id: true, name: true },
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    const start = new Date(periodStart)
    const end = new Date(periodEnd)

    if (start >= end) {
      return NextResponse.json(
        { error: 'periodStart must be before periodEnd' },
        { status: 400 }
      )
    }

    const result = await calculateSettlement({
      propertyId,
      periodStart: start,
      periodEnd: end,
      approach: approach as BillingApproach,
    })

    // Enrich shares with tenant names for preview
    const enrichedShares = await Promise.all(
      result.shares.map(async (share) => {
        const tenant = await prisma.tenant.findUnique({
          where: { id: share.tenantId },
          select: { id: true, firstName: true, lastName: true },
        })
        return {
          ...share,
          tenantName: tenant ? `${tenant.firstName} ${tenant.lastName}` : 'Unknown',
        }
      })
    )

    return NextResponse.json({
      preview: true,
      property: property.name,
      period: { start: start.toISOString(), end: end.toISOString() },
      approach,
      items: result.items,
      shares: enrichedShares,
      totalAmount: result.totalAmount,
      warnings: result.warnings,
    })
  } catch (error) {
    console.error('Error calculating settlement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}