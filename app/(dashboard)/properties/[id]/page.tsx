// app/(dashboard)/properties/[id]/page.tsx
// Flatro — Property Detail Page
// UPDATED: scrollable Contracts/Meters blocks + working Meters button
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeft, Home, MapPin, Loader2, Users, FileText, 
  CreditCard, Edit, Trash2, SquareStack, Zap, Flame, 
  Droplets, Thermometer, BarChart3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { InviteTenant } from '@/components/invite-tenant'
import { useLocale } from '@/lib/i18n/context'

// ============================================
// Types
// ============================================

interface Property {
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
  tenants: {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone: string | null
    isActive: boolean
  }[]
  contracts: {
    id: string
    type: string
    status: string
    startDate: string
    endDate: string | null
    rentAmount: number
  }[]
  meters: {
    id: string
    type: string
    meterNumber: string | null
  }[]
}

interface Invitation {
  id: string
  code: string
  email: string | null
  expiresAt: string
  usedAt: string | null
}

// ============================================
// Meter type config (PL labels + icons)
// ============================================

const METER_TYPE_CONFIG: Record<string, { label: string; icon: typeof Zap; color: string; bgColor: string }> = {
  ELECTRICITY: { label: 'Prąd', icon: Zap, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  GAS:         { label: 'Gaz', icon: Flame, color: 'text-orange-600', bgColor: 'bg-orange-100' },
  WATER_COLD:  { label: 'Woda zimna', icon: Droplets, color: 'text-blue-600', bgColor: 'bg-blue-100' },
  WATER_HOT:   { label: 'Woda ciepła', icon: Droplets, color: 'text-red-500', bgColor: 'bg-red-100' },
  HEATING:     { label: 'Ogrzewanie', icon: Thermometer, color: 'text-rose-600', bgColor: 'bg-rose-100' },
}

// ============================================
// Main Component
// ============================================

export default function PropertyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { t } = useLocale()
  const propertyId = params.id as string

  const [property, setProperty] = useState<Property | null>(null)
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    fetchData()
  }, [propertyId])

  async function fetchData() {
    try {
      const [propertyRes, invitationsRes] = await Promise.all([
        fetch(`/api/properties/${propertyId}`),
        fetch(`/api/invitations?propertyId=${propertyId}`)
      ])

      if (propertyRes.ok) {
        const data = await propertyRes.json()
        setProperty(data)
      } else {
        router.push('/properties')
      }

      if (invitationsRes.ok) {
        const data = await invitationsRes.json()
        setInvitations(data)
      }
    } catch (error) {
      console.error('Error fetching property:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete() {
    if (!confirm('Вы уверены что хотите удалить эту недвижимость? Все связанные данные будут удалены.'))
      return

    setDeleting(true)
    try {
      const res = await fetch(`/api/properties/${propertyId}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/properties')
      }
    } catch (error) {
      console.error('Error deleting property:', error)
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!property) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Объект не найден</p>
        <Link href="/properties">
          <Button variant="outline" className="mt-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t.common.back}
          </Button>
        </Link>
      </div>
    )
  }

  const statusConfig: Record<string, { label: string; color: string }> = {
    VACANT:   { label: t.properties.status.vacant, color: 'bg-green-100 text-green-800' },
    OCCUPIED: { label: t.properties.status.occupied, color: 'bg-blue-100 text-blue-800' },
    RESERVED: { label: t.properties.status.reserved, color: 'bg-yellow-100 text-yellow-800' },
  }

  const status = statusConfig[property.status] || statusConfig.VACANT
  const activeTenants = property.tenants.filter(t => t.isActive)
  const activeContract = property.contracts.find(c => c.status === 'ACTIVE')

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back */}
      <Link
        href="/properties"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        {t.properties.title}
      </Link>

      {/* Header Card */}
      <Card className="p-4 lg:p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Home className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
                  <Badge className={status.color}>{status.label}</Badge>
                </div>
                <p className="text-gray-600 flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {property.address}, {property.city}
                  {property.postalCode && `, ${property.postalCode}`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Link href={`/properties/${property.id}/edit`}>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                {t.common.edit}
              </Button>
            </Link>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleDelete}
              disabled={deleting}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Property Details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t">
          {property.area && (
            <div>
              <p className="text-sm text-gray-500">{t.properties.area}</p>
              <p className="font-semibold">{property.area} m²</p>
            </div>
          )}
          {property.rooms && (
            <div>
              <p className="text-sm text-gray-500">{t.properties.rooms}</p>
              <p className="font-semibold">{property.rooms}</p>
            </div>
          )}
          {property.floor !== null && (
            <div>
              <p className="text-sm text-gray-500">{t.properties.floor}</p>
              <p className="font-semibold">{property.floor}</p>
            </div>
          )}
          {activeContract && (
            <div>
              <p className="text-sm text-gray-500">Аренда</p>
              <p className="font-semibold">{activeContract.rentAmount} {t.common.currency}/мес</p>
            </div>
          )}
        </div>

        {property.description && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500 mb-1">Описание</p>
            <p className="text-gray-700">{property.description}</p>
          </div>
        )}
      </Card>

      {/* Quick Navigation — Utilities module */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Link href={`/properties/${property.id}/meters`}>
          <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-yellow-100 rounded-lg group-hover:bg-yellow-200 transition-colors">
                <SquareStack className="h-4 w-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Liczniki</p>
                <p className="text-xs text-gray-400">{property.meters.length} szt.</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href={`/properties/${property.id}/utilities`}>
          <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                <CreditCard className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Opłaty i taryfy</p>
                <p className="text-xs text-gray-400">Stałe opłaty</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href={`/properties/${property.id}/meters`}>
          <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                <BarChart3 className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Odczyty</p>
                <p className="text-xs text-gray-400">Podaj odczyt</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href={`/properties/${property.id}/settlements`}>
          <Card className="p-3 hover:shadow-md transition-shadow cursor-pointer group">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-purple-100 rounded-lg group-hover:bg-purple-200 transition-colors">
                <FileText className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Rozliczenia</p>
                <p className="text-xs text-gray-400">Rozlicz media</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>

      {/* Two-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ─── Tenants ──────────────────────────── */}
        <Card className="p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-green-600" />
              {t.tenants.title}
            </h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                document.getElementById('invite-section')?.scrollIntoView({ behavior: 'smooth' })
              }}
            >
              + Пригласить
            </Button>
          </div>

          {activeTenants.length > 0 ? (
            <div className="space-y-3">
              {activeTenants.map((tenant) => (
                <div key={tenant.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 font-medium">
                        {tenant.firstName[0]}{tenant.lastName[0]}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium">{tenant.firstName} {tenant.lastName}</p>
                      {tenant.email && <p className="text-sm text-gray-500">{tenant.email}</p>}
                    </div>
                  </div>
                  <Link href={`/tenants/${tenant.id}`}>
                    <Button size="sm" variant="ghost">{t.common.details}</Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">{t.properties.noTenant}</p>
          )}
        </Card>

        {/* ─── Invite Tenant ────────────────────── */}
        <div id="invite-section">
        <InviteTenant
          propertyId={property.id}
          propertyName={property.name}
          invitations={invitations}
          onInvitationCreated={fetchData}
        />
      </div>

        {/* ─── Contracts (SCROLLABLE) ───────────── */}
        <Card className="p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-600" />
              {t.contracts.title}
              {property.contracts.length > 0 && (
                <span className="text-xs font-normal text-gray-400">
                  ({property.contracts.length})
                </span>
              )}
            </h3>
            <Link href={`/contracts/new?propertyId=${property.id}`}>
              <Button size="sm" variant="outline">+ Добавить</Button>
            </Link>
          </div>

          {property.contracts.length > 0 ? (
            <div className="max-h-[360px] overflow-y-auto pr-1 space-y-3 scrollbar-thin">
              {property.contracts.map((contract) => (
                <Link key={contract.id} href={`/contracts/${contract.id}`}>
                  <div className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="outline">{contract.type}</Badge>
                      <Badge className={
                        contract.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                        contract.status === 'TERMINATED' ? 'bg-red-100 text-red-700' :
                        contract.status === 'SIGNED' ? 'bg-blue-100 text-blue-800' :
                        contract.status === 'PENDING_SIGNATURE' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {contract.status}
                      </Badge>
                    </div>
                    <p className="font-medium">{contract.rentAmount} {t.common.currency}/мес</p>
                    <p className="text-sm text-gray-500">
                      {new Date(contract.startDate).toLocaleDateString('pl-PL')} —{' '}
                      {contract.endDate ? new Date(contract.endDate).toLocaleDateString('pl-PL') : 'бессрочно'}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Нет договоров</p>
          )}
        </Card>

        {/* ─── Meters (SCROLLABLE + WORKING BUTTON) ─── */}
        <Card className="p-4 lg:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <SquareStack className="h-5 w-5 text-yellow-600" />
              Счётчики
              {property.meters.length > 0 && (
                <span className="text-xs font-normal text-gray-400">
                  ({property.meters.length})
                </span>
              )}
            </h3>
            <Link href={`/properties/${property.id}/meters`}>
              <Button size="sm" variant="outline">+ Добавить</Button>
            </Link>
          </div>

          {property.meters.length > 0 ? (
            <div className="max-h-[360px] overflow-y-auto pr-1 space-y-2 scrollbar-thin">
              {property.meters.map((meter) => {
                const cfg = METER_TYPE_CONFIG[meter.type]
                const MeterIcon = cfg?.icon || SquareStack
                return (
                  <div key={meter.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${cfg?.bgColor || 'bg-gray-100'}`}>
                        <MeterIcon className={`h-4 w-4 ${cfg?.color || 'text-gray-600'}`} />
                      </div>
                      <div>
                        <p className="font-medium">{cfg?.label || meter.type}</p>
                        {meter.meterNumber && <p className="text-sm text-gray-500">№ {meter.meterNumber}</p>}
                      </div>
                    </div>
                    <Link href={`/properties/${property.id}/meters`}>
                      <Button size="sm" variant="ghost">Показания</Button>
                    </Link>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Нет счётчиков</p>
          )}
        </Card>
      </div>
    </div>
  )
}