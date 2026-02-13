// app/api/tenant/settlements/[id]/route.ts
// Flatro — Tenant views their settlement share detail
//
// PRIVACY: Only returns the authenticated tenant's share.
// Does NOT expose other tenants' data or owner-internal notes.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/tenant/settlements/[id]
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

    const { id: shareId } = await params

    // Find tenant profile
    const tenant = await prisma.tenant.findFirst({
      where: { tenantUserId: user.id },
      select: { id: true },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'No tenant profile' }, { status: 403 })
    }

    // Load the share — must belong to this tenant
    const share = await prisma.settlementShare.findFirst({
      where: {
        id: shareId,
        tenantId: tenant.id,
        settlement: { status: 'FINALIZED' },
      },
      include: {
        settlement: {
          select: {
            id: true,
            periodStart: true,
            periodEnd: true,
            title: true,
            approach: true,
            invoiceFileUrl: true,
            // Settlement items — tenant can see line items (what they're paying for)
            items: {
              select: {
                id: true,
                utilityLabel: true,
                unitLabel: true,
                consumption: true,
                snapshotRate: true,
                periodCost: true,
                totalCost: true,
              },
            },
          },
        },
      },
    })

    if (!share) {
      return NextResponse.json({ error: 'Settlement not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: share.id,
      settlement: {
        id: share.settlement.id,
        title: share.settlement.title,
        period: {
          start: share.settlement.periodStart,
          end: share.settlement.periodEnd,
        },
        approach: share.settlement.approach,
        hasInvoice: !!share.settlement.invoiceFileUrl,
        invoiceUrl: share.settlement.invoiceFileUrl,
      },
      // Line items (what the total cost consists of)
      items: share.settlement.items,
      // Tenant's specific share
      share: {
        activeDays: share.activeDays,
        totalDays: share.totalDays,
        shareRatio: share.shareRatio,
        calculatedAmount: share.calculatedAmount,
        adjustedAmount: share.adjustedAmount,
        finalAmount: share.finalAmount,
        advancesPaid: share.advancesPaid,
        balanceDue: share.balanceDue,
        isPaid: share.isPaid,
        paidAt: share.paidAt,
        notes: share.notes,
        // NOT exposing: ownerNotes
      },
    })
  } catch (error) {
    console.error('Error fetching tenant settlement:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/tenant/settlements/[id] — Mark as paid
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

    const { id: shareId } = await params
    const body = await request.json()
    const { action } = body

    if (action !== 'mark_paid') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Find tenant profile
    const tenant = await prisma.tenant.findFirst({
      where: { tenantUserId: user.id },
      select: { id: true, propertyId: true },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'No tenant profile' }, { status: 403 })
    }

    // Find share
    const share = await prisma.settlementShare.findFirst({
      where: {
        id: shareId,
        tenantId: tenant.id,
        isPaid: false,
        settlement: { status: 'FINALIZED' },
      },
    })

    if (!share) {
      return NextResponse.json(
        { error: 'Share not found or already paid' },
        { status: 404 }
      )
    }

    const now = new Date()

    // Update share + create ledger payment entry
    const result = await prisma.$transaction(async (tx) => {
      // Mark share as paid
      const updatedShare = await tx.settlementShare.update({
        where: { id: shareId },
        data: { isPaid: true, paidAt: now },
      })

      // Create PAYMENT ledger entry
      const lastEntry = await tx.tenantLedger.findFirst({
        where: { tenantId: tenant.id, propertyId: tenant.propertyId! },
        orderBy: { createdAt: 'desc' },
        select: { balanceAfter: true },
      })

      const currentBalance = lastEntry?.balanceAfter ?? 0
      const paymentAmount = share.finalAmount

      await tx.tenantLedger.create({
        data: {
          tenantId: tenant.id,
          propertyId: tenant.propertyId!,
          entryType: 'PAYMENT',
          amount: -paymentAmount, // negative = reduces balance
          settlementId: share.settlementId,
          description: `Opłata za media — potwierdzenie najemcy`,
          balanceAfter: Math.round((currentBalance - paymentAmount) * 100) / 100,
        },
      })

      return updatedShare
    })

    return NextResponse.json({
      success: true,
      shareId: result.id,
      isPaid: result.isPaid,
      paidAt: result.paidAt,
    })
  } catch (error) {
    console.error('Error marking settlement as paid:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}