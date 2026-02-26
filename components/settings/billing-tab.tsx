// components/settings/billing-tab.tsx
// Flatro V8 — Billing tab: current plan + upgrade cards

'use client'

import { useState, useEffect } from 'react'
import { Check, Loader2, Zap, Building2, Crown, ExternalLink, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PLANS, type SubscriptionPlan } from '@/lib/subscription'

// ── Types ─────────────────────────────────────────────────────────

interface BillingData {
  plan: SubscriptionPlan
  propertiesCount: number
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
}

// ── Plan icons ────────────────────────────────────────────────────

const PLAN_ICONS: Record<SubscriptionPlan, React.ReactNode> = {
  FREE: <Building2 className="h-5 w-5" />,
  PRO: <Zap className="h-5 w-5" />,
  BUSINESS: <Crown className="h-5 w-5" />,
}

const PLAN_COLORS: Record<SubscriptionPlan, { badge: string; border: string; btn: string }> = {
  FREE: {
    badge: 'bg-gray-100 text-gray-700',
    border: 'border-gray-200',
    btn: 'bg-gray-600 hover:bg-gray-700 text-white',
  },
  PRO: {
    badge: 'bg-blue-100 text-blue-700',
    border: 'border-blue-400 ring-2 ring-blue-200',
    btn: 'bg-blue-600 hover:bg-blue-700 text-white',
  },
  BUSINESS: {
    badge: 'bg-purple-100 text-purple-700',
    border: 'border-purple-300',
    btn: 'bg-purple-600 hover:bg-purple-700 text-white',
  },
}

// ── Main component ────────────────────────────────────────────────

