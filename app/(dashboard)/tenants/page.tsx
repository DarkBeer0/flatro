// app/(dashboard)/tenants/page.tsx
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Users, Loader2, Trash2, Phone, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLocale } from '@/lib/i18n/context'

interface Tenant {
  id: string
  firstName: string
  lastName: string
  email: string | null
  phone: string | null
  isActive: boolean
  moveInDate: string | null
  property: {
    id: string
    name: string
    address: string
  } | null
}

export default function TenantsPage() {
  const { t } = useLocale()
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTenants()
  }, [])

  async function fetchTenants() {
    try {
      const res = await fetch('/api/tenants')
      if (res.ok) {
        const data = await res.json()
        setTenants(data)
      }
    } catch (error) {
      console.error('Error fetching tenants:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Вы уверены что хотите удалить этого арендатора?')) return

    try {
      const res = await fetch(`/api/tenants/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setTenants(tenants.filter(t => t.id !== id))
      }
    } catch (error) {
      console.error('Error deleting tenant:', error)
    }
  }

  const activeTenants = tenants.filter(t => t.isActive)
  const inactiveTenants = tenants.filter(t => !t.isActive)

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
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">{t.tenants.title}</h1>
          <p className="text-gray-500 mt-1 text-sm lg:text-base">{t.tenants.subtitle}</p>
        </div>
        <Link href="/tenants/new">
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            {t.tenants.addNew}
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 lg:gap-4 mb-6">
        <Card className="p-3 lg:p-4 text-center">
          <p className="text-2xl lg:text-3xl font-bold">{tenants.length}</p>
          <p className="text-xs lg:text-sm text-gray-500">{t.tenants.total}</p>
        </Card>
        <Card className="p-3 lg:p-4 text-center">
          <p className="text-2xl lg:text-3xl font-bold text-green-600">{activeTenants.length}</p>
          <p className="text-xs lg:text-sm text-gray-500">{t.tenants.active}</p>
        </Card>
        <Card className="p-3 lg:p-4 text-center">
          <p className="text-2xl lg:text-3xl font-bold text-gray-400">{inactiveTenants.length}</p>
          <p className="text-xs lg:text-sm text-gray-500">{t.tenants.former}</p>
        </Card>
      </div>

      {/* Tenant List */}
      {tenants.length === 0 ? (
        <Card className="p-8 lg:p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">{t.tenants.noTenants}</h3>
          <p className="text-gray-500 mb-4">{t.tenants.noTenantsDesc}</p>
          <Link href="/tenants/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t.tenants.addNew}
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Active Tenants */}
          {activeTenants.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">{t.tenants.activeTenants}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeTenants.map((tenant) => (
                  <TenantCard 
                    key={tenant.id} 
                    tenant={tenant} 
                    t={t} 
                    onDelete={handleDelete} 
                  />
                ))}
              </div>
            </div>
          )}

          {/* Former Tenants */}
          {inactiveTenants.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-gray-500">{t.tenants.formerTenants}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inactiveTenants.map((tenant) => (
                  <TenantCard 
                    key={tenant.id} 
                    tenant={tenant} 
                    t={t} 
                    onDelete={handleDelete} 
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function TenantCard({ tenant, t, onDelete }: { tenant: Tenant; t: any; onDelete: (id: string) => void }) {
  return (
    <Card className={`p-4 ${!tenant.isActive ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-medium">
              {tenant.firstName[0]}{tenant.lastName[0]}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">
              {tenant.firstName} {tenant.lastName}
            </h3>
            <Badge className={tenant.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
              {tenant.isActive ? t.tenants.status.active : t.tenants.status.inactive}
            </Badge>
          </div>
        </div>
      </div>

      {tenant.property ? (
        <Link href={`/properties/${tenant.property.id}`} className="block mb-3">
          <div className="text-sm text-gray-600 hover:text-blue-600">
            📍 {tenant.property.name}
          </div>
        </Link>
      ) : (
        <p className="text-sm text-gray-400 mb-3">{t.tenants.noProperty}</p>
      )}

      <div className="space-y-1 text-sm text-gray-500 mb-3">
        {tenant.phone && (
          <div className="flex items-center gap-2">
            <Phone className="h-3 w-3" />
            {tenant.phone}
          </div>
        )}
        {tenant.email && (
          <div className="flex items-center gap-2">
            <Mail className="h-3 w-3" />
            {tenant.email}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <Link href={`/tenants/${tenant.id}`} className="flex-1">
          <Button variant="outline" size="sm" className="w-full">
            {t.common.details}
          </Button>
        </Link>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => onDelete(tenant.id)}
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  )
}
