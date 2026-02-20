// app/api/stripe/webhook/route.ts
// Handles Stripe webhook events to keep subscription state in sync

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'
import { planFromPriceId, type SubscriptionPlan } from '@/lib/subscription'

// ── Helpers ──────────────────────────────────────────────────────

async function getUserIdByCustomer(customerId: string): Promise<string | null> {
  const user = await prisma.user.findFirst({
    where: { stripeCustomerId: customerId },
    select: { id: true },
  })
  return user?.id ?? null
}

async function updateUserSubscription(
  userId: string,
  plan: SubscriptionPlan,
  subscriptionId: string | null
) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionPlan: plan,
      stripeSubscriptionId: subscriptionId,
    },
  })
  console.log(`[webhook] Updated user ${userId} → plan=${plan} sub=${subscriptionId}`)
}

// ── Handler ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[webhook] Missing STRIPE_WEBHOOK_SECRET env var')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error('[webhook] Signature verification failed:', err.message)
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  // ── Process events ────────────────────────────────────────────
  try {
    switch (event.type) {
      // ── Checkout completed: subscription created ─────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const customerId =
          typeof session.customer === 'string'
            ? session.customer
            : session.customer?.id ?? null

        if (!customerId) break

        const userId =
          session.metadata?.flatroUserId ?? (await getUserIdByCustomer(customerId))

        if (!userId) {
          console.warn('[webhook] checkout.session.completed: no userId found')
          break
        }

        const plan = (session.metadata?.plan as SubscriptionPlan) ?? 'PRO'
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id ?? null

        await updateUserSubscription(userId, plan, subscriptionId)
        break
      }

      // ── Subscription updated (plan change, renewal, etc.) ────
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer.id

        const userId = await getUserIdByCustomer(customerId)
        if (!userId) {
          console.warn('[webhook] subscription.updated: no user found for customer', customerId)
          break
        }

        // Determine plan from price ID
        const priceId = sub.items.data[0]?.price?.id
        let plan: SubscriptionPlan = 'FREE'

        if (priceId) {
          const resolved = planFromPriceId(priceId)
          if (resolved) plan = resolved.plan
        }

        // Override from metadata if present
        if (sub.metadata?.plan) {
          plan = sub.metadata.plan as SubscriptionPlan
        }

        const isActive = ['active', 'trialing'].includes(sub.status)

        await updateUserSubscription(
          userId,
          isActive ? plan : 'FREE',
          isActive ? sub.id : null
        )
        break
      }

      // ── Subscription cancelled / ended ───────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer.id

        const userId = await getUserIdByCustomer(customerId)
        if (!userId) break

        await updateUserSubscription(userId, 'FREE', null)
        break
      }

      // ── Payment failed ───────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId =
          typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id

        if (!customerId) break

        // Log only — don't downgrade immediately on first failure
        // Stripe will retry and eventually cancel subscription → caught above
        console.warn('[webhook] invoice.payment_failed for customer', customerId)
        break
      }

      default:
        // Unhandled event — return 200 anyway to avoid Stripe retries
        break
    }
  } catch (err) {
    console.error('[webhook] Processing error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}