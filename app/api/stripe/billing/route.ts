// app/api/stripe/billing/route.ts
// GET — Returns current user's subscription plan and usage

import { NextResponse } from 'next/server'
import { requireUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await requireUser()

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        subscriptionPlan: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
        _count: { select: { properties: true } },
      },
    })

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      plan: dbUser.subscriptionPlan ?? 'FREE',
      propertiesCount: dbUser._count.properties,
      stripeCustomerId: dbUser.stripeCustomerId,
      stripeSubscriptionId: dbUser.stripeSubscriptionId,
    })
  } catch (error) {
    console.error('[billing] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}