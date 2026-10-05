import { useEffect, useMemo, useState } from 'react'
import fetchEconomicVitality from '../backend/getEconomicVitality'
import fetchIndicatorData from '../backend/getIndicatorData'
import fetchPermitData, { type PermitRecord, isExcludedSubtype, isRecipientPendingStatus } from '../backend/getPermitData'

// Import UI Sections

import InfraSection from '../ui/InfraSection'
import FiscalSection from '../ui/FiscalSection'
import VitalitySection from '../ui/VitalitySection'
import HumanServicesCallout from '../ui/HumanServicesCallout'

import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { Clock, ListFilter, Building2, DollarSign, ArrowUpDown, RefreshCw, ClipboardList, TrendingUp, Landmark, HardHat, Home, Layers, PauseCircle } from 'lucide-react'
import { DevelopmentFilter, type SubtypeOption } from '../components/DevelopmentFilter'

// ── Types ──────────────────────────────────────────────────────────────────

interface MajorProject {
  quarter: string
  permitNumber: string
  recordType: string
  recordSubtype: string
  valuation: number
  acceptedDate: string | null
  issuedDate: string | null
  daysToIssue: number | null
}

interface QuarterStat {
  quarter: string
  commercial: number
  residential: number
  total: number
  medianDays: number
  queueCount: number
  majorCount: number
  majorValue: number
}

// ── Brand colors ────────────────────────────────────────────────────────────
const TEAL = '#023e52'
const CHART_CYAN = '#38bdf8'
const CHART_PINK = '#ee8290'
const PINK = '#e4808c'
const RED  = '#c12033'

// ── Formatting ─────────────────────────────────────────────────────────────

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)

