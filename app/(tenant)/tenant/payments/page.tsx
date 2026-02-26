// app/(tenant)/tenant/payments/page.tsx  — REBUILT
// Changes vs. original:
//   1. Сортировка: PENDING платежи — от ближайшего срока к дальнему (asc)
//   2. Multi-select чекбоксы на PENDING-платежах → суммируются → sticky кнопка "Оплатить"
//   3. Клик по карточке открывает Detail Sheet (реквизиты + описание)
//   4. Кнопка "Я оплатил" остаётся — работает как раньше, но вынесена в Detail Sheet
//      и доступна через quick-action на карточке при одиночном выборе
'use client'

import { useEffect, useState, useMemo } from 'react'
import {
  CreditCard, Clock, CheckCircle, AlertTriangle, Copy, Check,
  Loader2, ChevronDown, ChevronUp, X, Banknote, Info,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  PENDING:              { label: 'Ожидает оплаты',        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',   icon: Clock },
  OVERDUE:              { label: 'Просрочен',             color: 'bg-red-100 text-red-800 border-red-200',            icon: AlertTriangle },
  PENDING_CONFIRMATION: { label: 'Ожидает подтверждения', color: 'bg-blue-100 text-blue-800 border-blue-200',         icon: Clock },
  PAID:                 { label: 'Оплачено',              color: 'bg-green-100 text-green-800 border-green-200',      icon: CheckCircle },
  REJECTED:             { label: 'Отклонён',              color: 'bg-red-100 text-red-800 border-red-200',            icon: X },
  CANCELLED:            { label: 'Отменён',               color: 'bg-gray-100 text-gray-500 border-gray-200',         icon: X },
}

const typeLabels: Record<string, string> = {
  RENT:      'Аренда',
  UTILITIES: 'Коммунальные',
  DEPOSIT:   'Залог',
  OTHER:     'Другое',
}

const SELECTABLE = ['PENDING', 'OVERDUE']

function isSelectable(p: Payment) {
  return SELECTABLE.includes(p.status)
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function isOverdue(p: Payment) {
  return p.status === 'PENDING' && new Date(p.dueDate) < new Date()
}

// ─────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────

export default function TenantPaymentsPage() {
  const [payments, setPayments]   = useState<Payment[]>([])
  const [loading, setLoading]     = useState(true)
  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const [markingPaid, setMarkingPaid] = useState<string | null>(null)
  const [detailPayment, setDetailPayment] = useState<Payment | null>(null)
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)

  // ── Fetch ──────────────────────────────────────────────
  useEffect(() => { fetchPayments() }, [])

  async function fetchPayments() {
    try {
      const res = await fetch('/api/tenant/payments')
      if (res.ok) setPayments(await res.json())
    } catch {}
    finally { setLoading(false) }
  }

  // ── Derived lists ──────────────────────────────────────
  // PENDING / OVERDUE — sorted ASC by dueDate (nearest first)
  const pendingPayments = useMemo(() =>
    payments
      .filter(p => p.status === 'PENDING' || p.status === 'OVERDUE')
      .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()),
    [payments]
  )

  const waitingPayments = useMemo(() =>
    payments.filter(p => p.status === 'PENDING_CONFIRMATION'),
    [payments]
  )

  const historyPayments = useMemo(() =>
    payments
      .filter(p => ['PAID', 'REJECTED', 'CANCELLED'].includes(p.status))
      .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()),
    [payments]
  )

  // ── Selection ──────────────────────────────────────────
  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(pendingPayments.map(p => p.id)))
  }

  function clearSelection() {
    setSelected(new Set())
  }

  const selectedTotal = useMemo(() =>
    pendingPayments
      .filter(p => selected.has(p.id))
      .reduce((sum, p) => sum + p.amount, 0),
    [selected, pendingPayments]
  )

  // ── Mark paid (single) ─────────────────────────────────
  async function markAsPaid(paymentId: string) {
    setMarkingPaid(paymentId)
    try {
      const res = await fetch(`/api/tenant/payments/${paymentId}/mark-paid`, { method: 'POST' })
      if (res.ok) {
        setPayments(prev => prev.map(p =>
          p.id === paymentId ? { ...p, status: 'PENDING_CONFIRMATION' as const } : p
        ))
        setDetailPayment(null)
        setSelected(prev => { const n = new Set(prev); n.delete(paymentId); return n })
      }
    } catch {}
    finally { setMarkingPaid(null) }
  }

  // ── Bulk mark paid ─────────────────────────────────────
  async function markBulkAsPaid() {
    if (selected.size === 0) return
    setBulkLoading(true)
    const ids = [...selected]
    try {
      await Promise.all(
        ids.map(id => fetch(`/api/tenant/payments/${id}/mark-paid`, { method: 'POST' }))
      )
      setPayments(prev => prev.map(p =>
        ids.includes(p.id) ? { ...p, status: 'PENDING_CONFIRMATION' as const } : p
      ))
      clearSelection()
    } catch {}
    finally { setBulkLoading(false) }
  }

  // ── Copy ───────────────────────────────────────────────
  async function copyToClipboard(text: string, field: string) {
    await navigator.clipboard.writeText(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2000)
  }

  // ──────────────────────────────────────────────────────
  // Render
  // ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gray-300" />
      </div>
    )
  }

  const allSelected = pendingPayments.length > 0 && pendingPayments.every(p => selected.has(p.id))

  return (
    <>
      {/* ── Detail Sheet ──────────────────────────────── */}
      {detailPayment && (
        <DetailSheet
          payment={detailPayment}
          onClose={() => setDetailPayment(null)}
          onMarkPaid={markAsPaid}
          markingPaid={markingPaid}
          copiedField={copiedField}
          onCopy={copyToClipboard}
          typeLabels={typeLabels}
          statusConfig={statusConfig}
        />
      )}

      <div className="max-w-2xl mx-auto px-4 pb-40 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Мои платежи</h1>
          <p className="text-sm text-gray-500 mt-1">Управление оплатой аренды</p>
        </div>

        {payments.length === 0 ? (
          <Card className="p-10 text-center">
            <CreditCard className="h-12 w-12 mx-auto text-gray-200 mb-3" />
            <p className="font-medium text-gray-900">Нет платежей</p>
            <p className="text-sm text-gray-400 mt-1">У вас пока нет платежей для оплаты</p>
          </Card>
        ) : (
          <>
            {/* ── К оплате ──────────────────────────── */}
            {pendingPayments.length > 0 && (
              <section>
                {/* Section header */}
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    К оплате
                    <span className="text-sm font-normal text-gray-400">({pendingPayments.length})</span>
                  </h2>

                  {/* Select all / clear */}
                  <button
                    onClick={allSelected ? clearSelection : selectAll}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {allSelected ? 'Снять всё' : 'Выбрать всё'}
                  </button>
                </div>

                <div className="space-y-3">
                  {pendingPayments.map(payment => (
                    <PendingCard
                      key={payment.id}
                      payment={payment}
                      selected={selected.has(payment.id)}
                      onToggle={() => toggleSelect(payment.id)}
                      onOpenDetail={() => setDetailPayment(payment)}
                      typeLabels={typeLabels}
                      statusConfig={statusConfig}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── Ожидают подтверждения ─────────────── */}
            {waitingPayments.length > 0 && (
              <section>
                <h2 className="font-semibold text-gray-800 flex items-center gap-2 mb-3">
                  <Clock className="h-4 w-4 text-blue-500" />
                  Ожидают подтверждения
                  <span className="text-sm font-normal text-gray-400">({waitingPayments.length})</span>
                </h2>
                <div className="space-y-2">
                  {waitingPayments.map(payment => (
                    <HistoryCard
                      key={payment.id}
                      payment={payment}
                      typeLabels={typeLabels}
                      statusConfig={statusConfig}
                      onClick={() => setDetailPayment(payment)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── История ───────────────────────────── */}
            {historyPayments.length > 0 && (
              <HistorySection
                payments={historyPayments}
                typeLabels={typeLabels}
                statusConfig={statusConfig}
                onOpenDetail={setDetailPayment}
              />
            )}
          </>
        )}
      </div>

      {/* ── Sticky bottom bar ─────────────────────────── */}
      {selected.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <div className="w-full max-w-2xl px-4 pb-6 pointer-events-auto">
            <div className="bg-gray-900 rounded-2xl shadow-2xl px-5 py-4 flex items-center gap-4">
              {/* Count + total */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 leading-none mb-1">
                  Выбрано {selected.size} {selected.size === 1 ? 'платёж' : 'платежей'}
                </p>
                <p className="text-xl font-bold text-white leading-none">
                  {selectedTotal.toFixed(2)} zł
                </p>
              </div>

              {/* Clear */}
              <button
                onClick={clearSelection}
                className="text-gray-400 hover:text-white p-1 flex-shrink-0"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Pay button */}
              <button
                onClick={markBulkAsPaid}
                disabled={bulkLoading}
                className="flex items-center gap-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-60 text-white font-semibold px-5 py-3 rounded-xl transition-colors flex-shrink-0"
              >
                {bulkLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                Я оплатил
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─────────────────────────────────────────────
// PendingCard — карточка с чекбоксом
// ─────────────────────────────────────────────

function PendingCard({
  payment,
  selected,
  onToggle,
  onOpenDetail,
  typeLabels,
  statusConfig,
}: {
  payment: Payment
  selected: boolean
  onToggle: () => void
  onOpenDetail: () => void
  typeLabels: Record<string, string>
  statusConfig: Record<string, any>
}) {
  const overdue = isOverdue(payment)
  const daysLeft = Math.ceil(
    (new Date(payment.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div
      className={`
        rounded-2xl border-2 transition-all duration-150 overflow-hidden
        ${selected
          ? 'border-blue-500 bg-blue-50 shadow-sm'
          : overdue
            ? 'border-red-200 bg-white'
            : 'border-gray-100 bg-white hover:border-gray-200'
        }
      `}
    >
      <div className="flex items-stretch">
        {/* Checkbox column */}
        <button
          onClick={onToggle}
          className={`
            flex items-center justify-center w-14 flex-shrink-0 transition-colors
            ${selected ? 'bg-blue-500' : 'bg-gray-50 hover:bg-gray-100'}
          `}
          aria-label="Выбрать платёж"
        >
          <div className={`
            w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
            ${selected
              ? 'border-white bg-white'
              : overdue
                ? 'border-red-300'
                : 'border-gray-300'
            }
          `}>
            {selected && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
          </div>
        </button>

        {/* Main content — кликабельно для деталей */}
        <button
          onClick={onOpenDetail}
          className="flex-1 px-4 py-4 text-left min-w-0"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              {/* Type + period */}
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  overdue ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {typeLabels[payment.type]}
                </span>
                {payment.period && (
                  <span className="text-xs text-gray-400">
                    {payment.period}
                  </span>
                )}
              </div>

              {/* Amount */}
              <p className={`text-2xl font-bold ${overdue ? 'text-red-600' : 'text-gray-900'}`}>
                {payment.amount.toFixed(2)} <span className="text-lg">zł</span>
              </p>

              {/* Notes preview */}
              {payment.notes && (
                <p className="text-xs text-gray-400 mt-1 truncate max-w-[200px] flex items-center gap-1">
                  <Info className="h-3 w-3 flex-shrink-0" />
                  {payment.notes}
                </p>
              )}
            </div>

            {/* Due date */}
            <div className="text-right flex-shrink-0">
              <p className="text-xs text-gray-400">Срок оплаты</p>
              <p className={`text-sm font-semibold ${overdue ? 'text-red-600' : 'text-gray-800'}`}>
                {formatDate(payment.dueDate)}
              </p>
              {!overdue && daysLeft <= 7 && daysLeft >= 0 && (
                <p className="text-xs text-orange-500">через {daysLeft} дн.</p>
              )}
              {overdue && (
                <p className="text-xs text-red-400">просрочен</p>
              )}
            </div>
          </div>
        </button>

        {/* Info icon */}
        <button
          onClick={onOpenDetail}
          className="flex items-center justify-center w-10 text-gray-300 hover:text-gray-500 transition-colors flex-shrink-0 border-l border-gray-100"
        >
          <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
        </button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// HistoryCard — компактная карточка без чекбокса
// ─────────────────────────────────────────────

function HistoryCard({
  payment,
  typeLabels,
  statusConfig,
  onClick,
}: {
  payment: Payment
  typeLabels: Record<string, string>
  statusConfig: Record<string, any>
  onClick: () => void
}) {
  const cfg = statusConfig[payment.status]
  const Icon = cfg.icon

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-xl border border-gray-100 bg-white hover:bg-gray-50 px-4 py-3 flex items-center gap-3 transition-colors"
    >
      <div className={`p-1.5 rounded-lg ${cfg.color} border`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">
          {typeLabels[payment.type]}
          {payment.period && <span className="text-gray-400 ml-1.5 font-normal">{payment.period}</span>}
        </p>
        <p className="text-xs text-gray-400">{cfg.label}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className="text-sm font-semibold text-gray-800">{payment.amount.toFixed(2)} zł</p>
        <p className="text-xs text-gray-400">{formatDate(payment.dueDate)}</p>
      </div>
      <ChevronDown className="h-4 w-4 text-gray-300 rotate-[-90deg] flex-shrink-0" />
    </button>
  )
}

// ─────────────────────────────────────────────
// HistorySection — сворачиваемая история
// ─────────────────────────────────────────────

function HistorySection({
  payments,
  typeLabels,
  statusConfig,
  onOpenDetail,
}: {
  payments: Payment[]
  typeLabels: Record<string, string>
  statusConfig: Record<string, any>
  onOpenDetail: (p: Payment) => void
}) {
  const [open, setOpen] = useState(false)
  const visible = open ? payments : payments.slice(0, 3)

  return (
    <section>
      <h2 className="font-semibold text-gray-500 text-sm mb-3">
        История ({payments.length})
      </h2>
      <div className="space-y-2">
        {visible.map(p => (
          <HistoryCard
            key={p.id}
            payment={p}
            typeLabels={typeLabels}
            statusConfig={statusConfig}
            onClick={() => onOpenDetail(p)}
          />
        ))}
      </div>
      {payments.length > 3 && (
        <button
          onClick={() => setOpen(v => !v)}
          className="mt-3 w-full text-center text-xs text-gray-400 hover:text-gray-600 flex items-center justify-center gap-1 py-2"
        >
          {open ? (
            <><ChevronUp className="h-3.5 w-3.5" />Скрыть</>
          ) : (
            <><ChevronDown className="h-3.5 w-3.5" />Показать ещё {payments.length - 3}</>
          )}
        </button>
      )}
    </section>
  )
}

// ─────────────────────────────────────────────
// DetailSheet — боковой drawer с деталями
// ─────────────────────────────────────────────

function DetailSheet({
  payment,
  onClose,
  onMarkPaid,
  markingPaid,
  copiedField,
  onCopy,
  typeLabels,
  statusConfig,
}: {
  payment: Payment
  onClose: () => void
  onMarkPaid: (id: string) => void
  markingPaid: string | null
  copiedField: string | null
  onCopy: (text: string, field: string) => void
  typeLabels: Record<string, string>
  statusConfig: Record<string, any>
}) {
  const cfg = statusConfig[payment.status]
  const Icon = cfg.icon
  const canMarkPaid = payment.status === 'PENDING' || payment.status === 'OVERDUE'

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  function CopyRow({ label, value, field }: { label: string; value: string; field: string }) {
    return (
      <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
        <span className="text-sm text-gray-500">{label}</span>
        <div className="flex items-center gap-2">
          <code className="text-sm bg-gray-100 px-2 py-0.5 rounded font-mono">{value}</code>
          <button
            onClick={() => onCopy(value, field)}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            title="Скопировать"
          >
            {copiedField === field
              ? <Check className="h-3.5 w-3.5 text-green-600" />
              : <Copy className="h-3.5 w-3.5 text-gray-400" />
            }
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 max-w-2xl mx-auto">
        <div className="bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>

          <div className="px-6 pb-8">
            {/* Header */}
            <div className="flex items-start justify-between mb-6 pt-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.color}`}>
                    <Icon className="h-3 w-3" />
                    {cfg.label}
                  </span>
                  <span className="text-xs text-gray-400">{typeLabels[payment.type]}</span>
                </div>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {payment.amount.toFixed(2)} <span className="text-xl text-gray-500">zł</span>
                </p>
                {payment.period && (
                  <p className="text-sm text-gray-500 mt-0.5">Период: {payment.period}</p>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Due date */}
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 mb-5">
              <span className="text-sm text-gray-600">Срок оплаты</span>
              <span className={`font-semibold text-sm ${payment.status === 'OVERDUE' ? 'text-red-600' : 'text-gray-900'}`}>
                {formatDate(payment.dueDate)}
              </span>
            </div>

            {/* Notes */}
            {payment.notes && (
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-5">
                <p className="text-xs font-medium text-amber-700 mb-1 flex items-center gap-1">
                  <Info className="h-3 w-3" /> Примечание от владельца
                </p>
                <p className="text-sm text-amber-900">{payment.notes}</p>
              </div>
            )}

            {/* Rejection reason */}
            {payment.status === 'REJECTED' && payment.rejectionReason && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-5">
                <p className="text-xs font-medium text-red-700 mb-1">Причина отклонения</p>
                <p className="text-sm text-red-900">{payment.rejectionReason}</p>
              </div>
            )}

            {/* Bank details */}
            {payment.owner.iban && (
              <div className="mb-6">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Banknote className="h-3.5 w-3.5" />
                  Реквизиты для оплаты
                </p>
                <div className="bg-gray-50 rounded-xl px-4 py-1 divide-y divide-gray-100">
                  {payment.owner.accountHolder && (
                    <CopyRow
                      label="Получатель"
                      value={payment.owner.accountHolder}
                      field={`holder-${payment.id}`}
                    />
                  )}
                  <CopyRow
                    label="IBAN"
                    value={payment.owner.iban}
                    field={`iban-${payment.id}`}
                  />
                  {payment.owner.bankName && (
                    <div className="flex items-center justify-between py-2">
                      <span className="text-sm text-gray-500">Банк</span>
                      <span className="text-sm text-gray-800">{payment.owner.bankName}</span>
                    </div>
                  )}
                  <CopyRow
                    label="Назначение"
                    value={`${typeLabels[payment.type]} ${payment.period || ''}`.trim()}
                    field={`title-${payment.id}`}
                  />
                </div>
              </div>
            )}

            {/* Confirm action */}
            {canMarkPaid && (
              <Button
                onClick={() => onMarkPaid(payment.id)}
                disabled={markingPaid === payment.id}
                className="w-full h-12 text-base font-semibold"
              >
                {markingPaid === payment.id ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Отправка...</>
                ) : (
                  <><CheckCircle className="h-4 w-4 mr-2" />Я оплатил</>
                )}
              </Button>
            )}

            {payment.status === 'PENDING_CONFIRMATION' && (
              <div className="text-center py-3 text-sm text-blue-600 bg-blue-50 rounded-xl">
                Ожидаем подтверждения от владельца
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}