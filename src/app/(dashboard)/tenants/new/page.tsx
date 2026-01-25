'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Users, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Mock properties for selection
const mockProperties = [
  { id: '1', name: 'Mieszkanie Mokotow', address: 'ul. Pulawska 123/45' },
  { id: '2', name: 'Kawalerka Srodmiescie', address: 'ul. Marszalkowska 89/12' },
  { id: '3', name: 'Mieszkanie Wola', address: 'ul. Wolska 67/8' },
]

export default function NewTenantPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    pesel: '',
    propertyId: '',
    moveInDate: '',
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
      
      // Przekieruj do listy najemcow
      router.push('/tenants')
    } catch (error) {
      console.error('Error saving tenant:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/tenants" 
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Powrot do listy
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Dodaj najemce</h1>
        <p className="text-gray-500 mt-1">Wprowadz dane nowego najemcy</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Personal Info */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold">Dane osobowe</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="firstName">Imie *</Label>
              <Input
                id="firstName"
                name="firstName"
                placeholder="Jan"
                value={formData.firstName}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="lastName">Nazwisko *</Label>
              <Input
                id="lastName"
                name="lastName"
                placeholder="Kowalski"
                value={formData.lastName}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="jan.kowalski@email.com"
                value={formData.email}
                onChange={handleChange}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="+48 123 456 789"
                value={formData.phone}
                onChange={handleChange}
                className="mt-1"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="pesel">PESEL (opcjonalnie)</Label>
              <Input
                id="pesel"
                name="pesel"
                placeholder="12345678901"
                maxLength={11}
                value={formData.pesel}
                onChange={handleChange}
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                PESEL jest potrzebny do umowy najmu okazjonalnego
              </p>
            </div>
          </div>
        </Card>

        {/* Property Assignment */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-6">Przypisanie do nieruchomosci</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label htmlFor="propertyId">Nieruchomosc</Label>
              <select
                id="propertyId"
                name="propertyId"
                value={formData.propertyId}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Wybierz nieruchomosc --</option>
                {mockProperties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name} - {property.address}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Mozesz przypisac najemce do nieruchomosci pozniej
              </p>
            </div>

            <div>
              <Label htmlFor="moveInDate">Data wprowadzenia</Label>
              <Input
                id="moveInDate"
                name="moveInDate"
                type="date"
                value={formData.moveInDate}
                onChange={handleChange}
                className="mt-1"
              />
            </div>
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
              rows={4}
              placeholder="Dodatkowe informacje o najemcy..."
              value={formData.notes}
              onChange={handleChange}
              className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/tenants">
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
                Zapisz najemce
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
