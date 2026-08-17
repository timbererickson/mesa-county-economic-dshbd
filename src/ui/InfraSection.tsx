import { useMemo } from 'react'
import { Card, CardContent } from '../lib/shadcn/card'
import { Badge } from '../lib/shadcn/badge'
import { HardHat, MapPin } from 'lucide-react'
import { QuarterFilter } from '../components/QuarterFilter'
import { useSectionFilter } from '../hooks/useSectionFilter'

const TEAL = '#0e7490'
const PINK = '#e4808c'
const RED = '#c12033'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)

interface InfraRow {
  projectName: string
  category: string
  summary: string
  status: string
  percentComplete: number
  targetQuarter: string
  reportingQuarter: string
  quarter: string
  milestones: string
  shovelReady: string
  estimatedBudget: number | null
}

function statusColor(status: string): string {
  const s = status.toLowerCase()
  if (s.includes('complete') || s.includes('done')) return 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200'
  if (s.includes('progress') || s.includes('active') || s.includes('underway')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200'
  if (s.includes('plan') || s.includes('design')) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
  if (s.includes('hold') || s.includes('pause')) return 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'
  return 'bg-muted text-muted-foreground'
}

function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct))
  const color = clamped >= 100 ? '#22c55e' : clamped >= 60 ? TEAL : clamped >= 30 ? PINK : RED
  return (
    <div className="w-full bg-muted rounded-full h-2">
      <div
        className="h-2 rounded-full transition-all"
        style={{ width: `${clamped}%`, backgroundColor: color }}
      />
    </div>
  )
}

function ProjectCard({ row }: { row: InfraRow }) {
  return (
    <Card className="flex flex-col">
      <CardContent className="pt-4 pb-4 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-tight">{row.projectName}</p>
            {row.category && (
              <span className="text-xs text-muted-foreground">{row.category}</span>
            )}
          </div>
          {row.status && (
            <Badge className={`text-xs whitespace-nowrap shrink-0 ${statusColor(row.status)}`}>
              {row.status}
            </Badge>
          )}
        </div>

        {/* Summary */}
        {row.summary && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{row.summary}</p>
        )}

        {/* Progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-semibold" style={{ color: TEAL }}>{row.percentComplete}%</span>
          </div>
          <ProgressBar pct={row.percentComplete} />
        </div>

        {/* Meta (Reported Removed Completely) */}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {row.targetQuarter && (
            <span>🎯 Target: <span className="font-medium text-foreground">{row.targetQuarter}</span></span>
          )}
          {row.estimatedBudget != null && (
            <span>💰 <span className="font-medium text-foreground">{formatCurrency(row.estimatedBudget)}</span></span>
          )}
        </div>

        {/* Milestones */}
        {row.milestones && (
          <div className="text-xs bg-muted/40 rounded-md p-2.5 border leading-relaxed">
            <span className="font-semibold text-foreground">Latest: </span>
            {row.milestones}
          </div>
        )}

        {/* Shovel-ready note */}
        {row.shovelReady && (
          <div
            className="flex items-start gap-1.5 text-xs rounded-md p-2.5"
            style={{ backgroundColor: `${TEAL}12`, color: TEAL }}
          >
            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{row.shovelReady}</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Group projects by category
function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item) || 'Uncategorized'
    if (!acc[k]) acc[k] = []
    acc[k]!.push(item)
    return acc
  }, {})
}

export default function InfraSection({
  rows,
}: {
  rows: InfraRow[]
}) {
  // Collect unique quarters based on project target dates
  const allQuarters = useMemo(() => {
    const quarters = rows.map(r => r.targetQuarter || r.quarter).filter(Boolean)
    return [...new Set(quarters)].sort((a, b) => {
      const [qa, ya] = a.split(' ')
      const [qb, yb] = b.split(' ')
      if (ya !== yb) return (ya ?? '').localeCompare(yb ?? '')
      return (qa ?? '').localeCompare(qb ?? '')
    })
  }, [rows])

  const {
    selectedYear,
    selectedQuarter,
    setSelectedQuarter,
    handleYearChange
  } = useSectionFilter(allQuarters)

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      const q = r.targetQuarter || r.quarter
      if (!q) return selectedQuarter === 'all' && !selectedYear
      const rowYear = q.split(' ')[1] ?? ''
      if (selectedYear && rowYear !== selectedYear) return false
      if (selectedQuarter !== 'all' && q !== selectedQuarter) return false
      return true
    })
  }, [rows, selectedYear, selectedQuarter])

  if (filteredRows.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-start">
          <QuarterFilter
            allQuarters={allQuarters}
            selectedYear={selectedYear}
            selectedQuarter={selectedQuarter}
            onYearChange={handleYearChange}
            onQuarterChange={setSelectedQuarter}
            label="Target Quarter:"
          />
        </div>
        <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground border border-dashed rounded-lg">
          <HardHat className="w-6 h-6 opacity-40" />
          <p className="text-sm">No infrastructure projects for this selection.</p>
        </div>
      </div>
    )
  }

  const grouped = groupBy(filteredRows, r => r.category)
  const shovelReadyItems = filteredRows.filter(r => r.shovelReady)

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
          label="Target Quarter:"
        />
      </div>

      {/* Projects grouped by category */}
      {Object.entries(grouped).map(([category, projects]) => (
        <div key={category}>
          {Object.keys(grouped).length > 1 && (
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">{category}</p>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {projects.map(p => <ProjectCard key={p.projectName} row={p} />)}
          </div>
        </div>
      ))}

      {/* Shovel-ready summary */}
      {shovelReadyItems.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4" style={{ color: TEAL }} />
              <p className="text-sm font-semibold" style={{ color: TEAL }}>Shovel-Ready Land Highlights</p>
            </div>
            <ul className="space-y-2">
              {shovelReadyItems.map(r => (
                <li key={r.projectName} className="text-xs text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">{r.projectName}: </span>
                  {r.shovelReady}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
