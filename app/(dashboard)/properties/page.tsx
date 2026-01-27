import Link from 'next/link'
import { Plus, Home, MapPin, Users, MoreHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Временные данные для демонстрации
const mockProperties = [
  {
    id: '1',
    name: 'Mieszkanie Mokotow',
    address: 'ul. Pulawska 123/45',
    city: 'Warszawa',
    area: 52,
    rooms: 2,
    status: 'OCCUPIED' as const,
    tenant: 'Jan Kowalski',
    rent: 3500,
  },
  {
    id: '2',
    name: 'Kawalerka Srodmiescie',
    address: 'ul. Marszalkowska 89/12',
    city: 'Warszawa',
    area: 28,
    rooms: 1,
    status: 'VACANT' as const,
    tenant: null,
    rent: 2800,
  },
  {
    id: '3',
    name: 'Mieszkanie Wola',
    address: 'ul. Wolska 67/8',
    city: 'Warszawa',
    area: 65,
    rooms: 3,
    status: 'RESERVED' as const,
    tenant: null,
    rent: 4200,
  },
]

const statusConfig = {
  VACANT: { label: 'Wolne', color: 'bg-green-100 text-green-800' },
  OCCUPIED: { label: 'Wynajete', color: 'bg-blue-100 text-blue-800' },
  RESERVED: { label: 'Zarezerwowane', color: 'bg-yellow-100 text-yellow-800' },
}

export default function PropertiesPage() {
  // W przyszlosci dane beda pobierane z bazy
  const properties = mockProperties

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nieruchomosci</h1>
          <p className="text-gray-500 mt-1">Zarzadzaj swoimi nieruchomosciami</p>
        </div>
        <Link href="/properties/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Dodaj nieruchomosc
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Home className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{properties.length}</p>
              <p className="text-sm text-gray-500">Wszystkich</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Home className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {properties.filter(p => p.status === 'VACANT').length}
              </p>
              <p className="text-sm text-gray-500">Wolnych</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {properties.filter(p => p.status === 'OCCUPIED').length}
              </p>
              <p className="text-sm text-gray-500">Wynajętych</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Properties Grid */}
      {properties.length === 0 ? (
        <Card className="p-12 text-center">
          <Home className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Brak nieruchomosci
          </h3>
          <p className="text-gray-500 mb-4">
            Dodaj pierwsza nieruchomosc, aby rozpoczac zarzadzanie
          </p>
          <Link href="/properties/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj nieruchomosc
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}
    </div>
  )
}

function PropertyCard({ property }: { property: typeof mockProperties[0] }) {
  const status = statusConfig[property.status]

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {/* Property Image Placeholder */}
      <div className="h-40 bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center">
        <Home className="h-16 w-16 text-blue-300" />
      </div>

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">{property.name}</h3>
            <div className="flex items-center text-sm text-gray-500 mt-1">
              <MapPin className="h-4 w-4 mr-1" />
              {property.address}
            </div>
          </div>
          <Badge className={status.color}>{status.label}</Badge>
        </div>

        {/* Details */}
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
          <span>{property.area} m²</span>
          <span>•</span>
          <span>{property.rooms} {property.rooms === 1 ? 'pokoj' : 'pokoje'}</span>
          <span>•</span>
          <span>{property.city}</span>
        </div>

        {/* Tenant & Rent */}
        <div className="flex items-center justify-between pt-3 border-t">
          <div>
            {property.tenant ? (
              <div className="flex items-center text-sm">
                <Users className="h-4 w-4 mr-1 text-gray-400" />
                <span className="text-gray-600">{property.tenant}</span>
              </div>
            ) : (
              <span className="text-sm text-gray-400">Brak najemcy</span>
            )}
          </div>
          <div className="text-right">
            <p className="font-semibold text-gray-900">{property.rent} zl</p>
            <p className="text-xs text-gray-500">/ miesiac</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4">
          <Link href={`/properties/${property.id}`} className="flex-1">
            <Button variant="outline" className="w-full">
              Szczegoly
            </Button>
          </Link>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  )
}
