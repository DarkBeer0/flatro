// app/(tenant)/tenant/contracts/[id]/page.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  Home,
  User,
  Calendar,
  CreditCard,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Loader2,
  PenTool,
  Shield,
  History,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

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

export default function TenantContractDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [contract, setContract] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [signing, setSigning] = useState(false)
  const [signSuccess, setSignSuccess] = useState(false)

  const loadContract = useCallback(async () => {
    try {
      const res = await fetch(`/api/tenant/contracts/${id}`)
      if (!res.ok) {
        setError(res.status === 404 ? 'Umowa nie została znaleziona' : 'Błąd ładowania')
        return
      }
      setContract(await res.json())
    } catch {
      setError('Błąd połączenia')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    loadContract()
  }, [loadContract])

  async function handleSign() {
    if (!contract || signing) return

    const confirmed = window.confirm(
      'Czy na pewno chcesz potwierdzić podpis tej umowy?\n\n' +
        'To oznacza, że zapoznałeś/aś się z warunkami umowy i je akceptujesz.'
    )
    if (!confirmed) return

    setSigning(true)
    try {
      const res = await fetch(`/api/tenant/contracts/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'sign' }),
      })

      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Błąd podpisywania')
        return
      }

      const updated = await res.json()
      setContract((prev: any) => ({
        ...prev,
        ...updated,
        signedByTenant: true,
        tenantSignedAt: new Date().toISOString(),
      }))
      setSignSuccess(true)
    } catch {
      alert('Błąd połączenia')
    } finally {
      setSigning(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">{error || 'Nie znaleziono'}</h3>
          <Link href="/tenant/contracts">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Powrót do listy
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  const statusCfg = STATUS_CONFIG[contract.status] || STATUS_CONFIG.DRAFT
  const StatusIcon = statusCfg.icon
  const totalMonthly =
    (contract.rentAmount || 0) + (contract.adminFee || 0) + (contract.utilitiesAdvance || 0)

  const canSign =
    !contract.signedByTenant &&
    ['DRAFT', 'PENDING_SIGNATURE'].includes(contract.status)

  const daysLeft = contract.endDate
    ? Math.ceil(
        (new Date(contract.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
    : null

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/tenant/contracts"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Powrót do listy
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              {contract.property.name}
            </h1>
            <p className="text-gray-500 mt-1">
              {contract.property.address}
              {contract.property.city ? `, ${contract.property.city}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className={`${statusCfg.color} flex items-center gap-1 text-sm px-3 py-1`}>
              <StatusIcon className="h-4 w-4" />
              {statusCfg.label}
            </Badge>
            {contract.contractFileUrl && (
              <a href={contract.contractFileUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  PDF
                </Button>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Signing banner */}
      {signSuccess && (
        <Card className="p-4 mb-6 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Umowa została pomyślnie podpisana!</span>
          </div>
        </Card>
      )}

      {/* Sign action */}
      {canSign && (
        <Card className="p-5 mb-6 bg-yellow-50 border-yellow-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <PenTool className="h-6 w-6 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-medium text-yellow-800">Wymagany Twój podpis</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Zapoznaj się z warunkami umowy i potwierdź podpis, aby aktywować umowę.
                </p>
              </div>
            </div>
            <Button
              onClick={handleSign}
              disabled={signing}
              className="bg-yellow-600 hover:bg-yellow-700 text-white shrink-0"
            >
              {signing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Podpisywanie...
                </>
              ) : (
                <>
                  <PenTool className="h-4 w-4 mr-2" />
                  Potwierdź podpis
                </>
              )}
            </Button>
          </div>
        </Card>
      )}

      {/* Signing status */}
      <Card className="p-5 mb-6">
        <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Status podpisów
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            className={`p-3 rounded-lg border ${
              contract.signedByOwner
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {contract.signedByOwner ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Clock className="h-5 w-5 text-gray-400" />
              )}
              <span className="font-medium text-sm">Właściciel</span>
            </div>
            <p className="text-xs text-gray-500">
              {contract.signedByOwner
                ? `Podpisano ${
                    contract.ownerSignedAt
                      ? new Date(contract.ownerSignedAt).toLocaleDateString('pl-PL')
                      : ''
                  }`
                : 'Oczekuje na podpis'}
            </p>
          </div>

          <div
            className={`p-3 rounded-lg border ${
              contract.signedByTenant
                ? 'bg-green-50 border-green-200'
                : 'bg-yellow-50 border-yellow-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {contract.signedByTenant ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Clock className="h-5 w-5 text-yellow-500" />
              )}
              <span className="font-medium text-sm">Najemca (Ty)</span>
            </div>
            <p className="text-xs text-gray-500">
              {contract.signedByTenant
                ? `Podpisano ${
                    contract.tenantSignedAt
                      ? new Date(contract.tenantSignedAt).toLocaleDateString('pl-PL')
                      : ''
                  }`
                : 'Oczekuje na Twój podpis'}
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contract Info */}
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Informacje o umowie
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Typ umowy</span>
              <span className="text-gray-900 font-medium">{TYPE_LABELS[contract.type]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Data rozpoczęcia</span>
              <span className="text-gray-900">
                {new Date(contract.startDate).toLocaleDateString('pl-PL')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Data zakończenia</span>
              <span className="text-gray-900">
                {contract.endDate
                  ? new Date(contract.endDate).toLocaleDateString('pl-PL')
                  : 'bezterminowo'}
              </span>
            </div>
            {daysLeft !== null && daysLeft > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Pozostało</span>
                <span
                  className={`font-medium ${
                    daysLeft <= 30 ? 'text-orange-600' : 'text-gray-900'
                  }`}
                >
                  {daysLeft} dni
                </span>
              </div>
            )}
          </div>
        </Card>

        {/* Financial */}
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Warunki finansowe
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Czynsz najmu</span>
              <span className="text-gray-900">
                {contract.rentAmount?.toLocaleString('pl-PL')} zł
              </span>
            </div>
            {contract.adminFee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Czynsz administracyjny</span>
                <span className="text-gray-900">
                  {contract.adminFee?.toLocaleString('pl-PL')} zł
                </span>
              </div>
            )}
            {contract.utilitiesAdvance > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">Zaliczka na media</span>
                <span className="text-gray-900">
                  {contract.utilitiesAdvance?.toLocaleString('pl-PL')} zł
                </span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-gray-200">
              <span className="font-medium text-gray-900">Łączna opłata miesięczna</span>
              <span className="font-bold text-lg text-gray-900">
                {totalMonthly.toLocaleString('pl-PL')} zł
              </span>
            </div>
            {contract.depositAmount && (
              <div className="flex justify-between">
                <span className="text-gray-500">Kaucja</span>
                <span className="text-gray-900">
                  {contract.depositAmount?.toLocaleString('pl-PL')} zł
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Dzień płatności</span>
              <span className="text-gray-900">{contract.paymentDay}. dzień miesiąca</span>
            </div>
          </div>
        </Card>

        {/* Property Info */}
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
            <Home className="h-4 w-4" />
            Dane nieruchomości
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Nazwa</span>
              <span className="text-gray-900 font-medium">{contract.property.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Adres</span>
              <span className="text-gray-900 text-right max-w-[200px]">
                {contract.property.address}
                {contract.property.postalCode ? `, ${contract.property.postalCode}` : ''}
                {contract.property.city ? ` ${contract.property.city}` : ''}
              </span>
            </div>
            {contract.property.area && (
              <div className="flex justify-between">
                <span className="text-gray-500">Powierzchnia</span>
                <span className="text-gray-900">{contract.property.area} m²</span>
              </div>
            )}
          </div>
        </Card>

        {/* Notes */}
        {contract.notes && (
          <Card className="p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4">Dodatkowe ustalenia</h3>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{contract.notes}</p>
          </Card>
        )}
      </div>

      {/* Attachments */}
      {contract.attachments && contract.attachments.length > 0 && (
        <Card className="p-6 mt-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">Załączniki</h3>
          <div className="space-y-2">
            {contract.attachments.map((att: any) => (
              <div
                key={att.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{att.label || att.fileName || 'Załącznik'}</span>
                </div>
                {att.fileUrl && (
                  <a href={att.fileUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </a>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Status History */}
      {contract.statusHistory && contract.statusHistory.length > 0 && (
        <Card className="p-6 mt-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
            <History className="h-4 w-4" />
            Historia zmian statusu
          </h3>
          <div className="space-y-2">
            {contract.statusHistory.map((h: any) => {
              const oldLabel = STATUS_CONFIG[h.oldStatus]?.label || h.oldStatus
              const newLabel = STATUS_CONFIG[h.newStatus]?.label || h.newStatus
              return (
                <div key={h.id} className="flex items-center gap-3 text-sm p-2 bg-gray-50 rounded">
                  <span className="text-gray-400 text-xs whitespace-nowrap">
                    {new Date(h.changedAt).toLocaleDateString('pl-PL')}{' '}
                    {new Date(h.changedAt).toLocaleTimeString('pl-PL', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  <span className="text-gray-500">{oldLabel || '—'}</span>
                  <span className="text-gray-400">→</span>
                  <span className="font-medium text-gray-900">{newLabel}</span>
                  {h.reason && (
                    <span className="text-gray-400 text-xs">({h.reason})</span>
                  )}
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}