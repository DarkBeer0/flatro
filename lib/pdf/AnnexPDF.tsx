// lib/pdf/AnnexPDF.tsx
// Flatro — V9: Contract Annex PDF (Aneks do umowy najmu)
// Uses @react-pdf/renderer for server-side PDF generation

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer'
import type {
  AnnexType,
  RentChangeData,
  ExtensionChangeData,
} from '@/lib/contracts/lifecycle-types'

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    lineHeight: 1.6,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
    fontFamily: 'Helvetica-Bold',
  },
  subtitle: {
    fontSize: 11,
    textAlign: 'center',
    marginBottom: 20,
    color: '#555',
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    fontFamily: 'Helvetica-Bold',
    marginTop: 16,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    paddingBottom: 3,
  },
  paragraph: {
    fontSize: 10,
    marginBottom: 8,
    textAlign: 'justify',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  label: {
    width: '35%',
    fontFamily: 'Helvetica-Bold',
    fontSize: 9,
  },
  value: {
    width: '65%',
    fontSize: 9,
  },
  legalText: {
    fontSize: 10,
    marginBottom: 6,
    textAlign: 'justify',
    lineHeight: 1.8,
  },
  bold: {
    fontFamily: 'Helvetica-Bold',
  },
  signatureRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 60,
  },
  signatureBlock: {
    width: '40%',
    alignItems: 'center',
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#333',
    width: '100%',
    marginTop: 40,
    paddingTop: 4,
  },
  signatureLabel: {
    fontSize: 9,
    textAlign: 'center',
    color: '#555',
  },
})

// ============================================
// Helpers
// ============================================

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDateLong(date: string | Date): string {
  return new Date(date).toLocaleDateString('pl-PL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function formatPLN(amount: number): string {
  return `${amount.toFixed(2).replace('.', ',')} PLN`
}

// ============================================
// Props
// ============================================

export interface AnnexPDFData {
  annexNumber: number
  type: AnnexType
  effectiveDate: string | Date
  changes: RentChangeData | ExtensionChangeData | Record<string, never>
  customText?: string | null
  contractStartDate: string | Date
  property: {
    name: string
    address: string
    city: string
  }
  owner: {
    firstName: string
    lastName: string
    address?: string
  }
  tenant: {
    firstName: string
    lastName: string
  }
}

// ============================================
// Component
// ============================================

export function AnnexPDF({ data }: { data: AnnexPDFData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ═══ TYTUŁ ═══ */}
        <Text style={styles.title}>
          ANEKS NR {data.annexNumber}
        </Text>
        <Text style={styles.subtitle}>
          do umowy najmu lokalu mieszkalnego z dnia {formatDate(data.contractStartDate)}
        </Text>

        {/* ═══ DATA I MIEJSCE ═══ */}
        <Text style={styles.paragraph}>
          zawarty w dniu {formatDateLong(data.effectiveDate)} w {data.property.city}
        </Text>

        {/* ═══ § 1. STRONY ═══ */}
        <Text style={styles.sectionTitle}>§ 1. Strony</Text>
        <Text style={styles.paragraph}>
          pomiędzy:
        </Text>
        <View style={styles.row}>
          <Text style={styles.label}>Wynajmujący:</Text>
          <Text style={styles.value}>
            {data.owner.firstName} {data.owner.lastName}
            {data.owner.address ? `, zam. ${data.owner.address}` : ''}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Najemca:</Text>
          <Text style={styles.value}>
            {data.tenant.firstName} {data.tenant.lastName}
          </Text>
        </View>
        <Text style={{ ...styles.paragraph, marginTop: 8 }}>
          zwanymi dalej łącznie „Stronami"
        </Text>

        {/* ═══ § 2. PRZEDMIOT ANEKSU ═══ */}
        <Text style={styles.sectionTitle}>§ 2. Przedmiot aneksu</Text>
        <Text style={styles.paragraph}>
          Niniejszy aneks dotyczy umowy najmu lokalu mieszkalnego położonego
          pod adresem: {data.property.address}, {data.property.city} ({data.property.name}).
        </Text>

        {/* ═══ § 3. ZMIANA WARUNKÓW ═══ */}
        <Text style={styles.sectionTitle}>§ 3. Zmiana warunków umowy</Text>

        {/* RENT_CHANGE */}
        {data.type === 'RENT_CHANGE' && (() => {
          const changes = data.changes as RentChangeData
          return (
            <>
              <Text style={styles.legalText}>
                Strony zgodnie postanawiają, że od dnia {formatDateLong(data.effectiveDate)} czynsz
                najmu ulega zmianie z kwoty {formatPLN(changes.previousRent)} (słownie:{' '}
                {changes.previousRent.toFixed(2).replace('.', ',')} złotych) miesięcznie
                na kwotę {formatPLN(changes.newRent)} (słownie:{' '}
                {changes.newRent.toFixed(2).replace('.', ',')} złotych) miesięcznie.
              </Text>
              <Text style={styles.legalText}>
                Nowa stawka czynszu obowiązuje od pierwszego dnia okresu rozliczeniowego
                przypadającego po dniu wejścia w życie niniejszego aneksu.
              </Text>
            </>
          )
        })()}

        {/* EXTENSION */}
        {data.type === 'EXTENSION' && (() => {
          const changes = data.changes as ExtensionChangeData
          return (
            <>
              <Text style={styles.legalText}>
                Strony zgodnie postanawiają, że okres obowiązywania umowy najmu
                {changes.previousEndDate
                  ? `, który upływał w dniu ${formatDateLong(changes.previousEndDate)},`
                  : ''}{' '}
                ulega przedłużeniu{' '}
                {changes.newEndDate
                  ? `do dnia ${formatDateLong(changes.newEndDate)}.`
                  : 'na czas nieokreślony.'}
              </Text>
              <Text style={styles.legalText}>
                Pozostałe warunki umowy najmu pozostają bez zmian.
              </Text>
            </>
          )
        })()}

        {/* OTHER */}
        {data.type === 'OTHER' && data.customText && (
          <Text style={styles.legalText}>{data.customText}</Text>
        )}

        {/* ═══ § 4. POSTANOWIENIA KOŃCOWE ═══ */}
        <Text style={styles.sectionTitle}>§ 4. Postanowienia końcowe</Text>
        <Text style={styles.legalText}>
          1. Niniejszy aneks wchodzi w życie z dniem {formatDateLong(data.effectiveDate)}.
        </Text>
        <Text style={styles.legalText}>
          2. W sprawach nieuregulowanych niniejszym aneksem zastosowanie mają
          postanowienia umowy najmu z dnia {formatDate(data.contractStartDate)}.
        </Text>
        <Text style={styles.legalText}>
          3. Aneks sporządzono w dwóch jednobrzmiących egzemplarzach, po jednym
          dla każdej ze Stron.
        </Text>

        {/* ═══ PODPISY ═══ */}
        <View style={styles.signatureRow}>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureLabel}>
                Wynajmujący (Właściciel)
              </Text>
            </View>
          </View>
          <View style={styles.signatureBlock}>
            <View style={styles.signatureLine}>
              <Text style={styles.signatureLabel}>
                Najemca
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}