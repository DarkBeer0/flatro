// app/api/stripe/connect/onboard/route.ts
// POST — Creates a Stripe Connect Express account and returns onboarding URL

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()

    if (!user.isOwner) {
      return NextResponse.json(
        { error: 'Only property owners can connect Stripe' },
        { status: 403 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        stripeAccountId: true,
        stripeOnboarded: true,
      },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // If already fully onboarded, just return status
    if (dbUser.stripeOnboarded && dbUser.stripeAccountId) {
      return NextResponse.json({
        alreadyOnboarded: true,
        message: 'Stripe account is already connected',
      })
    }

    let accountId = dbUser.stripeAccountId

    // Create a new Express account if none exists
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: dbUser.email,
        metadata: {
          flatroUserId: dbUser.id,
        },
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          product_description: 'Property rental payments via Flatro',
        },
      })

      accountId = account.id

      await prisma.user.update({
        where: { id: user.id },
        data: { stripeAccountId: accountId },
      })
    }

    // Create an Account Link for onboarding (or re-onboarding)
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}/settings?tab=stripe&refresh=1`,
      return_url: `${baseUrl}/settings?tab=stripe&onboarded=1`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (error) {
    console.error('[stripe/connect/onboard] Error:', error)
    return NextResponse.json(
      { error: 'Failed to create Stripe Connect onboarding' },
      { status: 500 }
    )
  }
}