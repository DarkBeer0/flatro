// app/api/contracts/[id]/generate-pdf/route.ts
// POST — Generate a draft PDF for a contract
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'

// We use a simple HTML→PDF approach (no heavy deps needed).
// For production, consider puppeteer or @react-pdf/renderer.
// This generates a clean, functional draft PDF using basic HTML.

function formatDate(d: Date | string | null): string {
  if (!d) return '—'
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatMoney(amount: number | null): string {
  if (amount === null || amount === undefined) return '—'
  return amount.toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' zł'
}

const CONTRACT_TYPE_LABELS: Record<string, string> = {
  STANDARD: 'Najem zwykły',
  OCCASIONAL: 'Najem okazjonalny',
  INSTITUTIONAL: 'Najem instytucjonalny',
}

function generateContractHtml(contract: any): string {
  const totalMonthly =
    (contract.rentAmount || 0) +
    (contract.adminFee || 0) +
    (contract.utilitiesAdvance || 0)

  return `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <title>Umowa najmu — DRAFT</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      font-size: 12px;
      line-height: 1.6;
      color: #333;
      padding: 40px 50px;
    }
    .draft-watermark {
      position: fixed; top: 40%; left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 100px; color: rgba(200,0,0,0.08);
      font-weight: bold; z-index: -1;
      pointer-events: none;
    }
    h1 { font-size: 20px; text-align: center; margin-bottom: 5px; }
    .subtitle { text-align: center; color: #666; margin-bottom: 30px; font-size: 11px; }
    .draft-badge {
      display: inline-block; background: #fee2e2; color: #dc2626;
      padding: 2px 10px; border-radius: 4px; font-size: 10px;
      font-weight: 600; text-transform: uppercase; margin-bottom: 20px;
    }
    .section { margin-bottom: 20px; }
    .section-title {
      font-size: 13px; font-weight: 600; color: #1e40af;
      border-bottom: 1px solid #dbeafe; padding-bottom: 4px; margin-bottom: 10px;
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    td { padding: 4px 8px; vertical-align: top; }
    td.label { color: #666; width: 40%; font-size: 11px; }
    td.value { font-weight: 500; }
    .total-row td { border-top: 2px solid #1e40af; font-weight: 600; font-size: 13px; }
    .signature-block {
      display: flex; justify-content: space-between; margin-top: 60px; gap: 40px;
    }
    .signature-box {
      flex: 1; text-align: center; padding-top: 60px;
      border-top: 1px solid #333;
    }
    .signature-label { font-size: 11px; color: #666; margin-top: 4px; }
    .signed-mark { color: #16a34a; font-weight: 600; font-size: 11px; }
    .not-signed { color: #dc2626; font-size: 11px; }
    .notes { background: #f9fafb; padding: 12px; border-radius: 6px; font-size: 11px; white-space: pre-wrap; }
    .footer { margin-top: 40px; text-align: center; color: #999; font-size: 9px; }
  </style>
</head>
<body>
  <div class="draft-watermark">DRAFT</div>

  <div style="text-align:center;">
    <span class="draft-badge">Wersja robocza — nie jest dokumentem prawnym</span>
  </div>

  <h1>UMOWA NAJMU LOKALU MIESZKALNEGO</h1>
  <p class="subtitle">${CONTRACT_TYPE_LABELS[contract.type] || contract.type}</p>

  <div class="section">
    <div class="section-title">§1. Strony umowy</div>
    <table>
      <tr>
        <td class="label">Wynajmujący (Właściciel):</td>
        <td class="value">${contract.property?.owner || '—'}</td>
      </tr>
      <tr>
        <td class="label">Najemca:</td>
        <td class="value">${contract.tenant?.firstName || ''} ${contract.tenant?.lastName || ''}</td>
      </tr>
      ${contract.tenant?.nationalId ? `
      <tr>
        <td class="label">${contract.tenant?.nationalIdType || 'PESEL'}:</td>
        <td class="value">${contract.tenant.nationalId}</td>
      </tr>` : ''}
      ${contract.tenant?.email ? `
      <tr>
        <td class="label">E-mail:</td>
        <td class="value">${contract.tenant.email}</td>
      </tr>` : ''}
      ${contract.tenant?.phone ? `
      <tr>
        <td class="label">Telefon:</td>
        <td class="value">${contract.tenant.phone}</td>
      </tr>` : ''}
    </table>
  </div>

  <div class="section">
    <div class="section-title">§2. Przedmiot najmu</div>
    <table>
      <tr>
        <td class="label">Nieruchomość:</td>
        <td class="value">${contract.property?.name || '—'}</td>
      </tr>
      <tr>
        <td class="label">Adres:</td>
        <td class="value">${contract.property?.address || '—'}${contract.property?.postalCode ? `, ${contract.property.postalCode}` : ''} ${contract.property?.city || ''}</td>
      </tr>
      ${contract.property?.area ? `
      <tr>
        <td class="label">Powierzchnia:</td>
        <td class="value">${contract.property.area} m²</td>
      </tr>` : ''}
    </table>
  </div>

  <div class="section">
    <div class="section-title">§3. Okres obowiązywania</div>
    <table>
      <tr>
        <td class="label">Data rozpoczęcia:</td>
        <td class="value">${formatDate(contract.startDate)}</td>
      </tr>
      <tr>
        <td class="label">Data zakończenia:</td>
        <td class="value">${contract.endDate ? formatDate(contract.endDate) : 'na czas nieokreślony'}</td>
      </tr>
    </table>
  </div>

  <div class="section">
    <div class="section-title">§4. Warunki finansowe</div>
    <table>
      <tr>
        <td class="label">Czynsz najmu:</td>
        <td class="value">${formatMoney(contract.rentAmount)}</td>
      </tr>
      <tr>
        <td class="label">Czynsz administracyjny:</td>
        <td class="value">${formatMoney(contract.adminFee)}</td>
      </tr>
      <tr>
        <td class="label">Zaliczka na media:</td>
        <td class="value">${formatMoney(contract.utilitiesAdvance)}</td>
      </tr>
      <tr class="total-row">
        <td class="label">Łączna opłata miesięczna:</td>
        <td class="value">${formatMoney(totalMonthly)}</td>
      </tr>
      ${contract.depositAmount ? `
      <tr>
        <td class="label">Kaucja:</td>
        <td class="value">${formatMoney(contract.depositAmount)}</td>
      </tr>` : ''}
      <tr>
        <td class="label">Dzień płatności:</td>
        <td class="value">${contract.paymentDay}. dzień miesiąca</td>
      </tr>
    </table>
  </div>

  ${contract.type === 'OCCASIONAL' && contract.substituteAddress ? `
  <div class="section">
    <div class="section-title">§5. Lokal zastępczy (najem okazjonalny)</div>
    <table>
      <tr>
        <td class="label">Adres:</td>
        <td class="value">${contract.substituteAddress}, ${contract.substitutePostalCode || ''} ${contract.substituteCity || ''}</td>
      </tr>
    </table>
  </div>` : ''}

  ${contract.notes ? `
  <div class="section">
    <div class="section-title">§${contract.type === 'OCCASIONAL' ? '6' : '5'}. Dodatkowe ustalenia</div>
    <div class="notes">${contract.notes}</div>
  </div>` : ''}

  <div class="section">
    <div class="section-title">Podpisy</div>
    <div style="display:flex; justify-content:space-between; margin-top:40px;">
      <div style="flex:1; text-align:center;">
        <div style="min-height:60px;">
          ${contract.signedByOwner
            ? `<span class="signed-mark">✅ Podpisano ${contract.ownerSignedAt ? formatDate(contract.ownerSignedAt) : ''}</span>`
            : '<span class="not-signed">❌ Oczekuje na podpis</span>'}
        </div>
        <div style="border-top:1px solid #333; padding-top:8px;">
          <div style="font-weight:600;">Wynajmujący</div>
          <div class="signature-label">(podpis właściciela)</div>
        </div>
      </div>
      <div style="width:60px;"></div>
      <div style="flex:1; text-align:center;">
        <div style="min-height:60px;">
          ${contract.signedByTenant
            ? `<span class="signed-mark">✅ Podpisano ${contract.tenantSignedAt ? formatDate(contract.tenantSignedAt) : ''}</span>`
            : '<span class="not-signed">❌ Oczekuje na podpis</span>'}
        </div>
        <div style="border-top:1px solid #333; padding-top:8px;">
          <div style="font-weight:600;">Najemca</div>
          <div class="signature-label">(podpis najemcy)</div>
        </div>
      </div>
    </div>
  </div>

  <div class="footer">
    Dokument wygenerowany automatycznie przez Flatro — wersja robocza (draft).<br>
    Wygenerowano: ${new Date().toLocaleDateString('pl-PL')} ${new Date().toLocaleTimeString('pl-PL')}
  </div>
</body>
</html>`
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify ownership
    const contract = await prisma.contract.findFirst({
      where: { id, property: { userId: user.id } },
      include: {
        tenant: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            nationalId: true,
            nationalIdType: true,
            citizenship: true,
            registrationAddress: true,
          },
        },
        property: {
          select: {
            name: true,
            address: true,
            city: true,
            postalCode: true,
            area: true,
            user: { select: { firstName: true, lastName: true, email: true } },
          },
        },
      },
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Add owner info to contract for template
    const contractData = {
      ...contract,
      property: {
        ...contract.property,
        owner: contract.property.user
          ? `${contract.property.user.firstName || ''} ${contract.property.user.lastName || ''}`.trim() || contract.property.user.email
          : '—',
      },
    }

    const html = generateContractHtml(contractData)

    // Return HTML for now — client can print to PDF via browser
    // For server-side PDF, integrate puppeteer or similar
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="umowa-draft-${id.slice(0, 8)}.html"`,
      },
    })
  } catch (error) {
    console.error('Error generating PDF:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}