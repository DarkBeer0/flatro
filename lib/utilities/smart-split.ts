// lib/utilities/smart-split.ts
// Flatro — Time-Weighted Smart Split Algorithm
//
// Distributes utility costs among tenants proportionally to their
// active days within a billing period. Handles mid-month turnover,
// gap days (vacant periods), and multiple split methods.

import type { TenantPeriod, SplitResult, CostSplitMethod } from './types'

/**
 * Calculate time-weighted cost split for a billing period.
 *
 * Example: Period Jan 1–31, Tenant A leaves Jan 10, Tenant B enters Jan 15.
 *   Total occupied days: A=10, B=17 → sum=27
 *   A pays: 10/27 ≈ 37.0%
 *   B pays: 17/27 ≈ 63.0%
 *   Gap days (Jan 11–14): owner absorbs by default.
 *
 * @param absorbGapDays — if true (default), owner pays for days with no tenant.
 *   If false, cost is split across totalDays (tenants pay for gaps too).
 */
export function calculateSmartSplit(
  periodStart: Date,
  periodEnd: Date,
  totalCost: number,
  tenants: TenantPeriod[],
  options: {
    absorbGapDays?: boolean
    splitMethod?: CostSplitMethod
  } = {}
): SplitResult[] {
  const { absorbGapDays = true, splitMethod = 'BY_DAYS' } = options
  const totalDays = diffDays(periodStart, periodEnd) + 1 // inclusive

  if (totalCost <= 0 || totalDays <= 0) return []

  // Filter tenants that overlap with the period
  const activeTenants = tenants.filter(t =>
    calculateActiveDays(periodStart, periodEnd, t) > 0
  )

  if (activeTenants.length === 0) return []

  // ---- EQUAL split ----
  if (splitMethod === 'EQUAL') {
    const share = totalCost / activeTenants.length
    return activeTenants.map(t => ({
      tenantId: t.tenantId,
      activeDays: calculateActiveDays(periodStart, periodEnd, t),
      totalDays,
      shareRatio: roundPLN(1 / activeTenants.length),
      amount: roundPLN(share),
    }))
  }

  // ---- BY_PERSONS split ----
  // Each tenant's share is 1/N regardless of days, but we still track days
  if (splitMethod === 'BY_PERSONS') {
    const n = activeTenants.length
    const share = totalCost / n
    return activeTenants.map(t => ({
      tenantId: t.tenantId,
      activeDays: calculateActiveDays(periodStart, periodEnd, t),
      totalDays,
      shareRatio: roundPLN(1 / n),
      amount: roundPLN(share),
    }))
  }

  // ---- BY_DAYS split (default) ----
  const results: SplitResult[] = []
  let totalActiveDays = 0

  for (const tenant of activeTenants) {
    const activeDays = calculateActiveDays(periodStart, periodEnd, tenant)
    results.push({
      tenantId: tenant.tenantId,
      activeDays,
      totalDays,
      shareRatio: 0,
      amount: 0,
    })
    totalActiveDays += activeDays
  }

  const denominator = absorbGapDays ? totalActiveDays : totalDays
  if (denominator === 0) return []

  // Allocate amounts with rounding correction on last tenant
  let allocatedAmount = 0

  for (let i = 0; i < results.length; i++) {
    results[i].shareRatio = roundRatio(results[i].activeDays / denominator)

    if (i === results.length - 1) {
      // Last tenant gets remainder to avoid ±0.01 PLN rounding errors
      results[i].amount = roundPLN(totalCost - allocatedAmount)
    } else {
      results[i].amount = roundPLN(totalCost * results[i].shareRatio)
      allocatedAmount += results[i].amount
    }
  }

  return results
}

/**
 * Calculate how many days a tenant is active within a billing period.
 * Uses inclusive start, inclusive end.
 */
export function calculateActiveDays(
  periodStart: Date,
  periodEnd: Date,
  tenant: TenantPeriod
): number {
  const effectiveStart = maxDate(periodStart, tenant.leaseStart)
  const effectiveEnd = tenant.leaseEnd
    ? minDate(periodEnd, tenant.leaseEnd)
    : periodEnd

  if (effectiveStart > effectiveEnd) return 0

  return diffDays(effectiveStart, effectiveEnd) + 1 // inclusive
}

// ============================================
// Date helpers (UTC-safe, no time-of-day issues)
// ============================================

function diffDays(a: Date, b: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24
  // Normalize to start of day UTC to avoid DST issues
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.floor((utcB - utcA) / msPerDay)
}

function maxDate(a: Date, b: Date): Date {
  return a > b ? a : b
}

function minDate(a: Date, b: Date): Date {
  return a < b ? a : b
}

// ============================================
// Rounding helpers (PLN = 2 decimal places)
// ============================================

export function roundPLN(value: number): number {
  return Math.round(value * 100) / 100
}

function roundRatio(value: number): number {
  return Math.round(value * 10000) / 10000 // 4 decimal places for ratios
}