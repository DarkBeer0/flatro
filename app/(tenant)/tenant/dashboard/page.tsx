// app/(tenant)/tenant/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Home, CreditCard, MessageSquare, AlertTriangle, MapPin, Loader2, Clock, CheckCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface TenantData {
  property: {
    id: string
    name: string
    address: string
    city: string
    rooms: number | null
    area: number | null
    owner: {
      name: string | null
      email: string
      phone: string | null
    }
  } | null
  payments: {
    pending: number
    pendingAmount: number
    overdue: number
    overdueAmount: number
  }
  unreadMessages: number
  openTickets: number
}

export default function TenantDashboardPage() {
  const [data, setData] = useState<TenantData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const res = await fetch('/api/tenant/dashboard')
      if (res.ok) {
        const result = await res.json()
        setData(result)
      }
    } catch (error) {
      console.error('Error fetching tenant data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (!data?.property) {
    return (
      <div className="text-center py-12">
        <Home className="h-12 w-12 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Нет привязанной квартиры</h2>
        <p className="text-gray-500">Попросите владельца отправить вам приглашение</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Добро пожаловать!</h1>
        <p className="text-gray-500 mt-1">Ваш личный кабинет жильца</p>
      </div>

      {/* Property Info */}
      <Card className="p-4 lg:p-6 mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-white rounded-lg shadow-sm">
            <Home className="h-6 w-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-900">{data.property.name}</h2>
            <p className="text-gray-600 flex items-center gap-1 mt-1">
              <MapPin className="h-4 w-4" />
              {data.property.address}, {data.property.city}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {data.property.rooms && (
                <Badge variant="secondary">{data.property.rooms} комн.</Badge>
              )}
              {data.property.area && (
                <Badge variant="secondary">{data.property.area} м²</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Owner contact */}
        <div className="mt-4 pt-4 border-t border-green-200">
          <p className="text-sm text-gray-500 mb-1">Владелец:</p>
          <p className="font-medium">{data.property.owner.name || 'Не указано'}</p>
          <p className="text-sm text-gray-600">{data.property.owner.email}</p>
          {data.property.owner.phone && (
            <p className="text-sm text-gray-600">{data.property.owner.phone}</p>
          )}
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-6">
        <StatCard
          title="Ожидают оплаты"
          value={data.payments.pending}
          subtitle={`${data.payments.pendingAmount} zł`}
          icon={<Clock className="h-5 w-5 text-yellow-600" />}
          color="yellow"
        />
        <StatCard
          title="Просрочено"
          value={data.payments.overdue}
          subtitle={`${data.payments.overdueAmount} zł`}
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
          color="red"
        />
        <StatCard
          title="Сообщения"
          value={data.unreadMessages}
          subtitle="непрочитанных"
          icon={<MessageSquare className="h-5 w-5 text-blue-600" />}
          color="blue"
        />
        <StatCard
          title="Заявки"
          value={data.openTickets}
          subtitle="открытых"
          icon={<AlertTriangle className="h-5 w-5 text-purple-600" />}
          color="purple"
        />
      </div>

      {/* Quick Actions */}
      <Card className="p-4 lg:p-6">
        <h3 className="font-semibold mb-4">Быстрые действия</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href="/tenant/payments">
            <Button variant="outline" className="w-full justify-start h-auto py-3">
              <CreditCard className="h-5 w-5 mr-3 text-green-600" />
              <div className="text-left">
                <p className="font-medium">Мои платежи</p>
                <p className="text-xs text-gray-500">Просмотр и оплата</p>
              </div>
            </Button>
          </Link>
          
          <Link href="/tenant/messages">
            <Button variant="outline" className="w-full justify-start h-auto py-3">
              <MessageSquare className="h-5 w-5 mr-3 text-blue-600" />
              <div className="text-left">
                <p className="font-medium">Написать владельцу</p>
                <p className="text-xs text-gray-500">Отправить сообщение</p>
              </div>
            </Button>
          </Link>
          
          <Link href="/tenant/tickets/new">
            <Button variant="outline" className="w-full justify-start h-auto py-3">
              <AlertTriangle className="h-5 w-5 mr-3 text-orange-600" />
              <div className="text-left">
                <p className="font-medium">Сообщить о проблеме</p>
                <p className="text-xs text-gray-500">Создать заявку</p>
              </div>
            </Button>
          </Link>
        </div>
      </Card>

      {/* Alerts */}
      {(data.payments.overdue > 0 || data.payments.pending > 0) && (
        <Card className="p-4 mt-4 border-yellow-200 bg-yellow-50">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-800">Требуется внимание</p>
              {data.payments.overdue > 0 && (
                <p className="text-sm text-yellow-700">
                  У вас {data.payments.overdue} просроченных платежей на сумму {data.payments.overdueAmount} zł
                </p>
              )}
              {data.payments.pending > 0 && (
                <p className="text-sm text-yellow-700">
                  {data.payments.pending} платежей ожидают оплаты
                </p>
              )}
              <Link href="/tenant/payments">
                <Button size="sm" className="mt-2">
                  Перейти к платежам
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}

function StatCard({ title, value, subtitle, icon, color }: {
  title: string
  value: number | string
  subtitle: string
  icon: React.ReactNode
  color: 'yellow' | 'red' | 'blue' | 'purple'
}) {
  const bgColors = {
    yellow: 'bg-yellow-50',
    red: 'bg-red-50',
    blue: 'bg-blue-50',
    purple: 'bg-purple-50',
  }

  return (
    <Card className="p-3 lg:p-4">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs lg:text-sm text-gray-500 truncate">{title}</p>
          <p className="text-xl lg:text-2xl font-bold mt-1">{value}</p>
          <p className="text-xs text-gray-400 truncate">{subtitle}</p>
        </div>
        <div className={`p-2 rounded-full ${bgColors[color]} flex-shrink-0 ml-2`}>
          {icon}
        </div>
      </div>
    </Card>
  )
}
