// lib/pdf/ProtocolPDF.tsx
// Flatro — V9: Handover Protocol PDF (Protokół zdawczo-odbiorczy)
// Uses @react-pdf/renderer for server-side PDF generation

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
  ProtocolMeterReading,
  ProtocolKey,
  RoomCondition,
  ProtocolType,
} from '@/lib/contracts/lifecycle-types'

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: 'Helvetica',
    lineHeight: 1.5,
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
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f0f0f0',
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: '#ccc',
  },
  tableCell: {
    fontSize: 9,
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
  notes: {
    fontSize: 9,
    color: '#333',
    marginTop: 4,
    fontStyle: 'italic',
  },
})

// ============================================
// Helpers
// ============================================

const METER_TYPE_PL: Record<string, string> = {
  ELECTRICITY: 'Energia elektryczna',
  GAS: 'Gaz',
  WATER_COLD: 'Woda zimna',
  WATER_HOT: 'Woda ciepła',
  HEATING: 'Ogrzewanie',
}

const CONDITION_PL: Record<string, string> = {
  GOOD: 'Dobry',
  FAIR: 'Dostateczny',
  POOR: 'Zły',
  DAMAGED: 'Uszkodzony',
}

function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

// ============================================
// Props
// ============================================

export interface ProtocolPDFData {
  type: ProtocolType
  date: string | Date
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
  meterReadings: ProtocolMeterReading[]
  keysHandedOver: ProtocolKey[]
  roomsCondition: RoomCondition[]
  generalNotes?: string | null
}

// ============================================
// Component
// ============================================

export function ProtocolPDF({ data }: { data: ProtocolPDFData }) {
  const protocolTitle =
    data.type === 'MOVE_IN'
      ? 'PROTOKÓŁ ZDAWCZO-ODBIORCZY — WYDANIE LOKALU'
      : 'PROTOKÓŁ ZDAWCZO-ODBIORCZY — ZWROT LOKALU'

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* ═══ TYTUŁ ═══ */}
        <Text style={styles.title}>{protocolTitle}</Text>
        <Text style={styles.subtitle}>
          z dnia {formatDate(data.date)}
        </Text>

        {/* ═══ § 1. STRONY UMOWY ═══ */}
        <Text style={styles.sectionTitle}>§ 1. Strony</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Wynajmujący (Właściciel):</Text>
          <Text style={styles.value}>
            {data.owner.firstName} {data.owner.lastName}
            {data.owner.address ? `, ${data.owner.address}` : ''}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Najemca:</Text>
          <Text style={styles.value}>
            {data.tenant.firstName} {data.tenant.lastName}
          </Text>
        </View>

        {/* ═══ § 2. PRZEDMIOT NAJMU ═══ */}
        <Text style={styles.sectionTitle}>§ 2. Przedmiot najmu</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Lokal:</Text>
          <Text style={styles.value}>{data.property.name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Adres:</Text>
          <Text style={styles.value}>
            {data.property.address}, {data.property.city}
          </Text>
        </View>

        {/* ═══ § 3. STAN LICZNIKÓW ═══ */}
        <Text style={styles.sectionTitle}>§ 3. Stan liczników</Text>
        {data.meterReadings.length === 0 ? (
          <Text style={styles.notes}>Brak liczników do protokołu.</Text>
        ) : (
          <View>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { width: '30%' }]}>Typ licznika</Text>
              <Text style={[styles.tableCell, { width: '30%' }]}>Nr licznika</Text>
              <Text style={[styles.tableCell, { width: '20%' }]}>Odczyt</Text>
              <Text style={[styles.tableCell, { width: '20%' }]}>Jednostka</Text>
            </View>
            {data.meterReadings.map((reading, i) => (
              <View style={styles.tableRow} key={i}>
                <Text style={[styles.tableCell, { width: '30%' }]}>
                  {METER_TYPE_PL[reading.meterType] || reading.meterType}
                </Text>
                <Text style={[styles.tableCell, { width: '30%' }]}>
                  {reading.meterNumber || '—'}
                </Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>
                  {reading.value.toFixed(2)}
                </Text>
                <Text style={[styles.tableCell, { width: '20%' }]}>
                  {reading.meterType === 'ELECTRICITY' ? 'kWh' :
                   reading.meterType === 'GAS' ? 'm³' :
                   reading.meterType.startsWith('WATER') ? 'm³' :
                   'GJ'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ═══ § 4. PRZEKAZANE KLUCZE ═══ */}
        <Text style={styles.sectionTitle}>§ 4. Przekazane klucze</Text>
        {data.keysHandedOver.length === 0 ? (
          <Text style={styles.notes}>Brak kluczy do przekazania.</Text>
        ) : (
          <View>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { width: '50%' }]}>Typ</Text>
              <Text style={[styles.tableCell, { width: '15%' }]}>Ilość</Text>
              <Text style={[styles.tableCell, { width: '35%' }]}>Uwagi</Text>
            </View>
            {data.keysHandedOver.map((key, i) => (
              <View style={styles.tableRow} key={i}>
                <Text style={[styles.tableCell, { width: '50%' }]}>{key.type}</Text>
                <Text style={[styles.tableCell, { width: '15%' }]}>{key.count} szt.</Text>
                <Text style={[styles.tableCell, { width: '35%' }]}>
                  {key.description || '—'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* ═══ § 5. STAN TECHNICZNY LOKALU ═══ */}
        <Text style={styles.sectionTitle}>§ 5. Stan techniczny lokalu</Text>
        {data.roomsCondition.map((room, ri) => (
          <View key={ri} style={{ marginBottom: 8 }}>
            <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', marginBottom: 3 }}>
              {room.roomName}
            </Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableCell, { width: '35%' }]}>Element</Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>Stan</Text>
              <Text style={[styles.tableCell, { width: '40%' }]}>Uwagi</Text>
            </View>
            {room.items.map((item, ii) => (
              <View style={styles.tableRow} key={ii}>
                <Text style={[styles.tableCell, { width: '35%' }]}>{item.name}</Text>
                <Text style={[styles.tableCell, { width: '25%' }]}>
                  {CONDITION_PL[item.condition] || item.condition}
                </Text>
                <Text style={[styles.tableCell, { width: '40%' }]}>
                  {item.notes || '—'}
                </Text>
              </View>
            ))}
          </View>
        ))}

        {/* ═══ § 6. UWAGI OGÓLNE ═══ */}
        {data.generalNotes && (
          <>
            <Text style={styles.sectionTitle}>§ 6. Uwagi ogólne</Text>
            <Text style={styles.notes}>{data.generalNotes}</Text>
          </>
        )}

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