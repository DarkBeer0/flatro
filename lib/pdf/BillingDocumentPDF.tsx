// lib/pdf/BillingDocumentPDF.tsx
// Flatro V10 — Legally-compliant Polish billing document PDF
// Supports: Faktura VAT, Faktura (bez VAT), Rachunek, Nota obciążeniowa
//
// Renders 100% in Polish regardless of the app UI language.
// Compliant with Polish tax law requirements (Art. 106e ustawy o VAT
// and §12 rozporządzenia w sprawie wystawiania faktur).

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'
import type {
  BillingDocument,
  BillingLineItem,
  VatRate,
} from '@/lib/billing/types'

// ─── Register fonts (use built-in Helvetica for reliability) ──────
// If you need Polish diacritics with a custom font, register here:
// Font.register({ family: 'Inter', src: '/fonts/Inter-Regular.ttf' })

// ─── Styles ──────────────────────────────────────────────────────

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    color: '#1a1a1a',
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#1a1a1a',
    paddingBottom: 12,
  },
  docTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.5,
  },
  docNumber: {
    fontSize: 10,
    color: '#444',
    marginTop: 4,
  },
  logoArea: {
    textAlign: 'right',
  },
  appName: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#2563eb',
  },

  // Dates section
  datesRow: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 20,
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 4,
  },
  dateItem: {
    flex: 1,
  },
  dateLabel: {
    fontSize: 7,
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  dateValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
  },

  // Parties
  partiesRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  partyBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 4,
  },
  partyTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#888',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 4,
  },
  partyName: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  partyLine: {
    fontSize: 8.5,
    color: '#333',
    marginBottom: 2,
  },
  partyId: {
    fontSize: 8,
    color: '#555',
    marginTop: 4,
  },

  // Items table
  tableSection: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    color: '#fff',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 2,
    marginBottom: 1,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tableRowAlt: {
    backgroundColor: '#fafafa',
  },

  // Column widths
  colLp:          { width: '5%' },
  colDesc:        { width: '43%' },
  colNet:         { width: '16%', textAlign: 'right' },
  colVat:         { width: '10%', textAlign: 'center' },
  colVatAmount:   { width: '12%', textAlign: 'right' },
  colGross:       { width: '14%', textAlign: 'right' },

  tableHeaderText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  tableCellText: {
    fontSize: 8.5,
  },
  tableCellBold: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
  },

  // Totals
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 20,
  },
  totalsBox: {
    width: '45%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    overflow: 'hidden',
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  totalsRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: '#1a1a1a',
  },
  totalsLabel: {
    fontSize: 8.5,
    color: '#555',
  },
  totalsValue: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
  },
  totalsFinalLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#fff',
  },
  totalsFinalValue: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#fff',
  },

  // Payment details
  paymentSection: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 4,
    padding: 10,
    marginBottom: 16,
  },
  paymentTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#888',
    marginBottom: 8,
  },
  paymentGrid: {
    flexDirection: 'row',
    gap: 20,
  },
  paymentItem: {
    flex: 1,
  },
  paymentLabel: {
    fontSize: 7,
    color: '#888',
    marginBottom: 2,
  },
  paymentValue: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
  },
  paymentIban: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.8,
  },

  // Remarks
  remarksSection: {
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 4,
    padding: 10,
    marginBottom: 16,
  },
  remarksTitle: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    color: '#92400e',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  remarksText: {
    fontSize: 8,
    color: '#78350f',
    lineHeight: 1.5,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    paddingTop: 8,
  },
  footerText: {
    fontSize: 7,
    color: '#aaa',
  },

  // Signatures
  signaturesRow: {
    flexDirection: 'row',
    gap: 40,
    marginTop: 32,
  },
  signatureBox: {
    flex: 1,
    borderTopWidth: 1,
    borderTopColor: '#999',
    paddingTop: 6,
  },
  signatureLabel: {
    fontSize: 7.5,
    color: '#666',
    textAlign: 'center',
  },
})

// ─── Helpers ─────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function fmtMoney(amount: number): string {
  return amount.toLocaleString('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' PLN'
}

function fmtVatRate(rate: VatRate): string {
  if (rate === 'zw.' || rate === 'np.') return rate
  return `${Math.round((rate as number) * 100)}%`
}

function isVatDocument(type: BillingDocument['type']): boolean {
  return type === 'FAKTURA_VAT' || type === 'FAKTURA_BEZ_VAT'
}

