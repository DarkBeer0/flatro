// app/(tenant)/tenant/contracts/page.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  FileText,
  Calendar,
  Home,
  ChevronRight,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Contract {
  id: string
  type: string
  status: string
  startDate: string
  endDate: string | null
  rentAmount: number
  adminFee: number
  utilitiesAdvance: number
  signedByOwner: boolean
  signedByTenant: boolean
  contractSource: string
  tenant: { id: string; firstName: string; lastName: string }
  property: { id: string; name: string; address: string; city?: string }
  attachments: any[]
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT: { label: 'Szkic', color: 'bg-gray-100 text-gray-700', icon: FileText },
  PENDING_SIGNATURE: { label: 'Oczekuje na podpis', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  SIGNED: { label: 'Podpisana', color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  ACTIVE: { label: 'Aktywna', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  EXPIRED: { label: 'Wygasła', color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
  TERMINATED: { label: 'Rozwiązana', color: 'bg-red-100 text-red-700', icon: XCircle },
}

const TYPE_LABELS: Record<string, string> = {
  STANDARD: 'Najem zwykły',
  OCCASIONAL: 'Najem okazjonalny',
  INSTITUTIONAL: 'Najem instytucjonalny',
}

export default function TenantContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadContracts() {
      try {
        const res = await fetch('/api/tenant/contracts')
        if (!res.ok) throw new Error('Błąd ładowania')
        setContracts(await res.json())
      } catch (err) {
        setError('Nie udało się załadować umów')
      } finally {
        setLoading(false)
      }
    }
    loadContracts()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Moje umowy</h1>
        <p className="text-gray-500 mt-1">Przeglądaj swoje umowy najmu</p>
      </div>

      {error && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        </Card>
      )}

      {contracts.length === 0 && !error ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">Brak umów</h3>
          <p className="text-gray-500">
            Nie masz jeszcze żadnych umów. Twój właściciel musi najpierw utworzyć umowę.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {contracts.map((contract) => {
            const statusCfg = STATUS_CONFIG[contract.status] || STATUS_CONFIG.DRAFT
            const StatusIcon = statusCfg.icon
            const total = contract.rentAmount + contract.adminFee + contract.utilitiesAdvance

            return (
              <Link key={contract.id} href={`/tenant/contracts/${contract.id}`}>
                <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-green-400">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Home className="h-4 w-4 text-gray-400" />
                        <span className="font-medium text-gray-900">
                          {contract.property.name}
                        </span>
                        <Badge className={`${statusCfg.color} text-xs`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusCfg.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">
                        {contract.property.address}
                        {contract.property.city ? `, ${contract.property.city}` : ''}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(contract.startDate).toLocaleDateString('pl-PL')}
                          {' — '}
                          {contract.endDate
                            ? new Date(contract.endDate).toLocaleDateString('pl-PL')
                            : 'bezterminowo'}
                        </span>
                        <span>{TYPE_LABELS[contract.type] || contract.type}</span>
                      </div>

                      {/* Signing status */}
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className={contract.signedByOwner ? 'text-green-600' : 'text-gray-400'}>
                          {contract.signedByOwner ? '✅' : '⏳'} Właściciel
                        </span>
                        <span className={contract.signedByTenant ? 'text-green-600' : 'text-gray-400'}>
                          {contract.signedByTenant ? '✅' : '⏳'} Najemca
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">
                          {total.toLocaleString('pl-PL')} zł
                        </div>
                        <div className="text-xs text-gray-500">/ mies.</div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}