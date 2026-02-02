// app/(dashboard)/contracts/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Plus, FileText, CheckCircle, Clock, AlertTriangle, Filter, X, ChevronDown, Loader2, Download, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Contract {
  id: string
  type: 'STANDARD' | 'OCCASIONAL' | 'INSTITUTIONAL'
  startDate: string
  endDate: string | null
  rentAmount: number
  depositAmount: number | null
  paymentDay: number
  status: 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED'
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
    DRAFT: { label: 'Черновик', color: 'bg-gray-100 text-gray-800', icon: FileText },
    ACTIVE: { label: 'Активная', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    EXPIRED: { label: 'Истекла', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    TERMINATED: { label: 'Расторгнута', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  }

  const typeConfig: Record<string, { label: string; color: string }> = {
    STANDARD: { label: 'Обычный наём', color: 'bg-blue-100 text-blue-800' },
    OCCASIONAL: { label: 'Наём okazjonalny', color: 'bg-purple-100 text-purple-800' },
    INSTITUTIONAL: { label: 'Наём instytucjonalny', color: 'bg-orange-100 text-orange-800' },
  }

  const getStatusConfig = (status: string) =>
    statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: FileText }
  const getTypeConfig = (type: string) =>
    typeConfig[type] || { label: type, color: 'bg-gray-100 text-gray-800' }

  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
      if (statusFilter && c.status !== statusFilter) return false
      if (typeFilter && c.type !== typeFilter) return false
      return true
    })
  }, [contracts, statusFilter, typeFilter])

  const stats = useMemo(() => {
    const total = contracts.length
    const active = contracts.filter(c => c.status === 'ACTIVE').length
    const expiring = contracts.filter(c => {
      if (c.status !== 'ACTIVE' || !c.endDate) return false
      const daysLeft = (new Date(c.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      return daysLeft <= 30 && daysLeft > 0
    }).length
    const monthlyIncome = contracts
      .filter(c => c.status === 'ACTIVE')
      .reduce((sum, c) => sum + c.rentAmount, 0)
    return { total, active, expiring, monthlyIncome }
  }, [contracts])

  const hasActiveFilters = statusFilter || typeFilter
  const clearFilters = () => { setStatusFilter(''); setTypeFilter('') }

  // Вычисляем дни до окончания
  function getDaysUntilEnd(endDate: string | null): string {
    if (!endDate) return 'бессрочно'
    const days = Math.ceil((new Date(endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (days < 0) return `Истёк ${Math.abs(days)} дн. назад`
    if (days === 0) return 'Истекает сегодня'
    return `Истекает через ${days} дн.`
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
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Умовы</h1>
          <p className="text-gray-500 mt-1 text-sm lg:text-base">Zarządzaj umowami najmu</p>
        </div>
        <Link href="/contracts/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />+ Нова умова
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <Card className="p-3 lg:p-4">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-1.5 lg:p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <FileText className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg lg:text-2xl font-bold">{stats.total}</p>
              <p className="text-xs lg:text-sm text-gray-500">Всех</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 lg:p-4">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-1.5 lg:p-2 bg-green-100 rounded-lg flex-shrink-0">
              <CheckCircle className="h-4 w-4 lg:h-5 lg:w-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg lg:text-2xl font-bold">{stats.active}</p>
              <p className="text-xs lg:text-sm text-gray-500">Активных</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 lg:p-4">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-1.5 lg:p-2 bg-yellow-100 rounded-lg flex-shrink-0">
              <Clock className="h-4 w-4 lg:h-5 lg:w-5 text-yellow-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg lg:text-2xl font-bold">{stats.expiring}</p>
              <p className="text-xs lg:text-sm text-gray-500">Wygasających</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 lg:p-4">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-1.5 lg:p-2 bg-purple-100 rounded-lg flex-shrink-0">
              <CreditCard className="h-4 w-4 lg:h-5 lg:w-5 text-purple-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg lg:text-2xl font-bold">{stats.monthlyIncome} zł</p>
              <p className="text-xs lg:text-sm text-gray-500">Месячный приход</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-3 lg:p-4 mb-4 lg:mb-6">
        <div className="lg:hidden">
          <button onClick={() => setShowFilters(!showFilters)} className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium">Фильтр</span>
            </div>
            <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className={`${showFilters ? 'mt-4' : 'hidden'} lg:flex lg:mt-0 flex-col lg:flex-row lg:items-center gap-3 lg:gap-4`}>
          <div className="hidden lg:flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">Фильтр:</span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 lg:gap-3 flex-1">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm bg-white">
              <option value="">Все статусы</option>
              <option value="ACTIVE">Активные</option>
              <option value="DRAFT">Черновики</option>
              <option value="EXPIRED">Истекшие</option>
              <option value="TERMINATED">Расторгнутые</option>
            </select>
            
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm bg-white">
              <option value="">Все типы</option>
              <option value="STANDARD">Обычный наём</option>
              <option value="OCCASIONAL">Наём okazjonalny</option>
              <option value="INSTITUTIONAL">Наём instytucjonalny</option>
            </select>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              <X className="h-4 w-4 mr-1" />Сбросить
            </Button>
          )}
        </div>
      </Card>

      {/* Contracts List */}
      {filteredContracts.length === 0 ? (
        <Card className="p-8 lg:p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Нет договоров</h3>
          <p className="text-gray-500 mb-4">{hasActiveFilters ? 'Нет договоров по фильтрам' : 'Создайте первый договор'}</p>
          {hasActiveFilters ? (
            <Button variant="outline" onClick={clearFilters}>Сбросить</Button>
          ) : (
            <Link href="/contracts/new"><Button><Plus className="h-4 w-4 mr-2" />Новый договор</Button></Link>
          )}
        </Card>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {filteredContracts.map(contract => {
              const status = getStatusConfig(contract.status)
              const type = getTypeConfig(contract.type)
              const StatusIcon = status.icon
              return (
                <Link key={contract.id} href={`/contracts/${contract.id}`}>
                  <Card className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900">{contract.tenant.firstName} {contract.tenant.lastName}</p>
                        <p className="text-sm text-gray-500 truncate">{contract.property.name}</p>
                      </div>
                      <Badge className={`${status.color} flex items-center gap-1 ml-2`}>
                        <StatusIcon className="h-3 w-3" />{status.label}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <Badge className={type.color}>{type.label}</Badge>
                      <span className="font-semibold">{contract.rentAmount} zł</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                      <span>
                        {new Date(contract.startDate).toLocaleDateString()} — {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'бессрочно'}
                      </span>
                      <span className="text-gray-400">платне до {contract.paymentDay}.</span>
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
                    <th className="text-left p-4 font-medium text-gray-500">Najemca</th>
                    <th className="text-left p-4 font-medium text-gray-500">Nieruchomość</th>
                    <th className="text-left p-4 font-medium text-gray-500">Typ</th>
                    <th className="text-left p-4 font-medium text-gray-500">Okres</th>
                    <th className="text-right p-4 font-medium text-gray-500">Czynsz</th>
                    <th className="text-left p-4 font-medium text-gray-500">Status</th>
                    <th className="text-right p-4 font-medium text-gray-500">Akcje</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContracts.map(contract => {
                    const status = getStatusConfig(contract.status)
                    const type = getTypeConfig(contract.type)
                    const StatusIcon = status.icon
                    return (
                      <tr key={contract.id} className="border-b hover:bg-gray-50">
                        <td className="p-4 font-medium text-gray-900">{contract.tenant.firstName} {contract.tenant.lastName}</td>
                        <td className="p-4">
                          <p className="text-gray-900">{contract.property.name}</p>
                          <p className="text-xs text-gray-500">{contract.property.address}</p>
                        </td>
                        <td className="p-4"><Badge className={type.color}>{type.label}</Badge></td>
                        <td className="p-4">
                          <p className="text-gray-600">
                            {new Date(contract.startDate).toLocaleDateString()} — {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'бессрочно'}
                          </p>
                          {contract.status === 'ACTIVE' && contract.endDate && (
                            <p className="text-xs text-yellow-600">{getDaysUntilEnd(contract.endDate)}</p>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <p className="font-semibold">{contract.rentAmount} zł</p>
                          <p className="text-xs text-gray-500">платне до {contract.paymentDay}.</p>
                        </td>
                        <td className="p-4">
                          <Badge className={`${status.color} flex items-center gap-1 w-fit`}>
                            <StatusIcon className="h-3 w-3" />{status.label}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex gap-1 justify-end">
                            <Link href={`/contracts/${contract.id}`}>
                              <Button size="sm" variant="ghost">Szczegóły</Button>
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


