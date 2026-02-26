'use client'
// app/dashboard/billing/page.tsx
// Flatro V10 — Billing Documents Management Page
// Full CRUD: list, create, issue, pay, cancel, download PDF

import { useState, useEffect, useCallback } from 'react'
import { Button }    from '@/components/ui/button'
import { Badge }     from '@/components/ui/badge'
import { Input }     from '@/components/ui/input'
import { Label }     from '@/components/ui/label'
import { Textarea }  from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Plus,
  FileText,
  Download,
  MoreHorizontal,
  Send,
  CheckCircle,
  XCircle,
  Trash2,
  Filter,
  RefreshCw,
  Receipt,
} from 'lucide-react'
import type {
  BillingDocument,
  BillingDocumentType,
  BillingDocumentStatus,
  BillingLineItem,
  CreateBillingDocumentInput,
} from '@/lib/billing/types'
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
  DEFAULT_VAT_EXEMPT_REMARK,
  COMMON_SERVICE_DESCRIPTIONS,
} from '@/lib/billing/types'
import { v4 as uuidv4 } from 'uuid'

// ─── Types ────────────────────────────────────────────────────

interface TenantOption {
  id: string
  firstName: string
  lastName: string
  email?: string | null
  propertyName?: string
}

// ─── Helpers ─────────────────────────────────────────────────

const STATUS_BADGE_VARIANT: Record<BillingDocumentStatus, string> = {
  DRAFT:     'bg-slate-100 text-slate-700',
  ISSUED:    'bg-blue-100 text-blue-700',
  PAID:      'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pl-PL')
}

function fmtMoney(n: number) {
  return n.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' PLN'
}

function todayIso() {
  return new Date().toISOString().split('T')[0]
}

