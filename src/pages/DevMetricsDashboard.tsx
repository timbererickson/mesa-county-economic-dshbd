import { useEffect, useMemo, useState } from 'react'
import { useGetPermitData, useGetIndicatorData, useGetEconomicVitality } from '../hooks/backend/devMetrics'
import HousingSection from './ui/HousingSection'
import InfraSection from './ui/InfraSection'
import FiscalSection from './ui/FiscalSection'
import VitalitySection from './ui/VitalitySection'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, ReferenceLine,
} from 'recharts'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../lib/shadcn/table'
import { Clock, ListFilter, Building2, DollarSign, ArrowUpDown, RefreshCw, ClipboardList, TrendingUp, Home, Landmark, HardHat } from 'lucide-react'
import { Button } from '../lib/shadcn/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../lib/shadcn/tabs'
import { QuarterFilter } from '../components/QuarterFilter'
import { useSectionFilter } from '../hooks/useSectionFilter'
import mcLogo from '../assets/mc-logo-whiteclip.png'

// ── Types ──────────────────────────────────────────────────────────────────

interface MajorProject {
  quarter: string
  permitNumber: string
  recordType: string
  recordSubtype: string
  valuation: number
  acceptedDate: string
  issuedDate: string
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
const TEAL   = '#0e7490'
const PINK   = '#e4808c'
const RED    = '#c12033'

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
    <Card className="border-0" style={{ backgroundColor: '#0e7490' }}>
      <CardContent className="pt-5 pb-4 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-sm font-medium leading-tight" style={{ color: 'rgba(255,255,255,0.75)' }}>{title}</p>
          <p className="text-3xl font-bold tracking-tight text-white">{value}</p>
          {sub && <p className="text-xs leading-snug" style={{ color: 'rgba(255,255,255,0.6)' }}>{sub}</p>}
        </div>
        <div className={`rounded-xl p-3 shrink-0 ${accent}`}>
          <Icon className="w-5 h-5" />
        </div>
      </CardContent>
    </Card>
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
      <Badge variant="secondary" className="text-xs whitespace-nowrap">{getValue() as string}</Badge>
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
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map(hg => (
            <TableRow key={hg.id} className="bg-muted/40">
              {hg.headers.map(h => (
                <TableHead key={h.id} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map(row => (
            <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
              {row.getVisibleCells().map(cell => (
                <TableCell key={cell.id} className="py-2.5">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
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

// ── Tooltip style ──────────────────────────────────────────────────────────

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
  color: 'hsl(var(--foreground))',
}

// ── Main Dashboard ─────────────────────────────────────────────────────────

export default function DevMetricsDashboard() {
  const { data, loading: loadingPermits, error: errorPermits, dataAccessErrors: accessPermits, trigger } = useGetPermitData()
  const { data: indicatorData, loading: loadingIndicators, error: errorIndicators, dataAccessErrors: accessIndicators, trigger: triggerIndicators } = useGetIndicatorData()
  const { data: vitalityData, loading: loadingVitality, error: errorVitality, dataAccessErrors: accessVitality, trigger: triggerVitality } = useGetEconomicVitality()

  useEffect(() => {
    trigger({})
    triggerIndicators({})
    triggerVitality({})
  }, [])

  const allQuarterStats: QuarterStat[] = useMemo(() => data?.quarterStats ?? [], [data])
  const allMajorProjects: MajorProject[] = useMemo(() => data?.majorProjects ?? [], [data])

  const permitQuarters = useMemo(() => allQuarterStats.map(q => q.quarter), [allQuarterStats])
  const {
    selectedYear: permitYear,
    selectedQuarter: permitQuarter,
    setSelectedQuarter: setPermitQuarter,
    handleYearChange: handlePermitYearChange
  } = useSectionFilter(permitQuarters)

  // ── Filtered data — scoped to year first, then quarter ──
  const activeStats: QuarterStat | null = useMemo(() => {
    if (permitQuarter === 'all') return null
    return allQuarterStats.find(q => q.quarter === permitQuarter) ?? null
  }, [permitQuarter, allQuarterStats])

  const yearQuarterStats = useMemo(
    () => allQuarterStats.filter(q => q.quarter.endsWith(permitYear)),
    [allQuarterStats, permitYear]
  )

  const filteredProjects: MajorProject[] = useMemo(() => {
    if (permitQuarter === 'all') return allMajorProjects.filter(p => p.quarter.endsWith(permitYear))
    return allMajorProjects.filter(p => p.quarter === permitQuarter)
  }, [permitQuarter, permitYear, allMajorProjects])

  // ── KPI values ──
  const kpiMedianDays = permitQuarter === 'all'
    ? (() => {
        const totalPermits = yearQuarterStats.reduce((s, q) => s + q.commercial, 0)
        const weighted = yearQuarterStats.reduce((s, q) => s + q.medianDays * q.commercial, 0)
        return `${totalPermits > 0 ? Math.round((weighted / totalPermits) * 10) / 10 : 0} days`
      })()
    : `${activeStats?.medianDays ?? 0} days`

  const kpiMedianSub = permitQuarter === 'all'
    ? `Weighted avg across ${permitYear} (commercial)`
    : `Median for ${permitQuarter} (commercial)`

  const kpiQueue = permitQuarter === 'all'
    ? yearQuarterStats.reduce((s, q) => s + q.queueCount, 0)
    : activeStats?.queueCount ?? 0

  const kpiQueueSub = permitQuarter === 'all'
    ? `Total across ${permitYear} · awaiting issuance`
    : `Awaiting issuance · ${permitQuarter}`

  const kpiMajorCount = filteredProjects.length
  const kpiMajorValue = filteredProjects.reduce((s, p) => s + p.valuation, 0)

  const kpiTotalPermits = permitQuarter === 'all'
    ? yearQuarterStats.reduce((s, q) => s + q.total, 0)
    : activeStats?.total ?? 0


  if (loadingPermits && !data) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm font-medium">
        <RefreshCw className="w-5 h-5 animate-spin mr-3 text-primary" />
        Loading development metrics…
      </div>
    )
  }

  if (errorPermits || (accessPermits && accessPermits.length > 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4 p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
          <Clock className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Access Restricted</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            {errorPermits || accessPermits?.[0]?.message || 'You do not have permission to view this development data. Please contact an admin to verify your resource permissions.'}
          </p>
        </div>
        <Button onClick={() => trigger({}, { skipCache: true })} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry Connection
        </Button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b px-6 py-4" style={{ backgroundColor: '#c12033' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <img src={mcLogo} alt="Mesa County logo" className="h-12 w-auto" />
            <div className="border-l border-white/30 pl-4">
              <h1 className="text-xl font-bold tracking-tight text-white leading-tight">Mesa County Economic Profile</h1>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.75)' }}>
                Mesa County regional data · updated via app script
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
  size="sm"
  onClick={() => {
    trigger({}, { skipCache: true })
    triggerIndicators({}, { skipCache: true })
    triggerVitality({}, { skipCache: true })
  }}
  className="flex items-center gap-2 text-white hover:text-white bg-black/20 hover:bg-black/50 transition-colors"
>
  <RefreshCw className="w-4 h-4" />
  Refresh
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">

        {/* Section 1 header */}
        <SectionHeader
          icon={ClipboardList}
          title="Development Process Metrics"
          description="Tracks the speed and volume of commercial building permit activity in Mesa County, providing insight into how efficiently development projects move from application through to approval and construction."
        />

        {/* Quarter Filter */}
        <QuarterFilter
          allQuarters={permitQuarters}
          selectedYear={permitYear}
          selectedQuarter={permitQuarter}
          onYearChange={handlePermitYearChange}
          onQuarterChange={setPermitQuarter}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Median Time to Permit"
            value={kpiMedianDays}
            sub={kpiMedianSub}
            icon={Clock}
            accent="bg-[#e4808c]/30 text-white"
          />
          <StatCard
            title="Projects in Queue"
            value={kpiQueue}
            sub={kpiQueueSub}
            icon={ListFilter}
            accent="bg-[#e4808c]/30 text-white"
          />
          <StatCard
            title="Major Projects (≥ $1M)"
            value={kpiMajorCount}
            sub={`${kpiTotalPermits.toLocaleString()} total permits${permitQuarter === 'all' ? ` in ${permitYear}` : ` in ${permitQuarter}`}`}
            icon={Building2}
            accent="bg-[#e4808c]/30 text-white"
          />
          <StatCard
            title="Major Projects Value"
            value={formatCompact(kpiMajorValue)}
            sub={`Combined estimated value${permitQuarter === 'all' ? ` · ${permitYear}` : ` · ${permitQuarter}`}`}
            icon={DollarSign}
            accent="bg-[#e4808c]/30 text-white"
          />
        </div>

        {/* Charts — always show all quarters for trend context; highlight selected */}
        <Tabs defaultValue="permits">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-base font-semibold">Quarterly Breakdown</h2>
            <TabsList>
              <TabsTrigger value="permits">Permit Counts</TabsTrigger>
              <TabsTrigger value="turnaround">Turnaround Time</TabsTrigger>
              <TabsTrigger value="major">Major Project Value</TabsTrigger>
            </TabsList>
          </div>

          {/* Permit Counts */}
          <TabsContent value="permits">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">
                  Building Permits Issued — Commercial vs. Residential
                </CardTitle>
                {permitQuarter !== 'all' && (
                  <p className="text-xs text-muted-foreground">
                    {permitQuarter}: <span className="font-semibold text-foreground">{activeStats?.commercial ?? 0}</span> commercial ·{' '}
                    <span className="font-semibold text-foreground">{activeStats?.residential ?? 0}</span> residential
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={yearQuarterStats} barCategoryGap="35%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="quarter" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'hsl(var(--muted))' }} />
                    <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                    <Bar dataKey="commercial" name="Commercial" fill={TEAL} radius={[4, 4, 0, 0]}>
                      {yearQuarterStats.map(entry => (
                        <Cell
                          key={entry.quarter}
                          fill={TEAL}
                          opacity={permitQuarter === 'all' || permitQuarter === entry.quarter ? 1 : 0.25}
                        />
                      ))}
                    </Bar>
                    <Bar dataKey="residential" name="Residential" fill={PINK} radius={[4, 4, 0, 0]}>
                      {yearQuarterStats.map(entry => (
                        <Cell
                          key={entry.quarter}
                          fill={PINK}
                          opacity={permitQuarter === 'all' || permitQuarter === entry.quarter ? 1 : 0.25}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Turnaround Time */}
          <TabsContent value="turnaround">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">
                  Median Commercial Turnaround — Days from Application to Permit
                </CardTitle>
                {permitQuarter !== 'all' && (
                  <p className="text-xs text-muted-foreground">
                    {permitQuarter}: <span className="font-semibold text-foreground">{activeStats?.medianDays ?? 0} days</span> median
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={yearQuarterStats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="quarter" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} unit=" d" />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(val) => [`${val} days`, 'Median Turnaround']}
                    />
                    {permitQuarter !== 'all' && activeStats && (
                      <ReferenceLine
                        x={permitQuarter}
                        stroke={RED}
                        strokeWidth={1.5}
                        strokeDasharray="4 3"
                        label={{ value: `${activeStats.medianDays}d`, position: 'top', fontSize: 11, fill: RED }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="medianDays"
                      name="Median Days"
                      stroke={TEAL}
                      strokeWidth={2.5}
                      dot={(props) => {
                        const { cx, cy, payload } = props as { cx: number; cy: number; payload: QuarterStat }
                        const isSelected = permitQuarter === 'all' || payload.quarter === permitQuarter
                        return (
                          <circle
                            key={payload.quarter}
                            cx={cx}
                            cy={cy}
                            r={isSelected ? 6 : 4}
                            fill={isSelected ? TEAL : '#94a3b8'}
                            opacity={isSelected ? 1 : 0.35}
                            stroke="hsl(var(--card))"
                            strokeWidth={2}
                          />
                        )
                      }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Major Project Value */}
          <TabsContent value="major">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground">
                  Major Project (≥ $1M) Estimated Value by Quarter
                </CardTitle>
                {permitQuarter !== 'all' && (
                  <p className="text-xs text-muted-foreground">
                    {permitQuarter}: <span className="font-semibold text-foreground">{formatCurrency(activeStats?.majorValue ?? 0)}</span>
                  </p>
                )}
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={yearQuarterStats} barCategoryGap="45%">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="quarter" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v: number) => `$${(v / 1_000_000).toFixed(0)}M`}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(val) => [formatCurrency(Number(val ?? 0)), 'Est. Value']}
                    />
                    <Bar dataKey="majorValue" name="Major Project Value" fill={PINK} radius={[4, 4, 0, 0]}>
                      {yearQuarterStats.map(entry => (
                        <Cell
                          key={entry.quarter}
                          fill={PINK}
                          opacity={permitQuarter === 'all' || permitQuarter === entry.quarter ? 1 : 0.25}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Major Projects Table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Major Projects Under Construction</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Permits with estimated value ≥ $1,000,000
              {permitQuarter !== 'all' ? ` · ${permitQuarter}` : ' · all quarters'} ·{' '}
              <span className="font-semibold text-foreground">{filteredProjects.length} permits</span>{' '}
              totaling{' '}
              <span className="font-semibold text-foreground">{formatCurrency(kpiMajorValue)}</span>
            </p>
          </CardHeader>
          <CardContent>
            <MajorProjectsTable projects={filteredProjects} />
          </CardContent>
        </Card>

        {/* Section 2: Economic Vitality */}
        <div>
          <SectionHeader
            icon={TrendingUp}
            title="Economic Vitality Indicators"
            description="Key labor market indicators reflecting Mesa County's employment landscape, workforce participation, job creation, and wage trends relative to state benchmarks."
          />
          {loadingVitality && !vitalityData ? (
            <div className="h-32 flex items-center justify-center border border-dashed rounded-lg text-muted-foreground text-sm">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              Loading labor market data…
            </div>
          ) : (errorVitality || (accessVitality && accessVitality.length > 0)) ? (
            <div className="p-6 border border-destructive/20 bg-destructive/5 rounded-lg text-destructive text-sm flex items-center gap-3">
              <TrendingUp className="w-5 h-5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Economic Vitality Data Restricted</p>
                <p className="opacity-80">{errorVitality || accessVitality?.[0]?.message || 'Access Forbidden: Quota exceeded or restricted resource.'}</p>
              </div>
            </div>
          ) : (
            <VitalitySection data={vitalityData?.quarterlyData ?? []} />
          )}
        </div>

        {/* Section 3: Housing Pressure */}
        <div>
          <SectionHeader
            icon={Home}
            title="Housing Pressure Indicators"
            description="Measures housing market conditions across Mesa County, including price trends, available inventory, new residential construction activity, and multifamily development underway."
          />
          {loadingIndicators && !indicatorData ? (
            <div className="h-32 flex items-center justify-center border border-dashed rounded-lg text-muted-foreground text-sm">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              Loading housing data…
            </div>
          ) : (errorIndicators || (accessIndicators && accessIndicators.length > 0)) ? (
            <div className="p-6 border border-destructive/20 bg-destructive/5 rounded-lg text-destructive text-sm flex items-center gap-3">
              <Home className="w-5 h-5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Indicator Data Restricted</p>
                <p className="opacity-80">{errorIndicators || accessIndicators?.[0]?.message || 'Access Forbidden: Quota exceeded or restricted resource.'}</p>
              </div>
            </div>
          ) : (
            <HousingSection rows={indicatorData?.housingRows ?? []} />
          )}
        </div>

        {/* Section 4: Infrastructure & Capacity */}
        <div>
          <SectionHeader
            icon={HardHat}
            title="Infrastructure & Capacity"
            description="Highlights the status of major public infrastructure investments and shovel-ready land opportunities that support Mesa County's long-term economic growth and quality of life."
          />
          {loadingIndicators && !indicatorData ? (
            <div className="h-32 flex items-center justify-center border border-dashed rounded-lg text-muted-foreground text-sm">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              Loading infrastructure data…
            </div>
          ) : (errorIndicators || (accessIndicators && accessIndicators.length > 0)) ? (
            <div className="p-6 border border-destructive/20 bg-destructive/5 rounded-lg text-destructive text-sm flex items-center gap-3">
              <HardHat className="w-5 h-5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Infrastructure Data Restricted</p>
                <p className="opacity-80">{errorIndicators || accessIndicators?.[0]?.message || 'Access Forbidden: Quota exceeded or restricted resource.'}</p>
              </div>
            </div>
          ) : (
            <InfraSection rows={indicatorData?.infraRows ?? []} />
          )}
        </div>

        {/* Section 5: Fiscal & Activity Signals */}
        <div>
          <SectionHeader
            icon={Landmark}
            title="Fiscal & Activity Signals"
            description="Tracks sales tax collections as a real-time indicator of economic activity and consumer spending across Mesa County, reflecting the overall health of the local economy."
          />
          {loadingIndicators && !indicatorData ? (
            <div className="h-32 flex items-center justify-center border border-dashed rounded-lg text-muted-foreground text-sm">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              Loading fiscal data…
            </div>
          ) : (errorIndicators || (accessIndicators && accessIndicators.length > 0)) ? (
            <div className="p-6 border border-destructive/20 bg-destructive/5 rounded-lg text-destructive text-sm flex items-center gap-3">
              <Landmark className="w-5 h-5 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">Fiscal Data Restricted</p>
                <p className="opacity-80">{errorIndicators || accessIndicators?.[0]?.message || 'Access Forbidden: Quota exceeded or restricted resource.'}</p>
              </div>
            </div>
          ) : (
            <FiscalSection rows={indicatorData?.housingRows ?? []} />
          )}
        </div>

      </div>
    </div>
  )
}
