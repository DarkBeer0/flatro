// app/api/stripe/connect/webhook/route.ts
// Handles Stripe Connect webhook events:
//   - account.updated → sync stripeOnboarded
//   - checkout.session.completed → mark payment as PAID
//   - payment_intent.payment_failed → revert payment status

import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  const webhookSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('[connect-webhook] Missing STRIPE_CONNECT_WEBHOOK_SECRET env var')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err: any) {
    console.error('[connect-webhook] Signature verification failed:', err.message)
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 })
  }

  try {
    switch (event.type) {
      // ═══════════════════════════════════════════════════════════
      // Connect account status changed
      // ═══════════════════════════════════════════════════════════
      case 'account.updated': {
        const account = event.data.object as Stripe.Account
        const chargesEnabled = account.charges_enabled ?? false

        // Find user by stripeAccountId
        const user = await prisma.user.findFirst({
          where: { stripeAccountId: account.id },
          select: { id: true, stripeOnboarded: true },
        })

        if (!user) {
          console.warn('[connect-webhook] account.updated: no user for account', account.id)
          break
        }

        // Update onboarded status if changed
        if (user.stripeOnboarded !== chargesEnabled) {
          await prisma.user.update({
            where: { id: user.id },
            data: { stripeOnboarded: chargesEnabled },
          })
          console.log(
            `[connect-webhook] User ${user.id} stripeOnboarded → ${chargesEnabled}`
          )
        }
        break
      }

      // ═══════════════════════════════════════════════════════════
      // Checkout completed — rent payment succeeded
      // ═══════════════════════════════════════════════════════════
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Only process our rent payment sessions (not subscription ones)
        if (session.metadata?.type !== 'rent_payment') break

        const paymentId = session.metadata?.paymentId
        if (!paymentId) {
          console.warn('[connect-webhook] checkout.session.completed: no paymentId in metadata')
          break
        }

        // Get the PaymentIntent ID for reference
        const paymentIntentId =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id ?? null

        // Handle single payment
        await markPaymentPaid(paymentId, paymentIntentId)

        // Handle batch payments (multiple paymentIds comma-separated)
        const batchIds = session.metadata?.batchPaymentIds
        if (batchIds) {
          const ids = batchIds.split(',').filter(Boolean)
          for (const id of ids) {
            if (id !== paymentId) {
              await markPaymentPaid(id, paymentIntentId)
            }
          }
        }

        break
      }

      // ═══════════════════════════════════════════════════════════
      // Payment failed
      // ═══════════════════════════════════════════════════════════
      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        const paymentId = paymentIntent.metadata?.paymentId

        if (!paymentId) break

        // Revert to original status (only if it was set to processing)
        const payment = await prisma.payment.findUnique({
          where: { id: paymentId },
          select: { status: true, dueDate: true },
        })

        if (payment && payment.status === 'PENDING_CONFIRMATION') {
          const isOverdue = payment.dueDate && new Date(payment.dueDate) < new Date()
          await prisma.payment.update({
            where: { id: paymentId },
            data: { status: isOverdue ? 'OVERDUE' : 'PENDING' },
          })
          console.log(`[connect-webhook] Payment ${paymentId} reverted after failed payment`)
        }

        break
      }

      default:
        // Unhandled event — return 200 to prevent Stripe retries
        break
    }
  } catch (err) {
    console.error('[connect-webhook] Processing error:', err)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

// ── Helper: mark a single payment as PAID ─────────────────────
async function markPaymentPaid(paymentId: string, stripePaymentId: string | null) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, status: true },
    })

    if (!payment) {
      console.warn(`[connect-webhook] Payment ${paymentId} not found`)
      return
    }

    // Only update if not already PAID
    if (payment.status === 'PAID') {
      console.log(`[connect-webhook] Payment ${paymentId} already PAID, skipping`)
      return
    }

    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'PAID',
        paidDate: new Date(),
        confirmedAt: new Date(),
        stripePaymentId,
        paymentMethod: 'STRIPE',
      },
    })

    console.log(`[connect-webhook] Payment ${paymentId} → PAID (stripe: ${stripePaymentId})`)
  } catch (err) {
    console.error(`[connect-webhook] Failed to mark payment ${paymentId} as paid:`, err)
  }
}