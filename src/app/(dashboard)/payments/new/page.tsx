'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, CreditCard, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Mock data
const mockTenants = [
  { id: '1', firstName: 'Jan', lastName: 'Kowalski', property: 'Mieszkanie Mokotow' },
  { id: '2', firstName: 'Anna', lastName: 'Nowak', property: 'Mieszkanie Wola' },
]

export default function NewPaymentPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    tenantId: '',
    amount: '',
    type: 'RENT',
    status: 'PENDING',
    dueDate: '',
    paidDate: '',
    period: '',
    notes: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // TODO: Zapisz do bazy danych przez API
      console.log('Form data:', formData)
      
      // Symulacja zapisu
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Przekieruj do listy platnosci
      router.push('/payments')
    } catch (error) {
      console.error('Error saving payment:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Ustaw domyslny okres na biezacy miesiac
  const currentPeriod = new Date().toISOString().slice(0, 7)

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/payments" 
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Powrot do listy
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Dodaj platnosc</h1>
        <p className="text-gray-500 mt-1">Zarejestruj nowa platnosc od najemcy</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Payment Info */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold">Informacje o platnosci</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label htmlFor="tenantId">Najemca *</Label>
              <select
                id="tenantId"
                name="tenantId"
                value={formData.tenantId}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Wybierz najemce --</option>
                {mockTenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.firstName} {tenant.lastName} ({tenant.property})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="type">Typ platnosci *</Label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="RENT">Czynsz</option>
                <option value="UTILITIES">Media</option>
                <option value="DEPOSIT">Kaucja</option>
                <option value="OTHER">Inne</option>
              </select>
            </div>

            <div>
              <Label htmlFor="amount">Kwota (zl) *</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                min="0"
                step="0.01"
                placeholder="3500"
                value={formData.amount}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="period">Okres (miesiac) *</Label>
              <Input
                id="period"
                name="period"
                type="month"
                value={formData.period || currentPeriod}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="dueDate">Termin platnosci *</Label>
              <Input
                id="dueDate"
                name="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>
          </div>
        </Card>

        {/* Status */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-6">Status platnosci</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="PENDING">Oczekuje</option>
                <option value="PAID">Zaplacono</option>
                <option value="OVERDUE">Zalegla</option>
              </select>
            </div>

            {formData.status === 'PAID' && (
              <div>
                <Label htmlFor="paidDate">Data zaplaty</Label>
                <Input
                  id="paidDate"
                  name="paidDate"
                  type="date"
                  value={formData.paidDate}
                  onChange={handleChange}
                  className="mt-1"
                />
              </div>
            )}
          </div>
        </Card>

        {/* Notes */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-6">Dodatkowe informacje</h2>

          <div>
            <Label htmlFor="notes">Notatki</Label>
            <textarea
              id="notes"
              name="notes"
              rows={3}
              placeholder="Dodatkowe informacje o platnosci..."
              value={formData.notes}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/payments">
            <Button type="button" variant="outline">
              Anuluj
            </Button>
          </Link>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Zapisywanie...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Zapisz platnosc
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