export default function BillingTab() {
  const [billing, setBilling] = useState<BillingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [interval, setInterval] = useState<'monthly' | 'yearly'>('monthly')
  const [checkoutLoading, setCheckoutLoading] = useState<SubscriptionPlan | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)
  const [upgraded, setUpgraded] = useState(false)

  // ── Load current billing data ─────────────────────────────────
  useEffect(() => {
    // Check URL param for post-checkout redirect
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (params.get('upgraded') === '1') setUpgraded(true)
    }

    fetchBilling()
  }, [])

  async function fetchBilling() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/billing')
      if (!res.ok) throw new Error('Błąd ładowania danych')
      const data = await res.json()
      setBilling(data)
    } catch (err) {
      setError('Nie można załadować danych subskrypcji')
    } finally {
      setLoading(false)
    }
  }

  // ── Checkout ──────────────────────────────────────────────────
  async function handleUpgrade(plan: SubscriptionPlan) {
    if (plan === 'FREE' || checkoutLoading) return
    setCheckoutLoading(plan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, interval }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Błąd')
      }
    } catch (err) {
      alert('Nie można uruchomić płatności. Spróbuj ponownie.')
    } finally {
      setCheckoutLoading(null)
    }
  }

  // ── Manage subscription (portal) ─────────────────────────────
  async function handleManage() {
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        throw new Error(data.error || 'Błąd')
      }
    } catch {
      alert('Nie można otworzyć portalu płatności.')
    } finally {
      setPortalLoading(false)
    }
  }

  // ── Loading / error states ────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error || !billing) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <AlertCircle className="h-10 w-10 text-red-400" />
        <p className="text-sm text-gray-600">{error ?? 'Błąd ładowania'}</p>
        <Button variant="outline" size="sm" onClick={fetchBilling}>
          Spróbuj ponownie
        </Button>
      </div>
    )
  }

  const currentPlan = billing.plan
  const planCfg = PLANS[currentPlan]
  const limit = planCfg.maxProperties
  const usage = billing.propertiesCount

  return (
    <div className="space-y-8">
      {/* ── Post-upgrade success banner ── */}
      {upgraded && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-800 text-sm">
          <Check className="h-5 w-5 text-green-600 shrink-0" />
          <span>
            <strong>Plan aktywowany!</strong> Twój plan {currentPlan} jest teraz aktywny.
          </span>
        </div>
      )}

      {/* ── Current plan summary ── */}
      <div className="p-5 rounded-xl border bg-gradient-to-br from-white to-gray-50 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
              Aktualny plan
            </p>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-gray-900">
                {planCfg.name}
              </span>
              <span
                className={`px-2 py-0.5 text-xs font-semibold rounded-full ${PLAN_COLORS[currentPlan].badge}`}
              >
                Aktywny
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">{planCfg.description}</p>
          </div>

          {/* Usage meter */}
          <div className="text-right shrink-0">
            <p className="text-xs text-gray-500 mb-1">Nieruchomości</p>
            <p className="text-2xl font-bold text-gray-900">
              {usage}
              <span className="text-base font-normal text-gray-400">
                /{limit === null ? '∞' : limit}
              </span>
            </p>
            {limit !== null && (
              <div className="w-32 h-1.5 bg-gray-200 rounded-full mt-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    usage >= limit
                      ? 'bg-red-500'
                      : usage / limit > 0.75
                      ? 'bg-yellow-400'
                      : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min((usage / limit) * 100, 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Manage subscription link */}
        {billing.stripeCustomerId && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManage}
              disabled={portalLoading}
              className="text-xs"
            >
              {portalLoading ? (
                <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
              ) : (
                <ExternalLink className="h-3 w-3 mr-1.5" />
              )}
              Zarządzaj subskrypcją / faktury
            </Button>
          </div>
        )}
      </div>

      {/* ── Billing interval toggle ── */}
      {currentPlan !== 'BUSINESS' && (
        <>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Zmień plan</h3>
            <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg text-sm">
              <button
                onClick={() => setInterval('monthly')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  interval === 'monthly'
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Miesięcznie
              </button>
              <button
                onClick={() => setInterval('yearly')}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  interval === 'yearly'
                    ? 'bg-white shadow-sm text-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Rocznie
                <span className="ml-1 text-xs text-green-600 font-semibold">-37%</span>
              </button>
            </div>
          </div>

          {/* ── Plan cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(Object.keys(PLANS) as SubscriptionPlan[]).map((planKey) => {
              const cfg = PLANS[planKey]
              const colors = PLAN_COLORS[planKey]
              const isCurrent = planKey === currentPlan
              const isLoading = checkoutLoading === planKey
              const price =
                interval === 'yearly' ? cfg.yearlyPricePLN : cfg.monthlyPricePLN

              return (
                <div
                  key={planKey}
                  className={`relative flex flex-col p-5 rounded-xl border-2 transition-shadow hover:shadow-md ${
                    isCurrent ? colors.border : 'border-gray-200'
                  } ${cfg.highlighted && !isCurrent ? 'bg-blue-50/40' : 'bg-white'}`}
                >
                  {cfg.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="px-3 py-0.5 text-xs font-bold bg-blue-600 text-white rounded-full shadow">
                        Popularny
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <span className={PLAN_COLORS[planKey].badge.split(' ')[0] + ' p-1.5 rounded-lg'}>
                      {PLAN_ICONS[planKey]}
                    </span>
                    <span className="font-bold text-gray-900 text-lg">{cfg.name}</span>
                    {isCurrent && (
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-semibold ${colors.badge}`}>
                        Aktualny
                      </span>
                    )}
                  </div>

                  <div className="mb-4">
                    {price === 0 ? (
                      <p className="text-3xl font-extrabold text-gray-900">
                        Darmowy
                      </p>
                    ) : (
                      <p className="text-3xl font-extrabold text-gray-900">
                        {interval === 'yearly'
                          ? `PLN${Math.round(price / 12)}`
                          : `PLN${price}`}
                        <span className="text-sm font-normal text-gray-400">/mies.</span>
                      </p>
                    )}
                    {interval === 'yearly' && price > 0 && (
                      <p className="text-xs text-green-600 mt-0.5">
                        {price} PLN rozliczane rocznie
                      </p>
                    )}
                  </div>

                  <ul className="space-y-2 mb-5 flex-1">
                    {cfg.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  {isCurrent ? (
                    <div className="text-center text-sm text-gray-500 py-2 border border-gray-200 rounded-lg">
                      Aktualny plan
                    </div>
                  ) : planKey === 'FREE' ? (
                    <div className="text-center text-xs text-gray-400 py-2">
                      Powróć, anulując subskrypcję
                    </div>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(planKey)}
                      disabled={!!checkoutLoading}
                      className={`w-full py-2.5 px-4 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-colors ${colors.btn} disabled:opacity-60 disabled:cursor-not-allowed`}
                    >
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          Przejdź na {cfg.name}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* ── BUSINESS current plan — just manage ── */}
      {currentPlan === 'BUSINESS' && (
        <div className="text-center py-4">
          <p className="text-sm text-gray-500">
            Jesteś na najwyższym planie. Zarządzaj subskrypcją poniżej.
          </p>
        </div>
      )}

      {/* ── FAQ / info ── */}
      <div className="text-xs text-gray-400 space-y-1 pt-2 border-t border-gray-100">
        <p>• Płatności obsługiwane przez Stripe. Dane karty nie są przechowywane przez Flatro.</p>
        <p>• Możesz anulować subskrypcję w dowolnym momencie przez portal płatności.</p>
        <p>• Po anulowaniu plan aktywny do końca okresu rozliczeniowego.</p>
      </div>
    </div>
  )
}