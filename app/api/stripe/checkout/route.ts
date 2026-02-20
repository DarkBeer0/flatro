// app/api/stripe/checkout/route.ts
// POST — Creates a Stripe Checkout session for plan upgrade

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { PLANS, type SubscriptionPlan } from '@/lib/subscription'

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()
    const body = await request.json()

    const { plan, interval = 'monthly' } = body as {
      plan: SubscriptionPlan
      interval?: 'monthly' | 'yearly'
    }

    if (!plan || !PLANS[plan]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }
    if (plan === 'FREE') {
      return NextResponse.json({ error: 'Cannot checkout free plan' }, { status: 400 })
    }

    const planConfig = PLANS[plan]
    const priceId =
      interval === 'yearly'
        ? planConfig.stripePriceIdYearly
        : planConfig.stripePriceIdMonthly

    if (!priceId) {
      return NextResponse.json(
        { error: `Stripe price not configured for ${plan} ${interval}` },
        { status: 500 }
      )
    }

    // ── Get or create Stripe customer ─────────────────────────────
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        stripeCustomerId: true,
        subscriptionPlan: true,
      },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let customerId = dbUser.stripeCustomerId

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: dbUser.email,
        name:
          [dbUser.firstName, dbUser.lastName].filter(Boolean).join(' ') ||
          dbUser.email,
        metadata: { flatroUserId: dbUser.id },
      })
      customerId = customer.id

      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customerId },
      })
    }

    // ── Create Checkout session ───────────────────────────────────
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${baseUrl}/settings?tab=billing&upgraded=1`,
      cancel_url: `${baseUrl}/settings?tab=billing`,
      subscription_data: {
        metadata: {
          flatroUserId: user.id,
          plan,
          interval,
        },
      },
      metadata: {
        flatroUserId: user.id,
        plan,
        interval,
      },
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[stripe/checkout] Error:', error)
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
  }
}