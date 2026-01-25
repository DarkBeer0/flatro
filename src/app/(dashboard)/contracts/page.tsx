import Link from 'next/link'
import { Plus, FileText, Calendar, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Временные данные
const mockContracts = [
  {
    id: '1',
    tenant: { id: '1', firstName: 'Jan', lastName: 'Kowalski' },
    property: { id: '1', name: 'Mieszkanie Mokotow', address: 'ul. Pulawska 123/45' },
    type: 'OCCASIONAL' as const,
    status: 'ACTIVE' as const,
    startDate: '2024-02-01',
    endDate: '2025-01-31',
    rentAmount: 3500,
    depositAmount: 7000,
    paymentDay: 10,
  },
  {
    id: '2',
    tenant: { id: '2', firstName: 'Anna', lastName: 'Nowak' },
    property: { id: '3', name: 'Mieszkanie Wola', address: 'ul. Wolska 67/8' },
    type: 'STANDARD' as const,
    status: 'ACTIVE' as const,
    startDate: '2023-06-15',
    endDate: null,
    rentAmount: 4200,
    depositAmount: 8400,
    paymentDay: 5,
  },
  {
    id: '3',
    tenant: { id: '3', firstName: 'Piotr', lastName: 'Wisniewski' },
    property: { id: '2', name: 'Kawalerka Srodmiescie', address: 'ul. Marszalkowska 89/12' },
    type: 'INSTITUTIONAL' as const,
    status: 'EXPIRED' as const,
    startDate: '2022-01-01',
    endDate: '2023-12-31',
    rentAmount: 2800,
    depositAmount: 5600,
    paymentDay: 10,
  },
]

const statusConfig = {
  DRAFT: { label: 'Szkic', color: 'bg-gray-100 text-gray-800', icon: Clock },
  ACTIVE: { label: 'Aktywna', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  EXPIRED: { label: 'Wygasla', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  TERMINATED: { label: 'Rozwiazana', color: 'bg-red-100 text-red-800', icon: AlertCircle },
}

const typeConfig = {
  STANDARD: { label: 'Zwykly najem', color: 'bg-blue-100 text-blue-800' },
  OCCASIONAL: { label: 'Najem okazjonalny', color: 'bg-purple-100 text-purple-800' },
  INSTITUTIONAL: { label: 'Najem instytucjonalny', color: 'bg-orange-100 text-orange-800' },
}

export default function ContractsPage() {
  const contracts = mockContracts
  const activeContracts = contracts.filter(c => c.status === 'ACTIVE')
  
  // Umowy wygasajace w ciagu 30 dni
  const expiringContracts = activeContracts.filter(c => {
    if (!c.endDate) return false
    const endDate = new Date(c.endDate)
    const today = new Date()
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0
  })

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Umowy</h1>
          <p className="text-gray-500 mt-1">Zarzadzaj umowami najmu</p>
        </div>
        <Link href="/contracts/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Nowa umowa
          </Button>
        </Link>
      </div>

      {/* Alert - Expiring Contracts */}
      {expiringContracts.length > 0 && (
        <Card className="p-4 mb-6 border-yellow-200 bg-yellow-50">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-yellow-800">
                Umowy wygasajace wkrotce
              </h3>
              <p className="text-sm text-yellow-700 mt-1">
                {expiringContracts.length} {expiringContracts.length === 1 ? 'umowa wygasa' : 'umowy wygasaja'} w ciagu 30 dni.
                Rozważ przedłużenie lub zawarcie nowych umow.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{contracts.length}</p>
              <p className="text-sm text-gray-500">Wszystkich</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeContracts.length}</p>
              <p className="text-sm text-gray-500">Aktywnych</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{expiringContracts.length}</p>
              <p className="text-sm text-gray-500">Wygasajacych</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Calendar className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {activeContracts.reduce((sum, c) => sum + c.rentAmount, 0)} zl
              </p>
              <p className="text-sm text-gray-500">Miesieczny przychod</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Contracts List */}
      {contracts.length === 0 ? (
        <Card className="p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Brak umow
          </h3>
          <p className="text-gray-500 mb-4">
            Utworz pierwsza umowe najmu
          </p>
          <Link href="/contracts/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nowa umowa
            </Button>
          </Link>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left p-4 font-medium text-gray-500">Najemca</th>
                  <th className="text-left p-4 font-medium text-gray-500">Nieruchomosc</th>
                  <th className="text-left p-4 font-medium text-gray-500">Typ</th>
                  <th className="text-left p-4 font-medium text-gray-500">Okres</th>
                  <th className="text-right p-4 font-medium text-gray-500">Czynsz</th>
                  <th className="text-left p-4 font-medium text-gray-500">Status</th>
                  <th className="text-right p-4 font-medium text-gray-500">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((contract) => {
                  const status = statusConfig[contract.status]
                  const type = typeConfig[contract.type]
                  const StatusIcon = status.icon

                  // Oblicz dni do wygasniecia
                  let daysUntilExpiry = null
                  if (contract.endDate && contract.status === 'ACTIVE') {
                    const endDate = new Date(contract.endDate)
                    const today = new Date()
                    daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                  }

                  return (
                    <tr key={contract.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <Link 
                          href={`/tenants/${contract.tenant.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {contract.tenant.firstName} {contract.tenant.lastName}
                        </Link>
                      </td>
                      <td className="p-4">
                        <Link 
                          href={`/properties/${contract.property.id}`}
                          className="hover:text-blue-600"
                        >
                          <p className="text-gray-900">{contract.property.name}</p>
                          <p className="text-sm text-gray-500">{contract.property.address}</p>
                        </Link>
                      </td>
                      <td className="p-4">
                        <Badge className={type.color}>{type.label}</Badge>
                      </td>
                      <td className="p-4">
                        <p className="text-gray-900">
                          {contract.startDate} - {contract.endDate || 'bezterminowo'}
                        </p>
                        {daysUntilExpiry !== null && daysUntilExpiry <= 30 && (
                          <p className="text-sm text-yellow-600">
                            Wygasa za {daysUntilExpiry} dni
                          </p>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <p className="font-semibold">{contract.rentAmount} zl</p>
                        <p className="text-sm text-gray-500">platne do {contract.paymentDay}.</p>
                      </td>
                      <td className="p-4">
                        <Badge className={`${status.color} flex items-center gap-1 w-fit`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/contracts/${contract.id}`}>
                            <Button size="sm" variant="outline">
                              Szczegoly
                            </Button>
                          </Link>
                          {contract.status === 'ACTIVE' && (
                            <Button size="sm" variant="ghost">
                              PDF
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
