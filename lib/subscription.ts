// lib/subscription.ts
// Flatro — Subscription plan definitions and helpers (V8)

// ─── Plan configuration ───────────────────────────────────────────

export type SubscriptionPlan = 'FREE' | 'PRO' | 'BUSINESS'

export interface PlanConfig {
  name: string
  description: string
  maxProperties: number | null // null = unlimited
  monthlyPriceEUR: number
  yearlyPriceEUR: number
  stripePriceIdMonthly: string | null
  stripePriceIdYearly: string | null
  features: string[]
  highlighted?: boolean
}

export const PLANS: Record<SubscriptionPlan, PlanConfig> = {
  FREE: {
    name: 'Free',
    description: 'Dla właścicieli zaczynających',
    maxProperties: 3,
    monthlyPriceEUR: 0,
    yearlyPriceEUR: 0,
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    features: [
      'Do 3 nieruchomości',
      'Zarządzanie najemcami',
      'Podstawowe raporty',
      'Wiadomości',
    ],
  },
  PRO: {
    name: 'Pro',
    description: 'Dla aktywnych właścicieli',
    maxProperties: 20,
    monthlyPriceEUR: 19,
    yearlyPriceEUR: 190,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? '',
    stripePriceIdYearly: process.env.STRIPE_PRICE_PRO_YEARLY ?? '',
    features: [
      'Do 20 nieruchomości',
      'Rozliczenia mediów',
      'Zarządzanie zgłoszeniami',
      'Powiadomienia email',
      'Priorytetowe wsparcie',
    ],
    highlighted: true,
  },
  BUSINESS: {
    name: 'Business',
    description: 'Dla firm i zarządców',
    maxProperties: null,
    monthlyPriceEUR: 49,
    yearlyPriceEUR: 490,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_BUSINESS_MONTHLY ?? '',
    stripePriceIdYearly: process.env.STRIPE_PRICE_BUSINESS_YEARLY ?? '',
    features: [
      'Nieograniczone nieruchomości',
      'Zaawansowane raporty',
      'API dostęp',
      'Dedykowany opiekun',
      'White-label opcje',
    ],
  },
}

// ─── Helpers ─────────────────────────────────────────────────────

/** How many properties can this plan hold? null = unlimited */
export function getPlanLimit(plan: SubscriptionPlan): number | null {
  return PLANS[plan].maxProperties
}

/** Check if adding one more property is allowed */
export function canAddProperty(
  plan: SubscriptionPlan,
  currentCount: number
): { allowed: boolean; limit: number | null; current: number } {
  const limit = getPlanLimit(plan)
  return {
    allowed: limit === null || currentCount < limit,
    limit,
    current: currentCount,
  }
}

/** Map Stripe price ID back to plan + interval */
export function planFromPriceId(
  priceId: string
): { plan: SubscriptionPlan; interval: 'monthly' | 'yearly' } | null {
  for (const [key, cfg] of Object.entries(PLANS) as [SubscriptionPlan, PlanConfig][]) {
    if (priceId === cfg.stripePriceIdMonthly) return { plan: key, interval: 'monthly' }
    if (priceId === cfg.stripePriceIdYearly) return { plan: key, interval: 'yearly' }
  }
  return null
}