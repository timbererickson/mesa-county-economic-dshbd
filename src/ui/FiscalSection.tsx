import { useState, useMemo } from 'react'
import { Card, CardContent } from '../lib/shadcn/card'
import {
  Calendar,
  DollarSign,
  Building2,
  ShoppingBag,
  Receipt,
  Layers,
  BarChart3,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import {
  SALES_TAX_DATA as SALES_2025,
  PROPERTY_TAX_DATA as PROP_2025,
  USE_TAX_DATA as USE_2025,
  QUARTERLY_FISCAL_AGGREGATES as QUARTERLY_2025,
  GRAND_TOTAL_FISCAL_COLLECTIONS as TOTAL_2025,
} from '../data/fiscalData2025'
import {
  SALES_TAX_DATA_2026 as SALES_2026,
  PROPERTY_TAX_DATA_2026 as PROP_2026,
  USE_TAX_DATA_2026 as USE_2026,
  QUARTERLY_FISCAL_AGGREGATES_2026 as QUARTERLY_2026,
  GRAND_TOTAL_FISCAL_COLLECTIONS_2026 as TOTAL_2026,
} from '../data/fiscalData2026'

const TEAL = '#023e52'
const CYAN = '#023e52'
const BAR_2025 = '#38bdf8' // Cyan
const BAR_2026 = '#ee8290' // Pink / Coral

function RetoolFilterButton({
  label,
  active,
  disabled = false,
  title,
  onClick,
}: {
  label: string
  active: boolean
  disabled?: boolean
  title?: string
  onClick: () => void
}) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      title={title}
      style={active && !disabled ? { backgroundColor: CYAN, borderColor: CYAN, color: '#ffffff' } : undefined}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border whitespace-nowrap shrink-0 ${
        disabled
          ? 'bg-[#141b24] text-gray-500 border-[#222a36] opacity-40 cursor-not-allowed'
          : active
          ? 'shadow-md shadow-cyan-950/40 text-white'
          : 'bg-[#182029] text-gray-300 border-[#2c3746] hover:border-gray-500 hover:text-white'
      }`}
    >
      {label}
    </button>
  )
}

const formatCurrency = (val: number | null | undefined) => {
  if (val === null || val === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val)
}

const formatCompact = (val: number | null | undefined) => {
  if (val === null || val === undefined) return '—'
  const abs = Math.abs(val)
  const sign = val < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`
  return `${sign}$${abs.toFixed(0)}`
}

type YearSelection = '2025' | '2026' | 'yoy'
type QuarterSelection = 'all' | 'Q1' | 'Q2' | 'Q3' | 'Q4'

function RetoolTooltip({ active, payload, label }: any) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-[#1c242f] border border-[#2e3b4e] shadow-xl rounded-lg p-3 text-xs text-white min-w-[170px]">
      <p className="font-bold text-gray-200 mb-2 border-b border-[#2e3b4e] pb-1">{label}</p>
      {payload.map((entry: any, i: number) => {
        if (entry.value === null || entry.value === undefined) return null
        const labelName = entry.name === 'val_2025' ? 'Year 2025' : entry.name === 'val_2026' ? 'Year 2026' : entry.name
        return (
          <div key={i} className="flex items-center justify-between gap-4 py-0.5">
            <span style={{ color: entry.color }} className="font-medium">
              {labelName}:
            </span>
            <span className="font-mono font-bold" style={{ color: entry.color }}>
              {formatCurrency(entry.value)}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function RetoolLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex items-center justify-center gap-6 pt-3 text-xs font-medium text-gray-300">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span style={{ color: item.color }}>{item.label}</span>
        </div>
      ))}
    </div>
  )
}

interface FiscalSectionProps {
  rows?: any[]
}

