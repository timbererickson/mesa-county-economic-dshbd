import { useState, useRef, useEffect, useMemo } from 'react'
import { Search, ChevronDown, Check, X, Filter } from 'lucide-react'

const CYAN = '#023e52'

export interface SubtypeOption {
  subtype: string
  count: number
}

export interface PermitSubtypeFilterProps {
  options: SubtypeOption[]
  selected: string[]
  onChange: (selected: string[]) => void
}

export function PermitSubtypeFilter({
  options = [],
  selected = [],
  onChange,
}: PermitSubtypeFilterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      // Focus search input on open
      setTimeout(() => searchInputRef.current?.focus(), 50)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Filter options by search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options
    const q = searchQuery.toLowerCase().trim()
    return options.filter(opt => opt.subtype.toLowerCase().includes(q))
  }, [options, searchQuery])

  const toggleOption = (subtype: string) => {
    if (selected.includes(subtype)) {
      onChange(selected.filter(s => s !== subtype))
    } else {
      onChange([...selected, subtype])
    }
  }

  const handleSelectAllVisible = () => {
    const visibleSubtypes = filteredOptions.map(o => o.subtype)
    const newSelected = [...new Set([...selected, ...visibleSubtypes])]
    onChange(newSelected)
  }

  const handleClearAll = () => {
    onChange([])
  }

  const hasSelection = selected.length > 0
  const isAllSelected = options.length > 0 && selected.length === options.length

  // Button label summary
  const buttonLabel = useMemo(() => {
    if (!hasSelection) return `All Subtypes (${options.length})`
    if (selected.length === 1) return selected[0]
    return `${selected.length} Subtypes Selected`
  }, [hasSelection, selected, options.length])

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={hasSelection ? { backgroundColor: CYAN, borderColor: CYAN, color: '#ffffff' } : undefined}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
            hasSelection
              ? 'shadow-md shadow-cyan-950/40 text-white'
              : 'bg-[#182029] text-gray-300 border-[#2c3746] hover:border-gray-500 hover:text-white'
          }`}
          title="Filter by permit subtype within current bounds"
        >
          <Filter className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate max-w-[170px]">{buttonLabel}</span>
          <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Clear selection quick button */}
        {hasSelection && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleClearAll()
            }}
            className="ml-1 p-1 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition-colors"
            title="Reset subtype filter to all"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 md:w-84 rounded-xl bg-[#131922] border border-[#2c3746] shadow-2xl z-50 overflow-hidden text-gray-200 text-xs origin-top-right">
          {/* Header & Search Input */}
          <div className="p-2.5 border-b border-[#2c3746] bg-[#182029] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-300">Permit Subtypes</span>
              <span className="text-[11px] text-gray-400">
                {selected.length > 0 ? `${selected.length} of ${options.length} selected` : `All (${options.length})`}
              </span>
            </div>
            
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search subtypes in current bounds..."
                className="w-full bg-[#0d1219] border border-[#2c3746] rounded-md pl-8 pr-7 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-600 focus:ring-1 focus:ring-cyan-600"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-gray-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Quick Actions (Select All / Clear) */}
            <div className="flex items-center justify-between pt-1 text-[11px]">
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="text-cyan-400 hover:text-cyan-300 hover:underline font-medium"
              >
                {filteredOptions.length === options.length ? 'Select All' : `Select All Visible (${filteredOptions.length})`}
              </button>
              {hasSelection && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-gray-400 hover:text-rose-400 font-medium"
                >
                  Clear Selection
                </button>
              )}
            </div>
          </div>

          {/* Subtype List */}
          <div className="max-h-60 overflow-y-auto divide-y divide-[#1e2733] py-1">
            {filteredOptions.length === 0 ? (
              <div className="py-6 px-4 text-center text-gray-500">
                No matching subtypes found
              </div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = selected.includes(opt.subtype)
                return (
                  <button
                    key={opt.subtype}
                    type="button"
                    onClick={() => toggleOption(opt.subtype)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left hover:bg-[#1a232e] transition-colors ${
                      isSelected ? 'bg-cyan-950/20 text-white font-medium' : 'text-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? 'bg-[#023e52] border-[#023e52] text-white'
                            : 'border-gray-500 bg-[#0d1219]'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      </div>
                      <span className="truncate">{opt.subtype}</span>
                    </div>

                    <span className="text-[10px] tabular-nums font-mono px-1.5 py-0.5 rounded bg-[#202934] text-gray-400 shrink-0">
                      {opt.count.toLocaleString()}
                    </span>
                  </button>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-[#2c3746] bg-[#182029] flex items-center justify-between text-[11px] text-gray-400">
            <span>Pertains to current filter bounds</span>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-2.5 py-1 bg-cyan-700 hover:bg-cyan-600 text-white rounded font-medium text-xs transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
