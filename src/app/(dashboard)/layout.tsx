import Link from 'next/link'
import { Home, Users, Building2, CreditCard, FileText, Settings, Gauge } from 'lucide-react'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r border-gray-200">
        <div className="flex h-16 items-center border-b px-6">
          <Link href="/" className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">Flatro</span>
          </Link>
        </div>
        
        <nav className="p-4 space-y-2">
          <NavLink href="/dashboard" icon={<Gauge className="h-5 w-5" />}>
            Dashboard
          </NavLink>
          <NavLink href="/properties" icon={<Home className="h-5 w-5" />}>
            Nieruchomosci
          </NavLink>
          <NavLink href="/tenants" icon={<Users className="h-5 w-5" />}>
            Najemcy
          </NavLink>
          <NavLink href="/payments" icon={<CreditCard className="h-5 w-5" />}>
            Platnosci
          </NavLink>
          <NavLink href="/contracts" icon={<FileText className="h-5 w-5" />}>
            Umowy
          </NavLink>
          
          <div className="pt-4 mt-4 border-t">
            <NavLink href="/settings" icon={<Settings className="h-5 w-5" />}>
              Ustawienia
            </NavLink>
          </div>
        </nav>
      </aside>

      <div className="pl-64">
        <main className="p-8 min-h-screen">
          {children}
        </main>
      </div>
    </div>
  )
}

function NavLink({ 
  href, 
  icon, 
  children 
}: { 
  href: string
  icon: React.ReactNode
  children: React.ReactNode 
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
    >
      {icon}
      <span>{children}</span>
    </Link>
  )
}