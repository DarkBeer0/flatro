// components/contracts/AnnexesList.tsx
// Flatro — V9: Annexes list + creation modal + delete
'use client'

import { useState, useEffect } from 'react'
import {
  FileText,
  Download,
  Plus,
  PenTool,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  CalendarPlus,
  FileEdit,
  Trash2,
  X,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AnnexType, AnnexStatus, RentChangeData, ExtensionChangeData } from '@/lib/contracts/lifecycle-types'

const TYPE_CONFIG: Record<AnnexType, { label: string; icon: typeof TrendingUp; desc: string }> = {
  RENT_CHANGE: { label: 'Zmiana czynszu', icon: TrendingUp, desc: 'Zmiana wysokości czynszu' },
  EXTENSION: { label: 'Przedłużenie', icon: CalendarPlus, desc: 'Przedłużenie okresu umowy' },
  OTHER: { label: 'Inne', icon: FileEdit, desc: 'Inne zmiany warunków umowy' },
}

const STATUS_CONFIG: Record<AnnexStatus, { label: string; color: string }> = {
  DRAFT: { label: 'Szkic', color: 'bg-yellow-100 text-yellow-700' },
  SIGNED: { label: 'Podpisany', color: 'bg-green-100 text-green-700' },
}

interface Annex {
  id: string
  annexNumber: number
  type: AnnexType
  status: AnnexStatus
  effectiveDate: string
  changes: Record<string, any>
  customText: string | null
  signedAt: string | null
  createdAt: string
}

interface AnnexesListProps {
  contractId: string
  onCreateAnnex?: () => void
  onContractUpdated?: () => void
}

