// app/(dashboard)/tenants/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, User, Mail, Phone, Home, Calendar, FileText, CreditCard, Loader2, AlertCircle, Trash2, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface TenantDetail {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  pesel: string | null
  moveInDate: string | null
  moveOutDate: string | null
  isActive: boolean
  tenantUserId: string | null
  property: {
    id: string
    name: string
    address: string
    city: string
  } | null
  contracts: {
    id: string
    type: string
    startDate: string
    endDate: string | null
    rentAmount: number
    status: string
  }[]
  payments: {
    id: string
    amount: number
    type: string
    status: string
    dueDate: string
    paidDate: string | null
    period: string | null
  }[]
}

export default function TenantDetailPage() {
  const router = useRouter()
  const params = useParams()
  const tenantId = params.id as string
  
  const [tenant, setTenant] = useState<TenantDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchTenant()
  }, [tenantId])

  async function fetchTenant() {
    try {
      const res = await fetch(`/api/tenants/${tenantId}`)
      if (!res.ok) {
        if (res.status === 404) {
          setError('Арендатор не найден')
        } else {
          setError('Ошибка загрузки данных')
        }
        return
      }
      const data = await res.json()
      setTenant(data)
    } catch (err) {
      setError('Ошибка подключения к серверу')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Вы уверены что хотите удалить этого арендатора? Это действие необратимо.')) return
    
    setDeleting(true)
    try {
      const res = await fetch(`/api/tenants/${tenantId}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/tenants')
      } else {
        const data = await res.json()
        alert(data.error || 'Ошибка удаления')
      }
    } catch (err) {
      alert('Ошибка подключения')
    } finally {
      setDeleting(false)
    }
  }

  const statusConfig: Record<string, { label: string; color: string }> = {
    PENDING: { label: 'Ожидает', color: 'bg-yellow-100 text-yellow-800' },
    PENDING_CONFIRMATION: { label: 'На подтверждении', color: 'bg-blue-100 text-blue-800' },
    PAID: { label: 'Оплачено', color: 'bg-green-100 text-green-800' },
    OVERDUE: { label: 'Просрочено', color: 'bg-red-100 text-red-800' },
    REJECTED: { label: 'Отклонено', color: 'bg-orange-100 text-orange-800' },
    CANCELLED: { label: 'Отменено', color: 'bg-gray-100 text-gray-800' },
  }

  const contractStatusConfig: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Черновик', color: 'bg-gray-100 text-gray-800' },
    ACTIVE: { label: 'Активный', color: 'bg-green-100 text-green-800' },
    EXPIRED: { label: 'Истёк', color: 'bg-yellow-100 text-yellow-800' },
    TERMINATED: { label: 'Расторгнут', color: 'bg-red-100 text-red-800' },
  }

  const contractTypeConfig: Record<string, string> = {
    STANDARD: 'Обычный наём',
    OCCASIONAL: 'Наём okazjonalny',
    INSTITUTIONAL: 'Наём instytucjonalny',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !tenant) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">{error || 'Ошибка'}</h2>
        <Button variant="outline" onClick={() => router.push('/tenants')}>
          <ArrowLeft className="h-4 w-4 mr-2" />Назад к списку
        </Button>
      </div>
    )
  }

  const initials = `${tenant.firstName[0] || ''}${tenant.lastName[0] || ''}`.toUpperCase()
  
  // Подсчёт статистики платежей
  const totalPaid = tenant.payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0)
  const totalPending = tenant.payments.filter(p => p.status === 'PENDING' || p.status === 'OVERDUE').reduce((s, p) => s + p.amount, 0)

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/tenants')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Назад
        </Button>
      </div>

      {/* Profile card */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{tenant.firstName} {tenant.lastName}</h1>
              <Badge className={tenant.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                {tenant.isActive ? 'Активный' : 'Неактивный'}
              </Badge>
              {tenant.tenantUserId && (
                <Badge className="bg-blue-100 text-blue-800">Зарегистрирован</Badge>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-sm text-gray-600">
              {tenant.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400" />
                  {tenant.email}
                </div>
              )}
              {tenant.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  {tenant.phone}
                </div>
              )}
              {tenant.property && (
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-gray-400" />
                  {tenant.property.name}, {tenant.property.address}
                </div>
              )}
              {tenant.moveInDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  Заселение: {new Date(tenant.moveInDate).toLocaleDateString()}
                  {tenant.moveOutDate && ` — ${new Date(tenant.moveOutDate).toLocaleDateString()}`}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting}>
              <Trash2 className="h-4 w-4 mr-1" />{deleting ? 'Удаление...' : 'Удалить'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{totalPaid} zł</p>
          <p className="text-xs text-gray-500">Оплачено</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{totalPending} zł</p>
          <p className="text-xs text-gray-500">Ожидает</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{tenant.contracts.length}</p>
          <p className="text-xs text-gray-500">Договоров</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{tenant.payments.length}</p>
          <p className="text-xs text-gray-500">Платежей</p>
        </Card>
      </div>

      {/* Contracts */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-400" />
            Договоры
          </h2>
        </div>
        {tenant.contracts.length === 0 ? (
          <p className="text-gray-500 text-sm">Нет договоров</p>
        ) : (
          <div className="space-y-3">
            {tenant.contracts.map(contract => {
              const cStatus = contractStatusConfig[contract.status] || { label: contract.status, color: 'bg-gray-100 text-gray-800' }
              return (
                <div key={contract.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">{contractTypeConfig[contract.type] || contract.type}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(contract.startDate).toLocaleDateString()}
                      {contract.endDate ? ` — ${new Date(contract.endDate).toLocaleDateString()}` : ' — бессрочно'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{contract.rentAmount} zł</span>
                    <Badge className={cStatus.color}>{cStatus.label}</Badge>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Recent payments */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-gray-400" />
            Платежи
          </h2>
          <Link href={`/payments?tenant=${tenantId}`}>
            <Button variant="ghost" size="sm">Все платежи</Button>
          </Link>
        </div>
        {tenant.payments.length === 0 ? (
          <p className="text-gray-500 text-sm">Нет платежей</p>
        ) : (
          <div className="space-y-2">
            {tenant.payments.slice(0, 10).map(payment => {
              const pStatus = statusConfig[payment.status] || { label: payment.status, color: 'bg-gray-100 text-gray-800' }
              return (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{payment.period || '—'}</p>
                    <p className="text-xs text-gray-500">До: {new Date(payment.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold">{payment.amount} zł</span>
                    <Badge className={pStatus.color}>{pStatus.label}</Badge>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
