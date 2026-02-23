// app/(dashboard)/payments/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Plus, CreditCard, AlertTriangle, CheckCircle, Clock, Filter, X, ChevronDown, Loader2, HelpCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLocale } from '@/lib/i18n/context'

interface Payment {
  id: string
  amount: number
  type: 'RENT' | 'UTILITIES' | 'DEPOSIT' | 'OTHER'
  status: 'PENDING' | 'PENDING_CONFIRMATION' | 'PAID' | 'OVERDUE' | 'REJECTED' | 'CANCELLED'
  dueDate: string
  paidDate: string | null
  period: string | null
  tenant: {
    id: string
    firstName: string
    lastName: string
    property: {
      id: string
      name: string
    } | null
  }
}

interface Property {
  id: string
  name: string
}

export default function PaymentsPage() {
  const { t } = useLocale()
  const router = useRouter()
  const [payments, setPayments] = useState<Payment[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [propertyFilter, setPropertyFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [paymentsRes, propertiesRes] = await Promise.all([
        fetch('/api/payments'),
        fetch('/api/properties')
      ])
      if (paymentsRes.ok) setPayments(await paymentsRes.json())
      if (propertiesRes.ok) setProperties(await propertiesRes.json())
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  // === Отметить как оплаченный (PENDING / OVERDUE → PAID) ===
  async function markAsPaid(id: string) {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/payments/${id}/mark-paid`, { method: 'POST' })
      if (res.ok) {
        setPayments(prev => prev.map(p =>
          p.id === id ? { ...p, status: 'PAID' as const, paidDate: new Date().toISOString() } : p
        ))
      } else {
        const data = await res.json()
        alert(data.error || 'Ошибка')
      }
    } catch { alert('Ошибка подключения') }
    finally { setActionLoading(null) }
  }

  // === Подтвердить (PENDING_CONFIRMATION → PAID) ===
  async function confirmPayment(id: string) {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/payments/${id}/confirm`, { method: 'POST' })
      if (res.ok) {
        setPayments(prev => prev.map(p =>
          p.id === id ? { ...p, status: 'PAID' as const, paidDate: new Date().toISOString() } : p
        ))
      } else {
        const data = await res.json()
        alert(data.error || 'Ошибка подтверждения')
      }
    } catch { alert('Ошибка подключения') }
    finally { setActionLoading(null) }
  }

  // === Отклонить (PENDING_CONFIRMATION → REJECTED) ===
  async function rejectPayment(id: string) {
    const reason = prompt('Причина отклонения (необязательно):')
    if (reason === null) return
    setActionLoading(id)
    try {
      const res = await fetch(`/api/payments/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: reason || null }),
      })
      if (res.ok) {
        setPayments(prev => prev.map(p =>
          p.id === id ? { ...p, status: 'REJECTED' as const } : p
        ))
      } else {
        const data = await res.json()
        alert(data.error || 'Ошибка отклонения')
      }
    } catch { alert('Ошибка подключения') }
    finally { setActionLoading(null) }
  }

  // === Подробнее → профиль арендатора ===
  function viewTenantDetails(tenantId: string) {
    router.push(`/tenants/${tenantId}`)
  }

  const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
    PENDING: { label: t.payments?.status?.pending || 'Ожидает', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    PENDING_CONFIRMATION: { label: t.payments?.status?.pendingConfirmation || 'На подтверждении', color: 'bg-blue-100 text-blue-800', icon: HelpCircle },
    PAID: { label: t.payments?.status?.paid || 'Оплачено', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    OVERDUE: { label: t.payments?.status?.overdue || 'Просрочено', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
    REJECTED: { label: t.payments?.status?.rejected || 'Отклонено', color: 'bg-orange-100 text-orange-800', icon: XCircle },
    CANCELLED: { label: t.payments?.status?.cancelled || 'Отменено', color: 'bg-gray-100 text-gray-800', icon: XCircle },
  }
  const getStatusConfig = (status: string) =>
    statusConfig[status] || { label: status, color: 'bg-gray-100 text-gray-800', icon: HelpCircle }

  const typeConfig: Record<string, { label: string; color: string }> = {
    RENT: { label: t.payments?.types?.rent || 'Аренда', color: 'bg-blue-100 text-blue-800' },
    UTILITIES: { label: t.payments?.types?.utilities || 'Коммунальные', color: 'bg-purple-100 text-purple-800' },
    DEPOSIT: { label: t.payments?.types?.deposit || 'Депозит', color: 'bg-orange-100 text-orange-800' },
    OTHER: { label: t.payments?.types?.other || 'Другое', color: 'bg-gray-100 text-gray-800' },
  }
  const getTypeConfig = (type: string) =>
    typeConfig[type] || { label: type, color: 'bg-gray-100 text-gray-800' }

  const filteredPayments = useMemo(() => {
    return payments.filter(payment => {
      if (statusFilter && payment.status !== statusFilter) return false
      if (typeFilter && payment.type !== typeFilter) return false
      if (propertyFilter && payment.tenant.property?.id !== propertyFilter) return false
      return true
    })
  }, [payments, statusFilter, typeFilter, propertyFilter])

  const stats = useMemo(() => {
    const totalPending = payments.filter(p => p.status === 'PENDING' || p.status === 'PENDING_CONFIRMATION').reduce((s, p) => s + p.amount, 0)
    const totalOverdue = payments.filter(p => p.status === 'OVERDUE').reduce((s, p) => s + p.amount, 0)
    const thisMonth = new Date().toISOString().slice(0, 7)
    const totalPaidThisMonth = payments.filter(p => p.status === 'PAID' && p.period === thisMonth).reduce((s, p) => s + p.amount, 0)
    const pendingConfirmation = payments.filter(p => p.status === 'PENDING_CONFIRMATION').length
    return { totalPending, totalOverdue, totalPaidThisMonth, pendingConfirmation }
  }, [payments])

  const hasActiveFilters = statusFilter || typeFilter || propertyFilter
  const activeFiltersCount = [statusFilter, typeFilter, propertyFilter].filter(Boolean).length
  const clearFilters = () => { setStatusFilter(''); setTypeFilter(''); setPropertyFilter('') }
  const isActionLoading = (id: string) => actionLoading === id

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
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{t.payments?.title || 'Платежи'}</h1>
          <p className="text-gray-500 mt-1 text-sm lg:text-base">{t.payments?.subtitle || 'Отслеживание платежей от арендаторов'}</p>
        </div>
        <Link href="/payments/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />+ Добавить платёж
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <Card className="p-3 lg:p-4">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-1.5 lg:p-2 bg-green-100 rounded-lg flex-shrink-0"><CheckCircle className="h-4 w-4 lg:h-5 lg:w-5 text-green-600" /></div>
            <div className="min-w-0">
              <p className="text-lg lg:text-2xl font-bold truncate">{stats.totalPaidThisMonth} zł</p>
              <p className="text-xs lg:text-sm text-gray-500 truncate">Получено</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 lg:p-4">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-1.5 lg:p-2 bg-yellow-100 rounded-lg flex-shrink-0"><Clock className="h-4 w-4 lg:h-5 lg:w-5 text-yellow-600" /></div>
            <div className="min-w-0">
              <p className="text-lg lg:text-2xl font-bold truncate">{stats.totalPending} zł</p>
              <p className="text-xs lg:text-sm text-gray-500 truncate">Ожидается</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 lg:p-4">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-1.5 lg:p-2 bg-red-100 rounded-lg flex-shrink-0"><AlertTriangle className="h-4 w-4 lg:h-5 lg:w-5 text-red-600" /></div>
            <div className="min-w-0">
              <p className="text-lg lg:text-2xl font-bold truncate">{stats.totalOverdue} zł</p>
              <p className="text-xs lg:text-sm text-gray-500 truncate">Просрочено</p>
            </div>
          </div>
        </Card>
        <Card className="p-3 lg:p-4">
          <div className="flex items-center gap-2 lg:gap-3">
            <div className="p-1.5 lg:p-2 bg-blue-100 rounded-lg flex-shrink-0"><CreditCard className="h-4 w-4 lg:h-5 lg:w-5 text-blue-600" /></div>
            <div className="min-w-0">
              <p className="text-lg lg:text-2xl font-bold">{payments.length}</p>
              <p className="text-xs lg:text-sm text-gray-500 truncate">Всего</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Pending confirmation banner */}
      {stats.pendingConfirmation > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <p className="text-sm text-blue-700">{stats.pendingConfirmation} платёж(ей) ожидают вашего подтверждения</p>
          <Button size="sm" variant="outline" className="ml-auto" onClick={() => setStatusFilter('PENDING_CONFIRMATION')}>Показать</Button>
        </div>
      )}

      {/* Filters */}
      <Card className="p-3 lg:p-4 mb-4 lg:mb-6">
        <div className="lg:hidden">
          <button onClick={() => setShowFilters(!showFilters)} className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium">Фильтр</span>
              {activeFiltersCount > 0 && <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">{activeFiltersCount}</span>}
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
              <option value="PENDING">Ожидает</option>
              <option value="PENDING_CONFIRMATION">На подтверждении</option>
              <option value="PAID">Оплачено</option>
              <option value="OVERDUE">Просрочено</option>
              <option value="REJECTED">Отклонено</option>
              <option value="CANCELLED">Отменено</option>
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm bg-white">
              <option value="">Все типы</option>
              <option value="RENT">Аренда</option>
              <option value="UTILITIES">Коммунальные</option>
              <option value="DEPOSIT">Депозит</option>
              <option value="OTHER">Другое</option>
            </select>
            <select value={propertyFilter} onChange={(e) => setPropertyFilter(e.target.value)} className="flex-1 rounded-md border border-gray-200 px-3 py-2 text-sm bg-white">
              <option value="">Вся недвижимость</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="self-start sm:self-auto">
              <X className="h-4 w-4 mr-1" />Сбросить
            </Button>
          )}
        </div>
      </Card>

      {/* Payments List */}
      {filteredPayments.length === 0 ? (
        <Card className="p-8 lg:p-12 text-center">
          <CreditCard className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Нет данных</h3>
          <p className="text-gray-500 mb-4">{hasActiveFilters ? 'Нет платежей по фильтрам' : 'Пока нет платежей'}</p>
          {hasActiveFilters
            ? <Button variant="outline" onClick={clearFilters}>Сбросить</Button>
            : <Link href="/payments/new"><Button><Plus className="h-4 w-4 mr-2" />+ Добавить</Button></Link>}
        </Card>
      ) : (
        <>
          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {filteredPayments.map((payment) => {
              const status = getStatusConfig(payment.status)
              const type = getTypeConfig(payment.type)
              const StatusIcon = status.icon
              const busy = isActionLoading(payment.id)
              return (
                <Card key={payment.id} className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <button className="font-medium text-gray-900 truncate hover:text-blue-600 text-left" onClick={() => viewTenantDetails(payment.tenant.id)}>
                        {payment.tenant.firstName} {payment.tenant.lastName}
                      </button>
                      <p className="text-sm text-gray-500 truncate">{payment.tenant.property?.name || '—'}</p>
                    </div>
                    <Badge className={`${status.color} flex items-center gap-1 flex-shrink-0 ml-2`}>
                      <StatusIcon className="h-3 w-3" /><span className="hidden sm:inline">{status.label}</span>
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    <Badge className={type.color}>{type.label}</Badge>
                    <p className="font-bold text-lg">{payment.amount} zł</p>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                    <span>Период: {payment.period || '—'}</span>
                    <span>До: {new Date(payment.dueDate).toLocaleDateString()}</span>
                  </div>
                  {payment.status === 'PENDING_CONFIRMATION' && (
                    <div className="flex gap-2">
                      <Button size="sm" className="flex-1" onClick={() => confirmPayment(payment.id)} disabled={busy}>
                        {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}Подтвердить
                      </Button>
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => rejectPayment(payment.id)} disabled={busy}>
                        <XCircle className="h-4 w-4 mr-1" />Отклонить
                      </Button>
                    </div>
                  )}
                  {(payment.status === 'PENDING' || payment.status === 'OVERDUE') && (
                    <Button size="sm" className="w-full" onClick={() => markAsPaid(payment.id)} disabled={busy}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <CheckCircle className="h-4 w-4 mr-1" />}Отметить оплату
                    </Button>
                  )}
                  {(payment.status === 'PAID' || payment.status === 'REJECTED' || payment.status === 'CANCELLED') && (
                    <Button size="sm" variant="ghost" className="w-full" onClick={() => viewTenantDetails(payment.tenant.id)}>Подробнее</Button>
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
                    <th className="text-left p-4 font-medium text-gray-500">Арендатор</th>
                    <th className="text-left p-4 font-medium text-gray-500">Недвижимость</th>
                    <th className="text-left p-4 font-medium text-gray-500">Тип</th>
                    <th className="text-left p-4 font-medium text-gray-500">Период</th>
                    <th className="text-left p-4 font-medium text-gray-500">Срок</th>
                    <th className="text-right p-4 font-medium text-gray-500">Сумма</th>
                    <th className="text-left p-4 font-medium text-gray-500">Статус</th>
                    <th className="text-right p-4 font-medium text-gray-500">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.map((payment) => {
                    const status = getStatusConfig(payment.status)
                    const type = getTypeConfig(payment.type)
                    const StatusIcon = status.icon
                    const busy = isActionLoading(payment.id)
                    return (
                      <tr key={payment.id} className="border-b hover:bg-gray-50">
                        <td className="p-4">
                          <button className="font-medium text-gray-900 hover:text-blue-600 transition-colors" onClick={() => viewTenantDetails(payment.tenant.id)}>
                            {payment.tenant.firstName} {payment.tenant.lastName}
                          </button>
                        </td>
                        <td className="p-4 text-gray-600">{payment.tenant.property?.name || '—'}</td>
                        <td className="p-4"><Badge className={type.color}>{type.label}</Badge></td>
                        <td className="p-4 text-gray-600">{payment.period || '—'}</td>
                        <td className="p-4 text-gray-600">{new Date(payment.dueDate).toLocaleDateString()}</td>
                        <td className="p-4 text-right font-semibold">{payment.amount} zł</td>
                        <td className="p-4">
                          <Badge className={`${status.color} flex items-center gap-1 w-fit`}><StatusIcon className="h-3 w-3" />{status.label}</Badge>
                        </td>
                        <td className="p-4 text-right">
                          {payment.status === 'PENDING_CONFIRMATION' ? (
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" onClick={() => confirmPayment(payment.id)} disabled={busy}>
                                {busy ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}Подтвердить
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => rejectPayment(payment.id)} disabled={busy}>Отклонить</Button>
                            </div>
                          ) : (payment.status === 'PENDING' || payment.status === 'OVERDUE') ? (
                            <Button size="sm" variant="outline" onClick={() => markAsPaid(payment.id)} disabled={busy}>
                              {busy ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}Оплачено
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => viewTenantDetails(payment.tenant.id)}>Подробнее</Button>
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