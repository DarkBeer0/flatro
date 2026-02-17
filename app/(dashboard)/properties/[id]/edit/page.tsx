// app/(dashboard)/properties/[id]/edit/page.tsx
// Flatro — Property Edit Page
// FIX: This page was missing, causing 404 when clicking "Edit" on property detail
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLocale } from '@/lib/i18n/context'

interface PropertyData {
  id: string
  name: string
  address: string
  city: string
  postalCode: string | null
  area: number | null
  rooms: number | null
  floor: number | null
  description: string | null
  status: 'VACANT' | 'OCCUPIED' | 'RESERVED'
}

export default function EditPropertyPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useLocale()
  const propertyId = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    postalCode: '',
    area: '',
    rooms: '',
    floor: '',
    description: '',
    status: 'VACANT' as string,
  })

  // Load existing property data
  useEffect(() => {
    async function fetchProperty() {
      try {
        const res = await fetch(`/api/properties/${propertyId}`)
        if (!res.ok) {
          router.push('/properties')
          return
        }
        const data: PropertyData = await res.json()
        setFormData({
          name: data.name || '',
          address: data.address || '',
          city: data.city || '',
          postalCode: data.postalCode || '',
          area: data.area?.toString() || '',
          rooms: data.rooms?.toString() || '',
          floor: data.floor?.toString() || '',
          description: data.description || '',
          status: data.status || 'VACANT',
        })
      } catch (err) {
        console.error('Error fetching property:', err)
        setError('Nie udało się załadować danych nieruchomości')
      } finally {
        setLoading(false)
      }
    }
    fetchProperty()
  }, [propertyId, router])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/properties/${propertyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Błąd aktualizacji')
      }

      router.push(`/properties/${propertyId}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Wystąpił nieoczekiwany błąd')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/properties/${propertyId}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t.common.back}
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {t.common.edit}: {formData.name || t.properties.title}
          </h1>
          <p className="text-gray-500 text-sm">Edytuj dane nieruchomości</p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Form */}
      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic info */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              {t.forms.basicInfo}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="name">{t.properties.title} *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="np. Mieszkanie na Mokotowie"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address">Adres *</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="ul. Przykładowa 10/5"
                  required
                />
              </div>

              <div>
                <Label htmlFor="city">Miasto *</Label>
                <Input
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  placeholder="Warszawa"
                  required
                />
              </div>

              <div>
                <Label htmlFor="postalCode">Kod pocztowy</Label>
                <Input
                  id="postalCode"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleChange}
                  placeholder="00-000"
                />
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">{t.forms.propertyDetails}</h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="area">{t.properties.area} (m²)</Label>
                <Input
                  id="area"
                  name="area"
                  type="number"
                  step="0.1"
                  placeholder="50"
                  value={formData.area}
                  onChange={handleChange}
                />
              </div>

              <div>
                <Label htmlFor="rooms">{t.properties.rooms}</Label>
                <Input
                  id="rooms"
                  name="rooms"
                  type="number"
                  placeholder="2"
                  value={formData.rooms}
                  onChange={handleChange}
                />
              </div>

              <div>
                <Label htmlFor="floor">{t.properties.floor}</Label>
                <Input
                  id="floor"
                  name="floor"
                  type="number"
                  placeholder="3"
                  value={formData.floor}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="VACANT">{t.properties.status.vacant}</option>
              <option value="OCCUPIED">{t.properties.status.occupied}</option>
              <option value="RESERVED">{t.properties.status.reserved}</option>
            </select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">{t.forms.notes}</Label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Dodatkowe informacje o nieruchomości..."
              value={formData.description}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <Link href={`/properties/${propertyId}`} className="flex-1">
              <Button type="button" variant="outline" className="w-full">
                {t.common.cancel}
              </Button>
            </Link>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t.common.loading}
                </>
              ) : (
                t.common.save
              )}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}