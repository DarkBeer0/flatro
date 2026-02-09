// app/(dashboard)/contracts/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  Plus,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  Filter,
  X,
  ChevronDown,
  Loader2,
  Download,
  CreditCard,
  PenLine,
  FileCheck,
  Paperclip,
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
  fileName: string | null
}

interface Contract {
  id: string
  type: 'STANDARD' | 'OCCASIONAL' | 'INSTITUTIONAL'
  startDate: string
  endDate: string | null
  rentAmount: number
  adminFee: number
  utilitiesAdvance: number
  depositAmount: number | null
  paymentDay: number
  status: 'DRAFT' | 'PENDING_SIGNATURE' | 'SIGNED' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
  contractSource: string
  contractFileUrl: string | null
  notes: string | null
  tenant: {
    id: string
    firstName: string
    lastName: string
  }
  property: {
    id: string
    name: string
    address: string
  }
  attachments: ContractAttachment[]
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchContracts()
  }, [])

  async function fetchContracts() {
    try {
      const res = await fetch('/api/contracts')
      if (res.ok) {
        const data = await res.json()
        setContracts(data)
      }
    } catch (error) {
      console.error('Error fetching contracts:', error)
    } finally {
      setLoading(false)
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

  const typeConfig: Record<string, { label: string; color: string }> = {
    STANDARD: { label: t.types.STANDARD, color: 'bg-blue-100 text-blue-800' },
    OCCASIONAL: { label: t.types.OCCASIONAL, color: 'bg-purple-100 text-purple-800' },
    INSTITUTIONAL: { label: t.types.INSTITUTIONAL, color: 'bg-orange-100 text-orange-800' },
  }

  const getStatusConfig = (status: string) =>
    statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: FileText }
  const getTypeConfig = (type: string) =>
    typeConfig[type] || { label: type, color: 'bg-gray-100 text-gray-800' }

  const getTotalMonthly = (c: Contract) =>
    (c.rentAmount || 0) + (c.adminFee || 0) + (c.utilitiesAdvance || 0)

  const getDaysUntilEnd = (endDate: string) => {
    const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (days < 0) return `Wygasła ${Math.abs(days)} dni temu`
    if (days === 0) return 'Wygasa dzisiaj'
    if (days <= 30) return `${days} ${t.detail.daysLeft}`
    return null
  }

  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      if (statusFilter && c.status !== statusFilter) return false
      if (typeFilter && c.type !== typeFilter) return false
      return true
    })
  }, [contracts, statusFilter, typeFilter])

  const hasActiveFilters = statusFilter || typeFilter
  const clearFilters = () => {
    setStatusFilter('')
    setTypeFilter('')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{t.title}</h1>
          <p className="text-gray-500 mt-1">
            {contracts.length} {contracts.length === 1 ? 'umowa' : contracts.length < 5 ? 'umowy' : 'umów'}
          </p>
        </div>
        <Link href="/contracts/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            {t.newContract}
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex items-center justify-between lg:hidden">
          <span className="text-sm font-medium text-gray-700">{t.filters.title}</span>
          <button onClick={() => setShowFilters(!showFilters)} className="p-1">
            <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className={`${showFilters ? 'mt-4' : 'hidden'} lg:flex lg:mt-0 flex-col lg:flex-row lg:items-center gap-3 lg:gap-4`}>
          <div className="hidden lg:flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">{t.filters.title}:</span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 lg:gap-3 flex-1">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm bg-white"
            >
              <option value="">{t.filters.allStatuses}</option>
              <option value="DRAFT">{t.statuses.DRAFT}</option>
              <option value="PENDING_SIGNATURE">{t.statuses.PENDING_SIGNATURE}</option>
              <option value="SIGNED">{t.statuses.SIGNED}</option>
              <option value="ACTIVE">{t.statuses.ACTIVE}</option>
              <option value="EXPIRED">{t.statuses.EXPIRED}</option>
              <option value="TERMINATED">{t.statuses.TERMINATED}</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm bg-white"
            >
              <option value="">{t.filters.allTypes}</option>
              <option value="STANDARD">{t.types.STANDARD}</option>
              <option value="OCCASIONAL">{t.types.OCCASIONAL}</option>
              <option value="INSTITUTIONAL">{t.types.INSTITUTIONAL}</option>
            </select>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />
              {t.filters.reset}
            </Button>
          )}
        </div>
      </Card>

      {/* Contracts List */}
      {filteredContracts.length === 0 ? (
        <Card className="p-8 lg:p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t.empty.title}</h3>
          <p className="text-gray-500 mb-4">
            {hasActiveFilters ? t.empty.noResults : t.empty.createFirst}
          </p>
          {hasActiveFilters ? (
            <Button variant="outline" onClick={clearFilters}>
              {t.filters.reset}
            </Button>
          ) : (
            <Link href="/contracts/new">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t.newContract}
              </Button>
            </Link>
          )}
        </Card>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {filteredContracts.map((contract) => {
              const status = getStatusConfig(contract.status)
              const type = getTypeConfig(contract.type)
              const StatusIcon = status.icon
              const total = getTotalMonthly(contract)
              return (
                <Link key={contract.id} href={`/contracts/${contract.id}`}>
                  <Card className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">
                          {contract.tenant.firstName} {contract.tenant.lastName}
                        </p>
                        <p className="text-sm text-gray-500 truncate">{contract.property.name}</p>
                      </div>
                      <div className="flex items-center gap-1.5 ml-2">
                        {contract.contractFileUrl && (
                          <span title={t.table.pdfAttached}>
                            <Paperclip className="h-3.5 w-3.5 text-blue-500" />
                          </span>
                        )}
                        <Badge className={`${status.color} flex items-center gap-1`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <Badge className={type.color}>{type.label}</Badge>
                      <span className="font-semibold">{total.toLocaleString('pl-PL')} zł</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                      <span>
                        {new Date(contract.startDate).toLocaleDateString('pl-PL')} —{' '}
                        {contract.endDate
                          ? new Date(contract.endDate).toLocaleDateString('pl-PL')
                          : t.messages.indefiniteLabel}
                      </span>
                      <span className="text-gray-400">
                        {t.messages.paymentDue} {contract.paymentDay}.
                      </span>
                    </div>
                    {contract.status === 'ACTIVE' && contract.endDate && (
                      <p className="text-xs text-yellow-600 mt-1">{getDaysUntilEnd(contract.endDate)}</p>
                    )}
                  </Card>
                </Link>
              )
            })}
          </div>

          {/* Desktop Table */}
          <Card className="hidden lg:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-4 font-medium text-gray-500">{t.table.tenant}</th>
                    <th className="text-left p-4 font-medium text-gray-500">{t.table.property}</th>
                    <th className="text-left p-4 font-medium text-gray-500">{t.table.type}</th>
                    <th className="text-left p-4 font-medium text-gray-500">{t.table.period}</th>
                    <th className="text-right p-4 font-medium text-gray-500">{t.table.totalMonthly}</th>
                    <th className="text-left p-4 font-medium text-gray-500">{t.table.status}</th>
                    <th className="text-right p-4 font-medium text-gray-500">{t.table.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts.map((contract) => {
                    const status = getStatusConfig(contract.status)
                    const type = getTypeConfig(contract.type)
                    const StatusIcon = status.icon
                    const total = getTotalMonthly(contract)
                    return (
                      <tr key={contract.id} className="border-b hover:bg-gray-50">
                        <td className="p-4 font-medium text-gray-900">
                          {contract.tenant.firstName} {contract.tenant.lastName}
                        </td>
                        <td className="p-4">
                          <p className="text-gray-900">{contract.property.name}</p>
                          <p className="text-xs text-gray-500">{contract.property.address}</p>
                        </td>
                        <td className="p-4">
                          <Badge className={type.color}>{type.label}</Badge>
                        </td>
                        <td className="p-4">
                          <p className="text-gray-600">
                            {new Date(contract.startDate).toLocaleDateString('pl-PL')} —{' '}
                            {contract.endDate
                              ? new Date(contract.endDate).toLocaleDateString('pl-PL')
                              : t.messages.indefiniteLabel}
                          </p>
                          {contract.status === 'ACTIVE' && contract.endDate && (
                            <p className="text-xs text-yellow-600 mt-0.5">{getDaysUntilEnd(contract.endDate)}</p>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <p className="font-semibold">{total.toLocaleString('pl-PL')} zł</p>
                          {(contract.adminFee > 0 || contract.utilitiesAdvance > 0) && (
                            <p className="text-xs text-gray-400 mt-0.5">
                              {contract.rentAmount.toLocaleString('pl-PL')} + {contract.adminFee.toLocaleString('pl-PL')} + {contract.utilitiesAdvance.toLocaleString('pl-PL')}
                            </p>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <Badge className={`${status.color} flex items-center gap-1`}>
                              <StatusIcon className="h-3 w-3" />
                              {status.label}
                            </Badge>
                            {contract.contractFileUrl && (
                              <span title={t.table.pdfAttached}>
                                <Paperclip className="h-3.5 w-3.5 text-blue-500" />
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {contract.contractFileUrl && (
                              <a href={contract.contractFileUrl} target="_blank" rel="noopener noreferrer">
                                <Button size="sm" variant="ghost" title={t.actions.downloadPdf}>
                                  <Download className="h-4 w-4" />
                                </Button>
                              </a>
                            )}
                            <Link href={`/contracts/${contract.id}`}>
                              <Button size="sm" variant="outline">
                                Szczegóły
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}