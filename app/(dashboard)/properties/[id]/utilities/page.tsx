// app/(dashboard)/properties/[id]/utilities/page.tsx
// Flatro — Fixed Utilities & Rates Management (Owner)
// Two tabs: Opłaty stałe (fixed) + Taryfy (rates)
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Loader2, Wifi, Trash2, Recycle, Car,
  Tv, Shield, ArrowUpDown, MoreHorizontal, X, Check,
  AlertTriangle, Edit, Power, PowerOff, Zap, Flame,
  Droplets, Thermometer, Calendar, Clock, ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ============================================
// Types
// ============================================

type FixedUtilityType = 'INTERNET' | 'GARBAGE' | 'ADMIN_FEE' | 'PARKING' | 'TV_CABLE' | 'SECURITY' | 'ELEVATOR' | 'OTHER'
type CostSplitMethod = 'BY_DAYS' | 'BY_PERSONS' | 'EQUAL' | 'MANUAL'
type MeterType = 'ELECTRICITY' | 'GAS' | 'WATER_COLD' | 'WATER_HOT' | 'HEATING'

interface FixedUtility {
  id: string
  propertyId: string
  type: FixedUtilityType
  name: string
  periodCost: number
  splitMethod: CostSplitMethod
  isPerPerson: boolean
  isActive: boolean
  notes: string | null
  createdAt: string
}

interface UtilityRate {
  id: string
  propertyId: string
  meterType: MeterType
  pricePerUnit: number
  effectiveFrom: string
  effectiveTo: string | null
  source: string | null
  notes: string | null
  createdAt: string
}

// ============================================
// Constants — Polish labels, icons
// ============================================

