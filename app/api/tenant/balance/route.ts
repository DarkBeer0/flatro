// app/api/tenant/balance/route.ts
// Flatro — Tenant Balance ("My Balance" card)
//
// Returns current saldo, recent settlements, and payment status.
// PRIVACY: Only shows data for the authenticated tenant.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

// GET /api/tenant/balance
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find active tenant profile
    const tenant = await prisma.tenant.findFirst({
      where: { tenantUserId: user.id, isActive: true },
      select: {
        id: true,
        propertyId: true,
        firstName: true,
        lastName: true,
        property: {
          select: { id: true, name: true, address: true },
        },
      },
    })

    if (!tenant || !tenant.propertyId) {
      return NextResponse.json({ error: 'No active lease found' }, { status: 404 })
    }

    // Get current balance from last ledger entry
    const lastLedgerEntry = await prisma.tenantLedger.findFirst({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
      select: { balanceAfter: true, createdAt: true },
    })

    const balance = lastLedgerEntry?.balanceAfter ?? 0

    // Get recent settlement shares (last 6)
    const recentShares = await prisma.settlementShare.findMany({
      where: { tenantId: tenant.id },
      include: {
        settlement: {
          select: {
            id: true,
            periodStart: true,
            periodEnd: true,
            title: true,
            status: true,
            invoiceFileUrl: true,
            // Do NOT select: notes (owner internal), totalAmount (full property cost)
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    })

    // Get recent ledger entries (last 10)
    const recentLedger = await prisma.tenantLedger.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        entryType: true,
        amount: true,
        description: true,
        balanceAfter: true,
        createdAt: true,
      },
    })

    return NextResponse.json({
      tenant: {
        id: tenant.id,
        name: `${tenant.firstName} ${tenant.lastName}`,
      },
      property: tenant.property,
      balance: {
        amount: balance,
        // Positive = tenant owes, Negative = overpayment (credit)
        status: balance > 0 ? 'OWING' : balance < 0 ? 'CREDIT' : 'SETTLED',
        asOf: lastLedgerEntry?.createdAt || null,
      },
      settlements: recentShares
        .filter(s => s.settlement.status === 'FINALIZED')
        .map(share => ({
          id: share.id,
          settlementId: share.settlementId,
          period: {
            start: share.settlement.periodStart,
            end: share.settlement.periodEnd,
          },
          title: share.settlement.title,
          // Transparent: tenant sees the math for their share
          activeDays: share.activeDays,
          totalDays: share.totalDays,
          shareRatio: share.shareRatio,
          amount: share.finalAmount,
          advancesPaid: share.advancesPaid,
          balanceDue: share.balanceDue,
          isPaid: share.isPaid,
          hasInvoice: !!share.settlement.invoiceFileUrl,
          notes: share.notes, // Owner's note visible to tenant
          // NOT exposing: ownerNotes, other tenants' data, totalAmount
        })),
      ledger: recentLedger,
    })
  } catch (error) {
    console.error('Error fetching tenant balance:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}