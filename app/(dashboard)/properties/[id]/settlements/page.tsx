// app/(dashboard)/properties/[id]/settlements/page.tsx
// Flatro — Settlement Wizard + List (Owner)
// Key feature: period → preview → DRAFT → review → finalize
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Loader2, Calculator, FileText, Check,
  X, AlertTriangle, ChevronRight, ChevronLeft, Eye,
  Lock, Unlock, Ban, Calendar, Users, Zap, Flame,
  Droplets, Thermometer, Wifi, Recycle, ArrowUpDown,
  Clock, DollarSign, CheckCircle2, XCircle, BarChart3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ============================================
// Types
// ============================================

type SettlementStatus = 'DRAFT' | 'CALCULATED' | 'FINALIZED' | 'VOIDED'
type BillingApproach = 'MONTHLY' | 'QUARTERLY' | 'SEMI_ANNUAL' | 'ANNUAL' | 'ADVANCE_PAYMENT'

interface SettlementListItem {
  id: string
  propertyId: string
  periodStart: string
  periodEnd: string
  title: string | null
  approach: BillingApproach
  totalAmount: number
  status: SettlementStatus
  finalizedAt: string | null
  voidedAt: string | null
  createdAt: string
  items: { id: string; utilityLabel: string; totalCost: number }[]
  shares: { id: string; tenantId: string; finalAmount: number; isPaid: boolean }[]
  _count: { items: number; shares: number }
}

interface PreviewItem {
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
  splitMethod: string
}

interface PreviewShare {
  tenantId: string
  tenantName: string
  activeDays: number
  totalDays: number
  shareRatio: number
  amount: number
  advancesPaid?: number
  balanceDue?: number
}

interface PreviewResult {
  preview: boolean
  property: string
  period: { start: string; end: string }
  approach: string
  items: PreviewItem[]
  shares: PreviewShare[]
  totalAmount: number
  warnings: string[]
}

interface SettlementDetail {
  id: string
  periodStart: string
  periodEnd: string
  title: string | null
  approach: BillingApproach
  totalAmount: number
  status: SettlementStatus
  invoiceNumber: string | null
  finalizedAt: string | null
  voidedAt: string | null
  voidReason: string | null
  notes: string | null
  createdAt: string
  property: { id: string; name: string; address: string }
  items: {
    id: string
    utilityLabel: string
    unitLabel: string | null
    prevReading: number | null
    currReading: number | null
    consumption: number | null
    snapshotRate: number | null
    totalCost: number
    meter: { id: string; type: string; meterNumber: string | null } | null
    fixedUtility: { id: string; type: string; name: string } | null
  }[]
  shares: {
    id: string
    tenantId: string
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
    ownerNotes: string | null
    tenant: { id: string; firstName: string; lastName: string; email: string | null }
  }[]
}

// ============================================
// Constants
// ============================================

const STATUS_CONFIG: Record<SettlementStatus, { label: string; color: string; icon: typeof FileText }> = {
  DRAFT:      { label: 'Szkic', color: 'bg-gray-100 text-gray-700', icon: FileText },
  CALCULATED: { label: 'Obliczone', color: 'bg-blue-100 text-blue-700', icon: Calculator },
  FINALIZED:  { label: 'Zatwierdzone', color: 'bg-green-100 text-green-700', icon: Lock },
  VOIDED:     { label: 'Anulowane', color: 'bg-red-100 text-red-700', icon: Ban },
}

const APPROACH_LABELS: Record<BillingApproach, string> = {
  MONTHLY: 'Miesięcznie',
  QUARTERLY: 'Kwartalnie',
  SEMI_ANNUAL: 'Półrocznie',
  ANNUAL: 'Rocznie',
  ADVANCE_PAYMENT: 'Zaliczki',
}

// ============================================
// Main Page — List + Wizard + Detail
// ============================================

type ViewMode = 'list' | 'wizard' | 'detail'

