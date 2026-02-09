// app/(dashboard)/contracts/[id]/page.tsx
// REPLACE existing file — adds: signing UI, status rollback, PDF generation, status history
'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
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
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Loader2,
  PenTool,
  Shield,
  History,
  Undo2,
  Printer,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { contractsDict } from '@/lib/i18n/contracts'

const t = contractsDict.pl

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT: { label: t.statuses.DRAFT, color: 'bg-gray-100 text-gray-700', icon: FileText },
  PENDING_SIGNATURE: { label: t.statuses.PENDING_SIGNATURE, color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  SIGNED: { label: t.statuses.SIGNED, color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  ACTIVE: { label: t.statuses.ACTIVE, color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  EXPIRED: { label: t.statuses.EXPIRED, color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
  TERMINATED: { label: t.statuses.TERMINATED, color: 'bg-red-100 text-red-700', icon: XCircle },
}

// Forward transitions (normal flow)
const FORWARD_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PENDING_SIGNATURE'],
  PENDING_SIGNATURE: ['SIGNED'],
  SIGNED: ['ACTIVE'],
  ACTIVE: ['EXPIRED', 'TERMINATED'],
  EXPIRED: [],
  TERMINATED: [],
}

// Rollback transitions
const ROLLBACK_TRANSITIONS: Record<string, string[]> = {
  DRAFT: [],
  PENDING_SIGNATURE: ['DRAFT'],
  SIGNED: ['PENDING_SIGNATURE'],
  ACTIVE: ['SIGNED'],
  EXPIRED: ['ACTIVE'],
  TERMINATED: ['DRAFT'],
}

// Special: owner can always terminate
const SPECIAL_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['TERMINATED'],
  PENDING_SIGNATURE: ['TERMINATED'],
  SIGNED: ['TERMINATED'],
}

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [contract, setContract] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [signingOwner, setSigningOwner] = useState(false)
  const [showRollback, setShowRollback] = useState(false)
  const [generatingPdf, setGeneratingPdf] = useState(false)
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [bucketError, setBucketError] = useState<string | null>(null)

  const loadContract = useCallback(async () => {
    try {
      const res = await fetch(`/api/contracts/${id}`)
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

  // Status change
  async function handleStatusChange(newStatus: string, reason?: string) {
    if (!contract) return
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, statusReason: reason }),
      })
      if (res.ok) {
        const updated = await res.json()
        setContract(updated)
        setShowRollback(false)
      } else {
        const data = await res.json()
        alert(data.error || 'Błąd zmiany statusu')
      }
    } catch {
      alert('Błąd połączenia')
    } finally {
      setUpdatingStatus(false)
    }
  }

  // Owner sign
  async function handleOwnerSign() {
    if (!contract || signingOwner) return
    const confirmed = window.confirm('Czy na pewno chcesz potwierdzić swój podpis jako właściciel?')
    if (!confirmed) return

    setSigningOwner(true)
    try {
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'owner_sign' }),
      })
      if (res.ok) {
        const updated = await res.json()
        setContract(updated)
      } else {
        const data = await res.json()
        alert(data.error || 'Błąd')
      }
    } catch {
      alert('Błąd połączenia')
    } finally {
      setSigningOwner(false)
    }
  }

  // Generate PDF draft
  async function handleGeneratePdf() {
    setGeneratingPdf(true)
    try {
      const res = await fetch(`/api/contracts/${contract.id}/generate-pdf`, { method: 'POST' })
      if (!res.ok) {
        alert('Błąd generowania PDF')
        return
      }
      const html = await res.text()
      // Open in new window for print-to-PDF
      const win = window.open('', '_blank')
      if (win) {
        win.document.write(html)
        win.document.close()
        // Auto-trigger print dialog after a brief delay
        setTimeout(() => win.print(), 500)
      }
    } catch {
      alert('Błąd połączenia')
    } finally {
      setGeneratingPdf(false)
    }
  }

  // Upload signed PDF
  async function handleUploadPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !contract) return

    setUploadingPdf(true)
    setBucketError(null)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('contractId', contract.id)
    formData.append('type', 'SIGNED_CONTRACT')

    try {
      const res = await fetch('/api/contracts/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!res.ok) {
        if (data.code === 'BUCKET_NOT_FOUND') {
          setBucketError(data.error)
        } else {
          alert(data.error || 'Błąd wgrywania')
        }
        return
      }

      // Update contract with file URL
      const updateRes = await fetch(`/api/contracts/${contract.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractFileUrl: data.url }),
      })

      if (updateRes.ok) {
        const updated = await updateRes.json()
        setContract(updated)
      }
    } catch {
      alert('Błąd połączenia')
    } finally {
      setUploadingPdf(false)
      // Reset input
      e.target.value = ''
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-red-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">{error || 'Nie znaleziono'}</h3>
          <Link href="/contracts">
            <Button variant="outline" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t.actions.back}
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  const cStatus = STATUS_CONFIG[contract.status] || STATUS_CONFIG.DRAFT
  const StatusIcon = cStatus.icon
  const totalMonthly =
    (contract.rentAmount || 0) + (contract.adminFee || 0) + (contract.utilitiesAdvance || 0)
  const forwardStatuses = FORWARD_TRANSITIONS[contract.status] || []
  const rollbackStatuses = ROLLBACK_TRANSITIONS[contract.status] || []
  const specialStatuses = SPECIAL_TRANSITIONS[contract.status] || []

  const daysLeft = contract.endDate
    ? Math.ceil((new Date(contract.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/contracts"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t.actions.back}
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
              {contract.tenant.firstName} {contract.tenant.lastName}
            </h1>
            <p className="text-gray-500 mt-1">{contract.property.name}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Badge className={`${cStatus.color} flex items-center gap-1 text-sm px-3 py-1`}>
              <StatusIcon className="h-4 w-4" />
              {cStatus.label}
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

      {/* Bucket error */}
      {bucketError && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <div className="flex items-start gap-2 text-red-700">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">Błąd Storage</p>
              <p className="text-sm mt-1">{bucketError}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Status actions — forward */}
      {forwardStatuses.length > 0 && (
        <Card className="p-4 mb-4 bg-blue-50 border-blue-200">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-blue-800">{t.actions.changeStatus}:</span>
            {forwardStatuses.map((ns) => (
              <Button
                key={ns}
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange(ns)}
                disabled={updatingStatus}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                {updatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {STATUS_CONFIG[ns]?.label || ns}
              </Button>
            ))}

            {/* Special: terminate */}
            {specialStatuses.includes('TERMINATED') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (window.confirm('Czy na pewno chcesz rozwiązać tę umowę?')) {
                    handleStatusChange('TERMINATED', 'Terminated by owner')
                  }
                }}
                disabled={updatingStatus}
                className="border-red-300 text-red-700 hover:bg-red-100"
              >
                <XCircle className="h-4 w-4 mr-1" />
                {t.statuses.TERMINATED}
              </Button>
            )}

            {/* Rollback toggle */}
            {rollbackStatuses.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowRollback(!showRollback)}
                className="text-gray-500 hover:text-gray-700"
              >
                <Undo2 className="h-4 w-4 mr-1" />
                {showRollback ? 'Ukryj cofanie' : 'Cofnij status'}
              </Button>
            )}
          </div>

          {/* Rollback options */}
          {showRollback && rollbackStatuses.length > 0 && (
            <div className="mt-3 pt-3 border-t border-blue-200 flex flex-wrap items-center gap-3">
              <span className="text-sm text-orange-700 flex items-center gap-1">
                <Undo2 className="h-4 w-4" />
                Cofnij do:
              </span>
              {rollbackStatuses.map((ns) => (
                <Button
                  key={ns}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (window.confirm(`Cofnąć status do "${STATUS_CONFIG[ns]?.label || ns}"?`)) {
                      handleStatusChange(ns, 'Rollback by owner')
                    }
                  }}
                  disabled={updatingStatus}
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  {STATUS_CONFIG[ns]?.label || ns}
                </Button>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Signing status */}
      <Card className="p-5 mb-6">
        <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Status podpisów
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Owner signing */}
          <div
            className={`p-3 rounded-lg border ${
              contract.signedByOwner
                ? 'bg-green-50 border-green-200'
                : 'bg-blue-50 border-blue-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {contract.signedByOwner ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Clock className="h-5 w-5 text-blue-500" />
              )}
              <span className="font-medium text-sm">Właściciel (Ty)</span>
            </div>
            {contract.signedByOwner ? (
              <p className="text-xs text-green-600">
                ✅ Podpisano{' '}
                {contract.ownerSignedAt
                  ? new Date(contract.ownerSignedAt).toLocaleDateString('pl-PL')
                  : ''}
              </p>
            ) : (
              <Button
                size="sm"
                onClick={handleOwnerSign}
                disabled={signingOwner}
                className="mt-2 bg-blue-600 hover:bg-blue-700 text-white"
              >
                {signingOwner ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <PenTool className="h-4 w-4 mr-1" />
                )}
                Potwierdź podpis
              </Button>
            )}
          </div>

          {/* Tenant signing */}
          <div
            className={`p-3 rounded-lg border ${
              contract.signedByTenant
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              {contract.signedByTenant ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <Clock className="h-5 w-5 text-gray-400" />
              )}
              <span className="font-medium text-sm">Najemca</span>
            </div>
            <p className="text-xs text-gray-500">
              {contract.signedByTenant
                ? `✅ Podpisano ${
                    contract.tenantSignedAt
                      ? new Date(contract.tenantSignedAt).toLocaleDateString('pl-PL')
                      : ''
                  }`
                : '⏳ Oczekuje na podpis najemcy'}
            </p>
          </div>
        </div>

        {contract.signedByOwner && contract.signedByTenant && (
          <div className="mt-3 p-2 bg-green-50 rounded text-sm text-green-700 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Obie strony podpisały umowę
          </div>
        )}
      </Card>

      {/* PDF actions */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Dokumenty:</span>

          <Button
            size="sm"
            variant="outline"
            onClick={handleGeneratePdf}
            disabled={generatingPdf}
          >
            {generatingPdf ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            Generuj PDF (draft)
          </Button>

          <label>
            <Button
              size="sm"
              variant="outline"
              asChild
              disabled={uploadingPdf}
            >
              <span className="cursor-pointer">
                {uploadingPdf ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Wgraj podpisany PDF
              </span>
            </Button>
            <input
              type="file"
              accept=".pdf,image/jpeg,image/png"
              className="hidden"
              onChange={handleUploadPdf}
              disabled={uploadingPdf}
            />
          </label>

          {contract.contractFileUrl && (
            <a href={contract.contractFileUrl} target="_blank" rel="noopener noreferrer">
              <Button size="sm" variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Pobierz PDF
              </Button>
            </a>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contract Info */}
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t.detail.contractInfo}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Typ umowy</span>
              <span className="text-gray-900 font-medium">{t.types[contract.type as keyof typeof t.types]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t.fields.startDate}</span>
              <span className="text-gray-900">
                {new Date(contract.startDate).toLocaleDateString('pl-PL')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t.fields.endDate}</span>
              <span className="text-gray-900">
                {contract.endDate
                  ? new Date(contract.endDate).toLocaleDateString('pl-PL')
                  : t.messages.indefiniteLabel}
              </span>
            </div>
            {daysLeft !== null && daysLeft > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">{t.detail.daysLeft}</span>
                <span className={`font-medium ${daysLeft <= 30 ? 'text-orange-600' : 'text-gray-900'}`}>
                  {daysLeft} dni
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Źródło</span>
              <span className="text-gray-900">
                {contract.contractSource === 'UPLOAD' ? 'Wgrany PDF' : 'Formularz'}
              </span>
            </div>
          </div>
        </Card>

        {/* Financial */}
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            {t.detail.financialInfo}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">{t.fields.rentAmount}</span>
              <span className="text-gray-900">{contract.rentAmount?.toLocaleString('pl-PL')} zł</span>
            </div>
            {contract.adminFee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">{t.fields.adminFee}</span>
                <span className="text-gray-900">{contract.adminFee?.toLocaleString('pl-PL')} zł</span>
              </div>
            )}
            {contract.utilitiesAdvance > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">{t.fields.utilitiesAdvance}</span>
                <span className="text-gray-900">{contract.utilitiesAdvance?.toLocaleString('pl-PL')} zł</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t">
              <span className="font-medium text-gray-900">{t.fields.totalMonthly}</span>
              <span className="font-bold text-lg text-gray-900">{totalMonthly.toLocaleString('pl-PL')} zł</span>
            </div>
            {contract.depositAmount && (
              <div className="flex justify-between">
                <span className="text-gray-500">{t.fields.depositAmount}</span>
                <span className="text-gray-900">{contract.depositAmount?.toLocaleString('pl-PL')} zł</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">{t.fields.paymentDay}</span>
              <span className="text-gray-900">{contract.paymentDay}. {t.fields.dayOfMonth}</span>
            </div>
          </div>
        </Card>

        {/* Tenant Info */}
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
            <User className="h-4 w-4" />
            {t.detail.tenantInfo}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Imię i nazwisko</span>
              <span className="text-gray-900 font-medium">
                {contract.tenant.firstName} {contract.tenant.lastName}
              </span>
            </div>
            {contract.tenant.email && (
              <div className="flex justify-between">
                <span className="text-gray-500">{t.fields.email}</span>
                <span className="text-gray-900">{contract.tenant.email}</span>
              </div>
            )}
            {contract.tenant.phone && (
              <div className="flex justify-between">
                <span className="text-gray-500">{t.fields.phone}</span>
                <span className="text-gray-900">{contract.tenant.phone}</span>
              </div>
            )}
            {contract.tenant.nationalId && (
              <div className="flex justify-between">
                <span className="text-gray-500">{contract.tenant.nationalIdType || 'PESEL'}</span>
                <span className="text-gray-900">{contract.tenant.nationalId}</span>
              </div>
            )}
            {contract.tenant.citizenship && (
              <div className="flex justify-between">
                <span className="text-gray-500">{t.fields.citizenship}</span>
                <span className="text-gray-900">{contract.tenant.citizenship}</span>
              </div>
            )}
            <div className="pt-2">
              <Link href={`/tenants/${contract.tenant.id}`}>
                <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-800 p-0">
                  Zobacz profil najemcy →
                </Button>
              </Link>
            </div>
          </div>
        </Card>

        {/* Property Info */}
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
            <Home className="h-4 w-4" />
            {t.detail.propertyInfo}
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
          <Card className="p-6 lg:col-span-2">
            <h3 className="text-sm font-medium text-gray-500 mb-4">{t.sections.notes}</h3>
            <p className="text-gray-700 text-sm whitespace-pre-wrap">{contract.notes}</p>
          </Card>
        )}
      </div>

      {/* Attachments */}
      {contract.attachments && contract.attachments.length > 0 && (
        <Card className="p-6 mt-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">{t.detail.attachmentsList}</h3>
          <div className="space-y-2">
            {contract.attachments.map((att: any) => (
              <div key={att.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{att.label || att.fileName || 'Załącznik'}</span>
                  {att.fileSize && (
                    <span className="text-xs text-gray-400">
                      ({(att.fileSize / 1024).toFixed(0)} KB)
                    </span>
                  )}
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