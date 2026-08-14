import { useMemo } from 'react'
import { CalendarRange } from 'lucide-react'
import { cn } from '../lib/shadcn/utils'

const TEAL = '#0e7490'

function FilterButton({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={active ? { backgroundColor: TEAL, borderColor: TEAL, color: '#fff' } : undefined}
      className={cn(
        'px-3 py-1.5 rounded-md text-sm font-medium transition-colors border',
        active ? '' : 'bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground'
      )}
    >
      {label}
    </button>
  )
}

export interface QuarterFilterProps {
  allQuarters: string[]
  selectedYear: string
  selectedQuarter: string
  onYearChange: (y: string) => void
  onQuarterChange: (q: string) => void
  label?: string
}

export function QuarterFilter({
  allQuarters = [],
  selectedYear,
  selectedQuarter,
  onYearChange,
  onQuarterChange,
  label = 'Target Quarter:',
}: QuarterFilterProps) {
  
  const years = useMemo(() => {
    if (!Array.isArray(allQuarters) || allQuarters.length === 0) return []
    
    const extractedYears = allQuarters
      .map(q => {
        if (!q) return null
        const match = q.match(/\b(20\d{2})\b/)
        return match ? match[1] : null
      })
      .filter((y): y is string => y !== null)

    return [...new Set(extractedYears)].sort()
  }, [allQuarters])

  const quartersForYear = useMemo(() => {
    if (!selectedYear || !Array.isArray(allQuarters)) return []
    return allQuarters.filter(q => q && q.includes(selectedYear))
  }, [allQuarters, selectedYear])

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {/* Year selector */}
      <div className="flex items-center gap-1.5">
        <CalendarRange className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm font-medium text-muted-foreground mr-1">Target Year:</span>
        {years.length === 0 ? (
          <span className="text-xs text-muted-foreground italic">No years available</span>
        ) : (
          years.map(y => (
            <FilterButton key={y} label={y} active={selectedYear === y} onClick={() => onYearChange(y)} />
          ))
        )}
      </div>

      {/* Divider */}
      <div className="h-5 w-px bg-border" />

      {/* Quarter selector */}
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium text-muted-foreground mr-1">{label}</span>
        <FilterButton
          label="All"
          active={selectedQuarter === 'all'}
          onClick={() => onQuarterChange('all')}
        />
        {quartersForYear.map(q => {
          const qLabel = q.match(/Q[1-4]/i)?.[0]?.toUpperCase() || q
          
          return (
            <FilterButton
              key={q}
              label={qLabel}
              active={selectedQuarter === q}
              onClick={() => onQuarterChange(q)}
            />
          )
        })}
      </div>
    </div>
  )
}