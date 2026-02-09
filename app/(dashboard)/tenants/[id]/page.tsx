// app/(dashboard)/tenants/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Mail, Phone, Home, Calendar, FileText, CreditCard,
  Loader2, AlertCircle, Trash2, Shield, UserCheck, Clock,
  PhoneCall, Globe, MessageSquare
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface TenantDetail {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  nationalId: string | null
  nationalIdType: string | null
  pesel: string | null
  regionCode: string
  emergencyContact: string | null
  emergencyPhone: string | null
  moveInDate: string | null
  moveOutDate: string | null
  isActive: boolean
  tenantUserId: string | null
  termsAcceptedAt: string | null
  registrationCompletedAt: string | null
  createdAt: string
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
    depositAmount: number | null
    paymentDay: number
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

const regionNames: Record<string, string> = {
  PL: '🇵🇱 Польша',
  UA: '🇺🇦 Украина',
  DE: '🇩🇪 Германия',
  CZ: '🇨🇿 Чехия',
  SK: '🇸🇰 Словакия',
  LT: '🇱🇹 Литва',
  LV: '🇱🇻 Латвия',
  EE: '🇪🇪 Эстония',
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

  const paymentTypeConfig: Record<string, string> = {
    RENT: 'Аренда',
    UTILITIES: 'Коммунальные',
    DEPOSIT: 'Депозит',
    OTHER: 'Другое',
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
  
  // Статистика платежей
  const totalPaid = tenant.payments.filter(p => p.status === 'PAID').reduce((s, p) => s + p.amount, 0)
  const totalPending = tenant.payments.filter(p => p.status === 'PENDING' || p.status === 'OVERDUE').reduce((s, p) => s + p.amount, 0)
  const activeContract = tenant.contracts.find(c => c.status === 'ACTIVE')

  // Длительность проживания
  const moveInDate = tenant.moveInDate ? new Date(tenant.moveInDate) : null
  const daysLiving = moveInDate ? Math.floor((Date.now() - moveInDate.getTime()) / (1000 * 60 * 60 * 24)) : null

  // Национальный ID (с учётом legacy pesel)
  const nationalIdValue = tenant.nationalId || tenant.pesel
  const nationalIdLabel = tenant.nationalIdType || (tenant.pesel ? 'PESEL' : null)

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/tenants')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Назад
        </Button>
      </div>

      {/* ==================== Profile Card ==================== */}
      <Card className="p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl flex-shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-gray-900">{tenant.firstName} {tenant.lastName}</h1>
              <Badge className={tenant.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                {tenant.isActive ? 'Активный' : 'Неактивный'}
              </Badge>
              {tenant.tenantUserId && (
                <Badge className="bg-blue-100 text-blue-800">Зарегистрирован</Badge>
              )}
            </div>

            {/* Контактные данные */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4 text-sm text-gray-600">
              {tenant.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <a href={`mailto:${tenant.email}`} className="hover:text-blue-600 truncate">{tenant.email}</a>
                </div>
              )}
              {tenant.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <a href={`tel:${tenant.phone}`} className="hover:text-blue-600">{tenant.phone}</a>
                </div>
              )}
              {tenant.property && (
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <Link href={`/properties/${tenant.property.id}`} className="hover:text-blue-600 truncate">
                    {tenant.property.name}, {tenant.property.address}
                  </Link>
                </div>
              )}
              {tenant.moveInDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span>
                    Заселение: {new Date(tenant.moveInDate).toLocaleDateString()}
                    {tenant.moveOutDate && ` — ${new Date(tenant.moveOutDate).toLocaleDateString()}`}
                    {daysLiving !== null && tenant.isActive && (
                      <span className="text-gray-400 ml-1">({daysLiving} дн.)</span>
                    )}
                  </span>
                </div>
              )}
              {regionNames[tenant.regionCode] && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span>{regionNames[tenant.regionCode]}</span>
                </div>
              )}
              {nationalIdValue && (
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span>{nationalIdLabel}: {nationalIdValue}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 flex-shrink-0">
            {tenant.property && (
              <Link href={`/messages?property=${tenant.property.id}`}>
                <Button variant="outline" size="sm">
                  <MessageSquare className="h-4 w-4 mr-1" />Чат
                </Button>
              </Link>
            )}
            <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting} className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="h-4 w-4 mr-1" />{deleting ? '...' : 'Удалить'}
            </Button>
          </div>
        </div>
      </Card>

      {/* ==================== Emergency Contact ==================== */}
      {(tenant.emergencyContact || tenant.emergencyPhone) && (
        <Card className="p-4 mb-6 border-orange-200 bg-orange-50">
          <div className="flex items-center gap-2 mb-2">
            <PhoneCall className="h-5 w-5 text-orange-600" />
            <h3 className="font-semibold text-gray-900">Экстренный контакт</h3>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            {tenant.emergencyContact && (
              <span className="text-gray-700">{tenant.emergencyContact}</span>
            )}
            {tenant.emergencyPhone && (
              <a href={`tel:${tenant.emergencyPhone}`} className="text-blue-600 hover:underline">
                {tenant.emergencyPhone}
              </a>
            )}
          </div>
        </Card>
      )}

      {/* ==================== Stats ==================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{totalPaid.toLocaleString()} zł</p>
          <p className="text-xs text-gray-500">Оплачено</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-yellow-600">{totalPending.toLocaleString()} zł</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* ==================== Contracts ==================== */}
        <Card className="p-6">
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
                  <div key={contract.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{contractTypeConfig[contract.type] || contract.type}</span>
                      <Badge className={cStatus.color}>{cStatus.label}</Badge>
                    </div>
                    <p className="text-sm text-gray-500">
                      {new Date(contract.startDate).toLocaleDateString()}
                      {contract.endDate ? ` — ${new Date(contract.endDate).toLocaleDateString()}` : ' — бессрочно'}
                    </p>
                    <div className="flex gap-4 mt-1 text-sm">
                      <span className="font-semibold">{contract.rentAmount} zł/мес</span>
                      {contract.depositAmount && (
                        <span className="text-gray-500">Депозит: {contract.depositAmount} zł</span>
                      )}
                      <span className="text-gray-500">Оплата до {contract.paymentDay}-го</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* ==================== Registration Info ==================== */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-gray-400" />
              Регистрация
            </h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-500">Добавлен в систему</span>
              <span className="font-medium">{new Date(tenant.createdAt).toLocaleDateString()}</span>
            </div>
            {tenant.registrationCompletedAt && (
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-500">Регистрация завершена</span>
                <span className="font-medium">{new Date(tenant.registrationCompletedAt).toLocaleDateString()}</span>
              </div>
            )}
            {tenant.termsAcceptedAt && (
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-500">Соглашение принято</span>
                <span className="font-medium">{new Date(tenant.termsAcceptedAt).toLocaleDateString()}</span>
              </div>
            )}
            <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-gray-500">Аккаунт</span>
              <span className="font-medium">{tenant.tenantUserId ? 'Зарегистрирован' : 'Не зарегистрирован'}</span>
            </div>
            {activeContract && (
              <div className="flex justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-gray-500">Активный договор</span>
                <span className="font-medium text-green-700">{activeContract.rentAmount} zł/мес</span>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ==================== Recent Payments ==================== */}
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
                    <p className="font-medium text-sm">
                      {paymentTypeConfig[payment.type] || payment.type}
                      {payment.period && <span className="text-gray-400 ml-1">• {payment.period}</span>}
                    </p>
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