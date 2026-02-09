// app/(dashboard)/contracts/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  FileText,
  Calendar,
  CreditCard,
  User,
  Home,
  Loader2,
  AlertCircle,
  Download,
  Paperclip,
  FileCheck,
  PenLine,
  CheckCircle,
  Clock,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { getContractsT } from '@/lib/i18n/contracts'

const t = getContractsT('pl')

interface ContractAttachment {
  id: string
  type: string
  label: string
  fileUrl: string
  fileName: string | null
  fileSize: number | null
  mimeType: string | null
  createdAt: string
}

interface ContractDetail {
  id: string
  type: string
  startDate: string
  endDate: string | null
  rentAmount: number
  adminFee: number
  utilitiesAdvance: number
  depositAmount: number | null
  paymentDay: number
  status: string
  contractSource: string
  contractFileUrl: string | null
  substituteAddress: string | null
  substituteCity: string | null
  substitutePostalCode: string | null
  currency: string
  country: string
  notes: string | null
  createdAt: string
  signedAt: string | null
  tenant: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    nationalId: string | null
    nationalIdType: string | null
    citizenship: string | null
    registrationAddress: string | null
  }
  property: {
    id: string
    name: string
    address: string
    city: string
    postalCode: string | null
    area: number | null
  }
  attachments: ContractAttachment[]
}

