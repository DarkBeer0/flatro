'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function NewPropertyPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    postalCode: '',
    area: '',
    rooms: '',
    floor: '',
    description: '',
    rentAmount: '',
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
      
      // Przekieruj do listy nieruchomosci
      router.push('/properties')
    } catch (error) {
      console.error('Error saving property:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link 
          href="/properties" 
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Powrot do listy
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Dodaj nieruchomosc</h1>
        <p className="text-gray-500 mt-1">Wypelnij dane nowej nieruchomosci</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Basic Info */}
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold">Podstawowe informacje</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <Label htmlFor="name">Nazwa nieruchomosci *</Label>
              <Input
                id="name"
                name="name"
                placeholder="np. Mieszkanie Mokotow"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1"
              />
              <p className="text-xs text-gray-500 mt-1">
                Wlasna nazwa ulatwiajaca identyfikacje
              </p>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="address">Adres *</Label>
              <Input
                id="address"
                name="address"
                placeholder="ul. Przykladowa 123/45"
                value={formData.address}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="city">Miasto *</Label>
              <Input
                id="city"
                name="city"
                placeholder="Warszawa"
                value={formData.city}
                onChange={handleChange}
                required
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="postalCode">Kod pocztowy</Label>
              <Input
                id="postalCode"
                name="postalCode"
                placeholder="00-000"
                value={formData.postalCode}
                onChange={handleChange}
                className="mt-1"
              />
            </div>
          </div>
        </Card>

        {/* Property Details */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-6">Szczegoly nieruchomosci</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <Label htmlFor="area">Powierzchnia (m²)</Label>
              <Input
                id="area"
                name="area"
                type="number"
                min="1"
                placeholder="50"
                value={formData.area}
                onChange={handleChange}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="rooms">Liczba pokoi</Label>
              <Input
                id="rooms"
                name="rooms"
                type="number"
                min="1"
                placeholder="2"
                value={formData.rooms}
                onChange={handleChange}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="floor">Pietro</Label>
              <Input
                id="floor"
                name="floor"
                type="number"
                min="0"
                placeholder="3"
                value={formData.floor}
                onChange={handleChange}
                className="mt-1"
              />
            </div>

            <div className="md:col-span-3">
              <Label htmlFor="description">Opis</Label>
              <textarea
                id="description"
                name="description"
                rows={3}
                placeholder="Dodatkowe informacje o nieruchomosci..."
                value={formData.description}
                onChange={handleChange}
                className="mt-1 w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </Card>

        {/* Financial */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold mb-6">Informacje finansowe</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="rentAmount">Czynsz miesieczny (zl)</Label>
              <Input
                id="rentAmount"
                name="rentAmount"
                type="number"
                min="0"
                placeholder="3000"
                value={formData.rentAmount}
                onChange={handleChange}
                className="mt-1"
              />
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/properties">
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
                Zapisz nieruchomosc
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
