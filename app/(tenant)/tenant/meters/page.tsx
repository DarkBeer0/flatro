// app/(tenant)/tenant/meters/page.tsx
// Flatro — Tenant Meters & Readings ("Liczniki")
// View meters, submit readings, see reading history
'use client'

import { useEffect, useState } from 'react'
import {
  Loader2, Zap, Flame, Droplets, Thermometer, Plus,
  AlertTriangle, Clock, Check, X, ChevronDown, ChevronUp,
  BarChart3, SquareStack
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// ============================================
// Types
// ============================================

interface TenantMeter {
  id: string
  type: string
  meterNumber: string | null
  unit: string
  status: string
  lastReading?: { value: number; readingDate: string } | null
}

interface MeterReading {
  id: string
  value: number
  readingDate: string
  readingType: string
  notes: string | null
  tenant: { id: string; firstName: string; lastName: string } | null
}

// ============================================
// Constants
// ============================================

const METER_TYPE_CONFIG: Record<string, {
  label: string; icon: typeof Zap; color: string; bgColor: string; unit: string
}> = {
  ELECTRICITY: { label: 'Prąd', icon: Zap, color: 'text-yellow-600', bgColor: 'bg-yellow-100', unit: 'kWh' },
  GAS:         { label: 'Gaz', icon: Flame, color: 'text-orange-600', bgColor: 'bg-orange-100', unit: 'm³' },
  WATER_COLD:  { label: 'Woda zimna', icon: Droplets, color: 'text-blue-600', bgColor: 'bg-blue-100', unit: 'm³' },
  WATER_HOT:   { label: 'Woda ciepła', icon: Droplets, color: 'text-red-500', bgColor: 'bg-red-100', unit: 'm³' },
  HEATING:     { label: 'Ogrzewanie', icon: Thermometer, color: 'text-rose-600', bgColor: 'bg-rose-100', unit: 'GJ' },
}

const READING_TYPE_LABELS: Record<string, string> = {
  REGULAR: 'Regularny',
  INITIAL: 'Początkowy',
  FINAL: 'Końcowy',
  METER_EXCHANGE: 'Wymiana',
}

// ============================================
// Main Page
// ============================================

export default function TenantMetersPage() {
  const [meters, setMeters] = useState<TenantMeter[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedMeterId, setExpandedMeterId] = useState<string | null>(null)
  const [readings, setReadings] = useState<Record<string, MeterReading[]>>({})
  const [loadingReadings, setLoadingReadings] = useState<string | null>(null)

  // Submit reading state
  const [submitMeterId, setSubmitMeterId] = useState<string | null>(null)
  const [readingValue, setReadingValue] = useState('')
  const [readingNotes, setReadingNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)
  const [submitWarning, setSubmitWarning] = useState<string | null>(null)

  useEffect(() => { fetchMeters() }, [])

  async function fetchMeters() {
    setLoading(true)
    try {
      // Use tenant dashboard API to get property info with meters
      const res = await fetch('/api/tenant/dashboard')
      if (!res.ok) throw new Error('Nie udało się pobrać danych')
      const data = await res.json()
      
      // Meters come from property — fetch them via meters API
      if (data.property?.id) {
        const metersRes = await fetch(`/api/meters?propertyId=${data.property.id}`)
        if (metersRes.ok) {
          const metersData = await metersRes.json()
          // Only show active meters
          setMeters(metersData.filter((m: any) => m.status === 'ACTIVE'))
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił błąd')
    } finally {
      setLoading(false)
    }
  }

  async function fetchReadings(meterId: string) {
    if (readings[meterId]) return // already loaded
    setLoadingReadings(meterId)
    try {
      const res = await fetch(`/api/meters/${meterId}/readings?limit=20`)
      if (res.ok) {
        const data = await res.json()
        setReadings(prev => ({ ...prev, [meterId]: data.readings }))
      }
    } catch {}
    finally { setLoadingReadings(null) }
  }

  const toggleExpand = (meterId: string) => {
    if (expandedMeterId === meterId) {
      setExpandedMeterId(null)
    } else {
      setExpandedMeterId(meterId)
      fetchReadings(meterId)
    }
  }

  const openSubmit = (meterId: string) => {
    setSubmitMeterId(meterId)
    setReadingValue('')
    setReadingNotes('')
    setSubmitSuccess(null)
    setSubmitWarning(null)
  }

  const handleSubmitReading = async (meterId: string) => {
    if (!readingValue) return
    setSubmitting(true)
    setSubmitWarning(null)
    setSubmitSuccess(null)

    try {
      const res = await fetch(`/api/meters/${meterId}/readings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          value: parseFloat(readingValue),
          readingDate: new Date().toISOString(),
          readingType: 'REGULAR',
          notes: readingNotes || undefined,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      if (data.warning) {
        setSubmitWarning(data.warning)
      }

      setSubmitSuccess(meterId)
      setSubmitMeterId(null)
      setReadingValue('')
      setReadingNotes('')

      // Refresh readings for this meter
      setReadings(prev => ({ ...prev, [meterId]: undefined } as any))
      fetchReadings(meterId)
      fetchMeters() // refresh last reading

      // Clear success after 3s
      setTimeout(() => setSubmitSuccess(null), 3000)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Błąd wysyłania odczytu')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-green-600" />
    </div>
  )

  if (error) return (
    <div className="max-w-2xl mx-auto px-4 py-12 text-center">
      <AlertTriangle className="h-12 w-12 mx-auto text-amber-400 mb-4" />
      <p className="text-gray-500 mb-4">{error}</p>
      <Button variant="outline" onClick={fetchMeters}>Spróbuj ponownie</Button>
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Liczniki</h1>
        <p className="text-sm text-gray-500">Podaj odczyty i sprawdź historię</p>
      </div>

      {submitWarning && (
        <Card className="p-3 mb-4 bg-amber-50 border-amber-200">
          <div className="flex items-center gap-2 text-sm text-amber-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {submitWarning}
          </div>
        </Card>
      )}

      {meters.length === 0 ? (
        <Card className="p-8 text-center">
          <SquareStack className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Brak liczników</h3>
          <p className="text-gray-500">
            Właściciel nie dodał jeszcze liczników do tego mieszkania.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {meters.map(meter => {
            const cfg = METER_TYPE_CONFIG[meter.type]
            const MeterIcon = cfg?.icon || SquareStack
            const isExpanded = expandedMeterId === meter.id
            const isSubmitting = submitMeterId === meter.id
            const justSubmitted = submitSuccess === meter.id
            const meterReadings = readings[meter.id]

            return (
              <Card key={meter.id} className="overflow-hidden">
                {/* Meter header */}
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${cfg?.bgColor || 'bg-gray-100'}`}>
                        <MeterIcon className={`h-5 w-5 ${cfg?.color || 'text-gray-600'}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{cfg?.label || meter.type}</h3>
                        {meter.meterNumber && (
                          <p className="text-sm text-gray-500">Nr: {meter.meterNumber}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Last reading */}
                      {meter.lastReading && (
                        <div className="text-right mr-2">
                          <p className="text-sm font-bold text-gray-900">
                            {meter.lastReading.value.toFixed(2)} {meter.unit}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(meter.lastReading.readingDate).toLocaleDateString('pl-PL')}
                          </p>
                        </div>
                      )}

                      {/* Success indicator */}
                      {justSubmitted && (
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <Check className="h-4 w-4 text-green-600" />
                        </div>
                      )}

                      {/* Actions */}
                      <Button
                        size="sm"
                        onClick={() => openSubmit(meter.id)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Plus className="h-4 w-4 mr-1" />Odczyt
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleExpand(meter.id)}
                      >
                        {isExpanded
                          ? <ChevronUp className="h-4 w-4" />
                          : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  {/* Submit reading form (inline) */}
                  {isSubmitting && (
                    <div className="mt-3 pt-3 border-t">
                      <div className="flex items-end gap-3">
                        <div className="flex-1">
                          <Label htmlFor={`reading-${meter.id}`} className="text-xs">
                            Odczyt ({meter.unit})
                          </Label>
                          <Input
                            id={`reading-${meter.id}`}
                            type="number"
                            step="0.01"
                            placeholder={meter.lastReading
                              ? `Poprzedni: ${meter.lastReading.value}`
                              : 'Wartość'}
                            value={readingValue}
                            onChange={e => setReadingValue(e.target.value)}
                            autoFocus
                          />
                        </div>
                        <div className="flex-1">
                          <Label htmlFor={`notes-${meter.id}`} className="text-xs">
                            Uwagi (opcjonalnie)
                          </Label>
                          <Input
                            id={`notes-${meter.id}`}
                            placeholder="np. Zdjęcie wysłane"
                            value={readingNotes}
                            onChange={e => setReadingNotes(e.target.value)}
                          />
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleSubmitReading(meter.id)}
                          disabled={submitting || !readingValue}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          {submitting
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <Check className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSubmitMeterId(null)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Expanded readings */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t bg-gray-50">
                    {loadingReadings === meter.id ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      </div>
                    ) : meterReadings && meterReadings.length > 0 ? (
                      <div className="space-y-2 pt-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                          Historia odczytów
                        </p>
                        {meterReadings.map((r, i) => {
                          const prevReading = meterReadings[i + 1]
                          const consumption = prevReading
                            ? (r.value - prevReading.value).toFixed(2)
                            : null
                          return (
                            <div key={r.id} className="flex items-center justify-between p-2 bg-white rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${
                                  r.readingType === 'INITIAL' ? 'bg-green-500' :
                                  r.readingType === 'FINAL' ? 'bg-red-500' :
                                  r.readingType === 'METER_EXCHANGE' ? 'bg-orange-500' :
                                  'bg-blue-500'
                                }`} />
                                <div>
                                  <p className="text-sm font-medium text-gray-900">
                                    {r.value.toFixed(2)} {meter.unit}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {new Date(r.readingDate).toLocaleDateString('pl-PL')}
                                    {r.readingType !== 'REGULAR' && (
                                      <span className="ml-1 text-gray-500">
                                        ({READING_TYPE_LABELS[r.readingType] || r.readingType})
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                {consumption !== null && (
                                  <p className={`text-xs font-medium ${
                                    parseFloat(consumption) < 0 ? 'text-red-500' : 'text-gray-500'
                                  }`}>
                                    {parseFloat(consumption) >= 0 ? '+' : ''}{consumption} {meter.unit}
                                  </p>
                                )}
                                {r.tenant && (
                                  <p className="text-xs text-gray-400">
                                    {r.tenant.firstName} {r.tenant.lastName}
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 py-4 text-center">Brak odczytów</p>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}