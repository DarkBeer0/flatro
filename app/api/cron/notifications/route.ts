// app/api/cron/notifications/route.ts
// Flatro — Vercel Cron endpoint
//
// Запускается автоматически каждый день в 08:00 (Europe/Warsaw)
// Конфигурация в vercel.json:
//   { "crons": [{ "path": "/api/cron/notifications", "schedule": "0 6 * * *" }] }
//
// Vercel передаёт заголовок Authorization: Bearer <CRON_SECRET>

import { NextRequest, NextResponse } from 'next/server'
import { runAllNotifications } from '@/lib/email/notification-service'

export const maxDuration = 60 // секунд (Vercel Hobby — макс 60)
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  // ── Проверка авторизации cron-запроса ─────────────────────────
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  // В продакшне Vercel добавляет Bearer автоматически,
  // но мы также разрешаем x-cron-secret для ручного тестирования
  const xSecret = request.headers.get('x-cron-secret')
  const isAuthorized =
    (cronSecret && authHeader === `Bearer ${cronSecret}`) ||
    (cronSecret && xSecret === cronSecret) ||
    // Для локальной разработки без секрета
    (!cronSecret && process.env.NODE_ENV !== 'production')

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = new Date().toISOString()
  console.log(`[CRON] Notifications job started at ${startedAt}`)

  try {
    const result = await runAllNotifications()

    const summary = {
      startedAt,
      finishedAt: new Date().toISOString(),
      payments: result.payments,
      contracts: result.contracts,
      totalSent: result.payments.sent + result.contracts.sent,
      totalFailed: result.payments.failed + result.contracts.failed,
    }

    console.log('[CRON] Notifications job completed:', JSON.stringify(summary))

    return NextResponse.json({ ok: true, ...summary })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[CRON] Notifications job failed:', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
