// app/(dashboard)/contracts/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, FileText, Calendar, CreditCard, User, Home, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface ContractDetail {
  id: string
  type: string
  startDate: string
  endDate: string | null
  rentAmount: number
  depositAmount: number | null
  paymentDay: number
  status: string
  notes: string | null
  createdAt: string
  tenant: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
  }
  property: {
    id: string
    name: string
    address: string
    city: string
  }
}

export default function ContractDetailPage() {
  const router = useRouter()
  const params = useParams()
  const contractId = params.id as string

  const [contract, setContract] = useState<ContractDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchContract()
  }, [contractId])

  async function fetchContract() {
    try {
      const res = await fetch(`/api/contracts/${contractId}`)
      if (!res.ok) {
        setError(res.status === 404 ? 'Договор не найден' : 'Ошибка загрузки')
        return
      }
      setContract(await res.json())
    } catch {
      setError('Ошибка подключения')
    } finally {
      setLoading(false)
    }
  }

  const statusConfig: Record<string, { label: string; color: string }> = {
    DRAFT: { label: 'Черновик', color: 'bg-gray-100 text-gray-800' },
    ACTIVE: { label: 'Активная', color: 'bg-green-100 text-green-800' },
    EXPIRED: { label: 'Истекла', color: 'bg-yellow-100 text-yellow-800' },
    TERMINATED: { label: 'Расторгнута', color: 'bg-red-100 text-red-800' },
  }

  const typeConfig: Record<string, string> = {
    STANDARD: 'Обычный наём',
    OCCASIONAL: 'Наём okazjonalny',
    INSTITUTIONAL: 'Наём instytucjonalny',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="max-w-2xl mx-auto mt-12 text-center">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">{error}</h2>
        <Button variant="outline" onClick={() => router.push('/contracts')}>
          <ArrowLeft className="h-4 w-4 mr-2" />Назад
        </Button>
      </div>
    )
  }

  const cStatus = statusConfig[contract.status] || { label: contract.status, color: 'bg-gray-100 text-gray-800' }
  const daysLeft = contract.endDate
    ? Math.ceil((new Date(contract.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/contracts')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Назад
        </Button>
      </div>

      {/* Header */}
      <Card className="p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-600" />
              Договор найма
            </h1>
            <p className="text-gray-500 mt-1">{typeConfig[contract.type] || contract.type}</p>
          </div>
          <Badge className={`${cStatus.color} text-sm px-3 py-1`}>{cStatus.label}</Badge>
        </div>

        {daysLeft !== null && contract.status === 'ACTIVE' && (
          <div className={`p-3 rounded-lg mb-4 ${daysLeft <= 30 ? 'bg-yellow-50 text-yellow-800' : 'bg-green-50 text-green-800'}`}>
            {daysLeft > 0
              ? `Истекает через ${daysLeft} дней (${new Date(contract.endDate!).toLocaleDateString()})`
              : daysLeft === 0
                ? 'Истекает сегодня!'
                : `Истёк ${Math.abs(daysLeft)} дней назад`}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Арендатор */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1">
              <User className="h-4 w-4" />Арендатор
            </h3>
            <p className="font-semibold">{contract.tenant.firstName} {contract.tenant.lastName}</p>
            {contract.tenant.email && <p className="text-sm text-gray-500">{contract.tenant.email}</p>}
            {contract.tenant.phone && <p className="text-sm text-gray-500">{contract.tenant.phone}</p>}
          </div>

          {/* Недвижимость */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1">
              <Home className="h-4 w-4" />Недвижимость
            </h3>
            <p className="font-semibold">{contract.property.name}</p>
            <p className="text-sm text-gray-500">{contract.property.address}, {contract.property.city}</p>
          </div>

          {/* Период */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1">
              <Calendar className="h-4 w-4" />Период
            </h3>
            <p className="font-semibold">
              {new Date(contract.startDate).toLocaleDateString()} — {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'бессрочно'}
            </p>
          </div>

          {/* Финансы */}
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-1">
              <CreditCard className="h-4 w-4" />Финансы
            </h3>
            <p className="font-semibold">{contract.rentAmount} zł / мес</p>
            {contract.depositAmount && <p className="text-sm text-gray-500">Депозит: {contract.depositAmount} zł</p>}
            <p className="text-sm text-gray-500">Оплата до {contract.paymentDay} числа</p>
          </div>
        </div>

        {contract.notes && (
          <div className="mt-6 pt-4 border-t">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Примечания</h3>
            <p className="text-gray-700 whitespace-pre-wrap">{contract.notes}</p>
          </div>
        )}
      </Card>
    </div>
  )
}
