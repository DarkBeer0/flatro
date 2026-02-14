// app/(tenant)/tenant/balance/page.tsx
// Flatro — Tenant Balance & Settlements ("Moje media")
// Shows: current saldo, settlement list, ledger, settlement detail + mark as paid
'use client'

import { useEffect, useState } from 'react'
import {
  Loader2, Wallet, Calendar, ChevronRight, Check,
  AlertTriangle, Clock, ArrowDown, ArrowUp, Eye,
  CheckCircle2, XCircle, FileText, Download, X,
  ChevronLeft, Receipt, TrendingDown, TrendingUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// ============================================
// Types
// ============================================

type BalanceStatus = 'OWING' | 'CREDIT' | 'SETTLED'
type LedgerEntryType = 'CHARGE' | 'ADVANCE_PAYMENT' | 'PAYMENT' | 'ADJUSTMENT' | 'CARRY_FORWARD'

interface BalanceData {
  tenant: { id: string; name: string }
  property: { id: string; name: string; address: string }
  balance: {
    amount: number
    status: BalanceStatus
    asOf: string | null
  }
  settlements: SettlementSummary[]
  ledger: LedgerEntry[]
}

interface SettlementSummary {
  id: string           // shareId
  settlementId: string
  period: { start: string; end: string }
  title: string | null
  activeDays: number
  totalDays: number
  shareRatio: number
  amount: number
  advancesPaid: number
  balanceDue: number
  isPaid: boolean
  hasInvoice: boolean
  notes: string | null
}

interface LedgerEntry {
  id: string
  entryType: LedgerEntryType
  amount: number
  description: string
  balanceAfter: number
  createdAt: string
}

interface SettlementDetail {
  id: string
  settlement: {
    id: string
    title: string | null
    period: { start: string; end: string }
    approach: string
    hasInvoice: boolean
    invoiceUrl: string | null
  }
  items: {
    id: string
    utilityLabel: string
    unitLabel: string | null
    consumption: number | null
    snapshotRate: number | null
    periodCost: number | null
    totalCost: number
  }[]
  share: {
    activeDays: number
    totalDays: number
    shareRatio: number
    calculatedAmount: number
    adjustedAmount: number | null
    finalAmount: number
    advancesPaid: number
    balanceDue: number
    isPaid: boolean
    paidAt: string | null
    notes: string | null
  }
}

// ============================================
// Constants
// ============================================

const BALANCE_STATUS_CONFIG: Record<BalanceStatus, { label: string; color: string; icon: typeof Wallet }> = {
  OWING:   { label: 'Do zapłaty', color: 'text-amber-600', icon: TrendingUp },
  CREDIT:  { label: 'Nadpłata', color: 'text-green-600', icon: TrendingDown },
  SETTLED: { label: 'Rozliczone', color: 'text-gray-600', icon: CheckCircle2 },
}

const LEDGER_TYPE_CONFIG: Record<LedgerEntryType, { label: string; color: string; bgColor: string; icon: typeof ArrowUp }> = {
  CHARGE:           { label: 'Naliczenie', color: 'text-red-600', bgColor: 'bg-red-100', icon: ArrowUp },
  ADVANCE_PAYMENT:  { label: 'Zaliczka', color: 'text-blue-600', bgColor: 'bg-blue-100', icon: ArrowDown },
  PAYMENT:          { label: 'Wpłata', color: 'text-green-600', bgColor: 'bg-green-100', icon: ArrowDown },
  ADJUSTMENT:       { label: 'Korekta', color: 'text-purple-600', bgColor: 'bg-purple-100', icon: FileText },
  CARRY_FORWARD:    { label: 'Przeniesienie', color: 'text-gray-600', bgColor: 'bg-gray-100', icon: ChevronRight },
}

const APPROACH_LABELS: Record<string, string> = {
  MONTHLY: 'Miesięcznie',
  QUARTERLY: 'Kwartalnie',
  SEMI_ANNUAL: 'Półrocznie',
  ANNUAL: 'Rocznie',
  ADVANCE_PAYMENT: 'Zaliczki',
}

// ============================================
// Main Page
// ============================================

type ViewMode = 'overview' | 'detail'

export default function TenantBalancePage() {
  const [data, setData] = useState<BalanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('overview')
  const [selectedShareId, setSelectedShareId] = useState<string | null>(null)
  const [tab, setTab] = useState<'settlements' | 'ledger'>('settlements')

  useEffect(() => { fetchBalance() }, [])

  async function fetchBalance() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/tenant/balance')
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || 'Nie udało się pobrać danych')
      }
      setData(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił błąd')
    } finally {
      setLoading(false)
    }
  }

  const openDetail = (shareId: string) => {
    setSelectedShareId(shareId)
    setViewMode('detail')
  }

  const backToOverview = () => {
    setViewMode('overview')
    setSelectedShareId(null)
    fetchBalance() // refresh after potential payment
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-green-600" />
    </div>
  )

  if (error) return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <AlertTriangle className="h-12 w-12 mx-auto text-amber-400 mb-4" />
      <h2 className="text-lg font-semibold text-gray-900 mb-2">Brak danych</h2>
      <p className="text-gray-500 mb-4">{error}</p>
      <Button variant="outline" onClick={fetchBalance}>Spróbuj ponownie</Button>
    </div>
  )

  if (!data) return null

  // Detail view
  if (viewMode === 'detail' && selectedShareId) {
    return (
      <SettlementDetailView
        shareId={selectedShareId}
        onBack={backToOverview}
      />
    )
  }

  // Overview
  const balanceCfg = BALANCE_STATUS_CONFIG[data.balance.status]
  const BalanceIcon = balanceCfg.icon
  const unpaidSettlements = data.settlements.filter(s => !s.isPaid)
  const paidSettlements = data.settlements.filter(s => s.isPaid)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Moje media</h1>
        <p className="text-sm text-gray-500">
          {data.property.name} — {data.property.address}
        </p>
      </div>

      {/* Balance Card */}
      <Card className={`p-5 mb-6 ${
        data.balance.status === 'OWING' ? 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200' :
        data.balance.status === 'CREDIT' ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-200' :
        'bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200'
      }`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">Aktualne saldo</p>
            <p className={`text-3xl font-bold ${balanceCfg.color}`}>
              {data.balance.amount > 0 ? '+' : ''}{data.balance.amount.toFixed(2)} zł
            </p>
            <div className="flex items-center gap-1.5 mt-1">
              <BalanceIcon className={`h-4 w-4 ${balanceCfg.color}`} />
              <span className={`text-sm font-medium ${balanceCfg.color}`}>{balanceCfg.label}</span>
            </div>
          </div>
          <div className={`p-3 rounded-xl ${
            data.balance.status === 'OWING' ? 'bg-amber-100' :
            data.balance.status === 'CREDIT' ? 'bg-green-100' : 'bg-gray-100'
          }`}>
            <Wallet className={`h-8 w-8 ${balanceCfg.color}`} />
          </div>
        </div>
        {data.balance.asOf && (
          <p className="text-xs text-gray-400 mt-2">
            Stan na: {fmtDateTime(data.balance.asOf)}
          </p>
        )}
      </Card>

      {/* Unpaid Alert */}
      {unpaidSettlements.length > 0 && (
        <Card className="p-4 mb-4 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Masz {unpaidSettlements.length} nieopłacone rozliczeni{unpaidSettlements.length === 1 ? 'e' : 'a'}
              </p>
              <p className="text-xs text-amber-600 mt-0.5">
                Łącznie do zapłaty: {unpaidSettlements.reduce((s, x) => s + x.balanceDue, 0).toFixed(2)} zł
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => setTab('settlements')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'settlements' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Rozliczenia
          {data.settlements.length > 0 && (
            <span className="ml-1 text-xs opacity-60">({data.settlements.length})</span>
          )}
        </button>
        <button
          onClick={() => setTab('ledger')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'ledger' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Księga sald
          {data.ledger.length > 0 && (
            <span className="ml-1 text-xs opacity-60">({data.ledger.length})</span>
          )}
        </button>
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* TAB: Settlements                        */}
      {/* ═══════════════════════════════════════ */}
      {tab === 'settlements' && (
        <>
          {data.settlements.length === 0 ? (
            <Card className="p-8 text-center">
              <Receipt className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Brak rozliczeń</h3>
              <p className="text-gray-500">Nie masz jeszcze żadnych rozliczeń mediów.</p>
            </Card>
          ) : (
            <div className="space-y-3">
              {/* Unpaid first */}
              {unpaidSettlements.length > 0 && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                    Do zapłaty ({unpaidSettlements.length})
                  </p>
                  {unpaidSettlements.map(s => (
                    <SettlementCard key={s.id} settlement={s} onOpen={() => openDetail(s.id)} />
                  ))}
                </>
              )}

              {/* Paid */}
              {paidSettlements.length > 0 && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 pt-3">
                    Opłacone ({paidSettlements.length})
                  </p>
                  {paidSettlements.map(s => (
                    <SettlementCard key={s.id} settlement={s} onOpen={() => openDetail(s.id)} />
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* TAB: Ledger                             */}
      {/* ═══════════════════════════════════════ */}
      {tab === 'ledger' && (
        <>
          {data.ledger.length === 0 ? (
            <Card className="p-8 text-center">
              <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Brak wpisów</h3>
              <p className="text-gray-500">Księga sald jest pusta.</p>
            </Card>
          ) : (
            <div className="space-y-2">
              {data.ledger.map(entry => {
                const cfg = LEDGER_TYPE_CONFIG[entry.entryType]
                const EntryIcon = cfg.icon
                const isNegative = entry.amount < 0
                return (
                  <Card key={entry.id} className="p-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${cfg.bgColor} shrink-0`}>
                        <EntryIcon className={`h-4 w-4 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 truncate">{entry.description}</p>
                          <p className={`text-sm font-bold shrink-0 ml-2 ${
                            isNegative ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {isNegative ? '' : '+'}{entry.amount.toFixed(2)} zł
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Badge className={`${cfg.bgColor} ${cfg.color} text-[10px] px-1.5 py-0`}>
                              {cfg.label}
                            </Badge>
                            <span>{fmtDateTime(entry.createdAt)}</span>
                          </div>
                          <span className="text-xs text-gray-400">
                            Saldo: {entry.balanceAfter.toFixed(2)} zł
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ============================================
// Settlement Card (list item)
// ============================================

function SettlementCard({
  settlement: s,
  onOpen,
}: {
  settlement: SettlementSummary
  onOpen: () => void
}) {
  const period = `${fmtDate(s.period.start)} — ${fmtDate(s.period.end)}`

  return (
    <Card
      className={`p-4 cursor-pointer transition-shadow hover:shadow-md ${
        s.isPaid ? 'opacity-70' : ''
      }`}
      onClick={onOpen}
    >
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900 truncate">
              {s.title || `Rozliczenie ${period}`}
            </h3>
            {s.isPaid ? (
              <Badge className="bg-green-100 text-green-700 shrink-0">
                <CheckCircle2 className="h-3 w-3 mr-1" />Opłacone
              </Badge>
            ) : (
              <Badge className="bg-amber-100 text-amber-700 shrink-0">
                <Clock className="h-3 w-3 mr-1" />Do zapłaty
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />{period}
            </span>
            <span>{s.activeDays}/{s.totalDays} dni ({(s.shareRatio * 100).toFixed(0)}%)</span>
          </div>
          {s.notes && <p className="text-xs text-gray-400 mt-1 italic">{s.notes}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-3">
          <div className="text-right">
            <p className={`text-lg font-bold ${s.isPaid ? 'text-gray-500' : 'text-gray-900'}`}>
              {s.balanceDue.toFixed(2)} zł
            </p>
            {s.advancesPaid > 0 && (
              <p className="text-xs text-green-600">-{s.advancesPaid.toFixed(2)} zł zaliczki</p>
            )}
          </div>
          <ChevronRight className="h-5 w-5 text-gray-300" />
        </div>
      </div>
    </Card>
  )
}

// ============================================
// Settlement Detail View (Tenant)
// ============================================

function SettlementDetailView({
  shareId,
  onBack,
}: {
  shareId: string
  onBack: () => void
}) {
  const [detail, setDetail] = useState<SettlementDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fetchDetail() }, [shareId])

  async function fetchDetail() {
    setLoading(true)
    try {
      const res = await fetch(`/api/tenant/settlements/${shareId}`)
      if (!res.ok) { const d = await res.json(); throw new Error(d.error) }
      setDetail(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkPaid = async () => {
    if (!confirm('Potwierdzasz opłacenie tego rozliczenia? Wpis zostanie zapisany w księdze sald.')) return
    setMarking(true)
    try {
      const res = await fetch(`/api/tenant/settlements/${shareId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_paid' }),
      })
      const d = await res.json()
      if (!res.ok) throw new Error(d.error)
      fetchDetail() // refresh
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Błąd')
    } finally {
      setMarking(false)
    }
  }

  if (loading) return (
    <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>
  )

  if (error || !detail) return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <AlertTriangle className="h-12 w-12 mx-auto text-amber-400 mb-4" />
      <p className="text-gray-500 mb-4">{error || 'Nie znaleziono rozliczenia'}</p>
      <Button variant="outline" onClick={onBack}>Powrót</Button>
    </div>
  )

  const { settlement: sett, items, share } = detail
  const period = `${fmtDate(sett.period.start)} — ${fmtDate(sett.period.end)}`
  const totalItemsCost = items.reduce((s, i) => s + i.totalCost, 0)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Back */}
      <button onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ChevronLeft className="h-4 w-4" />Powrót do listy
      </button>

      {/* Header */}
      <Card className="p-5 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              {sett.title || `Rozliczenie ${period}`}
            </h1>
            <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{period}</span>
              <span>{APPROACH_LABELS[sett.approach] || sett.approach}</span>
            </div>
          </div>
          {share.isPaid ? (
            <Badge className="bg-green-100 text-green-700 text-sm px-3 py-1">
              <CheckCircle2 className="h-4 w-4 mr-1" />Opłacone
            </Badge>
          ) : (
            <Badge className="bg-amber-100 text-amber-700 text-sm px-3 py-1">
              <Clock className="h-4 w-4 mr-1" />Do zapłaty
            </Badge>
          )}
        </div>

        {/* Share summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-xs text-gray-500">Twój udział</p>
            <p className="font-bold text-gray-900">{(share.shareRatio * 100).toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Dni</p>
            <p className="font-bold text-gray-900">{share.activeDays} / {share.totalDays}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Kwota naliczona</p>
            <p className="font-bold text-gray-900">{share.finalAmount.toFixed(2)} zł</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Do zapłaty</p>
            <p className={`font-bold ${share.balanceDue > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {share.balanceDue.toFixed(2)} zł
            </p>
          </div>
        </div>

        {share.adjustedAmount !== null && share.adjustedAmount !== share.calculatedAmount && (
          <p className="text-xs text-gray-400 mt-2">
            Kwota obliczona: {share.calculatedAmount.toFixed(2)} zł →
            Skorygowana: {share.adjustedAmount.toFixed(2)} zł
          </p>
        )}
        {share.advancesPaid > 0 && (
          <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
            <ArrowDown className="h-3.5 w-3.5" />
            Zaliczki odliczone: -{share.advancesPaid.toFixed(2)} zł
          </p>
        )}
        {share.notes && (
          <p className="text-sm text-gray-500 mt-2 italic border-l-2 border-gray-300 pl-3">
            {share.notes}
          </p>
        )}
        {share.paidAt && (
          <p className="text-xs text-green-600 mt-2">
            Opłacono: {fmtDateTime(share.paidAt)}
          </p>
        )}
      </Card>

      {/* Items */}
      <Card className="p-4 mb-4">
        <h3 className="font-semibold text-gray-900 mb-3">Szczegóły rozliczenia</h3>
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">{item.utilityLabel}</p>
                {item.consumption !== null && (
                  <p className="text-sm text-gray-500">
                    Zużycie: {item.consumption.toFixed(2)} {item.unitLabel || ''}
                    {item.snapshotRate !== null && ` × ${item.snapshotRate.toFixed(4)} zł`}
                  </p>
                )}
                {item.periodCost !== null && item.consumption === null && (
                  <p className="text-sm text-gray-500">Opłata stała</p>
                )}
              </div>
              <p className="font-bold text-gray-900">{item.totalCost.toFixed(2)} zł</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 mt-3 border-t">
          <p className="font-semibold text-gray-900">Razem (cała nieruchomość)</p>
          <p className="text-lg font-bold text-gray-900">{totalItemsCost.toFixed(2)} zł</p>
        </div>
        <div className="flex items-center justify-between pt-1">
          <p className="text-sm text-gray-500">Twój udział ({(share.shareRatio * 100).toFixed(1)}%)</p>
          <p className="text-lg font-bold text-green-700">{share.finalAmount.toFixed(2)} zł</p>
        </div>
      </Card>

      {/* Mark as Paid */}
      {!share.isPaid && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-green-800">Opłać rozliczenie</p>
              <p className="text-sm text-green-600 mt-0.5">
                Potwierdź przelew na kwotę {share.balanceDue.toFixed(2)} zł
              </p>
            </div>
            <Button
              onClick={handleMarkPaid}
              disabled={marking}
              className="bg-green-600 hover:bg-green-700"
            >
              {marking
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Przetwarzanie...</>
                : <><Check className="h-4 w-4 mr-2" />Potwierdź opłatę</>}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}

// ============================================
// Helpers
// ============================================

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

function fmtDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  })
}