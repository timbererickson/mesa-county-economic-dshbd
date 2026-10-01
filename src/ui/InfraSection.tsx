import { useMemo } from 'react'
import { HardHat, MapPin, Loader2 } from 'lucide-react'
import { QuarterFilter } from '../components/QuarterFilter'
import { useSectionFilter } from '../hooks/useSectionFilter'

const CYAN = '#00a3b4'
const CARD_BG = '#182028'

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
function statusStyle(status: string): { bg: string; text: string; border: string } {
  const s = status.toLowerCase()
  if (s.includes('complete') || s.includes('done'))
    return { bg: '#0b3d2e', text: '#34d399', border: '#059669' }
  if (s.includes('progress') || s.includes('active') || s.includes('underway') || s.includes('construction'))
    return { bg: '#0f2942', text: '#38bdf8', border: '#1d4ed8' }
  if (s.includes('design') || s.includes('engineer') || s.includes('planning'))
    return { bg: '#3b2a14', text: '#f5b041', border: '#523b1c' }
  if (s.includes('hold') || s.includes('pause') || s.includes('delayed'))
    return { bg: '#3d1116', text: '#f87171', border: '#991b1b' }
  return { bg: '#1e293b', text: '#94a3b8', border: '#334155' }
}

// ── Project card ──────────────────────────────────────────────────────────────
function ProjectCard({ row }: { row: InfraRow }) {
  const { bg, text, border } = statusStyle(row.status)
  const pct = row.percentComplete ?? 0

  return (
    <div
      className="w-[360px] sm:w-[390px] h-[390px] rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-3 border border-[#28323f] shadow-lg transition-all shrink-0 snap-start"
      style={{ backgroundColor: CARD_BG }}
    >
      {/* Top Header & Scrollable Summary */}
      <div className="flex flex-col gap-3 min-h-0 flex-1">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 shrink-0">
          <div className="flex flex-col gap-0.5 min-w-0">
            <h3 className="text-base font-bold text-white leading-snug tracking-tight line-clamp-2">
              {row.projectName}
            </h3>
            {row.category && (
              <p className="text-xs text-gray-400 font-normal">{row.category}</p>
            )}
          </div>
          {row.status && (
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0 border"
              style={{ backgroundColor: bg, color: text, borderColor: border }}
            >
              {row.status}
            </span>
          )}
        </div>

        {/* Scrollable Summary Description */}
        {row.summary && (
          <div className="flex-1 overflow-y-auto pr-1.5 text-xs text-gray-300 leading-relaxed scrollbar-dark">
            <p>{row.summary}</p>
          </div>
        )}
      </div>

      {/* Bottom Section */}
      <div className="space-y-3 shrink-0 pt-3 border-t border-[#222d3b]">
        {/* Progress */}
        <div className="flex items-center justify-between text-xs font-normal">
          <span className="text-gray-400">Progress</span>
          <span className="font-bold text-[#00a3b4]">{pct}%</span>
        </div>

        {/* Target & budget meta */}
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-300 font-medium">
          {row.targetQuarter && (
            <div className="flex items-center gap-1.5">
              <span className="text-sm leading-none">🎯</span>
              <span>
                Target: <strong className="font-bold text-white">{row.targetQuarter}</strong>
              </span>
            </div>
          )}
          {row.estimatedBudget != null && (
            <div className="flex items-center gap-1.5">
              <span className="text-sm leading-none">💰</span>
              <strong className="font-bold text-white">{formatCurrency(row.estimatedBudget)}</strong>
            </div>
          )}
        </div>

        {/* Milestones / latest update box */}
        {row.milestones && (
          <div className="rounded-xl bg-[#0e141b] border border-[#222d3b] p-3 text-xs text-gray-200">
            <span className="font-bold text-white">Latest: </span>
            <span>{row.milestones}</span>
          </div>
        )}

        {/* Shovel-ready note */}
        {row.shovelReady && (
          <div
            className="flex items-start gap-1.5 text-xs rounded-xl px-3 py-2"
            style={{ backgroundColor: `${CYAN}18`, color: CYAN }}
          >
            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            <span>{row.shovelReady}</span>
          </div>
        )}
      </div>
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
export default function InfraSection({ rows, loading }: { rows: InfraRow[]; loading?: boolean }) {
  const allQuarters = useMemo(() => {
    const quarters = rows.map(r => r.targetQuarter || r.quarter).filter(Boolean)
    return [...new Set(quarters)].sort((a, b) => {
      const ya = a.match(/\b(20\d{2})\b/)?.[1] ?? ''
      const yb = b.match(/\b(20\d{2})\b/)?.[1] ?? ''
      if (ya !== yb) return ya.localeCompare(yb)
      return a.localeCompare(b)
    })
  }, [rows])

  const { selectedYear, selectedQuarter, setSelectedQuarter, handleYearChange } =
    useSectionFilter(allQuarters)

  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      const isYearAll = !selectedYear || selectedYear.toLowerCase() === 'all'
      const isQuarterAll = !selectedQuarter || selectedQuarter.toLowerCase() === 'all'

      // Root level view: if both Year and Quarter are 'all', show ALL projects
      if (isYearAll && isQuarterAll) return true

      const q = r.targetQuarter || r.quarter || ''
      if (!q) return isYearAll && isQuarterAll

      const match = q.match(/\b(20\d{2})\b/)
      const rowYear = match ? match[1] : (q.split(' ')[1] ?? '')

      if (!isYearAll && rowYear && rowYear !== selectedYear) {
        return false
      }

      if (!isQuarterAll && !q.toLowerCase().includes(selectedQuarter.toLowerCase())) {
        return false
      }

      return true
    })
  }, [rows, selectedYear, selectedQuarter])

  const grouped = groupBy(filteredRows, r => r.category)
  const shovelReadyItems = filteredRows.filter(r => r.shovelReady)

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-3 rounded-2xl border border-dashed border-[#1e3040] text-gray-400">
        <Loader2 className="w-6 h-6 animate-spin text-[#00a3b4]" />
        <p className="text-xs font-medium">Loading infrastructure projects...</p>
      </div>
    )
  }

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
          className="flex flex-col items-center justify-center h-36 gap-2 rounded-2xl border border-dashed border-[#1e3040] text-gray-400 px-4 text-center"
        >
          <HardHat className="w-6 h-6 opacity-40 text-[#00a3b4]" />
          <p className="text-sm">
            No infrastructure projects found for {selectedYear === 'all' ? 'all years' : `year ${selectedYear}`}
            {selectedQuarter === 'all' ? '' : ` (${selectedQuarter})`}.
          </p>
          {rows.length > 0 && (
            <button
              onClick={() => { handleYearChange('all'); setSelectedQuarter('all'); }}
              className="text-xs text-[#00a3b4] hover:underline font-bold mt-1"
            >
              Reset Filters & Show All Projects ({rows.length})
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Cards grouped by category with horizontal scrolling */}
          {Object.entries(grouped).map(([category, projects]) => (
            <div key={category} className="space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                {category}
              </p>
              <div className="w-full flex gap-5 overflow-x-auto pb-4 pt-1 snap-x snap-mandatory scrollbar-dark">
                {projects.map(p => (
                  <ProjectCard key={p.projectName} row={p} />
                ))}
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
