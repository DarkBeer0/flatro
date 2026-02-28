// app/(dashboard)/analytics/page.tsx
// Flatro — Financial Analytics Dashboard
// Production-quality layout · Pure SVG charts · Zero external chart deps
'use client'

import { useEffect, useState, useMemo } from 'react'
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
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

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

interface SliceItem {
  name: string
  value: number
  color: string
  pct: number
}

// ═══════════════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════════════

const PIE_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#ef4444', // red-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
]

const STATUS_COLORS: Record<string, string> = {
  PAID: '#10b981',
  PENDING: '#f59e0b',
  OVERDUE: '#ef4444',
  PENDING_CONFIRMATION: '#3b82f6',
  REJECTED: '#6b7280',
  CANCELLED: '#d1d5db',
}

// ═══════════════════════════════════════════════════════════════
// Formatters
// ═══════════════════════════════════════════════════════════════

function formatPLN(amount: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatCompact(v: number): string {
  if (v === 0) return '0'
  if (v >= 10_000) return `${(v / 1000).toFixed(0)}k`
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`
  return String(Math.round(v))
}

// ═══════════════════════════════════════════════════════════════
// KPI Summary Card
// ═══════════════════════════════════════════════════════════════

function KPICard({
  icon: Icon,
  label,
  value,
  sub,
  accentClass,
  accentBg,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  accentClass: string
  accentBg: string
}) {
  return (
    <Card className="group relative overflow-hidden p-5 transition-shadow hover:shadow-md">
      {/* Top accent stripe */}
      <div className={`absolute inset-x-0 top-0 h-1 ${accentClass}`} />

      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 rounded-xl p-2.5 ${accentBg}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-gray-500 leading-tight">{label}</p>
          <p className="mt-1 text-xl font-bold text-gray-900 tracking-tight truncate">
            {value}
          </p>
          {sub && (
            <p className="mt-0.5 text-xs text-gray-400 truncate">{sub}</p>
          )}
        </div>
      </div>
    </Card>
  )
}

// ═══════════════════════════════════════════════════════════════
// SVG Bar Chart — Monthly Revenue
// ═══════════════════════════════════════════════════════════════

/** Compute a "nice" step value for axis ticks */
function niceStep(maxVal: number, desiredTicks: number): number {
  if (maxVal <= 0) return 1
  const raw = maxVal / desiredTicks
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const frac = raw / mag
  let nice: number
  if (frac <= 1.5) nice = 1
  else if (frac <= 3) nice = 2
  else if (frac <= 7) nice = 5
  else nice = 10
  return nice * mag
}

function RevenueBarChart({ data }: { data: { month: string; revenue: number }[] }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const W = 720
  const H = 280
  const PAD = { top: 20, right: 16, bottom: 44, left: 52 }

  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const maxVal = useMemo(
    () => Math.max(...data.map((d) => d.revenue), 1),
    [data]
  )

  const ticks = useMemo(() => {
    const step = niceStep(maxVal, 5)
    const arr: number[] = []
    for (let v = 0; v <= maxVal + step * 0.1; v += step) {
      arr.push(Math.round(v))
    }
    return arr
  }, [maxVal])

  const yMax = ticks[ticks.length - 1] || maxVal

  const gap = chartW / data.length
  const barW = Math.min(Math.max(12, gap * 0.5), 40)

  return (
    <div className="relative w-full overflow-hidden">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        {/* Horizontal grid lines */}
        {ticks.map((t) => {
          const y = PAD.top + chartH - (t / yMax) * chartH
          return (
            <g key={`grid-${t}`}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y}
                y2={y}
                stroke="#f3f4f6"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={y + 3.5}
                textAnchor="end"
                fontSize={11}
                fill="#9ca3af"
                fontFamily="system-ui"
              >
                {formatCompact(t)}
              </text>
            </g>
          )
        })}

        {/* Bars + labels */}
        {data.map((d, i) => {
          const barH = yMax > 0 ? Math.max(2, (d.revenue / yMax) * chartH) : 2
          const x = PAD.left + i * gap + gap / 2 - barW / 2
          const y = PAD.top + chartH - barH
          const isHovered = hoveredIdx === i

          return (
            <g
              key={i}
              onMouseEnter={() => setHoveredIdx(i)}
              className="cursor-pointer"
            >
              {/* Hover background column */}
              <rect
                x={PAD.left + i * gap}
                y={PAD.top}
                width={gap}
                height={chartH}
                fill={isHovered ? '#eff6ff' : 'transparent'}
                rx={4}
              />
              {/* Bar */}
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                rx={barW > 16 ? 6 : 4}
                fill={isHovered ? '#2563eb' : '#3b82f6'}
                className="transition-all duration-150"
              />
              {/* Hover value label */}
              {isHovered && d.revenue > 0 && (
                <text
                  x={x + barW / 2}
                  y={y - 8}
                  textAnchor="middle"
                  fontSize={11}
                  fontWeight={600}
                  fill="#1d4ed8"
                  fontFamily="system-ui"
                >
                  {formatPLN(d.revenue)}
                </text>
              )}
              {/* Month label */}
              <text
                x={PAD.left + i * gap + gap / 2}
                y={H - PAD.bottom + 18}
                textAnchor="middle"
                fontSize={10}
                fill={isHovered ? '#1d4ed8' : '#9ca3af'}
                fontWeight={isHovered ? 600 : 400}
                fontFamily="system-ui"
              >
                {d.month}
              </text>
            </g>
          )
        })}

        {/* Baseline */}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={PAD.top + chartH}
          y2={PAD.top + chartH}
          stroke="#e5e7eb"
          strokeWidth={1}
        />
      </svg>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// SVG Pie / Doughnut Chart
// ═══════════════════════════════════════════════════════════════

function RingChart({
  data,
  innerRadius = 0,
  formatValue,
  emptyLabel,
}: {
  data: SliceItem[]
  innerRadius?: number
  formatValue?: (v: number) => string
  emptyLabel?: string
}) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  const SIZE = 200
  const R = 88
  const cx = SIZE / 2
  const cy = SIZE / 2
  const total = data.reduce((s, d) => s + d.value, 0)

  if (data.length === 0 || total === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-gray-400">
        {emptyLabel || 'No data'}
      </div>
    )
  }

  let cursor = -Math.PI / 2

  const slices = data.map((d, i) => {
    const angle = (d.value / total) * 2 * Math.PI
    const start = cursor
    cursor += angle
    const end = cursor

    const isHovered = hoveredIdx === i
    const r = isHovered ? R + 4 : R
    const ir = innerRadius > 0 ? (isHovered ? innerRadius - 2 : innerRadius) : 0

    const x1 = cx + r * Math.cos(start)
    const y1 = cy + r * Math.sin(start)
    const x2 = cx + r * Math.cos(end)
    const y2 = cy + r * Math.sin(end)

    const largeArc = angle > Math.PI ? 1 : 0
    let path: string

    if (ir > 0) {
      const ix1 = cx + ir * Math.cos(end)
      const iy1 = cy + ir * Math.sin(end)
      const ix2 = cx + ir * Math.cos(start)
      const iy2 = cy + ir * Math.sin(start)
      path = `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${ir} ${ir} 0 ${largeArc} 0 ${ix2} ${iy2} Z`
    } else {
      path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
    }

    return { ...d, path, i, angle }
  })

  const hoveredSlice = hoveredIdx !== null ? slices[hoveredIdx] : null

  return (
    <div className="flex flex-col sm:flex-row items-center gap-5">
      {/* SVG Ring */}
      <div className="flex-shrink-0 relative" style={{ width: SIZE, height: SIZE }}>
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width={SIZE}
          height={SIZE}
          className="drop-shadow-sm"
        >
          {slices.map((s) => (
            <path
              key={s.i}
              d={s.path}
              fill={s.color}
              opacity={hoveredIdx === null || hoveredIdx === s.i ? 1 : 0.35}
              className="cursor-pointer transition-all duration-200 ease-out"
              onMouseEnter={() => setHoveredIdx(s.i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ))}
          {/* Center label for doughnut */}
          {innerRadius > 0 && (
            <>
              {hoveredSlice ? (
                <>
                  <text
                    x={cx}
                    y={cy - 6}
                    textAnchor="middle"
                    fontSize={11}
                    fill="#6b7280"
                    fontFamily="system-ui"
                  >
                    {hoveredSlice.name.length > 16
                      ? hoveredSlice.name.slice(0, 15) + '\u2026'
                      : hoveredSlice.name}
                  </text>
                  <text
                    x={cx}
                    y={cy + 14}
                    textAnchor="middle"
                    fontSize={16}
                    fontWeight={700}
                    fill="#111827"
                    fontFamily="system-ui"
                  >
                    {formatValue ? formatValue(hoveredSlice.value) : hoveredSlice.pct + '%'}
                  </text>
                </>
              ) : (
                <text
                  x={cx}
                  y={cy + 5}
                  textAnchor="middle"
                  fontSize={20}
                  fontWeight={700}
                  fill="#111827"
                  fontFamily="system-ui"
                >
                  {total}
                </text>
              )}
            </>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-col gap-2.5 min-w-0 flex-1">
        {slices.map((s) => {
          const isActive = hoveredIdx === null || hoveredIdx === s.i
          return (
            <div
              key={s.i}
              className="flex items-center gap-2.5 cursor-pointer"
              onMouseEnter={() => setHoveredIdx(s.i)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <span
                className="inline-block w-3 h-3 rounded-full flex-shrink-0 transition-opacity duration-200"
                style={{ background: s.color, opacity: isActive ? 1 : 0.35 }}
              />
              <span
                className={`text-[13px] truncate transition-colors duration-200 ${
                  isActive ? 'text-gray-700' : 'text-gray-400'
                }`}
                title={s.name}
              >
                {s.name}
              </span>
              <span className="text-[13px] text-gray-400 ml-auto pl-3 flex-shrink-0 tabular-nums">
                {formatValue ? formatValue(s.value) : `${s.pct}%`}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// Trend Indicator
// ═══════════════════════════════════════════════════════════════

function TrendIndicator({ current, previous }: { current: number; previous: number }) {
  if (previous === 0) return null
  const pctChange = ((current - previous) / previous) * 100
  const isPositive = pctChange >= 0

  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium ${
        isPositive
          ? 'bg-emerald-50 text-emerald-700'
          : 'bg-red-50 text-red-600'
      }`}
    >
      {isPositive ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      {Math.abs(pctChange).toFixed(0)}%
    </span>
  )
}

