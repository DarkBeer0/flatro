import Link from 'next/link'
import { Plus, Users, Home, Phone, Mail, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Временные данные
const mockTenants = [
  {
    id: '1',
    firstName: 'Jan',
    lastName: 'Kowalski',
    email: 'jan.kowalski@email.com',
    phone: '+48 123 456 789',
    isActive: true,
    property: {
      id: '1',
      name: 'Mieszkanie Mokotow',
      address: 'ul. Pulawska 123/45',
    },
    moveInDate: '2024-02-01',
    rentAmount: 3500,
  },
  {
    id: '2',
    firstName: 'Anna',
    lastName: 'Nowak',
    email: 'anna.nowak@email.com',
    phone: '+48 987 654 321',
    isActive: true,
    property: {
      id: '3',
      name: 'Mieszkanie Wola',
      address: 'ul. Wolska 67/8',
    },
    moveInDate: '2023-06-15',
    rentAmount: 4200,
  },
  {
    id: '3',
    firstName: 'Piotr',
    lastName: 'Wisniewski',
    email: 'piotr.w@email.com',
    phone: '+48 555 666 777',
    isActive: false,
    property: null,
    moveInDate: '2022-01-01',
    moveOutDate: '2023-12-31',
    rentAmount: 0,
  },
]

export default function TenantsPage() {
  const tenants = mockTenants
  const activeTenants = tenants.filter(t => t.isActive)
  const inactiveTenants = tenants.filter(t => !t.isActive)

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Najemcy</h1>
          <p className="text-gray-500 mt-1">Zarzadzaj najemcami swoich nieruchomosci</p>
        </div>
        <Link href="/tenants/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Dodaj najemce
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{tenants.length}</p>
              <p className="text-sm text-gray-500">Wszystkich</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeTenants.length}</p>
              <p className="text-sm text-gray-500">Aktywnych</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <Users className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inactiveTenants.length}</p>
              <p className="text-sm text-gray-500">Byłych</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Tenants List */}
      {tenants.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Brak najemcow
          </h3>
          <p className="text-gray-500 mb-4">
            Dodaj pierwszego najemce, aby rozpoczac zarzadzanie
          </p>
          <Link href="/tenants/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj najemce
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active Tenants */}
          {activeTenants.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4">Aktywni najemcy</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeTenants.map((tenant) => (
                  <TenantCard key={tenant.id} tenant={tenant} />
                ))}
              </div>
            </div>
          )}

          {/* Inactive Tenants */}
          {inactiveTenants.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-4 text-gray-500">Byli najemcy</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {inactiveTenants.map((tenant) => (
                  <TenantCard key={tenant.id} tenant={tenant} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TenantCard({ tenant }: { tenant: typeof mockTenants[0] }) {
  return (
    <Card className={`p-5 ${!tenant.isActive ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-600 font-semibold text-lg">
              {tenant.firstName[0]}{tenant.lastName[0]}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {tenant.firstName} {tenant.lastName}
            </h3>
            <Badge className={tenant.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
              {tenant.isActive ? 'Aktywny' : 'Nieaktywny'}
            </Badge>
          </div>
        </div>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Contact Info */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center text-sm text-gray-600">
          <Mail className="h-4 w-4 mr-2 text-gray-400" />
          {tenant.email}
        </div>
        <div className="flex items-center text-sm text-gray-600">
          <Phone className="h-4 w-4 mr-2 text-gray-400" />
          {tenant.phone}
        </div>
      </div>

      {/* Property */}
      {tenant.property ? (
        <div className="p-3 bg-gray-50 rounded-lg mb-4">
          <div className="flex items-center text-sm">
            <Home className="h-4 w-4 mr-2 text-gray-400" />
            <div>
              <p className="font-medium text-gray-900">{tenant.property.name}</p>
              <p className="text-gray-500">{tenant.property.address}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-3 bg-gray-50 rounded-lg mb-4 text-center text-sm text-gray-500">
          Brak przypisanej nieruchomosci
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <Link href={`/tenants/${tenant.id}`} className="flex-1">
          <Button variant="outline" className="w-full">
            Szczegoly
          </Button>
        </Link>
        {tenant.isActive && (
          <Link href={`/payments/new?tenant=${tenant.id}`}>
            <Button variant="outline">
              Platnosc
            </Button>
          </Link>
        )}
      </div>
    </Card>
  )
}
