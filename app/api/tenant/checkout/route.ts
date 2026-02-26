// app/api/tenant/payments/checkout/route.ts
// POST — Creates a Stripe Checkout Session for tenant rent payment
// Uses Stripe Connect: funds go to owner's account, Flatro takes application_fee

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { paymentIds } = body as { paymentIds: string[] }

    if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
      return NextResponse.json(
        { error: 'paymentIds array is required' },
        { status: 400 }
      )
    }

    // ── Find tenant record ──────────────────────────────────────
    const tenant = await prisma.tenant.findFirst({
      where: { tenantUserId: authUser.id },
      select: { id: true, firstName: true, lastName: true, email: true },
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // ── Fetch all requested payments ────────────────────────────
    const payments = await prisma.payment.findMany({
      where: {
        id: { in: paymentIds },
        tenantId: tenant.id,
        status: { in: ['PENDING', 'OVERDUE'] },
      },
      include: {
        user: {
          select: {
            id: true,
            stripeAccountId: true,
            stripeOnboarded: true,
            regionCode: true,
          },
        },
      },
    })

    if (payments.length === 0) {
      return NextResponse.json(
        { error: 'No eligible payments found' },
        { status: 404 }
      )
    }

    // ── Validate all payments belong to the same owner ──────────
    const ownerIds = new Set(payments.map((p) => p.userId))
    if (ownerIds.size > 1) {
      return NextResponse.json(
        { error: 'All payments must belong to the same owner' },
        { status: 400 }
      )
    }

    const owner = payments[0].user
    if (!owner.stripeAccountId || !owner.stripeOnboarded) {
      return NextResponse.json(
        { error: 'Owner has not connected Stripe. Use manual payment.' },
        { status: 400 }
      )
    }

    // ── Calculate totals ────────────────────────────────────────
    const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)

    // Currency based on owner's region
    const currencyMap: Record<string, string> = {
      PL: 'pln',
      DE: 'eur',
      UA: 'uah',
      US: 'usd',
      GB: 'gbp',
    }
    const currency = currencyMap[owner.regionCode] ?? 'eur'

    // Convert to smallest currency unit (cents/groszy)
    const amountInSmallestUnit = Math.round(totalAmount * 100)

    // Application fee: 1 unit of currency (100 cents/groszy)
    // Multiply by number of payments for batch
    const applicationFee = 100 * payments.length

    // ── Build line items description ────────────────────────────
    const description =
      payments.length === 1
        ? `Płatność: ${payments[0].type} — ${payments[0].period ?? 'bieżący'}`
        : `${payments.length} płatności (${payments.map((p) => p.period ?? p.type).join(', ')})`

    // ── Metadata ────────────────────────────────────────────────
    const primaryPaymentId = payments[0].id
    const batchPaymentIds =
      payments.length > 1 ? payments.map((p) => p.id).join(',') : undefined

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    // ── Create Checkout Session ─────────────────────────────────
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: 'Flatro — opłata za wynajem',
              description,
            },
            unit_amount: amountInSmallestUnit,
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        application_fee_amount: applicationFee,
        transfer_data: {
          destination: owner.stripeAccountId,
        },
        metadata: {
          type: 'rent_payment',
          paymentId: primaryPaymentId,
          batchPaymentIds: batchPaymentIds ?? '',
          tenantId: tenant.id,
          ownerId: owner.id,
        },
      },
      metadata: {
        type: 'rent_payment',
        paymentId: primaryPaymentId,
        batchPaymentIds: batchPaymentIds ?? '',
        tenantId: tenant.id,
        ownerId: owner.id,
      },
      customer_email: tenant.email ?? authUser.email ?? undefined,
      success_url: `${baseUrl}/tenant/payments?success=1`,
      cancel_url: `${baseUrl}/tenant/payments?cancelled=1`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[tenant/payments/checkout] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    )
  }
}