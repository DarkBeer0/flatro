// components/contracts/ProtocolsList.tsx
// Flatro — V9: Protocols list + inline creation modal
'use client'

import { useState, useEffect } from 'react'
import {
  FileText,
  Download,
  Plus,
  ArrowUpFromLine,
  ArrowDownToLine,
  Loader2,
  CheckCircle2,
  X,
  Calendar,
  Gauge,
  Key,
  Camera,
  Trash2,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ProtocolType } from '@/lib/contracts/lifecycle-types'

const TYPE_CONFIG: Record<ProtocolType, { label: string; icon: typeof ArrowUpFromLine; color: string }> = {
  MOVE_IN: { label: 'Wydanie lokalu', icon: ArrowUpFromLine, color: 'bg-green-100 text-green-700' },
  MOVE_OUT: { label: 'Zwrot lokalu', icon: ArrowDownToLine, color: 'bg-orange-100 text-orange-700' },
}

const METER_TYPE_LABELS: Record<string, string> = {
  ELECTRICITY: 'Energia elektryczna',
  GAS: 'Gaz',
  WATER_COLD: 'Woda zimna',
  WATER_HOT: 'Woda ciepła',
  HEATING: 'Ogrzewanie',
}

const DEFAULT_KEYS = [
  { type: 'Klucz do mieszkania', count: 2, description: '' },
  { type: 'Klucz do klatki', count: 1, description: '' },
  { type: 'Klucz do piwnicy', count: 1, description: '' },
]

const DEFAULT_ROOMS = [
  {
    roomName: 'Pokój główny',
    items: [
      { name: 'Ściany', condition: 'GOOD' as const, notes: '' },
      { name: 'Podłoga', condition: 'GOOD' as const, notes: '' },
      { name: 'Okna', condition: 'GOOD' as const, notes: '' },
    ],
  },
  {
    roomName: 'Kuchnia',
    items: [
      { name: 'Ściany', condition: 'GOOD' as const, notes: '' },
      { name: 'Podłoga', condition: 'GOOD' as const, notes: '' },
      { name: 'Sprzęt AGD', condition: 'GOOD' as const, notes: '' },
    ],
  },
  {
    roomName: 'Łazienka',
    items: [
      { name: 'Ściany', condition: 'GOOD' as const, notes: '' },
      { name: 'Podłoga', condition: 'GOOD' as const, notes: '' },
      { name: 'Armatura', condition: 'GOOD' as const, notes: '' },
    ],
  },
]

const CONDITION_OPTIONS = [
  { value: 'GOOD', label: 'Dobry' },
  { value: 'FAIR', label: 'Dostateczny' },
  { value: 'POOR', label: 'Zły' },
  { value: 'DAMAGED', label: 'Uszkodzony' },
]

interface Protocol {
  id: string
  type: ProtocolType
  date: string
  meterReadings: any[]
  keysHandedOver: any[]
  createdAt: string
}

interface Meter {
  id: string
  type: string
  meterNumber: string | null
  unit: string
}

interface ProtocolsListProps {
  contractId: string
  onCreateProtocol?: (type: ProtocolType) => void
}

