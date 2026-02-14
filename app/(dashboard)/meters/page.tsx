// app/(dashboard)/properties/[id]/meters/page.tsx
// Flatro — Meters Management (Owner)
// Full CRUD: list, add, edit, readings history, meter exchange
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Plus, Loader2, Zap, Flame, Droplets, Thermometer,
  BarChart3, Edit, Trash2, RefreshCw, History, AlertTriangle,
  X, Check, ChevronDown, ChevronUp, Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ============================================
// Types
// ============================================

type MeterType = 'ELECTRICITY' | 'GAS' | 'WATER_COLD' | 'WATER_HOT' | 'HEATING'
type MeterStatus = 'ACTIVE' | 'ARCHIVED' | 'DECOMMISSIONED'
type ReadingType = 'REGULAR' | 'INITIAL' | 'FINAL' | 'METER_EXCHANGE'

interface MeterReading {
  id: string
  value: number
  readingDate: string
  readingType: ReadingType
  notes: string | null
  tenant?: { id: string; firstName: string; lastName: string } | null
}

interface Meter {
  id: string
  propertyId: string
  type: MeterType
  meterNumber: string | null
  serialNumber: string | null
  unit: string
  pricePerUnit: number | null
  status: MeterStatus
  installDate: string | null
  archiveDate: string | null
  archiveNote: string | null
  createdAt: string
  property: { id: string; name: string }
  readings: { id: string; value: number; readingDate: string }[]
  lastReading: { id: string; value: number; readingDate: string } | null
  usage: number | null
  cost: number | null
}

// ============================================
// Constants — PL labels, icons, units
// ============================================

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

const METER_STATUS_CONFIG: Record<MeterStatus, { label: string; color: string }> = {
  ACTIVE:          { label: 'Aktywny', color: 'bg-green-100 text-green-800' },
  ARCHIVED:        { label: 'Zarchiwizowany', color: 'bg-gray-100 text-gray-600' },
  DECOMMISSIONED:  { label: 'Zlikwidowany', color: 'bg-red-100 text-red-700' },
}

const READING_TYPE_LABELS: Record<ReadingType, string> = {
  REGULAR: 'Regularny',
  INITIAL: 'Początkowy',
  FINAL: 'Końcowy',
  METER_EXCHANGE: 'Wymiana',
}

const METER_TYPES: MeterType[] = ['ELECTRICITY', 'GAS', 'WATER_COLD', 'WATER_HOT', 'HEATING']

// ============================================
// Main Page Component
// ============================================

