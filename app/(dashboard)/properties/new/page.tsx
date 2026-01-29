// app/(dashboard)/properties/new/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLocale } from '@/lib/i18n/context'

export default function NewPropertyPage() {
  const router = useRouter()
  const { t } = useLocale()
  const [loading, setLoading] = useState(false)
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
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create property')
      }

      router.push('/properties')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/properties">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t.common.back}
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.properties.addNew}</h1>
          <p className="text-gray-500 text-sm">{t.dashboard.addPropertyDesc}</p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Основная информация */}
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
                  placeholder="Квартира на Мокотове"
                  value={formData.name}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="address">Адрес *</Label>
                <Input
                  id="address"
                  name="address"
                  placeholder="ул. Пулавска 123, кв. 45"
                  value={formData.address}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="city">Город *</Label>
                <Input
                  id="city"
                  name="city"
                  placeholder="Варшава"
                  value={formData.city}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <Label htmlFor="postalCode">Почтовый индекс</Label>
                <Input
                  id="postalCode"
                  name="postalCode"
                  placeholder="00-000"
                  value={formData.postalCode}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          {/* Характеристики */}
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

          {/* Описание */}
          <div className="space-y-2">
            <Label htmlFor="description">{t.forms.notes}</Label>
            <textarea
              id="description"
              name="description"
              rows={3}
              placeholder="Дополнительная информация о недвижимости..."
              value={formData.description}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Кнопки */}
          <div className="flex gap-3 pt-4">
            <Link href="/properties" className="flex-1">
              <Button type="button" variant="outline" className="w-full">
                {t.common.cancel}
              </Button>
            </Link>
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? (
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