function getDocumentTitle(type: BillingDocument['type']): string {
  switch (type) {
    case 'FAKTURA_VAT':       return 'FAKTURA VAT'
    case 'FAKTURA_BEZ_VAT':   return 'FAKTURA'
    case 'RACHUNEK':          return 'RACHUNEK'
    case 'NOTA_OBCIAZENIOWA': return 'NOTA OBCIĄŻENIOWA'
  }
}

// ─── Sub-components ──────────────────────────────────────────────

function ItemsTable({
  items,
  showVat,
}: {
  items: BillingLineItem[]
  showVat: boolean
}) {
  const showVatCol = showVat

  return (
    <View style={S.tableSection}>
      {/* Header */}
      <View style={S.tableHeader}>
        <Text style={[S.tableHeaderText, S.colLp]}>Lp.</Text>
        <Text style={[S.tableHeaderText, S.colDesc]}>Nazwa usługi</Text>
        <Text style={[S.tableHeaderText, S.colNet]}>
          {showVatCol ? 'Netto' : 'Kwota'}
        </Text>
        {showVatCol && (
          <>
            <Text style={[S.tableHeaderText, S.colVat]}>Stawka</Text>
            <Text style={[S.tableHeaderText, S.colVatAmount]}>VAT</Text>
            <Text style={[S.tableHeaderText, S.colGross]}>Brutto</Text>
          </>
        )}
      </View>

      {/* Rows */}
      {items.map((item, idx) => {
        const vatAmount = item.grossAmount - item.netAmount
        const isAlt = idx % 2 === 1
        return (
          <View key={item.id} style={[S.tableRow, isAlt ? S.tableRowAlt : {}]}>
            <Text style={[S.tableCellText, S.colLp]}>{idx + 1}.</Text>
            <Text style={[S.tableCellText, S.colDesc]}>{item.description}</Text>
            <Text style={[S.tableCellText, S.colNet]}>
              {fmtMoney(item.netAmount)}
            </Text>
            {showVatCol && (
              <>
                <Text style={[S.tableCellText, S.colVat]}>
                  {fmtVatRate(item.vatRate)}
                </Text>
                <Text style={[S.tableCellText, S.colVatAmount]}>
                  {fmtMoney(vatAmount)}
                </Text>
                <Text style={[S.tableCellBold, S.colGross]}>
                  {fmtMoney(item.grossAmount)}
                </Text>
              </>
            )}
          </View>
        )
      })}
    </View>
  )
}

// ─── Main PDF component ──────────────────────────────────────────

export interface BillingDocumentPDFProps {
  document: BillingDocument
}