export default function SettlementsPage() {
  const params = useParams()
  const propertyId = params.id as string

  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [propertyName, setPropertyName] = useState('')
  const [settlements, setSettlements] = useState<SettlementListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<SettlementStatus | 'ALL'>('ALL')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  useEffect(() => {
    fetchProperty()
    fetchSettlements()
  }, [propertyId])

  async function fetchProperty() {
    try {
      const res = await fetch(`/api/properties/${propertyId}`)
      if (res.ok) { const d = await res.json(); setPropertyName(d.name) }
    } catch {}
  }

  async function fetchSettlements() {
    setLoading(true)
    try {
      const res = await fetch(`/api/settlements?propertyId=${propertyId}`)
      if (res.ok) setSettlements(await res.json())
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const openDetail = (id: string) => { setSelectedId(id); setViewMode('detail') }
  const backToList = () => { setViewMode('list'); setSelectedId(null); fetchSettlements() }

  const filtered = statusFilter === 'ALL'
    ? settlements
    : settlements.filter(s => s.status === statusFilter)

  // ─── LIST VIEW ───
  if (viewMode === 'list') return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href={`/properties/${propertyId}`}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-1">
            <ArrowLeft className="h-4 w-4" />{propertyName || 'Nieruchomość'}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Rozliczenia mediów</h1>
        </div>
        <Button onClick={() => setViewMode('wizard')}>
          <Plus className="h-4 w-4 mr-2" />Nowe rozliczenie
        </Button>
      </div>

      {/* Status filters */}
      {settlements.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {(['ALL', 'DRAFT', 'FINALIZED', 'VOIDED'] as const).map(s => {
            const count = s === 'ALL' ? settlements.length : settlements.filter(x => x.status === s).length
            if (count === 0 && s !== 'ALL') return null
            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === s ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {s === 'ALL' ? 'Wszystkie' : STATUS_CONFIG[s].label}
                <span className="ml-1 text-xs opacity-60">({count})</span>
              </button>
            )
          })}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
      ) : filtered.length === 0 ? (
        <Card className="p-8 text-center">
          <Calculator className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {settlements.length === 0 ? 'Brak rozliczeń' : 'Brak rozliczeń w tej kategorii'}
          </h3>
          <p className="text-gray-500 mb-4">
            {settlements.length === 0
              ? 'Utwórz pierwsze rozliczenie mediów dla tej nieruchomości.'
              : 'Zmień filtr, aby zobaczyć inne rozliczenia.'}
          </p>
          {settlements.length === 0 && (
            <Button onClick={() => setViewMode('wizard')}>
              <Plus className="h-4 w-4 mr-2" />Nowe rozliczenie
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(s => {
            const cfg = STATUS_CONFIG[s.status]
            const period = `${fmtDate(s.periodStart)} — ${fmtDate(s.periodEnd)}`
            const paidCount = s.shares.filter(sh => sh.isPaid).length
            return (
              <Card key={s.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => openDetail(s.id)}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 truncate">
                          {s.title || `Rozliczenie ${period}`}
                        </h3>
                        <Badge className={cfg.color}>{cfg.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />{period}
                        </span>
                        <span>{s._count.items} poz.</span>
                        <span>{s._count.shares} najemców</span>
                        {s.status === 'FINALIZED' && s.shares.length > 0 && (
                          <span className={paidCount === s.shares.length ? 'text-green-600' : 'text-amber-600'}>
                            {paidCount}/{s.shares.length} opłaconych
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{s.totalAmount.toFixed(2)} zł</p>
                      <p className="text-xs text-gray-400">{APPROACH_LABELS[s.approach]}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-300" />
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )

  // ─── WIZARD VIEW ───
  if (viewMode === 'wizard') return (
    <SettlementWizard
      propertyId={propertyId}
      propertyName={propertyName}
      onCancel={backToList}
      onCreated={(id) => { openDetail(id) }}
    />
  )

  // ─── DETAIL VIEW ───
  if (viewMode === 'detail' && selectedId) return (
    <SettlementDetailView
      settlementId={selectedId}
      onBack={backToList}
    />
  )

  return null
}

// ============================================
// Settlement Wizard (multi-step)
// ============================================

type WizardStep = 'period' | 'preview' | 'confirm'

function SettlementWizard({
  propertyId,
  propertyName,
  onCancel,
  onCreated,
}: {
  propertyId: string
  propertyName: string
  onCancel: () => void
  onCreated: (id: string) => void
}) {
  const [step, setStep] = useState<WizardStep>('period')

  // Period step
  const now = new Date()
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  const [periodStart, setPeriodStart] = useState(firstDay.toISOString().split('T')[0])
  const [periodEnd, setPeriodEnd] = useState(lastDay.toISOString().split('T')[0])
  const [approach, setApproach] = useState<BillingApproach>('MONTHLY')
  const [title, setTitle] = useState('')

  // Preview step
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [calcError, setCalcError] = useState<string | null>(null)

  // Confirm step
  const [creating, setCreating] = useState(false)

  // ─── Step 1: Calculate (dry-run) ───
  const handleCalculate = async () => {
    setCalculating(true)
    setCalcError(null)
    try {
      const res = await fetch('/api/settlements/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyId, periodStart, periodEnd, approach }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Błąd kalkulacji')
      setPreview(data)
      setStep('preview')
    } catch (err) {
      setCalcError(err instanceof Error ? err.message : 'Wystąpił błąd')
    } finally {
      setCalculating(false)
    }
  }

  // ─── Step 2→3: Create DRAFT ───
  const handleCreate = async () => {
    if (!preview) return
    setCreating(true)
    try {
      const res = await fetch('/api/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          periodStart,
          periodEnd,
          title: title || null,
          approach,
          items: preview.items,
          shares: preview.shares,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Błąd tworzenia rozliczenia')
      onCreated(data.id)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Wystąpił błąd')
    } finally {
      setCreating(false)
    }
  }

  // Steps indicator
  const steps = [
    { key: 'period', label: 'Okres', num: 1 },
    { key: 'preview', label: 'Podgląd', num: 2 },
    { key: 'confirm', label: 'Zapis', num: 3 },
  ]
  const currentStepIdx = steps.findIndex(s => s.key === step)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <button onClick={onCancel}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-1">
          <ArrowLeft className="h-4 w-4" />Powrót do listy
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Nowe rozliczenie</h1>
        <p className="text-sm text-gray-500">{propertyName}</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2 mb-8">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              i < currentStepIdx ? 'bg-green-500 text-white' :
              i === currentStepIdx ? 'bg-blue-600 text-white' :
              'bg-gray-200 text-gray-500'
            }`}>
              {i < currentStepIdx ? <Check className="h-4 w-4" /> : s.num}
            </div>
            <span className={`text-sm font-medium ${i === currentStepIdx ? 'text-gray-900' : 'text-gray-400'}`}>
              {s.label}
            </span>
            {i < steps.length - 1 && <div className="w-8 h-px bg-gray-300" />}
          </div>
        ))}
      </div>

      {/* ─── STEP 1: Period ─── */}
      {step === 'period' && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Wybierz okres rozliczeniowy</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="periodStart">Od</Label>
              <Input id="periodStart" type="date" value={periodStart}
                onChange={e => setPeriodStart(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="periodEnd">Do</Label>
              <Input id="periodEnd" type="date" value={periodEnd}
                onChange={e => setPeriodEnd(e.target.value)} required />
            </div>
          </div>

          <div className="mb-4">
            <Label>Typ rozliczenia</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
              {(['MONTHLY', 'QUARTERLY', 'ADVANCE_PAYMENT'] as BillingApproach[]).map(a => (
                <button key={a} type="button"
                  onClick={() => setApproach(a)}
                  className={`p-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                    approach === a
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                  {APPROACH_LABELS[a]}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <Label htmlFor="title">Tytuł (opcjonalnie)</Label>
            <Input id="title" placeholder="np. Styczeń 2026"
              value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          {calcError && (
            <div className="p-3 mb-4 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />{calcError}
            </div>
          )}

          <div className="flex gap-3">
            <Button variant="outline" onClick={onCancel}>Anuluj</Button>
            <Button onClick={handleCalculate} disabled={calculating}>
              {calculating
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Obliczanie...</>
                : <><Calculator className="h-4 w-4 mr-2" />Oblicz podgląd</>}
            </Button>
          </div>
        </Card>
      )}

      {/* ─── STEP 2: Preview ─── */}
      {step === 'preview' && preview && (
        <div className="space-y-4">
          {/* Warnings */}
          {preview.warnings.length > 0 && (
            <Card className="p-4 bg-amber-50 border-amber-200">
              <h3 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />Uwagi ({preview.warnings.length})
              </h3>
              <ul className="space-y-1">
                {preview.warnings.map((w, i) => (
                  <li key={i} className="text-sm text-amber-700">• {w}</li>
                ))}
              </ul>
            </Card>
          )}

          {/* Summary */}
          <Card className="p-4 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700">
                  {fmtDate(preview.period.start)} — {fmtDate(preview.period.end)}
                  <span className="ml-2 opacity-60">({APPROACH_LABELS[approach]})</span>
                </p>
                <p className="text-xs text-blue-500 mt-0.5">
                  {preview.items.length} pozycji • {preview.shares.length} najemców
                </p>
              </div>
              <p className="text-2xl font-bold text-blue-800">{preview.totalAmount.toFixed(2)} zł</p>
            </div>
          </Card>

          {/* Items */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Pozycje rozliczenia</h3>
            <div className="space-y-2">
              {preview.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{item.label}</p>
                    {item.consumption !== undefined && item.consumption !== null && (
                      <p className="text-sm text-gray-500">
                        {item.prevReading?.toFixed(1)} → {item.currReading?.toFixed(1)}
                        {' '}= {item.consumption.toFixed(2)} {item.unit}
                        {item.rate && ` × ${item.rate.toFixed(4)} zł`}
                      </p>
                    )}
                    {item.periodCost !== undefined && !item.consumption && (
                      <p className="text-sm text-gray-500">Opłata stała</p>
                    )}
                  </div>
                  <p className="font-bold text-gray-900">{item.totalCost.toFixed(2)} zł</p>
                </div>
              ))}
            </div>
          </Card>

          {/* Shares */}
          <Card className="p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Podział kosztów</h3>
            <div className="space-y-2">
              {preview.shares.map((share, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{share.tenantName}</p>
                    <p className="text-sm text-gray-500">
                      {share.activeDays}/{share.totalDays} dni
                      {' '}({(share.shareRatio * 100).toFixed(1)}%)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{share.amount.toFixed(2)} zł</p>
                    {share.advancesPaid !== undefined && share.advancesPaid > 0 && (
                      <p className="text-xs text-green-600">
                        Zaliczki: -{share.advancesPaid.toFixed(2)} zł
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setStep('period')}>
              <ChevronLeft className="h-4 w-4 mr-1" />Wróć
            </Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Tworzenie...</>
                : <><Check className="h-4 w-4 mr-2" />Utwórz rozliczenie (DRAFT)</>}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// Settlement Detail View
// ============================================

function SettlementDetailView({
  settlementId,
  onBack,
}: {
  settlementId: string
  onBack: () => void
}) {
  const [settlement, setSettlement] = useState<SettlementDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [finalizing, setFinalizing] = useState(false)
  const [voiding, setVoiding] = useState(false)
  const [voidReason, setVoidReason] = useState('')
  const [showVoidDialog, setShowVoidDialog] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => { fetchDetail() }, [settlementId])

  async function fetchDetail() {
    setLoading(true)
    try {
      const res = await fetch(`/api/settlements/${settlementId}`)
      if (res.ok) setSettlement(await res.json())
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleFinalize = async () => {
    if (!confirm('Zatwierdzone rozliczenie zostanie zapisane w księdze sald najemców. Kontynuować?')) return
    setFinalizing(true)
    try {
      const res = await fetch(`/api/settlements/${settlementId}/finalize`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      fetchDetail()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Błąd finalizacji')
    } finally {
      setFinalizing(false)
    }
  }

  const handleVoid = async () => {
    if (voidReason.trim().length < 3) { alert('Podaj powód anulowania (min. 3 znaki)'); return }
    setVoiding(true)
    try {
      const res = await fetch(`/api/settlements/${settlementId}/void`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: voidReason }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setShowVoidDialog(false)
      fetchDetail()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Błąd anulowania')
    } finally {
      setVoiding(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Usunąć szkic rozliczenia? Operacja jest nieodwracalna.')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/settlements/${settlementId}`, { method: 'DELETE' })
      if (res.ok) onBack()
      else { const d = await res.json(); alert(d.error) }
    } catch { alert('Błąd usunięcia') }
    finally { setDeleting(false) }
  }

  if (loading) return (
    <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>
  )
  if (!settlement) return (
    <div className="text-center py-12">
      <p className="text-gray-500">Rozliczenie nie znalezione</p>
      <Button variant="outline" className="mt-4" onClick={onBack}>Powrót</Button>
    </div>
  )

  const cfg = STATUS_CONFIG[settlement.status]
  const period = `${fmtDate(settlement.periodStart)} — ${fmtDate(settlement.periodEnd)}`
  const isDraft = settlement.status === 'DRAFT' || settlement.status === 'CALCULATED'
  const isFinalized = settlement.status === 'FINALIZED'
  const paidCount = settlement.shares.filter(s => s.isPaid).length

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <button onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="h-4 w-4" />Powrót do listy
      </button>

      <Card className="p-5 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-gray-900">
                {settlement.title || `Rozliczenie ${period}`}
              </h1>
              <Badge className={cfg.color}>{cfg.label}</Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{period}</span>
              <span>{APPROACH_LABELS[settlement.approach]}</span>
              {settlement.invoiceNumber && <span>Faktura: {settlement.invoiceNumber}</span>}
            </div>
          </div>
          <p className="text-2xl font-bold text-gray-900">{settlement.totalAmount.toFixed(2)} zł</p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t">
          {isDraft && (
            <>
              <Button onClick={handleFinalize} disabled={finalizing}>
                {finalizing
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Zatwierdzanie...</>
                  : <><Lock className="h-4 w-4 mr-2" />Zatwierdź (finalize)</>}
              </Button>
              <Button variant="outline" onClick={handleDelete} disabled={deleting}
                className="text-red-600 hover:text-red-700">
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Usuń szkic'}
              </Button>
            </>
          )}
          {isFinalized && (
            <Button variant="outline" onClick={() => setShowVoidDialog(true)}
              className="text-red-600 hover:text-red-700">
              <Ban className="h-4 w-4 mr-2" />Anuluj rozliczenie
            </Button>
          )}
          {isFinalized && settlement.shares.length > 0 && (
            <div className="ml-auto flex items-center gap-1 text-sm">
              {paidCount === settlement.shares.length ? (
                <span className="text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="h-4 w-4" />Wszystko opłacone
                </span>
              ) : (
                <span className="text-amber-600">
                  {paidCount}/{settlement.shares.length} opłaconych
                </span>
              )}
            </div>
          )}
        </div>

        {settlement.voidReason && (
          <div className="mt-3 p-3 bg-red-50 text-red-700 text-sm rounded-lg">
            <strong>Powód anulowania:</strong> {settlement.voidReason}
          </div>
        )}
        {settlement.notes && (
          <p className="mt-2 text-sm text-gray-500 italic">{settlement.notes}</p>
        )}
      </Card>

      {/* Items */}
      <Card className="p-4 mb-4">
        <h3 className="font-semibold text-gray-900 mb-3">
          Pozycje ({settlement.items.length})
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="pb-2 font-medium">Usługa</th>
                <th className="pb-2 font-medium">Odczyty</th>
                <th className="pb-2 font-medium">Zużycie</th>
                <th className="pb-2 font-medium">Stawka</th>
                <th className="pb-2 font-medium text-right">Koszt</th>
              </tr>
            </thead>
            <tbody>
              {settlement.items.map(item => (
                <tr key={item.id} className="border-b border-gray-100">
                  <td className="py-2.5 font-medium text-gray-900">{item.utilityLabel}</td>
                  <td className="py-2.5 text-gray-500">
                    {item.prevReading !== null && item.currReading !== null
                      ? `${item.prevReading.toFixed(1)} → ${item.currReading.toFixed(1)}`
                      : '—'}
                  </td>
                  <td className="py-2.5 text-gray-700">
                    {item.consumption !== null ? `${item.consumption.toFixed(2)} ${item.unitLabel || ''}` : '—'}
                  </td>
                  <td className="py-2.5 text-gray-500">
                    {item.snapshotRate !== null ? `${item.snapshotRate.toFixed(4)} zł` : '—'}
                  </td>
                  <td className="py-2.5 font-bold text-gray-900 text-right">{item.totalCost.toFixed(2)} zł</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="font-bold">
                <td colSpan={4} className="pt-3 text-gray-900">Razem</td>
                <td className="pt-3 text-gray-900 text-right">{settlement.totalAmount.toFixed(2)} zł</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Shares */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 mb-3">
          Udziały najemców ({settlement.shares.length})
        </h3>
        <div className="space-y-3">
          {settlement.shares.map(share => (
            <div key={share.id} className={`p-4 rounded-lg border ${
              share.isPaid ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900">
                      {share.tenant.firstName} {share.tenant.lastName}
                    </p>
                    {share.isPaid && (
                      <Badge className="bg-green-100 text-green-700">
                        <CheckCircle2 className="h-3 w-3 mr-1" />Opłacone
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-500">
                    <span>{share.activeDays}/{share.totalDays} dni</span>
                    <span>{(share.shareRatio * 100).toFixed(1)}%</span>
                    {share.tenant.email && <span>{share.tenant.email}</span>}
                  </div>
                  {share.notes && <p className="text-xs text-gray-400 mt-1 italic">{share.notes}</p>}
                  {share.ownerNotes && (
                    <p className="text-xs text-amber-600 mt-1">📝 {share.ownerNotes}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">{share.finalAmount.toFixed(2)} zł</p>
                  {share.adjustedAmount !== null && share.adjustedAmount !== share.calculatedAmount && (
                    <p className="text-xs text-gray-400 line-through">{share.calculatedAmount.toFixed(2)} zł</p>
                  )}
                  {share.advancesPaid > 0 && (
                    <p className="text-xs text-green-600">Zaliczki: -{share.advancesPaid.toFixed(2)} zł</p>
                  )}
                  {share.balanceDue !== share.finalAmount && share.balanceDue > 0 && (
                    <p className="text-xs font-medium text-amber-600">Do zapłaty: {share.balanceDue.toFixed(2)} zł</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Void Dialog */}
      {showVoidDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowVoidDialog(false)} />
          <div className="relative z-10 bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-5">
            <h2 className="text-lg font-semibold text-red-700 mb-3 flex items-center gap-2">
              <Ban className="h-5 w-5" />Anulowanie rozliczenia
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Ta operacja odwróci zapisy w księdze sald wszystkich najemców.
              Podaj powód anulowania.
            </p>
            <div className="mb-4">
              <Label htmlFor="voidReason">Powód</Label>
              <Input id="voidReason" placeholder="np. błędne odczyty, zmiana taryfy..."
                value={voidReason} onChange={e => setVoidReason(e.target.value)} autoFocus />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowVoidDialog(false)}>
                Anuluj
              </Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700" onClick={handleVoid} disabled={voiding}>
                {voiding
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : 'Potwierdź anulowanie'}
              </Button>
            </div>
          </div>
        </div>
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