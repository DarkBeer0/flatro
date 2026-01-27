// src/app/(dashboard)/payments/page.tsx
'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Plus, CreditCard, AlertTriangle, CheckCircle, Clock, Filter, X, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLocale } from '@/lib/i18n/context'

// Mock data
const mockPayments = [
  { id: '1', tenant: { id: '1', firstName: 'Jan', lastName: 'Kowalski' }, property: { id: '1', name: 'Mieszkanie Mokotow' }, amount: 3500, type: 'RENT' as const, status: 'PAID' as const, dueDate: '2024-03-10', paidDate: '2024-03-05', period: '2024-03' },
  { id: '2', tenant: { id: '2', firstName: 'Anna', lastName: 'Nowak' }, property: { id: '3', name: 'Mieszkanie Wola' }, amount: 4200, type: 'RENT' as const, status: 'PENDING' as const, dueDate: '2024-03-10', paidDate: null, period: '2024-03' },
  { id: '3', tenant: { id: '1', firstName: 'Jan', lastName: 'Kowalski' }, property: { id: '1', name: 'Mieszkanie Mokotow' }, amount: 350, type: 'UTILITIES' as const, status: 'OVERDUE' as const, dueDate: '2024-02-28', paidDate: null, period: '2024-02' },
  { id: '4', tenant: { id: '1', firstName: 'Jan', lastName: 'Kowalski' }, property: { id: '1', name: 'Mieszkanie Mokotow' }, amount: 3500, type: 'RENT' as const, status: 'PAID' as const, dueDate: '2024-02-10', paidDate: '2024-02-08', period: '2024-02' },
  { id: '5', tenant: { id: '2', firstName: 'Anna', lastName: 'Nowak' }, property: { id: '3', name: 'Mieszkanie Wola' }, amount: 8400, type: 'DEPOSIT' as const, status: 'PAID' as const, dueDate: '2023-06-15', paidDate: '2023-06-14', period: '2023-06' },
]

const mockProperties = [
  { id: '1', name: 'Mieszkanie Mokotow' },
  { id: '3', name: 'Mieszkanie Wola' },
]

type PaymentStatus = 'PENDING' | 'PAID' | 'OVERDUE' | 'CANCELLED'
type PaymentType = 'RENT' | 'UTILITIES' | 'DEPOSIT' | 'OTHER'

