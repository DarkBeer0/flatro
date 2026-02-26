// app/(tenant)/tenant/payments/page.tsx
'use client'

import { useEffect, useState } from 'react'
import {
  CreditCard, Clock, CheckCircle, AlertTriangle,
  Copy, Check, Loader2, CheckSquare, Square,
} from 'lucide-react'
import { Card }   from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge }  from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
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
    bankName:      string | null
    iban:          string | null
    accountHolder: string | null
  }
}

const STATUS_CONFIG: Record<Payment['status'], { label: string; color: string; icon: typeof Clock }> = {
  PENDING:              { label: 'Ожидает оплаты',        color: 'bg-yellow-100 text-yellow-800', icon: Clock         },
  PENDING_CONFIRMATION: { label: 'Ожидает подтверждения', color: 'bg-blue-100 text-blue-800',    icon: Clock         },
  PAID:                 { label: 'Оплачено',              color: 'bg-green-100 text-green-800',  icon: CheckCircle   },
  OVERDUE:              { label: 'Просрочено',            color: 'bg-red-100 text-red-800',      icon: AlertTriangle },
  REJECTED:             { label: 'Отклонено',             color: 'bg-red-100 text-red-800',      icon: AlertTriangle },
  CANCELLED:            { label: 'Отменено',              color: 'bg-gray-100 text-gray-800',    icon: Clock         },
}

const TYPE_LABELS: Record<Payment['type'], string> = {
  RENT: 'Аренда', UTILITIES: 'Коммунальные', DEPOSIT: 'Залог', OTHER: 'Другое',
}

const byDueDate = (a: Payment, b: Payment) =>
  new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()

// ─── Page ─────────────────────────────────────────────────────

