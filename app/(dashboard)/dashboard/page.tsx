// src/app/(dashboard)/dashboard/page.tsx
'use client'

import { Card } from '@/components/ui/card'
import { Building2, Users, CreditCard, AlertTriangle, TrendingUp, Home } from 'lucide-react'
import Link from 'next/link'
import { useLocale } from '@/lib/i18n/context'

export default function DashboardPage() {
  const { t } = useLocale()

  const stats = {
    totalProperties: 3,
    occupiedProperties: 2,
    vacantProperties: 1,
    totalTenants: 2,
    pendingPayments: 1,
    overduePayments: 1,
    monthlyIncome: 7700,
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
          value={stats.totalProperties}
          subtitle={`${stats.occupiedProperties} ${t.dashboard.occupied}, ${stats.vacantProperties} ${t.dashboard.vacant}`}
          icon={<Building2 className="h-5 w-5 lg:h-6 lg:w-6 text-blue-600" />}
          color="blue"
        />
        <StatCard
          title={t.dashboard.tenants}
          value={stats.totalTenants}
          subtitle={t.dashboard.activeTenants}
          icon={<Users className="h-5 w-5 lg:h-6 lg:w-6 text-green-600" />}
          color="green"
        />
        <StatCard
          title={t.dashboard.pendingPayments}
          value={stats.pendingPayments}
          subtitle={`${stats.overduePayments} ${t.dashboard.overdue}`}
          icon={<CreditCard className="h-5 w-5 lg:h-6 lg:w-6 text-yellow-600" />}
          color="yellow"
        />
        <StatCard
          title={t.dashboard.monthlyIncome}
          value={`${stats.monthlyIncome.toLocaleString()} ${t.common.currency}`}
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
          <div className="text-gray-500 text-center py-6 lg:py-8">
            <AlertTriangle className="h-10 w-10 lg:h-12 lg:w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">{t.dashboard.noActivity}</p>
            <p className="text-sm mt-1">{t.dashboard.noActivityDesc}</p>
          </div>
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
