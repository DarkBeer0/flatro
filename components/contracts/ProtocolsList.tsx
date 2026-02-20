// components/contracts/ProtocolsList.tsx
// Flatro — V9: Protocols list for Contract detail page
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
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ProtocolType } from '@/lib/contracts/lifecycle-types'

const TYPE_CONFIG: Record<ProtocolType, { label: string; icon: typeof ArrowUpFromLine; color: string }> = {
  MOVE_IN: { label: 'Wydanie lokalu', icon: ArrowUpFromLine, color: 'bg-green-100 text-green-700' },
  MOVE_OUT: { label: 'Zwrot lokalu', icon: ArrowDownToLine, color: 'bg-orange-100 text-orange-700' },
}

interface Protocol {
  id: string
  type: ProtocolType
  date: string
  meterReadings: any[]
  keysHandedOver: any[]
  createdAt: string
}

interface ProtocolsListProps {
  contractId: string
  onCreateProtocol?: (type: ProtocolType) => void
}

export function ProtocolsList({ contractId, onCreateProtocol }: ProtocolsListProps) {
  const [protocols, setProtocols] = useState<Protocol[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<string | null>(null)

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
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCreateProtocol?.('MOVE_IN')}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Wydanie
            </Button>
          )}
          {hasMoveIn && !hasMoveOut && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCreateProtocol?.('MOVE_OUT')}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              Zwrot
            </Button>
          )}
        </div>
      </div>

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
                      <Badge className={cfg.color}>{cfg.label}</Badge>
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