// app/(dashboard)/contracts/[id]/page.tsx
// Flatro — Contract Detail Page
// V9: + Handover Protocols + Contract Annexes (Lifecycle modules)
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
  ClipboardList,
  FilePlus2,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { contractsDict } from '@/lib/i18n/contracts'
import { ProtocolsList } from '@/components/contracts/ProtocolsList'
import { AnnexesList } from '@/components/contracts/AnnexesList'

const t = contractsDict.pl

// ============================================
// Status & Transition Config
// ============================================

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT: { label: t.statuses.DRAFT, color: 'bg-gray-100 text-gray-700', icon: FileText },
  PENDING_SIGNATURE: { label: t.statuses.PENDING_SIGNATURE, color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  SIGNED: { label: t.statuses.SIGNED, color: 'bg-blue-100 text-blue-700', icon: CheckCircle2 },
  ACTIVE: { label: t.statuses.ACTIVE, color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  EXPIRED: { label: t.statuses.EXPIRED, color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
  TERMINATED: { label: t.statuses.TERMINATED, color: 'bg-red-100 text-red-700', icon: XCircle },
}

const FORWARD_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['PENDING_SIGNATURE'],
  PENDING_SIGNATURE: ['SIGNED'],
  SIGNED: ['ACTIVE'],
  ACTIVE: ['EXPIRED', 'TERMINATED'],
  EXPIRED: [],
  TERMINATED: [],
}

const ROLLBACK_TRANSITIONS: Record<string, string[]> = {
  DRAFT: [],
  PENDING_SIGNATURE: ['DRAFT'],
  SIGNED: ['PENDING_SIGNATURE'],
  ACTIVE: ['SIGNED'],
  EXPIRED: ['ACTIVE'],
  TERMINATED: ['DRAFT'],
}

const SPECIAL_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ['TERMINATED'],
  PENDING_SIGNATURE: ['TERMINATED'],
  SIGNED: ['TERMINATED'],
}

