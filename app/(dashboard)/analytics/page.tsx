// app/(dashboard)/analytics/page.tsx
// Flatro — Financial Analytics Page
// Zero external chart dependencies — pure SVG
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLocale } from '@/lib/i18n/context'
import { Card } from '@/components/ui/card'
import {
  TrendingUp,
  Wallet,
  CheckCircle2,
  Building2,
  Loader2,
  BarChart2,
} from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────
interface AnalyticsData {
  revenueByMonth: { month: string; revenue: number }[]
  revenueByProperty: { name: string; value: number }[]
  paymentStatuses: { status: string; count: number }[]
  summary: {
    totalRevenueYear: number
    avgMonthlyRevenue: number
    onTimeRate: number
    topProperty: { name: string; revenue: number } | null
  }
}

// ── Constants ─────────────────────────────────────────────────
const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const STATUS_COLORS: Record<string, string> = {
  PAID: '#10b981',
  PENDING: '#f59e0b',
  OVERDUE: '#ef4444',
  PENDING_CONFIRMATION: '#3b82f6',
  REJECTED: '#6b7280',
  CANCELLED: '#d1d5db',
}

// STATUS_LABELS — moved inside AnalyticsPage() to access t from useLocale

// ── Helpers ───────────────────────────────────────────────────
function formatPLN(amount: number) {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatK(v: number) {
  if (v === 0) return '0'
  if (v >= 1000) return `${(v / 1000).toFixed(0)}k`
  return String(Math.round(v))
}

// ── Summary Card ──────────────────────────────────────────────
function SummaryCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  color: string
}) {
  return (
    <Card className="p-5 flex items-start gap-4">
      <div className={`p-2.5 rounded-xl ${color}`}>
        <Icon className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0">
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-xl font-bold text-gray-900 mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </Card>
  )
}

