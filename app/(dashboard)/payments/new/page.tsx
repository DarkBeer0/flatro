// app/(dashboard)/payments/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, CreditCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useLocale } from '@/lib/i18n/context'

interface Tenant {
  id: string
  firstName: string
  lastName: string
  property: {
    id: string
    name: string
  } | null
}

export default function NewPaymentPage() {
  const router = useRouter()
  const { t } = useLocale()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])

  const [formData, setFormData] = useState({
    tenantId: '',
    amount: '',
    type: 'RENT',
    dueDate: '',
    period: '',
    notes: '',
  })

  useEffect(() => {
    async function fetchTenants() {
      try {
        const res = await fetch('/api/tenants')
        if (res.ok) {
          const data = await res.json()
          // Только активные арендаторы
          setTenants(data.filter((t: any) => t.isActive))
        }
      } catch (error) {
        console.error('Error fetching tenants:', error)
      }
    }
    fetchTenants()

    // Установить текущий месяц как период по умолчанию
    const now = new Date()
    const period = now.toISOString().slice(0, 7) // YYYY-MM
    const dueDate = new Date(now.getFullYear(), now.getMonth(), 10).toISOString().slice(0, 10)
    setFormData(prev => ({ ...prev, period, dueDate }))
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to create payment')
      }

      router.push('/payments')
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
        <Link href="/payments">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t.common.back}
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.payments.addNew}</h1>
          <p className="text-gray-500 text-sm">{t.dashboard.addPaymentDesc}</p>
        </div>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Арендатор */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              {t.forms.basicInfo}
            </h3>

            <div>
              <Label htmlFor="tenantId">{t.payments.tenant} *</Label>
              <select
                id="tenantId"
                name="tenantId"
                value={formData.tenantId}
                onChange={handleChange}
                required
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{t.forms.selectOption}</option>
                {tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.firstName} {tenant.lastName}
                    {tenant.property && ` — ${tenant.property.name}`}
                  </option>
                ))}
              </select>
              {tenants.length === 0 && (
                <p className="text-sm text-yellow-600 mt-1">
                  Нет активных арендаторов. <Link href="/tenants/new" className="text-blue-600 underline">Добавьте арендатора</Link>
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">{t.payments.type} *</Label>
                <select
                  id="type"
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="RENT">{t.payments.types.rent}</option>
                  <option value="UTILITIES">{t.payments.types.utilities}</option>
                  <option value="DEPOSIT">{t.payments.types.deposit}</option>
                  <option value="OTHER">{t.payments.types.other}</option>
                </select>
              </div>

              <div>
                <Label htmlFor="amount">{t.payments.amount} ({t.common.currency}) *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  placeholder="3500"
                  value={formData.amount}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="period">{t.payments.period}</Label>
                <Input
                  id="period"
                  name="period"
                  type="month"
                  value={formData.period}
                  onChange={handleChange}
                />
              </div>

              <div>
                <Label htmlFor="dueDate">{t.payments.dueDate} *</Label>
                <Input
                  id="dueDate"
                  name="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>

          {/* Заметки */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t.forms.notes}</Label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              placeholder="Дополнительная информация..."
              value={formData.notes}
              onChange={handleChange}
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Кнопки */}
          <div className="flex gap-3 pt-4">
            <Link href="/payments" className="flex-1">
              <Button type="button" variant="outline" className="w-full">
                {t.common.cancel}
              </Button>
            </Link>
            <Button type="submit" className="flex-1" disabled={loading || tenants.length === 0}>
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
