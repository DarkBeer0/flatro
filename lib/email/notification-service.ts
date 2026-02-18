// lib/email/notification-service.ts
// Flatro — Основной сервис отправки уведомлений
// Вызывается из /api/notifications/send и /api/cron/notifications

import { prisma } from '@/lib/prisma'
import { sendEmail } from './resend'
import {
  paymentDueSoonTemplate,
  paymentOverdueTemplate,
  contractExpirySoonTemplate,
  contractExpiredTemplate,
} from './templates'
import { addDays, differenceInDays, format, isPast, isWithinInterval } from 'date-fns'

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return format(date, 'dd.MM.yyyy')
}

function getPaymentTypeLabel(type: string): string {
  const map: Record<string, string> = {
    RENT: 'Czynsz',
    UTILITIES: 'Media',
    DEPOSIT: 'Kaucja',
    OTHER: 'Inna płatność',
  }
  return map[type] ?? type
}

function getContractTypeLabel(type: string): string {
  const map: Record<string, string> = {
    STANDARD: 'Najem standardowy',
    OCCASIONAL: 'Najem okazjonalny',
    INSTITUTIONAL: 'Najem instytucjonalny',
  }
  return map[type] ?? type
}

/**
 * Проверяет, было ли уже отправлено уведомление данного типа
 * для relatedId за последние 24 часа (dedup защита)
 */
async function alreadySent(
  userId: string,
  type: string,
  relatedId: string
): Promise<boolean> {
  const since = addDays(new Date(), -1)
  const existing = await prisma.notificationLog.findFirst({
    where: {
      userId,
      type: type as any,
      relatedId,
      status: 'SENT',
      sentAt: { gte: since },
    },
  })
  return !!existing
}

/**
 * Записывает лог и отправляет email.
 * Возвращает 'sent' | 'skipped' | 'failed'.
 */
async function dispatchEmail({
  userId,
  type,
  relatedId,
  relatedType,
  recipient,
  subject,
  html,
}: {
  userId: string
  type: string
  relatedId: string
  relatedType: string
  recipient: string
  subject: string
  html: string
}): Promise<'sent' | 'skipped' | 'failed'> {
  // Dedup: пропускаем, если уже отправили сегодня
  if (await alreadySent(userId, type, relatedId)) {
    return 'skipped'
  }

  // Создаём лог со статусом PENDING
  const log = await prisma.notificationLog.create({
    data: {
      userId,
      type: type as any,
      status: 'PENDING',
      recipient,
      subject,
      body: html,
      relatedId,
      relatedType,
    },
  })

  try {
    const { id: externalId } = await sendEmail({ to: recipient, subject, html })

    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: 'SENT', sentAt: new Date(), externalId },
    })

    return 'sent'
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)

    await prisma.notificationLog.update({
      where: { id: log.id },
      data: { status: 'FAILED', errorMsg },
    })

    console.error(`[Notifications] Ошибка отправки (${type} → ${recipient}):`, errorMsg)
    return 'failed'
  }
}

// ─────────────────────────────────────────────────────────
// JOBS
// ─────────────────────────────────────────────────────────

export interface NotificationResult {
  processed: number
  sent: number
  skipped: number
  failed: number
  errors: string[]
}

/**
 * JOB 1: Напоминания о платежах
 *  - PAYMENT_DUE_SOON: срок через 1–3 дня, статус PENDING
 *  - PAYMENT_OVERDUE:  срок прошёл, статус PENDING (не отмечен оплаченным)
 */
