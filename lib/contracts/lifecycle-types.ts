// lib/contracts/lifecycle-types.ts
// Flatro — V9: Contract Lifecycle Module Types (Protocols & Annexes)

// ============================================
// Protocol Types (Protokół zdawczo-odbiorczy)
// ============================================

export type ProtocolType = 'MOVE_IN' | 'MOVE_OUT'

export interface ProtocolMeterReading {
  meterId: string
  meterNumber: string | null
  meterType: string // ELECTRICITY | GAS | WATER_COLD | WATER_HOT | HEATING
  value: number
}

export interface ProtocolKey {
  type: string       // e.g. "do drzwi wejściowych", "do skrzynki pocztowej"
  count: number
  description?: string
}

export interface RoomConditionItem {
  name: string       // e.g. "Podłoga", "Ściany", "Okna"
  condition: 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED'
  notes?: string
}

export interface RoomCondition {
  roomName: string   // e.g. "Pokój 1", "Kuchnia", "Łazienka"
  items: RoomConditionItem[]
}

export interface ProtocolPhoto {
  url: string
  caption?: string
  roomName?: string
}

export interface CreateProtocolInput {
  type: ProtocolType
  date: string       // ISO date
  meterReadings: ProtocolMeterReading[]
  keysHandedOver: ProtocolKey[]
  roomsCondition: RoomCondition[]
  generalNotes?: string
  photos?: ProtocolPhoto[]
}

export interface ProtocolWithRelations {
  id: string
  contractId: string
  type: ProtocolType
  date: string
  meterReadings: ProtocolMeterReading[]
  keysHandedOver: ProtocolKey[]
  roomsCondition: RoomCondition[]
  generalNotes: string | null
  photos: ProtocolPhoto[]
  pdfUrl: string | null
  createdAt: string
  contract: {
    id: string
    property: {
      name: string
      address: string
      city: string
    }
    tenant: {
      firstName: string
      lastName: string
    }
  }
}

// ============================================
// Annex Types (Aneksy do umów)
// ============================================

export type AnnexType = 'RENT_CHANGE' | 'EXTENSION' | 'OTHER'
export type AnnexStatus = 'DRAFT' | 'SIGNED'

export interface RentChangeData {
  previousRent: number
  newRent: number
}

export interface ExtensionChangeData {
  previousEndDate: string | null
  newEndDate: string | null
}

export type AnnexChanges = RentChangeData | ExtensionChangeData | Record<string, never>

export interface CreateAnnexInput {
  type: AnnexType
  effectiveDate: string  // ISO date
  changes: AnnexChanges
  customText?: string
}

export interface SignAnnexInput {
  action: 'sign'
}

export interface AnnexWithRelations {
  id: string
  contractId: string
  annexNumber: number
  type: AnnexType
  status: AnnexStatus
  effectiveDate: string
  changes: AnnexChanges
  customText: string | null
  pdfUrl: string | null
  signedAt: string | null
  createdAt: string
  contract: {
    id: string
    rentAmount: number
    endDate: string | null
    property: {
      name: string
      address: string
      city: string
    }
    tenant: {
      firstName: string
      lastName: string
    }
  }
}

// ============================================
// Condition labels (PL)
// ============================================

export const CONDITION_LABELS: Record<string, string> = {
  GOOD: 'Dobry',
  FAIR: 'Dostateczny',
  POOR: 'Zły',
  DAMAGED: 'Uszkodzony',
}

export const PROTOCOL_TYPE_LABELS: Record<ProtocolType, string> = {
  MOVE_IN: 'Wydanie lokalu',
  MOVE_OUT: 'Zwrot lokalu',
}

export const ANNEX_TYPE_LABELS: Record<AnnexType, string> = {
  RENT_CHANGE: 'Zmiana czynszu',
  EXTENSION: 'Przedłużenie umowy',
  OTHER: 'Inne postanowienia',
}

export const ANNEX_STATUS_LABELS: Record<AnnexStatus, string> = {
  DRAFT: 'Szkic',
  SIGNED: 'Podpisany',
}

// ============================================
// Default room templates (PL)
// ============================================

export const DEFAULT_ROOMS: RoomCondition[] = [
  {
    roomName: 'Pokój dzienny',
    items: [
      { name: 'Podłoga', condition: 'GOOD' },
      { name: 'Ściany', condition: 'GOOD' },
      { name: 'Okna', condition: 'GOOD' },
      { name: 'Oświetlenie', condition: 'GOOD' },
    ],
  },
  {
    roomName: 'Kuchnia',
    items: [
      { name: 'Podłoga', condition: 'GOOD' },
      { name: 'Ściany', condition: 'GOOD' },
      { name: 'Kuchenka', condition: 'GOOD' },
      { name: 'Zlewozmywak', condition: 'GOOD' },
      { name: 'Lodówka', condition: 'GOOD' },
    ],
  },
  {
    roomName: 'Łazienka',
    items: [
      { name: 'Podłoga', condition: 'GOOD' },
      { name: 'Ściany', condition: 'GOOD' },
      { name: 'Wanna/Prysznic', condition: 'GOOD' },
      { name: 'Umywalka', condition: 'GOOD' },
      { name: 'Toaleta', condition: 'GOOD' },
    ],
  },
  {
    roomName: 'Przedpokój',
    items: [
      { name: 'Podłoga', condition: 'GOOD' },
      { name: 'Ściany', condition: 'GOOD' },
      { name: 'Drzwi wejściowe', condition: 'GOOD' },
    ],
  },
]

export const DEFAULT_KEYS: ProtocolKey[] = [
  { type: 'Klucz do drzwi wejściowych', count: 2 },
  { type: 'Klucz do skrzynki pocztowej', count: 1 },
  { type: 'Klucz do bramy/furtki', count: 1 },
]