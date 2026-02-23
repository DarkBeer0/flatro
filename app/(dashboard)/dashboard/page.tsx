// app/(dashboard)/dashboard/page.tsx
// FIXED: Sequential fetch waterfall → Promise.all for parallel loading
// FIXED: auth/me and dashboard/stats fetched simultaneously
'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Building2, Users, CreditCard, AlertTriangle, TrendingUp, Home, Loader2, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import { useLocale } from '@/lib/i18n/context'

interface DashboardStats {
  properties: { total: number; occupied: number; vacant: number }
  tenants: { total: number; active: number }
  payments: { pending: number; overdue: number; pendingAmount: number; overdueAmount: number }
  contracts: { active: number; expiring: number }
  monthlyIncome: number
}

function DashboardContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const inviteAccepted = searchParams.get('invite_accepted')

  const { t } = useLocale()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showInviteSuccess, setShowInviteSuccess] = useState(false)

  useEffect(() => {
    if (inviteAccepted) {
      setShowInviteSuccess(true)
      router.replace('/dashboard', { scroll: false })
      setTimeout(() => setShowInviteSuccess(false), 5000)
    }
  }, [inviteAccepted, router])

  useEffect(() => {
    loadDashboard()
  }, [])

  async function loadDashboard() {
    try {
      // FIXED: Fetch both endpoints in parallel instead of sequentially
      const [meRes, statsRes] = await Promise.all([
        fetch('/api/auth/me'),
        fetch('/api/dashboard/stats'),
      ])

      // Process auth/me response
      if (meRes.ok) {
        const user = await meRes.json()
        // If user is only a tenant (no owner role) — redirect
        if (user.isTenant && !user.isOwner) {
          router.replace('/tenant/dashboard')
          return
        }
      }

      // Process stats response
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

  return (
    <div className="w-full space-y-6">
      {/* Invite success toast */}
      {showInviteSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="font-medium text-green-800">Invitation accepted!</p>
          </div>
        </div>
      )}

      {/* Page Title */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          {t.dashboard.title}
        </h1>
        <p className="text-gray-500 mt-1">{t.dashboard.welcome}</p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Properties */}
          <Card className="p-4 lg:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t.dashboard.properties}</p>
                <p className="text-2xl font-bold">{stats.properties.total}</p>
                <p className="text-xs text-gray-400">
                  {stats.properties.occupied} {t.dashboard.occupied} · {stats.properties.vacant} {t.dashboard.vacant}
                </p>
              </div>
            </div>
          </Card>

          {/* Tenants */}
          <Card className="p-4 lg:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t.dashboard.tenants}</p>
                <p className="text-2xl font-bold">{stats.tenants.active}</p>
                <p className="text-xs text-gray-400">{t.dashboard.activeTenants}</p>
              </div>
            </div>
          </Card>

          {/* Pending Payments */}
          <Card className="p-4 lg:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <CreditCard className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t.dashboard.pendingPayments}</p>
                <p className="text-2xl font-bold">{stats.payments.pending}</p>
                <p className="text-xs text-red-500">
                  {stats.payments.overdue} {t.dashboard.overdue}
                </p>
              </div>
            </div>
          </Card>

          {/* Monthly Income */}
          <Card className="p-4 lg:p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{t.dashboard.monthlyIncome}</p>
                <p className="text-2xl font-bold">
                  {stats.monthlyIncome.toLocaleString()} {t.common.currency}
                </p>
                <p className="text-xs text-gray-400">{t.dashboard.currentMonth}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-3">{t.dashboard.quickActions}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/properties/new">
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Home className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{t.dashboard.addProperty}</p>
                  <p className="text-sm text-gray-500">{t.dashboard.addPropertyDesc}</p>
                </div>
              </div>
            </Card>
          </Link>
          <Link href="/tenants/new">
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{t.dashboard.addTenant}</p>
                  <p className="text-sm text-gray-500">{t.dashboard.addTenantDesc}</p>
                </div>
              </div>
            </Card>
          </Link>
          <Link href="/payments/new">
            <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <CreditCard className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{t.dashboard.addPayment}</p>
                  <p className="text-sm text-gray-500">{t.dashboard.addPaymentDesc}</p>
                </div>
              </div>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}