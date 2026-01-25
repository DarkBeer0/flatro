'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Save, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Mock data
const mockProperties = [
  { id: '1', name: 'Mieszkanie Mokotow', address: 'ul. Pulawska 123/45', rentAmount: 3500 },
  { id: '2', name: 'Kawalerka Srodmiescie', address: 'ul. Marszalkowska 89/12', rentAmount: 2800 },
  { id: '3', name: 'Mieszkanie Wola', address: 'ul. Wolska 67/8', rentAmount: 4200 },
]

const mockTenants = [
  { id: '1', firstName: 'Jan', lastName: 'Kowalski' },
  { id: '2', firstName: 'Anna', lastName: 'Nowak' },
]

export default function NewContractPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    propertyId: '',
    tenantId: '',
    type: 'STANDARD',
    startDate: '',
    endDate: '',
    rentAmount: '',
    depositAmount: '',
    paymentDay: '10',
    notes: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Auto-fill rent amount when property is selected
    if (name === 'propertyId') {
      const property = mockProperties.find(p => p.id === value)
      if (property) {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          rentAmount: property.rentAmount.toString(),
          depositAmount: (property.rentAmount * 2).toString(),
        }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // TODO: Zapisz do bazy danych przez API
      console.log('Form data:', formData)
      
      // Symulacja zapisu
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Przekieruj do listy umow
      router.push('/contracts')
    } catch (error) {
      console.error('Error saving contract:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/contracts" 
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Powrot do listy
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Nowa umowa</h1>
        <p className="text-gray-500 mt-1">Utworz nowa umowe najmu</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Contract Type */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold">Typ umowy</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label 
              className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                formData.type === 'STANDARD' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="type"
                value="STANDARD"
                checked={formData.type === 'STANDARD'}
                onChange={handleChange}
                className="sr-only"
              />
              <span className="font-medium text-gray-900">Zwykly najem</span>
              <span className="text-sm text-gray-500 mt-1">
                Standardowa umowa najmu lokalu mieszkalnego
              </span>
            </label>

            <label 
              className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                formData.type === 'OCCASIONAL' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="type"
                value="OCCASIONAL"
                checked={formData.type === 'OCCASIONAL'}
                onChange={handleChange}
                className="sr-only"
              />
              <span className="font-medium text-gray-900">Najem okazjonalny</span>
              <span className="text-sm text-gray-500 mt-1">
                Wymaga aktu notarialnego i oswiadczenia najemcy
              </span>
            </label>

            <label 
              className={`relative flex flex-col p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                formData.type === 'INSTITUTIONAL' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="type"
                value="INSTITUTIONAL"
                checked={formData.type === 'INSTITUTIONAL'}
                onChange={handleChange}
                className="sr-only"
              />
              <span className="font-medium text-gray-900">Najem instytucjonalny</span>
              <span className="text-sm text-gray-500 mt-1">
                Dla przedsiebiorcow prowadzacych dzialalnosc
              </span>
            </label>
          </div>

          {formData.type === 'OCCASIONAL' && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex gap-2">
                <Info className="h-5 w-5 text-yellow-600 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Wymagane dokumenty dla najmu okazjonalnego:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1">
                    <li>Oswiadczenie najemcy o poddaniu sie egzekucji (akt notarialny)</li>
                    <li>Wskazanie lokalu, do ktorego najemca sie wyprowadzi</li>
                    <li>Zgoda wlasciciela lokalu zastepczego</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Parties */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-6">Strony umowy</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label htmlFor="propertyId">Nieruchomosc *</Label>
              <select
                id="propertyId"
                name="propertyId"
                value={formData.propertyId}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Wybierz nieruchomosc --</option>
                {mockProperties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name} - {property.address}
                  </option>
                ))}
              </select>
            </div>

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
                    {tenant.firstName} {tenant.lastName}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                <Link href="/tenants/new" className="text-blue-600 hover:underline">
                  Dodaj nowego najemce
                </Link>
              </p>
            </div>
          </div>
        </Card>

        {/* Duration */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-6">Okres obowiazywania</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="startDate">Data rozpoczecia *</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                value={formData.startDate}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="endDate">Data zakonczenia</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                value={formData.endDate}
                onChange={handleChange}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Zostaw puste dla umowy na czas nieokreslony
              </p>
            </div>
          </div>
        </Card>

        {/* Financial */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-6">Warunki finansowe</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="rentAmount">Czynsz miesieczny (zl) *</Label>
              <Input
                id="rentAmount"
                name="rentAmount"
                type="number"
                min="0"
                placeholder="3500"
                value={formData.rentAmount}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="depositAmount">Kaucja (zl)</Label>
              <Input
                id="depositAmount"
                name="depositAmount"
                type="number"
                min="0"
                placeholder="7000"
                value={formData.depositAmount}
                onChange={handleChange}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Zazwyczaj 1-2 miesieczne czynsze
              </p>
            </div>

            <div>
              <Label htmlFor="paymentDay">Dzien platnosci *</Label>
              <select
                id="paymentDay"
                name="paymentDay"
                value={formData.paymentDay}
                onChange={handleChange}
                required
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[1, 5, 10, 15, 20, 25].map((day) => (
                  <option key={day} value={day}>
                    {day}. dzien miesiaca
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Notes */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-6">Dodatkowe ustalenia</h2>

          <div>
            <Label htmlFor="notes">Notatki i uwagi</Label>
            <textarea
              id="notes"
              name="notes"
              rows={4}
              placeholder="Dodatkowe ustalenia, np. meble w cenie, miejsce parkingowe, zwierzeta dozwolone..."
              value={formData.notes}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Po zapisaniu mozesz wygenerowac PDF umowy
          </p>
          <div className="flex gap-4">
            <Link href="/contracts">
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
                  Zapisz umowe
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
