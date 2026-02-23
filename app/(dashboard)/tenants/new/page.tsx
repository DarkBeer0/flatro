// app/(dashboard)/tenants/new/page.tsx
// REFACTORED: Instead of creating a "bot" tenant record,
// this page now creates an invitation link for a selected property.
// The tenant will register themselves via the invite link.

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Home, UserPlus, Copy, Check, Loader2, Mail, MapPin, LinkIcon, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useLocale } from '@/lib/i18n/context'

interface Property {
  id: string
  name: string
  address: string
  city: string
  status: 'VACANT' | 'OCCUPIED' | 'RESERVED'
  rent: number | null
  tenants: { id: string; isActive: boolean }[]
}

export default function InviteTenantPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    }>
      <InviteTenantForm />
    </Suspense>
  )
}

function InviteTenantForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedPropertyId = searchParams.get('propertyId')
  const { t } = useLocale()

  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(preselectedPropertyId)

  // Invite form state
  const [email, setEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    } catch (err) {
      console.error('Error fetching properties:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedPropertyId) return

    setCreating(true)
    setError(null)

    try {
      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          propertyId: selectedPropertyId,
          email: email.trim() || null,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Ошибка создания приглашения')
        setCreating(false)
        return
      }

      const data = await res.json()
      const baseUrl = window.location.origin
      setInviteLink(`${baseUrl}/invite/${data.code}`)
    } catch (err) {
      setError('Ошибка сети')
    } finally {
      setCreating(false)
    }
  }

  function handleCopy() {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleReset() {
    setInviteLink(null)
    setEmail('')
    setSelectedPropertyId(null)
    setCopied(false)
  }

  const selectedProperty = properties.find(p => p.id === selectedPropertyId)
  // Show all properties but highlight vacant ones
  const vacantProperties = properties.filter(p => p.status === 'VACANT')
  const occupiedProperties = properties.filter(p => p.status !== 'VACANT')

  const statusConfig: Record<string, { label: string; color: string }> = {
    VACANT: { label: t.properties.status.vacant, color: 'bg-green-100 text-green-800' },
    OCCUPIED: { label: t.properties.status.occupied, color: 'bg-blue-100 text-blue-800' },
    RESERVED: { label: t.properties.status.reserved, color: 'bg-yellow-100 text-yellow-800' },
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
        <Link href="/tenants">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t.common.back}
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.tenants.addNew}</h1>
          <p className="text-gray-500 text-sm">Создайте ссылку-приглашение для нового жильца</p>
        </div>
      </div>

      {/* Success state - show invite link */}
      {inviteLink ? (
        <Card className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Приглашение создано!</h2>
            <p className="text-gray-600 text-sm">
              Отправьте эту ссылку жильцу для регистрации
              {selectedProperty && (
                <> в <span className="font-medium">{selectedProperty.name}</span></>
              )}
            </p>
          </div>

          {/* Invite link */}
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <Label className="text-xs text-gray-500 mb-1 block">Ссылка-приглашение</Label>
            <div className="flex gap-2">
              <Input
                value={inviteLink}
                readOnly
                className="text-sm font-mono bg-white"
              />
              <Button onClick={handleCopy} variant="outline" className="shrink-0">
                {copied ? (
                  <><Check className="h-4 w-4 mr-1 text-green-600" /> Скопировано</>
                ) : (
                  <><Copy className="h-4 w-4 mr-1" /> Копировать</>
                )}
              </Button>
            </div>
          </div>

          {email && (
            <p className="text-sm text-gray-500 mb-4 flex items-center gap-1">
              <Mail className="h-4 w-4" />
              Только <span className="font-medium">{email}</span> сможет зарегистрироваться по этой ссылке
            </p>
          )}

          <div className="flex gap-3">
            <Button onClick={handleReset} variant="outline" className="flex-1">
              <LinkIcon className="h-4 w-4 mr-2" />
              Создать ещё
            </Button>
            <Link href="/tenants" className="flex-1">
              <Button className="w-full">
                Вернуться к списку
              </Button>
            </Link>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Step 1: Select property */}
          <Card className="p-6">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
              <Home className="h-5 w-5 text-blue-600" />
              Шаг 1: Выберите квартиру
            </h3>

            {properties.length === 0 ? (
              <div className="text-center py-8">
                <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-3">Нет добавленных квартир</p>
                <Link href="/properties/new">
                  <Button size="sm">{t.properties.addNew}</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Vacant properties first */}
                {vacantProperties.length > 0 && (
                  <>
                    {vacantProperties.map((property) => (
                      <PropertyCard
                        key={property.id}
                        property={property}
                        statusConfig={statusConfig}
                        selected={selectedPropertyId === property.id}
                        onSelect={() => setSelectedPropertyId(property.id)}
                      />
                    ))}
                  </>
                )}

                {/* Occupied properties */}
                {occupiedProperties.length > 0 && (
                  <>
                    {vacantProperties.length > 0 && occupiedProperties.length > 0 && (
                      <div className="relative my-3">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs">
                          <span className="bg-white px-2 text-gray-400">Заняты</span>
                        </div>
                      </div>
                    )}
                    {occupiedProperties.map((property) => (
                      <PropertyCard
                        key={property.id}
                        property={property}
                        statusConfig={statusConfig}
                        selected={selectedPropertyId === property.id}
                        onSelect={() => setSelectedPropertyId(property.id)}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </Card>

          {/* Step 2: Create invite (shown only when property selected) */}
          {selectedPropertyId && (
            <Card className="p-6">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
                <UserPlus className="h-5 w-5 text-blue-600" />
                Шаг 2: Создайте приглашение
              </h3>

              <form onSubmit={handleCreateInvite} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <Label htmlFor="email">Email жильца (опционально)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="tenant@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Если указать — только этот email сможет зарегистрироваться
                  </p>
                </div>

                <Button type="submit" className="w-full" disabled={creating}>
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <LinkIcon className="h-4 w-4 mr-2" />
                      Создать ссылку-приглашение
                    </>
                  )}
                </Button>
              </form>
            </Card>
          )}

          {/* Info block */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
            <p className="font-medium mb-1">Как это работает?</p>
            <ol className="list-decimal list-inside space-y-1 text-blue-700">
              <li>Вы создаёте ссылку-приглашение для выбранной квартиры</li>
              <li>Отправляете ссылку жильцу (email, мессенджер, лично)</li>
              <li>Жилец переходит по ссылке, регистрируется и заполняет свои данные</li>
              <li>Жилец появляется в вашей системе с полным доступом к личному кабинету</li>
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Property selection card ──
function PropertyCard({
  property,
  statusConfig,
  selected,
  onSelect,
}: {
  property: Property
  statusConfig: Record<string, { label: string; color: string }>
  selected: boolean
  onSelect: () => void
}) {
  const status = statusConfig[property.status] || statusConfig.VACANT

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-lg border-2 transition-all ${
        selected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 hover:border-gray-300 bg-white'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${selected ? 'bg-blue-100' : 'bg-gray-100'}`}>
            <Home className={`h-4 w-4 ${selected ? 'text-blue-600' : 'text-gray-500'}`} />
          </div>
          <div>
            <p className="font-medium text-gray-900">{property.name}</p>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {property.address}, {property.city}
            </p>
          </div>
        </div>
        <Badge className={status.color}>{status.label}</Badge>
      </div>
    </button>
  )
}