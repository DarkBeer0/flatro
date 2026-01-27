import Link from 'next/link'
import { 
  ArrowLeft, 
  Edit, 
  Trash2, 
  Home, 
  MapPin, 
  Users, 
  CreditCard,
  FileText,
  Gauge,
  Calendar,
  Phone,
  Mail
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Временные данные
const mockProperty = {
  id: '1',
  name: 'Mieszkanie Mokotow',
  address: 'ul. Pulawska 123/45',
  city: 'Warszawa',
  postalCode: '02-595',
  area: 52,
  rooms: 2,
  floor: 4,
  description: 'Jasne, przestronne mieszkanie z balkonem. Kuchnia z oknem, lazienka z wanna. Piwnica w cenie.',
  status: 'OCCUPIED' as const,
  rentAmount: 3500,
  createdAt: '2024-01-15',
}

const mockTenant = {
  id: '1',
  firstName: 'Jan',
  lastName: 'Kowalski',
  email: 'jan.kowalski@email.com',
  phone: '+48 123 456 789',
  moveInDate: '2024-02-01',
}

const mockPayments = [
  { id: '1', period: '2024-03', amount: 3500, status: 'PAID', paidDate: '2024-03-05' },
  { id: '2', period: '2024-02', amount: 3500, status: 'PAID', paidDate: '2024-02-08' },
  { id: '3', period: '2024-01', amount: 3500, status: 'PAID', paidDate: '2024-01-10' },
]

const statusConfig = {
  VACANT: { label: 'Wolne', color: 'bg-green-100 text-green-800' },
  OCCUPIED: { label: 'Wynajete', color: 'bg-blue-100 text-blue-800' },
  RESERVED: { label: 'Zarezerwowane', color: 'bg-yellow-100 text-yellow-800' },
}

export default function PropertyDetailPage({ params }: { params: { id: string } }) {
  const property = mockProperty
  const tenant = mockTenant
  const payments = mockPayments
  const status = statusConfig[property.status]

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/properties" 
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Powrot do listy
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-gray-900">{property.name}</h1>
              <Badge className={status.color}>{status.label}</Badge>
            </div>
            <div className="flex items-center text-gray-500 mt-2">
              <MapPin className="h-4 w-4 mr-1" />
              {property.address}, {property.postalCode} {property.city}
            </div>
          </div>

          <div className="flex gap-2">
            <Link href={`/properties/${property.id}/edit`}>
              <Button variant="outline">
                <Edit className="h-4 w-4 mr-2" />
                Edytuj
              </Button>
            </Link>
            <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50">
              <Trash2 className="h-4 w-4 mr-2" />
              Usun
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="xl:col-span-2 space-y-6">
          {/* Property Details */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Home className="h-5 w-5 text-gray-400" />
              Szczegoly nieruchomosci
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-500">Powierzchnia</p>
                <p className="text-lg font-semibold">{property.area} m²</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Pokoje</p>
                <p className="text-lg font-semibold">{property.rooms}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Pietro</p>
                <p className="text-lg font-semibold">{property.floor}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Czynsz</p>
                <p className="text-lg font-semibold">{property.rentAmount} zl</p>
              </div>
            </div>

            {property.description && (
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm text-gray-500 mb-2">Opis</p>
                <p className="text-gray-700">{property.description}</p>
              </div>
            )}
          </Card>

          {/* Tenant */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-400" />
                Najemca
              </h2>
              {!tenant && (
                <Link href={`/properties/${property.id}/assign-tenant`}>
                  <Button size="sm">Przypisz najemce</Button>
                </Link>
              )}
            </div>

            {tenant ? (
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold text-gray-900">
                    {tenant.firstName} {tenant.lastName}
                  </p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center text-sm text-gray-500">
                      <Mail className="h-4 w-4 mr-2" />
                      {tenant.email}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Phone className="h-4 w-4 mr-2" />
                      {tenant.phone}
                    </div>
                    <div className="flex items-center text-sm text-gray-500">
                      <Calendar className="h-4 w-4 mr-2" />
                      Od {tenant.moveInDate}
                    </div>
                  </div>
                </div>
                <Link href={`/tenants/${tenant.id}`}>
                  <Button variant="outline" size="sm">Zobacz profil</Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p>Brak przypisanego najemcy</p>
              </div>
            )}
          </Card>

          {/* Recent Payments */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-gray-400" />
                Ostatnie platnosci
              </h2>
              <Link href={`/payments?property=${property.id}`}>
                <Button variant="outline" size="sm">Zobacz wszystkie</Button>
              </Link>
            </div>

            <div className="space-y-3">
              {payments.map((payment) => (
                <div 
                  key={payment.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium">{payment.period}</p>
                    <p className="text-sm text-gray-500">
                      Zaplacono {payment.paidDate}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">{payment.amount} zl</p>
                    <Badge className="bg-green-100 text-green-800">Zaplacono</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Szybkie akcje</h2>
            <div className="space-y-2">
              <Link href={`/payments/new?property=${property.id}`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Dodaj platnosc
                </Button>
              </Link>
              <Link href={`/contracts/new?property=${property.id}`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <FileText className="h-4 w-4 mr-2" />
                  Utworz umowe
                </Button>
              </Link>
              <Link href={`/meters?property=${property.id}`} className="block">
                <Button variant="outline" className="w-full justify-start">
                  <Gauge className="h-4 w-4 mr-2" />
                  Odczyty licznikow
                </Button>
              </Link>
            </div>
          </Card>

          {/* Financial Summary */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Podsumowanie finansowe</h2>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Czynsz miesieczny</span>
                <span className="font-semibold">{property.rentAmount} zl</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Przychod roczny</span>
                <span className="font-semibold">{property.rentAmount * 12} zl</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cena za m²</span>
                <span className="font-semibold">
                  {Math.round(property.rentAmount / property.area)} zl
                </span>
              </div>
            </div>
          </Card>

          {/* Meters */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Liczniki</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Prad</span>
                <span className="text-sm text-gray-500">Brak odczytu</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Gaz</span>
                <span className="text-sm text-gray-500">Brak odczytu</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Woda</span>
                <span className="text-sm text-gray-500">Brak odczytu</span>
              </div>
            </div>
            <Link href={`/meters/new?property=${property.id}`} className="block mt-4">
              <Button variant="outline" size="sm" className="w-full">
                Dodaj odczyt
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  )
}
