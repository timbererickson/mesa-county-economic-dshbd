import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Landmark, FileText } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { QuarterFilter } from '../components/QuarterFilter'
import { useSectionFilter } from '../hooks/useSectionFilter'

const TEAL = '#0e7490'
const PINK = '#e4808c'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)

const formatCompact = (val: number) => {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(2)}M`
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
  salesTaxCollections: number | null
}

export default function FiscalSection({
  rows,
}: {
  rows: HousingRow[]
}) {
  const allQuarters = useMemo(() => {
    return [...new Set(rows.map(r => r.quarter))].filter(Boolean)
  }, [rows])

  const {
    selectedYear,
    selectedQuarter,
    setSelectedQuarter,
    handleYearChange
  } = useSectionFilter(allQuarters)

  const yearRows = rows
    .filter(r => r.salesTaxCollections != null && (!selectedYear || r.year === selectedYear))

  const filteredRows = selectedQuarter === 'all'
    ? yearRows
    : yearRows.filter(r => r.quarter === selectedQuarter)

  const latest = filteredRows[filteredRows.length - 1] ?? null
  const hasData = filteredRows.length > 0

  const ytdTotal = filteredRows.reduce((s, r) => s + (r.salesTaxCollections ?? 0), 0)

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground border border-dashed rounded-lg">
        <FileText className="w-6 h-6 opacity-40" />
        <p className="text-sm">No fiscal data submitted yet. Data will appear once quarterly forms are filled in.</p>
      </div>
    )
  }

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

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0" style={{ backgroundColor: TEAL }}>
          <CardContent className="pt-5 pb-4 flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1 min-w-0">
              <p className="text-sm font-medium leading-tight" style={{ color: 'rgba(255,255,255,0.75)' }}>
                Sales Tax Revenue
              </p>
              <p className="text-3xl font-bold tracking-tight text-white">
                {latest?.salesTaxCollections != null ? formatCompact(latest.salesTaxCollections) : '—'}
              </p>
              <p className="text-xs leading-snug" style={{ color: 'rgba(255,255,255,0.6)' }}>
                {latest?.quarter ?? ''}
              </p>
            </div>
            <div className="rounded-xl p-3 shrink-0" style={{ backgroundColor: `${PINK}40` }}>
              <Landmark className="w-5 h-5 text-white" />
            </div>
          </CardContent>
        </Card>

        {yearRows.length > 1 && (
          <Card className="border-0" style={{ backgroundColor: TEAL }}>
            <CardContent className="pt-5 pb-4 flex items-start justify-between gap-4">
              <div className="flex flex-col gap-1 min-w-0">
                <p className="text-sm font-medium leading-tight" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  YTD Total
                </p>
                <p className="text-3xl font-bold tracking-tight text-white">
                  {formatCompact(ytdTotal)}
                </p>
                <p className="text-xs leading-snug" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  {selectedQuarter !== 'all' ? selectedQuarter : `${selectedYear} year to date`}
                </p>
              </div>
              <div className="rounded-xl p-3 shrink-0" style={{ backgroundColor: `${PINK}40` }}>
                <Landmark className="w-5 h-5 text-white" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Chart */}
      {yearRows.length > 1 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground">
              Sales Tax Collections by Quarter — {selectedQuarter !== 'all' ? selectedQuarter : selectedYear}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={filteredRows} barCategoryGap="45%">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => formatCompact(v)}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(v) => [formatCurrency(Number(v ?? 0)), 'Sales Tax Collections']}
                />
                <Bar dataKey="salesTaxCollections" name="Sales Tax" fill={TEAL} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
