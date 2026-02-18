// lib/email/templates.ts
// Flatro — HTML-шаблоны email-уведомлений

/* ----------------------------------------------------------------
   Базовая обёртка
---------------------------------------------------------------- */
function baseLayout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; background: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { padding: 28px 32px; background: #0f172a; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; }
    .header span { font-size: 13px; color: #94a3b8; }
    .body { padding: 32px; }
    .body p { margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #374151; }
    .info-box { background: #f8fafc; border-left: 4px solid #3b82f6; border-radius: 4px; padding: 16px 20px; margin: 20px 0; }
    .info-box.danger { border-color: #ef4444; }
    .info-box.warning { border-color: #f59e0b; }
    .info-box .label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 6px; }
    .info-box .value { font-size: 17px; font-weight: 600; color: #111827; }
    .info-box .sub { font-size: 13px; color: #6b7280; margin-top: 4px; }
    .btn { display: inline-block; margin-top: 20px; padding: 12px 24px; background: #0f172a; color: #ffffff !important; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600; }
    .footer { padding: 20px 32px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; line-height: 1.5; }
    .footer a { color: #6b7280; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🏠 Flatro</h1>
      <span>Система управления арендой</span>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      Это автоматическое уведомление от Flatro.<br/>
      Чтобы отключить уведомления, перейдите в <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://flatro.app'}/settings">Настройки → Уведомления</a>.
    </div>
  </div>
</body>
</html>`
}

/* ----------------------------------------------------------------
   1. Платёж — срок через 3 дня
---------------------------------------------------------------- */
export interface PaymentDueSoonData {
  ownerName: string
  tenantName: string
  propertyName: string
  propertyAddress: string
  amount: number
  currency: string
  dueDate: string       // "10 czerwca 2025"
  paymentType: string   // "Czynsz" | "Media" | ...
}

export function paymentDueSoonTemplate(data: PaymentDueSoonData): { subject: string; html: string } {
  const subject = `⏰ Zbliża się termin płatności — ${data.propertyName}`
  const html = baseLayout(subject, `
    <p>Cześć, <strong>${data.ownerName}</strong>!</p>
    <p>Za <strong>3 dni</strong> mija termin płatności od Twojego najemcy.</p>

    <div class="info-box warning">
      <div class="label">Płatność</div>
      <div class="value">${data.amount.toFixed(2)} ${data.currency}</div>
      <div class="sub">${data.paymentType} · Termin: ${data.dueDate}</div>
    </div>

    <div class="info-box">
      <div class="label">Najemca</div>
      <div class="value">${data.tenantName}</div>
      <div class="sub">${data.propertyName} · ${data.propertyAddress}</div>
    </div>

    <p>Upewnij się, że najemca jest poinformowany o zbliżającym się terminie.</p>

    <a class="btn" href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://flatro.app'}/payments">
      Przejdź do płatności →
    </a>
  `)
  return { subject, html }
}

/* ----------------------------------------------------------------
   2. Платёж — просрочен
---------------------------------------------------------------- */
export interface PaymentOverdueData {
  ownerName: string
  tenantName: string
  propertyName: string
  propertyAddress: string
  amount: number
  currency: string
  dueDate: string
  daysOverdue: number
  paymentType: string
}

export function paymentOverdueTemplate(data: PaymentOverdueData): { subject: string; html: string } {
  const subject = `🚨 Zaległa płatność — ${data.propertyName}`
  const html = baseLayout(subject, `
    <p>Cześć, <strong>${data.ownerName}</strong>!</p>
    <p>Płatność od Twojego najemcy jest <strong>przeterminowana o ${data.daysOverdue} ${data.daysOverdue === 1 ? 'dzień' : 'dni'}</strong>.</p>

    <div class="info-box danger">
      <div class="label">Zaległa płatność</div>
      <div class="value">${data.amount.toFixed(2)} ${data.currency}</div>
      <div class="sub">${data.paymentType} · Termin był: ${data.dueDate}</div>
    </div>

    <div class="info-box">
      <div class="label">Najemca</div>
      <div class="value">${data.tenantName}</div>
      <div class="sub">${data.propertyName} · ${data.propertyAddress}</div>
    </div>

    <p>Skontaktuj się z najemcą lub przejdź do Flatro, aby podjąć działania.</p>

    <a class="btn" href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://flatro.app'}/payments">
      Zarządzaj płatnościami →
    </a>
  `)
  return { subject, html }
}

/* ----------------------------------------------------------------
   3. Договор — истекает через 30 дней
---------------------------------------------------------------- */
export interface ContractExpirySoonData {
  ownerName: string
  tenantName: string
  propertyName: string
  propertyAddress: string
  endDate: string
  daysLeft: number
  contractType: string
}

export function contractExpirySoonTemplate(data: ContractExpirySoonData): { subject: string; html: string } {
  const subject = `📋 Umowa wygasa za ${data.daysLeft} dni — ${data.propertyName}`
  const html = baseLayout(subject, `
    <p>Cześć, <strong>${data.ownerName}</strong>!</p>
    <p>Umowa najmu dla Twojej nieruchomości wygaśnie za <strong>${data.daysLeft} dni</strong>.</p>

    <div class="info-box warning">
      <div class="label">Koniec umowy</div>
      <div class="value">${data.endDate}</div>
      <div class="sub">${data.contractType} · Pozostało: ${data.daysLeft} dni</div>
    </div>

    <div class="info-box">
      <div class="label">Najemca i nieruchomość</div>
      <div class="value">${data.tenantName}</div>
      <div class="sub">${data.propertyName} · ${data.propertyAddress}</div>
    </div>

    <p>Skontaktuj się z najemcą, aby omówić przedłużenie umowy lub planowanie wyprowadzki.</p>

    <a class="btn" href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://flatro.app'}/contracts">
      Przejdź do umów →
    </a>
  `)
  return { subject, html }
}

/* ----------------------------------------------------------------
   4. Договор — истёк
---------------------------------------------------------------- */
export interface ContractExpiredData {
  ownerName: string
  tenantName: string
  propertyName: string
  propertyAddress: string
  endDate: string
  contractType: string
}

export function contractExpiredTemplate(data: ContractExpiredData): { subject: string; html: string } {
  const subject = `⚠️ Umowa wygasła — ${data.propertyName}`
  const html = baseLayout(subject, `
    <p>Cześć, <strong>${data.ownerName}</strong>!</p>
    <p>Umowa najmu dla Twojej nieruchomości <strong>wygasła</strong>.</p>

    <div class="info-box danger">
      <div class="label">Data wygaśnięcia</div>
      <div class="value">${data.endDate}</div>
      <div class="sub">${data.contractType}</div>
    </div>

    <div class="info-box">
      <div class="label">Najemca i nieruchomość</div>
      <div class="value">${data.tenantName}</div>
      <div class="sub">${data.propertyName} · ${data.propertyAddress}</div>
    </div>

    <p>Sprawdź status umowy i podejmij odpowiednie działania — przedłużenie, zakończenie lub aktualizację w systemie.</p>

    <a class="btn" href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://flatro.app'}/contracts">
      Zarządzaj umowami →
    </a>
  `)
  return { subject, html }
}