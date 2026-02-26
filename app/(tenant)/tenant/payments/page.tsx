// app/(tenant)/tenant/payments/page.tsx
'use client'

import { useEffect, useState } from 'react'
import {
  CreditCard, Clock, CheckCircle, AlertTriangle,
  Copy, Check, Loader2, X,
} from 'lucide-react'
import { Card }   from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge }  from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// ─── Types ────────────────────────────────────────────────────

interface Payment {
  id:              string
  amount:          number
  type:            'RENT' | 'UTILITIES' | 'DEPOSIT' | 'OTHER'
  status:          'PENDING' | 'PENDING_CONFIRMATION' | 'PAID' | 'OVERDUE' | 'REJECTED' | 'CANCELLED'
  dueDate:         string
  paidDate:        string | null
  period:          string | null
  notes:           string | null
  rejectionReason: string | null
  owner: {
    bankName:       string | null
    iban:           string | null
    accountHolder:  string | null
  }
}

// ─── Constants ───────────────────────────────────────────────

const STATUS_CONFIG: Record<Payment['status'], { label: string; color: string; icon: typeof Clock }> = {
  PENDING:              { label: 'Ожидает оплаты',          color: 'bg-yellow-100 text-yellow-800', icon: Clock         },
  PENDING_CONFIRMATION: { label: 'Ожидает подтверждения',   color: 'bg-blue-100 text-blue-800',    icon: Clock         },
  PAID:                 { label: 'Оплачено',                color: 'bg-green-100 text-green-800',  icon: CheckCircle   },
  OVERDUE:              { label: 'Просрочено',              color: 'bg-red-100 text-red-800',      icon: AlertTriangle },
  REJECTED:             { label: 'Отклонено',               color: 'bg-red-100 text-red-800',      icon: AlertTriangle },
  CANCELLED:            { label: 'Отменено',                color: 'bg-gray-100 text-gray-800',    icon: Clock         },
}

const TYPE_LABELS: Record<Payment['type'], string> = {
  RENT:      'Аренда',
  UTILITIES: 'Коммунальные',
  DEPOSIT:   'Залог',
  OTHER:     'Другое',
}

// ─── Page ─────────────────────────────────────────────────────