export function BillingDocumentPDF({ document: doc }: BillingDocumentPDFProps) {
  const showVat = isVatDocument(doc.type)
  const title   = getDocumentTitle(doc.type)
  const seller  = doc.sellerSnapshot
  const buyer   = doc.buyerSnapshot

  return (
    <Document
      title={`${title} ${doc.number}`}
      author="Flatro"
      subject="Dokument rozliczeniowy"
      language="pl"
    >
      <Page size="A4" style={S.page}>

        {/* ── Header ──────────────────────────────────────── */}
        <View style={S.header}>
          <View>
            <Text style={S.docTitle}>{title}</Text>
            <Text style={S.docNumber}>nr {doc.number}</Text>
          </View>
          <View style={S.logoArea}>
            <Text style={S.appName}>flatro</Text>
            <Text style={{ fontSize: 7, color: '#aaa', marginTop: 2 }}>
              System zarządzania najmem
            </Text>
          </View>
        </View>

        {/* ── Dates ───────────────────────────────────────── */}
        <View style={S.datesRow}>
          <View style={S.dateItem}>
            <Text style={S.dateLabel}>Data wystawienia</Text>
            <Text style={S.dateValue}>{fmtDate(doc.issueDate)}</Text>
          </View>
          <View style={S.dateItem}>
            <Text style={S.dateLabel}>
              Data sprzedaży / wykonania usługi
            </Text>
            <Text style={S.dateValue}>{fmtDate(doc.saleDate)}</Text>
          </View>
          <View style={S.dateItem}>
            <Text style={S.dateLabel}>Termin płatności</Text>
            <Text style={S.dateValue}>{fmtDate(doc.dueDate)}</Text>
          </View>
        </View>

        {/* ── Parties ─────────────────────────────────────── */}
        <View style={S.partiesRow}>
          {/* Sprzedawca / Wynajmujący */}
          <View style={S.partyBox}>
            <Text style={S.partyTitle}>
              Sprzedawca / Wynajmujący
            </Text>
            <Text style={S.partyName}>{seller.name}</Text>
            <Text style={S.partyLine}>{seller.address}</Text>
            {seller.nip && (
              <Text style={S.partyId}>NIP: {seller.nip}</Text>
            )}
            {!seller.nip && seller.pesel && (
              <Text style={S.partyId}>PESEL: {seller.pesel}</Text>
            )}
          </View>

          {/* Nabywca / Najemca */}
          <View style={S.partyBox}>
            <Text style={S.partyTitle}>
              Nabywca / Najemca
            </Text>
            <Text style={S.partyName}>{buyer.name}</Text>
            <Text style={S.partyLine}>{buyer.address}</Text>
            {buyer.nip && (
              <Text style={S.partyId}>NIP: {buyer.nip}</Text>
            )}
            {!buyer.nip && buyer.pesel && (
              <Text style={S.partyId}>PESEL: {buyer.pesel}</Text>
            )}
          </View>
        </View>

        {/* ── Items table ──────────────────────────────────── */}
        <ItemsTable items={doc.items} showVat={showVat} />

        {/* ── Totals ───────────────────────────────────────── */}
        <View style={S.totalsSection}>
          <View style={S.totalsBox}>
            {showVat && (
              <>
                <View style={S.totalsRow}>
                  <Text style={S.totalsLabel}>Razem netto:</Text>
                  <Text style={S.totalsValue}>{fmtMoney(doc.totalNet)}</Text>
                </View>
                <View style={S.totalsRow}>
                  <Text style={S.totalsLabel}>Razem VAT:</Text>
                  <Text style={S.totalsValue}>{fmtMoney(doc.totalVat)}</Text>
                </View>
              </>
            )}
            <View style={S.totalsRowFinal}>
              <Text style={S.totalsFinalLabel}>DO ZAPŁATY:</Text>
              <Text style={S.totalsFinalValue}>
                {fmtMoney(doc.totalGross)}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Payment details ──────────────────────────────── */}
        <View style={S.paymentSection}>
          <Text style={S.paymentTitle}>Szczegóły płatności</Text>
          <View style={S.paymentGrid}>
            <View style={S.paymentItem}>
              <Text style={S.paymentLabel}>Sposób płatności</Text>
              <Text style={S.paymentValue}>Przelew bankowy</Text>
            </View>
            <View style={S.paymentItem}>
              <Text style={S.paymentLabel}>Termin płatności</Text>
              <Text style={S.paymentValue}>{fmtDate(doc.dueDate)}</Text>
            </View>
            {seller.iban && (
              <View style={{ flex: 2 }}>
                <Text style={S.paymentLabel}>Numer rachunku bankowego</Text>
                <Text style={S.paymentIban}>{seller.iban}</Text>
                {seller.bankName && (
                  <Text style={[S.paymentLabel, { marginTop: 2 }]}>
                    {seller.bankName}
                    {seller.accountHolder ? ` · ${seller.accountHolder}` : ''}
                  </Text>
                )}
              </View>
            )}
          </View>
        </View>

        {/* ── Remarks ─────────────────────────────────────── */}
        {doc.remarks && (
          <View style={S.remarksSection}>
            <Text style={S.remarksTitle}>Uwagi / Podstawa zwolnienia</Text>
            <Text style={S.remarksText}>{doc.remarks}</Text>
          </View>
        )}

        {/* ── Signature lines ──────────────────────────────── */}
        <View style={S.signaturesRow}>
          <View style={S.signatureBox}>
            <Text style={S.signatureLabel}>
              Podpis osoby uprawnionej do wystawienia
            </Text>
          </View>
          <View style={S.signatureBox}>
            <Text style={S.signatureLabel}>
              Podpis osoby uprawnionej do odbioru
            </Text>
          </View>
        </View>

        {/* ── Footer ───────────────────────────────────────── */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>
            {title} nr {doc.number} · Wygenerowano przez Flatro
          </Text>
          <Text
            style={S.footerText}
            render={({ pageNumber, totalPages }) =>
              `Strona ${pageNumber} / ${totalPages}`
            }
          />
        </View>

      </Page>
    </Document>
  )
}