export default function PaymentsPage() {
  const { t } = useLocale()
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | ''>('')
  const [typeFilter, setTypeFilter] = useState<PaymentType | ''>('')
  const [propertyFilter, setPropertyFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const statusConfig = {
    PENDING: { label: t.payments.status.pending, color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    PAID: { label: t.payments.status.paid, color: 'bg-green-100 text-green-800', icon: CheckCircle },
    OVERDUE: { label: t.payments.status.overdue, color: 'bg-red-100 text-red-800', icon: AlertTriangle },
    CANCELLED: { label: t.payments.status.cancelled, color: 'bg-gray-100 text-gray-800', icon: Clock },
  }

  const typeConfig = {
    RENT: { label: t.payments.types.rent, color: 'bg-blue-100 text-blue-800' },
    UTILITIES: { label: t.payments.types.utilities, color: 'bg-purple-100 text-purple-800' },
    DEPOSIT: { label: t.payments.types.deposit, color: 'bg-orange-100 text-orange-800' },
    OTHER: { label: t.payments.types.other, color: 'bg-gray-100 text-gray-800' },
  }

  // WORKING FILTERS
  const filteredPayments = useMemo(() => {
    return mockPayments.filter(payment => {
      if (statusFilter && payment.status !== statusFilter) return false
      if (typeFilter && payment.type !== typeFilter) return false
      if (propertyFilter && payment.property.id !== propertyFilter) return false
      return true
    })
  }, [statusFilter, typeFilter, propertyFilter])

  const stats = useMemo(() => {
    const totalPending = mockPayments.filter(p => p.status === 'PENDING').reduce((sum, p) => sum + p.amount, 0)
    const totalOverdue = mockPayments.filter(p => p.status === 'OVERDUE').reduce((sum, p) => sum + p.amount, 0)
    const totalPaidThisMonth = mockPayments.filter(p => p.status === 'PAID' && p.period === '2024-03').reduce((sum, p) => sum + p.amount, 0)
    return { totalPending, totalOverdue, totalPaidThisMonth }
  }, [])

  const hasActiveFilters = statusFilter || typeFilter || propertyFilter
  const activeFiltersCount = [statusFilter, typeFilter, propertyFilter].filter(Boolean).length
  const clearFilters = () => { setStatusFilter(''); setTypeFilter(''); setPropertyFilter('') }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{t.payments.title}</h1>
          <p className="text-gray-500 mt-1 text-sm lg:text-base">{t.payments.subtitle}</p>
        </div>
        <Link href="/payments/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            {t.payments.addNew}
          </Button>
        </Link>
      </div>

      {/* Stats - 2x2 mobile, 4x1 desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <Card className="p-3 lg:p-4">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-1.5 lg:p-2 bg-green-100 rounded-lg flex-shrink-0">
              <CheckCircle className="h-4 w-4 lg:h-5 lg:w-5 text-green-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg lg:text-2xl font-bold truncate">{stats.totalPaidThisMonth} {t.common.currency}</p>
              <p className="text-xs lg:text-sm text-gray-500 truncate">{t.payments.received}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 lg:p-4">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-1.5 lg:p-2 bg-yellow-100 rounded-lg flex-shrink-0">
              <Clock className="h-4 w-4 lg:h-5 lg:w-5 text-yellow-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg lg:text-2xl font-bold truncate">{stats.totalPending} {t.common.currency}</p>
              <p className="text-xs lg:text-sm text-gray-500 truncate">{t.payments.pending}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 lg:p-4">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-1.5 lg:p-2 bg-red-100 rounded-lg flex-shrink-0">
              <AlertTriangle className="h-4 w-4 lg:h-5 lg:w-5 text-red-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg lg:text-2xl font-bold truncate">{stats.totalOverdue} {t.common.currency}</p>
              <p className="text-xs lg:text-sm text-gray-500 truncate">{t.payments.overdueAmount}</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 lg:p-4">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-1.5 lg:p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <CreditCard className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-lg lg:text-2xl font-bold">{mockPayments.length}</p>
              <p className="text-xs lg:text-sm text-gray-500 truncate">{t.payments.total}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-3 lg:p-4 mb-4 lg:mb-6">
        {/* Mobile filter toggle */}
        <div className="lg:hidden">
          <button onClick={() => setShowFilters(!showFilters)} className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium">{t.common.filter}</span>
              {activeFiltersCount > 0 && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">{activeFiltersCount}</span>
              )}
            </div>
            <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* Filters content */}
        <div className={`${showFilters ? 'mt-4' : 'hidden'} lg:flex lg:mt-0 flex-col lg:flex-row lg:items-center gap-3 lg:gap-4`}>
          <div className="hidden lg:flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">{t.common.filter}:</span>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 lg:gap-3 flex-1">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as PaymentStatus | '')} className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm bg-white">
              <option value="">{t.payments.filters.allStatuses}</option>
              <option value="PENDING">{t.payments.status.pending}</option>
              <option value="PAID">{t.payments.status.paid}</option>
              <option value="OVERDUE">{t.payments.status.overdue}</option>
            </select>
            
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as PaymentType | '')} className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm bg-white">
              <option value="">{t.payments.filters.allTypes}</option>
              <option value="RENT">{t.payments.types.rent}</option>
              <option value="UTILITIES">{t.payments.types.utilities}</option>
              <option value="DEPOSIT">{t.payments.types.deposit}</option>
              <option value="OTHER">{t.payments.types.other}</option>
            </select>
            
            <select value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)} className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm bg-white">
              <option value="">{t.payments.filters.allProperties}</option>
              {mockProperties.map((property) => (
                <option key={property.id} value={property.id}>{property.name}</option>
              ))}
            </select>
          </div>

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="self-start sm:self-auto">
              <X className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">{t.common.cancel}</span>
            </Button>
          )}
        </div>
      </Card>

      {/* Payments List */}
      {filteredPayments.length === 0 ? (
        <Card className="p-8 lg:p-12 text-center">
          <CreditCard className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t.common.noData}</h3>
          <p className="text-gray-500 mb-4">{hasActiveFilters ? t.payments.noPaymentsDesc : t.payments.noPayments}</p>
          {hasActiveFilters ? (
            <Button variant="outline" onClick={clearFilters}>{t.common.cancel}</Button>
          ) : (
            <Link href="/payments/new"><Button><Plus className="h-4 w-4 mr-2" />{t.payments.addNew}</Button></Link>
          )}
        </Card>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {filteredPayments.map((payment) => {
              const status = statusConfig[payment.status]
              const type = typeConfig[payment.type]
              const StatusIcon = status.icon
              return (
                <Card key={payment.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{payment.tenant.firstName} {payment.tenant.lastName}</p>
                      <p className="text-sm text-gray-500 truncate">{payment.property.name}</p>
                    </div>
                    <Badge className={`${status.color} flex items-center gap-1 flex-shrink-0 ml-2`}>
                      <StatusIcon className="h-3 w-3" />
                      <span className="hidden sm:inline">{status.label}</span>
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <Badge className={type.color}>{type.label}</Badge>
                    <p className="font-bold text-lg">{payment.amount} {t.common.currency}</p>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                    <span>{t.payments.period}: {payment.period}</span>
                    <span>{t.payments.dueDate}: {payment.dueDate}</span>
                  </div>
                  {(payment.status === 'PENDING' || payment.status === 'OVERDUE') && (
                    <Button size="sm" className="w-full"><CheckCircle className="h-4 w-4 mr-2" />{t.payments.markAsPaid}</Button>
                  )}
                </Card>
              )
            })}
          </div>

          {/* Desktop Table */}
          <Card className="hidden lg:block overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left p-4 font-medium text-gray-500">{t.payments.tenant}</th>
                    <th className="text-left p-4 font-medium text-gray-500">{t.payments.property}</th>
                    <th className="text-left p-4 font-medium text-gray-500">{t.payments.type}</th>
                    <th className="text-left p-4 font-medium text-gray-500">{t.payments.period}</th>
                    <th className="text-left p-4 font-medium text-gray-500">{t.payments.dueDate}</th>
                    <th className="text-right p-4 font-medium text-gray-500">{t.payments.amount}</th>
                    <th className="text-left p-4 font-medium text-gray-500">Status</th>
                    <th className="text-right p-4 font-medium text-gray-500">{t.common.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => {
                    const status = statusConfig[payment.status]
                    const type = typeConfig[payment.type]
                    const StatusIcon = status.icon
                    return (
                      <tr key={payment.id} className="border-b hover:bg-gray-50">
                        <td className="p-4"><Link href={`/tenants/${payment.tenant.id}`} className="font-medium text-gray-900 hover:text-blue-600">{payment.tenant.firstName} {payment.tenant.lastName}</Link></td>
                        <td className="p-4"><Link href={`/properties/${payment.property.id}`} className="text-gray-600 hover:text-blue-600">{payment.property.name}</Link></td>
                        <td className="p-4"><Badge className={type.color}>{type.label}</Badge></td>
                        <td className="p-4 text-gray-600">{payment.period}</td>
                        <td className="p-4 text-gray-600">{payment.dueDate}</td>
                        <td className="p-4 text-right font-semibold">{payment.amount} {t.common.currency}</td>
                        <td className="p-4"><Badge className={`${status.color} flex items-center gap-1 w-fit`}><StatusIcon className="h-3 w-3" />{status.label}</Badge></td>
                        <td className="p-4 text-right">
                          {payment.status === 'PENDING' || payment.status === 'OVERDUE' ? (
                            <Button size="sm" variant="outline">{t.payments.markAsPaid}</Button>
                          ) : (
                            <Button size="sm" variant="ghost">{t.common.details}</Button>
                          )}
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
