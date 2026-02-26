// app/api/stripe/connect/status/route.ts
// GET — Returns current Stripe Connect status for the owner

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function GET() {
  try {
    const user = await requireUser()

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        stripeAccountId: true,
        stripeOnboarded: true,
      },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // No Stripe account at all
    if (!dbUser.stripeAccountId) {
      return NextResponse.json({
        connected: false,
        onboarded: false,
        chargesEnabled: false,
        payoutsEnabled: false,
        accountId: null,
      })
    }

    // Fetch live status from Stripe
    const account = await stripe.accounts.retrieve(dbUser.stripeAccountId)

    const chargesEnabled = account.charges_enabled ?? false
    const payoutsEnabled = account.payouts_enabled ?? false

    // Sync onboarded status if Stripe says charges are enabled
    // but our DB hasn't been updated yet (webhook might be delayed)
    if (chargesEnabled && !dbUser.stripeOnboarded) {
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeOnboarded: true },
      })
    }

    return NextResponse.json({
      connected: true,
      onboarded: chargesEnabled,
      chargesEnabled,
      payoutsEnabled,
      accountId: dbUser.stripeAccountId,
      detailsSubmitted: account.details_submitted ?? false,
    })
  } catch (error) {
    console.error('[stripe/connect/status] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch Stripe Connect status' },
      { status: 500 }
    )
  }
}