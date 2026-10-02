import { useMemo } from 'react'
import { Calendar, Building2 } from 'lucide-react'
import { PermitSubtypeFilter, type SubtypeOption } from './PermitSubtypeFilter'

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

export interface DevelopmentFilterProps {
  allQuarters: string[]
  selectedYear: string
  selectedQuarter: string
  selectedType: string
  subtypeOptions: SubtypeOption[]
  selectedSubtypes: string[]
  onYearChange: (y: string) => void
  onQuarterChange: (q: string) => void
  onTypeChange: (t: string) => void
  onSubtypesChange: (subtypes: string[]) => void
}

export function DevelopmentFilter({
  allQuarters = [],
  selectedYear,
  selectedQuarter,
  selectedType,
  subtypeOptions = [],
  selectedSubtypes = [],
  onYearChange,
  onQuarterChange,
  onTypeChange,
  onSubtypesChange,
}: DevelopmentFilterProps) {

  const years = useMemo(() => {
    let extractedYears: string[] = []
    if (Array.isArray(allQuarters) && allQuarters.length > 0) {
      extractedYears = allQuarters
        .map(q => q?.match(/\b(20\d{2})\b/)?.[1])
        .filter((y): y is string => Boolean(y))
    }

    const uniqueYears = [...new Set(extractedYears)].sort()
    const validYears = uniqueYears.filter(y => {
      const num = parseInt(y, 10)
      return !isNaN(num) && num >= 2025
    })
    const baseYears = validYears.length > 0 ? validYears : ['2025', '2026']
    return ['all', ...baseYears]
  }, [allQuarters])

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

  const typesList = ['all', 'Commercial', 'Residential']

  return (
    <div className="flex items-center gap-4 flex-wrap text-white text-xs py-2">
      {/* Target Year */}
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

      {/* Divider */}
      <div className="h-4 w-px bg-[#2c3746]" />

      {/* Target Quarter */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-gray-300">Target Quarter:</span>
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

      {/* Divider */}
      <div className="h-4 w-px bg-[#2c3746]" />

      {/* Project Type */}
      <div className="flex items-center gap-2">
        <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
        <span className="font-semibold text-gray-300">Type:</span>
        <div className="flex items-center gap-1.5">
          {typesList.map(t => (
            <RetoolFilterButton
              key={t}
              label={t === 'all' ? 'All Types' : t}
              active={selectedType === t}
              onClick={() => onTypeChange(t)}
            />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="h-4 w-px bg-[#2c3746]" />

      {/* Permit Subtype Filter */}
      <div className="flex items-center gap-2">
        <span className="font-semibold text-gray-300">Subtype:</span>
        <PermitSubtypeFilter
          options={subtypeOptions}
          selected={selectedSubtypes}
          onChange={onSubtypesChange}
        />
      </div>
    </div>
  )
}
export { type SubtypeOption }
