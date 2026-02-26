// lib/billing/types.ts
// Flatro V10 — Billing Documents — shared TypeScript types

// ─── Enums (mirror Prisma) ────────────────────────────────────

export type BillingDocumentType =
  | 'FAKTURA_VAT'
  | 'FAKTURA_BEZ_VAT'
  | 'RACHUNEK'
  | 'NOTA_OBCIAZENIOWA'

export type BillingDocumentStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PAID'
  | 'CANCELLED'

export type NumberingCycle = 'MONTHLY' | 'YEARLY'

export type VatRate =
  | 0.23    // 23%
  | 0.08    // 8%
  | 0.05    // 5%
  | 0.00    // 0%
  | 'zw.'   // zwolniony (VAT-exempt, art. 43)
  | 'np.'   // nie podlega opodatkowaniu

// ─── Line item ────────────────────────────────────────────────

export interface BillingLineItem {
  id: string
  description: string   // e.g. "Czynsz najmu — maj 2026"
  netAmount: number
  vatRate: VatRate
  grossAmount: number
}

// ─── Party snapshots ─────────────────────────────────────────

export interface SellerSnapshot {
  name: string          // Imię i nazwisko lub nazwa firmy
  address: string       // Ulica, nr, kod, miasto
  nip?: string          // NIP (dla firm) — 10 cyfr
  pesel?: string        // PESEL (dla os. fizycznych)
  iban?: string         // Numer rachunku bankowego
  bankName?: string
  accountHolder?: string
}

export interface BuyerSnapshot {
  name: string
  address: string
  nip?: string
  pesel?: string
}

// ─── Main document shape ──────────────────────────────────────

export interface BillingDocument {
  id: string
  ownerId: string
  tenantId: string
  contractId?: string | null

  type: BillingDocumentType
  number: string

  issueDate: string  // ISO string
  saleDate: string
  dueDate: string

  items: BillingLineItem[]

  totalNet: number
  totalVat: number
  totalGross: number

  status: BillingDocumentStatus
  remarks?: string | null

  sellerSnapshot: SellerSnapshot
  buyerSnapshot: BuyerSnapshot

  pdfUrl?: string | null

  issuedAt?: string | null
  paidAt?: string | null
  cancelledAt?: string | null
  createdAt: string
  updatedAt: string

  // Joined
  owner?: {
    firstName?: string | null
    lastName?: string | null
  }
  tenant?: {
    firstName: string
    lastName: string
    email?: string | null
    property?: {
      name: string
      address: string
      city: string
    } | null
  }
}

// ─── Create / Update DTOs ────────────────────────────────────

export interface CreateBillingDocumentInput {
  tenantId: string
  contractId?: string
  type: BillingDocumentType
  issueDate: string
  saleDate: string
  dueDate: string
  items: Omit<BillingLineItem, 'id'>[]
  remarks?: string
  numberingCycle?: NumberingCycle
}

export interface UpdateBillingDocumentInput {
  issueDate?: string
  saleDate?: string
  dueDate?: string
  items?: Omit<BillingLineItem, 'id'>[]
  remarks?: string
}

// ─── UI / display helpers ────────────────────────────────────

export const DOCUMENT_TYPE_LABELS: Record<BillingDocumentType, string> = {
  FAKTURA_VAT:       'Faktura VAT',
  FAKTURA_BEZ_VAT:   'Faktura (zwolniona z VAT)',
  RACHUNEK:          'Rachunek',
  NOTA_OBCIAZENIOWA: 'Nota obciążeniowa',
}

export const DOCUMENT_TYPE_PREFIX: Record<BillingDocumentType, string> = {
  FAKTURA_VAT:       'FV',
  FAKTURA_BEZ_VAT:   'FBV',
  RACHUNEK:          'R',
  NOTA_OBCIAZENIOWA: 'NO',
}

export const DOCUMENT_STATUS_LABELS: Record<BillingDocumentStatus, string> = {
  DRAFT:     'Szkic',
  ISSUED:    'Wystawiony',
  PAID:      'Opłacony',
  CANCELLED: 'Anulowany',
}

export const DEFAULT_VAT_EXEMPT_REMARK =
  'Zwolnione z podatku VAT na podstawie art. 43 ust. 1 pkt 36 ustawy z dnia 11 marca 2004 r. ' +
  'o podatku od towarów i usług (najem lokali mieszkalnych na cele mieszkaniowe).'

// ─── Common service presets ──────────────────────────────────

export const COMMON_SERVICE_DESCRIPTIONS = [
  'Czynsz najmu',
  'Zaliczka na media (woda, gaz, prąd)',
  'Zaliczka na ogrzewanie',
  'Opłata administracyjna',
  'Czynsz + zaliczka na media',
  'Opłata za wodę',
  'Opłata za gaz',
  'Opłata za energię elektryczną',
  'Opłata za śmieci',
  'Kaucja (zwrot)',
  'Inne',
] as const