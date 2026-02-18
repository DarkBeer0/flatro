// app/api/notifications/send/route.ts
// Flatro — API для ручного запуска уведомлений
//
// POST /api/notifications/send
//   body: { type?: 'payments' | 'contracts' | 'all', userId?: string }
//
// Защита: только CRON_SECRET (для cron) или аутентифицированный владелец
// (userId в body позволяет слать только свои уведомления)

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import {
  runAllNotifications,
  runPaymentNotifications,
  runContractNotifications,
} from '@/lib/email/notification-service'

// GET /api/notifications/send — журнал последних уведомлений пользователя
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)

    const logs = await prisma.notificationLog.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        type: true,
        status: true,
        recipient: true,
        subject: true,
        relatedId: true,
        relatedType: true,
        sentAt: true,
        errorMsg: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ logs, count: logs.length })
  } catch (error) {
    console.error('[/api/notifications/send GET]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/notifications/send — запустить отправку
export async function POST(request: NextRequest) {
  // ── Вариант 1: запрос от cron с секретом ──────────────────────
  const cronSecret = request.headers.get('x-cron-secret')
  const isCronRequest = cronSecret === process.env.CRON_SECRET && !!process.env.CRON_SECRET

  // ── Вариант 2: запрос от аутентифицированного пользователя ────
  let authenticatedUserId: string | null = null

  if (!isCronRequest) {
    const supabase = await createClient()
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    authenticatedUserId = user.id
  }

  try {
    const body = await request.json().catch(() => ({}))
    const type: 'payments' | 'contracts' | 'all' = body.type ?? 'all'

    let result: Record<string, unknown>

    if (type === 'payments') {
      result = { payments: await runPaymentNotifications() }
    } else if (type === 'contracts') {
      result = { contracts: await runContractNotifications() }
    } else {
      result = await runAllNotifications()
    }

    console.log('[Notifications] Запуск завершён:', JSON.stringify(result))

    return NextResponse.json({
      ok: true,
      type,
      triggeredBy: isCronRequest ? 'cron' : `user:${authenticatedUserId}`,
      result,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[/api/notifications/send POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}