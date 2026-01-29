// app/(dashboard)/dashboard/page.tsx
'use client'

import { useEffect, useState } from 'react'
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
  const { t } = useLocale()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/dashboard/stats')
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

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
      <div className="mb-6 lg:mb-8">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{t.dashboard.title}</h1>
        <p className="text-gray-500 mt-1 text-sm lg:text-base">{t.dashboard.welcome}</p>
      </div>

      {/* Stats - 2x2 mobile, 4x1 desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6 mb-6 lg:mb-8">
        <StatCard
          title={t.dashboard.properties}
          value={data.properties.total}
          subtitle={`${data.properties.occupied} ${t.dashboard.occupied}, ${data.properties.vacant} ${t.dashboard.vacant}`}
          icon={<Building2 className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600" />}
          color="blue"
        />
        <StatCard
          title={t.dashboard.tenants}
          value={data.tenants.total}
          subtitle={`${data.tenants.active} ${t.dashboard.activeTenants}`}
          icon={<Users className="h-5 w-5 lg:h-6 lg:w-6 text-green-600" />}
          color="green"
        />
        <StatCard
          title={t.dashboard.pendingPayments}
          value={data.payments.pending}
          subtitle={`${data.payments.overdue} ${t.dashboard.overdue}`}
          icon={<CreditCard className="h-5 w-5 lg:h-6 lg:w-6 text-yellow-600" />}
          color="yellow"
        />
        <StatCard
          title={t.dashboard.monthlyIncome}
          value={`${data.monthlyIncome.toLocaleString()} ${t.common.currency}`}
          subtitle={t.dashboard.currentMonth}
          icon={<TrendingUp className="h-5 w-5 lg:h-6 lg:w-6 text-purple-600" />}
          color="purple"
        />
      </div>

      {/* Quick Actions & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <Card className="p-4 lg:p-6">
          <h2 className="text-lg font-semibold mb-4">{t.dashboard.quickActions}</h2>
          <div className="space-y-2 lg:space-y-3">
            <QuickAction href="/properties/new" icon={<Home className="h-5 w-5" />} title={t.dashboard.addProperty} description={t.dashboard.addPropertyDesc} />
            <QuickAction href="/tenants/new" icon={<Users className="h-5 w-5" />} title={t.dashboard.addTenant} description={t.dashboard.addTenantDesc} />
            <QuickAction href="/payments/new" icon={<CreditCard className="h-5 w-5" />} title={t.dashboard.addPayment} description={t.dashboard.addPaymentDesc} />
          </div>
        </Card>

        <Card className="p-4 lg:p-6">
          <h2 className="text-lg font-semibold mb-4">{t.dashboard.recentActivity}</h2>
          {data.properties.total === 0 ? (
            <div className="text-gray-500 text-center py-6 lg:py-8">
              <AlertTriangle className="h-10 w-10 lg:h-12 lg:w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium">{t.dashboard.noActivity}</p>
              <p className="text-sm mt-1">{t.dashboard.noActivityDesc}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.contracts.expiring > 0 && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ {data.contracts.expiring} {t.contracts.expiringAlertDesc}
                  </p>
                </div>
              )}
              {data.payments.overdue > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    🔴 {data.payments.overdue} платежей просрочено на сумму {data.payments.overdueAmount} {t.common.currency}
                  </p>
                </div>
              )}
              {data.payments.pending > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    💰 {data.payments.pending} платежей ожидают оплаты
                  </p>
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
  title: string; value: string | number; subtitle: string; icon: React.ReactNode; color: 'blue' | 'green' | 'yellow' | 'purple'
}) {
  const bgColors = { blue: 'bg-blue-50', green: 'bg-green-50', yellow: 'bg-yellow-50', purple: 'bg-purple-50' }
  return (
    <Card className="p-3 lg:p-6">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-xs lg:text-sm text-gray-500 truncate">{title}</p>
          <p className="text-lg lg:text-2xl font-bold mt-1 truncate">{value}</p>
          <p className="text-xs lg:text-sm text-gray-400 mt-1 truncate">{subtitle}</p>
        </div>
        <div className={`p-2 lg:p-3 rounded-full ${bgColors[color]} flex-shrink-0 ml-2`}>{icon}</div>
      </div>
    </Card>
  )
}

function QuickAction({ href, icon, title, description }: { href: string; icon: React.ReactNode; title: string; description: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 lg:gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
      <div className="p-2 bg-blue-100 rounded-lg text-blue-600 flex-shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500 truncate">{description}</p>
      </div>
    </Link>
  )
}