export default function TenantPaymentsPage() {
  const [payments,    setPayments]    = useState<Payment[]>([])
  const [loading,     setLoading]     = useState(true)
  const [selected,    setSelected]    = useState<Payment | null>(null)
  const [checked,     setChecked]     = useState<Set<string>>(new Set())
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)

  useEffect(() => { fetchPayments() }, [])

  async function fetchPayments() {
    try {
      const res = await fetch('/api/tenant/payments')
      if (res.ok) setPayments(await res.json())
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  async function markAsPaid(ids: string[]) {
    for (const id of ids) {
      setMarkingPaid(id)
      try {
        const res = await fetch(`/api/tenant/payments/${id}/mark-paid`, { method: 'POST' })
        if (res.ok) {
          setPayments(prev => prev.map(p =>
            p.id === id ? { ...p, status: 'PENDING_CONFIRMATION' as const } : p
          ))
          setSelected(prev =>
            prev?.id === id ? { ...prev, status: 'PENDING_CONFIRMATION' as const } : prev
          )
        }
      } catch (e) { console.error(e) }
    }
    setMarkingPaid(null)
    setChecked(new Set())
  }

  function toggleCheck(id: string, e: React.MouseEvent) {
    e.stopPropagation()
    setChecked(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll(ids: string[]) {
    const allChecked = ids.every(id => checked.has(id))
    if (allChecked) {
      const next = new Set(checked)
      ids.forEach(id => next.delete(id))
      setChecked(next)
    } else {
      setChecked(new Set([...checked, ...ids]))
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

  const pending   = payments.filter(p => p.status === 'PENDING' || p.status === 'OVERDUE').sort(byDueDate)
  const waiting   = payments.filter(p => p.status === 'PENDING_CONFIRMATION').sort(byDueDate)
  const completed = payments.filter(p => ['PAID', 'REJECTED', 'CANCELLED'].includes(p.status)).sort(byDueDate)

  const pendingIds    = pending.map(p => p.id)
  const allChecked    = pendingIds.length > 0 && pendingIds.every(id => checked.has(id))
  const checkedTotal  = pending.filter(p => checked.has(p.id)).reduce((s, p) => s + p.amount, 0)
  const isBusy        = markingPaid !== null

  return (
    <div className="w-full pb-32">
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
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  К оплате ({pending.length})
                </h2>
                <button
                  onClick={() => toggleAll(pendingIds)}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
                >
                  {allChecked
                    ? <CheckSquare className="h-4 w-4 text-blue-600" />
                    : <Square className="h-4 w-4" />
                  }
                  {allChecked ? 'Снять все' : 'Выбрать все'}
                </button>
              </div>
              <div className="space-y-2">
                {pending.map(p => (
                  <PaymentRow
                    key={p.id}
                    payment={p}
                    isChecked={checked.has(p.id)}
                    onCheck={e => toggleCheck(p.id, e)}
                    onClick={() => setSelected(p)}
                  />
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
              <div className="space-y-2">
                {waiting.map(p => (
                  <PaymentRow key={p.id} payment={p} onClick={() => setSelected(p)} />
                ))}
              </div>
            </section>
          )}

          {/* История */}
          {completed.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-3 text-gray-400">
                История ({completed.length})
              </h2>
              <div className="space-y-2">
                {completed.map(p => (
                  <PaymentRow key={p.id} payment={p} onClick={() => setSelected(p)} compact />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Sticky multi-pay bar */}
      {checked.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-2xl px-4 py-3 flex items-center gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500">Выбрано: {checked.size} платеж(ей)</p>
            <p className="text-xl font-bold text-gray-900">{checkedTotal.toFixed(2)} zł</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setChecked(new Set())} disabled={isBusy}>
            Отменить
          </Button>
          <Button
            className="bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => markAsPaid([...checked])}
            disabled={isBusy}
          >
            {isBusy
              ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Отправка...</>
              : <><CheckCircle className="h-4 w-4 mr-2" />Я оплатил{checked.size > 1 ? ` (${checked.size})` : ''}</>
            }
          </Button>
        </div>
      )}

      {/* Payment detail Dialog */}
      <Dialog open={!!selected} onOpenChange={open => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={STATUS_CONFIG[selected.status].color}>
                    {(() => { const I = STATUS_CONFIG[selected.status].icon; return <I className="h-3 w-3 mr-1 inline" /> })()}
                    {STATUS_CONFIG[selected.status].label}
                  </Badge>
                  <span className="text-sm text-gray-500">{TYPE_LABELS[selected.type]}</span>
                </div>
                <DialogTitle className="text-3xl font-bold mt-1">
                  {selected.amount.toFixed(2)}{' '}
                  <span className="text-xl font-normal text-gray-500">zł</span>
                </DialogTitle>
                {selected.period && <p className="text-sm text-gray-500">Период: {selected.period}</p>}
              </DialogHeader>

              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Срок оплаты</span>
                  <span className="text-sm font-medium">
                    {new Date(selected.dueDate).toLocaleDateString('ru-RU')}
                  </span>
                </div>

                {selected.paidDate && (
                  <div className="flex justify-between py-2 border-b border-gray-100">
                    <span className="text-sm text-gray-600">Дата оплаты</span>
                    <span className="text-sm font-medium text-green-600">
                      {new Date(selected.paidDate).toLocaleDateString('ru-RU')}
                    </span>
                  </div>
                )}

                {selected.rejectionReason && (
                  <div className="p-3 bg-red-50 rounded-lg text-sm text-red-700">
                    <strong>Причина отклонения:</strong> {selected.rejectionReason}
                  </div>
                )}

                {(selected.status === 'PENDING' || selected.status === 'OVERDUE') && selected.owner.iban && (
                  <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Реквизиты</p>
                    {selected.owner.accountHolder && (
                      <CopyRow label="Получатель" value={selected.owner.accountHolder}
                        fieldKey={`h-${selected.id}`} copiedField={copiedField} onCopy={copyToClipboard} />
                    )}
                    <CopyRow label="IBAN" value={selected.owner.iban}
                      fieldKey={`i-${selected.id}`} copiedField={copiedField} onCopy={copyToClipboard} mono />
                    {selected.owner.bankName && (
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Банк</span>
                        <span className="text-sm">{selected.owner.bankName}</span>
                      </div>
                    )}
                    <CopyRow label="Назначение"
                      value={`${TYPE_LABELS[selected.type]} ${selected.period || ''}`}
                      fieldKey={`t-${selected.id}`} copiedField={copiedField} onCopy={copyToClipboard} mono />
                  </div>
                )}

                {selected.notes && <p className="text-sm text-gray-500 italic">{selected.notes}</p>}
              </div>

              {(selected.status === 'PENDING' || selected.status === 'OVERDUE') && (
                <Button className="w-full mt-2" onClick={() => markAsPaid([selected.id])} disabled={isBusy}>
                  {markingPaid === selected.id
                    ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Отправка...</>
                    : <><CheckCircle className="h-4 w-4 mr-2" />Я оплатил</>
                  }
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

// ─── PaymentRow ───────────────────────────────────────────────

function PaymentRow({ payment, isChecked = false, onCheck, onClick, compact = false }: {
  payment: Payment; isChecked?: boolean
  onCheck?: (e: React.MouseEvent) => void; onClick: () => void; compact?: boolean
}) {
  const status    = STATUS_CONFIG[payment.status]
  const Icon      = status.icon
  const isOverdue = payment.status === 'OVERDUE'
  const canCheck  = (payment.status === 'PENDING' || payment.status === 'OVERDUE') && !!onCheck

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition-all hover:shadow-sm
        ${isChecked ? 'border-blue-400 bg-blue-50' : isOverdue ? 'border-red-200 bg-red-50/30' : 'border-gray-200 bg-white hover:border-gray-300'}`}
    >
      {/* Checkbox or icon */}
      {canCheck ? (
        <button onClick={onCheck} className="shrink-0 focus:outline-none" tabIndex={-1}>
          {isChecked
            ? <CheckSquare className="h-5 w-5 text-blue-600" />
            : <Square className="h-5 w-5 text-gray-300" />
          }
        </button>
      ) : (
        <div className={`shrink-0 p-1.5 rounded-full
          ${payment.status === 'PAID' ? 'bg-green-100' : isOverdue ? 'bg-red-100' : payment.status === 'PENDING' ? 'bg-yellow-100' : 'bg-gray-100'}`}>
          <Icon className={`h-3.5 w-3.5
            ${payment.status === 'PAID' ? 'text-green-600' : isOverdue ? 'text-red-600' : payment.status === 'PENDING' ? 'text-yellow-600' : 'text-gray-400'}`} />
        </div>
      )}

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-gray-900 text-sm">{TYPE_LABELS[payment.type]}</p>
        {!compact && (
          <p className="text-xs text-gray-500">
            {payment.period ? `Период: ${payment.period}` : `До: ${new Date(payment.dueDate).toLocaleDateString('ru-RU')}`}
          </p>
        )}
        {compact && payment.paidDate && (
          <p className="text-xs text-gray-400">{new Date(payment.paidDate).toLocaleDateString('ru-RU')}</p>
        )}
      </div>

      {/* Amount + badge */}
      <div className="text-right shrink-0">
        <p className={`font-bold text-base ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
          {payment.amount.toFixed(2)} zł
        </p>
        {!compact && (
          <span className={`text-xs px-1.5 py-0.5 rounded-full ${status.color}`}>
            {status.label}
          </span>
        )}
      </div>
    </div>
  )
}

// ─── CopyRow ──────────────────────────────────────────────────

function CopyRow({ label, value, fieldKey, copiedField, onCopy, mono = false }: {
  label: string; value: string; fieldKey: string
  copiedField: string | null; onCopy: (v: string, k: string) => void; mono?: boolean
}) {
  const copied = copiedField === fieldKey
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-sm text-gray-600 shrink-0">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`text-sm truncate ${mono ? 'font-mono' : ''}`}>{value}</span>
        <button onClick={e => { e.stopPropagation(); onCopy(value, fieldKey) }}
          className="shrink-0 p-1 rounded hover:bg-gray-200 transition-colors">
          {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5 text-gray-400" />}
        </button>
      </div>
    </div>
  )
}