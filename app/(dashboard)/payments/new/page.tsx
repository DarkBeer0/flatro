// app/(dashboard)/payments/new/page.tsx  (REBUILT)
// ============================================================
// Features:
//   - Mode toggle: Single payment vs. Recurring series
//   - Recurring: pick start month + number of months (or end month)
//   - Preview of generated payment dates before submitting
//   - Calls POST /api/payments       (single)
//   - Calls POST /api/payments/bulk  (recurring)
// ============================================================
'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, CreditCard, Calendar, RefreshCw, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useLocale } from '@/lib/i18n/context'

interface Tenant {
  id: string
  firstName: string
  lastName: string
  property: { id: string; name: string } | null
}

type PaymentMode = 'single' | 'recurring'

// ── Helpers ─────────────────────────────────────────────────

function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split('-').map(Number)
  const date = new Date(y, m - 1 + n, 1)
  return date.toISOString().slice(0, 7)
}

function monthsBetween(start: string, end: string): number {
  const [sy, sm] = start.split('-').map(Number)
  const [ey, em] = end.split('-').map(Number)
  return (ey - sy) * 12 + (em - sm) + 1
}

function formatMonthLabel(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('default', { month: 'long', year: 'numeric' })
}

function buildDueDate(ym: string, day: number): string {
  const [y, m] = ym.split('-').map(Number)
  const lastDay = new Date(y, m, 0).getDate()
  const clamped = Math.min(day, lastDay)
  return new Date(y, m - 1, clamped).toISOString().slice(0, 10)
}

// ── Component ────────────────────────────────────────────────