export function AnnexesList({ contractId, onContractUpdated }: AnnexesListProps) {
  const [annexes, setAnnexes] = useState<Annex[]>([])
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)

  // Creation modal state
  const [showForm, setShowForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [annexType, setAnnexType] = useState<AnnexType>('RENT_CHANGE')
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0])
  const [newRent, setNewRent] = useState('')
  const [newEndDate, setNewEndDate] = useState('')
  const [customText, setCustomText] = useState('')

  // Lock scroll when modal open
  useEffect(() => {
    if (showForm) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showForm])

  useEffect(() => {
    fetchAnnexes()
  }, [contractId])

  async function fetchAnnexes() {
    try {
      const res = await fetch(`/api/contracts/${contractId}/annexes`)
      if (res.ok) {
        setAnnexes(await res.json())
      }
    } catch (err) {
      console.error('Error fetching annexes:', err)
    } finally {
      setLoading(false)
    }
  }

  function openCreateForm() {
    setShowForm(true)
    setFormError(null)
    setAnnexType('RENT_CHANGE')
    setEffectiveDate(new Date().toISOString().split('T')[0])
    setNewRent('')
    setNewEndDate('')
    setCustomText('')
  }

  async function handleCreate() {
    setCreating(true)
    setFormError(null)

    try {
      const body: Record<string, any> = {
        type: annexType,
        effectiveDate,
      }

      if (annexType === 'RENT_CHANGE') {
        if (!newRent || parseFloat(newRent) <= 0) {
          setFormError('Podaj nowy czynsz (wartość > 0)')
          setCreating(false)
          return
        }
        body.newRent = parseFloat(newRent)
      } else if (annexType === 'EXTENSION') {
        if (!newEndDate) {
          setFormError('Podaj nową datę zakończenia umowy')
          setCreating(false)
          return
        }
        body.newEndDate = newEndDate
      } else {
        if (!customText.trim()) {
          setFormError('Podaj treść zmian')
          setCreating(false)
          return
        }
        body.customText = customText.trim()
      }

      const res = await fetch(`/api/contracts/${contractId}/annexes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setFormError(data.error || 'Błąd tworzenia aneksu')
        return
      }

      setShowForm(false)
      fetchAnnexes()
    } catch {
      setFormError('Błąd połączenia')
    } finally {
      setCreating(false)
    }
  }

  async function handleSign(annexId: string) {
    if (!confirm('Czy na pewno chcesz podpisać ten aneks?\n\nPo podpisaniu zmiany zostaną natychmiast zastosowane do umowy.')) return

    setSigning(annexId)
    try {
      const res = await fetch(`/api/contracts/${contractId}/annexes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annexId, action: 'sign' }),
      })
      if (res.ok) {
        await fetchAnnexes()
        onContractUpdated?.()
      } else {
        const data = await res.json()
        alert(data.error || 'Błąd podpisania aneksu')
      }
    } catch {
      alert('Błąd połączenia')
    } finally {
      setSigning(null)
    }
  }

  async function handleDelete(annexId: string) {
    if (!confirm('Czy na pewno chcesz usunąć ten aneks?')) return

    setDeleting(annexId)
    try {
      const res = await fetch(
        `/api/contracts/${contractId}/annexes?annexId=${annexId}`,
        { method: 'DELETE' }
      )
      if (res.ok) {
        fetchAnnexes()
      } else {
        const data = await res.json()
        alert(data.error || 'Błąd usuwania aneksu')
      }
    } catch {
      alert('Błąd połączenia')
    } finally {
      setDeleting(null)
    }
  }

  async function handleDownloadPdf(annexId: string) {
    setDownloading(annexId)
    try {
      const res = await fetch(
        `/api/contracts/${contractId}/generate-lifecycle-pdf?type=annex&annexId=${annexId}`
      )
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `aneks-${annexId.slice(0, 8)}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('Error downloading PDF:', err)
    } finally {
      setDownloading(null)
    }
  }

  const pendingAnnexes = annexes.filter((a) => a.status === 'DRAFT')
  const upcomingRentChanges = pendingAnnexes.filter(
    (a) => a.type === 'RENT_CHANGE' && new Date(a.effectiveDate) > new Date()
  )

  function getChangeDescription(annex: Annex): string {
    switch (annex.type) {
      case 'RENT_CHANGE': {
        const c = annex.changes as RentChangeData
        return `${c.previousRent?.toFixed(2)} PLN → ${c.newRent?.toFixed(2)} PLN`
      }
      case 'EXTENSION': {
        const c = annex.changes as ExtensionChangeData
        return c.newEndDate
          ? `Nowa data końca: ${new Date(c.newEndDate).toLocaleDateString('pl-PL')}`
          : 'Przedłużenie na czas nieokreślony'
      }
      case 'OTHER':
        return annex.customText?.slice(0, 60) + (annex.customText && annex.customText.length > 60 ? '...' : '') || 'Dodatkowe postanowienia'
      default:
        return ''
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* ═══ WARNING BANNER ═══ */}
      {upcomingRentChanges.length > 0 && (
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Oczekujący aneks — zmiana czynszu</p>
            {upcomingRentChanges.map((a) => (
              <p key={a.id} className="text-xs text-amber-700 mt-1">
                Aneks nr {a.annexNumber}: od {new Date(a.effectiveDate).toLocaleDateString('pl-PL')} — {getChangeDescription(a)}
              </p>
            ))}
            <p className="text-xs text-amber-600 mt-1">Podpisz aneks, aby zastosować zmiany do umowy.</p>
          </div>
        </div>
      )}

      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Aneksy do umowy</h3>
        <Button size="sm" variant="outline" onClick={openCreateForm}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Nowy aneks
        </Button>
      </div>

      {/* ═══ CREATION MODAL ═══ */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 pt-8 pb-8"
          onClick={(e) => { if (e.target === e.currentTarget) setShowForm(false) }}
        >
          <Card className="w-full max-w-lg my-auto shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b bg-gray-50 rounded-t-lg">
              <div>
                <h3 className="font-semibold text-gray-900">Nowy aneks do umowy</h3>
                <p className="text-xs text-gray-500">Utwórz szkic aneksu — podpiszesz go osobno</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-5">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{formError}</div>
              )}

              {/* Type selection */}
              <div>
                <Label className="mb-2 block">Rodzaj aneksu</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(Object.keys(TYPE_CONFIG) as AnnexType[]).map((type) => {
                    const cfg = TYPE_CONFIG[type]
                    const Icon = cfg.icon
                    const isActive = annexType === type
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setAnnexType(type)}
                        className={`p-3 rounded-lg border-2 text-center transition-all ${
                          isActive
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        <Icon className={`h-5 w-5 mx-auto mb-1 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                        <span className="text-xs font-medium">{cfg.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Effective date */}
              <div>
                <Label className="mb-1.5 block">Data obowiązywania</Label>
                <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
              </div>

              {/* Type-specific fields */}
              {annexType === 'RENT_CHANGE' && (
                <div>
                  <Label className="mb-1.5 block">Nowy czynsz (PLN)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="np. 2500.00"
                    value={newRent}
                    onChange={(e) => setNewRent(e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">Aktualny czynsz zostanie zapisany automatycznie jako poprzedni.</p>
                </div>
              )}

              {annexType === 'EXTENSION' && (
                <div>
                  <Label className="mb-1.5 block">Nowa data zakończenia umowy</Label>
                  <Input type="date" value={newEndDate} onChange={(e) => setNewEndDate(e.target.value)} />
                </div>
              )}

              {annexType === 'OTHER' && (
                <div>
                  <Label className="mb-1.5 block">Treść zmian</Label>
                  <textarea
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="Opisz zmiany do umowy..."
                    rows={4}
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
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
                Utwórz aneks
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ═══ LIST ═══ */}
      {annexes.length === 0 ? (
        <Card className="p-6 text-center">
          <FileText className="h-8 w-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">Brak aneksów do tej umowy.</p>
        </Card>
      ) : (
        annexes.map((annex) => {
          const typeCfg = TYPE_CONFIG[annex.type]
          const statusCfg = STATUS_CONFIG[annex.status]
          const Icon = typeCfg.icon

          return (
            <Card key={annex.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-50">
                    <Icon className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">Aneks nr {annex.annexNumber}</span>
                      <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
                      <Badge variant="outline" className="text-xs">{typeCfg.label}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Od {new Date(annex.effectiveDate).toLocaleDateString('pl-PL')} · {getChangeDescription(annex)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  {annex.status === 'DRAFT' && (
                    <>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => handleSign(annex.id)}
                        disabled={signing === annex.id}
                      >
                        {signing === annex.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <PenTool className="h-3.5 w-3.5" />
                        )}
                        <span className="ml-1.5">Podpisz</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(annex.id)}
                        disabled={deleting === annex.id}
                      >
                        {deleting === annex.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadPdf(annex.id)}
                    disabled={downloading === annex.id}
                  >
                    {downloading === annex.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    <span className="ml-1.5">PDF</span>
                  </Button>
                </div>
              </div>
            </Card>
          )
        })
      )}

      {annexes.length > 0 && pendingAnnexes.length === 0 && (
        <div className="flex items-center gap-2 text-xs text-green-600">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Wszystkie aneksy podpisane
        </div>
      )}
    </div>
  )
}