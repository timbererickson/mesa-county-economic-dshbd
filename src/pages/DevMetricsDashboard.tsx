import { useEffect, useMemo, useState } from 'react'
import fetchEconomicVitality from '../backend/getEconomicVitality'
import fetchIndicatorData from '../backend/getIndicatorData'
import fetchPermitData, { type PermitRecord } from '../backend/getPermitData'

// Import UI Sections

import InfraSection from '../ui/InfraSection'
import FiscalSection from '../ui/FiscalSection'
import VitalitySection from '../ui/VitalitySection'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line,
} from 'recharts'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import { Clock, ListFilter, Building2, DollarSign, ArrowUpDown, RefreshCw, ClipboardList, TrendingUp, Landmark, HardHat, Home, Layers } from 'lucide-react'
import { DevelopmentFilter } from '../components/DevelopmentFilter'

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
const TEAL = '#0e7490'
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
  const [activeTab, setActiveTab] = useState<'permits' | 'turnaround' | 'major'>('permits')

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

  const filteredPermits = useMemo(() => {
    return rawPermits.filter(p => {
      // Type filter (Commercial vs Residential vs All)
      if (selectedType !== 'all' && p.recordType !== selectedType) return false

      // Year filter: match primary reporting year (p.year)
      const isYearAll = !selectedYear || selectedYear.toLowerCase() === 'all'
      if (!isYearAll && p.year !== selectedYear) return false

      // Quarter filter: match primary reporting quarter (p.quarter)
      const isQuarterAll = !selectedQuarter || selectedQuarter.toLowerCase() === 'all'
      if (!isQuarterAll && !p.quarter.toLowerCase().includes(selectedQuarter.toLowerCase())) return false

      return true
    })
  }, [rawPermits, selectedType, selectedYear, selectedQuarter])

  const kpiMedianDays = useMemo(() => {
    const daysList = filteredPermits
      .map(p => p.daysToIssue)
      .filter((d): d is number => d != null && !isNaN(d))
      .sort((a, b) => a - b)

    if (daysList.length === 0) return '0 days'
    const mid = Math.floor(daysList.length / 2)
    const median = daysList.length % 2 !== 0
      ? daysList[mid]
      : (daysList[mid - 1] + daysList[mid]) / 2
    return `${Math.round(median * 10) / 10} days`
  }, [filteredPermits])

  const kpiQueue = useMemo(() => {
    return filteredPermits.filter(p => 
      p.recordStatus === 'In Queue' || p.recordStatus === 'Under Review' || p.recordStatus === 'Accepted'
    ).length
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

  const yearQuarterStats = useMemo(() => {
    const qMap: Record<string, { quarter: string; commercial: number; residential: number; total: number; days: number[]; majorValue: number }> = {}

    filteredPermits.forEach(p => {
      if (!p.quarter) return
      if (!qMap[p.quarter]) {
        qMap[p.quarter] = { quarter: p.quarter, commercial: 0, residential: 0, total: 0, days: [], majorValue: 0 }
      }
      const item = qMap[p.quarter]
      item.total += 1
      if (p.recordType === 'Commercial') item.commercial += 1
      if (p.recordType === 'Residential') item.residential += 1
      if (p.daysToIssue != null) item.days.push(p.daysToIssue)
      if (p.valuation >= 1000000) item.majorValue += p.valuation
    })

    return Object.values(qMap)
      .map(q => {
        const sortedDays = q.days.sort((a, b) => a - b)
        const mid = Math.floor(sortedDays.length / 2)
        const medianDays = sortedDays.length === 0 ? 0 : (sortedDays.length % 2 !== 0 ? sortedDays[mid] : (sortedDays[mid - 1] + sortedDays[mid]) / 2)
        return {
          quarter: q.quarter,
          commercial: q.commercial,
          residential: q.residential,
          total: q.total,
          medianDays: Math.round(medianDays * 10) / 10,
          majorValue: q.majorValue,
        }
      })
      .sort((a, b) => {
        const ya = a.quarter.match(/\b(20\d{2})\b/)?.[1] ?? ''
        const yb = b.quarter.match(/\b(20\d{2})\b/)?.[1] ?? ''
        if (ya !== yb) return ya.localeCompare(yb)
        return a.quarter.localeCompare(b.quarter)
      })
  }, [filteredPermits])

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b px-6 py-4" style={{ backgroundColor: RED }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white leading-tight">Mesa County Economic Profile</h1>
            <p className="text-xs mt-0.5 text-white/80">
              Mesa County regional data · ArcGIS REST service & Google Sheets endpoints
            </p>
          </div>
          <button
            onClick={loadData}
            className="flex items-center gap-2 text-white bg-black/20 hover:bg-black/40 px-3 py-1.5 rounded-md text-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh Data
          </button>
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
            onYearChange={setSelectedYear}
            onQuarterChange={setSelectedQuarter}
            onTypeChange={setSelectedType}
          />

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mt-6">
            <StatCard
              title="Median Time to Permit"
              value={kpiMedianDays}
              sub={selectedQuarter === 'all' ? (selectedYear === 'all' ? 'Overall median turnaround' : `Median in ${selectedYear}`) : `Median for ${selectedQuarter}`}
              icon={Clock}
              accent="bg-[#e4808c]/30 text-white"
            />
            <StatCard
              title="Projects in Queue"
              value={kpiQueue.toLocaleString()}
              sub="Under review / pending"
              icon={ListFilter}
              accent="bg-[#e4808c]/30 text-white"
            />
            <StatCard
              title="Major Projects (≥ $1M)"
              value={kpiMajorCount}
              sub="Valuation ≥ $1,000,000"
              icon={Building2}
              accent="bg-[#e4808c]/30 text-white"
            />
            <StatCard
              title="Major Projects Value"
              value={formatCompact(kpiMajorValue)}
              sub="Combined major valuation"
              icon={DollarSign}
              accent="bg-[#e4808c]/30 text-white"
            />
            <StatCard
              title="Total Permits"
              value={kpiTotalPermits.toLocaleString()}
              sub={selectedType === 'all' ? 'Commercial & Residential' : selectedType}
              icon={Home}
              accent="bg-[#e4808c]/30 text-white"
            />
            <StatCard
              title="Total Permit Valuation"
              value={formatCompact(kpiTotalValuation)}
              sub="Full dataset valuation"
              icon={TrendingUp}
              accent="bg-[#e4808c]/30 text-white"
            />
          </div>

          {/* Chart View Selection */}
          <div className="border rounded-xl p-6 bg-card space-y-4 mt-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-base font-semibold">Quarterly Breakdown</h2>
              <div className="flex gap-2 border p-1 rounded-lg bg-muted/30">
                <button
                  onClick={() => setActiveTab('permits')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeTab === 'permits' ? 'bg-white shadow text-foreground' : 'text-muted-foreground'}`}
                >
                  Permit Counts
                </button>
                <button
                  onClick={() => setActiveTab('turnaround')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeTab === 'turnaround' ? 'bg-white shadow text-foreground' : 'text-muted-foreground'}`}
                >
                  Turnaround Time
                </button>
                <button
                  onClick={() => setActiveTab('major')}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${activeTab === 'major' ? 'bg-white shadow text-foreground' : 'text-muted-foreground'}`}
                >
                  Major Project Value
                </button>
              </div>
            </div>

            {activeTab === 'permits' && (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={yearQuarterStats} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="quarter" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="commercial" name="Commercial" fill={TEAL} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="residential" name="Residential" fill={PINK} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}

            {activeTab === 'turnaround' && (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={yearQuarterStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="quarter" />
                  <YAxis unit=" d" />
                  <Tooltip />
                  <Line type="monotone" dataKey="medianDays" name="Median Days" stroke={TEAL} strokeWidth={2.5} />
                </LineChart>
              </ResponsiveContainer>
            )}

            {activeTab === 'major' && (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={yearQuarterStats} barCategoryGap="45%">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="quarter" />
                  <YAxis tickFormatter={(v: number) => `$${(v / 1_000_000).toFixed(0)}M`} />
                  <Tooltip formatter={(val) => [formatCurrency(Number(val ?? 0)), 'Est. Value']} />
                  <Bar dataKey="majorValue" name="Major Project Value" fill={PINK} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Major Projects Table */}
          <div className="border rounded-xl p-6 bg-card space-y-4 mt-6">
            <div>
              <h3 className="text-base font-semibold">Major Projects Under Construction</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Permits with estimated value ≥ $1,000,000 ({filteredProjects.length} projects found)
              </p>
            </div>
            <MajorProjectsTable projects={filteredProjects} />
          </div>
        </div>

        {/* Section 2: Economic Vitality */}
        <VitalitySection data={vitalityData?.quarterlyData} />


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
            description="Tracks sales tax collections as a real-time indicator of economic activity and consumer spending across Mesa County."
          />
          <FiscalSection rows={indicatorData?.housingRows ?? []} />
        </div>

      </div>
    </div>
  )
}
