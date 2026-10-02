import { useState, useMemo, useRef } from 'react'
import {
  HardHat, MapPin, Loader2, Search, DollarSign, Activity, CheckCircle2,
  Clock, Zap, Droplets, Wifi, Truck, Layers, Filter, Eye, X, ArrowUpRight,
  Sparkles, ShieldCheck, ChevronLeft, ChevronRight, Mail, User, Calendar
} from 'lucide-react'
import { QuarterFilter } from '../components/QuarterFilter'
import { useSectionFilter } from '../hooks/useSectionFilter'
import type { InfrastructureProject } from '../backend/getInfrastructureData'

const CARD_BG = '#023e52'

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val)

const formatCompact = (val: number) => {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`
  return `$${val}`
}

// ── Category Icon & Color ───────────────────────────────────────────────────
function getCategoryMeta(category: string) {
  const c = category.toLowerCase()
  if (c.includes('water') || c.includes('sewer') || c.includes('distribution')) {
    return { icon: Droplets, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: '#0284c7' }
  }
  if (c.includes('broadband') || c.includes('fiber') || c.includes('telecom')) {
    return { icon: Wifi, color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)', border: '#7e22ce' }
  }
  if (c.includes('storm') || c.includes('drainage') || c.includes('flood')) {
    return { icon: Layers, color: '#2dd4bf', bg: 'rgba(45, 212, 191, 0.15)', border: '#0d9488' }
  }
  if (c.includes('electric') || c.includes('power') || c.includes('energy')) {
    return { icon: Zap, color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', border: '#d97706' }
  }
  return { icon: Truck, color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', border: '#ea580c' }
}

// ── Status Styling ─────────────────────────────────────────────────────────
function statusStyle(status: string): { bg: string; text: string; border: string; label: string } {
  const s = status.toLowerCase()
  if (s.includes('complete') || s.includes('done'))
    return { bg: '#0b3d2e', text: '#34d399', border: '#059669', label: 'Completed' }
  if (s.includes('progress') || s.includes('active') || s.includes('construct') || s.includes('bid'))
    return { bg: '#0f2942', text: '#38bdf8', border: '#1d4ed8', label: status || 'Active' }
  if (s.includes('design') || s.includes('engineer'))
    return { bg: '#3b2a14', text: '#f5b041', border: '#523b1c', label: status || 'In Design' }
  if (s.includes('plan') || s.includes('propose'))
    return { bg: '#311b42', text: '#c084fc', border: '#6b21a8', label: status || 'Proposed' }
  return { bg: '#1e293b', text: '#94a3b8', border: '#334155', label: status || 'Active' }
}

// ── Highlight Project Card for Horizontal Scrolling Gallery ─────────────────
function ProjectCard({
  project,
  onSelect,
}: {
  project: InfrastructureProject
  onSelect: (p: InfrastructureProject) => void
}) {
  const statusMeta = statusStyle(project.status)
  const catMeta = getCategoryMeta(project.category)
  const CatIcon = catMeta.icon
  const pct = project.percentComplete ?? 0

  return (
    <div
      className="w-[330px] sm:w-[370px] md:w-[400px] h-[410px] shrink-0 snap-start rounded-2xl p-5 sm:p-6 flex flex-col justify-between gap-3 border border-[#045975] shadow-xl hover:border-cyan-400/60 transition-all bg-[#023e52] hover:shadow-cyan-950/40 relative overflow-hidden group"
    >
      {/* Top Banner & Header */}
      <div className="flex flex-col gap-2.5 min-h-0 flex-1">
        <div className="flex items-start justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <span
              className="p-1.5 rounded-lg border flex items-center justify-center"
              style={{ backgroundColor: catMeta.bg, borderColor: catMeta.border, color: catMeta.color }}
            >
              <CatIcon className="w-3.5 h-3.5" />
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-cyan-200 uppercase tracking-wider">
                {project.category}
              </span>
              <span className="text-[10px] text-gray-400 font-mono">
                Jurisdiction: <strong className="text-white">Mesa County</strong>
              </span>
            </div>
          </div>

          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap border shrink-0"
            style={{ backgroundColor: statusMeta.bg, color: statusMeta.text, borderColor: statusMeta.border }}
          >
            {project.status}
          </span>
        </div>

        {/* Project Name & Location */}
        <div className="shrink-0">
          <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-cyan-300 transition-colors leading-snug line-clamp-2">
            {project.projectName}
          </h3>
          {project.location && (
            <div className="flex items-center gap-1.5 text-xs text-gray-300 mt-1">
              <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">{project.location}</span>
            </div>
          )}
        </div>

        {/* Project Scope / Summary */}
        {project.summary && (
          <div className="flex-1 overflow-y-auto pr-1 text-xs text-gray-200/90 leading-relaxed scrollbar-dark">
            <p>{project.summary}</p>
          </div>
        )}
      </div>

      {/* Progress Bar & Key Meta */}
      <div className="space-y-2.5 shrink-0 pt-2.5 border-t border-[#045975]">
        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold">
            <span className="text-gray-300">Phase Completion</span>
            <span className="text-cyan-300 font-mono">{pct}%</span>
          </div>
          <div className="w-full bg-[#012531] h-1.5 rounded-full overflow-hidden border border-[#045975]">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                backgroundColor: pct >= 100 ? '#34d399' : '#38bdf8',
              }}
            />
          </div>
        </div>

        {/* Target & Budget Grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-[#012531] p-1.5 px-2.5 rounded-xl border border-[#045975]">
            <span className="text-[9px] text-gray-400 uppercase font-medium block">Target Delivery</span>
            <span className="text-xs font-bold text-white flex items-center gap-1">
              <Clock className="w-3 h-3 text-cyan-400" />
              {project.targetQuarter || 'Active'}
            </span>
          </div>
          <div className="bg-[#012531] p-1.5 px-2.5 rounded-xl border border-[#045975]">
            <span className="text-[9px] text-gray-400 uppercase font-medium block">Est. Investment</span>
            <span className="text-xs font-bold text-white flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-emerald-400" />
              {project.estimatedBudget ? formatCompact(project.estimatedBudget) : '—'}
            </span>
          </div>
        </div>

        {/* Latest Milestone / Contact */}
        {project.contactName && (
          <div className="bg-[#012531] rounded-xl p-2 border border-[#045975] text-[11px] text-gray-200 truncate flex items-center gap-1.5">
            <User className="w-3 h-3 text-cyan-300 shrink-0" />
            <span className="truncate">{project.contactName}</span>
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={() => onSelect(project)}
          className="w-full py-1.5 px-3 rounded-xl bg-white/10 hover:bg-white text-white hover:text-[#023e52] text-xs font-bold transition-all flex items-center justify-center gap-1.5 border border-white/15 hover:shadow-lg"
        >
          <Eye className="w-3.5 h-3.5" />
          <span>View Full Scope & Utilities</span>
          <ArrowUpRight className="w-3.5 h-3.5 ml-auto" />
        </button>
      </div>
    </div>
  )
}

// ── Detail Modal ───────────────────────────────────────────────────────────
function ProjectDetailModal({
  project,
  onClose,
}: {
  project: InfrastructureProject | null
  onClose: () => void
}) {
  if (!project) return null

  const statusMeta = statusStyle(project.status)
  const catMeta = getCategoryMeta(project.category)
  const CatIcon = catMeta.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div
        className="rounded-2xl p-6 sm:p-8 max-w-2xl w-full border border-[#045975] shadow-2xl space-y-6 text-white max-h-[90vh] overflow-y-auto scrollbar-dark"
        style={{ backgroundColor: '#023e52' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[#045975] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="p-1.5 rounded-lg border flex items-center gap-1 text-xs font-semibold"
                style={{ backgroundColor: catMeta.bg, borderColor: catMeta.border, color: catMeta.color }}
              >
                <CatIcon className="w-3.5 h-3.5" />
                {project.category}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-900/60 border border-cyan-500/40 text-cyan-200 font-bold">
                Jurisdiction: Mesa County
              </span>
              <span
                className="text-xs px-2.5 py-0.5 rounded-full font-bold border"
                style={{ backgroundColor: statusMeta.bg, color: statusMeta.text, borderColor: statusMeta.border }}
              >
                {project.status}
              </span>
            </div>
            <h2 className="text-xl font-bold text-white mt-1 leading-snug">
              {project.projectName}
            </h2>
            {project.location && (
              <div className="flex items-center gap-1.5 text-xs text-gray-300">
                <MapPin className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>{project.location}</span>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#012531] border border-[#045975] text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-[#012531] p-3 rounded-xl border border-[#045975]">
            <span className="text-[10px] text-gray-400 uppercase font-medium">Estimated Budget</span>
            <p className="text-sm font-bold text-emerald-400 mt-0.5">
              {project.estimatedBudget ? formatCurrency(project.estimatedBudget) : '—'}
            </p>
          </div>
          <div className="bg-[#012531] p-3 rounded-xl border border-[#045975]">
            <span className="text-[10px] text-gray-400 uppercase font-medium">Target Delivery</span>
            <p className="text-sm font-bold text-white mt-0.5">{project.targetQuarter || 'Active'}</p>
          </div>
          <div className="bg-[#012531] p-3 rounded-xl border border-[#045975]">
            <span className="text-[10px] text-gray-400 uppercase font-medium">Phase Progress</span>
            <p className="text-sm font-bold text-cyan-300 mt-0.5">{project.percentComplete}%</p>
          </div>
          <div className="bg-[#012531] p-3 rounded-xl border border-[#045975]">
            <span className="text-[10px] text-gray-400 uppercase font-medium">Project Type</span>
            <p className="text-sm font-bold text-white truncate mt-0.5">{project.projectType || 'Capital Improvement'}</p>
          </div>
        </div>

        {/* Timeline Details */}
        {(project.startDate || project.finishDate) && (
          <div className="bg-[#012531] p-4 rounded-xl border border-[#045975] flex items-center justify-between flex-wrap gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span className="text-gray-400">Project Timeline:</span>
              <span className="font-bold text-white">{project.startDate || 'TBD'} — {project.finishDate || 'TBD'}</span>
            </div>
          </div>
        )}

        {/* Project Contact & Lead */}
        {(project.contactName || project.contactEmail) && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-cyan-400" />
              Contact & Lead Agency
            </h4>
            <div className="bg-[#012531] p-4 rounded-xl border border-[#045975] text-xs text-gray-200 space-y-1">
              {project.contactName && <p className="font-semibold text-white">{project.contactName}</p>}
              {project.contactEmail && (
                <p className="flex items-center gap-1.5 text-cyan-300">
                  <Mail className="w-3.5 h-3.5" />
                  <a href={`mailto:${project.contactEmail}`} className="hover:underline">{project.contactEmail}</a>
                </p>
              )}
            </div>
          </div>
        )}

        {/* Project Description */}
        {project.summary && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-cyan-300">Project Scope & Summary</h4>
            <p className="text-xs text-gray-200 leading-relaxed bg-[#012531] p-4 rounded-xl border border-[#045975]">
              {project.summary}
            </p>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-white text-[#023e52] font-bold text-xs hover:bg-gray-200 transition-colors shadow"
          >
            Close Project
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main Section ───────────────────────────────────────────────────────────
export default function InfraSection({
  rows = [],
  loading,
}: {
  rows: (InfrastructureProject | any)[]
  loading?: boolean
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [activeModalProject, setActiveModalProject] = useState<InfrastructureProject | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  const scrollRef = useRef<HTMLDivElement>(null)

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = direction === 'left' ? -380 : 380
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' })
    }
  }

  // Strictly filter rows for "Mesa County"
  const mesaCountyProjects: InfrastructureProject[] = useMemo(() => {
    return rows.filter(p => {
      const j = String(p.jurisdiction || '').trim().toLowerCase()
      return j === 'mesa county' || j.includes('mesa count')
    })
  }, [rows])

  // Extract Quarters for Filter
  const allQuarters = useMemo(() => {
    const quarters = mesaCountyProjects.map(r => r.targetQuarter || r.quarter).filter(Boolean)
    return [...new Set(quarters)].sort((a, b) => {
      const ya = a.match(/\b(20\d{2})\b/)?.[1] ?? ''
      const yb = b.match(/\b(20\d{2})\b/)?.[1] ?? ''
      if (ya !== yb) return ya.localeCompare(yb)
      return a.localeCompare(b)
    })
  }, [mesaCountyProjects])

  const { selectedYear, selectedQuarter, setSelectedQuarter, handleYearChange } =
    useSectionFilter(allQuarters)

  // Categories list
  const categoryOptions = useMemo(() => {
    const cats = new Set<string>()
    mesaCountyProjects.forEach(p => {
      if (p.category) cats.add(p.category)
    })
    return ['all', ...Array.from(cats)]
  }, [mesaCountyProjects])

  // Filtered dataset
  const filteredProjects = useMemo(() => {
    return mesaCountyProjects.filter(p => {
      // 1. Year filter
      const isYearAll = !selectedYear || selectedYear.toLowerCase() === 'all'
      if (!isYearAll) {
        const rowYear = p.year || p.targetQuarter.match(/\b(20\d{2})\b/)?.[1]
        if (rowYear && rowYear !== selectedYear) return false
      }

      // 2. Quarter filter
      const isQuarterAll = !selectedQuarter || selectedQuarter.toLowerCase() === 'all'
      if (!isQuarterAll) {
        if (!p.targetQuarter.toLowerCase().includes(selectedQuarter.toLowerCase())) return false
      }

      // 3. Category filter
      if (selectedCategory !== 'all' && p.category !== selectedCategory) {
        return false
      }

      // 4. Status filter
      if (selectedStatus !== 'all') {
        const s = p.status.toLowerCase()
        if (selectedStatus === 'design' && !s.includes('design')) return false
        if (selectedStatus === 'bid' && !s.includes('bid')) return false
        if (selectedStatus === 'active' && !s.includes('active') && !s.includes('construct')) return false
      }

      // 5. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const matchName = p.projectName.toLowerCase().includes(q)
        const matchSum = p.summary.toLowerCase().includes(q)
        const matchLoc = p.location.toLowerCase().includes(q)
        const matchCat = p.category.toLowerCase().includes(q)
        const matchContact = (p.contactName || '').toLowerCase().includes(q)
        if (!matchName && !matchSum && !matchLoc && !matchCat && !matchContact) return false
      }

      return true
    })
  }, [mesaCountyProjects, selectedYear, selectedQuarter, selectedCategory, selectedStatus, searchQuery])

  // Overall statistics for Top KPI summary
  const stats = useMemo(() => {
    const totalCount = filteredProjects.length
    const totalBudget = filteredProjects.reduce((acc, p) => acc + (p.estimatedBudget || 0), 0)
    const inDesign = filteredProjects.filter(p => p.status.toLowerCase().includes('design')).length
    const outForBid = filteredProjects.filter(p => p.status.toLowerCase().includes('bid')).length
    const avgProgress = totalCount > 0
      ? Math.round(filteredProjects.reduce((acc, p) => acc + p.percentComplete, 0) / totalCount)
      : 0

    return { totalCount, totalBudget, inDesign, outForBid, avgProgress }
  }, [filteredProjects])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-3 rounded-2xl border border-dashed border-[#045975] text-gray-300" style={{ backgroundColor: CARD_BG }}>
        <Loader2 className="w-7 h-7 animate-spin text-cyan-400" />
        <p className="text-xs font-semibold">Loading Mesa County utility mapping projects from Supabase...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 text-white">
      {/* Top Filter Bar (Quarter & Year) */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        {allQuarters.length > 0 && (
          <QuarterFilter
            allQuarters={allQuarters}
            selectedYear={selectedYear}
            selectedQuarter={selectedQuarter}
            onYearChange={handleYearChange}
            onQuarterChange={setSelectedQuarter}
            label="Target Delivery:"
          />
        )}

        {/* View Mode Toggle */}
        <div className="bg-[#012531] border border-[#045975] p-1 rounded-xl flex items-center gap-1 ml-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              viewMode === 'grid' ? 'bg-white text-[#023e52] font-bold shadow' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Gallery Showcase</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${
              viewMode === 'table' ? 'bg-white text-[#023e52] font-bold shadow' : 'text-gray-300 hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Matrix Table</span>
          </button>
        </div>
      </div>

      {/* Hero Overview KPI Cards (Mesa County Infrastructure) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="rounded-xl p-4 border border-[#045975] shadow-lg flex flex-col justify-between" style={{ backgroundColor: CARD_BG }}>
          <div className="flex items-center justify-between text-gray-300 text-xs font-medium">
            <span>Mesa County Projects</span>
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-white">{stats.totalCount}</span>
            <span className="text-[10px] text-cyan-200/80 block mt-0.5">Jurisdiction: Mesa County</span>
          </div>
        </div>

        <div className="rounded-xl p-4 border border-[#045975] shadow-lg flex flex-col justify-between" style={{ backgroundColor: CARD_BG }}>
          <div className="flex items-center justify-between text-gray-300 text-xs font-medium">
            <span>Capital Investment</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-white">{formatCompact(stats.totalBudget)}</span>
            <span className="text-[10px] text-cyan-200/80 block mt-0.5">Total programmed budget</span>
          </div>
        </div>

        <div className="rounded-xl p-4 border border-[#045975] shadow-lg flex flex-col justify-between" style={{ backgroundColor: CARD_BG }}>
          <div className="flex items-center justify-between text-gray-300 text-xs font-medium">
            <span>In Design</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-white">{stats.inDesign}</span>
            <span className="text-[10px] text-amber-200/80 block mt-0.5">Engineering & design phase</span>
          </div>
        </div>

        <div className="rounded-xl p-4 border border-[#045975] shadow-lg flex flex-col justify-between" style={{ backgroundColor: CARD_BG }}>
          <div className="flex items-center justify-between text-gray-300 text-xs font-medium">
            <span>Out for Bid</span>
            <Truck className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold text-white">{stats.outForBid}</span>
            <span className="text-[10px] text-blue-200/80 block mt-0.5">Procurement / bidding</span>
          </div>
        </div>
      </div>

      {/* Search & Secondary Filter Toolbar */}
      <div className="rounded-2xl p-4 border border-[#045975] shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3" style={{ backgroundColor: CARD_BG }}>
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search projects, contacts, or utilities..."
            className="w-full bg-[#012531] border border-[#045975] rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category & Status Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-[#012531] border border-[#045975] px-3 py-1.5 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-gray-400 font-medium">Sector:</span>
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="bg-transparent text-white font-semibold focus:outline-none cursor-pointer text-xs"
            >
              <option value="all" className="bg-[#023e52] text-white">All Sectors</option>
              {categoryOptions.filter(c => c !== 'all').map(c => (
                <option key={c} value={c} className="bg-[#023e52] text-white">{c}</option>
              ))}
            </select>
          </div>

          {(selectedCategory !== 'all' || selectedStatus !== 'all' || searchQuery) && (
            <button
              onClick={() => {
                setSelectedCategory('all')
                setSelectedStatus('all')
                setSearchQuery('')
              }}
              className="text-xs text-cyan-300 hover:text-white font-semibold underline px-1"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 rounded-2xl border border-dashed border-[#045975] text-gray-300 text-center px-4" style={{ backgroundColor: CARD_BG }}>
          <HardHat className="w-8 h-8 text-cyan-400/50" />
          <div>
            <p className="text-sm font-bold text-white">No Mesa County infrastructure projects found</p>
            <p className="text-xs text-gray-400 mt-0.5">Try adjusting your filters.</p>
          </div>
          <button
            onClick={() => {
              handleYearChange('all')
              setSelectedQuarter('all')
              setSelectedCategory('all')
              setSelectedStatus('all')
              setSearchQuery('')
            }}
            className="text-xs px-4 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow"
          >
            Show All Mesa County Projects ({mesaCountyProjects.length})
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Horizontal Scrolling Gallery Showcase */
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-cyan-300">
                Mesa County Projects Gallery ({filteredProjects.length})
              </span>
              <span className="text-[11px] text-gray-400 hidden sm:inline">
                • Scroll horizontally or use navigation arrows
              </span>
            </div>

            {/* Scroll Navigation Arrows */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleScroll('left')}
                className="p-1.5 rounded-lg bg-[#012531] border border-[#045975] text-gray-300 hover:text-white hover:border-cyan-400 transition-all shadow"
                title="Scroll Left"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleScroll('right')}
                className="p-1.5 rounded-lg bg-[#012531] border border-[#045975] text-gray-300 hover:text-white hover:border-cyan-400 transition-all shadow"
                title="Scroll Right"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Scrolling Container */}
          <div
            ref={scrollRef}
            className="w-full flex gap-5 overflow-x-auto pb-5 pt-1 snap-x snap-mandatory scrollbar-dark scroll-smooth"
          >
            {filteredProjects.map(project => (
              <ProjectCard
                key={project.id}
                project={project}
                onSelect={setActiveModalProject}
              />
            ))}
          </div>
        </div>
      ) : (
        /* Detailed Matrix Table */
        <div className="rounded-2xl border border-[#045975] overflow-hidden shadow-xl" style={{ backgroundColor: CARD_BG }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-200">
              <thead className="bg-[#012531] text-cyan-300 uppercase tracking-wider font-bold text-[11px] border-b border-[#045975]">
                <tr>
                  <th className="py-3.5 px-4">Project Name</th>
                  <th className="py-3.5 px-4">Sector / Asset</th>
                  <th className="py-3.5 px-4">Jurisdiction</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Timeline</th>
                  <th className="py-3.5 px-4">Contact</th>
                  <th className="py-3.5 px-4 text-right">Budget</th>
                  <th className="py-3.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#045975]/60">
                {filteredProjects.map(project => {
                  const statusMeta = statusStyle(project.status)
                  const catMeta = getCategoryMeta(project.category)
                  const CatIcon = catMeta.icon

                  return (
                    <tr key={project.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-semibold text-white">
                        <span className="hover:text-cyan-300 cursor-pointer" onClick={() => setActiveModalProject(project)}>
                          {project.projectName}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium" style={{ backgroundColor: catMeta.bg, color: catMeta.color }}>
                          <CatIcon className="w-3.5 h-3.5" />
                          {project.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-cyan-200">
                        {project.jurisdiction}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="px-2.5 py-0.5 rounded-full text-[11px] font-bold border"
                          style={{ backgroundColor: statusMeta.bg, color: statusMeta.text, borderColor: statusMeta.border }}
                        >
                          {project.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {project.startDate && project.finishDate ? `${project.startDate} to ${project.finishDate}` : project.targetQuarter}
                      </td>
                      <td className="py-3 px-4 text-cyan-200">
                        {project.contactName || '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                        {project.estimatedBudget ? formatCurrency(project.estimatedBudget) : '—'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => setActiveModalProject(project)}
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white text-white hover:text-[#023e52] transition-colors"
                          title="View Details"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Project Detail Modal */}
      <ProjectDetailModal
        project={activeModalProject}
        onClose={() => setActiveModalProject(null)}
      />
    </div>
  )
}
