import { Card } from '@/components/ui/card'
import { Building2, Users, CreditCard, AlertTriangle, TrendingUp, Home } from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const stats = {
    totalProperties: 0,
    occupiedProperties: 0,
    vacantProperties: 0,
    totalTenants: 0,
    pendingPayments: 0,
    overduePayments: 0,
    monthlyIncome: 0,
  }

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Witaj w Flatro! Zarzadzaj swoimi nieruchomosciami.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Nieruchomosci"
          value={stats.totalProperties}
          subtitle={`${stats.occupiedProperties} zajetych, ${stats.vacantProperties} wolnych`}
          icon={<Building2 className="h-6 w-6 text-blue-600" />}
          color="blue"
        />
        <StatCard
          title="Najemcy"
          value={stats.totalTenants}
          subtitle="Aktywnych najemcow"
          icon={<Users className="h-6 w-6 text-green-600" />}
          color="green"
        />
        <StatCard
          title="Oczekujace platnosci"
          value={stats.pendingPayments}
          subtitle={`${stats.overduePayments} zaleglych`}
          icon={<CreditCard className="h-6 w-6 text-yellow-600" />}
          color="yellow"
        />
        <StatCard
          title="Przychod miesieczny"
          value={`${stats.monthlyIncome.toLocaleString()} zl`}
          subtitle="Biezacy miesiac"
          icon={<TrendingUp className="h-6 w-6 text-purple-600" />}
          color="purple"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Szybkie akcje</h2>
          <div className="space-y-3">
            <QuickAction
              href="/properties/new"
              icon={<Home className="h-5 w-5" />}
              title="Dodaj nieruchomosc"
              description="Dodaj nowe mieszkanie lub dom"
            />
            <QuickAction
              href="/tenants/new"
              icon={<Users className="h-5 w-5" />}
              title="Dodaj najemce"
              description="Zarejestruj nowego najemce"
            />
            <QuickAction
              href="/payments/new"
              icon={<CreditCard className="h-5 w-5" />}
              title="Dodaj platnosc"
              description="Zarejestruj otrzymana platnosc"
            />
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Ostatnie aktywnosci</h2>
          <div className="text-gray-500 text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Brak aktywnosci</p>
            <p className="text-sm">Dodaj pierwsza nieruchomosc, aby rozpoczac</p>
          </div>
        </Card>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  color,
}: {
  title: string
  value: string | number
  subtitle: string
  icon: React.ReactNode
  color: 'blue' | 'green' | 'yellow' | 'purple'
}) {
  const bgColors = {
    blue: 'bg-blue-50',
    green: 'bg-green-50',
    yellow: 'bg-yellow-50',
    purple: 'bg-purple-50',
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
        </div>
        <div className={`p-3 rounded-full ${bgColors[color]} flex-shrink-0 ml-4`}>
          {icon}
        </div>
      </div>
    </Card>
  )
}

function QuickAction({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
    >
      <div className="p-2 bg-blue-100 rounded-lg text-blue-600 flex-shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-medium text-gray-900">{title}</p>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
    </Link>
  )
}