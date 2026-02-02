// app/(tenant)/layout.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home, Users, CreditCard, MessageSquare, AlertTriangle, Settings, Building2,
  Menu, X, LogOut, Loader2, Gauge, FileText, ArrowRightLeft
} from 'lucide-react'
import { useLocale } from '@/lib/i18n/context'
import { LanguageSwitcher } from '@/components/language-switcher'
import { createClient } from '@/lib/supabase/client'

interface UserInfo {
  isOwner: boolean
  isTenant: boolean
}

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLocale()

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && !data.error) {
          setUserInfo({ isOwner: data.isOwner, isTenant: data.isTenant })
        }
      })
      .catch(() => {})
  }, [])

  const isDualRole = userInfo?.isOwner && userInfo?.isTenant

  const tenantNavItems = [
    { href: '/tenant/dashboard', icon: Home, label: 'Главная' },
    { href: '/tenant/payments', icon: CreditCard, label: 'Мои платежи' },
    { href: '/tenant/messages', icon: MessageSquare, label: 'Сообщения' },
    { href: '/tenant/tickets', icon: AlertTriangle, label: 'Заявки' },
  ]

  const ownerNavItems = [
    { href: '/dashboard', icon: Gauge, label: t.nav?.dashboard || 'Главная' },
    { href: '/properties', icon: Home, label: t.nav?.properties || 'Недвижимость' },
    { href: '/tenants', icon: Users, label: t.nav?.tenants || 'Арендаторы' },
    { href: '/payments', icon: CreditCard, label: t.nav?.payments || 'Платежи' },
    { href: '/contracts', icon: FileText, label: t.nav?.contracts || 'Договоры' },
  ]

  const isActive = (href: string) => {
    if (href === '/tenant/dashboard') return pathname === '/tenant/dashboard'
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    setLoggingOut(true)
    try { localStorage.removeItem('pendingInviteCode') } catch {}
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="flex items-center justify-between h-16 px-4">
          <Link href="/tenant/dashboard" className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-green-600" />
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

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-screen w-72 bg-white border-r border-gray-200
        transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:w-64
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex h-16 items-center justify-between border-b px-4 lg:px-6">
          <Link href="/tenant/dashboard" className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-green-600" />
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

            {isDualRole && (
              <div className="px-3 pt-1 pb-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-green-500">Арендатор</span>
              </div>
            )}

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
                  <span>{item.label}</span>
                </Link>
              )
            })}

            {/* Owner section (dual role only) */}
            {isDualRole && (
              <>
                <div className="pt-4 mt-3 border-t border-gray-200">
                  <div className="px-3 pt-1 pb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-500">Владелец</span>
                  </div>
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
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </>
            )}

            {/* Единые настройки — одна кнопка ведёт на /settings */}
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
          </div>

          <div className="p-4 border-t space-y-2">
            {isDualRole && (
              <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg mb-1">
                <ArrowRightLeft className="h-4 w-4 text-gray-500" />
                <span className="text-xs text-gray-600">Арендатор + Владелец</span>
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