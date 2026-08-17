import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '../lib/shadcn/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../lib/shadcn/tabs'
import { 
  TrendingUp, Users, UserMinus, UserCheck, 
  DollarSign, Wallet, ArrowUpRight, ArrowDownRight, Briefcase
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceLine
} from 'recharts'
import { cn } from '../lib/shadcn/utils'

import { QuarterFilter } from '../components/QuarterFilter'
import { useSectionFilter } from '../hooks/useSectionFilter'

const TEAL = '#0e7490'
const PINK = '#e4808c'
const SLATE = '#64748b'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)

const formatNumber = (val: number) => 
  new Intl.NumberFormat('en-US').format(Math.round(val))

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: 8,
  fontSize: 12,
  color: 'hsl(var(--foreground))',
}

interface VitalityData {
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

function KpiCard({
  label, value, icon: Icon, sub, accent = 'bg-[#e4808c]/30', trend
}: {
  label: string
  value: string
  icon: React.ElementType
  sub?: string
  accent?: string
  trend?: {
    value: number
    label: string
    isGood: boolean // e.g. unemployment down is good
    unit?: string
  }
}) {
  return (
    <Card className="border-0" style={{ backgroundColor: '#0e7490' }}>
      <CardContent className="pt-5 pb-4 flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1 min-w-0">
          <p className="text-sm font-medium leading-tight" style={{ color: 'rgba(255,255,255,0.75)' }}>{label}</p>
          <div className="flex items-baseline gap-2 flex-wrap">
            <p className="text-3xl font-bold tracking-tight text-white">{value}</p>
            {trend && (
              <div className={cn(
                "flex items-center text-xs font-bold px-1.5 py-0.5 rounded",
                trend.isGood ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
              )}>
                {trend.value > 0 ? <ArrowUpRight className="w-3 h-3 mr-0.5" /> : <ArrowDownRight className="w-3 h-3 mr-0.5" />}
                {Math.abs(trend.value).toFixed(2)}{trend.unit || '%'}
              </div>
            )}
          </div>
          {sub && <p className="text-xs leading-snug" style={{ color: 'rgba(255,255,255,0.6)' }}>{sub}</p>}
        </div>
        <div className={cn("rounded-xl p-3 shrink-0 text-white", accent)}>
          <Icon className="w-5 h-5" />
        </div>
      </CardContent>
    </Card>
  )
}

export default function VitalitySection({
  data,
}: {
  data: VitalityData[]
}) {
  const allQuarters = useMemo(() => {
    return [...new Set(data.map(d => d.label))].filter(Boolean)
  }, [data])

  const {
    selectedYear,
    selectedQuarter,
    setSelectedQuarter,
    handleYearChange
  } = useSectionFilter(allQuarters)

  const chartDataByYear = useMemo(() => {
    const grouped: Record<string, VitalityData[]> = {}
    data.forEach(d => {
      if (!grouped[d.year]) grouped[d.year] = []
      grouped[d.year]!.push(d)
    })
    return grouped
  }, [data])

  const years = Object.keys(chartDataByYear).sort()

  const comparisonData = useMemo(() => {
    const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
    return quarters.map(q => {
      const row: any = { quarter: q }
      years.forEach(year => {
        const d = chartDataByYear[year]?.find(item => item.quarter === q)
        if (d) {
          // Only map if value is not null and not 0
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
  }, [chartDataByYear, years])

  const filteredData = useMemo(() => {
    let d = data
    if (selectedYear) d = d.filter(r => r.year === selectedYear)
    if (selectedQuarter !== 'all') d = d.filter(r => r.label === selectedQuarter)
    return d
  }, [data, selectedYear, selectedQuarter])

  const latest = filteredData.length > 0 ? filteredData[filteredData.length - 1] : undefined

  // ── Annual Mean Calculations for Economic Vitality Metrics ──
  const annualStats = useMemo(() => {
    if (selectedQuarter !== 'all') return null

    const currentYearData = data.filter(d => d.year === selectedYear)
    const prevYear = (parseInt(selectedYear) - 1).toString()
    const prevYearData = data.filter(d => d.year === prevYear)

    if (currentYearData.length === 0) return null

    const getMean = (arr: VitalityData[], key: keyof VitalityData) => {
      const valid = arr.filter(d => d[key] != null && d[key] !== 0)
      return valid.length > 0 ? valid.reduce((acc, d) => acc + (d[key] as number), 0) / valid.length : null
    }

    const currentUnempMean = getMean(currentYearData, 'unemploymentRate')
    const prevUnempMean = getMean(prevYearData, 'unemploymentRate')

    return {
      unemploymentRate: currentUnempMean,
      unemploymentRateDiff: (currentUnempMean != null && prevUnempMean != null) ? currentUnempMean - prevUnempMean : null,
      laborForce: getMean(currentYearData, 'laborForce'),
      jobGrowth: getMean(currentYearData, 'jobGrowth'),
      avgWeeklyWage: getMean(currentYearData, 'avgWeeklyWage'),
    }
  }, [data, selectedYear, selectedQuarter])

  if (data.length === 0) return null

  return (
    <div className="space-y-8">
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Unemployment Rate"
          value={
            selectedQuarter === 'all' && annualStats?.unemploymentRate != null
              ? `${annualStats.unemploymentRate.toFixed(1)}%`
              : latest?.unemploymentRate != null && latest.unemploymentRate !== 0
                ? `${latest.unemploymentRate.toFixed(1)}%`
                : '-'
          }
          sub={
            selectedQuarter === 'all'
              ? `full year ${selectedYear}`
              : latest !== undefined
                ? `Mesa County · ${latest.label}`
                : ''
          }
          icon={TrendingUp}
          {...(selectedQuarter === 'all' && annualStats?.unemploymentRateDiff != null
            ? {
                trend: {
                  value: annualStats.unemploymentRateDiff,
                  label: 'vs. prev year',
                  isGood: annualStats.unemploymentRateDiff <= 0,
                  unit: ' pts'
                }
              }
            : latest?.unemploymentRateChange != null && latest.unemploymentRateChange !== 0
              ? {
                  trend: {
                    value: latest.unemploymentRateChange,
                    label: 'vs. year ago',
                    isGood: latest.unemploymentRateChange <= 0,
                    unit: ' pts'
                  }
                }
              : {})}
        />
        <KpiCard
          label="Labor Force Size"
          value={
            selectedQuarter === 'all' && annualStats?.laborForce != null
              ? formatNumber(annualStats.laborForce)
              : latest?.laborForce != null && latest.laborForce !== 0
                ? formatNumber(latest.laborForce)
                : '-'
          }
          sub={
            selectedQuarter === 'all'
              ? `full year ${selectedYear}`
              : latest !== undefined
                ? `Active participants · ${latest.label}`
                : ''
          }
          icon={Users}
        />
        <KpiCard
          label="Net Job Growth"
          value={
            selectedQuarter === 'all' && annualStats?.jobGrowth != null
              ? (annualStats.jobGrowth >= 0 ? `+${formatNumber(annualStats.jobGrowth)}` : formatNumber(annualStats.jobGrowth))
              : latest?.jobGrowth != null && latest.jobGrowth !== 0
                ? (latest.jobGrowth >= 0 ? `+${formatNumber(latest.jobGrowth)}` : formatNumber(latest.jobGrowth))
                : '-'
          }
          sub={
            selectedQuarter === 'all'
              ? `full year ${selectedYear}`
              : latest !== undefined
                ? `vs. year ago · ${latest.label}`
                : ''
          }
          icon={Briefcase}
        />
        <KpiCard
          label="Avg Weekly Wage"
          value={
            selectedQuarter === 'all' && annualStats?.avgWeeklyWage != null
              ? formatCurrency(annualStats.avgWeeklyWage)
              : latest?.avgWeeklyWage != null && latest.avgWeeklyWage !== 0
                ? formatCurrency(latest.avgWeeklyWage)
                : '-'
          }
          sub={
            selectedQuarter === 'all'
              ? `full year ${selectedYear}`
              : latest !== undefined
                ? `Across all industries · ${latest.label}`
                : ''
          }
          icon={Wallet}
        />
      </div>

      <Tabs defaultValue="wages">
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-base font-semibold">Economic Breakdown</h2>
          <TabsList>
            <TabsTrigger value="wages">Wages</TabsTrigger>
            <TabsTrigger value="employed">Employed</TabsTrigger>
            <TabsTrigger value="unemployed">Unemployed</TabsTrigger>
            <TabsTrigger value="discouraged">Discouraged</TabsTrigger>
            <TabsTrigger value="growth">Job Growth</TabsTrigger>
          </TabsList>
        </div>

        {/* Wages Tab */}
        <TabsContent value="wages">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#0e7490]" />
                Avg. Weekly Wage Comparison (YoY)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatCurrency(Number(v)), 'Avg Weekly Wage']} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  {years.map((year, idx) => (
                    <Line
                      key={year}
                      type="monotone"
                      dataKey={`wage_${year}`}
                      name={`Year ${year}`}
                      stroke={idx === 0 ? TEAL : PINK}
                      strokeWidth={3}
                      dot={{ r: 5, fill: idx === 0 ? TEAL : PINK }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employed Tab */}
        <TabsContent value="employed">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-[#0e7490]" />
                Employed Workers Comparison (YoY)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatNumber(Number(v)), 'Employed']} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  {years.map((year, idx) => (
                    <Line
                      key={year}
                      type="monotone"
                      dataKey={`employed_${year}`}
                      name={`Year ${year}`}
                      stroke={idx === 0 ? TEAL : PINK}
                      strokeWidth={3}
                      dot={{ r: 5, fill: idx === 0 ? TEAL : PINK }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Unemployed Tab */}
        <TabsContent value="unemployed">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <UserMinus className="w-4 h-4 text-[#0e7490]" />
                Unemployed Workers Comparison (YoY)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatNumber(Number(v)), 'Unemployed']} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  {years.map((year, idx) => (
                    <Line
                      key={year}
                      type="monotone"
                      dataKey={`unemployed_${year}`}
                      name={`Year ${year}`}
                      stroke={idx === 0 ? TEAL : PINK}
                      strokeWidth={3}
                      dot={{ r: 5, fill: idx === 0 ? TEAL : PINK }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Discouraged Tab */}
        <TabsContent value="discouraged">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <UserMinus className="w-4 h-4 text-orange-500" />
                Discouraged Workers Comparison (YoY)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                People who are able to work but who have not recieved or taken a job offer within a year of unemployment are considered "discouraged" workforce.
              </p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => formatNumber(v)} domain={['auto', 'auto']} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => [formatNumber(Number(v)), 'Discouraged']} />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  {years.map((year, idx) => (
                    <Line
                      key={year}
                      type="monotone"
                      dataKey={`discouraged_${year}`}
                      name={`Year ${year}`}
                      stroke={idx === 0 ? SLATE : TEAL}
                      strokeWidth={3}
                      dot={{ r: 5, fill: idx === 0 ? SLATE : TEAL }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Job Growth Tab */}
        <TabsContent value="growth">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#0e7490]" />
                Net Job Growth by Year & Quarter
              </CardTitle>
              <p className="text-xs text-muted-foreground">Employment change compared to the same quarter in previous year</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart 
                  layout="vertical" 
                  data={data.filter(d => d.jobGrowth != null && d.jobGrowth !== 0).slice(-12)} // Show last 12 valid entries
                  margin={{ left: 40, right: 40, top: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis 
                    type="category" 
                    dataKey="label" 
                    tick={{ fontSize: 11 }} 
                    width={80}
                  />
                  <Tooltip 
                    contentStyle={tooltipStyle}
                    formatter={(v) => [formatNumber(Number(v)), 'Net Job Growth']}
                  />
                  <ReferenceLine x={0} stroke="#000" />
                  <Bar dataKey="jobGrowth" name="Net Job Growth">
                    {data.filter(d => d.jobGrowth != null && d.jobGrowth !== 0).slice(-12).map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={(entry.jobGrowth ?? 0) >= 0 ? TEAL : PINK} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