function daysLaterIso(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

// ─── Empty line item factory ─────────────────────────────────

function emptyItem(): Omit<BillingLineItem, 'id'> {
  return { description: '', netAmount: 0, vatRate: 'zw.', grossAmount: 0 }
}

// ─── Create Form ──────────────────────────────────────────────

interface CreateFormProps {
  tenants: TenantOption[]
  onCreated: () => void
  onClose: () => void
}

function CreateDocumentForm({ tenants, onCreated, onClose }: CreateFormProps) {
  const [type,      setType]      = useState<BillingDocumentType>('FAKTURA_BEZ_VAT')
  const [tenantId,  setTenantId]  = useState('')
  const [issueDate, setIssueDate] = useState(todayIso())
  const [saleDate,  setSaleDate]  = useState(todayIso())
  const [dueDate,   setDueDate]   = useState(daysLaterIso(14))
  const [items,     setItems]     = useState<Omit<BillingLineItem, 'id'>[]>([emptyItem()])
  const [remarks,   setRemarks]   = useState(DEFAULT_VAT_EXEMPT_REMARK)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  // Auto-set remarks based on type
  useEffect(() => {
    if (type === 'FAKTURA_BEZ_VAT') setRemarks(DEFAULT_VAT_EXEMPT_REMARK)
    else if (type === 'RACHUNEK' || type === 'NOTA_OBCIAZENIOWA') setRemarks('')
    else setRemarks('')
  }, [type])

  // For non-VAT types: gross = net (no VAT)
  function updateItem(idx: number, field: keyof Omit<BillingLineItem, 'id'>, value: string | number) {
    setItems((prev) => {
      const next = [...prev]
      const item = { ...next[idx], [field]: value }
      // Keep gross = net for exempt types
      if (field === 'netAmount' && (type !== 'FAKTURA_VAT')) {
        item.grossAmount = item.netAmount
      }
      if (field === 'netAmount' && type === 'FAKTURA_VAT') {
        const rate = typeof item.vatRate === 'number' ? item.vatRate : 0
        item.grossAmount = Math.round(item.netAmount * (1 + rate) * 100) / 100
      }
      next[idx] = item
      return next
    })
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()])
  }

  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx))
  }

  const totalGross = items.reduce((s, i) => s + i.grossAmount, 0)

  async function handleSubmit() {
    if (!tenantId) { setError('Wybierz najemcę.'); return }
    if (items.every((i) => !i.description || i.grossAmount === 0)) {
      setError('Dodaj przynajmniej jedną pozycję.'); return
    }

    setLoading(true)
    setError(null)

    const payload: CreateBillingDocumentInput = {
      tenantId,
      type,
      issueDate,
      saleDate,
      dueDate,
      items,
      remarks: remarks || undefined,
    }

    try {
      const res = await fetch('/api/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Błąd serwera')
      }
      onCreated()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-md">
          {error}
        </div>
      )}

      {/* Type + Tenant */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Typ dokumentu</Label>
          <Select value={type} onValueChange={(v) => setType(v as BillingDocumentType)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(DOCUMENT_TYPE_LABELS) as BillingDocumentType[]).map((t) => (
                <SelectItem key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>Najemca</Label>
          <Select value={tenantId} onValueChange={setTenantId}>
            <SelectTrigger>
              <SelectValue placeholder="Wybierz najemcę…" />
            </SelectTrigger>
            <SelectContent>
              {tenants.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.firstName} {t.lastName}
                  {t.propertyName ? ` · ${t.propertyName}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1.5">
          <Label>Data wystawienia</Label>
          <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Data sprzedaży / usługi</Label>
          <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Termin płatności</Label>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>

      {/* Line items */}
      <div className="space-y-2">
        <Label>Pozycje</Label>
        {items.map((item, idx) => (
          <div key={idx} className="flex gap-2 items-start">
            <div className="flex-1">
              <Input
                placeholder="Nazwa usługi (np. Czynsz najmu)"
                value={item.description}
                onChange={(e) => updateItem(idx, 'description', e.target.value)}
                list={`desc-suggestions-${idx}`}
              />
              <datalist id={`desc-suggestions-${idx}`}>
                {COMMON_SERVICE_DESCRIPTIONS.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>

            {type === 'FAKTURA_VAT' ? (
              <Select
                value={String(item.vatRate)}
                onValueChange={(v) => updateItem(idx, 'vatRate', parseFloat(v))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.23">23%</SelectItem>
                  <SelectItem value="0.08">8%</SelectItem>
                  <SelectItem value="0.05">5%</SelectItem>
                  <SelectItem value="0">0%</SelectItem>
                </SelectContent>
              </Select>
            ) : null}

            <Input
              type="number"
              min="0"
              step="0.01"
              className="w-36"
              placeholder="Kwota (PLN)"
              value={item.grossAmount || ''}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 0
                updateItem(idx, 'netAmount', val)
                setItems((prev) => {
                  const next = [...prev]
                  next[idx] = { ...next[idx], grossAmount: val, netAmount: val }
                  return next
                })
              }}
            />

            {items.length > 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="text-red-500 hover:text-red-700"
                onClick={() => removeItem(idx)}
              >
                <XCircle className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}

        <Button variant="outline" size="sm" onClick={addItem} className="mt-1">
          <Plus className="h-3.5 w-3.5 mr-1" />
          Dodaj pozycję
        </Button>

        <div className="text-right text-sm font-semibold text-slate-700 pt-1">
          Do zapłaty: {fmtMoney(totalGross)}
        </div>
      </div>

      {/* Remarks */}
      <div className="space-y-1.5">
        <Label>Uwagi / Podstawa zwolnienia z VAT</Label>
        <Textarea
          rows={3}
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          placeholder="np. Podstawa zwolnienia: art. 43 ust. 1 pkt 36…"
          className="text-xs"
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose} disabled={loading}>
          Anuluj
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
          Utwórz szkic
        </Button>
      </DialogFooter>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────

export default function BillingPage() {
  const [documents, setDocuments] = useState<BillingDocument[]>([])
  const [tenants,   setTenants]   = useState<TenantOption[]>([])
  const [total,     setTotal]     = useState(0)
  const [loading,   setLoading]   = useState(true)

  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [filterType,   setFilterType]   = useState<string>('ALL')

  const [createOpen, setCreateOpen] = useState(false)

  // ── Fetch documents ────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filterStatus !== 'ALL') params.set('status', filterStatus)
    if (filterType   !== 'ALL') params.set('type',   filterType)

    const res = await fetch(`/api/billing?${params}`)
    if (res.ok) {
      const data = await res.json()
      setDocuments(data.documents)
      setTotal(data.total)
    }
    setLoading(false)
  }, [filterStatus, filterType])

  // ── Fetch tenants for the create form ─────────────────────
  const fetchTenants = useCallback(async () => {
    const res = await fetch('/api/tenants')
    if (res.ok) {
      const data: any[] = await res.json()
      setTenants(
        data.map((t) => ({
          id: t.id,
          firstName: t.firstName,
          lastName:  t.lastName,
          email:     t.email,
          propertyName: t.property?.name,
        }))
      )
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
    fetchTenants()
  }, [fetchDocuments, fetchTenants])

  // ── Actions ───────────────────────────────────────────────
  async function performAction(id: string, action: string) {
    const res = await fetch(`/api/billing/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    })
    if (res.ok) fetchDocuments()
  }

  async function deleteDocument(id: string) {
    if (!confirm('Usunąć szkic? Tej akcji nie można cofnąć.')) return
    const res = await fetch(`/api/billing/${id}`, { method: 'DELETE' })
    if (res.ok) fetchDocuments()
  }

  function downloadPdf(id: string, number: string) {
    const safeNum = number.replace(/\//g, '-')
    const a       = document.createElement('a')
    a.href        = `/api/billing/${id}/pdf?save=true`
    a.download    = `${safeNum}.pdf`
    a.click()
  }

  // ── Summary counts ────────────────────────────────────────
  const drafted  = documents.filter((d) => d.status === 'DRAFT').length
  const issued   = documents.filter((d) => d.status === 'ISSUED').length
  const paid     = documents.filter((d) => d.status === 'PAID').length
  const totalGross = documents
    .filter((d) => d.status === 'ISSUED' || d.status === 'PAID')
    .reduce((s, d) => s + d.totalGross, 0)

  return (
    <div className="space-y-6 p-6">

      {/* ── Page header ────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Dokumenty rozliczeniowe
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Faktury, rachunki, noty obciążeniowe — {total} dokumentów
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nowy dokument
        </Button>
      </div>

      {/* ── Summary cards ─────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Szkice',       value: drafted,  color: 'text-slate-600' },
          { label: 'Wystawione',   value: issued,   color: 'text-blue-600'  },
          { label: 'Opłacone',     value: paid,     color: 'text-green-600' },
          { label: 'Suma (wystawione + opłacone)', value: fmtMoney(totalGross), color: 'text-slate-900' },
        ].map((c) => (
          <Card key={c.label} className="shadow-sm">
            <CardContent className="pt-5 pb-4">
              <p className="text-xs text-slate-500 uppercase tracking-wider">{c.label}</p>
              <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Filters ───────────────────────────────────────── */}
      <div className="flex gap-3 items-center">
        <Filter className="h-4 w-4 text-slate-400" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Wszystkie statusy</SelectItem>
            {(Object.keys(DOCUMENT_STATUS_LABELS) as BillingDocumentStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{DOCUMENT_STATUS_LABELS[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Wszystkie typy</SelectItem>
            {(Object.keys(DOCUMENT_TYPE_LABELS) as BillingDocumentType[]).map((t) => (
              <SelectItem key={t} value={t}>{DOCUMENT_TYPE_LABELS[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={fetchDocuments}>
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Odśwież
        </Button>
      </div>

      {/* ── Documents table ───────────────────────────────── */}
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="font-semibold">Numer</TableHead>
              <TableHead className="font-semibold">Typ</TableHead>
              <TableHead className="font-semibold">Najemca</TableHead>
              <TableHead className="font-semibold">Data wystawienia</TableHead>
              <TableHead className="font-semibold">Termin płatności</TableHead>
              <TableHead className="font-semibold text-right">Do zapłaty</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                  <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                  Ładowanie…
                </TableCell>
              </TableRow>
            ) : documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Brak dokumentów. Utwórz pierwszy dokument.
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <TableRow key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="font-mono text-sm font-semibold">
                    {doc.number}
                  </TableCell>
                  <TableCell className="text-sm">
                    {DOCUMENT_TYPE_LABELS[doc.type]}
                  </TableCell>
                  <TableCell className="text-sm">
                    {doc.tenant
                      ? `${doc.tenant.firstName} ${doc.tenant.lastName}`
                      : '—'}
                    {doc.tenant?.property && (
                      <span className="text-xs text-slate-400 ml-1.5">
                        · {doc.tenant.property.name}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {fmtDate(doc.issueDate)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {fmtDate(doc.dueDate)}
                  </TableCell>
                  <TableCell className="text-sm font-semibold text-right">
                    {fmtMoney(doc.totalGross)}
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_VARIANT[doc.status]}`}>
                      {DOCUMENT_STATUS_LABELS[doc.status]}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">

                        <DropdownMenuItem
                          onClick={() => downloadPdf(doc.id, doc.number)}
                        >
                          <Download className="h-3.5 w-3.5 mr-2" />
                          Pobierz PDF
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />

                        {doc.status === 'DRAFT' && (
                          <DropdownMenuItem
                            onClick={() => performAction(doc.id, 'issue')}
                          >
                            <Send className="h-3.5 w-3.5 mr-2 text-blue-500" />
                            Wystaw dokument
                          </DropdownMenuItem>
                        )}

                        {doc.status === 'ISSUED' && (
                          <DropdownMenuItem
                            onClick={() => performAction(doc.id, 'pay')}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-2 text-green-500" />
                            Oznacz jako opłacony
                          </DropdownMenuItem>
                        )}

                        {(doc.status === 'ISSUED' || doc.status === 'PAID') && (
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => performAction(doc.id, 'cancel')}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-2" />
                            Anuluj
                          </DropdownMenuItem>
                        )}

                        {doc.status === 'DRAFT' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => deleteDocument(doc.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-2" />
                              Usuń szkic
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Create dialog ─────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Nowy dokument rozliczeniowy
            </DialogTitle>
          </DialogHeader>
          <CreateDocumentForm
            tenants={tenants}
            onCreated={() => {
              setCreateOpen(false)
              fetchDocuments()
            }}
            onClose={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>

    </div>
  )
}