export default function NewPaymentPage() {
  const router = useRouter()
  const { t } = useLocale()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [mode, setMode] = useState<PaymentMode>('single')

  // Shared fields
  const [tenantId, setTenantId]     = useState('')
  const [type, setType]             = useState('RENT')
  const [amount, setAmount]         = useState('')
  const [notes, setNotes]           = useState('')
  const [dueDayOfMonth, setDueDay]  = useState(10)

  // Single-mode fields
  const [dueDate, setDueDate]   = useState('')
  const [period, setPeriod]     = useState('')

  // Recurring-mode fields
  const [startMonth, setStartMonth] = useState('')
  const [endMode, setEndMode]       = useState<'count' | 'endMonth'>('count')
  const [monthCount, setMonthCount] = useState(12)
  const [endMonth, setEndMonth]     = useState('')

  // ── Init defaults ──────────────────────────────────────────
  useEffect(() => {
    async function fetchTenants() {
      try {
        const res = await fetch('/api/tenants')
        if (res.ok) {
          const data = await res.json()
          setTenants(data.filter((t: any) => t.isActive))
        }
      } catch {}
    }
    fetchTenants()

    const now = new Date()
    const ym  = now.toISOString().slice(0, 7)
    setPeriod(ym)
    setStartMonth(ym)
    setEndMonth(addMonths(ym, 11))
    setDueDate(new Date(now.getFullYear(), now.getMonth(), 10).toISOString().slice(0, 10))
  }, [])

  // ── Derived: recurring preview ─────────────────────────────
  const recurringMonths = useMemo<string[]>(() => {
    if (!startMonth) return []
    const count = endMode === 'count'
      ? monthCount
      : endMonth ? monthsBetween(startMonth, endMonth) : 0
    if (count < 1 || count > 60) return []
    return Array.from({ length: count }, (_, i) => addMonths(startMonth, i))
  }, [startMonth, endMode, monthCount, endMonth])

  const previewDates = useMemo(() =>
    recurringMonths.map(ym => ({
      period: ym,
      label:  formatMonthLabel(ym),
      due:    buildDueDate(ym, dueDayOfMonth),
    })),
    [recurringMonths, dueDayOfMonth]
  )

  // ── Submit ─────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tenantId || !amount) return

    setLoading(true)
    setError(null)

    try {
      if (mode === 'single') {
        const res = await fetch('/api/payments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, type, amount, dueDate, period, notes }),
        })
        if (!res.ok) {
          const d = await res.json()
          throw new Error(d.error || 'Failed to create payment')
        }
      } else {
        // Recurring
        const res = await fetch('/api/payments/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tenantId,
            type,
            amount,
            notes,
            startMonth,
            months: recurringMonths.length,
            dueDayOfMonth,
          }),
        })
        if (!res.ok) {
          const d = await res.json()
          throw new Error(d.error || 'Failed to create recurring payments')
        }
      }

      router.push('/payments')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // ── UI ─────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/payments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Nowa płatność
          </h1>
          <p className="text-sm text-gray-500">Utwórz jednorazową lub cykliczną płatność</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Mode toggle */}
        <Card className="p-4">
          <Label className="text-sm font-medium mb-3 block">Tryb płatności</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                mode === 'single'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <CreditCard className="h-4 w-4" />
              Jednorazowa
            </button>
            <button
              type="button"
              onClick={() => setMode('recurring')}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                mode === 'recurring'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <RefreshCw className="h-4 w-4" />
              Cykliczna (serja)
            </button>
          </div>
        </Card>

        {/* Common fields */}
        <Card className="p-5 space-y-4">
          <h2 className="font-medium text-gray-900">Podstawowe informacje</h2>

          {/* Tenant */}
          <div>
            <Label htmlFor="tenantId">Najemca *</Label>
            <select
              id="tenantId"
              value={tenantId}
              onChange={e => setTenantId(e.target.value)}
              required
              className="w-full mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Wybierz najemcę...</option>
              {tenants.map(t => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName}
                  {t.property ? ` — ${t.property.name}` : ''}
                </option>
              ))}
            </select>
            {tenants.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">
                Brak aktywnych najemców.{' '}
                <Link href="/tenants/new" className="text-blue-600 underline">Dodaj najemcę</Link>
              </p>
            )}
          </div>

          {/* Type + Amount */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Typ *</Label>
              <select
                id="type"
                value={type}
                onChange={e => setType(e.target.value)}
                required
                className="w-full mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="RENT">Czynsz</option>
                <option value="UTILITIES">Media</option>
                <option value="DEPOSIT">Kaucja</option>
                <option value="OTHER">Inne</option>
              </select>
            </div>
            <div>
              <Label htmlFor="amount">Kwota (PLN) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="3500"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
                className="mt-1"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notatki</Label>
            <textarea
              id="notes"
              rows={2}
              placeholder="Dodatkowe informacje..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full mt-1 rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </Card>

        {/* Single mode: dates */}
        {mode === 'single' && (
          <Card className="p-5 space-y-4">
            <h2 className="font-medium text-gray-900">Daty</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="period">Okres</Label>
                <Input
                  id="period"
                  type="month"
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="dueDate">Termin płatności *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
            </div>
          </Card>
        )}

        {/* Recurring mode: schedule */}
        {mode === 'recurring' && (
          <Card className="p-5 space-y-4">
            <h2 className="font-medium text-gray-900 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Harmonogram cykliczny
            </h2>

            {/* Start month */}
            <div>
              <Label htmlFor="startMonth">Miesiąc początkowy *</Label>
              <Input
                id="startMonth"
                type="month"
                value={startMonth}
                onChange={e => setStartMonth(e.target.value)}
                required
                className="mt-1"
              />
            </div>

            {/* End mode toggle */}
            <div>
              <Label className="mb-2 block">Zakończenie serii</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setEndMode('count')}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    endMode === 'count'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Liczba miesięcy
                </button>
                <button
                  type="button"
                  onClick={() => setEndMode('endMonth')}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    endMode === 'endMonth'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  Data końcowa
                </button>
              </div>
            </div>

            {endMode === 'count' ? (
              <div>
                <Label htmlFor="monthCount">Liczba miesięcy (1–60) *</Label>
                <Input
                  id="monthCount"
                  type="number"
                  min={1}
                  max={60}
                  value={monthCount}
                  onChange={e => setMonthCount(parseInt(e.target.value) || 1)}
                  className="mt-1 w-32"
                />
              </div>
            ) : (
              <div>
                <Label htmlFor="endMonth">Miesiąc końcowy (włącznie) *</Label>
                <Input
                  id="endMonth"
                  type="month"
                  value={endMonth}
                  min={startMonth}
                  onChange={e => setEndMonth(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
            )}

            {/* Due day */}
            <div>
              <Label htmlFor="dueDay">Dzień terminu płatności</Label>
              <div className="flex items-center gap-3 mt-1">
                <Input
                  id="dueDay"
                  type="number"
                  min={1}
                  max={31}
                  value={dueDayOfMonth}
                  onChange={e => setDueDay(parseInt(e.target.value) || 10)}
                  className="w-24"
                />
                <span className="text-sm text-gray-500">dzień każdego miesiąca</span>
              </div>
            </div>

            {/* Preview */}
            {previewDates.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Podgląd — {previewDates.length} płatności
                  </span>
                  <Badge variant="secondary">
                    Łącznie: {(parseFloat(amount || '0') * previewDates.length).toFixed(2)} PLN
                  </Badge>
                </div>
                <div className="max-h-56 overflow-y-auto divide-y">
                  {previewDates.map((p, i) => (
                    <div key={p.period} className="flex justify-between items-center px-4 py-2 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 w-6 text-right">{i + 1}.</span>
                        <span className="font-medium capitalize">{p.label}</span>
                      </div>
                      <div className="flex items-center gap-4 text-gray-500">
                        <span>termin: {p.due}</span>
                        <span className="font-medium text-gray-900">
                          {parseFloat(amount || '0').toFixed(2)} PLN
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {previewDates.length === 0 && startMonth && (
              <p className="text-sm text-amber-600">
                Ustaw prawidłowy zakres, aby wyświetlić podgląd.
              </p>
            )}
          </Card>
        )}

        {/* Submit */}
        <div className="flex gap-3">
          <Link href="/payments" className="flex-1">
            <Button type="button" variant="outline" className="w-full">
              Anuluj
            </Button>
          </Link>
          <Button
            type="submit"
            className="flex-1"
            disabled={
              loading ||
              tenants.length === 0 ||
              (mode === 'recurring' && previewDates.length === 0)
            }
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Tworzenie...
              </>
            ) : mode === 'recurring' ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Utwórz {previewDates.length} płatności
              </>
            ) : (
              'Utwórz płatność'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}