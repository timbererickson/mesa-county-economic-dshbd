import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Home, FileText, Building2, CalendarRange } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend,
} from 'recharts'
import { cn } from '../../lib/shadcn/utils'
import { QuarterFilter } from '../components/QuarterFilter'
import { useSectionFilter } from '../hooks/useSectionFilter'

const TEAL = '#0e7490'
const PINK = '#e4808c'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)

const formatCompact = (val: number) => {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
  return `$${val}`
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
  color: 'hsl(var(--foreground))',
}

interface HousingRow {
  quarter: string
  year: string
  medianHomePrice: number | null
  monthsOfInventory: number | null
  housingPermitsIssued: number | null
  multifamilyUnits: number | null
  salesTaxCollections: number | null
  notes: string
}

function KpiCard({
  label, value, icon: Icon, sub,
}: {
  label: string
  value: string
  icon: React.ElementType
  sub?: string
}) {
  return (
    <Card className="border-0" style={{ backgroundColor: TEAL }}>
      <CardContent className="pt-5 pb-4 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-sm font-medium leading-tight" style={{ color: 'rgba(255,255,255,0.75)' }}>{label}</p>
          <p className="text-3xl font-bold tracking-tight text-white">{value}</p>
          {sub && <p className="text-xs leading-snug" style={{ color: 'rgba(255,255,255,0.6)' }}>{sub}</p>}
        </div>
        <div className="rounded-xl p-3 shrink-0" style={{ backgroundColor: `${PINK}40` }}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground border border-dashed rounded-lg">
      <FileText className="w-6 h-6 opacity-40" />
      <p className="text-sm">{message}</p>
    </div>
  )
}

export default function HousingSection({
  rows,
}: {
  rows: HousingRow[]
}) {
  const [chartTab, setChartTab] = useState<'price' | 'inventory' | 'permits'>('price')

  const allQuarters = useMemo(() => {
    return [...new Set(rows.map(r => r.quarter))].filter(Boolean)
  }, [rows])

  const {
    selectedYear,
    selectedQuarter,
    setSelectedQuarter,
    handleYearChange
  } = useSectionFilter(allQuarters)

  // Filter by year first, then by quarter if one is selected
  const yearRows = useMemo(
    () => rows.filter(r => !selectedYear || r.year === selectedYear),
    [rows, selectedYear]
  )

  const filteredRows = useMemo(
    () => selectedQuarter === 'all' ? yearRows : yearRows.filter(r => r.quarter === selectedQuarter),
    [yearRows, selectedQuarter]
  )

  // "Latest" is the most recent row in the filtered set
  const latest = filteredRows[filteredRows.length - 1] ?? null

  const hasData = filteredRows.length > 0

  return (
    <div className="space-y-6">
      {/* Quarter Filter */}
      <div className="flex justify-start">
        <QuarterFilter
          allQuarters={allQuarters}
          selectedYear={selectedYear}
          selectedQuarter={selectedQuarter}
          onYearChange={handleYearChange}
          onQuarterChange={setSelectedQuarter}
        />
      </div>

      {/* KPI cards — latest quarter */}
      {hasData ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Median Home Price"
            value={latest?.medianHomePrice != null ? formatCurrency(latest.medianHomePrice) : '-'}
            icon={Home}
            sub={latest?.quarter ?? ''}
          />
          <KpiCard
            label="Months of Inventory"
            value={latest?.monthsOfInventory != null ? `${latest.monthsOfInventory} mo` : '-'}
            icon={CalendarRange}
            sub={latest?.quarter ?? ''}
          />
          <KpiCard
            label="Housing Permits Issued"
            value={latest?.housingPermitsIssued != null ? latest.housingPermitsIssued.toLocaleString() : '-'}
            icon={FileText}
            sub={latest?.quarter ?? ''}
          />
          <KpiCard
            label="Multifamily Units"
            value={latest?.multifamilyUnits != null ? latest.multifamilyUnits.toLocaleString() : '-'}
            icon={Building2}
            sub="Under construction"
          />
        </div>
      ) : (
        <EmptyState message="No housing data submitted yet. Data will appear once quarterly forms are filled in." />
      )}

      {/* Charts */}
      {filteredRows.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-semibold text-foreground">
                Trends — {selectedQuarter !== 'all' ? selectedQuarter : selectedYear}
              </CardTitle>
              <div className="flex gap-1">
                {([
                  { key: 'price', label: 'Home Price' },
                  { key: 'inventory', label: 'Inventory' },
                  { key: 'permits', label: 'Permits' },
                ] as const).map(t => (
                  <button
                    key={t.key}
                    onClick={() => setChartTab(t.key)}
                    className={cn(
                      'px-2.5 py-1 rounded text-xs font-medium border transition-colors',
                      chartTab === t.key
                        ? 'text-white border-transparent'
                        : 'bg-background text-muted-foreground border-border hover:bg-muted'
                    )}
                    style={chartTab === t.key ? { backgroundColor: TEAL, borderColor: TEAL } : undefined}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              {chartTab === 'price' ? (
                <LineChart data={filteredRows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v: number) => formatCompact(v)} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatCurrency(Number(v ?? 0)), 'Median Home Price']} />
                  <Line type="monotone" dataKey="medianHomePrice" stroke={TEAL} strokeWidth={2.5} dot={{ r: 4, fill: TEAL }} name="Median Home Price" />
                </LineChart>
              ) : chartTab === 'inventory' ? (
                <LineChart data={filteredRows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} unit=" mo" />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`${v} months`, 'Inventory']} />
                  <Line type="monotone" dataKey="monthsOfInventory" stroke={PINK} strokeWidth={2.5} dot={{ r: 4, fill: PINK }} name="Months of Inventory" />
                </LineChart>
              ) : (
                <BarChart data={filteredRows}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="housingPermitsIssued" name="Permits Issued" fill={TEAL} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="multifamilyUnits" name="Multifamily Units" fill={PINK} radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Historical Median Home Price (Unfiltered Trend) */}
      {rows.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Home className="w-4 h-4 text-[#0e7490]" />
              Historical Median Home Price (Full Trend)
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Complete historical trajectory of home prices over all quarters (unaffected by year/quarter filters)
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="quarter" 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                  axisLine={false} 
                  tickLine={false} 
                />
                <YAxis 
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(v: number) => formatCompact(v)} 
                  domain={['auto', 'auto']}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatCurrency(Number(v ?? 0)), 'Median Home Price']} />
                <Line 
                  type="monotone" 
                  dataKey="medianHomePrice" 
                  stroke={TEAL} 
                  strokeWidth={2.5} 
                  dot={{ r: 4, fill: TEAL }} 
                  activeDot={{ r: 6 }}
                  name="Median Home Price" 
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Notes */}
      {latest?.notes && (
        <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-4 border">
          <span className="font-semibold text-foreground">Staff notes ({latest.quarter}): </span>
          {latest.notes}
        </div>
      )}
    </div>
  )
}