// ============================================
// Main Component
// ============================================

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
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [bucketError, setBucketError] = useState<string | null>(null)

  // Clauses modal
  const [showClausesModal, setShowClausesModal] = useState(false)
  const [clauses, setClauses] = useState<Record<string, boolean>>({
    noPets: false,
    noSmoking: false,
    quietHours: false,
    noChanges: false,
    insurance: false,
    maxPersons: false,
    noBusinessUse: false,
    cleaningOnExit: false,
    keyReturn: false,
    parkingIncluded: false,
    furnished: false,
  })

  // Additional residents for maxPersons clause
  const [residents, setResidents] = useState<Array<{ firstName: string; lastName: string; pesel: string }>>([])

  function addResident() {
    setResidents([...residents, { firstName: '', lastName: '', pesel: '' }])
  }

  function removeResident(index: number) {
    setResidents(residents.filter((_, i) => i !== index))
  }

  function updateResident(index: number, field: string, value: string) {
    setResidents(residents.map((r, i) => (i === index ? { ...r, [field]: value } : r)))
  }

  // ─── Data Loading ───────────────────────────────────────

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

  // Lock body scroll when clauses modal is open
  useEffect(() => {
    if (showClausesModal) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [showClausesModal])

  // ─── PDF Download (signed URL) ──────────────────────────

  async function handleDownloadPdf() {
    if (!contract?.contractFileUrl) return

    if (contract.contractFileUrl.startsWith('http')) {
      window.open(contract.contractFileUrl, '_blank')
      return
    }

    setDownloadingPdf(true)
    try {
      const res = await fetch(
        `/api/contracts/download?path=${encodeURIComponent(contract.contractFileUrl)}&contractId=${contract.id}`
      )
      const data = await res.json()
      if (res.ok && data.url) {
        window.open(data.url, '_blank')
      } else {
        alert(data.error || 'Błąd pobierania pliku')
      }
    } catch {
      alert('Błąd połączenia')
    } finally {
      setDownloadingPdf(false)
    }
  }

  // ─── Status Change ──────────────────────────────────────

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

  // ─── Owner Sign ─────────────────────────────────────────

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

  // ─── Generate Contract PDF (HTML) ───────────────────────

  function handleGeneratePdf() {
    setShowClausesModal(true)
  }

  async function doGeneratePdf() {
    setShowClausesModal(false)
    setGeneratingPdf(true)
    try {
      const res = await fetch(`/api/contracts/${contract.id}/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clauses,
          residents: clauses.maxPersons ? residents.filter((r) => r.firstName || r.lastName) : [],
        }),
      })
      if (!res.ok) {
        alert('Błąd generowania umowy')
        return
      }
      const html = await res.text()
      const win = window.open('', '_blank')
      if (win) {
        win.document.write(html)
        win.document.close()
        setTimeout(() => win.print(), 600)
      }
    } catch {
      alert('Błąd połączenia')
    } finally {
      setGeneratingPdf(false)
    }
  }

  // ─── Upload Signed PDF ──────────────────────────────────

  async function handleUploadPdf(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !contract) return

    if (contract.contractFileUrl) {
      const confirmed = window.confirm(
        'Ten kontrakt ma już załączony plik PDF.\n\nCzy na pewno chcesz go nadpisać?\nStary plik zostanie usunięty.'
      )
      if (!confirmed) {
        e.target.value = ''
        return
      }
    }

    setUploadingPdf(true)
    setBucketError(null)

    const uploadData = new FormData()
    uploadData.append('file', file)
    uploadData.append('contractId', contract.id)
    uploadData.append('type', 'SIGNED_CONTRACT')

    try {
      const res = await fetch('/api/contracts/upload', {
        method: 'POST',
        body: uploadData,
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
      e.target.value = ''
    }
  }

  // ─── Loading / Error States ─────────────────────────────

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

  // ─── Derived Values ─────────────────────────────────────

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

  const showLifecycle = ['SIGNED', 'ACTIVE', 'EXPIRED', 'TERMINATED'].includes(contract.status)

  // ─── RENDER ─────────────────────────────────────────────

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* ═══════════════════════════════════════════════════ */}
      {/* HEADER                                              */}
      {/* ═══════════════════════════════════════════════════ */}
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
              {contract.property?.name || 'Umowa'}
            </h1>
            <p className="text-gray-500 mt-1">
              {contract.property?.address}
              {contract.property?.city ? `, ${contract.property.city}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${cStatus.color} text-sm px-3 py-1 flex items-center gap-1`}>
              <StatusIcon className="h-4 w-4" />
              {cStatus.label}
            </Badge>
            <span className="text-lg font-bold text-gray-900">
              {totalMonthly.toLocaleString('pl-PL')} zł
              <span className="text-sm font-normal text-gray-500">{t.detail.perMonth}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════ */}
      {/* BUCKET ERROR BANNER                                 */}
      {/* ═══════════════════════════════════════════════════ */}
      {bucketError && (
        <Card className="p-4 mb-6 bg-red-50 border-red-200">
          <p className="text-sm text-red-700">{bucketError}</p>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* STATUS TRANSITIONS                                  */}
      {/* ═══════════════════════════════════════════════════ */}
      {(forwardStatuses.length > 0 || specialStatuses.length > 0) && (
        <Card className="p-5 mb-6 bg-blue-50 border-blue-200">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-blue-700 font-medium">Zmień status:</span>
            {forwardStatuses.map((ns) => (
              <Button
                key={ns}
                size="sm"
                onClick={() => handleStatusChange(ns)}
                disabled={updatingStatus}
              >
                {updatingStatus ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {STATUS_CONFIG[ns]?.label || ns}
              </Button>
            ))}

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

      {/* ═══════════════════════════════════════════════════ */}
      {/* SIGNING STATUS                                      */}
      {/* ═══════════════════════════════════════════════════ */}
      <Card className="p-5 mb-6">
        <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Status podpisów
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Owner signing */}
          <div
            className={`p-3 rounded-lg border ${
              contract.signedByOwner ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
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
            {!contract.signedByOwner && (
              <Button
                size="sm"
                className="mt-2"
                onClick={handleOwnerSign}
                disabled={signingOwner}
              >
                {signingOwner ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <PenTool className="h-4 w-4 mr-1" />
                )}
                Podpisz jako właściciel
              </Button>
            )}
          </div>

          {/* Tenant signing */}
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
              <span className="font-medium text-sm">Najemca</span>
            </div>
            <p className="text-xs text-gray-500">
              {contract.signedByTenant
                ? `Podpisano ${
                    contract.tenantSignedAt
                      ? new Date(contract.tenantSignedAt).toLocaleDateString('pl-PL')
                      : ''
                  }`
                : 'Oczekuje na podpis najemcy'}
            </p>
          </div>
        </div>
      </Card>

      {/* ═══════════════════════════════════════════════════ */}
      {/* PDF ACTIONS                                         */}
      {/* ═══════════════════════════════════════════════════ */}
      <Card className="p-5 mb-6">
        <h3 className="text-sm font-medium text-gray-500 mb-3">Dokument umowy</h3>
        <div className="flex flex-wrap gap-3">
          <Button size="sm" onClick={handleGeneratePdf} disabled={generatingPdf}>
            {generatingPdf ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Printer className="h-4 w-4 mr-2" />
            )}
            Generuj umowę
          </Button>

          <label>
            <Button size="sm" variant="outline" asChild disabled={uploadingPdf}>
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
            <Button size="sm" variant="outline" onClick={handleDownloadPdf} disabled={downloadingPdf}>
              {downloadingPdf ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Pobierz PDF
            </Button>
          )}
        </div>
      </Card>

      {/* ═══════════════════════════════════════════════════ */}
      {/* CONTRACT INFO + TENANT + PROPERTY + FINANCIAL       */}
      {/* ═══════════════════════════════════════════════════ */}
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
              <span className="text-gray-900 font-medium">
                {t.types[contract.type as keyof typeof t.types]}
              </span>
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
                <span className={`font-medium ${daysLeft <= 30 ? 'text-red-600' : 'text-gray-900'}`}>
                  {daysLeft} dni
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">{t.fields.paymentDay}</span>
              <span className="text-gray-900">{contract.paymentDay}. dnia miesiąca</span>
            </div>
            {contract.noticePeriod && (
              <div className="flex justify-between">
                <span className="text-gray-500">Okres wypowiedzenia</span>
                <span className="text-gray-900">{contract.noticePeriod} mies.</span>
              </div>
            )}
          </div>
        </Card>

        {/* Financial Info */}
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            {t.detail.financialInfo}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">{t.fields.rentAmount}</span>
              <span className="text-gray-900 font-medium">
                {contract.rentAmount?.toLocaleString('pl-PL')} zł
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t.fields.adminFee}</span>
              <span className="text-gray-900">
                {contract.adminFee?.toLocaleString('pl-PL')} zł
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t.fields.utilitiesAdvance}</span>
              <span className="text-gray-900">
                {contract.utilitiesAdvance?.toLocaleString('pl-PL')} zł
              </span>
            </div>
            <div className="border-t pt-3 flex justify-between">
              <span className="text-gray-700 font-medium">Razem miesięcznie</span>
              <span className="text-gray-900 font-bold text-lg">
                {totalMonthly.toLocaleString('pl-PL')} zł
              </span>
            </div>
            {contract.depositAmount && (
              <div className="flex justify-between">
                <span className="text-gray-500">{t.fields.depositAmount}</span>
                <span className="text-gray-900">
                  {contract.depositAmount?.toLocaleString('pl-PL')} zł
                </span>
              </div>
            )}
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
                {contract.tenant?.firstName} {contract.tenant?.lastName}
              </span>
            </div>
            {contract.tenant?.email && (
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="text-gray-900">{contract.tenant.email}</span>
              </div>
            )}
            {contract.tenant?.phone && (
              <div className="flex justify-between">
                <span className="text-gray-500">Telefon</span>
                <span className="text-gray-900">{contract.tenant.phone}</span>
              </div>
            )}
            {contract.tenant?.nationalId && (
              <div className="flex justify-between">
                <span className="text-gray-500">
                  {contract.tenant.nationalIdType || 'PESEL'}
                </span>
                <span className="text-gray-900">{contract.tenant.nationalId}</span>
              </div>
            )}
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
              <span className="text-gray-500">Lokal</span>
              <span className="text-gray-900 font-medium">{contract.property?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Adres</span>
              <span className="text-gray-900">
                {contract.property?.address}
                {contract.property?.postalCode ? `, ${contract.property.postalCode}` : ''}
                {contract.property?.city ? ` ${contract.property.city}` : ''}
              </span>
            </div>
            {contract.property?.area && (
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

      {/* ═══════════════════════════════════════════════════ */}
      {/* V9: CONTRACT LIFECYCLE — PROTOCOLS & ANNEXES        */}
      {/* ═══════════════════════════════════════════════════ */}
      {showLifecycle && (
        <div className="mt-8">
          <div className="border-t pt-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              Cykl życia umowy
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Protokoły zdawczo-odbiorcze i aneksy do umowy
            </p>
          </div>

          {/* Protocols */}
          <div className="mb-8">
            <ProtocolsList contractId={contract.id} />
          </div>

          {/* Annexes */}
          {['ACTIVE', 'SIGNED'].includes(contract.status) && (
            <div className="mb-8">
              <AnnexesList
                contractId={contract.id}
                onContractUpdated={loadContract}
              />
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* ATTACHMENTS                                         */}
      {/* ═══════════════════════════════════════════════════ */}
      {contract.attachments && contract.attachments.length > 0 && (
        <Card className="p-6 mt-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4">{t.detail.attachmentsList}</h3>
          <div className="space-y-2">
            {contract.attachments.map((att: any) => (
              <div
                key={att.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      if (att.fileUrl.startsWith('http')) {
                        window.open(att.fileUrl, '_blank')
                      } else {
                        const res = await fetch(
                          `/api/contracts/download?path=${encodeURIComponent(att.fileUrl)}&contractId=${contract.id}`
                        )
                        const data = await res.json()
                        if (data.url) window.open(data.url, '_blank')
                        else alert(data.error || 'Błąd pobierania')
                      }
                    }}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* STATUS HISTORY                                      */}
      {/* ═══════════════════════════════════════════════════ */}
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
                  {h.reason && <span className="text-gray-400 text-xs">({h.reason})</span>}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════ */}
      {/* CLAUSES MODAL                                       */}
      {/* ═══════════════════════════════════════════════════ */}
      {showClausesModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 backdrop-blur-sm p-4 pt-8 pb-8"
          onClick={(e) => { if (e.target === e.currentTarget) setShowClausesModal(false) }}
        >
          <Card className="w-full max-w-lg my-auto shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b bg-gray-50 rounded-t-lg">
              <h3 className="text-lg font-semibold text-gray-900">Wybierz klauzule dodatkowe</h3>
              <button onClick={() => setShowClausesModal(false)} className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors">
                <svg className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-5 max-h-[60vh] overflow-y-auto">
              <div className="space-y-1">
                {[
                  { key: 'noPets', label: 'Zakaz trzymania zwierząt' },
                  { key: 'noSmoking', label: 'Zakaz palenia' },
                  { key: 'quietHours', label: 'Cisza nocna (22:00–6:00)' },
                  { key: 'noChanges', label: 'Zakaz zmian bez zgody' },
                  { key: 'insurance', label: 'Obowiązkowe ubezpieczenie' },
                  { key: 'maxPersons', label: 'Maksymalna liczba osób' },
                  { key: 'noBusinessUse', label: 'Zakaz działalności gospodarczej' },
                  { key: 'cleaningOnExit', label: 'Czyszczenie przy wyprowadzce' },
                  { key: 'keyReturn', label: 'Zwrot kluczy' },
                  { key: 'parkingIncluded', label: 'Miejsce parkingowe w cenie' },
                  { key: 'furnished', label: 'Lokal umeblowany' },
                ].map(({ key, label }) => (
                  <label
                    key={key}
                    className="flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={clauses[key] || false}
                      onChange={(e) => setClauses({ ...clauses, [key]: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{label}</span>
                  </label>
                ))}
              </div>

              {clauses.maxPersons && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Osoby zamieszkujące</h4>
                  {residents.map((r, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2 mb-2">
                      <input
                        placeholder="Imię"
                        value={r.firstName}
                        onChange={(e) => updateResident(i, 'firstName', e.target.value)}
                        className="rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        placeholder="Nazwisko"
                        value={r.lastName}
                        onChange={(e) => updateResident(i, 'lastName', e.target.value)}
                        className="rounded-md border border-gray-200 px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex gap-1">
                        <input
                          placeholder="PESEL"
                          value={r.pesel}
                          onChange={(e) => updateResident(i, 'pesel', e.target.value)}
                          className="rounded-md border border-gray-200 px-2.5 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <button
                          onClick={() => removeResident(i)}
                          className="text-red-500 text-sm px-1.5 hover:bg-red-50 rounded transition-colors"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                  <Button size="sm" variant="outline" onClick={addResident}>
                    + Dodaj osobę
                  </Button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 p-5 border-t bg-gray-50 rounded-b-lg">
              <Button variant="outline" onClick={() => setShowClausesModal(false)}>
                Anuluj
              </Button>
              <Button onClick={doGeneratePdf}>
                Generuj PDF
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}