export default function ContractDetailPage() {
  const router = useRouter()
  const params = useParams()
  const contractId = params.id as string

  const [contract, setContract] = useState<ContractDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    fetchContract()
  }, [contractId])

  async function fetchContract() {
    try {
      const res = await fetch(`/api/contracts/${contractId}`)
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
  }

  async function handleStatusChange(newStatus: string) {
    if (!contract) return
    setUpdatingStatus(true)
    try {
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        const updated = await res.json()
        setContract((prev) => (prev ? { ...prev, ...updated } : prev))
      }
    } catch (err) {
      console.error('Error updating status:', err)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const statusConfig: Record<string, { label: string; color: string; icon: typeof FileText }> = {
    DRAFT: { label: t.statuses.DRAFT, color: 'bg-gray-100 text-gray-800', icon: FileText },
    PENDING_SIGNATURE: { label: t.statuses.PENDING_SIGNATURE, color: 'bg-yellow-100 text-yellow-800', icon: PenLine },
    SIGNED: { label: t.statuses.SIGNED, color: 'bg-blue-100 text-blue-800', icon: FileCheck },
    ACTIVE: { label: t.statuses.ACTIVE, color: 'bg-green-100 text-green-800', icon: CheckCircle },
    EXPIRED: { label: t.statuses.EXPIRED, color: 'bg-orange-100 text-orange-800', icon: Clock },
    TERMINATED: { label: t.statuses.TERMINATED, color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  }

  const typeLabels: Record<string, string> = {
    STANDARD: t.types.STANDARD,
    OCCASIONAL: t.types.OCCASIONAL,
    INSTITUTIONAL: t.types.INSTITUTIONAL,
  }

  // Status flow: DRAFT → PENDING_SIGNATURE → SIGNED → ACTIVE → EXPIRED/TERMINATED
  const getNextStatuses = (current: string): { value: string; label: string }[] => {
    switch (current) {
      case 'DRAFT':
        return [
          { value: 'PENDING_SIGNATURE', label: t.statuses.PENDING_SIGNATURE },
          { value: 'ACTIVE', label: t.statuses.ACTIVE },
        ]
      case 'PENDING_SIGNATURE':
        return [
          { value: 'SIGNED', label: t.statuses.SIGNED },
          { value: 'ACTIVE', label: t.statuses.ACTIVE },
        ]
      case 'SIGNED':
        return [{ value: 'ACTIVE', label: t.statuses.ACTIVE }]
      case 'ACTIVE':
        return [{ value: 'TERMINATED', label: t.statuses.TERMINATED }]
      default:
        return []
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">{error}</h2>
        <Button variant="outline" onClick={() => router.push('/contracts')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t.actions.back}
        </Button>
      </div>
    )
  }

  const cStatus = statusConfig[contract.status] || {
    label: contract.status,
    color: 'bg-gray-100 text-gray-800',
    icon: FileText,
  }
  const StatusIcon = cStatus.icon
  const totalMonthly = (contract.rentAmount || 0) + (contract.adminFee || 0) + (contract.utilitiesAdvance || 0)
  const nextStatuses = getNextStatuses(contract.status)

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
          <div className="flex items-center gap-3">
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

      {/* Status actions */}
      {nextStatuses.length > 0 && (
        <Card className="p-4 mb-6 bg-blue-50 border-blue-200">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium text-blue-800">{t.actions.changeStatus}:</span>
            {nextStatuses.map((ns) => (
              <Button
                key={ns.value}
                size="sm"
                variant="outline"
                onClick={() => handleStatusChange(ns.value)}
                disabled={updatingStatus}
                className="border-blue-300 text-blue-700 hover:bg-blue-100"
              >
                {updatingStatus ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                {ns.label}
              </Button>
            ))}
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contract Info */}
        <Card className="p-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {t.detail.contractInfo}
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">{t.table.type}</span>
              <Badge>{typeLabels[contract.type] || contract.type}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t.table.source}</span>
              <span className="text-gray-900 flex items-center gap-1">
                {contract.contractSource === 'UPLOAD' ? (
                  <>
                    <Paperclip className="h-3.5 w-3.5" /> {t.creationMode.uploadPdf}
                  </>
                ) : (
                  t.creationMode.fromTemplate
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">{t.table.period}</span>
              <span className="text-gray-900">
                {new Date(contract.startDate).toLocaleDateString('pl-PL')} —{' '}
                {contract.endDate
                  ? new Date(contract.endDate).toLocaleDateString('pl-PL')
                  : t.messages.indefiniteLabel}
              </span>
            </div>
            {daysLeft !== null && contract.status === 'ACTIVE' && daysLeft <= 90 && (
              <div className="flex justify-between">
                <span className="text-gray-500">{t.detail.daysLeft}</span>
                <span className={`font-medium ${daysLeft <= 30 ? 'text-red-600' : 'text-yellow-600'}`}>
                  {daysLeft} dni
                </span>
              </div>
            )}
            {contract.signedAt && (
              <div className="flex justify-between">
                <span className="text-gray-500">Data podpisania</span>
                <span className="text-gray-900">
                  {new Date(contract.signedAt).toLocaleDateString('pl-PL')}
                </span>
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
                {contract.rentAmount.toLocaleString('pl-PL')} zł
              </span>
            </div>
            {contract.adminFee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">{t.fields.adminFee}</span>
                <span className="text-gray-900">
                  {contract.adminFee.toLocaleString('pl-PL')} zł
                </span>
              </div>
            )}
            {contract.utilitiesAdvance > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-500">{t.fields.utilitiesAdvance}</span>
                <span className="text-gray-900">
                  {contract.utilitiesAdvance.toLocaleString('pl-PL')} zł
                </span>
              </div>
            )}
            <div className="pt-2 border-t flex justify-between">
              <span className="font-medium text-gray-700">{t.fields.totalMonthly}</span>
              <span className="text-lg font-bold text-emerald-700">
                {totalMonthly.toLocaleString('pl-PL')} zł {t.detail.perMonth}
              </span>
            </div>
            {contract.depositAmount && (
              <div className="flex justify-between pt-2">
                <span className="text-gray-500">{t.detail.deposit}</span>
                <span className="text-gray-900">
                  {contract.depositAmount.toLocaleString('pl-PL')} zł
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">{t.detail.paymentDueDay}</span>
              <span className="text-gray-900">
                {contract.paymentDay}. {t.fields.dayOfMonth}
              </span>
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
                <span className="text-gray-500">
                  {contract.tenant.nationalIdType || 'PESEL'}
                </span>
                <span className="text-gray-900">{contract.tenant.nationalId}</span>
              </div>
            )}
            {contract.tenant.citizenship && (
              <div className="flex justify-between">
                <span className="text-gray-500">{t.fields.citizenship}</span>
                <span className="text-gray-900">{contract.tenant.citizenship}</span>
              </div>
            )}
            {contract.tenant.registrationAddress && (
              <div className="flex justify-between">
                <span className="text-gray-500">{t.fields.registrationAddress}</span>
                <span className="text-gray-900 text-right max-w-[200px]">
                  {contract.tenant.registrationAddress}
                </span>
              </div>
            )}
            <div className="pt-2">
              <Link href={`/tenants/${contract.tenant.id}`}>
                <Button variant="ghost" size="sm" className="text-blue-600">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  Profil najemcy
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
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Miasto</span>
              <span className="text-gray-900">
                {contract.property.city}
                {contract.property.postalCode ? `, ${contract.property.postalCode}` : ''}
              </span>
            </div>
            {contract.property.area && (
              <div className="flex justify-between">
                <span className="text-gray-500">Powierzchnia</span>
                <span className="text-gray-900">{contract.property.area} m²</span>
              </div>
            )}
            <div className="pt-2">
              <Link href={`/properties/${contract.property.id}`}>
                <Button variant="ghost" size="sm" className="text-blue-600">
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  Karta nieruchomości
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>

      {/* Substitute property (for OCCASIONAL) */}
      {contract.type === 'OCCASIONAL' && contract.substituteAddress && (
        <Card className="p-6 mt-6 border-purple-200">
          <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
            <Home className="h-4 w-4 text-purple-600" />
            {t.sections.substituteProperty}
          </h3>
          <p className="text-gray-900">
            {contract.substituteAddress}
            {contract.substituteCity ? `, ${contract.substituteCity}` : ''}
            {contract.substitutePostalCode ? ` ${contract.substitutePostalCode}` : ''}
          </p>
        </Card>
      )}

      {/* Attachments */}
      {contract.attachments.length > 0 && (
        <Card className="p-6 mt-6">
          <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            {t.detail.attachmentsList} ({contract.attachments.length})
          </h3>
          <div className="space-y-3">
            {contract.attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                <FileText className="h-5 w-5 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{att.label}</p>
                  {att.fileName && (
                    <p className="text-xs text-gray-500 truncate">{att.fileName}</p>
                  )}
                  {att.fileSize && (
                    <p className="text-xs text-gray-400">
                      {(att.fileSize / 1024).toFixed(0)} KB
                    </p>
                  )}
                </div>
                <a href={att.fileUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4 mr-1" />
                    {t.actions.viewAttachment}
                  </Button>
                </a>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Notes */}
      {contract.notes && (
        <Card className="p-6 mt-6">
          <h3 className="text-sm font-medium text-gray-500 mb-2">{t.sections.notes}</h3>
          <p className="text-gray-700 whitespace-pre-wrap">{contract.notes}</p>
        </Card>
      )}
    </div>
  )
}