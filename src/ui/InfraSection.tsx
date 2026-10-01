import { useMemo } from 'react'
import { HardHat, MapPin } from 'lucide-react'
import { QuarterFilter } from '../components/QuarterFilter'
import { useSectionFilter } from '../hooks/useSectionFilter'

const CYAN   = '#00a3b4'
const CARD_BG = '#0e1f2b'

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

// ── Status pill ───────────────────────────────────────────────────────────────
function statusStyle(status: string): { bg: string; text: string } {
  const s = status.toLowerCase()
  if (s.includes('complete') || s.includes('done'))
    return { bg: '#0b3d2e', text: '#34d399' }
  if (s.includes('progress') || s.includes('active') || s.includes('underway') || s.includes('construction'))
    return { bg: '#0d2f4a', text: '#60a5fa' }
  if (s.includes('design') || s.includes('engineer') || s.includes('planning'))
    return { bg: '#3b2a05', text: '#f59e0b' }
  if (s.includes('hold') || s.includes('pause') || s.includes('delayed'))
    return { bg: '#3b0d12', text: '#f87171' }
  return { bg: '#1e293b', text: '#94a3b8' }
}

// ── Progress bar ──────────────────────────────────────────────────────────────
function ProgressBar({ pct }: { pct: number }) {
  const clamped = Math.min(100, Math.max(0, pct))
  const barColor =
    clamped >= 100 ? '#22c55e' : clamped >= 60 ? CYAN : clamped >= 30 ? '#f59e0b' : '#f87171'
  return (
    <div className="w-full rounded-full h-1.5" style={{ backgroundColor: '#1e2d3d' }}>
      <div
        className="h-1.5 rounded-full transition-all duration-500"
        style={{ width: `${clamped}%`, backgroundColor: barColor }}
      />
    </div>
  )
}

// ── Project card ──────────────────────────────────────────────────────────────
function ProjectCard({ row }: { row: InfraRow }) {
  const { bg, text } = statusStyle(row.status)
  const pct = row.percentComplete ?? 0

  return (
    <div
      className="rounded-2xl p-5 flex flex-col gap-3 border border-[#1e3040] shadow-xl"
      style={{ backgroundColor: CARD_BG }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5 min-w-0">
          <p className="text-sm font-bold text-white leading-snug">{row.projectName}</p>
          {row.category && (
            <p className="text-xs" style={{ color: '#64748b' }}>{row.category}</p>
          )}
        </div>
        {row.status && (
          <span
            className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0"
            style={{ backgroundColor: bg, color: text }}
          >
            {row.status}
          </span>
        )}
      </div>

      {/* Summary */}
      {row.summary && (
        <p className="text-xs leading-relaxed line-clamp-3" style={{ color: '#94a3b8' }}>
          {row.summary}
        </p>
      )}

      {/* Progress */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span style={{ color: '#64748b' }}>Progress</span>
          <span className="font-bold" style={{ color: CYAN }}>{pct}%</span>
        </div>
        <ProgressBar pct={pct} />
      </div>

      {/* Target & budget meta */}
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs" style={{ color: '#94a3b8' }}>
        {row.targetQuarter && (
          <span>
            🎯 Target:{' '}
            <span className="font-semibold text-white">{row.targetQuarter}</span>
          </span>
        )}
        {row.estimatedBudget != null && (
          <span>
            💰{' '}
            <span className="font-semibold text-white">{formatCurrency(row.estimatedBudget)}</span>
          </span>
        )}
      </div>

      {/* Milestones / latest update */}
      {row.milestones && (
        <div
          className="text-xs rounded-lg px-3 py-2.5 leading-relaxed border"
          style={{ backgroundColor: '#0d1a26', borderColor: '#1e3040', color: '#cbd5e1' }}
        >
          <span className="font-bold text-white">Latest: </span>
          {row.milestones}
        </div>
      )}

      {/* Shovel-ready note */}
      {row.shovelReady && (
        <div
          className="flex items-start gap-1.5 text-xs rounded-lg px-3 py-2.5"
          style={{ backgroundColor: `${CYAN}18`, color: CYAN }}
        >
          <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>{row.shovelReady}</span>
        </div>
      )}
    </div>
  )
}

// ── Group helper ──────────────────────────────────────────────────────────────
function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item) || 'Uncategorized'
    if (!acc[k]) acc[k] = []
    acc[k]!.push(item)
    return acc
  }, {})
}

// ── Main section ──────────────────────────────────────────────────────────────
export default function InfraSection({ rows }: { rows: InfraRow[] }) {
  const allQuarters = useMemo(() => {
    const quarters = rows.map(r => r.targetQuarter || r.quarter).filter(Boolean)
    return [...new Set(quarters)].sort((a, b) => {
      const [qa, ya] = a.split(' ')
      const [qb, yb] = b.split(' ')
      if (ya !== yb) return (ya ?? '').localeCompare(yb ?? '')
      return (qa ?? '').localeCompare(qb ?? '')
    })
  }, [rows])

  const { selectedYear, selectedQuarter, setSelectedQuarter, handleYearChange } =
    useSectionFilter(allQuarters)

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      const q = r.targetQuarter || r.quarter
      if (!q) return selectedQuarter === 'all' && !selectedYear
      const rowYear = q.split(' ')[1] ?? ''
      if (selectedYear && rowYear !== selectedYear) return false
      if (selectedQuarter !== 'all' && !q.includes(selectedQuarter)) return false
      return true
    })
  }, [rows, selectedYear, selectedQuarter])

  const grouped = groupBy(filteredRows, r => r.category)
  const shovelReadyItems = filteredRows.filter(r => r.shovelReady)

  return (
    <div className="space-y-6 text-white">
      {/* Filter */}
      <div className="flex justify-start pt-1">
        <QuarterFilter
          allQuarters={allQuarters}
          selectedYear={selectedYear}
          selectedQuarter={selectedQuarter}
          onYearChange={handleYearChange}
          onQuarterChange={setSelectedQuarter}
          label="Target Quarter:"
        />
      </div>

      {filteredRows.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center h-32 gap-2 rounded-2xl border border-dashed"
          style={{ borderColor: '#1e3040', color: '#64748b' }}
        >
          <HardHat className="w-6 h-6 opacity-40" />
          <p className="text-sm">No infrastructure projects for this selection.</p>
        </div>
      ) : (
        <>
          {/* Cards grouped by category */}
          {Object.entries(grouped).map(([category, projects]) => (
            <div key={category} className="space-y-3">
              {Object.keys(grouped).length > 1 && (
                <p
                  className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: '#64748b' }}
                >
                  {category}
                </p>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {projects.map(p => <ProjectCard key={p.projectName} row={p} />)}
              </div>
            </div>
          ))}

          {/* Shovel-ready summary panel */}
          {shovelReadyItems.length > 0 && (
            <div
              className="rounded-2xl p-5 border border-[#1e3040] space-y-3"
              style={{ backgroundColor: CARD_BG }}
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" style={{ color: CYAN }} />
                <p className="text-sm font-bold" style={{ color: CYAN }}>
                  Shovel-Ready Land Highlights
                </p>
              </div>
              <ul className="space-y-2">
                {shovelReadyItems.map(r => (
                  <li key={r.projectName} className="text-xs leading-relaxed" style={{ color: '#94a3b8' }}>
                    <span className="font-semibold text-white">{r.projectName}: </span>
                    {r.shovelReady}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
