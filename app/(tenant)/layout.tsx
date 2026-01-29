// app/(tenant)/layout.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Home, CreditCard, MessageSquare, AlertTriangle, Settings, Building2, Menu, X, LogOut, Loader2 } from 'lucide-react'
import { useLocale } from '@/lib/i18n/context'
import { createClient } from '@/lib/supabase/client'

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const { t } = useLocale()

  const navItems = [
    { href: '/tenant/dashboard', icon: Home, label: 'Главная' },
    { href: '/tenant/payments', icon: CreditCard, label: 'Мои платежи' },
    { href: '/tenant/messages', icon: MessageSquare, label: 'Сообщения' },
    { href: '/tenant/tickets', icon: AlertTriangle, label: 'Заявки' },
  ]

  const isActive = (href: string) => {
    return pathname.startsWith(href)
  }

  const handleLogout = async () => {
    setLoggingOut(true)
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

      {/* Mobile Sidebar Overlay */}
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
              <span className="text-xs text-green-600 block -mt-1">Кабинет жильца</span>
            </div>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <nav className="flex flex-col h-[calc(100vh-4rem)]">
          <div className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
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
            
            <div className="pt-4 mt-4 border-t">
              <Link
                href="/tenant/settings"
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive('/tenant/settings') ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Settings className={`h-5 w-5 ${isActive('/tenant/settings') ? 'text-green-600' : ''}`} />
                <span>Настройки</span>
              </Link>
            </div>
          </div>

          {/* Logout */}
          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-red-600 hover:bg-red-50 w-full"
            >
              {loggingOut ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <LogOut className="h-5 w-5" />
              )}
              <span>Выйти</span>
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        <div className="h-16 lg:hidden" />
        <main className="p-4 sm:p-6 lg:p-8 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}
