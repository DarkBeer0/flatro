// app/(tenant)/layout.tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Users, CreditCard, MessageSquare, AlertTriangle, Settings, Building2,
     Menu, X, LogOut, Loader2, Gauge, FileText, ArrowRightLeft, Wallet, SquareStack, Receipt, BarChart2  }
      from 'lucide-react'
import { useLocale } from '@/lib/i18n/context'
import { LanguageSwitcher } from '@/components/language-switcher'
import { createClient } from '@/lib/supabase/client'
import { UnreadBadge } from '@/components/chat'

interface UserInfo {
  isOwner: boolean
  isTenant: boolean
}

function getCachedRoles(): UserInfo | null {
  try {
    const cached = localStorage.getItem('flatro_user_roles')
    if (cached) return JSON.parse(cached)
  } catch {}
  return null
}

function setCachedRoles(info: UserInfo) {
  try { localStorage.setItem('flatro_user_roles', JSON.stringify(info)) } catch {}
}

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(getCachedRoles)
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLocale()

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        if (!data.error) {
          const info = { isOwner: data.isOwner, isTenant: data.isTenant }
          setUserInfo(info)
          setCachedRoles(info)
        }
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchRoles()
    const handleRolesChanged = (e: CustomEvent<UserInfo>) => {
      setUserInfo(e.detail)
      setCachedRoles(e.detail)
    }
    window.addEventListener('roles-changed', handleRolesChanged as EventListener)
    return () => window.removeEventListener('roles-changed', handleRolesChanged as EventListener)
  }, [fetchRoles])

  const isDualRole = userInfo?.isOwner && userInfo?.isTenant

  // === ЕДИНЫЙ ПОРЯДОК: Владелец → Арендатор (всегда, идентично dashboard layout) ===
  const ownerNavItems = [
    { href: '/dashboard', icon: Gauge, label: t.nav?.dashboard || 'Главная' },
    { href: '/properties', icon: Home, label: t.nav?.properties || 'Недвижимость' },
    { href: '/tenants', icon: Users, label: t.nav?.tenants || 'Арендаторы' },
    { href: '/payments', icon: CreditCard, label: t.nav?.payments || 'Платежи' },
    { href: '/contracts', icon: FileText, label: t.nav?.contracts || 'Договоры' },
    { href: '/messages', icon: MessageSquare, label: t.nav?.messages || 'Сообщения' },
    { href: '/issues', icon: AlertTriangle, label: 'Zgłoszenia' },
    { href: '/billing',    icon: Receipt,      label: 'Faktury' },
    { href: '/analytics', icon: BarChart2, label: 'Analityka' },
  ]

  const tenantNavItems = [
    { href: '/tenant/dashboard', icon: Home, label: 'Моё жильё' },
    { href: '/tenant/meters', icon: SquareStack, label: 'Liczniki' },
    { href: '/tenant/balance', icon: Wallet, label: 'Moje media' },
    { href: '/tenant/contracts', icon: FileText, label: 'Umowy' },
    { href: '/tenant/payments', icon: CreditCard, label: 'Мои платежи' },
    { href: '/tenant/messages', icon: MessageSquare, label: 'Сообщения' },
    { href: '/tenant/issues', icon: AlertTriangle, label: 'Zgłoszenia' },
  ]

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    if (href === '/tenant/dashboard') return pathname === '/tenant/dashboard'
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try {
      localStorage.removeItem('pendingInviteCode')
      localStorage.removeItem('flatro_user_roles')
    } catch {}
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  // Для не-dual-role (только арендатор) — простой сайдбар
  const renderSingleTenantSidebar = () => (
    <>
      {tenantNavItems.map((item) => {
        const Icon = item.icon
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              active ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Icon className={`h-5 w-5 ${active ? 'text-green-600' : ''}`} />
            <span className="flex-1">{item.label}</span>
            {item.href === '/tenant/messages' && <UnreadBadge />}
          </Link>
        )
      })}
      <div className="pt-4 mt-4 border-t">
        <Link
          href="/settings"
          onClick={() => setSidebarOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
            pathname.startsWith('/settings') ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Settings className={`h-5 w-5 ${pathname.startsWith('/settings') ? 'text-green-600' : ''}`} />
          <span>Настройки</span>
        </Link>
      </div>
    </>
  )

  // Для dual-role — ИДЕНТИЧНЫЙ порядок как в dashboard layout
  const renderDualRoleSidebar = () => (
    <>
      {/* Владелец — ВСЕГДА первый */}
      <div className="px-3 pt-1 pb-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-500">Владелец</span>
      </div>

      {ownerNavItems.map((item) => {
        const Icon = item.icon
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              active ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Icon className={`h-5 w-5 ${active ? 'text-blue-600' : ''}`} />
            <span className="flex-1">{item.label}</span>
            {item.href === '/messages' && <UnreadBadge />}
          </Link>
        )
      })}

      {/* Арендатор — ВСЕГДА второй */}
      <div className="pt-4 mt-3 border-t border-gray-200">
        <div className="px-3 pt-1 pb-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-green-500">Арендатор</span>
        </div>
      </div>
      {tenantNavItems.map((item) => {
        const Icon = item.icon
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              active ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Icon className={`h-5 w-5 ${active ? 'text-green-600' : ''}`} />
            <span className="flex-1">{item.label}</span>
            {item.href === '/tenant/messages' && <UnreadBadge />}
          </Link>
        )
      })}

      {/* Настройки */}
      <div className="pt-4 mt-4 border-t">
        <Link
          href="/settings"
          onClick={() => setSidebarOpen(false)}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
            pathname.startsWith('/settings') ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Settings className={`h-5 w-5 ${pathname.startsWith('/settings') ? 'text-blue-600' : ''}`} />
          <span>Настройки</span>
        </Link>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-16 px-4">
          <Link href={isDualRole ? '/dashboard' : '/tenant/dashboard'} className="flex items-center gap-2">
            <Building2 className={`h-8 w-8 ${isDualRole ? 'text-blue-600' : 'text-green-600'}`} />
            <span className="text-xl font-bold text-gray-900">Flatro</span>
          </Link>
          <button onClick={() => setSidebarOpen(true)} className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </div>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`
        fixed top-0 left-0 z-50 h-screen w-72 bg-white border-r border-gray-200
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:w-64
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex h-16 items-center justify-between border-b px-4 lg:px-6">
          <Link href={isDualRole ? '/dashboard' : '/tenant/dashboard'} className="flex items-center gap-2">
            <Building2 className={`h-8 w-8 ${isDualRole ? 'text-blue-600' : 'text-green-600'}`} />
            <div>
              <span className="text-xl font-bold text-gray-900">Flatro</span>
              {!isDualRole && (
                <span className="text-xs text-green-600 block -mt-1">Кабинет жильца</span>
              )}
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex flex-col h-[calc(100vh-4rem)]">
          <div className="flex-1 p-4 space-y-1 overflow-y-auto">
            {isDualRole ? renderDualRoleSidebar() : renderSingleTenantSidebar()}
          </div>

          <div className="p-4 border-t space-y-2">
            {isDualRole && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg mb-1">
                <ArrowRightLeft className="h-4 w-4 text-gray-500" />
                <span className="text-xs text-gray-600">Владелец + Арендатор</span>
              </div>
            )}
            <LanguageSwitcher />
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-red-600 hover:bg-red-50 w-full"
            >
              {loggingOut ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
              <span>Выйти</span>
            </button>
          </div>
        </nav>
      </aside>

      <div className="lg:pl-64">
        <div className="h-16 lg:hidden" />
        <main className="p-4 sm:p-6 lg:p-8 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}