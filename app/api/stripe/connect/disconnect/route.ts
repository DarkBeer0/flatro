// app/api/stripe/connect/disconnect/route.ts
// POST — Disconnects (deauthorizes) the owner's Stripe Connect account

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        stripeAccountId: true,
        stripeOnboarded: true,
      },
    })

    if (!dbUser?.stripeAccountId) {
      return NextResponse.json(
        { error: 'No Stripe account connected' },
        { status: 400 }
      )
    }

    // Delete the Express account from Stripe
    // This revokes Flatro's access; the account owner retains their own Stripe account
    try {
      await stripe.accounts.del(dbUser.stripeAccountId)
    } catch (stripeError: any) {
      // If the account was already deleted on Stripe's side, continue cleanup
      if (stripeError.code !== 'resource_missing') {
        throw stripeError
      }
      console.warn(
        '[stripe/connect/disconnect] Account already deleted on Stripe:',
        dbUser.stripeAccountId
      )
    }

    // Clear local records
    await prisma.user.update({
      where: { id: user.id },
      data: {
        stripeAccountId: null,
        stripeOnboarded: false,
      },
    })

    return NextResponse.json({ disconnected: true })
  } catch (error) {
    console.error('[stripe/connect/disconnect] Error:', error)
    return NextResponse.json(
      { error: 'Failed to disconnect Stripe account' },
      { status: 500 }
    )
  }
}