// ═══════════════════════════════════════════════════════════════
// Page Component
// ═══════════════════════════════════════════════════════════════

export default function AnalyticsPage() {
  const router = useRouter()
  const { t } = useLocale()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const STATUS_LABELS: Record<string, string> = useMemo(
    () => ({
      PAID: t.analytics.status.paid,
      PENDING: t.analytics.status.pending,
      OVERDUE: t.analytics.status.overdue,
      PENDING_CONFIRMATION: t.analytics.status.pendingConfirmation,
      REJECTED: t.analytics.status.rejected,
      CANCELLED: t.analytics.status.cancelled,
    }),
    [t]
  )

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [meRes, analyticsRes] = await Promise.all([
          fetch('/api/auth/me'),
          fetch('/api/analytics'),
        ])

        if (cancelled) return

        if (meRes.ok) {
          const me = await meRes.json()
          if (me.isTenant && !me.isOwner) {
            router.replace('/tenant/dashboard')
            return
          }
        }

        if (!analyticsRes.ok) throw new Error(t.analytics.fetchError)
        setData(await analyticsRes.json())
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : t.analytics.loadError)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [router, t])

  // ── Derived chart data ──────────────────────────────────────
  const { pieData, doughnutData, hasBarData, trendData } = useMemo(() => {
    if (!data) {
      return { pieData: [], doughnutData: [], hasBarData: false, trendData: null }
    }

    const { revenueByMonth, revenueByProperty, paymentStatuses } = data
    const totalPropertyRevenue = revenueByProperty.reduce((s, p) => s + p.value, 0)
    const totalPayments = paymentStatuses.reduce((s, p) => s + p.count, 0)

    const pie: SliceItem[] = revenueByProperty.map((p, i) => ({
      name: p.name,
      value: p.value,
      color: PIE_COLORS[i % PIE_COLORS.length],
      pct: totalPropertyRevenue > 0 ? Math.round((p.value / totalPropertyRevenue) * 100) : 0,
    }))

    const doughnut: SliceItem[] = paymentStatuses.map((s) => ({
      name: STATUS_LABELS[s.status] ?? s.status,
      value: s.count,
      color: STATUS_COLORS[s.status] ?? '#9ca3af',
      pct: totalPayments > 0 ? Math.round((s.count / totalPayments) * 100) : 0,
    }))

    // Trend: compare last 2 months with data
    const months = revenueByMonth
    let trend: { current: number; previous: number } | null = null
    if (months.length >= 2) {
      trend = {
        current: months[months.length - 1].revenue,
        previous: months[months.length - 2].revenue,
      }
    }

    return {
      pieData: pie,
      doughnutData: doughnut,
      hasBarData: revenueByMonth.some((m) => m.revenue > 0),
      trendData: trend,
    }
  }, [data, STATUS_LABELS])

  // ── Loading ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-sm text-gray-400">{t.common.loading}</p>
      </div>
    )
  }

  // ── Error ───────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-2">
        <div className="p-3 rounded-full bg-red-50">
          <BarChart2 className="h-6 w-6 text-red-400" />
        </div>
        <p className="text-sm text-red-500 font-medium">
          {error || t.analytics.loadError}
        </p>
      </div>
    )
  }

  const { revenueByMonth, summary } = data

  // ── Render ──────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-[1400px]">
      {/* ━━━ Header ━━━ */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-50 rounded-xl">
          <BarChart2 className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            {t.analytics.title}
          </h1>
          <p className="text-sm text-gray-500">{t.analytics.subtitle}</p>
        </div>
      </div>

      {/* ━━━ Row 1: KPI Cards (4 columns) ━━━ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KPICard
          icon={TrendingUp}
          label={t.analytics.revenueYear}
          value={formatPLN(summary.totalRevenueYear)}
          accentClass="bg-gradient-to-r from-blue-500 to-blue-400"
          accentBg="bg-blue-500"
        />
        <KPICard
          icon={Wallet}
          label={t.analytics.avgMonthly}
          value={formatPLN(summary.avgMonthlyRevenue)}
          sub={
            trendData && trendData.previous > 0
              ? `${trendData.current >= trendData.previous ? '\u2191' : '\u2193'} vs prev month`
              : undefined
          }
          accentClass="bg-gradient-to-r from-emerald-500 to-emerald-400"
          accentBg="bg-emerald-500"
        />
        <KPICard
          icon={CheckCircle2}
          label={t.analytics.onTime}
          value={`${summary.onTimeRate}%`}
          sub={t.analytics.onTimeSub}
          accentClass="bg-gradient-to-r from-violet-500 to-violet-400"
          accentBg="bg-violet-500"
        />
        <KPICard
          icon={Building2}
          label={t.analytics.topProperty}
          value={summary.topProperty?.name ?? '\u2014'}
          sub={summary.topProperty ? formatPLN(summary.topProperty.revenue) : undefined}
          accentClass="bg-gradient-to-r from-amber-500 to-amber-400"
          accentBg="bg-amber-500"
        />
      </div>

      {/* ━━━ Row 2: Bar Chart (full width) ━━━ */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-800">
            {t.analytics.revenueByMonth}
          </h2>
          {trendData && trendData.previous > 0 && (
            <TrendIndicator
              current={trendData.current}
              previous={trendData.previous}
            />
          )}
        </div>
        {!hasBarData ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <BarChart2 className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm">{t.analytics.noRevenueData}</p>
          </div>
        ) : (
          <RevenueBarChart data={revenueByMonth} />
        )}
      </Card>

      {/* ━━━ Row 3: Pie + Doughnut (2 columns) ━━━ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-5">
            {t.analytics.revenueByProperty}
          </h2>
          <RingChart
            data={pieData}
            formatValue={formatPLN}
            emptyLabel={t.common.noData}
          />
        </Card>

        <Card className="p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-5">
            {t.analytics.paymentStatuses}
          </h2>
          <RingChart
            data={doughnutData}
            innerRadius={54}
            formatValue={(v) => `${v} ${t.analytics.pieces}`}
            emptyLabel={t.common.noData}
          />
        </Card>
      </div>
    </div>
  )
}