export default function TenantPaymentsPage() {
  const [payments,    setPayments]    = useState<Payment[]>([])
  const [loading,     setLoading]     = useState(true)
  const [selected,    setSelected]    = useState<Payment | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)

  useEffect(() => { fetchPayments() }, [])

  async function fetchPayments() {
    try {
      const res = await fetch('/api/tenant/payments')
      if (res.ok) setPayments(await res.json())
    } catch (e) {
      console.error('Error fetching payments:', e)
    } finally {
      setLoading(false)
    }
  }

  async function markAsPaid(paymentId: string) {
    setMarkingPaid(paymentId)
    try {
      const res = await fetch(`/api/tenant/payments/${paymentId}/mark-paid`, { method: 'POST' })
      if (res.ok) {
        setPayments(prev => prev.map(p =>
          p.id === paymentId ? { ...p, status: 'PENDING_CONFIRMATION' as const } : p
        ))
        // Update selected if open
        setSelected(prev => prev?.id === paymentId
          ? { ...prev, status: 'PENDING_CONFIRMATION' as const }
          : prev
        )
      }
    } catch (e) {
      console.error('Error marking as paid:', e)
    } finally {
      setMarkingPaid(null)
    }
  }

  function copyToClipboard(text: string, field: string) {
    navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  const pending   = payments.filter(p => p.status === 'PENDING' || p.status === 'OVERDUE')
  const waiting   = payments.filter(p => p.status === 'PENDING_CONFIRMATION')
  const completed = payments.filter(p => ['PAID', 'REJECTED', 'CANCELLED'].includes(p.status))

  return (
    <div className="w-full">
      {/* Header */}
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
          {pending.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                К оплате ({pending.length})
              </h2>
              <div className="space-y-3">
                {pending.map(p => (
                  <PaymentRow key={p.id} payment={p} onClick={() => setSelected(p)} />
                ))}
              </div>
            </section>
          )}

          {/* Ожидают подтверждения */}
          {waiting.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Ожидают подтверждения ({waiting.length})
              </h2>
              <div className="space-y-3">
                {waiting.map(p => (
                  <PaymentRow key={p.id} payment={p} onClick={() => setSelected(p)} />
                ))}
              </div>
            </section>
          )}

          {/* История */}
          {completed.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 text-gray-500">
                История ({completed.length})
              </h2>
              <div className="space-y-3">
                {completed.map(p => (
                  <PaymentRow key={p.id} payment={p} onClick={() => setSelected(p)} compact />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── Payment detail Dialog ─────────────────────────────── */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={STATUS_CONFIG[selected.status].color}>
                    {(() => { const Icon = STATUS_CONFIG[selected.status].icon; return <Icon className="h-3 w-3 mr-1 inline" /> })()}
                    {STATUS_CONFIG[selected.status].label}
                  </Badge>
                  <span className="text-sm text-gray-500">{TYPE_LABELS[selected.type]}</span>
                </div>
                <DialogTitle className="text-3xl font-bold mt-1">
                  {selected.amount.toFixed(2)} <span className="text-xl font-normal text-gray-500">zł</span>
                </DialogTitle>
                {selected.period && (
                  <p className="text-sm text-gray-500">Период: {selected.period}</p>
                )}
              </DialogHeader>

              {/* Details */}
              <div className="space-y-3">
                {/* Due date */}
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Срок оплаты</span>
                  <span className="text-sm font-medium">
                    {new Date(selected.dueDate).toLocaleDateString('ru-RU')}
                  </span>
                </div>

                {/* Paid date */}
                {selected.paidDate && (
                  <div className="flex items-center justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Дата оплаты</span>
                    <span className="text-sm font-medium text-green-600">
                      {new Date(selected.paidDate).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                )}

                {/* Rejection reason */}
                {selected.rejectionReason && (
                  <div className="p-3 bg-red-50 rounded-lg text-sm text-red-700">
                    <strong>Причина отклонения:</strong> {selected.rejectionReason}
                  </div>
                )}

                {/* Bank details — show for pending/overdue */}
                {(selected.status === 'PENDING' || selected.status === 'OVERDUE') && selected.owner.iban && (
                  <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                      Реквизиты для оплаты
                    </p>

                    {selected.owner.accountHolder && (
                      <CopyRow
                        label="Получатель"
                        value={selected.owner.accountHolder}
                        fieldKey={`holder-${selected.id}`}
                        copiedField={copiedField}
                        onCopy={copyToClipboard}
                      />
                    )}

                    <CopyRow
                      label="IBAN"
                      value={selected.owner.iban}
                      fieldKey={`iban-${selected.id}`}
                      copiedField={copiedField}
                      onCopy={copyToClipboard}
                      mono
                    />

                    {selected.owner.bankName && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Банк</span>
                        <span className="text-sm">{selected.owner.bankName}</span>
                      </div>
                    )}

                    <CopyRow
                      label="Назначение"
                      value={`${TYPE_LABELS[selected.type]} ${selected.period || ''}`}
                      fieldKey={`title-${selected.id}`}
                      copiedField={copiedField}
                      onCopy={copyToClipboard}
                      mono
                    />
                  </div>
                )}

                {/* Notes */}
                {selected.notes && (
                  <p className="text-sm text-gray-500 italic">{selected.notes}</p>
                )}
              </div>

              {/* Actions */}
              {(selected.status === 'PENDING' || selected.status === 'OVERDUE') && (
                <Button
                  className="w-full mt-2"
                  onClick={() => markAsPaid(selected.id)}
                  disabled={markingPaid === selected.id}
                >
                  {markingPaid === selected.id ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Отправка...</>
                  ) : (
                    <><CheckCircle className="h-4 w-4 mr-2" />Я оплатил</>
                  )}
                </Button>
              )}

              {selected.status === 'PENDING_CONFIRMATION' && (
                <div className="text-center text-sm text-blue-600 py-2">
                  Ожидаем подтверждения от владельца
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── PaymentRow — compact clickable list item ─────────────────

function PaymentRow({
  payment,
  onClick,
  compact = false,
}: {
  payment: Payment
  onClick:  () => void
  compact?: boolean
}) {
  const status  = STATUS_CONFIG[payment.status]
  const Icon    = status.icon
  const isOverdue = payment.status === 'OVERDUE'

  return (
    <Card
      className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${
        isOverdue ? 'border-red-200 bg-red-50/30' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: icon + info */}
        <div className="flex items-center gap-3 min-w-0">
          <div className={`p-2 rounded-full flex-shrink-0 ${
            payment.status === 'PAID'    ? 'bg-green-100' :
            isOverdue                   ? 'bg-red-100'   :
            payment.status === 'PENDING' ? 'bg-yellow-100' :
                                          'bg-gray-100'
          }`}>
            <Icon className={`h-4 w-4 ${
              payment.status === 'PAID'    ? 'text-green-600' :
              isOverdue                   ? 'text-red-600'   :
              payment.status === 'PENDING' ? 'text-yellow-600' :
                                            'text-gray-500'
            }`} />
          </div>
          <div className="min-w-0">
            <p className="font-medium text-gray-900 text-sm">{TYPE_LABELS[payment.type]}</p>
            {!compact && (
              <p className="text-xs text-gray-500">
                {payment.period
                  ? `Период: ${payment.period}`
                  : `До: ${new Date(payment.dueDate).toLocaleDateString('ru-RU')}`
                }
              </p>
            )}
          </div>
        </div>

        {/* Right: amount + badge */}
        <div className="text-right flex-shrink-0">
          <p className={`font-bold ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
            {payment.amount.toFixed(2)} zł
          </p>
          {!compact && (
            <Badge className={`text-xs mt-0.5 ${status.color}`}>
              {status.label}
            </Badge>
          )}
          {compact && payment.paidDate && (
            <p className="text-xs text-gray-400">
              {new Date(payment.paidDate).toLocaleDateString('ru-RU')}
            </p>
          )}
        </div>
      </div>
    </Card>
  )
}

// ─── CopyRow helper ───────────────────────────────────────────

function CopyRow({
  label,
  value,
  fieldKey,
  copiedField,
  onCopy,
  mono = false,
}: {
  label:       string
  value:       string
  fieldKey:    string
  copiedField: string | null
  onCopy:      (v: string, k: string) => void
  mono?:       boolean
}) {
  const copied = copiedField === fieldKey
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-gray-600 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`text-sm truncate ${mono ? 'font-mono' : ''}`}>{value}</span>
        <button
          onClick={e => { e.stopPropagation(); onCopy(value, fieldKey) }}
          className="shrink-0 p-1 rounded hover:bg-gray-200 transition-colors"
        >
          {copied
            ? <Check className="h-3.5 w-3.5 text-green-600" />
            : <Copy className="h-3.5 w-3.5 text-gray-400" />
          }
        </button>
      </div>
    </div>
  )
}