// ── SVG Bar Chart ─────────────────────────────────────────────
function BarChartSVG({ data }: { data: { month: string; revenue: number }[] }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; item: typeof data[0] } | null>(null)

  const W = 600
  const H = 240
  const padL = 44
  const padR = 12
  const padT = 12
  const padB = 36

  const chartW = W - padL - padR
  const chartH = H - padT - padB

  const maxVal = Math.max(...data.map((d) => d.revenue), 1)
  const barW = Math.max(8, (chartW / data.length) * 0.55)
  const gap = chartW / data.length

  // Y-axis ticks
  const tickCount = 4
  const ticks = Array.from({ length: tickCount + 1 }, (_, i) =>
    Math.round((maxVal / tickCount) * i)
  )

  return (
    <div className="relative w-full" style={{ paddingBottom: `${(H / W) * 100}%` }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="absolute inset-0 w-full h-full"
        onMouseLeave={() => setTooltip(null)}
      >
        {/* Grid lines */}
        {ticks.map((t) => {
          const y = padT + chartH - (t / maxVal) * chartH
          return (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="#f0f0f0" strokeWidth={1} />
              <text x={padL - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
                {formatK(t)}
              </text>
            </g>
          )
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const barH = Math.max(2, (d.revenue / maxVal) * chartH)
          const x = padL + i * gap + gap / 2 - barW / 2
          const y = padT + chartH - barH

          return (
            <g key={i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={4}
                fill="#3b82f6"
                opacity={tooltip?.item === d ? 1 : 0.85}
                className="cursor-pointer transition-opacity"
                onMouseEnter={(e) => {
                  const svg = (e.target as SVGElement).closest('svg')!
                  const rect = svg.getBoundingClientRect()
                  const svgX = ((x + barW / 2) / W) * rect.width
                  const svgY = (y / H) * rect.height
                  setTooltip({ x: svgX, y: svgY, item: d })
                }}
              />
              <text
                x={x + barW / 2}
                y={H - padB + 14}
                textAnchor="middle"
                fontSize={10}
                fill="#6b7280"
              >
                {d.month}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-10 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm pointer-events-none -translate-x-1/2 -translate-y-full"
          style={{ left: tooltip.x, top: tooltip.y - 8 }}
        >
          <p className="font-medium text-gray-700">{tooltip.item.month}</p>
          <p className="text-blue-600 font-semibold">{formatPLN(tooltip.item.revenue)}</p>
        </div>
      )}
    </div>
  )
}

// ── SVG Pie / Doughnut ────────────────────────────────────────
interface SliceItem {
  name: string
  value: number
  color: string
}

function PieChartSVG({
  data,
  innerRadius = 0,
  formatValue,
}: {
  data: SliceItem[]
  innerRadius?: number
  formatValue?: (v: number) => string
}) {
  const [hovered, setHovered] = useState<number | null>(null)
  const R = 90
  const cx = 110
  const cy = 110
  const total = data.reduce((s, d) => s + d.value, 0)

  let cursor = -Math.PI / 2

  const slices = data.map((d, i) => {
    const angle = total > 0 ? (d.value / total) * 2 * Math.PI : 0
    const start = cursor
    cursor += angle
    const end = cursor

    const r = hovered === i ? R + 6 : R
    const ir = hovered === i ? innerRadius - 2 : innerRadius

    const x1 = cx + r * Math.cos(start)
    const y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(end)
    const y2 = cy + r * Math.sin(end)

    const ix1 = cx + ir * Math.cos(end)
    const iy1 = cy + ir * Math.sin(end)
    const ix2 = cx + ir * Math.cos(start)
    const iy2 = cy + ir * Math.sin(start)

    const largeArc = angle > Math.PI ? 1 : 0

    const path =
      ir > 0
        ? `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${ir} ${ir} 0 ${largeArc} 0 ${ix2} ${iy2} Z`
        : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`

    // Label position
    const midAngle = start + angle / 2
    const labelR = r + 18
    const lx = cx + labelR * Math.cos(midAngle)
    const ly = cy + labelR * Math.sin(midAngle)
    const pct = total > 0 ? Math.round((d.value / total) * 100) : 0

    return { ...d, path, lx, ly, pct, i, angle }
  })

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <div className="relative flex-shrink-0" style={{ width: 220, height: 220 }}>
        <svg viewBox="0 0 220 220" width={220} height={220}>
          {slices.map((s) => (
            <path
              key={s.i}
              d={s.path}
              fill={s.color}
              className="cursor-pointer transition-all duration-150"
              onMouseEnter={() => setHovered(s.i)}
              onMouseLeave={() => setHovered(null)}
            />
          ))}
          {/* Center label for doughnut */}
          {innerRadius > 0 && hovered !== null && (
            <>
              <text x={cx} y={cy - 8} textAnchor="middle" fontSize={11} fill="#6b7280">
                {slices[hovered]?.name.slice(0, 14)}
              </text>
              <text x={cx} y={cy + 10} textAnchor="middle" fontSize={14} fontWeight="bold" fill="#111827">
                {formatValue
                  ? formatValue(slices[hovered]?.value ?? 0)
                  : slices[hovered]?.value}
              </text>
            </>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2 min-w-0">
        {slices.map((s) => (
          <div
            key={s.i}
            className="flex items-center gap-2 cursor-pointer"
            onMouseEnter={() => setHovered(s.i)}
            onMouseLeave={() => setHovered(null)}
          >
            <span
              className="inline-block w-3 h-3 rounded-full flex-shrink-0"
              style={{ background: s.color, opacity: hovered === null || hovered === s.i ? 1 : 0.4 }}
            />
            <span className="text-xs text-gray-600 truncate max-w-[140px]">{s.name}</span>
            <span className="text-xs text-gray-400 ml-auto pl-2 flex-shrink-0">
              {formatValue ? formatValue(s.value) : `${s.pct}%`}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const router = useRouter()
  const { t } = useLocale()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // STATUS_LABELS здесь — нужен доступ к t
  const STATUS_LABELS: Record<string, string> = {
    PAID:                 t.analytics.status.paid,
    PENDING:              t.analytics.status.pending,
    OVERDUE:              t.analytics.status.overdue,
    PENDING_CONFIRMATION: t.analytics.status.pendingConfirmation,
    REJECTED:             t.analytics.status.rejected,
    CANCELLED:            t.analytics.status.cancelled,
  }

  useEffect(() => {
    async function load() {
      try {
        const [meRes, analyticsRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/analytics'),
        ])

        if (meRes.ok) {
          const me = await meRes.json()
          if (me.isTenant && !me.isOwner) {
            router.replace('/tenant/dashboard')
            return
          }
        }

        if (!analyticsRes.ok) throw new Error(t.analytics.fetchError)
        setData(await analyticsRes.json())
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-64 text-red-500">
        {error || t.analytics.loadError}
      </div>
    )
  }

  const { revenueByMonth, revenueByProperty, paymentStatuses, summary } = data

  const pieData: SliceItem[] = revenueByProperty.map((p, i) => ({
    name: p.name,
    value: p.value,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }))

  const doughnutData: SliceItem[] = paymentStatuses.map((s) => ({
    name: STATUS_LABELS[s.status] ?? s.status,
    value: s.count,
    color: STATUS_COLORS[s.status] ?? '#9ca3af',
  }))

  const hasBarData = revenueByMonth.some((m) => m.revenue > 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <BarChart2 className="h-7 w-7 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t.analytics.title}</h1>
          <p className="text-sm text-gray-500">{t.analytics.subtitle}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard
          icon={TrendingUp}
          label={t.analytics.revenueYear}
          value={formatPLN(summary.totalRevenueYear)}
          color="bg-blue-500"
        />
        <SummaryCard
          icon={Wallet}
          label={t.analytics.avgMonthly}
          value={formatPLN(summary.avgMonthlyRevenue)}
          color="bg-emerald-500"
        />
        <SummaryCard
          icon={CheckCircle2}
          label={t.analytics.onTime}
          value={`${summary.onTimeRate}%`}
          sub={t.analytics.onTimeSub}
          color="bg-violet-500"
        />
        <SummaryCard
          icon={Building2}
          label={t.analytics.topProperty}
          value={summary.topProperty?.name ?? '—'}
          sub={summary.topProperty ? formatPLN(summary.topProperty.revenue) : undefined}
          color="bg-amber-500"
        />
      </div>

      {/* Bar Chart — revenue by month */}
      <Card className="p-5">
        <h2 className="text-base font-semibold text-gray-800 mb-4">{t.analytics.revenueByMonth}</h2>
        {!hasBarData ? (
          <p className="text-sm text-gray-400 py-8 text-center">{t.analytics.noRevenueData}</p>
        ) : (
          <BarChartSVG data={revenueByMonth} />
        )}
      </Card>

      {/* Bottom row: Pie + Doughnut */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">{t.analytics.revenueByProperty}</h2>
          {pieData.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">{t.common.noData}</p>
          ) : (
            <PieChartSVG data={pieData} formatValue={formatPLN} />
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-4">{t.analytics.paymentStatuses}</h2>
          {doughnutData.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">{t.common.noData}</p>
          ) : (
            <PieChartSVG
              data={doughnutData}
              innerRadius={52}
              formatValue={(v) => `${v} ${t.analytics.pieces}`}
            />
          )}
        </Card>
      </div>
    </div>
  )
}