export default function MetersPage() {
  const params = useParams()
  const router = useRouter()
  const propertyId = params.id as string

  const [meters, setMeters] = useState<Meter[]>([])
  const [propertyName, setPropertyName] = useState('')
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<MeterStatus | 'ALL'>('ALL')

  // Modals
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingMeter, setEditingMeter] = useState<Meter | null>(null)
  const [readingsMeter, setReadingsMeter] = useState<Meter | null>(null)
  const [exchangingMeter, setExchangingMeter] = useState<Meter | null>(null)

  const fetchMeters = useCallback(async () => {
    try {
      const res = await fetch(`/api/meters?propertyId=${propertyId}`)
      if (res.ok) {
        const data = await res.json()
        setMeters(data)
        if (data.length > 0) {
          setPropertyName(data[0].property?.name || '')
        }
      }
    } catch (error) {
      console.error('Error fetching meters:', error)
    } finally {
      setLoading(false)
    }
  }, [propertyId])

  // Fetch property name separately if no meters
  useEffect(() => {
    async function fetchProperty() {
      try {
        const res = await fetch(`/api/properties/${propertyId}`)
        if (res.ok) {
          const data = await res.json()
          setPropertyName(data.name)
        }
      } catch {}
    }
    fetchMeters()
    fetchProperty()
  }, [propertyId, fetchMeters])

  const filteredMeters = statusFilter === 'ALL'
    ? meters
    : meters.filter(m => m.status === statusFilter)

  const activeCount = meters.filter(m => m.status === 'ACTIVE').length
  const archivedCount = meters.filter(m => m.status !== 'ACTIVE').length

  // ============================================
  // Handlers
  // ============================================

  const handleMeterAdded = () => {
    setShowAddModal(false)
    fetchMeters()
  }

  const handleMeterEdited = () => {
    setEditingMeter(null)
    fetchMeters()
  }

  const handleMeterExchanged = () => {
    setExchangingMeter(null)
    fetchMeters()
  }

  const handleDecommission = async (meterId: string) => {
    if (!confirm('Czy na pewno chcesz zlikwidować ten licznik? Operacja jest nieodwracalna.')) return

    try {
      const res = await fetch(`/api/meters/${meterId}`, { method: 'DELETE' })
      if (res.ok) {
        fetchMeters()
      } else {
        const data = await res.json()
        alert(data.error || 'Błąd podczas likwidacji licznika')
      }
    } catch {
      alert('Błąd połączenia')
    }
  }

  // ============================================
  // Render
  // ============================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
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
          <h1 className="text-2xl font-bold text-gray-900">Liczniki</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeCount} aktywnych{archivedCount > 0 && `, ${archivedCount} zarchiwizowanych`}
          </p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Dodaj licznik
        </Button>
      </div>

      {/* Status Filter */}
      {meters.length > 0 && (
        <div className="flex gap-2 mb-4">
          {(['ALL', 'ACTIVE', 'ARCHIVED', 'DECOMMISSIONED'] as const).map(status => {
            const count = status === 'ALL'
              ? meters.length
              : meters.filter(m => m.status === status).length
            if (count === 0 && status !== 'ALL') return null
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  statusFilter === status
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {status === 'ALL' ? 'Wszystkie' : METER_STATUS_CONFIG[status].label}
                <span className="ml-1.5 text-xs opacity-70">({count})</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Meters List */}
      {filteredMeters.length === 0 ? (
        <Card className="p-8 text-center">
          <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {meters.length === 0 ? 'Brak liczników' : 'Brak liczników w wybranej kategorii'}
          </h3>
          <p className="text-gray-500 mb-4">
            {meters.length === 0
              ? 'Dodaj pierwszy licznik, aby śledzić zużycie mediów.'
              : 'Zmień filtr, aby zobaczyć inne liczniki.'}
          </p>
          {meters.length === 0 && (
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj licznik
            </Button>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredMeters.map(meter => (
            <MeterCard
              key={meter.id}
              meter={meter}
              onEdit={() => setEditingMeter(meter)}
              onReadings={() => setReadingsMeter(meter)}
              onExchange={() => setExchangingMeter(meter)}
              onDecommission={() => handleDecommission(meter.id)}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showAddModal && (
        <AddMeterModal
          propertyId={propertyId}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleMeterAdded}
        />
      )}

      {editingMeter && (
        <EditMeterModal
          meter={editingMeter}
          onClose={() => setEditingMeter(null)}
          onSuccess={handleMeterEdited}
        />
      )}

      {readingsMeter && (
        <ReadingsPanel
          meter={readingsMeter}
          onClose={() => setReadingsMeter(null)}
          onReadingAdded={fetchMeters}
        />
      )}

      {exchangingMeter && (
        <ExchangeDialog
          meter={exchangingMeter}
          onClose={() => setExchangingMeter(null)}
          onSuccess={handleMeterExchanged}
        />
      )}
    </div>
  )
}

// ============================================
// MeterCard Component
// ============================================

function MeterCard({
  meter,
  onEdit,
  onReadings,
  onExchange,
  onDecommission,
}: {
  meter: Meter
  onEdit: () => void
  onReadings: () => void
  onExchange: () => void
  onDecommission: () => void
}) {
  const config = METER_TYPE_CONFIG[meter.type]
  const statusConfig = METER_STATUS_CONFIG[meter.status]
  const Icon = config.icon
  const isActive = meter.status === 'ACTIVE'

  const lastReading = meter.lastReading
  const lastDate = lastReading
    ? new Date(lastReading.readingDate).toLocaleDateString('pl-PL', {
        day: 'numeric', month: 'short', year: 'numeric'
      })
    : null

  return (
    <Card className={`p-4 ${!isActive ? 'opacity-70' : ''}`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`p-2.5 rounded-lg ${config.bgColor} shrink-0`}>
          <Icon className={`h-5 w-5 ${config.color}`} />
        </div>

        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-semibold text-gray-900">{config.label}</h3>
            <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            {meter.meterNumber && (
              <span>Nr: <span className="text-gray-700">{meter.meterNumber}</span></span>
            )}
            {meter.serialNumber && (
              <span>S/N: <span className="text-gray-700">{meter.serialNumber}</span></span>
            )}
            <span>Jednostka: <span className="text-gray-700">{meter.unit}</span></span>
            {meter.pricePerUnit && (
              <span>
                Taryfa: <span className="text-gray-700">
                  {meter.pricePerUnit.toFixed(2)} zł/{meter.unit}
                </span>
              </span>
            )}
          </div>

          {/* Last Reading & Usage */}
          {lastReading && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
              <span className="text-gray-500">
                Ostatni odczyt:{' '}
                <span className="font-medium text-gray-800">
                  {lastReading.value.toFixed(2)} {meter.unit}
                </span>
                <span className="text-gray-400 ml-1">({lastDate})</span>
              </span>
              {meter.usage !== null && (
                <span className="text-gray-500">
                  Zużycie:{' '}
                  <span className={`font-medium ${meter.usage < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                    {meter.usage < 0 && <AlertTriangle className="inline h-3.5 w-3.5 mr-0.5 -mt-0.5" />}
                    {meter.usage.toFixed(2)} {meter.unit}
                  </span>
                </span>
              )}
              {meter.cost !== null && meter.cost > 0 && (
                <span className="text-gray-500">
                  Koszt: <span className="font-medium text-gray-800">{meter.cost.toFixed(2)} zł</span>
                </span>
              )}
            </div>
          )}

          {!lastReading && isActive && (
            <p className="mt-2 text-sm text-amber-600 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" />
              Brak odczytów — dodaj pierwszy odczyt
            </p>
          )}

          {meter.archiveNote && (
            <p className="mt-1 text-xs text-gray-400 italic">{meter.archiveNote}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button size="sm" variant="ghost" onClick={onReadings} title="Historia odczytów">
            <History className="h-4 w-4" />
          </Button>
          {isActive && (
            <>
              <Button size="sm" variant="ghost" onClick={onEdit} title="Edytuj">
                <Edit className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={onExchange} title="Wymiana licznika">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDecommission}
                title="Likwidacja"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  )
}

// ============================================
// Add Meter Modal
// ============================================

function AddMeterModal({
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
    type: 'ELECTRICITY' as MeterType,
    meterNumber: '',
    serialNumber: '',
    unit: 'kWh',
    pricePerUnit: '',
    initialReading: '',
  })

  // Auto-set unit when type changes
  const handleTypeChange = (type: MeterType) => {
    setForm(prev => ({
      ...prev,
      type,
      unit: METER_TYPE_CONFIG[type].unit,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      // 1. Create meter
      const meterRes = await fetch('/api/meters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId,
          type: form.type,
          meterNumber: form.meterNumber || undefined,
          serialNumber: form.serialNumber || undefined,
          unit: form.unit,
          pricePerUnit: form.pricePerUnit || undefined,
        }),
      })

      if (!meterRes.ok) {
        const data = await meterRes.json()
        throw new Error(data.error || 'Błąd tworzenia licznika')
      }

      const meter = await meterRes.json()

      // 2. If initial reading provided, add it
      if (form.initialReading) {
        await fetch(`/api/meters/${meter.id}/readings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            value: parseFloat(form.initialReading),
            readingType: 'INITIAL',
            notes: 'Odczyt początkowy',
          }),
        })
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
          <h2 className="text-lg font-semibold">Nowy licznik</h2>
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
                const selected = form.type === type
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleTypeChange(type)}
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

          {/* Meter Number & Serial */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="meterNumber">Numer licznika</Label>
              <Input
                id="meterNumber"
                placeholder="np. E-12345"
                value={form.meterNumber}
                onChange={e => setForm(prev => ({ ...prev, meterNumber: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="serialNumber">Numer seryjny</Label>
              <Input
                id="serialNumber"
                placeholder="opcjonalnie"
                value={form.serialNumber}
                onChange={e => setForm(prev => ({ ...prev, serialNumber: e.target.value }))}
              />
            </div>
          </div>

          {/* Unit & Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="unit">Jednostka</Label>
              <Input
                id="unit"
                value={form.unit}
                onChange={e => setForm(prev => ({ ...prev, unit: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="pricePerUnit">Taryfa (zł/{form.unit})</Label>
              <Input
                id="pricePerUnit"
                type="number"
                step="0.01"
                min="0"
                placeholder="np. 0.85"
                value={form.pricePerUnit}
                onChange={e => setForm(prev => ({ ...prev, pricePerUnit: e.target.value }))}
              />
            </div>
          </div>

          {/* Initial Reading */}
          <div>
            <Label htmlFor="initialReading">Odczyt początkowy ({form.unit})</Label>
            <Input
              id="initialReading"
              type="number"
              step="0.01"
              min="0"
              placeholder="np. 15230.50"
              value={form.initialReading}
              onChange={e => setForm(prev => ({ ...prev, initialReading: e.target.value }))}
            />
            <p className="text-xs text-gray-400 mt-1">
              Opcjonalnie — stan licznika w momencie dodania
            </p>
          </div>

          {/* Actions */}
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
// Edit Meter Modal
// ============================================

function EditMeterModal({
  meter,
  onClose,
  onSuccess,
}: {
  meter: Meter
  onClose: () => void
  onSuccess: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    meterNumber: meter.meterNumber || '',
    serialNumber: meter.serialNumber || '',
    unit: meter.unit,
    pricePerUnit: meter.pricePerUnit?.toString() || '',
  })

  const config = METER_TYPE_CONFIG[meter.type]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/meters/${meter.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meterNumber: form.meterNumber,
          serialNumber: form.serialNumber,
          unit: form.unit,
          pricePerUnit: form.pricePerUnit || null,
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
            <div className={`p-1.5 rounded-lg ${config.bgColor}`}>
              <config.icon className={`h-4 w-4 ${config.color}`} />
            </div>
            <h2 className="text-lg font-semibold">Edytuj — {config.label}</h2>
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
              <Label htmlFor="editMeterNumber">Numer licznika</Label>
              <Input
                id="editMeterNumber"
                value={form.meterNumber}
                onChange={e => setForm(prev => ({ ...prev, meterNumber: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="editSerialNumber">Numer seryjny</Label>
              <Input
                id="editSerialNumber"
                value={form.serialNumber}
                onChange={e => setForm(prev => ({ ...prev, serialNumber: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="editUnit">Jednostka</Label>
              <Input
                id="editUnit"
                value={form.unit}
                onChange={e => setForm(prev => ({ ...prev, unit: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="editPrice">Taryfa (zł/{form.unit})</Label>
              <Input
                id="editPrice"
                type="number"
                step="0.01"
                min="0"
                value={form.pricePerUnit}
                onChange={e => setForm(prev => ({ ...prev, pricePerUnit: e.target.value }))}
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
// Readings Panel (Side Sheet)
// ============================================

function ReadingsPanel({
  meter,
  onClose,
  onReadingAdded,
}: {
  meter: Meter
  onClose: () => void
  onReadingAdded: () => void
}) {
  const config = METER_TYPE_CONFIG[meter.type]
  const isActive = meter.status === 'ACTIVE'

  const [readings, setReadings] = useState<MeterReading[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)

  // Add reading form
  const [newValue, setNewValue] = useState('')
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])
  const [newType, setNewType] = useState<ReadingType>('REGULAR')
  const [newNotes, setNewNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [warning, setWarning] = useState<string | null>(null)

  useEffect(() => {
    fetchReadings()
  }, [meter.id])

  const fetchReadings = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/meters/${meter.id}/readings?limit=50`)
      if (res.ok) {
        const data = await res.json()
        setReadings(data.readings || [])
      }
    } catch (error) {
      console.error('Error fetching readings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddReading = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setWarning(null)

    try {
      const res = await fetch(`/api/meters/${meter.id}/readings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: parseFloat(newValue),
          readingDate: newDate,
          readingType: newType,
          notes: newNotes || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Błąd zapisu odczytu')
      }

      if (data.warning) {
        setWarning(data.warning)
      }

      setNewValue('')
      setNewNotes('')
      setShowAddForm(false)
      fetchReadings()
      onReadingAdded()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Wystąpił błąd')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed top-0 right-0 z-50 h-full w-full max-w-md bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${config.bgColor}`}>
              <config.icon className={`h-4 w-4 ${config.color}`} />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">{config.label}</h2>
              {meter.meterNumber && (
                <p className="text-xs text-gray-500">Nr: {meter.meterNumber}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Warning */}
        {warning && (
          <div className="mx-4 mt-3 p-3 bg-amber-50 text-amber-700 text-sm rounded-lg flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{warning}</span>
          </div>
        )}

        {/* Add Reading Button / Form */}
        {isActive && (
          <div className="p-4 border-b shrink-0">
            {!showAddForm ? (
              <Button className="w-full" onClick={() => setShowAddForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Dodaj odczyt
              </Button>
            ) : (
              <form onSubmit={handleAddReading} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="readingValue">Odczyt ({meter.unit})</Label>
                    <Input
                      id="readingValue"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="np. 15240.50"
                      value={newValue}
                      onChange={e => setNewValue(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label htmlFor="readingDate">Data</Label>
                    <Input
                      id="readingDate"
                      type="date"
                      value={newDate}
                      onChange={e => setNewDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="readingType">Typ odczytu</Label>
                  <select
                    id="readingType"
                    value={newType}
                    onChange={e => setNewType(e.target.value as ReadingType)}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="REGULAR">Regularny</option>
                    <option value="INITIAL">Początkowy</option>
                    <option value="FINAL">Końcowy</option>
                  </select>
                </div>

                <div>
                  <Label htmlFor="readingNotes">Uwagi (opcjonalnie)</Label>
                  <Input
                    id="readingNotes"
                    placeholder="np. odczyt przy przekazaniu"
                    value={newNotes}
                    onChange={e => setNewNotes(e.target.value)}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => setShowAddForm(false)}
                  >
                    Anuluj
                  </Button>
                  <Button type="submit" size="sm" className="flex-1" disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <><Check className="h-4 w-4 mr-1" /> Zapisz</>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Readings List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : readings.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-10 w-10 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 text-sm">Brak odczytów</p>
            </div>
          ) : (
            <div className="space-y-0">
              {readings.map((reading, index) => {
                const prevReading = readings[index + 1]
                const consumption = prevReading
                  ? (reading.value - prevReading.value).toFixed(2)
                  : null
                const isNegative = consumption !== null && parseFloat(consumption) < 0
                const dateStr = new Date(reading.readingDate).toLocaleDateString('pl-PL', {
                  day: 'numeric', month: 'short', year: 'numeric'
                })

                return (
                  <div
                    key={reading.id}
                    className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0"
                  >
                    {/* Timeline dot */}
                    <div className="mt-1.5 shrink-0">
                      <div className={`w-2.5 h-2.5 rounded-full ${
                        reading.readingType === 'INITIAL' ? 'bg-green-500' :
                        reading.readingType === 'METER_EXCHANGE' ? 'bg-orange-500' :
                        reading.readingType === 'FINAL' ? 'bg-red-500' :
                        'bg-blue-500'
                      }`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between">
                        <span className="font-medium text-gray-900">
                          {reading.value.toFixed(2)} {meter.unit}
                        </span>
                        {consumption && (
                          <span className={`text-xs font-medium ${isNegative ? 'text-red-600' : 'text-gray-500'}`}>
                            {parseFloat(consumption) > 0 ? '+' : ''}{consumption} {meter.unit}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                        <span>{dateStr}</span>
                        {reading.readingType !== 'REGULAR' && (
                          <Badge className="text-[10px] py-0 px-1.5 bg-gray-100 text-gray-600">
                            {READING_TYPE_LABELS[reading.readingType]}
                          </Badge>
                        )}
                        {reading.tenant && (
                          <span className="text-gray-400">
                            {reading.tenant.firstName} {reading.tenant.lastName}
                          </span>
                        )}
                      </div>
                      {reading.notes && (
                        <p className="text-xs text-gray-400 mt-0.5 italic">{reading.notes}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ============================================
// Exchange Dialog
// ============================================

function ExchangeDialog({
  meter,
  onClose,
  onSuccess,
}: {
  meter: Meter
  onClose: () => void
  onSuccess: () => void
}) {
  const config = METER_TYPE_CONFIG[meter.type]
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    finalReading: '',
    newMeterNumber: '',
    newSerialNumber: '',
    newInitialReading: '0',
    notes: '',
  })

  const lastValue = meter.lastReading?.value

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const finalVal = parseFloat(form.finalReading)
    if (lastValue !== undefined && finalVal < lastValue) {
      setError(`Odczyt końcowy (${finalVal}) nie może być mniejszy niż ostatni odczyt (${lastValue})`)
      setSaving(false)
      return
    }

    try {
      const res = await fetch(`/api/meters/${meter.id}/exchange`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          finalReading: finalVal,
          newMeterNumber: form.newMeterNumber || undefined,
          newSerialNumber: form.newSerialNumber || undefined,
          newInitialReading: parseFloat(form.newInitialReading || '0'),
          notes: form.notes || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Błąd wymiany licznika')
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
          <div className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-orange-600" />
            <h2 className="text-lg font-semibold">Wymiana licznika</h2>
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

          {/* Current meter info */}
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <div className="flex items-center gap-2 mb-1">
              <div className={`p-1 rounded ${config.bgColor}`}>
                <config.icon className={`h-3.5 w-3.5 ${config.color}`} />
              </div>
              <span className="font-medium">{config.label}</span>
              {meter.meterNumber && <span className="text-gray-500">— Nr: {meter.meterNumber}</span>}
            </div>
            {lastValue !== undefined && (
              <p className="text-gray-500 ml-7">
                Ostatni odczyt: <span className="font-medium text-gray-700">{lastValue.toFixed(2)} {meter.unit}</span>
              </p>
            )}
          </div>

          {/* Old meter — final reading */}
          <div>
            <Label htmlFor="finalReading">
              Odczyt końcowy starego licznika ({meter.unit}) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="finalReading"
              type="number"
              step="0.01"
              min={lastValue || 0}
              placeholder={lastValue?.toFixed(2) || '0.00'}
              value={form.finalReading}
              onChange={e => setForm(prev => ({ ...prev, finalReading: e.target.value }))}
              required
              autoFocus
            />
          </div>

          <hr className="border-gray-200" />

          {/* New meter info */}
          <p className="text-sm font-medium text-gray-700">Nowy licznik</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="newMeterNumber">Numer nowego licznika</Label>
              <Input
                id="newMeterNumber"
                placeholder="np. E-67890"
                value={form.newMeterNumber}
                onChange={e => setForm(prev => ({ ...prev, newMeterNumber: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="newSerialNumber">Numer seryjny</Label>
              <Input
                id="newSerialNumber"
                placeholder="opcjonalnie"
                value={form.newSerialNumber}
                onChange={e => setForm(prev => ({ ...prev, newSerialNumber: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="newInitialReading">
              Odczyt początkowy nowego ({meter.unit}) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="newInitialReading"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.newInitialReading}
              onChange={e => setForm(prev => ({ ...prev, newInitialReading: e.target.value }))}
              required
            />
            <p className="text-xs text-gray-400 mt-1">Zwykle 0 dla nowego licznika</p>
          </div>

          <div>
            <Label htmlFor="exchangeNotes">Uwagi</Label>
            <Input
              id="exchangeNotes"
              placeholder="np. wymiana planowa, awaria..."
              value={form.notes}
              onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Anuluj
            </Button>
            <Button type="submit" className="flex-1 bg-orange-600 hover:bg-orange-700" disabled={saving}>
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Wymiana...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-2" /> Wymień licznik</>
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