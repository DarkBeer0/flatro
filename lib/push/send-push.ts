// lib/push/send-push.ts
// Flatro — Server-side Web Push notification sender
// Handles: sending, 410 Gone cleanup, batch sending

import webpush from 'web-push'
import { prisma } from '@/lib/prisma'

// ═══════════════════════════════════════════════════════════════
// VAPID CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY!
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:support@flatro.app'

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
}

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  url?: string
  tag?: string
  data?: Record<string, unknown>
}

export interface PushResult {
  sent: number
  failed: number
  removed: number     // Dead subscriptions cleaned up (410 Gone)
  errors: string[]
}

// ═══════════════════════════════════════════════════════════════
// SEND TO SINGLE SUBSCRIPTION
// ═══════════════════════════════════════════════════════════════

/**
 * Send a push notification to a single subscription.
 * Returns true if sent successfully.
 * Automatically deletes subscription on 410 Gone (expired).
 */
export async function sendPushToSubscription(
  subscriptionId: string,
  endpoint: string,
  keys: { p256dh: string; auth: string },
  payload: PushPayload
): Promise<{ success: boolean; removed: boolean; error?: string }> {
  const pushSubscription = {
    endpoint,
    keys: {
      p256dh: keys.p256dh,
      auth: keys.auth,
    },
  }

  try {
    await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 } // 24 hours
    )
    return { success: true, removed: false }
  } catch (err: unknown) {
    const error = err as { statusCode?: number; message?: string }

    // 410 Gone — subscription expired, clean up from DB
    if (error.statusCode === 410) {
      try {
        await prisma.pushSubscription.delete({
          where: { id: subscriptionId },
        })
        console.log(`[Push] Removed dead subscription: ${subscriptionId}`)
      } catch {
        // Already deleted or concurrent deletion — safe to ignore
      }
      return { success: false, removed: true, error: 'Subscription expired (410 Gone)' }
    }

    // 404 — subscription not found on push service
    if (error.statusCode === 404) {
      try {
        await prisma.pushSubscription.delete({
          where: { id: subscriptionId },
        })
      } catch {}
      return { success: false, removed: true, error: 'Subscription not found (404)' }
    }

    // Other errors (429 rate limit, 500 server error, etc.)
    console.error(`[Push] Error sending to ${subscriptionId}:`, error.message)
    return {
      success: false,
      removed: false,
      error: error.message || 'Unknown push error',
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// SEND TO ALL USER'S DEVICES
// ═══════════════════════════════════════════════════════════════

/**
 * Send a push notification to ALL devices of a specific user.
 * Automatically cleans up expired subscriptions.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<PushResult> {
  const result: PushResult = { sent: 0, failed: 0, removed: 0, errors: [] }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  })

  if (subscriptions.length === 0) return result

  const promises = subscriptions.map(async (sub) => {
    const res = await sendPushToSubscription(
      sub.id,
      sub.endpoint,
      { p256dh: sub.p256dh, auth: sub.auth },
      payload
    )

    if (res.success) result.sent++
    else if (res.removed) result.removed++
    else {
      result.failed++
      if (res.error) result.errors.push(res.error)
    }
  })

  await Promise.allSettled(promises)
  return result
}

// ═══════════════════════════════════════════════════════════════
// SEND TO MULTIPLE USERS
// ═══════════════════════════════════════════════════════════════

/**
 * Send a push notification to multiple users at once.
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: PushPayload
): Promise<PushResult> {
  const total: PushResult = { sent: 0, failed: 0, removed: 0, errors: [] }

  const results = await Promise.allSettled(
    userIds.map((userId) => sendPushToUser(userId, payload))
  )

  for (const r of results) {
    if (r.status === 'fulfilled') {
      total.sent += r.value.sent
      total.failed += r.value.failed
      total.removed += r.value.removed
      total.errors.push(...r.value.errors)
    } else {
      total.failed++
      total.errors.push(r.reason?.message || 'Unknown error')
    }
  }

  return total
}

// ═══════════════════════════════════════════════════════════════
// CONVENIENCE: OVERDUE PAYMENT NOTIFICATION
// ═══════════════════════════════════════════════════════════════

/**
 * Send an overdue payment push notification to a user.
 * Called from cron job or payment status update logic.
 */
export async function sendOverduePaymentPush(
  userId: string,
  tenantName: string,
  amount: number,
  currency: string,
  paymentId: string
): Promise<PushResult> {
  return sendPushToUser(userId, {
    title: '⚠️ Zaległa płatność',
    body: `${tenantName} — ${amount.toFixed(2)} ${currency} po terminie`,
    url: `/payments?highlight=${paymentId}`,
    tag: `overdue-${paymentId}`,
    data: { paymentId, type: 'PAYMENT_OVERDUE' },
  })
}

/**
 * Send a payment reminder push to a user.
 */
export async function sendPaymentDueSoonPush(
  userId: string,
  tenantName: string,
  amount: number,
  currency: string,
  dueDate: string,
  paymentId: string
): Promise<PushResult> {
  return sendPushToUser(userId, {
    title: '💳 Zbliżający się termin płatności',
    body: `${tenantName} — ${amount.toFixed(2)} ${currency} do ${dueDate}`,
    url: `/payments?highlight=${paymentId}`,
    tag: `due-soon-${paymentId}`,
    data: { paymentId, type: 'PAYMENT_DUE_SOON' },
  })
}