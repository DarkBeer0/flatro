// app/api/stripe/portal/route.ts
// POST — Creates a Stripe Customer Portal session for billing management

import { NextRequest, NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser()

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { stripeCustomerId: true },
    })

    if (!dbUser?.stripeCustomerId) {
      return NextResponse.json(
        { error: 'No active subscription found' },
        { status: 400 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await stripe.billingPortal.sessions.create({
      customer: dbUser.stripeCustomerId,
      return_url: `${baseUrl}/settings?tab=billing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[stripe/portal] Error:', error)
    return NextResponse.json({ error: 'Failed to create portal session' }, { status: 500 })
  }
}