// lib/email/resend.ts
// Flatro — Resend email client singleton

import { Resend } from 'resend'

if (!process.env.RESEND_API_KEY) {
  console.warn('[Resend] RESEND_API_KEY не задан — отправка email отключена')
}

export const resend = new Resend(process.env.RESEND_API_KEY ?? 'dummy')

export const FROM_EMAIL = process.env.EMAIL_FROM ?? 'Flatro <notifications@flatro.app>'

/**
 * Отправляет письмо через Resend.
 * Возвращает { id } при успехе или выбрасывает ошибку.
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<{ id: string }> {
  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  })

  if (error || !data) {
    throw new Error(error?.message ?? 'Resend: нет данных ответа')
  }

  return { id: data.id }
}