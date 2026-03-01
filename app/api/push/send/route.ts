// app/api/push/send/route.ts
// Flatro — API for sending push notifications
// Used by cron jobs and internal services
// POST: Send push to specific user or all users with overdue payments

import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { sendPushToUser, sendOverduePaymentPush, sendPaymentDueSoonPush } from '@/lib/push/send-push'
import { addDays, format, isPast, isWithinInterval } from 'date-fns'

// ═══════════════════════════════════════════════════════════════
// POST — Send push notification
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type } = body

    // ── Direct push to a specific user ──────────────────────
    if (type === 'direct') {
      const { userId, title, body: msgBody, url } = body
      if (!userId || !title || !msgBody) {
        return NextResponse.json(
          { error: 'Missing userId, title, or body' },
          { status: 400 }
        )
      }

      const result = await sendPushToUser(userId, { title, body: msgBody, url })
      return NextResponse.json({ success: true, result })
    }

    // ── Test push to self ───────────────────────────────────
    if (type === 'test') {
      const result = await sendPushToUser(user.id, {
        title: '🔔 Test powiadomienia',
        body: 'Jeśli to widzisz, powiadomienia push działają prawidłowo!',
        url: '/settings?tab=notifications',
        tag: 'test-notification',
      })
      return NextResponse.json({ success: true, result })
    }

    // ── Payment notifications (overdue + due soon) ──────────
    if (type === 'payment_notifications') {
      const result = await runPushPaymentNotifications(user.id)
      return NextResponse.json({ success: true, result })
    }

    return NextResponse.json(
      { error: 'Unknown notification type. Use: test, direct, payment_notifications' },
      { status: 400 }
    )
  } catch (error) {
    console.error('[Push Send] Error:', error)
    return NextResponse.json(
      { error: 'Failed to send push notification' },
      { status: 500 }
    )
  }
}

// ═══════════════════════════════════════════════════════════════
// PAYMENT NOTIFICATIONS JOB (Push version)
// ═══════════════════════════════════════════════════════════════

async function runPushPaymentNotifications(ownerId: string) {
  const now = new Date()
  const in3days = addDays(now, 3)

  const result = { overdue: { sent: 0, failed: 0 }, dueSoon: { sent: 0, failed: 0 } }

  // Check if user has push enabled (has at least one subscription)
  const subCount = await prisma.pushSubscription.count({
    where: { userId: ownerId },
  })

  if (subCount === 0) {
    return { ...result, message: 'No push subscriptions found' }
  }

  // Get pending / overdue payments for this owner
  const pendingPayments = await prisma.payment.findMany({
    where: {
      userId: ownerId,
      status: { in: ['PENDING', 'OVERDUE'] },
    },
    include: {
      tenant: {
        select: {
          firstName: true,
          lastName: true,
          property: { select: { name: true } },
        },
      },
    },
  })

  for (const payment of pendingPayments) {
    const tenantName = `${payment.tenant.firstName} ${payment.tenant.lastName}`
    const dueDate = new Date(payment.dueDate)

    if (isPast(dueDate)) {
      // OVERDUE
      const pushResult = await sendOverduePaymentPush(
        ownerId,
        tenantName,
        payment.amount,
        'PLN',
        payment.id
      )
      result.overdue.sent += pushResult.sent
      result.overdue.failed += pushResult.failed
    } else if (isWithinInterval(dueDate, { start: now, end: in3days })) {
      // DUE SOON (within 3 days)
      const pushResult = await sendPaymentDueSoonPush(
        ownerId,
        tenantName,
        payment.amount,
        'PLN',
        format(dueDate, 'dd.MM.yyyy'),
        payment.id
      )
      result.dueSoon.sent += pushResult.sent
      result.dueSoon.failed += pushResult.failed
    }
  }

  return result
}