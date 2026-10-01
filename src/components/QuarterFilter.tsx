import { useMemo } from 'react'
import { CalendarRange } from 'lucide-react'

const CYAN = '#00a3b4'

function RetoolFilterButton({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={active ? { backgroundColor: CYAN, borderColor: CYAN, color: '#ffffff' } : undefined}
      className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all border ${
        active
          ? 'shadow-md shadow-cyan-900/20'
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
    if (!Array.isArray(allQuarters) || allQuarters.length === 0) return ['2025', '2026']
    
    const extractedYears = allQuarters
      .map(q => {
        if (!q) return null
        const match = q.match(/\b(20\d{2})\b/)
        return match ? match[1] : null
      })
      .filter((y): y is string => y !== null)

    const uniqueYears = [...new Set(extractedYears)].sort()
    return uniqueYears.length > 0 ? uniqueYears : ['2025', '2026']
  }, [allQuarters])

  const quartersList = ['all', 'Q1', 'Q2', 'Q3', 'Q4']

  return (
    <div className="flex items-center gap-4 flex-wrap text-white text-xs">
      {/* Year selector */}
      <div className="flex items-center gap-2">
        <CalendarRange className="w-4 h-4 text-cyan-400" />
        <span className="font-semibold text-gray-300">Target Year:</span>
        <div className="flex items-center gap-1.5">
          {years.map(y => (
            <RetoolFilterButton 
              key={y} 
              label={y} 
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