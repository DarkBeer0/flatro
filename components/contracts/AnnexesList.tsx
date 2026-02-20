// components/contracts/AnnexesList.tsx
// Flatro — V9: Annexes list for Contract detail page
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
  Clock,
  TrendingUp,
  CalendarPlus,
  FileEdit,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { AnnexType, AnnexStatus, RentChangeData, ExtensionChangeData } from '@/lib/contracts/lifecycle-types'

const TYPE_CONFIG: Record<AnnexType, { label: string; icon: typeof TrendingUp }> = {
  RENT_CHANGE: { label: 'Zmiana czynszu', icon: TrendingUp },
  EXTENSION: { label: 'Przedłużenie', icon: CalendarPlus },
  OTHER: { label: 'Inne', icon: FileEdit },
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

export function AnnexesList({ contractId, onCreateAnnex, onContractUpdated }: AnnexesListProps) {
  const [annexes, setAnnexes] = useState<Annex[]>([])
  const [loading, setLoading] = useState(true)
  const [signing, setSigning] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

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

  async function handleSign(annexId: string) {
    const confirmed = window.confirm(
      'Czy na pewno chcesz podpisać ten aneks?\n\nPo podpisaniu zmiany zostaną natychmiast zastosowane do umowy.'
    )
    if (!confirmed) return

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

  // Pending annexes for warning banner
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
            <p className="text-sm font-medium text-amber-800">
              Oczekujący aneks — zmiana czynszu
            </p>
            {upcomingRentChanges.map((a) => (
              <p key={a.id} className="text-xs text-amber-700 mt-1">
                Aneks nr {a.annexNumber}: zmiana czynszu od{' '}
                {new Date(a.effectiveDate).toLocaleDateString('pl-PL')} —{' '}
                {getChangeDescription(a)}
              </p>
            ))}
            <p className="text-xs text-amber-600 mt-1">
              Podpisz aneks, aby zastosować zmiany do umowy.
            </p>
          </div>
        </div>
      )}

      {/* ═══ HEADER ═══ */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
          Aneksy do umowy
        </h3>
        <Button size="sm" variant="outline" onClick={onCreateAnnex}>
          <Plus className="h-3.5 w-3.5 mr-1" />
          Nowy aneks
        </Button>
      </div>

      {/* ═══ LIST ═══ */}
      {annexes.length === 0 ? (
        <Card className="p-6 text-center">
          <FileText className="h-8 w-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">
            Brak aneksów do tej umowy.
          </p>
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
                      <span className="font-medium text-sm">
                        Aneks nr {annex.annexNumber}
                      </span>
                      <Badge className={statusCfg.color}>{statusCfg.label}</Badge>
                      <Badge variant="outline" className="text-xs">
                        {typeCfg.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Od {new Date(annex.effectiveDate).toLocaleDateString('pl-PL')}
                      {' · '}
                      {getChangeDescription(annex)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  {annex.status === 'DRAFT' && (
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