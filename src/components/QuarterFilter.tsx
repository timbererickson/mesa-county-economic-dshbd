import { useMemo } from 'react'
import { Calendar } from 'lucide-react'

const CYAN = '#023e52'

function RetoolFilterButton({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={active ? { backgroundColor: CYAN, borderColor: CYAN, color: '#ffffff' } : undefined}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
        active
          ? 'shadow-md shadow-cyan-950/40 text-white'
          : 'bg-[#182029] text-gray-300 border-[#2c3746] hover:border-gray-500 hover:text-white'
      }`}
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
    let extractedYears: string[] = []
    if (Array.isArray(allQuarters) && allQuarters.length > 0) {
      extractedYears = allQuarters
        .map(q => q?.match(/\b(20\d{2})\b/)?.[1])
        .filter((y): y is string => Boolean(y))
    }

    const uniqueYears = [...new Set(extractedYears)].sort()
    const baseYears = uniqueYears.length > 0 ? uniqueYears : ['2025', '2026', '2027']
    return ['all', ...baseYears]
  }, [allQuarters])

  // Filter quarters available for the selected year
  const quartersList = useMemo(() => {
    if (!Array.isArray(allQuarters) || allQuarters.length === 0) return ['all', 'Q1', 'Q2', 'Q3', 'Q4']
    
    const isYearAll = !selectedYear || selectedYear.toLowerCase() === 'all'
    const matchingQuarters = isYearAll
      ? allQuarters
      : allQuarters.filter(q => q && q.includes(selectedYear))

    const extracted = matchingQuarters
      .map(q => q?.match(/\b(Q[1-4])\b/i)?.[1]?.toUpperCase())
      .filter((q): q is string => Boolean(q))

    const uniqueQ = [...new Set(extracted)].sort()
    return uniqueQ.length > 0 ? ['all', ...uniqueQ] : ['all', 'Q1', 'Q2', 'Q3', 'Q4']
  }, [allQuarters, selectedYear])

  return (
    <div className="flex items-center gap-4 flex-wrap text-white text-xs">
      {/* Year selector */}
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
        <span className="font-semibold text-gray-300">Target Year:</span>
        <div className="flex items-center gap-1.5">
          {years.map(y => (
            <RetoolFilterButton 
              key={y} 
              label={y === 'all' ? 'All' : y} 
              active={selectedYear === y} 
              onClick={() => onYearChange(y)} 
            />
          ))}
        </div>
      </div>

      {/* Vertical Divider */}
      <div className="h-4 w-px bg-[#2c3746]" />

      {/* Quarter selector */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-gray-300">{label}</span>
        <div className="flex items-center gap-1.5">
          {quartersList.map(q => (
            <RetoolFilterButton
              key={q}
              label={q === 'all' ? 'All' : q}
              active={selectedQuarter === q}
              onClick={() => onQuarterChange(q)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}