export function ProtocolsList({ contractId }: ProtocolsListProps) {
  const [protocols, setProtocols] = useState<Protocol[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)

  // Creation form state
  const [showForm, setShowForm] = useState(false)
  const [formType, setFormType] = useState<ProtocolType>('MOVE_IN')
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [protocolDate, setProtocolDate] = useState(new Date().toISOString().split('T')[0])
  const [meters, setMeters] = useState<Meter[]>([])
  const [meterValues, setMeterValues] = useState<Record<string, string>>({})
  const [keys, setKeys] = useState(DEFAULT_KEYS.map((k) => ({ ...k })))
  const [rooms, setRooms] = useState(DEFAULT_ROOMS.map((r) => ({ ...r, items: r.items.map((i) => ({ ...i })) })))
  const [generalNotes, setGeneralNotes] = useState('')
  const [photos, setPhotos] = useState<{ url: string; caption: string; roomName: string }[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)

  // Lock body scroll when modal is open
  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showForm])

  useEffect(() => {
    fetchProtocols()
  }, [contractId])

  async function fetchProtocols() {
    try {
      const res = await fetch(`/api/contracts/${contractId}/protocols`)
      if (res.ok) {
        setProtocols(await res.json())
      }
    } catch (err) {
      console.error('Error fetching protocols:', err)
    } finally {
      setLoading(false)
    }
  }

  async function fetchMeters() {
    try {
      const contractRes = await fetch(`/api/contracts/${contractId}`)
      if (!contractRes.ok) return
      const contract = await contractRes.json()

      const metersRes = await fetch(`/api/properties/${contract.property.id}/meters`)
      if (metersRes.ok) {
        const data = await metersRes.json()
        const activeMeters = (data || []).filter((m: any) => m.status === 'ACTIVE')
        setMeters(activeMeters)
        const vals: Record<string, string> = {}
        activeMeters.forEach((m: Meter) => { vals[m.id] = '' })
        setMeterValues(vals)
      }
    } catch (err) {
      console.error('Error fetching meters:', err)
    }
  }

  function openCreateForm(type: ProtocolType) {
    setFormType(type)
    setShowForm(true)
    setFormError(null)
    setProtocolDate(new Date().toISOString().split('T')[0])
    setKeys(DEFAULT_KEYS.map((k) => ({ ...k })))
    setRooms(DEFAULT_ROOMS.map((r) => ({ ...r, items: r.items.map((i) => ({ ...i })) })))
    setGeneralNotes('')
    setPhotos([])
    fetchMeters()
  }

  async function handleCreate() {
    setCreating(true)
    setFormError(null)

    try {
      const meterReadings = meters
        .filter((m) => meterValues[m.id] && meterValues[m.id].trim() !== '')
        .map((m) => ({
          meterId: m.id,
          meterNumber: m.meterNumber || '',
          meterType: m.type,
          value: parseFloat(meterValues[m.id]),
        }))

      const keysHandedOver = keys.filter((k) => k.count > 0 && k.type.trim())

      const body = {
        type: formType,
        date: protocolDate,
        meterReadings,
        keysHandedOver,
        roomsCondition: rooms,
        generalNotes: generalNotes.trim() || null,
        photos,
      }

      const res = await fetch(`/api/contracts/${contractId}/protocols`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setFormError(data.error || 'Błąd tworzenia protokołu')
        return
      }

      setShowForm(false)
      fetchProtocols()
    } catch {
      setFormError('Błąd połączenia')
    } finally {
      setCreating(false)
    }
  }

  async function handleDownloadPdf(protocolId: string) {
    setDownloading(protocolId)
    try {
      const res = await fetch(
        `/api/contracts/${contractId}/generate-lifecycle-pdf?type=protocol&protocolId=${protocolId}`
      )
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `protokol-${protocolId.slice(0, 8)}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Error downloading PDF:', err)
    } finally {
      setDownloading(null)
    }
  }

  function updateKey(index: number, field: string, value: string | number) {
    setKeys(keys.map((k, i) => (i === index ? { ...k, [field]: value } : k)))
  }
  function addKey() {
    setKeys([...keys, { type: '', count: 1, description: '' }])
  }
  function removeKey(index: number) {
    setKeys(keys.filter((_, i) => i !== index))
  }

  function updateRoomItem(roomIdx: number, itemIdx: number, field: string, value: string) {
    setRooms(rooms.map((r, ri) =>
      ri === roomIdx
        ? { ...r, items: r.items.map((item, ii) => (ii === itemIdx ? { ...item, [field]: value } : item)) }
        : r
    ))
  }

  // Photo handlers
  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingPhotos(true)
    try {
      // Get propertyId from contract
      const contractRes = await fetch(`/api/contracts/${contractId}`)
      if (!contractRes.ok) return
      const contract = await contractRes.json()

      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('type', 'issue')
        formData.append('propertyId', contract.property.id)

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        })

        if (res.ok) {
          const data = await res.json()
          setPhotos((prev) => [...prev, {
            url: data.url || data.signedUrl || data.path,
            caption: '',
            roomName: '',
          }])
        }
      }
    } catch (err) {
      console.error('Error uploading photos:', err)
    } finally {
      setUploadingPhotos(false)
      // Reset file input
      e.target.value = ''
    }
  }

  function removePhoto(index: number) {
    setPhotos(photos.filter((_, i) => i !== index))
  }

  function updatePhoto(index: number, field: string, value: string) {
    setPhotos(photos.map((p, i) => (i === index ? { ...p, [field]: value } : p)))
  }

  const hasMoveIn = protocols.some((p) => p.type === 'MOVE_IN')
  const hasMoveOut = protocols.some((p) => p.type === 'MOVE_OUT')

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Protokoły zdawczo-odbiorcze
        </h3>
        <div className="flex gap-2">
          {!hasMoveIn && (
            <Button size="sm" variant="outline" onClick={() => openCreateForm('MOVE_IN')}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Wydanie
            </Button>
          )}
          {hasMoveIn && !hasMoveOut && (
            <Button size="sm" variant="outline" onClick={() => openCreateForm('MOVE_OUT')}>
              <Plus className="h-3.5 w-3.5 mr-1" />
              Zwrot
            </Button>
          )}
        </div>
      </div>

      {/* ═══ CREATION MODAL ═══ */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 pt-8 pb-8"
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false) }}
        >
          <Card className="w-full max-w-2xl my-auto shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b bg-gray-50 rounded-t-lg">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${TYPE_CONFIG[formType].color.split(' ')[0]}`}>
                  {formType === 'MOVE_IN' ? (
                    <ArrowUpFromLine className={`h-5 w-5 ${TYPE_CONFIG[formType].color.split(' ')[1]}`} />
                  ) : (
                    <ArrowDownToLine className={`h-5 w-5 ${TYPE_CONFIG[formType].color.split(' ')[1]}`} />
                  )}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    Protokół: {TYPE_CONFIG[formType].label}
                  </h3>
                  <p className="text-xs text-gray-500">Wypełnij dane protokołu zdawczo-odbiorczego</p>
                </div>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-6 max-h-[65vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {formError}
                </div>
              )}

              {/* Date */}
              <div>
                <Label className="flex items-center gap-2 mb-1.5">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  Data protokołu
                </Label>
                <Input
                  type="date"
                  value={protocolDate}
                  onChange={(e) => setProtocolDate(e.target.value)}
                />
              </div>

              {/* Meter Readings */}
              <div>
                <Label className="flex items-center gap-2 mb-2">
                  <Gauge className="h-4 w-4 text-gray-400" />
                  Stany liczników
                </Label>
                {meters.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">
                    Brak aktywnych liczników przypisanych do nieruchomości.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {meters.map((meter) => (
                      <div key={meter.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700">
                            {METER_TYPE_LABELS[meter.type] || meter.type}
                          </p>
                          <p className="text-xs text-gray-400">
                            {meter.meterNumber ? `Nr: ${meter.meterNumber}` : 'Brak numeru'} · {meter.unit}
                          </p>
                        </div>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Odczyt"
                          className="w-32"
                          value={meterValues[meter.id] || ''}
                          onChange={(e) => setMeterValues({ ...meterValues, [meter.id]: e.target.value })}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Keys */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-2">
                    <Key className="h-4 w-4 text-gray-400" />
                    Przekazane klucze
                  </Label>
                  <Button size="sm" variant="ghost" onClick={addKey} className="text-xs h-7">
                    <Plus className="h-3 w-3 mr-1" />
                    Dodaj
                  </Button>
                </div>
                <div className="space-y-2">
                  {keys.map((key, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        placeholder="Rodzaj klucza"
                        value={key.type}
                        onChange={(e) => updateKey(i, 'type', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        type="number"
                        min="0"
                        placeholder="Szt."
                        value={key.count}
                        onChange={(e) => updateKey(i, 'count', parseInt(e.target.value) || 0)}
                        className="w-20"
                      />
                      <button onClick={() => removeKey(i)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Room Conditions */}
              <div>
                <Label className="mb-2 block">Stan techniczny pomieszczeń</Label>
                <div className="space-y-4">
                  {rooms.map((room, ri) => (
                    <div key={ri} className="border rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">{room.roomName}</p>
                      <div className="space-y-2">
                        {room.items.map((item, ii) => (
                          <div key={ii} className="flex items-center gap-2">
                            <span className="text-sm text-gray-600 w-28 flex-shrink-0">{item.name}</span>
                            <select
                              className="flex-1 rounded-md border border-gray-200 px-2 py-1.5 text-sm bg-white"
                              value={item.condition}
                              onChange={(e) => updateRoomItem(ri, ii, 'condition', e.target.value)}
                            >
                              {CONDITION_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                            <Input
                              placeholder="Uwagi"
                              value={item.notes}
                              onChange={(e) => updateRoomItem(ri, ii, 'notes', e.target.value)}
                              className="flex-1"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Photos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="flex items-center gap-2">
                    <Camera className="h-4 w-4 text-gray-400" />
                    Dokumentacja fotograficzna
                  </Label>
                  <label className="cursor-pointer">
                    <Button size="sm" variant="ghost" className="text-xs h-7" asChild disabled={uploadingPhotos}>
                      <span>
                        {uploadingPhotos ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Plus className="h-3 w-3 mr-1" />
                        )}
                        Dodaj zdjęcia
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={handlePhotoUpload}
                      disabled={uploadingPhotos}
                    />
                  </label>
                </div>
                {photos.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">
                    Opcjonalnie dodaj zdjęcia stanu lokalu, mebli, sprzętu AGD.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {photos.map((photo, i) => (
                      <div key={i} className="relative border rounded-lg overflow-hidden bg-gray-50">
                        <img
                          src={photo.url}
                          alt={photo.caption || `Zdjęcie ${i + 1}`}
                          className="w-full h-28 object-cover"
                        />
                        <button
                          onClick={() => removePhoto(i)}
                          className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                        <div className="p-2 space-y-1">
                          <Input
                            placeholder="Opis (np. rysa na ścianie)"
                            value={photo.caption}
                            onChange={(e) => updatePhoto(i, 'caption', e.target.value)}
                            className="h-7 text-xs"
                          />
                          <select
                            value={photo.roomName}
                            onChange={(e) => updatePhoto(i, 'roomName', e.target.value)}
                            className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs bg-white"
                          >
                            <option value="">— Pomieszczenie —</option>
                            {rooms.map((r, ri) => (
                              <option key={ri} value={r.roomName}>{r.roomName}</option>
                            ))}
                            <option value="Inne">Inne</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* General Notes */}
              <div>
                <Label className="mb-1.5 block">Uwagi ogólne</Label>
                <textarea
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  placeholder="Dodatkowe uwagi do protokołu..."
                  rows={3}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t bg-gray-50 rounded-b-lg">
              <Button variant="outline" onClick={() => setShowForm(false)} disabled={creating}>
                Anuluj
              </Button>
              <Button onClick={handleCreate} disabled={creating}>
                {creating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Utwórz protokół
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ═══ PROTOCOLS LIST ═══ */}
      {protocols.length === 0 ? (
        <Card className="p-6 text-center">
          <FileText className="h-8 w-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">
            Brak protokołów. Utwórz protokół wydania lokalu po podpisaniu umowy.
          </p>
        </Card>
      ) : (
        protocols.map((protocol) => {
          const cfg = TYPE_CONFIG[protocol.type]
          const Icon = cfg.icon

          return (
            <Card key={protocol.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${cfg.color.split(' ')[0]}`}>
                    <Icon className={`h-4 w-4 ${cfg.color.split(' ')[1]}`} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{cfg.label}</span>
                      <Badge className={cfg.color}>{protocol.type === 'MOVE_IN' ? 'Wydanie' : 'Zwrot'}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(protocol.date).toLocaleDateString('pl-PL')}
                      {' · '}
                      {(protocol.meterReadings as any[]).length} licznik(ów)
                      {' · '}
                      {(protocol.keysHandedOver as any[]).length} klucz(y)
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadPdf(protocol.id)}
                  disabled={downloading === protocol.id}
                >
                  {downloading === protocol.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  <span className="ml-1.5">PDF</span>
                </Button>
              </div>
            </Card>
          )
        })
      )}

      {hasMoveIn && hasMoveOut && (
        <div className="flex items-center gap-2 text-xs text-green-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Cykl protokołów zakończony
        </div>
      )}
    </div>
  )
}