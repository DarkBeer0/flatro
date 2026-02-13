// lib/utilities/types.ts
// Flatro — Meters & Utilities Module — Shared Types

// ============================================
// Enums (mirror Prisma, for use in business logic)
// ============================================

export type MeterType = 'ELECTRICITY' | 'GAS' | 'WATER_COLD' | 'WATER_HOT' | 'HEATING'
export type MeterReadingType = 'REGULAR' | 'INITIAL' | 'FINAL' | 'METER_EXCHANGE'
export type MeterStatus = 'ACTIVE' | 'ARCHIVED' | 'DECOMMISSIONED'
export type FixedUtilityType = 'INTERNET' | 'GARBAGE' | 'ADMIN_FEE' | 'PARKING' | 'TV_CABLE' | 'SECURITY' | 'ELEVATOR' | 'OTHER'
export type SettlementStatus = 'DRAFT' | 'CALCULATED' | 'FINALIZED' | 'VOIDED'
export type BillingApproach = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL' | 'ADVANCE_PAYMENT'
export type CostSplitMethod = 'BY_DAYS' | 'BY_PERSONS' | 'EQUAL' | 'MANUAL'
export type LedgerEntryType = 'CHARGE' | 'ADVANCE_PAYMENT' | 'PAYMENT' | 'ADJUSTMENT' | 'CARRY_FORWARD'

// ============================================
// Domain Interfaces
// ============================================

export interface TenantPeriod {
  tenantId: string
  leaseStart: Date
  leaseEnd: Date | null
}

export interface SplitResult {
  tenantId: string
  activeDays: number
  totalDays: number
  shareRatio: number  // 0.0 — 1.0
  amount: number
}

export interface CalculatedItem {
  meterId?: string
  fixedUtilityId?: string
  label: string
  unit?: string
  prevReading?: number
  currReading?: number
  consumption?: number
  rate?: number
  periodCost?: number
  totalCost: number
  splitMethod: CostSplitMethod
}

export interface CalculatedSettlement {
  items: CalculatedItem[]
  shares: SplitResult[]
  totalAmount: number
  warnings: string[]
}

export interface CalculateSettlementInput {
  propertyId: string
  periodStart: Date
  periodEnd: Date
  approach: BillingApproach
}

export interface MeterExchangeInput {
  oldMeterId: string
  finalReading: number
  newMeterNumber?: string
  newSerialNumber?: string
  newInitialReading: number
}

// ============================================
// Labels / Display (Polish + English)
// ============================================

export const METER_TYPE_LABELS: Record<MeterType, { pl: string; en: string; unit: string }> = {
  ELECTRICITY: { pl: 'Prąd', en: 'Electricity', unit: 'kWh' },
  GAS:         { pl: 'Gaz', en: 'Gas', unit: 'm³' },
  WATER_COLD:  { pl: 'Woda zimna', en: 'Cold Water', unit: 'm³' },
  WATER_HOT:   { pl: 'Woda ciepła', en: 'Hot Water', unit: 'm³' },
  HEATING:     { pl: 'Ogrzewanie', en: 'Heating', unit: 'GJ' },
}

export const FIXED_UTILITY_LABELS: Record<FixedUtilityType, { pl: string; en: string }> = {
  INTERNET:   { pl: 'Internet', en: 'Internet' },
  GARBAGE:    { pl: 'Śmieci', en: 'Garbage' },
  ADMIN_FEE:  { pl: 'Czynsz administracyjny', en: 'Admin Fee' },
  PARKING:    { pl: 'Parking', en: 'Parking' },
  TV_CABLE:   { pl: 'Telewizja kablowa', en: 'Cable TV' },
  SECURITY:   { pl: 'Ochrona', en: 'Security' },
  ELEVATOR:   { pl: 'Winda', en: 'Elevator' },
  OTHER:      { pl: 'Inne', en: 'Other' },
}

export const BILLING_APPROACH_LABELS: Record<BillingApproach, { pl: string; en: string }> = {
  MONTHLY:          { pl: 'Miesięcznie', en: 'Monthly' },
  QUARTERLY:        { pl: 'Kwartalnie', en: 'Quarterly' },
  SEMI_ANNUAL:      { pl: 'Półrocznie', en: 'Semi-Annual' },
  ANNUAL:           { pl: 'Rocznie', en: 'Annual' },
  ADVANCE_PAYMENT:  { pl: 'Zaliczki', en: 'Advance Payment' },
}