export async function runPaymentNotifications(): Promise<NotificationResult> {
  const result: NotificationResult = { processed: 0, sent: 0, skipped: 0, failed: 0, errors: [] }

  const now = new Date()
  const in3days = addDays(now, 3)

  // Берём всех владельцев с включёнными напоминаниями
  const usersWithSettings = await prisma.userSettings.findMany({
    where: { emailPaymentReminders: true },
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
  })

  for (const { user } of usersWithSettings) {
    if (!user.email) continue

    // Находим платежи, ожидающие оплаты
    const pendingPayments = await prisma.payment.findMany({
      where: {
        userId: user.id,
        status: { in: ['PENDING', 'OVERDUE'] },
      },
      include: {
        tenant: {
          select: {
            firstName: true,
            lastName: true,
            property: { select: { name: true, address: true, city: true } },
          },
        },
      },
    })

    for (const payment of pendingPayments) {
      result.processed++

      const tenant = payment.tenant
      const propertyName = tenant.property?.name ?? 'Nieruchomość'
      const propertyAddress = tenant.property
        ? `${tenant.property.address}, ${tenant.property.city}`
        : ''
      const tenantName = `${tenant.firstName} ${tenant.lastName}`
      const ownerName = user.firstName ?? user.email
      const dueDate = new Date(payment.dueDate)
      const currency = 'PLN'

      // DUE SOON: срок в диапазоне [сейчас, сейчас + 3 дня]
      const isDueSoon = isWithinInterval(dueDate, { start: now, end: in3days })
      // OVERDUE: срок уже прошёл
      const isOverdue = isPast(dueDate) && payment.status !== 'PAID'

      if (isDueSoon && payment.status === 'PENDING') {
        const { subject, html } = paymentDueSoonTemplate({
          ownerName,
          tenantName,
          propertyName,
          propertyAddress,
          amount: payment.amount,
          currency,
          dueDate: formatDate(dueDate),
          paymentType: getPaymentTypeLabel(payment.type),
        })

        const status = await dispatchEmail({
          userId: user.id,
          type: 'PAYMENT_DUE_SOON',
          relatedId: payment.id,
          relatedType: 'payment',
          recipient: user.email,
          subject,
          html,
        })

        result[status]++
      } else if (isOverdue) {
        const daysOverdue = Math.abs(differenceInDays(now, dueDate))

        const { subject, html } = paymentOverdueTemplate({
          ownerName,
          tenantName,
          propertyName,
          propertyAddress,
          amount: payment.amount,
          currency,
          dueDate: formatDate(dueDate),
          daysOverdue,
          paymentType: getPaymentTypeLabel(payment.type),
        })

        const status = await dispatchEmail({
          userId: user.id,
          type: 'PAYMENT_OVERDUE',
          relatedId: payment.id,
          relatedType: 'payment',
          recipient: user.email,
          subject,
          html,
        })

        result[status]++
      }
    }
  }

  return result
}

/**
 * JOB 2: Уведомления об истечении договоров
 *  - CONTRACT_EXPIRY_SOON: истекает через ≤30 дней, статус ACTIVE
 *  - CONTRACT_EXPIRED:     endDate прошёл, статус ACTIVE (не обновлён)
 */
export async function runContractNotifications(): Promise<NotificationResult> {
  const result: NotificationResult = { processed: 0, sent: 0, skipped: 0, failed: 0, errors: [] }

  const now = new Date()
  const in30days = addDays(now, 30)

  const usersWithSettings = await prisma.userSettings.findMany({
    where: { emailContractExpiry: true },
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
  })

  for (const { user } of usersWithSettings) {
    if (!user.email) continue

    const contracts = await prisma.contract.findMany({
      where: {
        property: { userId: user.id },
        status: 'ACTIVE',
        endDate: { not: null },
      },
      include: {
        tenant: { select: { firstName: true, lastName: true } },
        property: { select: { name: true, address: true, city: true } },
      },
    })

    for (const contract of contracts) {
      if (!contract.endDate) continue
      result.processed++

      const endDate = new Date(contract.endDate)
      const ownerName = user.firstName ?? user.email
      const tenantName = `${contract.tenant.firstName} ${contract.tenant.lastName}`
      const propertyName = contract.property.name
      const propertyAddress = `${contract.property.address}, ${contract.property.city}`
      const contractType = getContractTypeLabel(contract.type)

      const isExpiringSoon = isWithinInterval(endDate, { start: now, end: in30days })
      const isExpired = isPast(endDate)
      const daysLeft = differenceInDays(endDate, now)

      if (isExpired) {
        const { subject, html } = contractExpiredTemplate({
          ownerName,
          tenantName,
          propertyName,
          propertyAddress,
          endDate: formatDate(endDate),
          contractType,
        })

        const status = await dispatchEmail({
          userId: user.id,
          type: 'CONTRACT_EXPIRED',
          relatedId: contract.id,
          relatedType: 'contract',
          recipient: user.email,
          subject,
          html,
        })

        result[status]++
      } else if (isExpiringSoon && daysLeft > 0) {
        const { subject, html } = contractExpirySoonTemplate({
          ownerName,
          tenantName,
          propertyName,
          propertyAddress,
          endDate: formatDate(endDate),
          daysLeft,
          contractType,
        })

        const status = await dispatchEmail({
          userId: user.id,
          type: 'CONTRACT_EXPIRY_SOON',
          relatedId: contract.id,
          relatedType: 'contract',
          recipient: user.email,
          subject,
          html,
        })

        result[status]++
      }
    }
  }

  return result
}

/**
 * Запускает все jobs и возвращает суммарный результат
 */
export async function runAllNotifications(): Promise<{
  payments: NotificationResult
  contracts: NotificationResult
}> {
  const [payments, contracts] = await Promise.all([
    runPaymentNotifications(),
    runContractNotifications(),
  ])

  return { payments, contracts }
}