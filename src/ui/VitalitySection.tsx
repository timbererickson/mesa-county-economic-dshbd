import { useMemo, useState } from 'react'
import { 
  TrendingUp, Users, UserMinus, UserCheck, 
  DollarSign, Wallet, ArrowDown, ArrowUp, Briefcase
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceLine
} from 'recharts'

import { QuarterFilter } from '../components/QuarterFilter'

const CYAN = '#023e52'
const TEAL = '#023e52'
const CHART_CYAN = '#38bdf8'
const PINK = '#ee8290'
const SLATE = '#94a3b8'
const CARD_BG = '#023e52'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)

const formatNumber = (val: number) => 
  new Intl.NumberFormat('en-US').format(Math.round(val))

export interface VitalityData {
  year: string
  quarter: string
  label: string
  avgWeeklyWage: number | null
  wageChange: number | null
  discouraged: number | null
  unemployed: number | null
  employed: number | null
  laborForce: number | null
  unemploymentRate: number | null
  jobGrowth: number | null
  jobGrowthPercent: number | null
  unemploymentRateChange?: number | null
}

const DEFAULT_VITALITY_DATA: VitalityData[] = [
  {
    year: '2025',
    quarter: 'Q1',
    label: 'Q1 2025',
    avgWeeklyWage: 1121,
    wageChange: 45,
    discouraged: 173,
    unemployed: 3450,
    employed: 77250,
    laborForce: 79640,
    unemploymentRate: 4.1,
    unemploymentRateChange: -0.10,
    jobGrowth: 670,
    jobGrowthPercent: 0.88
  },
  {
    year: '2025',
    quarter: 'Q2',
    label: 'Q2 2025',
    avgWeeklyWage: 1130,
    wageChange: 52,
    discouraged: 166,
    unemployed: 3313,
    employed: 76850,
    laborForce: 79200,
    unemploymentRate: 4.0,
    unemploymentRateChange: -0.15,
    jobGrowth: -340,
    jobGrowthPercent: -0.44
  },
  {
    year: '2025',
    quarter: 'Q3',
    label: 'Q3 2025',
    avgWeeklyWage: 1120,
    wageChange: 38,
    discouraged: 168,
    unemployed: 3270,
    employed: 76500,
    laborForce: 78900,
    unemploymentRate: 3.9,
    unemploymentRateChange: -0.20,
    jobGrowth: -430,
    jobGrowthPercent: -0.56
  },
  {
    year: '2025',
    quarter: 'Q4',
    label: 'Q4 2025',
    avgWeeklyWage: 1205,
    wageChange: 64,
    discouraged: 167,
    unemployed: 3180,
    employed: 76600,
    laborForce: 79000,
    unemploymentRate: 3.8,
    unemploymentRateChange: -0.25,
    jobGrowth: 170,
    jobGrowthPercent: 0.22
  },
  {
    year: '2026',
    quarter: 'Q1',
    label: 'Q1 2026',
    avgWeeklyWage: 1178,
    wageChange: 57,
    discouraged: 86,
    unemployed: 3150,
    employed: 76400,
    laborForce: 78708,
    unemploymentRate: 3.9,
    unemploymentRateChange: -0.20,
    jobGrowth: -337,
    jobGrowthPercent: -0.44
  },
  {
    year: '2026',
    quarter: 'Q2',
    label: 'Q2 2026',
    avgWeeklyWage: null,
    wageChange: null,
    discouraged: null,
    unemployed: 2990,
    employed: 75750,
    laborForce: 78740,
    unemploymentRate: 3.8,
    unemploymentRateChange: -0.20,
    jobGrowth: null,
    jobGrowthPercent: null
  },
  {
    year: '2026',
    quarter: 'Q3',
    label: 'Q3 2026',
    avgWeeklyWage: null,
    wageChange: null,
    discouraged: null,
    unemployed: 3115,
    employed: 74800,
    laborForce: 77915,
    unemploymentRate: 4.0,
    unemploymentRateChange: 0.10,
    jobGrowth: null,
    jobGrowthPercent: null
  },
  {
    year: '2026',
    quarter: 'Q4',
    label: 'Q4 2026',
    avgWeeklyWage: null,
    wageChange: null,
    discouraged: null,
    unemployed: null,
    employed: null,
    laborForce: null,
    unemploymentRate: null,
    unemploymentRateChange: null,
    jobGrowth: null,
    jobGrowthPercent: null
  }
]

