// app/(dashboard)/properties/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Building2, MapPin, Loader2, Home, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLocale } from '@/lib/i18n/context'

interface Property {
  id: string
  name: string
  address: string
  city: string
  area: number | null
  rooms: number | null
  floor: number | null
  status: 'VACANT' | 'OCCUPIED' | 'RESERVED'
  tenants: { id: string; firstName: string; lastName: string }[]
  contracts: { id: string; rentAmount: number }[]
}

export default function PropertiesPage() {
  const { t } = useLocale()
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProperties()
  }, [])

  async function fetchProperties() {
    try {
      const res = await fetch('/api/properties')
      if (res.ok) {
        const data = await res.json()
        setProperties(data)
      }
    } catch (error) {
      console.error('Error fetching properties:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Вы уверены что хотите удалить эту недвижимость?')) return

    try {
      const res = await fetch(`/api/properties/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setProperties(properties.filter(p => p.id !== id))
      }
    } catch (error) {
      console.error('Error deleting property:', error)
    }
  }

  const statusConfig = {
    VACANT: { label: t.properties.status.vacant, color: 'bg-green-100 text-green-800' },
    OCCUPIED: { label: t.properties.status.occupied, color: 'bg-blue-100 text-blue-800' },
    RESERVED: { label: t.properties.status.reserved, color: 'bg-yellow-100 text-yellow-800' },
  }

  const stats = {
    total: properties.length,
    vacant: properties.filter(p => p.status === 'VACANT').length,
    occupied: properties.filter(p => p.status === 'OCCUPIED').length,
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{t.properties.title}</h1>
          <p className="text-gray-500 mt-1 text-sm lg:text-base">{t.properties.subtitle}</p>
        </div>
        <Link href="/properties/new">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            {t.properties.addNew}
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 lg:gap-4 mb-6">
        <Card className="p-3 lg:p-4 text-center">
          <p className="text-2xl lg:text-3xl font-bold">{stats.total}</p>
          <p className="text-xs lg:text-sm text-gray-500">{t.properties.total}</p>
        </Card>
        <Card className="p-3 lg:p-4 text-center">
          <p className="text-2xl lg:text-3xl font-bold text-green-600">{stats.vacant}</p>
          <p className="text-xs lg:text-sm text-gray-500">{t.properties.vacantCount}</p>
        </Card>
        <Card className="p-3 lg:p-4 text-center">
          <p className="text-2xl lg:text-3xl font-bold text-blue-600">{stats.occupied}</p>
          <p className="text-xs lg:text-sm text-gray-500">{t.properties.rentedCount}</p>
        </Card>
      </div>

      {/* Property List */}
      {properties.length === 0 ? (
        <Card className="p-8 lg:p-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t.properties.noProperties}</h3>
          <p className="text-gray-500 mb-4">{t.properties.noPropertiesDesc}</p>
          <Link href="/properties/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t.properties.addNew}
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map((property) => {
            const status = statusConfig[property.status]
            const activeTenant = property.tenants[0]
            const activeContract = property.contracts[0]

            return (
              <Card key={property.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Home className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{property.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-gray-500">
                        <MapPin className="h-3 w-3" />
                        {property.city}
                      </div>
                    </div>
                  </div>
                  <Badge className={status.color}>{status.label}</Badge>
                </div>

                <p className="text-sm text-gray-600 mb-3">{property.address}</p>

                <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
                  {property.area && <span>{property.area} m²</span>}
                  {property.rooms && <span>• {property.rooms} {t.properties.rooms}</span>}
                  {property.floor !== null && <span>• {t.properties.floor} {property.floor}</span>}
                </div>

                {activeContract && (
                  <div className="bg-gray-50 rounded-lg p-2 mb-3">
                    <p className="text-sm font-medium">{activeContract.rentAmount} {t.common.currency}{t.common.perMonth}</p>
                    {activeTenant && (
                      <p className="text-xs text-gray-500">
                        {activeTenant.firstName} {activeTenant.lastName}
                      </p>
                    )}
                  </div>
                )}

                {!activeTenant && (
                  <p className="text-sm text-gray-400 mb-3">{t.properties.noTenant}</p>
                )}

                <div className="flex gap-2">
                  <Link href={`/properties/${property.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      {t.common.details}
                    </Button>
                  </Link>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDelete(property.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