const formatCompact = (val: number) => {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
  return `$${val}`
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ── Custom Retool Tooltip Component ──────────────────────────────────────────
function RetoolTooltip({ active, payload, label, unit = '' }: any) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="bg-[#1c242f] border border-[#2e3b4e] shadow-xl rounded-lg p-3 text-xs text-white min-w-[160px]">
      <p className="font-bold text-gray-200 mb-2 border-b border-[#2e3b4e] pb-1">{label}</p>
      {payload.map((entry: any, i: number) => {
        if (entry.value === null || entry.value === undefined) return null
        let formattedVal = ''
        if (typeof entry.value === 'number') {
          if (unit === '$') {
            formattedVal = formatCurrency(entry.value)
          } else if (unit === 'permits') {
            formattedVal = `${entry.value.toLocaleString()} permits`
          } else {
            formattedVal = entry.value.toLocaleString()
          }
        } else {
          formattedVal = entry.value
        }

        const labelName = 
          entry.name === 'count_2025' ? 'Year 2025' :
          entry.name === 'count_2026' ? 'Year 2026' :
          entry.name === 'value_2025' ? 'Year 2025' :
          entry.name === 'value_2026' ? 'Year 2026' :
          entry.name === 'major_2025' ? 'Year 2025' :
          entry.name === 'major_2026' ? 'Year 2026' :
          entry.name

        return (
          <div key={i} className="flex items-center justify-between gap-4 py-0.5">
            <span style={{ color: entry.color }} className="font-medium">
              {labelName}:
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

// ── Stat Card ──────────────────────────────────────────────────────────────

function StatCard({
  title, value, sub, icon: Icon, accent,
}: {
  title: string
  value: string | number
  sub?: string
  icon: React.ElementType
  accent: string
}) {
  return (
    <div className="rounded-xl border p-5 shadow-sm flex items-start justify-between gap-4" style={{ backgroundColor: TEAL }}>
      <div className="flex flex-col gap-1 min-w-0">
        <p className="text-sm font-medium leading-tight" style={{ color: 'rgba(255,255,255,0.75)' }}>{title}</p>
        <p className="text-3xl font-bold tracking-tight text-white">{value}</p>
        {sub && <p className="text-xs leading-snug" style={{ color: 'rgba(255,255,255,0.6)' }}>{sub}</p>}
      </div>
      <div className={`rounded-xl p-3 shrink-0 ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  )
}

// ── Major Projects Table ───────────────────────────────────────────────────

const projectColumns: ColumnDef<MajorProject>[] = [
  {
    accessorKey: 'permitNumber',
    header: 'Permit',
    cell: ({ getValue }) => (
      <span className="font-mono text-xs font-semibold">{getValue() as string}</span>
    ),
  },
  {
    accessorKey: 'recordSubtype',
    header: 'Type',
    cell: ({ getValue }) => (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 whitespace-nowrap">
        {getValue() as string}
      </span>
    ),
  },
  {
    accessorKey: 'quarter',
    header: 'Quarter',
    cell: ({ getValue }) => <span className="text-sm">{getValue() as string}</span>,
  },
  {
    accessorKey: 'issuedDate',
    header: 'Issued',
    cell: ({ getValue }) => (
      <span className="text-sm tabular-nums">{formatDate(getValue() as string)}</span>
    ),
  },
  {
    accessorKey: 'daysToIssue',
    header: 'Days to Issue',
    cell: ({ getValue }) => {
      const d = getValue() as number | null
      return <span className="text-sm tabular-nums">{d !== null ? `${d}d` : '—'}</span>
    },
  },
  {
    accessorKey: 'valuation',
    header: ({ column }) => (
      <button
        className="flex items-center gap-1 hover:text-foreground transition-colors"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Est. Value <ArrowUpDown className="w-3 h-3" />
      </button>
    ),
    cell: ({ getValue }) => (
      <span className="font-semibold text-sm tabular-nums">{formatCurrency(getValue() as number)}</span>
    ),
    sortingFn: 'basic',
  },
]

function MajorProjectsTable({ projects }: { projects: MajorProject[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'valuation', desc: true }])

  const table = useReactTable({
    data: projects,
    columns: projectColumns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  if (projects.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-muted-foreground text-sm border rounded-md">
        No major projects for this quarter.
      </div>
    )
  }

  return (
    <div className="rounded-md border overflow-auto">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/40 border-b">
          {table.getHeaderGroups().map(hg => (
            <tr key={hg.id}>
              {hg.headers.map(h => (
                <th key={h.id} className="p-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody className="divide-y">
          {table.getRowModel().rows.map(row => (
            <tr key={row.id} className="hover:bg-muted/30 transition-colors">
              {row.getVisibleCells().map(cell => (
                <td key={cell.id} className="p-3">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Section Header ─────────────────────────────────────────────────────

function SectionHeader({
  icon: Icon, title, description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <div
          className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
          style={{ backgroundColor: `${TEAL}18`, color: TEAL }}
        >
          <Icon className="w-5 h-5" />
        </div>
        <h2 className="text-lg md:text-xl font-bold tracking-tight text-foreground">{title}</h2>
        <div className="flex-1 h-px bg-border" />
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed pl-[52px]">{description}</p>
    </div>
  )
}

// ── Main Dashboard Component ───────────────────────────────────────────────

export default function DevMetricsDashboard() {
  const [loading, setLoading] = useState(true)
  const [permitData, setPermitData] = useState<any>(null)
  const [indicatorData, setIndicatorData] = useState<any>(null)
  const [vitalityData, setVitalityData] = useState<any>(null)

  const [selectedYear, setSelectedYear] = useState('all')
  const [selectedQuarter, setSelectedQuarter] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedSubtypes, setSelectedSubtypes] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'permits' | 'valuation' | 'major'>('permits')
  const [quarterlyViewMode, setQuarterlyViewMode] = useState<'auto' | 'allQuarters'>('auto')

  const handleYearChange = (year: string) => {
    setSelectedYear(year)
    setSelectedQuarter('all')
  }

  async function loadData() {
    setLoading(true)
    try {
      const results = await Promise.allSettled([
        fetchPermitData(),
        fetchIndicatorData(),
        fetchEconomicVitality()
      ])
      if (results[0].status === 'fulfilled') setPermitData(results[0].value)
      if (results[1].status === 'fulfilled') setIndicatorData(results[1].value)
      if (results[2].status === 'fulfilled') setVitalityData(results[2].value)
    } catch (e) {
      console.error('Failed to load data:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const rawPermits: PermitRecord[] = useMemo(() => permitData?.rawPermits ?? [], [permitData])
  const availableSubtypes: string[] = useMemo(() => permitData?.availableSubtypes ?? [], [permitData])
  const permitQuarters: string[] = useMemo(() => permitData?.allQuarters ?? [], [permitData])

  // 1. Current filter bounds (permits filtered by Year, Quarter, and Type)
  const boundsPermits = useMemo(() => {
    return rawPermits.filter(p => {
      // Type filter (Commercial vs Residential vs All)
      if (selectedType !== 'all') {
        const selNorm = selectedType.toLowerCase()
        const recNorm = (p.recordType || '').toLowerCase()
        if (!recNorm.includes(selNorm)) return false
      }

      // Target Year filter
      const isYearAll = !selectedYear || selectedYear.toLowerCase() === 'all'
      if (!isYearAll && p.year !== selectedYear) return false

      // Target Quarter filter
      const isQuarterAll = !selectedQuarter || selectedQuarter.toLowerCase() === 'all'
      if (!isQuarterAll) {
        const sqNorm = selectedQuarter.trim().toUpperCase()
        const qVal = p.openQuarter?.toUpperCase() || (p.quarter?.match(/Q[1-4]/i)?.[0]?.toUpperCase() ?? '')
        if (sqNorm.startsWith('Q') && sqNorm.length === 2) {
          if (qVal !== sqNorm) return false
        } else {
          if (!p.quarter.toUpperCase().includes(sqNorm)) return false
        }
      }

      return true
    })
  }, [rawPermits, selectedType, selectedYear, selectedQuarter])

  // 2. Subtypes that pertain to the dataset, with dynamic counts in the current bounds
  const subtypeOptions: SubtypeOption[] = useMemo(() => {
    const basePermits = rawPermits.filter(p => {
      if (selectedType !== 'all') {
        const selNorm = selectedType.toLowerCase()
        const recNorm = (p.recordType || '').toLowerCase()
        if (!recNorm.includes(selNorm)) return false
      }
      return true
    })

    const allSubtypesSet = new Set<string>()
    basePermits.forEach(p => {
      if (p.recordSubtype) allSubtypesSet.add(p.recordSubtype)
    })
    selectedSubtypes.forEach(st => {
      if (st) allSubtypesSet.add(st)
    })

    // Count matching permits in the current bounds (target year + quarter + type)
    const boundsCountMap: Record<string, number> = {}
    boundsPermits.forEach(p => {
      const st = p.recordSubtype || 'General'
      boundsCountMap[st] = (boundsCountMap[st] || 0) + 1
    })

    return [...allSubtypesSet]
      .map(subtype => ({
        subtype,
        count: boundsCountMap[subtype] || 0,
      }))
      .sort((a, b) => {
        const aSelected = selectedSubtypes.includes(a.subtype) ? 1 : 0
        const bSelected = selectedSubtypes.includes(b.subtype) ? 1 : 0
        if (aSelected !== bSelected) return bSelected - aSelected
        if ((b.count > 0 ? 1 : 0) !== (a.count > 0 ? 1 : 0)) {
          return b.count - a.count
        }
        if (b.count !== a.count) return b.count - a.count
        return a.subtype.localeCompare(b.subtype)
      })
  }, [rawPermits, boundsPermits, selectedType, selectedSubtypes])

  // 3. Final filtered permits (boundsPermits filtered by selectedSubtypes; selection persists across year/quarter changes)
  const filteredPermits = useMemo(() => {
    if (selectedSubtypes.length === 0) return boundsPermits
    return boundsPermits.filter(p => {
      const st = p.recordSubtype || 'General'
      return selectedSubtypes.includes(st)
    })
  }, [boundsPermits, selectedSubtypes])

  const kpiMedianAcceptedToApproved = useMemo(() => {
    const daysList = filteredPermits
      .map(p => p.daysAcceptedToApproved)
      .filter((d): d is number => d != null && !isNaN(d))
      .sort((a, b) => a - b)

    if (daysList.length === 0) return '0 days'
    const mid = Math.floor(daysList.length / 2)
    const median = daysList.length % 2 !== 0
      ? daysList[mid]
      : (daysList[mid - 1] + daysList[mid]) / 2
    return `${Math.round(median * 10) / 10} days`
  }, [filteredPermits])

  const kpiMedianApprovedToIssued = useMemo(() => {
    const daysList = filteredPermits
      .map(p => p.daysApprovedToIssued)
      .filter((d): d is number => d != null && !isNaN(d))
      .sort((a, b) => a - b)

    if (daysList.length === 0) return '0 days'
    const mid = Math.floor(daysList.length / 2)
    const median = daysList.length % 2 !== 0
      ? daysList[mid]
      : (daysList[mid - 1] + daysList[mid]) / 2
    return `${Math.round(median * 10) / 10} days`
  }, [filteredPermits])

  const kpiPendingRecipient = useMemo(() => {
    return filteredPermits.filter(p => isRecipientPendingStatus(p.recordStatus)).length
  }, [filteredPermits])

  const filteredProjects = useMemo(() => {
    return filteredPermits
      .filter(p => p.valuation >= 1000000)
      .sort((a, b) => b.valuation - a.valuation)
  }, [filteredPermits])

  const kpiMajorCount = filteredProjects.length
  const kpiMajorValue = useMemo(() => filteredProjects.reduce((s, p) => s + p.valuation, 0), [filteredProjects])
  const kpiTotalPermits = filteredPermits.length
  const kpiTotalValuation = useMemo(() => filteredPermits.reduce((s, p) => s + p.valuation, 0), [filteredPermits])

  // Dynamic Chart Breakdown that always matches the active filters (Type, Subtype, Year, Quarter)
  const isQuarterSpecific = Boolean(selectedQuarter && selectedQuarter.toLowerCase() !== 'all')
  const isMonthlyMode = isQuarterSpecific && quarterlyViewMode !== 'allQuarters'

  const chartBreakdownData = useMemo(() => {
    type CatDef = { key: string; label: string }
    let categories: CatDef[] = []

    if (isMonthlyMode) {
      const q = selectedQuarter.trim().toUpperCase()
      if (q === 'Q1') {
        categories = [{ key: 'Jan', label: 'Jan' }, { key: 'Feb', label: 'Feb' }, { key: 'Mar', label: 'Mar' }]
      } else if (q === 'Q2') {
        categories = [{ key: 'Apr', label: 'Apr' }, { key: 'May', label: 'May' }, { key: 'Jun', label: 'Jun' }]
      } else if (q === 'Q3') {
        categories = [{ key: 'Jul', label: 'Jul' }, { key: 'Aug', label: 'Aug' }, { key: 'Sep', label: 'Sep' }]
      } else if (q === 'Q4') {
        categories = [{ key: 'Oct', label: 'Oct' }, { key: 'Nov', label: 'Nov' }, { key: 'Dec', label: 'Dec' }]
      } else {
        categories = [{ key: q, label: q }]
      }
    } else {
      categories = [
        { key: 'Q1', label: 'Q1' },
        { key: 'Q2', label: 'Q2' },
        { key: 'Q3', label: 'Q3' },
        { key: 'Q4', label: 'Q4' },
      ]
    }

    const map: Record<string, {
      category: string
      count_2025: number
      count_2026: number
      value_2025: number
      value_2026: number
      major_2025: number
      major_2026: number
    }> = {}

    categories.forEach(c => {
      map[c.key] = {
        category: c.label,
        count_2025: 0,
        count_2026: 0,
        value_2025: 0,
        value_2026: 0,
        major_2025: 0,
        major_2026: 0,
      }
    })

    // Filter permits by Type and Subtypes (chart honors current type and subtype filters)
    const basePermits = rawPermits.filter(p => {
      if (p.recordType !== 'Residential' && p.recordType !== 'Commercial') return false
      if (isExcludedSubtype(p.recordSubtype)) return false
      const yrNum = parseInt(p.year, 10)
      if (isNaN(yrNum) || (yrNum !== 2025 && yrNum !== 2026)) return false

      if (selectedType !== 'all' && p.recordType !== selectedType) return false
      if (selectedSubtypes.length > 0) {
        const st = p.recordSubtype || 'General'
        if (!selectedSubtypes.includes(st)) return false
      }
      return true
    })

    basePermits.forEach(p => {
      const qVal = p.openQuarter?.toUpperCase() || (p.quarter?.match(/Q[1-4]/i)?.[0]?.toUpperCase() ?? '')
      const yr = p.year
      let catKey = ''

      if (isMonthlyMode) {
        if (qVal !== selectedQuarter.trim().toUpperCase()) return
        catKey = p.month || ''
      } else {
        catKey = qVal
      }

      if (!catKey || !map[catKey]) return

      if (yr === '2025') {
        map[catKey].count_2025 += 1
        map[catKey].value_2025 += p.valuation
        if (p.valuation >= 1000000) {
          map[catKey].major_2025 += p.valuation
        }
      } else if (yr === '2026') {
        map[catKey].count_2026 += 1
        map[catKey].value_2026 += p.valuation
        if (p.valuation >= 1000000) {
          map[catKey].major_2026 += p.valuation
        }
      }
    })

    return categories.map(c => map[c.key])
  }, [rawPermits, isMonthlyMode, selectedQuarter, selectedType, selectedSubtypes])

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b px-6 py-4" style={{ backgroundColor: RED }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-3.5">
            <img
              src="/mc-logo-whiteclip.png?v=2"
              alt="Mesa County Logo"
              className="h-10 w-auto max-w-[48px] object-contain shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white leading-tight">Mesa County Economic Profile</h1>
              <p className="text-xs mt-0.5 text-white/80">
                Mesa County Jurisdictional Data
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="flex items-center gap-2 text-white bg-black/20 hover:bg-black/40 px-3 py-1.5 rounded-md text-sm transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-12">

        {/* Section 1: Development Metrics */}
        <div>
          <SectionHeader
            icon={ClipboardList}
            title="Development Process Metrics"
            description="Tracks total permit volumes, turnaround speed, and major project activity in Mesa County."
          />

          <DevelopmentFilter
            allQuarters={permitQuarters}
            selectedYear={selectedYear}
            selectedQuarter={selectedQuarter}
            selectedType={selectedType}
            subtypeOptions={subtypeOptions}
            selectedSubtypes={selectedSubtypes}
            onYearChange={handleYearChange}
            onQuarterChange={setSelectedQuarter}
            onTypeChange={setSelectedType}
            onSubtypesChange={setSelectedSubtypes}
          />

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
            <StatCard
              title="Total Permits"
              value={kpiTotalPermits.toLocaleString()}
              sub={
                selectedSubtypes.length > 0
                  ? (selectedSubtypes.length === 1 ? selectedSubtypes[0] : `${selectedSubtypes.length} subtypes selected`)
                  : (selectedType === 'all' ? 'All Development & Trades' : `${selectedType} Permits`)
              }
              icon={Home}
              accent="bg-white/15 text-white"
            />
            <StatCard
              title="Total Permit Valuation"
              value={formatCompact(kpiTotalValuation)}
              sub={
                selectedQuarter === 'all'
                  ? (selectedYear === 'all' ? 'Total estimated investment' : `Total valuation in ${selectedYear}`)
                  : `Valuation for ${selectedQuarter}${selectedYear !== 'all' ? ` ${selectedYear}` : ''}`
              }
              icon={TrendingUp}
              accent="bg-white/15 text-white"
            />
            <StatCard
              title="Major Projects (≥ $1M)"
              value={kpiMajorCount}
              sub={
                kpiMajorValue > 0
                  ? `${formatCompact(kpiMajorValue)} total value`
                  : 'Valuation ≥ $1,000,000'
              }
              icon={Building2}
              accent="bg-white/15 text-white"
            />
            <StatCard
              title="Plan Review (Accepted to Approved)"
              value={kpiMedianAcceptedToApproved}
              sub={
                selectedQuarter === 'all'
                  ? (selectedYear === 'all' ? 'Median plan review duration' : `Median review in ${selectedYear}`)
                  : `Median review for ${selectedQuarter}`
              }
              icon={Clock}
              accent="bg-white/15 text-white"
            />
            <StatCard
              title="Issuance Turnaround (Approved to Issued)"
              value={kpiMedianApprovedToIssued}
              sub={
                selectedQuarter === 'all'
                  ? (selectedYear === 'all' ? 'Median post-approval turnaround' : `Median turnaround in ${selectedYear}`)
                  : `Median turnaround for ${selectedQuarter}`
              }
              icon={Clock}
              accent="bg-white/15 text-white"
            />
            <StatCard
              title="Pending Recipient Action"
              value={kpiPendingRecipient.toLocaleString()}
              sub={
                selectedQuarter === 'all'
                  ? (selectedYear === 'all' ? 'Awaiting applicant revisions, info, or fees' : `Awaiting applicant action (${selectedYear})`)
                  : `Awaiting action for ${selectedQuarter}`
              }
              icon={PauseCircle}
              accent="bg-white/15 text-white"
            />
          </div>

          {/* Chart View Selection */}
          {(() => {
            const show2025 = selectedYear === 'all' || selectedYear === '2025'
            const show2026 = selectedYear === 'all' || selectedYear === '2026'

            return (
              <div className="rounded-2xl p-6 shadow-xl border border-[#045975] space-y-4 mt-6" style={{ backgroundColor: TEAL }}>
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-base font-bold text-white">
                      {isMonthlyMode ? `${selectedQuarter} Monthly Breakdown` : 'Quarterly Breakdown'}
                      <span className="ml-2 text-xs font-normal text-cyan-200/80">
                        {selectedYear !== 'all' ? `(${selectedYear})` : '(2025 vs 2026 YoY)'}
                      </span>
                    </h2>
                    {isQuarterSpecific && (
                      <div className="flex items-center bg-[#012531] border border-[#045975] p-0.5 rounded-lg text-xs">
                        <button
                          onClick={() => setQuarterlyViewMode('auto')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                            quarterlyViewMode !== 'allQuarters'
                              ? 'bg-white shadow text-[#023e52] font-bold'
                              : 'text-gray-300 hover:text-white'
                          }`}
                        >
                          {selectedQuarter} Months
                        </button>
                        <button
                          onClick={() => setQuarterlyViewMode('allQuarters')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all ${
                            quarterlyViewMode === 'allQuarters'
                              ? 'bg-white shadow text-[#023e52] font-bold'
                              : 'text-gray-300 hover:text-white'
                          }`}
                        >
                          All Quarters
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="bg-[#012531] border border-[#045975] p-1 rounded-xl flex items-center gap-1">
                    <button
                      onClick={() => setActiveTab('permits')}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                        activeTab === 'permits' ? 'bg-white text-[#023e52] font-bold shadow' : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      Permit Counts
                    </button>
                    <button
                      onClick={() => setActiveTab('valuation')}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                        activeTab === 'valuation' ? 'bg-white text-[#023e52] font-bold shadow' : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      Total Valuation
                    </button>
                    <button
                      onClick={() => setActiveTab('major')}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                        activeTab === 'major' ? 'bg-white text-[#023e52] font-bold shadow' : 'text-gray-300 hover:text-white'
                      }`}
                    >
                      Major Projects (≥ $1M)
                    </button>
                  </div>
                </div>

                {activeTab === 'permits' && (
                  <div>
                    <ResponsiveContainer width="100%" height={290}>
                      <LineChart data={chartBreakdownData} margin={{ top: 15, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" vertical={false} />
                        <XAxis 
                          dataKey="category" 
                          tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.85)' }} 
                          axisLine={{ stroke: '#045975' }} 
                          tickLine={false} 
                        />
                        <YAxis 
                          tick={{ fontSize: 12, fill: 'rgba(255,255,255,0.85)' }} 
                          axisLine={false} 
                          tickLine={false} 
                        />
                        <Tooltip content={<RetoolTooltip unit="permits" />} />
                        {show2025 && (
                          <Line
                            type="monotone"
                            dataKey="count_2025"
                            name="count_2025"
                            stroke={CHART_CYAN}
                            strokeWidth={2.5}
                            dot={{ r: 5, fill: CHART_CYAN, stroke: CHART_CYAN }}
                            activeDot={{ r: 7 }}
                          />
                        )}
                        {show2026 && (
                          <Line
                            type="monotone"
                            dataKey="count_2026"
                            name="count_2026"
                            stroke={CHART_PINK}
                            strokeWidth={2.5}
                            dot={{ r: 5, fill: CHART_PINK, stroke: CHART_PINK }}
                            activeDot={{ r: 7 }}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                    <RetoolLegend items={[{ label: 'Year 2025', color: CHART_CYAN }, { label: 'Year 2026', color: CHART_PINK }]} />
                  </div>
                )}

                {activeTab === 'valuation' && (
                  <div>
                    <ResponsiveContainer width="100%" height={290}>
                      <LineChart data={chartBreakdownData} margin={{ top: 15, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" vertical={false} />
                        <XAxis 
                          dataKey="category" 
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
                        <Tooltip content={<RetoolTooltip unit="$" />} />
                        {show2025 && (
                          <Line
                            type="monotone"
                            dataKey="value_2025"
                            name="value_2025"
                            stroke={CHART_CYAN}
                            strokeWidth={2.5}
                            dot={{ r: 5, fill: CHART_CYAN, stroke: CHART_CYAN }}
                            activeDot={{ r: 7 }}
                          />
                        )}
                        {show2026 && (
                          <Line
                            type="monotone"
                            dataKey="value_2026"
                            name="value_2026"
                            stroke={CHART_PINK}
                            strokeWidth={2.5}
                            dot={{ r: 5, fill: CHART_PINK, stroke: CHART_PINK }}
                            activeDot={{ r: 7 }}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                    <RetoolLegend items={[{ label: 'Year 2025', color: CHART_CYAN }, { label: 'Year 2026', color: CHART_PINK }]} />
                  </div>
                )}

                {activeTab === 'major' && (
                  <div>
                    <ResponsiveContainer width="100%" height={290}>
                      <LineChart data={chartBreakdownData} margin={{ top: 15, right: 30, left: 10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" vertical={false} />
                        <XAxis 
                          dataKey="category" 
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
                        <Tooltip content={<RetoolTooltip unit="$" />} />
                        {show2025 && (
                          <Line
                            type="monotone"
                            dataKey="major_2025"
                            name="major_2025"
                            stroke={CHART_CYAN}
                            strokeWidth={2.5}
                            dot={{ r: 5, fill: CHART_CYAN, stroke: CHART_CYAN }}
                            activeDot={{ r: 7 }}
                          />
                        )}
                        {show2026 && (
                          <Line
                            type="monotone"
                            dataKey="major_2026"
                            name="major_2026"
                            stroke={CHART_PINK}
                            strokeWidth={2.5}
                            dot={{ r: 5, fill: CHART_PINK, stroke: CHART_PINK }}
                            activeDot={{ r: 7 }}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                    <RetoolLegend items={[{ label: 'Year 2025', color: CHART_CYAN }, { label: 'Year 2026', color: CHART_PINK }]} />
                  </div>
                )}
              </div>
            )
          })()}
        </div>

        {/* Section 2: Economic Vitality */}
        <VitalitySection data={vitalityData?.quarterlyData} />

        {/* Department of Human Services Community Analytics Callout */}
        <HumanServicesCallout />


        {/* Section 4: Infrastructure & Capacity */}
        <div>
          <SectionHeader
            icon={HardHat}
            title="Infrastructure & Capacity"
            description="Highlights the status of major public infrastructure investments and shovel-ready land opportunities."
          />
          <InfraSection rows={indicatorData?.infraRows ?? []} loading={loading} />
        </div>

        {/* Section 5: Fiscal & Activity Signals */}
        <div>
          <SectionHeader
            icon={Landmark}
            title="Fiscal & Activity Signals"
            description="Tracks Use Tax, Property Tax, and Sales Tax collections as real-time indicators of economic activity, county revenues, and consumer spending across Mesa County."
          />
          <FiscalSection rows={indicatorData?.housingRows ?? []} />
        </div>

      </div>
    </div>
  )
}