export default function FiscalSection({ rows: _rows }: FiscalSectionProps) {
  const [selectedYear, setSelectedYear] = useState<YearSelection>('2026')
  const [selectedQuarter, setSelectedQuarter] = useState<QuarterSelection>('all')
  const [chartStreamMode, setChartStreamMode] = useState<'total' | 'streams'>('total')

  const handleYearChange = (year: YearSelection) => {
    setSelectedYear(year)
    // If switching to 2026 or yoy, auto-adjust if Q4 was selected
    if ((year === '2026' || year === 'yoy') && selectedQuarter === 'Q4') {
      setSelectedQuarter('all')
    }
  }

  // Active Metrics Computation
  const activeMetrics = useMemo(() => {
    // 2025 Baseline
    let s25 = 0
    let p25 = 0
    let u25 = 0
    let t25 = 0

    if (selectedQuarter === 'all') {
      s25 = SALES_2025.grandTotal
      p25 = PROP_2025.grandTotal
      u25 = USE_2025.grandTotal
      t25 = TOTAL_2025
    } else {
      s25 = SALES_2025.quarterlyTotals[selectedQuarter]
      p25 = PROP_2025.quarterlyTotals[selectedQuarter]
      u25 = USE_2025.quarterlyTotals[selectedQuarter]
      t25 = Math.round((s25 + p25 + u25) * 100) / 100
    }

    // 2026 Figures (Q1-Q3 closed; Q4 is 0)
    let s26 = 0
    let p26 = 0
    let u26 = 0
    let t26 = 0

    if (selectedQuarter === 'all') {
      s26 = SALES_2026.grandTotal
      p26 = PROP_2026.grandTotal
      u26 = USE_2026.grandTotal
      t26 = TOTAL_2026
    } else {
      s26 = SALES_2026.quarterlyTotals[selectedQuarter]
      p26 = PROP_2026.quarterlyTotals[selectedQuarter]
      u26 = USE_2026.quarterlyTotals[selectedQuarter]
      t26 = Math.round((s26 + p26 + u26) * 100) / 100
    }

    // 2025 Baseline for Comparison
    // When 'all' is selected, we compare current YTD against the Full Year 2025 totals
    // to provide a clear benchmark against the complete prior year performance.
    const s25Matching = selectedQuarter === 'all' ? SALES_2025.grandTotal : s25
    const p25Matching = selectedQuarter === 'all' ? PROP_2025.grandTotal : p25
    const u25Matching = selectedQuarter === 'all' ? USE_2025.grandTotal : u25
    const t25Matching = selectedQuarter === 'all' ? TOTAL_2025 : t25

    if (selectedYear === '2025') {
      return {
        sales: s25,
        property: p25,
        use: u25,
        total: t25,
        periodLabel: selectedQuarter === 'all' ? 'Full Year 2025' : `${selectedQuarter} 2025`,
        quarterLabel: selectedQuarter === 'all' ? 'All 2025' : `${selectedQuarter} 2025`,
        year: '2025',
        yoy: null,
      }
    }

    if (selectedYear === '2026') {
      return {
        sales: s26,
        property: p26,
        use: u26,
        total: t26,
        periodLabel: selectedQuarter === 'all' ? 'FY 2026 YTD (Jan–Sep)' : `${selectedQuarter} 2026`,
        quarterLabel: selectedQuarter === 'all' ? '2026 YTD' : `${selectedQuarter} 2026`,
        year: '2026',
        yoy: null,
      }
    }

    // YoY Comparison Mode
    const calcDiff = (curr: number, prev: number) => {
      const diff = curr - prev
      const pct = prev > 0 ? (diff / prev) * 100 : 0
      return { diff, pct }
    }

    return {
      sales: s26,
      property: p26,
      use: u26,
      total: t26,
      salesPrior: s25Matching,
      propertyPrior: p25Matching,
      usePrior: u25Matching,
      totalPrior: t25Matching,
      periodLabel: selectedQuarter === 'all' ? 'YoY Progress vs Full Year 2025' : `${selectedQuarter} YoY Comparison`,
      quarterLabel: selectedQuarter === 'all' ? '2025 vs 2026 YTD' : `${selectedQuarter} (25 vs 26)`,
      year: 'yoy',
      yoy: {
        sales: calcDiff(s26, s25Matching),
        property: calcDiff(p26, p25Matching),
        use: calcDiff(u26, u25Matching),
        total: calcDiff(t26, t25Matching),
      },
    }
  }, [selectedYear, selectedQuarter])

  // Chart Data: Side-by-side comparison for completed quarters Q1, Q2, and Q3
  const quarterlyComparisonChartData = useMemo(() => {
    return [
      {
        quarter: 'Q1',
        label: 'Q1 (Jan–Mar)',
        val_2025: QUARTERLY_2025[0].total,
        val_2026: QUARTERLY_2026[0].total,
      },
      {
        quarter: 'Q2',
        label: 'Q2 (Apr–Jun)',
        val_2025: QUARTERLY_2025[1].total,
        val_2026: QUARTERLY_2026[1].total,
      },
      {
        quarter: 'Q3',
        label: 'Q3 (Jul–Sep)',
        val_2025: QUARTERLY_2025[2].total,
        val_2026: QUARTERLY_2026[2].total,
      },
      {
        quarter: 'Q4',
        label: 'Q4 (Oct–Dec)',
        val_2025: QUARTERLY_2025[3].total,
        val_2026: null,
      },
    ]
  }, [])

  // Stream Comparison Data for Chart (Jan–Sep YTD)
  const streamComparisonChartData = useMemo(() => {
    // 2025 Baseline (Full Year) - Corrected per user request to show 4M+ Use Tax
    const s25 = SALES_2025.grandTotal
    const p25 = PROP_2025.grandTotal
    const u25 = USE_2025.grandTotal

    // 2026 YTD (Jan–Sep)
    const s26 = TOTAL_2026 > 0 ? SALES_2026.grandTotal : 0
    const p26 = TOTAL_2026 > 0 ? PROP_2026.grandTotal : 0
    const u26 = TOTAL_2026 > 0 ? USE_2026.grandTotal : 0

    return [
      { stream: 'Sales Tax', val_2025: s25, val_2026: s26 },
      { stream: 'Property Tax', val_2025: p25, val_2026: p26 },
      { stream: 'Use Tax', val_2025: u25, val_2026: u26 },
    ]
  }, [])

  return (
    <div className="space-y-6">
      {/* Fiscal Quarter & Year Filter Toolbar */}
      <div className="flex items-center gap-4 flex-wrap text-white text-xs py-1">
        {/* Target Year Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="font-semibold text-gray-300">Target Year:</span>
          <div className="flex items-center gap-1.5">
            <RetoolFilterButton
              label="2025"
              active={selectedYear === '2025'}
              onClick={() => handleYearChange('2025')}
            />
            <RetoolFilterButton
              label="2026 (YTD)"
              active={selectedYear === '2026'}
              onClick={() => handleYearChange('2026')}
            />
            <RetoolFilterButton
              label="YoY Comparison"
              active={selectedYear === 'yoy'}
              onClick={() => handleYearChange('yoy')}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-[#2c3746]" />

        {/* Target Quarter Selector */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-300">Target Quarter:</span>
          <div className="flex items-center gap-1.5">
            <RetoolFilterButton
              label={selectedYear === '2026' || selectedYear === 'yoy' ? 'All (YTD)' : 'All'}
              active={selectedQuarter === 'all'}
              onClick={() => setSelectedQuarter('all')}
            />
            <RetoolFilterButton
              label="Q1"
              active={selectedQuarter === 'Q1'}
              onClick={() => setSelectedQuarter('Q1')}
            />
            <RetoolFilterButton
              label="Q2"
              active={selectedQuarter === 'Q2'}
              onClick={() => setSelectedQuarter('Q2')}
            />
            <RetoolFilterButton
              label="Q3"
              active={selectedQuarter === 'Q3'}
              onClick={() => setSelectedQuarter('Q3')}
            />
            <RetoolFilterButton
              label="Q4"
              active={selectedQuarter === 'Q4'}
              disabled={selectedYear === '2026' || selectedYear === 'yoy'}
              title={selectedYear === '2026' || selectedYear === 'yoy' ? 'Q4 2026 collections are pending' : undefined}
              onClick={() => setSelectedQuarter('Q4')}
            />
          </div>
        </div>

        {/* Status Pill for 2026 */}
        {(selectedYear === '2026' || selectedYear === 'yoy') && (
          <span className="text-[11px] text-cyan-200/90 ml-auto hidden md:inline">
            FY 2026 Reports closed through September (Q1–Q3)
          </span>
        )}
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales Tax Card */}
        <Card
          className="border-0 shadow-sm text-white overflow-hidden rounded-xl"
          style={{ backgroundColor: TEAL }}
        >
          <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-200 truncate">
                  Sales Tax
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-0.5 truncate">
                {formatCompact(activeMetrics.sales)}
              </p>
              <p className="text-xs text-cyan-100/90 font-mono truncate">
                {formatCurrency(activeMetrics.sales)}
              </p>
              {activeMetrics.yoy ? (
                <div className="text-[11px] text-gray-300 flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className={activeMetrics.yoy.sales.diff >= 0 ? 'text-emerald-300 font-semibold' : 'text-pink-300 font-semibold'}>
                    {activeMetrics.yoy.sales.diff >= 0 ? '+' : ''}{activeMetrics.yoy.sales.pct.toFixed(1)}% YoY
                  </span>
                  <span className="text-gray-400">vs 2025: {formatCompact(activeMetrics.salesPrior)}</span>
                </div>
              ) : (
                <p className="text-[11px] text-gray-300 truncate mt-0.5">
                  {((activeMetrics.sales / activeMetrics.total) * 100).toFixed(1)}% of total · {activeMetrics.quarterLabel}
                </p>
              )}
            </div>
            <div className="rounded-xl p-2.5 shrink-0 bg-white/10 text-cyan-300 border border-white/10">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Property Tax Card */}
        <Card
          className="border-0 shadow-sm text-white overflow-hidden rounded-xl"
          style={{ backgroundColor: TEAL }}
        >
          <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-pink-300 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-pink-200 truncate">
                  Property Tax
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-0.5 truncate">
                {formatCompact(activeMetrics.property)}
              </p>
              <p className="text-xs text-pink-100/90 font-mono truncate">
                {formatCurrency(activeMetrics.property)}
              </p>
              {activeMetrics.yoy ? (
                <div className="text-[11px] text-gray-300 flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className={activeMetrics.yoy.property.diff >= 0 ? 'text-emerald-300 font-semibold' : 'text-pink-300 font-semibold'}>
                    {activeMetrics.yoy.property.diff >= 0 ? '+' : ''}{activeMetrics.yoy.property.pct.toFixed(1)}% YoY
                  </span>
                  <span className="text-gray-400">vs 2025: {formatCompact(activeMetrics.propertyPrior)}</span>
                </div>
              ) : (
                <p className="text-[11px] text-gray-300 truncate mt-0.5">
                  {((activeMetrics.property / activeMetrics.total) * 100).toFixed(1)}% of total · {activeMetrics.quarterLabel}
                </p>
              )}
            </div>
            <div className="rounded-xl p-2.5 shrink-0 bg-white/10 text-pink-300 border border-white/10">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Use Tax Card */}
        <Card
          className="border-0 shadow-sm text-white overflow-hidden rounded-xl"
          style={{ backgroundColor: TEAL }}
        >
          <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-200 truncate">
                  Use Tax
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-0.5 truncate">
                {formatCompact(activeMetrics.use)}
              </p>
              <p className="text-xs text-cyan-100/90 font-mono truncate">
                {formatCurrency(activeMetrics.use)}
              </p>
              {activeMetrics.yoy ? (
                <div className="text-[11px] text-gray-300 flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className={activeMetrics.yoy.use.diff >= 0 ? 'text-emerald-300 font-semibold' : 'text-pink-300 font-semibold'}>
                    {activeMetrics.yoy.use.diff >= 0 ? '+' : ''}{activeMetrics.yoy.use.pct.toFixed(1)}% YoY
                  </span>
                  <span className="text-gray-400">vs 2025: {formatCompact(activeMetrics.usePrior)}</span>
                </div>
              ) : (
                <p className="text-[11px] text-gray-300 truncate mt-0.5">
                  {((activeMetrics.use / activeMetrics.total) * 100).toFixed(1)}% of total · {activeMetrics.quarterLabel}
                </p>
              )}
            </div>
            <div className="rounded-xl p-2.5 shrink-0 bg-white/10 text-cyan-300 border border-white/10">
              <Receipt className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Total Collections Card */}
        <Card
          className="border-0 shadow-sm text-white overflow-hidden rounded-xl bg-gradient-to-br from-[#023e52] to-[#012531]"
        >
          <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-200 truncate">
                  Total Collections
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-0.5 truncate">
                {formatCompact(activeMetrics.total)}
              </p>
              <p className="text-xs text-emerald-100/90 font-mono truncate">
                {formatCurrency(activeMetrics.total)}
              </p>
              {activeMetrics.yoy ? (
                <div className="text-[11px] text-gray-300 flex items-center gap-1.5 mt-0.5 flex-wrap">
                  <span className={activeMetrics.yoy.total.diff >= 0 ? 'text-emerald-300 font-semibold' : 'text-pink-300 font-semibold'}>
                    {activeMetrics.yoy.total.diff >= 0 ? '+' : ''}{activeMetrics.yoy.total.pct.toFixed(1)}% YoY
                  </span>
                  <span className="text-gray-400">vs 2025: {formatCompact(activeMetrics.totalPrior)}</span>
                </div>
              ) : (
                <p className="text-[11px] text-emerald-300/90 font-medium truncate mt-0.5">
                  All 3 streams · {activeMetrics.quarterLabel}
                </p>
              )}
            </div>
            <div className="rounded-xl p-2.5 shrink-0 bg-white/10 text-emerald-300 border border-white/10">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Side-by-side 2025 vs 2026 Fiscal Visualizations */}
      <div className="rounded-2xl p-6 shadow-xl border border-[#045975] space-y-4" style={{ backgroundColor: TEAL }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-cyan-300" />
              Fiscal Revenue Comparison
            </h3>
            <p className="text-xs text-cyan-200/80 mt-0.5">
              {chartStreamMode === 'total' 
                ? 'Side-by-side quarterly comparison (2025 vs 2026). Q3 data reflects results through September.'
                : 'Comparative view of tax streams (2025 vs 2026 YTD). Data reflects cumulative collections through September.'}
            </p>
          </div>
          <div className="flex items-center gap-1 bg-black/20 p-1 rounded-lg border border-white/10">
            <button
              onClick={() => setChartStreamMode('total')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                chartStreamMode === 'total' ? 'bg-white/20 text-white shadow-sm' : 'text-gray-300 hover:text-white'
              }`}
            >
              Total Collections
            </button>
            <button
              onClick={() => setChartStreamMode('streams')}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                chartStreamMode === 'streams' ? 'bg-white/20 text-white shadow-sm' : 'text-gray-300 hover:text-white'
              }`}
            >
              Stream Breakdown
            </button>
          </div>
        </div>

        {chartStreamMode === 'total' ? (
          <div>
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={quarterlyComparisonChartData} margin={{ top: 15, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.85)' }}
                  axisLine={{ stroke: '#045975' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.85)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${(v / 1_000_000).toFixed(1)}M`}
                />
                <Tooltip content={<RetoolTooltip />} />
                <Bar dataKey="val_2025" name="val_2025" fill={BAR_2025} radius={[4, 4, 0, 0]} maxBarSize={48} />
                <Bar dataKey="val_2026" name="val_2026" fill={BAR_2026} radius={[4, 4, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
            <RetoolLegend items={[{ label: 'Year 2025 Collections', color: BAR_2025 }, { label: 'Year 2026 Collections', color: BAR_2026 }]} />
          </div>
        ) : (
          <div className="space-y-4">
            <ResponsiveContainer width="100%" height={290}>
              <BarChart data={streamComparisonChartData} margin={{ top: 15, right: 30, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" vertical={false} />
                <XAxis
                  dataKey="stream"
                  tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.85)' }}
                  axisLine={{ stroke: '#045975' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.85)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `$${(v / 1_000_000).toFixed(1)}M`}
                />
                <Tooltip content={<RetoolTooltip />} />
                <Bar dataKey="val_2025" name="val_2025" fill={BAR_2025} radius={[4, 4, 0, 0]} maxBarSize={64} />
                <Bar dataKey="val_2026" name="val_2026" fill={BAR_2026} radius={[4, 4, 0, 0]} maxBarSize={64} />
              </BarChart>
            </ResponsiveContainer>
            <RetoolLegend
              items={[
                { label: 'Year 2025 Collections (YTD)', color: BAR_2025 },
                { label: 'Year 2026 Collections (YTD)', color: BAR_2026 },
              ]}
            />
          </div>
        )}
      </div>

    </div>
  )
}
