// app/(tenant)/tenant/payments/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { CreditCard, Clock, CheckCircle, AlertTriangle, Copy, Check, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface Payment {
  id: string
  amount: number
  type: 'RENT' | 'UTILITIES' | 'DEPOSIT' | 'OTHER'
  status: 'PENDING' | 'PENDING_CONFIRMATION' | 'PAID' | 'OVERDUE' | 'REJECTED' | 'CANCELLED'
  dueDate: string
  paidDate: string | null
  period: string | null
  notes: string | null
  rejectionReason: string | null
  owner: {
    bankName: string | null
    iban: string | null
    accountHolder: string | null
  }
}

export default function TenantPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)

  useEffect(() => {
    fetchPayments()
  }, [])

  async function fetchPayments() {
    try {
      const res = await fetch('/api/tenant/payments')
      if (res.ok) {
        const data = await res.json()
        setPayments(data)
      }
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }

  async function markAsPaid(paymentId: string) {
    setMarkingPaid(paymentId)
    try {
      const res = await fetch(`/api/tenant/payments/${paymentId}/mark-paid`, {
        method: 'POST'
      })
      if (res.ok) {
        setPayments(payments.map(p => 
          p.id === paymentId ? { ...p, status: 'PENDING_CONFIRMATION' as const } : p
        ))
      }
    } catch (error) {
      console.error('Error marking as paid:', error)
    } finally {
      setMarkingPaid(null)
    }
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  const statusConfig = {
    PENDING: { label: 'Ожидает оплаты', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
    PENDING_CONFIRMATION: { label: 'Ожидает подтверждения', color: 'bg-blue-100 text-blue-800', icon: Clock },
    PAID: { label: 'Оплачено', color: 'bg-green-100 text-green-800', icon: CheckCircle },
    OVERDUE: { label: 'Просрочено', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
    REJECTED: { label: 'Отклонено', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
    CANCELLED: { label: 'Отменено', color: 'bg-gray-100 text-gray-800', icon: Clock },
  }

  const typeLabels = {
    RENT: 'Аренда',
    UTILITIES: 'Коммунальные',
    DEPOSIT: 'Залог',
    OTHER: 'Другое',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  const pendingPayments = payments.filter(p => p.status === 'PENDING' || p.status === 'OVERDUE')
  const waitingConfirmation = payments.filter(p => p.status === 'PENDING_CONFIRMATION')
  const completedPayments = payments.filter(p => p.status === 'PAID' || p.status === 'REJECTED' || p.status === 'CANCELLED')

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Мои платежи</h1>
        <p className="text-gray-500 mt-1">Управление оплатой аренды</p>
      </div>

      {payments.length === 0 ? (
        <Card className="p-8 text-center">
          <CreditCard className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Нет платежей</h3>
          <p className="text-gray-500">У вас пока нет платежей для оплаты</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* К оплате */}
          {pendingPayments.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                К оплате ({pendingPayments.length})
              </h2>
              <div className="space-y-4">
                {pendingPayments.map((payment) => (
                  <PaymentCard
                    key={payment.id}
                    payment={payment}
                    statusConfig={statusConfig}
                    typeLabels={typeLabels}
                    onMarkPaid={markAsPaid}
                    markingPaid={markingPaid}
                    copiedField={copiedField}
                    onCopy={copyToClipboard}
                    showActions
                  />
                ))}
              </div>
            </div>
          )}

          {/* Ожидают подтверждения */}
          {waitingConfirmation.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Ожидают подтверждения ({waitingConfirmation.length})
              </h2>
              <div className="space-y-4">
                {waitingConfirmation.map((payment) => (
                  <PaymentCard
                    key={payment.id}
                    payment={payment}
                    statusConfig={statusConfig}
                    typeLabels={typeLabels}
                    copiedField={copiedField}
                    onCopy={copyToClipboard}
                  />
                ))}
              </div>
            </div>
          )}

          {/* История */}
          {completedPayments.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3 text-gray-500">
                История ({completedPayments.length})
              </h2>
              <div className="space-y-4">
                {completedPayments.map((payment) => (
                  <PaymentCard
                    key={payment.id}
                    payment={payment}
                    statusConfig={statusConfig}
                    typeLabels={typeLabels}
                    compact
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

function PaymentCard({
  payment,
  statusConfig,
  typeLabels,
  onMarkPaid,
  markingPaid,
  copiedField,
  onCopy,
  showActions,
  compact,
}: {
  payment: Payment
  statusConfig: any
  typeLabels: any
  onMarkPaid?: (id: string) => void
  markingPaid?: string | null
  copiedField?: string | null
  onCopy?: (text: string, field: string) => void
  showActions?: boolean
  compact?: boolean
}) {
  const status = statusConfig[payment.status]
  const StatusIcon = status.icon

  return (
    <Card className={`p-4 ${compact ? 'opacity-70' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Badge className={status.color}>
              <StatusIcon className="h-3 w-3 mr-1" />
              {status.label}
            </Badge>
            <Badge variant="outline">{typeLabels[payment.type]}</Badge>
          </div>
          <p className="text-2xl font-bold mt-2">{payment.amount} zł</p>
          {payment.period && (
            <p className="text-sm text-gray-500">За период: {payment.period}</p>
          )}
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Срок оплаты:</p>
          <p className={`font-medium ${payment.status === 'OVERDUE' ? 'text-red-600' : ''}`}>
            {new Date(payment.dueDate).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Rejection reason */}
      {payment.status === 'REJECTED' && payment.rejectionReason && (
        <div className="mb-3 p-3 bg-red-50 rounded-lg text-sm text-red-700">
          <strong>Причина отклонения:</strong> {payment.rejectionReason}
        </div>
      )}

      {/* Bank details */}
      {showActions && payment.owner.iban && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-medium text-gray-700 mb-2">Реквизиты для оплаты:</p>
          
          <div className="space-y-2">
            {payment.owner.accountHolder && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Получатель:</span>
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-white px-2 py-1 rounded">{payment.owner.accountHolder}</code>
                  {onCopy && (
                    <button onClick={() => onCopy(payment.owner.accountHolder!, `holder-${payment.id}`)}>
                      {copiedField === `holder-${payment.id}` ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">IBAN:</span>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-white px-2 py-1 rounded">{payment.owner.iban}</code>
                {onCopy && (
                  <button onClick={() => onCopy(payment.owner.iban!, `iban-${payment.id}`)}>
                    {copiedField === `iban-${payment.id}` ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                )}
              </div>
            </div>

            {payment.owner.bankName && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Банк:</span>
                <span className="text-sm">{payment.owner.bankName}</span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Назначение:</span>
              <div className="flex items-center gap-2">
                <code className="text-sm bg-white px-2 py-1 rounded">
                  {typeLabels[payment.type]} {payment.period || ''}
                </code>
                {onCopy && (
                  <button onClick={() => onCopy(`${typeLabels[payment.type]} ${payment.period || ''}`, `title-${payment.id}`)}>
                    {copiedField === `title-${payment.id}` ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      {showActions && onMarkPaid && (
        <Button
          onClick={() => onMarkPaid(payment.id)}
          disabled={markingPaid === payment.id}
          className="w-full"
        >
          {markingPaid === payment.id ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Отправка...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Я оплатил
            </>
          )}
        </Button>
      )}

      {payment.status === 'PENDING_CONFIRMATION' && (
        <div className="text-center text-sm text-blue-600">
          Ожидаем подтверждения от владельца
        </div>
      )}
    </Card>
  )
}