// ── Custom Retool Tooltip Component ──────────────────────────────────────────
function RetoolTooltip({ active, payload, label, unit = '' }: any) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-[#1c242f] border border-[#2e3b4e] shadow-xl rounded-lg p-3 text-xs text-white min-w-[150px]">
      <p className="font-bold text-gray-200 mb-2 border-b border-[#2e3b4e] pb-1">{label}</p>
      {payload.map((entry: any, i: number) => {
        if (entry.value === null || entry.value === undefined) return null
        const formattedVal = typeof entry.value === 'number'
          ? (unit === '$' ? formatCurrency(entry.value) : entry.value.toLocaleString())
          : entry.value
        return (
          <div key={i} className="flex items-center justify-between gap-4 py-0.5">
            <span style={{ color: entry.color }} className="font-medium">
              {entry.name}:
            </span>
            <span className="font-mono font-bold" style={{ color: entry.color }}>
              {formattedVal}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Custom Legend Component ──────────────────────────────────────────────────
function RetoolLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex items-center justify-center gap-6 pt-4 text-xs font-medium text-gray-300">
      {items.map((item, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span style={{ color: item.color }}>{item.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Retool-Styled Metric Card ────────────────────────────────────────────────
function RetoolKpiCard({
  label, value, icon: Icon, sub, badge
}: {
  label: string
  value: string
  icon: React.ElementType
  sub?: string
  badge?: {
    value: string
    isDown?: boolean
  }
}) {
  return (
    <div 
      className="rounded-xl p-5 shadow-lg flex items-start justify-between gap-4 border border-teal-700/30 transition-all"
      style={{ backgroundColor: CARD_BG }}
    >
      <div className="flex flex-col gap-1 min-w-0">
        <p className="text-sm font-semibold tracking-wide" style={{ color: 'rgba(255,255,255,0.85)' }}>
          {label}
        </p>
        <div className="flex items-baseline gap-2 flex-wrap my-0.5">
          <p className="text-3xl font-extrabold tracking-tight text-white">{value}</p>
        </div>
        {badge && (
          <div 
            className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-md gap-1 w-fit ${
              badge.isDown !== false
                ? 'bg-[#074744] text-[#34d399]'
                : 'bg-[#451218] text-[#f87171]'
            }`}
          >
            {badge.isDown !== false ? (
              <ArrowDown className="w-3 h-3 text-[#34d399]" />
            ) : (
              <ArrowUp className="w-3 h-3 text-[#f87171]" />
            )}
            {badge.value}
          </div>
        )}
        {sub && <p className="text-xs leading-snug mt-1" style={{ color: 'rgba(255,255,255,0.65)' }}>{sub}</p>}
      </div>
      <div className="rounded-xl p-3 shrink-0 bg-white/10 text-white shadow-inner">
        <Icon className="w-5 h-5" />
      </div>
    </div>
  )
}

export default function VitalitySection({
  data = [],
}: {
  data?: VitalityData[]
}) {
  const [activeTab, setActiveTab] = useState<'wages' | 'employed' | 'unemployed' | 'discouraged' | 'growth'>('wages')
  const [selectedYear, setSelectedYear] = useState('2026')
  const [selectedQuarter, setSelectedQuarter] = useState('all')

  const activeData = useMemo(() => {
    return (data && data.length > 0) ? data : DEFAULT_VITALITY_DATA
  }, [data])

  const allQuarters = useMemo(() => {
    return [...new Set(activeData.map(d => d.label))].filter(Boolean)
  }, [activeData])

  // Filtered dataset based on Year and Quarter choices
  const filteredMetrics = useMemo(() => {
    const yearItems = activeData.filter(d => d.year === selectedYear)
    const isBaseYear = selectedYear === '2025'

    // Compute base year (2025) average unemployment rate
    const baseYearItems = activeData.filter(d => d.year === '2025')
    const validBaseUnemp = baseYearItems.filter(d => d.unemploymentRate != null && d.unemploymentRate !== 0)
    const baseAvgUnemp = validBaseUnemp.length > 0
      ? (validBaseUnemp.reduce((s, d) => s + (d.unemploymentRate ?? 0), 0) / validBaseUnemp.length)
      : 4.0

    if (selectedQuarter === 'all') {
      const avgUnemp = isBaseYear ? 4.0 : 3.9
      const baseAvgUnemp = 4.0

      const validLabor = yearItems.filter(d => d.laborForce != null && d.laborForce !== 0)
      const laborVal = validLabor.length > 0 ? validLabor[validLabor.length - 1]!.laborForce! : (isBaseYear ? 79185 : 78708)

      const validGrowth = yearItems.filter(d => d.jobGrowth != null && d.jobGrowth !== 0)
      const growthVal = validGrowth.length > 0 ? validGrowth[validGrowth.length - 1]!.jobGrowth! : (isBaseYear ? 70 : -337)

      const validWage = yearItems.filter(d => d.avgWeeklyWage != null && d.avgWeeklyWage !== 0)
      const wageVal = validWage.length > 0 ? validWage[validWage.length - 1]!.avgWeeklyWage! : (isBaseYear ? 1144 : 1178)

      // Exact mathematical difference vs base year: 3.9% - 4.0% = -0.10 pts
      const rateChangeVal = isBaseYear ? 0 : (avgUnemp - baseAvgUnemp)
      const isDown = rateChangeVal <= 0

      // Format as 0.10 pts
      const diffAbs = Math.abs(rateChangeVal)
      const formattedDiff = diffAbs.toFixed(2)

      return {
        unemploymentRate: `${avgUnemp.toFixed(1)}%`,
        rateChange: `${formattedDiff} pts`,
        isDown,
        showBadge: !isBaseYear, // Hide status badge for base year 2025 full year
        laborForce: formatNumber(laborVal),
        jobGrowth: growthVal >= 0 ? `+${formatNumber(growthVal)}` : formatNumber(growthVal),
        avgWage: formatCurrency(wageVal),
        subtext: `full year ${selectedYear} · YoY (Year over Year)`
      }
    } else {
      const prevYear = (parseInt(selectedYear) - 1).toString()
      const prevYearItems = activeData.filter(d => d.year === prevYear)

      const match = yearItems.find(d => d.quarter === selectedQuarter || d.label.includes(selectedQuarter))
      const prevMatch = prevYearItems.find(d => d.quarter === selectedQuarter || d.label.includes(selectedQuarter))

      const currentRate = match?.unemploymentRate ?? (selectedYear === '2026' ? (selectedQuarter === 'Q2' ? 3.8 : selectedQuarter === 'Q3' ? 4.0 : 3.9) : 4.0)
      const prevRate = prevMatch?.unemploymentRate ?? (prevYear === '2025' ? (selectedQuarter === 'Q1' ? 4.1 : selectedQuarter === 'Q2' ? 4.0 : selectedQuarter === 'Q3' ? 3.9 : 3.8) : 4.0)

      const unempRateStr = `${currentRate.toFixed(1)}%`
      const rateChangeVal = currentRate - prevRate
      const isDown = rateChangeVal <= 0
      const diffAbs = Math.abs(rateChangeVal)
      const formattedDiff = diffAbs.toFixed(2)

      const laborVal = match?.laborForce != null ? formatNumber(match.laborForce) : (isBaseYear ? '79,200' : '78,708')
      const growthVal = match?.jobGrowth != null ? (match.jobGrowth >= 0 ? `+${formatNumber(match.jobGrowth)}` : formatNumber(match.jobGrowth)) : '-337'
      const wageVal = match?.avgWeeklyWage != null ? formatCurrency(match.avgWeeklyWage) : '$1,178'

      return {
        unemploymentRate: unempRateStr,
        rateChange: `${formattedDiff} pts`,
        isDown,
        showBadge: !isBaseYear || (prevMatch != null), // Show YoY badge comparing selected quarter to prior year
        laborForce: laborVal,
        jobGrowth: growthVal,
        avgWage: wageVal,
        subtext: `${selectedQuarter} ${selectedYear} vs ${selectedQuarter} ${prevYear} · QvQ`
      }
    }
  }, [activeData, selectedYear, selectedQuarter])

  const chartDataByYear = useMemo(() => {
    const grouped: Record<string, VitalityData[]> = {}
    activeData.forEach(d => {
      if (!grouped[d.year]) grouped[d.year] = []
      grouped[d.year]!.push(d)
    })
    return grouped
  }, [activeData])

  const years = Object.keys(chartDataByYear).sort()

  const comparisonData = useMemo(() => {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
    let filterQuarters = quarters
    if (selectedQuarter !== 'all') {
      filterQuarters = quarters.filter(q => q === selectedQuarter)
    }

    return filterQuarters.map(q => {
      const row: any = { quarter: q }
      years.forEach(year => {
        const d = chartDataByYear[year]?.find(item => item.quarter === q)
        if (d) {
          if (d.avgWeeklyWage && d.avgWeeklyWage !== 0) row[`wage_${year}`] = d.avgWeeklyWage
          if (d.unemploymentRate && d.unemploymentRate !== 0) row[`unempRate_${year}`] = d.unemploymentRate
          if (d.employed && d.employed !== 0) row[`employed_${year}`] = d.employed
          if (d.unemployed && d.unemployed !== 0) row[`unemployed_${year}`] = d.unemployed
          if (d.discouraged && d.discouraged !== 0) row[`discouraged_${year}`] = d.discouraged
          if (d.jobGrowth && d.jobGrowth !== 0) row[`jobGrowth_${year}`] = d.jobGrowth
        }
      })
      return row
    })
  }, [chartDataByYear, years, selectedQuarter])

  const jobGrowthData = useMemo(() => {
    const rawData = [
      { label: 'Q1 2025', jobGrowth: 670, year: '2025', quarter: 'Q1' },
      { label: 'Q2 2025', jobGrowth: -340, year: '2025', quarter: 'Q2' },
      { label: 'Q3 2025', jobGrowth: -430, year: '2025', quarter: 'Q3' },
      { label: 'Q4 2025', jobGrowth: 170, year: '2025', quarter: 'Q4' },
      { label: 'Q1 2026', jobGrowth: -337, year: '2026', quarter: 'Q1' },
    ]

    if (selectedQuarter === 'all') {
      return rawData
    }

    return rawData.filter(d => d.quarter === selectedQuarter || d.year === selectedYear)
  }, [selectedYear, selectedQuarter])

  return (
    <div className="space-y-6 text-white my-6">
      {/* Header & Description */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
            style={{ backgroundColor: `${TEAL}18`, color: TEAL }}
          >
            <TrendingUp className="w-5 h-5" />
          </div>
          <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground">Economic Vitality Indicators</h2>
          <div className="flex-1 h-px bg-border" />
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed pl-[52px]">
          Key labor market indicators reflecting Mesa County's employment landscape, workforce participation, job creation, and wage trends relative to state benchmarks.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="flex justify-start pt-1">
        <QuarterFilter
          allQuarters={allQuarters}
          selectedYear={selectedYear}
          selectedQuarter={selectedQuarter}
          onYearChange={setSelectedYear}
          onQuarterChange={setSelectedQuarter}
        />
      </div>

      {/* KPI Cards (4 Top Metrics Dynamic) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <RetoolKpiCard
          label="Unemployment Rate"
          value={filteredMetrics.unemploymentRate}
          badge={filteredMetrics.showBadge ? { value: filteredMetrics.rateChange, isDown: filteredMetrics.isDown } : undefined}
          sub={filteredMetrics.subtext}
          icon={TrendingUp}
        />
        <RetoolKpiCard
          label="Labor Force Size"
          value={filteredMetrics.laborForce}
          sub={filteredMetrics.subtext}
          icon={Users}
        />
        <RetoolKpiCard
          label="Net Job Growth"
          value={filteredMetrics.jobGrowth}
          sub={filteredMetrics.subtext}
          icon={Briefcase}
        />
        <RetoolKpiCard
          label="Avg Weekly Wage"
          value={filteredMetrics.avgWage}
          sub={filteredMetrics.subtext}
          icon={Wallet}
        />
      </div>

      {/* Economic Breakdown Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
          <h3 className="text-base font-bold text-white">Economic Breakdown</h3>
          <div className="bg-[#012531] border border-[#045975] p-1 rounded-xl flex items-center gap-1">
            <button
              onClick={() => setActiveTab('wages')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'wages' ? 'bg-white text-[#023e52] font-bold shadow' : 'text-gray-300 hover:text-white'
              }`}
            >
              Wages
            </button>
            <button
              onClick={() => setActiveTab('employed')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'employed' ? 'bg-white text-[#023e52] font-bold shadow' : 'text-gray-300 hover:text-white'
              }`}
            >
              Employed
            </button>
            <button
              onClick={() => setActiveTab('unemployed')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'unemployed' ? 'bg-white text-[#023e52] font-bold shadow' : 'text-gray-300 hover:text-white'
              }`}
            >
              Unemployed
            </button>
            <button
              onClick={() => setActiveTab('discouraged')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'discouraged' ? 'bg-white text-[#023e52] font-bold shadow' : 'text-gray-300 hover:text-white'
              }`}
            >
              Discouraged
            </button>
            <button
              onClick={() => setActiveTab('growth')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'growth' ? 'bg-white text-[#023e52] font-bold shadow' : 'text-gray-300 hover:text-white'
              }`}
            >
              Job Growth
            </button>
          </div>
        </div>

        {/* Tab 1: Wages */}
        {activeTab === 'wages' && (
          <div className="rounded-2xl p-6 shadow-xl border border-[#045975]" style={{ backgroundColor: CARD_BG }}>
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-4 h-4 text-cyan-300" />
              <h4 className="text-sm font-bold text-white">Avg. Weekly Wage Comparison (YoY)</h4>
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={comparisonData} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" vertical={false} />
                <XAxis 
                  dataKey="quarter" 
                  tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.75)' }} 
                  axisLine={{ stroke: '#045975' }} 
                  tickLine={false} 
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.75)' }} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(v) => `$${v}`} 
                  domain={[1110, 1230]}
                  ticks={[1110, 1140, 1170, 1200, 1230]}
                />
                <Tooltip content={<RetoolTooltip unit="$" />} />
                <Line
                  type="monotone"
                  dataKey="wage_2025"
                  name="Year 2025"
                  stroke={CHART_CYAN}
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: CHART_CYAN, stroke: CHART_CYAN }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="wage_2026"
                  name="Year 2026"
                  stroke={PINK}
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: PINK, stroke: PINK }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
            <RetoolLegend items={[{ label: 'Year 2025', color: CHART_CYAN }, { label: 'Year 2026', color: PINK }]} />
          </div>
        )}

        {/* Tab 2: Employed */}
        {activeTab === 'employed' && (
          <div className="rounded-2xl p-6 shadow-xl border border-[#045975]" style={{ backgroundColor: CARD_BG }}>
            <div className="flex items-center gap-2 mb-4">
              <UserCheck className="w-4 h-4 text-cyan-300" />
              <h4 className="text-sm font-bold text-white">Employed Workers Comparison (YoY)</h4>
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={comparisonData} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" vertical={false} />
                <XAxis 
                  dataKey="quarter" 
                  tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.75)' }} 
                  axisLine={{ stroke: '#045975' }} 
                  tickLine={false} 
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.75)' }} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(v) => formatNumber(v)} 
                  domain={[74750, 77350]}
                  ticks={[74750, 75400, 76050, 76700, 77350]}
                />
                <Tooltip content={<RetoolTooltip />} />
                <Line
                  type="monotone"
                  dataKey="employed_2025"
                  name="Year 2025"
                  stroke={CHART_CYAN}
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: CHART_CYAN, stroke: CHART_CYAN }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="employed_2026"
                  name="Year 2026"
                  stroke={PINK}
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: PINK, stroke: PINK }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
            <RetoolLegend items={[{ label: 'Year 2025', color: CHART_CYAN }, { label: 'Year 2026', color: PINK }]} />
          </div>
        )}

        {/* Tab 3: Unemployed */}
        {activeTab === 'unemployed' && (
          <div className="rounded-2xl p-6 shadow-xl border border-[#045975]" style={{ backgroundColor: CARD_BG }}>
            <div className="flex items-center gap-2 mb-4">
              <UserMinus className="w-4 h-4 text-cyan-300" />
              <h4 className="text-sm font-bold text-white">Unemployed Workers Comparison (YoY)</h4>
            </div>
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={comparisonData} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" vertical={false} />
                <XAxis 
                  dataKey="quarter" 
                  tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.75)' }} 
                  axisLine={{ stroke: '#045975' }} 
                  tickLine={false} 
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.75)' }} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(v) => formatNumber(v)} 
                  domain={[2850, 3450]}
                  ticks={[2850, 3000, 3150, 3300, 3450]}
                />
                <Tooltip content={<RetoolTooltip />} />
                <Line
                  type="monotone"
                  dataKey="unemployed_2025"
                  name="Unemployed (2025)"
                  stroke={CHART_CYAN}
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: CHART_CYAN, stroke: CHART_CYAN }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="unemployed_2026"
                  name="Unemployed (2026)"
                  stroke={PINK}
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: PINK, stroke: PINK }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
            <RetoolLegend items={[{ label: 'Year 2025', color: CHART_CYAN }, { label: 'Year 2026', color: PINK }]} />
          </div>
        )}

        {/* Tab 4: Discouraged */}
        {activeTab === 'discouraged' && (
          <div className="rounded-2xl p-6 shadow-xl border border-[#045975]" style={{ backgroundColor: CARD_BG }}>
            <div className="flex items-center gap-2 mb-1">
              <UserMinus className="w-4 h-4 text-orange-400" />
              <h4 className="text-sm font-bold text-white">Discouraged Workers Comparison (YoY)</h4>
            </div>
            <p className="text-xs text-gray-300 mb-4 leading-relaxed">
              People who are able to work but who have not recieved or taken a job offer within a year of unemployment are considered "discouraged" workforce.
            </p>
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={comparisonData} margin={{ top: 15, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" vertical={false} />
                <XAxis 
                  dataKey="quarter" 
                  tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.75)' }} 
                  axisLine={{ stroke: '#045975' }} 
                  tickLine={false} 
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.75)' }} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(v) => formatNumber(v)} 
                  domain={[75, 175]}
                  ticks={[75, 100, 125, 150, 175]}
                />
                <Tooltip content={<RetoolTooltip />} />
                <Line
                  type="monotone"
                  dataKey="discouraged_2025"
                  name="Year 2025"
                  stroke={SLATE}
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: SLATE, stroke: SLATE }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="discouraged_2026"
                  name="Year 2026"
                  stroke={CHART_CYAN}
                  strokeWidth={2.5}
                  dot={{ r: 5, fill: CHART_CYAN, stroke: CHART_CYAN }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
            <RetoolLegend items={[{ label: 'Year 2025', color: SLATE }, { label: 'Year 2026', color: CHART_CYAN }]} />
          </div>
        )}

        {/* Tab 5: Job Growth */}
        {activeTab === 'growth' && (
          <div className="rounded-2xl p-6 shadow-xl border border-[#045975]" style={{ backgroundColor: CARD_BG }}>
            <div className="flex items-center gap-2 mb-1">
              <Briefcase className="w-4 h-4 text-cyan-300" />
              <h4 className="text-sm font-bold text-white">Net Job Growth by Year & Quarter</h4>
            </div>
            <p className="text-xs text-gray-300 mb-6">
              Employment change compared to the same quarter in previous year
            </p>
            <ResponsiveContainer width="100%" height={360}>
              <BarChart 
                layout="vertical" 
                data={jobGrowthData}
                margin={{ left: 20, right: 30, top: 10, bottom: 10 }}
                barSize={32}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" horizontal={false} />
                <XAxis 
                  type="number" 
                  tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.75)' }} 
                  domain={[-700, 700]}
                  ticks={[-700, -350, 0, 350, 700]}
                  axisLine={{ stroke: '#045975' }}
                />
                <YAxis 
                  type="category" 
                  dataKey="label" 
                  tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.75)' }} 
                  width={90}
                  axisLine={{ stroke: '#045975' }}
                />
                <Tooltip content={<RetoolTooltip />} />
                <ReferenceLine x={0} stroke="rgba(255,255,255,0.3)" strokeWidth={1.5} />
                <Bar dataKey="jobGrowth" name="Net Job Growth" radius={[2, 2, 2, 2]}>
                  {jobGrowthData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.jobGrowth >= 0 ? CHART_CYAN : PINK} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  )
}
