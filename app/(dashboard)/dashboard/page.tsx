// app/(dashboard)/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Building2, Users, CreditCard, AlertTriangle, TrendingUp, Home, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useLocale } from '@/lib/i18n/context'

interface DashboardStats {
  properties: { total: number; occupied: number; vacant: number }
  tenants: { total: number; active: number }
  payments: { pending: number; overdue: number; pendingAmount: number; overdueAmount: number }
  contracts: { active: number; expiring: number }
  monthlyIncome: number
}

export default function DashboardPage() {
  const router = useRouter()
  const { t } = useLocale()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkRoleAndLoadStats()
  }, [])

  async function checkRoleAndLoadStats() {
    try {
      // Проверяем роль
      const meRes = await fetch('/api/auth/me')
      if (meRes.ok) {
        const user = await meRes.json()
        
        // Если жилец — редирект
        if (user.role === 'TENANT') {
          router.replace('/tenant/dashboard')
          return
        }
      }

      // Загружаем статистику для владельца
      const statsRes = await fetch('/api/dashboard/stats')
      if (statsRes.ok) {
        setStats(await statsRes.json())
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const data = stats || {
    properties: { total: 0, occupied: 0, vacant: 0 },
    tenants: { total: 0, active: 0 },
    payments: { pending: 0, overdue: 0, pendingAmount: 0, overdueAmount: 0 },
    contracts: { active: 0, expiring: 0 },
    monthlyIncome: 0,
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{t.dashboard.title}</h1>
        <p className="text-gray-500 mt-1">{t.dashboard.welcome}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6">
        <StatCard
          title={t.dashboard.properties}
          value={data.properties.total}
          subtitle={`${data.properties.occupied} ${t.dashboard.occupied}, ${data.properties.vacant} ${t.dashboard.vacant}`}
          icon={<Building2 className="h-5 w-5 text-blue-600" />}
          color="blue"
        />
        <StatCard
          title={t.dashboard.tenants}
          value={data.tenants.total}
          subtitle={`${data.tenants.active} ${t.dashboard.activeTenants}`}
          icon={<Users className="h-5 w-5 text-green-600" />}
          color="green"
        />
        <StatCard
          title={t.dashboard.pendingPayments}
          value={data.payments.pending}
          subtitle={`${data.payments.overdue} ${t.dashboard.overdue}`}
          icon={<CreditCard className="h-5 w-5 text-yellow-600" />}
          color="yellow"
        />
        <StatCard
          title={t.dashboard.monthlyIncome}
          value={`${data.monthlyIncome.toLocaleString()} ${t.common.currency}`}
          subtitle={t.dashboard.currentMonth}
          icon={<TrendingUp className="h-5 w-5 text-purple-600" />}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <Card className="p-4 lg:p-6">
          <h2 className="text-lg font-semibold mb-4">{t.dashboard.quickActions}</h2>
          <div className="space-y-2">
            <QuickAction href="/properties/new" icon={<Home className="h-5 w-5" />} title={t.dashboard.addProperty} description={t.dashboard.addPropertyDesc} />
            <QuickAction href="/tenants/new" icon={<Users className="h-5 w-5" />} title={t.dashboard.addTenant} description={t.dashboard.addTenantDesc} />
            <QuickAction href="/payments/new" icon={<CreditCard className="h-5 w-5" />} title={t.dashboard.addPayment} description={t.dashboard.addPaymentDesc} />
          </div>
        </Card>

        <Card className="p-4 lg:p-6">
          <h2 className="text-lg font-semibold mb-4">{t.dashboard.recentActivity}</h2>
          {data.properties.total === 0 ? (
            <div className="text-center py-6">
              <AlertTriangle className="h-10 w-10 mx-auto text-gray-300 mb-3" />
              <p className="font-medium text-gray-500">{t.dashboard.noActivity}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.contracts.expiring > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                  ⚠️ {data.contracts.expiring} договоров истекают
                </div>
              )}
              {data.payments.overdue > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                  🔴 {data.payments.overdue} просроченных платежей
                </div>
              )}
              {data.payments.pending > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                  💰 {data.payments.pending} ожидают оплаты
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function StatCard({ title, value, subtitle, icon, color }: {
  title: string; value: string | number; subtitle: string; icon: React.ReactNode
  color: 'blue' | 'green' | 'yellow' | 'purple'
}) {
  const bg = { blue: 'bg-blue-50', green: 'bg-green-50', yellow: 'bg-yellow-50', purple: 'bg-purple-50' }
  return (
    <Card className="p-3 lg:p-6">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs lg:text-sm text-gray-500 truncate">{title}</p>
          <p className="text-lg lg:text-2xl font-bold mt-1">{value}</p>
          <p className="text-xs text-gray-400 truncate">{subtitle}</p>
        </div>
        <div className={`p-2 rounded-full ${bg[color]} flex-shrink-0 ml-2`}>{icon}</div>
      </div>
    </Card>
  )
}

function QuickAction({ href, icon, title, description }: {
  href: string; icon: React.ReactNode; title: string; description: string
}) {
  return (
    <Link href={href} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100">
      <div className="p-2 bg-blue-100 rounded-lg text-blue-600">{icon}</div>
      <div>
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </Link>
  )
}
