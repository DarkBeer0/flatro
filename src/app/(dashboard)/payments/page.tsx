import Link from 'next/link'
import { Plus, CreditCard, AlertTriangle, CheckCircle, Clock, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

// Временные данные
const mockPayments = [
  {
    id: '1',
    tenant: { id: '1', firstName: 'Jan', lastName: 'Kowalski' },
    property: { id: '1', name: 'Mieszkanie Mokotow' },
    amount: 3500,
    type: 'RENT' as const,
    status: 'PAID' as const,
    dueDate: '2024-03-10',
    paidDate: '2024-03-05',
    period: '2024-03',
  },
  {
    id: '2',
    tenant: { id: '2', firstName: 'Anna', lastName: 'Nowak' },
    property: { id: '3', name: 'Mieszkanie Wola' },
    amount: 4200,
    type: 'RENT' as const,
    status: 'PENDING' as const,
    dueDate: '2024-03-10',
    paidDate: null,
    period: '2024-03',
  },
  {
    id: '3',
    tenant: { id: '1', firstName: 'Jan', lastName: 'Kowalski' },
    property: { id: '1', name: 'Mieszkanie Mokotow' },
    amount: 350,
    type: 'UTILITIES' as const,
    status: 'OVERDUE' as const,
    dueDate: '2024-02-28',
    paidDate: null,
    period: '2024-02',
  },
  {
    id: '4',
    tenant: { id: '1', firstName: 'Jan', lastName: 'Kowalski' },
    property: { id: '1', name: 'Mieszkanie Mokotow' },
    amount: 3500,
    type: 'RENT' as const,
    status: 'PAID' as const,
    dueDate: '2024-02-10',
    paidDate: '2024-02-08',
    period: '2024-02',
  },
]

const statusConfig = {
  PENDING: { label: 'Oczekuje', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  PAID: { label: 'Zaplacono', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  OVERDUE: { label: 'Zalegla', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  CANCELLED: { label: 'Anulowana', color: 'bg-gray-100 text-gray-800', icon: Clock },
}

const typeConfig = {
  RENT: { label: 'Czynsz', color: 'bg-blue-100 text-blue-800' },
  UTILITIES: { label: 'Media', color: 'bg-purple-100 text-purple-800' },
  DEPOSIT: { label: 'Kaucja', color: 'bg-orange-100 text-orange-800' },
  OTHER: { label: 'Inne', color: 'bg-gray-100 text-gray-800' },
}

export default function PaymentsPage() {
  const payments = mockPayments

  // Obliczenia statystyk
  const totalPending = payments
    .filter(p => p.status === 'PENDING')
    .reduce((sum, p) => sum + p.amount, 0)
  
  const totalOverdue = payments
    .filter(p => p.status === 'OVERDUE')
    .reduce((sum, p) => sum + p.amount, 0)

  const totalPaidThisMonth = payments
    .filter(p => p.status === 'PAID' && p.period === '2024-03')
    .reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Platnosci</h1>
          <p className="text-gray-500 mt-1">Sledzenie platnosci od najemcow</p>
        </div>
        <Link href="/payments/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Dodaj platnosc
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalPaidThisMonth} zl</p>
              <p className="text-sm text-gray-500">Otrzymano (marzec)</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalPending} zl</p>
              <p className="text-sm text-gray-500">Oczekujace</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalOverdue} zl</p>
              <p className="text-sm text-gray-500">Zaleglosci</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{payments.length}</p>
              <p className="text-sm text-gray-500">Wszystkich</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-500">Filtruj:</span>
          </div>
          <select className="rounded-md border border-gray-200 px-3 py-1.5 text-sm">
            <option value="">Wszystkie statusy</option>
            <option value="PENDING">Oczekujace</option>
            <option value="PAID">Zaplacone</option>
            <option value="OVERDUE">Zalegle</option>
          </select>
          <select className="rounded-md border border-gray-200 px-3 py-1.5 text-sm">
            <option value="">Wszystkie typy</option>
            <option value="RENT">Czynsz</option>
            <option value="UTILITIES">Media</option>
            <option value="DEPOSIT">Kaucja</option>
          </select>
          <select className="rounded-md border border-gray-200 px-3 py-1.5 text-sm">
            <option value="">Wszystkie nieruchomosci</option>
            <option value="1">Mieszkanie Mokotow</option>
            <option value="3">Mieszkanie Wola</option>
          </select>
        </div>
      </Card>

      {/* Payments List */}
      {payments.length === 0 ? (
        <Card className="p-12 text-center">
          <CreditCard className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Brak platnosci
          </h3>
          <p className="text-gray-500 mb-4">
            Dodaj pierwsza platnosc, aby rozpoczac sledzenie
          </p>
          <Link href="/payments/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Dodaj platnosc
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
                  <th className="text-left p-4 font-medium text-gray-500">Termin</th>
                  <th className="text-right p-4 font-medium text-gray-500">Kwota</th>
                  <th className="text-left p-4 font-medium text-gray-500">Status</th>
                  <th className="text-right p-4 font-medium text-gray-500">Akcje</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => {
                  const status = statusConfig[payment.status]
                  const type = typeConfig[payment.type]
                  const StatusIcon = status.icon

                  return (
                    <tr key={payment.id} className="border-b hover:bg-gray-50">
                      <td className="p-4">
                        <Link 
                          href={`/tenants/${payment.tenant.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {payment.tenant.firstName} {payment.tenant.lastName}
                        </Link>
                      </td>
                      <td className="p-4">
                        <Link 
                          href={`/properties/${payment.property.id}`}
                          className="text-gray-600 hover:text-blue-600"
                        >
                          {payment.property.name}
                        </Link>
                      </td>
                      <td className="p-4">
                        <Badge className={type.color}>{type.label}</Badge>
                      </td>
                      <td className="p-4 text-gray-600">{payment.period}</td>
                      <td className="p-4 text-gray-600">{payment.dueDate}</td>
                      <td className="p-4 text-right font-semibold">{payment.amount} zl</td>
                      <td className="p-4">
                        <Badge className={`${status.color} flex items-center gap-1 w-fit`}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </td>
                      <td className="p-4 text-right">
                        {payment.status === 'PENDING' || payment.status === 'OVERDUE' ? (
                          <Button size="sm" variant="outline">
                            Oznacz jako zaplacone
                          </Button>
                        ) : (
                          <Button size="sm" variant="ghost">
                            Szczegoly
                          </Button>
                        )}
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