const UTILITY_TYPE_CONFIG: Record<FixedUtilityType, {
  label: string
  icon: typeof Wifi
  color: string
  bgColor: string
}> = {
  INTERNET:   { label: 'Internet', icon: Wifi, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  GARBAGE:    { label: 'Śmieci', icon: Recycle, color: 'text-green-600', bgColor: 'bg-green-100' },
  ADMIN_FEE:  { label: 'Czynsz administracyjny', icon: ArrowUpDown, color: 'text-purple-600', bgColor: 'bg-purple-100' },
  PARKING:    { label: 'Parking', icon: Car, color: 'text-gray-600', bgColor: 'bg-gray-200' },
  TV_CABLE:   { label: 'Telewizja kablowa', icon: Tv, color: 'text-indigo-600', bgColor: 'bg-indigo-100' },
  SECURITY:   { label: 'Ochrona', icon: Shield, color: 'text-amber-600', bgColor: 'bg-amber-100' },
  ELEVATOR:   { label: 'Winda', icon: ArrowUpDown, color: 'text-teal-600', bgColor: 'bg-teal-100' },
  OTHER:      { label: 'Inne', icon: MoreHorizontal, color: 'text-gray-500', bgColor: 'bg-gray-100' },
}

const METER_TYPE_CONFIG: Record<MeterType, {
  label: string
  icon: typeof Zap
  color: string
  bgColor: string
  unit: string
}> = {
  ELECTRICITY: { label: 'Prąd', icon: Zap, color: 'text-yellow-600', bgColor: 'bg-yellow-100', unit: 'kWh' },
  GAS:         { label: 'Gaz', icon: Flame, color: 'text-orange-600', bgColor: 'bg-orange-100', unit: 'm³' },
  WATER_COLD:  { label: 'Woda zimna', icon: Droplets, color: 'text-blue-600', bgColor: 'bg-blue-100', unit: 'm³' },
  WATER_HOT:   { label: 'Woda ciepła', icon: Droplets, color: 'text-red-500', bgColor: 'bg-red-100', unit: 'm³' },
  HEATING:     { label: 'Ogrzewanie', icon: Thermometer, color: 'text-rose-600', bgColor: 'bg-rose-100', unit: 'GJ' },
}

const SPLIT_METHOD_LABELS: Record<CostSplitMethod, string> = {
  BY_DAYS: 'Proporcjonalnie (dni)',
  BY_PERSONS: 'Na osobę',
  EQUAL: 'Po równo',
  MANUAL: 'Ręcznie',
}

const UTILITY_TYPES: FixedUtilityType[] = [
  'INTERNET', 'GARBAGE', 'ADMIN_FEE', 'PARKING', 'TV_CABLE', 'SECURITY', 'ELEVATOR', 'OTHER'
]

const METER_TYPES: MeterType[] = ['ELECTRICITY', 'GAS', 'WATER_COLD', 'WATER_HOT', 'HEATING']

// ============================================
// Main Page Component
// ============================================

type Tab = 'fixed' | 'rates'

export default function UtilitiesPage() {
  const params = useParams()
  const propertyId = params.id as string

  const [tab, setTab] = useState<Tab>('fixed')
  const [propertyName, setPropertyName] = useState('')

  // Fixed utilities state
  const [utilities, setUtilities] = useState<FixedUtility[]>([])
  const [loadingUtilities, setLoadingUtilities] = useState(true)

  // Rates state
  const [rates, setRates] = useState<UtilityRate[]>([])
  const [loadingRates, setLoadingRates] = useState(true)

  // Modals
  const [showAddUtility, setShowAddUtility] = useState(false)
  const [editingUtility, setEditingUtility] = useState<FixedUtility | null>(null)
  const [showAddRate, setShowAddRate] = useState(false)

  // ── Fetch ──

  useEffect(() => {
    fetchProperty()
    fetchUtilities()
    fetchRates()
  }, [propertyId])

  async function fetchProperty() {
    try {
      const res = await fetch(`/api/properties/${propertyId}`)
      if (res.ok) {
        const data = await res.json()
        setPropertyName(data.name)
      }
    } catch {}
  }

  async function fetchUtilities() {
    setLoadingUtilities(true)
    try {
      const res = await fetch(`/api/properties/${propertyId}/fixed-utilities`)
      if (res.ok) setUtilities(await res.json())
    } catch (error) {
      console.error('Error fetching utilities:', error)
    } finally {
      setLoadingUtilities(false)
    }
  }

  async function fetchRates() {
    setLoadingRates(true)
    try {
      const res = await fetch(`/api/properties/${propertyId}/rates`)
      if (res.ok) setRates(await res.json())
    } catch (error) {
      console.error('Error fetching rates:', error)
    } finally {
      setLoadingRates(false)
    }
  }

  // ── Handlers ──

  const handleDeactivateUtility = async (id: string) => {
    if (!confirm('Dezaktywować tę opłatę? Nie będzie uwzględniana w nowych rozliczeniach.')) return
    try {
      const res = await fetch(`/api/fixed-utilities/${id}`, { method: 'DELETE' })
      if (res.ok) fetchUtilities()
      else alert('Błąd dezaktywacji')
    } catch { alert('Błąd połączenia') }
  }

  const handleReactivateUtility = async (id: string) => {
    try {
      const res = await fetch(`/api/fixed-utilities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: true }),
      })
      if (res.ok) fetchUtilities()
    } catch { alert('Błąd połączenia') }
  }

  // ── Summary ──

  const activeUtilities = utilities.filter(u => u.isActive)
  const inactiveUtilities = utilities.filter(u => !u.isActive)
  const totalMonthlyCost = activeUtilities.reduce((sum, u) => sum + u.periodCost, 0)

  // Group rates by meterType
  const ratesByType: Record<string, UtilityRate[]> = {}
  for (const rate of rates) {
    if (!ratesByType[rate.meterType]) ratesByType[rate.meterType] = []
    ratesByType[rate.meterType].push(rate)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href={`/properties/${propertyId}`}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-1"
          >
            <ArrowLeft className="h-4 w-4" />
            {propertyName || 'Nieruchomość'}
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Opłaty i taryfy</h1>
        </div>
        <Button onClick={() => tab === 'fixed' ? setShowAddUtility(true) : setShowAddRate(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {tab === 'fixed' ? 'Dodaj opłatę' : 'Dodaj taryfę'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-gray-100 rounded-lg w-fit">
        <button
          onClick={() => setTab('fixed')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'fixed'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Opłaty stałe
          {activeUtilities.length > 0 && (
            <span className="ml-1.5 text-xs opacity-60">({activeUtilities.length})</span>
          )}
        </button>
        <button
          onClick={() => setTab('rates')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === 'rates'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Taryfy liczników
          {rates.length > 0 && (
            <span className="ml-1.5 text-xs opacity-60">({rates.length})</span>
          )}
        </button>
      </div>

      {/* ═══════════════════════════════════════ */}
      {/* TAB 1: Fixed Utilities                  */}
      {/* ═══════════════════════════════════════ */}
      {tab === 'fixed' && (
        <>
          {/* Summary bar */}
          {activeUtilities.length > 0 && (
            <Card className="p-4 mb-4 bg-blue-50 border-blue-200">
              <div className="flex items-center justify-between">
                <span className="text-sm text-blue-700">
                  Łączna kwota opłat stałych (miesięcznie):
                </span>
                <span className="text-lg font-bold text-blue-800">
                  {totalMonthlyCost.toFixed(2)} zł
                </span>
              </div>
            </Card>
          )}

          {loadingUtilities ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : utilities.length === 0 ? (
            <Card className="p-8 text-center">
              <Wifi className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Brak opłat stałych</h3>
              <p className="text-gray-500 mb-4">
                Dodaj internet, śmieci, czynsz administracyjny i inne stałe opłaty.
              </p>
              <Button onClick={() => setShowAddUtility(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Dodaj opłatę
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {/* Active */}
              {activeUtilities.map(utility => (
                <FixedUtilityCard
                  key={utility.id}
                  utility={utility}
                  onEdit={() => setEditingUtility(utility)}
                  onDeactivate={() => handleDeactivateUtility(utility.id)}
                />
              ))}

              {/* Inactive */}
              {inactiveUtilities.length > 0 && (
                <>
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 pt-4">
                    Nieaktywne ({inactiveUtilities.length})
                  </p>
                  {inactiveUtilities.map(utility => (
                    <FixedUtilityCard
                      key={utility.id}
                      utility={utility}
                      onEdit={() => setEditingUtility(utility)}
                      onDeactivate={() => {}}
                      onReactivate={() => handleReactivateUtility(utility.id)}
                    />
                  ))}
                </>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* TAB 2: Rates                            */}
      {/* ═══════════════════════════════════════ */}
      {tab === 'rates' && (
        <>
          {loadingRates ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : rates.length === 0 ? (
            <Card className="p-8 text-center">
              <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Brak taryf</h3>
              <p className="text-gray-500 mb-4">
                Dodaj taryfy (stawki za jednostkę) dla każdego typu licznika.
                Taryfy są używane przy automatycznym rozliczeniu.
              </p>
              <Button onClick={() => setShowAddRate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Dodaj taryfę
              </Button>
            </Card>
          ) : (
            <div className="space-y-6">
              {METER_TYPES.map(meterType => {
                const typeRates = ratesByType[meterType]
                if (!typeRates || typeRates.length === 0) return null

                const cfg = METER_TYPE_CONFIG[meterType]
                const MeterIcon = cfg.icon
                const currentRate = typeRates.find(r => !r.effectiveTo)

                return (
                  <Card key={meterType} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`p-1.5 rounded-lg ${cfg.bgColor}`}>
                          <MeterIcon className={`h-4 w-4 ${cfg.color}`} />
                        </div>
                        <h3 className="font-semibold text-gray-900">{cfg.label}</h3>
                        {currentRate && (
                          <Badge className="bg-green-100 text-green-700">
                            {currentRate.pricePerUnit.toFixed(4)} zł/{cfg.unit}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2">
                      {typeRates.map(rate => {
                        const isActive = !rate.effectiveTo
                        const fromDate = new Date(rate.effectiveFrom).toLocaleDateString('pl-PL')
                        const toDate = rate.effectiveTo
                          ? new Date(rate.effectiveTo).toLocaleDateString('pl-PL')
                          : 'obecnie'

                        return (
                          <div
                            key={rate.id}
                            className={`flex items-center justify-between p-3 rounded-lg ${
                              isActive ? 'bg-green-50 border border-green-200' : 'bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                              <div>
                                <span className="font-medium text-gray-900">
                                  {rate.pricePerUnit.toFixed(4)} zł/{cfg.unit}
                                </span>
                                {rate.source && (
                                  <span className="text-xs text-gray-400 ml-2">({rate.source})</span>
                                )}
                              </div>
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {fromDate} → {toDate}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                )
              })}

              {/* Types without rates */}
              {METER_TYPES.filter(t => !ratesByType[t] || ratesByType[t].length === 0).length > 0 && (
                <div className="text-sm text-gray-400 flex items-center gap-2 pt-2">
                  <AlertTriangle className="h-4 w-4" />
                  Brak taryf dla:{' '}
                  {METER_TYPES
                    .filter(t => !ratesByType[t] || ratesByType[t].length === 0)
                    .map(t => METER_TYPE_CONFIG[t].label)
                    .join(', ')}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════ */}
      {/* Modals                                  */}
      {/* ═══════════════════════════════════════ */}
      {showAddUtility && (
        <AddUtilityModal
          propertyId={propertyId}
          onClose={() => setShowAddUtility(false)}
          onSuccess={() => { setShowAddUtility(false); fetchUtilities() }}
        />
      )}

      {editingUtility && (
        <EditUtilityModal
          utility={editingUtility}
          onClose={() => setEditingUtility(null)}
          onSuccess={() => { setEditingUtility(null); fetchUtilities() }}
        />
      )}

      {showAddRate && (
        <AddRateModal
          propertyId={propertyId}
          onClose={() => setShowAddRate(false)}
          onSuccess={() => { setShowAddRate(false); fetchRates() }}
        />
      )}
    </div>
  )
}

// ============================================
// Fixed Utility Card
// ============================================

function FixedUtilityCard({
  utility,
  onEdit,
  onDeactivate,
  onReactivate,
}: {
  utility: FixedUtility
  onEdit: () => void
  onDeactivate: () => void
  onReactivate?: () => void
}) {
  const cfg = UTILITY_TYPE_CONFIG[utility.type]
  const Icon = cfg.icon

  return (
    <Card className={`p-4 ${!utility.isActive ? 'opacity-60' : ''}`}>
      <div className="flex items-start gap-4">
        <div className={`p-2.5 rounded-lg ${cfg.bgColor} shrink-0`}>
          <Icon className={`h-5 w-5 ${cfg.color}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900">{utility.name}</h3>
            {!utility.isActive && (
              <Badge className="bg-gray-100 text-gray-500">Nieaktywna</Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            <span>Typ: <span className="text-gray-700">{cfg.label}</span></span>
            <span>Podział: <span className="text-gray-700">{SPLIT_METHOD_LABELS[utility.splitMethod]}</span></span>
            {utility.isPerPerson && (
              <Badge className="bg-amber-50 text-amber-700 text-xs">Na osobę</Badge>
            )}
          </div>

          {utility.notes && (
            <p className="text-xs text-gray-400 mt-1 italic">{utility.notes}</p>
          )}
        </div>

        {/* Cost */}
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-gray-900">{utility.periodCost.toFixed(2)} zł</p>
          <p className="text-xs text-gray-400">/ miesiąc</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="ghost" onClick={onEdit} title="Edytuj">
            <Edit className="h-4 w-4" />
          </Button>
          {utility.isActive ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={onDeactivate}
              title="Dezaktywuj"
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
            >
              <PowerOff className="h-4 w-4" />
            </Button>
          ) : onReactivate ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={onReactivate}
              title="Aktywuj ponownie"
              className="text-green-600 hover:text-green-700 hover:bg-green-50"
            >
              <Power className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </Card>
  )
}

// ============================================
// Add Utility Modal
// ============================================

function AddUtilityModal({
  propertyId,
  onClose,
  onSuccess,
}: {
  propertyId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    type: 'INTERNET' as FixedUtilityType,
    name: 'Internet',
    periodCost: '',
    splitMethod: 'BY_DAYS' as CostSplitMethod,
    isPerPerson: false,
    notes: '',
  })

  const handleTypeChange = (type: FixedUtilityType) => {
    setForm(prev => ({
      ...prev,
      type,
      name: UTILITY_TYPE_CONFIG[type].label,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.periodCost) { setError('Kwota jest wymagana'); return }
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/properties/${propertyId}/fixed-utilities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: form.type,
          name: form.name,
          periodCost: form.periodCost,
          splitMethod: form.splitMethod,
          isPerPerson: form.isPerPerson,
          notes: form.notes || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Błąd dodawania opłaty')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił błąd')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold">Nowa opłata stała</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Type Selection */}
          <div>
            <Label>Typ opłaty</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1.5">
              {UTILITY_TYPES.map(type => {
                const cfg = UTILITY_TYPE_CONFIG[type]
                const TypeIcon = cfg.icon
                const selected = form.type === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTypeChange(type)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 text-xs font-medium transition-all ${
                      selected
                        ? `border-blue-500 ${cfg.bgColor} ${cfg.color}`
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <TypeIcon className="h-4 w-4" />
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Name & Cost */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="utilityName">Nazwa</Label>
              <Input
                id="utilityName"
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="periodCost">Kwota (zł/miesiąc)</Label>
              <Input
                id="periodCost"
                type="number"
                step="0.01"
                min="0"
                placeholder="np. 85.00"
                value={form.periodCost}
                onChange={e => setForm(prev => ({ ...prev, periodCost: e.target.value }))}
                required
              />
            </div>
          </div>

          {/* Split Method */}
          <div>
            <Label>Metoda podziału</Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {(['BY_DAYS', 'BY_PERSONS', 'EQUAL', 'MANUAL'] as CostSplitMethod[]).map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, splitMethod: method }))}
                  className={`p-2 rounded-lg border-2 text-sm transition-all ${
                    form.splitMethod === method
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {SPLIT_METHOD_LABELS[method]}
                </button>
              ))}
            </div>
          </div>

          {/* Per person toggle */}
          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={form.isPerPerson}
              onChange={e => setForm(prev => ({ ...prev, isPerPerson: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-700">Opłata na osobę</p>
              <p className="text-xs text-gray-400">Kwota zostanie pomnożona przez liczbę aktywnych najemców</p>
            </div>
          </label>

          {/* Notes */}
          <div>
            <Label htmlFor="utilityNotes">Uwagi (opcjonalnie)</Label>
            <Input
              id="utilityNotes"
              placeholder="np. umowa do 12.2026"
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Anuluj
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Zapisywanie...</>
              ) : (
                <><Plus className="h-4 w-4 mr-2" /> Dodaj</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  )
}

// ============================================
// Edit Utility Modal
// ============================================

function EditUtilityModal({
  utility,
  onClose,
  onSuccess,
}: {
  utility: FixedUtility
  onClose: () => void
  onSuccess: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: utility.name,
    periodCost: utility.periodCost.toString(),
    splitMethod: utility.splitMethod,
    isPerPerson: utility.isPerPerson,
    notes: utility.notes || '',
  })

  const cfg = UTILITY_TYPE_CONFIG[utility.type]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/fixed-utilities/${utility.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          periodCost: form.periodCost,
          splitMethod: form.splitMethod,
          isPerPerson: form.isPerPerson,
          notes: form.notes || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Błąd aktualizacji')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił błąd')
    } finally {
      setSaving(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${cfg.bgColor}`}>
              <cfg.icon className={`h-4 w-4 ${cfg.color}`} />
            </div>
            <h2 className="text-lg font-semibold">Edytuj — {utility.name}</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="editName">Nazwa</Label>
              <Input
                id="editName"
                value={form.name}
                onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="editCost">Kwota (zł/miesiąc)</Label>
              <Input
                id="editCost"
                type="number"
                step="0.01"
                min="0"
                value={form.periodCost}
                onChange={e => setForm(prev => ({ ...prev, periodCost: e.target.value }))}
                required
              />
            </div>
          </div>

          <div>
            <Label>Metoda podziału</Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              {(['BY_DAYS', 'BY_PERSONS', 'EQUAL', 'MANUAL'] as CostSplitMethod[]).map(method => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setForm(prev => ({ ...prev, splitMethod: method }))}
                  className={`p-2 rounded-lg border-2 text-sm transition-all ${
                    form.splitMethod === method
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {SPLIT_METHOD_LABELS[method]}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer">
            <input
              type="checkbox"
              checked={form.isPerPerson}
              onChange={e => setForm(prev => ({ ...prev, isPerPerson: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <div>
              <p className="text-sm font-medium text-gray-700">Opłata na osobę</p>
              <p className="text-xs text-gray-400">Kwota × liczba aktywnych najemców</p>
            </div>
          </label>

          <div>
            <Label htmlFor="editNotes">Uwagi</Label>
            <Input
              id="editNotes"
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Anuluj
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Zapisywanie...</>
              ) : (
                <><Check className="h-4 w-4 mr-2" /> Zapisz</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  )
}

// ============================================
// Add Rate Modal
// ============================================

function AddRateModal({
  propertyId,
  onClose,
  onSuccess,
}: {
  propertyId: string
  onClose: () => void
  onSuccess: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    meterType: 'ELECTRICITY' as MeterType,
    pricePerUnit: '',
    effectiveFrom: new Date().toISOString().split('T')[0],
    source: '',
    notes: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.pricePerUnit) { setError('Stawka jest wymagana'); return }
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/properties/${propertyId}/rates`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meterType: form.meterType,
          pricePerUnit: form.pricePerUnit,
          effectiveFrom: form.effectiveFrom,
          source: form.source || undefined,
          notes: form.notes || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Błąd dodawania taryfy')
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił błąd')
    } finally {
      setSaving(false)
    }
  }

  const selectedCfg = METER_TYPE_CONFIG[form.meterType]

  return (
    <ModalOverlay onClose={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full mx-4">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold">Nowa taryfa</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Meter Type */}
          <div>
            <Label>Typ licznika</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1.5">
              {METER_TYPES.map(type => {
                const cfg = METER_TYPE_CONFIG[type]
                const TypeIcon = cfg.icon
                const selected = form.meterType === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setForm(prev => ({ ...prev, meterType: type }))}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border-2 text-sm font-medium transition-all ${
                      selected
                        ? `border-blue-500 ${cfg.bgColor} ${cfg.color}`
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    <TypeIcon className="h-4 w-4" />
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Price & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="pricePerUnit">Stawka (zł/{selectedCfg.unit})</Label>
              <Input
                id="pricePerUnit"
                type="number"
                step="0.0001"
                min="0"
                placeholder="np. 0.8500"
                value={form.pricePerUnit}
                onChange={e => setForm(prev => ({ ...prev, pricePerUnit: e.target.value }))}
                required
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="effectiveFrom">Obowiązuje od</Label>
              <Input
                id="effectiveFrom"
                type="date"
                value={form.effectiveFrom}
                onChange={e => setForm(prev => ({ ...prev, effectiveFrom: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="p-3 bg-amber-50 text-amber-700 text-xs rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
            <span>
              Poprzednia taryfa dla tego typu licznika zostanie automatycznie zamknięta
              (effectiveTo = dzień przed nową taryfą).
            </span>
          </div>

          {/* Source & Notes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rateSource">Źródło</Label>
              <Input
                id="rateSource"
                placeholder="np. faktura PGE"
                value={form.source}
                onChange={e => setForm(prev => ({ ...prev, source: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="rateNotes">Uwagi</Label>
              <Input
                id="rateNotes"
                placeholder="opcjonalnie"
                value={form.notes}
                onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Anuluj
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Zapisywanie...</>
              ) : (
                <><Plus className="h-4 w-4 mr-2" /> Dodaj</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </ModalOverlay>
  )
}

// ============================================
// Shared: Modal Overlay
// ============================================

function ModalOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10">{children}</div>
    </div>
  )
}