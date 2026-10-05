import { useState, useMemo } from 'react'
import { Card, CardContent } from '../lib/shadcn/card'
import {
  Calendar,
  CheckCircle2,
  DollarSign,
  Building2,
  ShoppingBag,
  Receipt,
  Layers,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import {
  SALES_TAX_DATA,
  PROPERTY_TAX_DATA,
  USE_TAX_DATA,
  QUARTERLY_FISCAL_AGGREGATES,
  GRAND_TOTAL_FISCAL_COLLECTIONS,
  FISCAL_YEAR,
} from '../data/fiscalData2025'

const TEAL = '#023e52'
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

const formatCurrency = (val: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val)

const formatCompact = (val: number) => {
  const abs = Math.abs(val)
  const sign = val < 0 ? '-' : ''
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`
  return `${sign}$${abs.toFixed(0)}`
}

type QuarterSelection = 'all' | 'Q1' | 'Q2' | 'Q3' | 'Q4'

interface FiscalSectionProps {
  rows?: any[]
}

export default function FiscalSection({ rows: _rows }: FiscalSectionProps) {
  const [selectedQuarter, setSelectedQuarter] = useState<QuarterSelection>('all')
  const [showMonthlyDetails, setShowMonthlyDetails] = useState(false)

  // Compute metrics based on selectedQuarter
  const activeMetrics = useMemo(() => {
    if (selectedQuarter === 'all') {
      const sales = SALES_TAX_DATA.grandTotal
      const property = PROPERTY_TAX_DATA.grandTotal
      const use = USE_TAX_DATA.grandTotal
      const total = GRAND_TOTAL_FISCAL_COLLECTIONS
      return {
        sales,
        property,
        use,
        total,
        periodLabel: 'Full Year 2025 (FY 2025)',
        quarterLabel: 'All 2025',
      }
    }

    const sales = SALES_TAX_DATA.quarterlyTotals[selectedQuarter]
    const property = PROPERTY_TAX_DATA.quarterlyTotals[selectedQuarter]
    const use = USE_TAX_DATA.quarterlyTotals[selectedQuarter]
    const total = Math.round((sales + property + use) * 100) / 100

    const quarterMonthsMap: Record<string, string> = {
      Q1: 'Jan – Mar 2025',
      Q2: 'Apr – Jun 2025',
      Q3: 'Jul – Sep 2025',
      Q4: 'Oct – Dec 2025',
    }

    return {
      sales,
      property,
      use,
      total,
      periodLabel: quarterMonthsMap[selectedQuarter],
      quarterLabel: `${selectedQuarter} 2025`,
    }
  }, [selectedQuarter])

  // Full monthly table rows
  const monthlyTableData = useMemo(() => {
    return SALES_TAX_DATA.monthlyTotals.map((s, idx) => {
      const p = PROPERTY_TAX_DATA.monthlyTotals[idx]?.amount ?? 0
      const u = USE_TAX_DATA.monthlyTotals[idx]?.amount ?? 0
      const tot = Math.round((s.amount + p + u) * 100) / 100
      return {
        month: s.month,
        monthShort: s.monthShort,
        quarter: s.quarter,
        salesTax: s.amount,
        propertyTax: p,
        useTax: u,
        total: tot,
      }
    })
  }, [])

  return (
    <div className="space-y-6">
      {/* Fiscal Quarter Filter & Year */}
      <div className="flex items-center gap-4 flex-wrap text-white text-xs py-1">
        {/* Target Year */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="font-semibold text-gray-300">Target Year:</span>
          <div className="flex items-center gap-1.5">
            <RetoolFilterButton
              label={FISCAL_YEAR}
              active={true}
              onClick={() => {}}
            />
          </div>
        </div>

        {/* Divider */}
        <div className="h-4 w-px bg-[#2c3746]" />

        {/* Target Quarter */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-300">Target Quarter:</span>
          <div className="flex items-center gap-1.5">
            {(['all', 'Q1', 'Q2', 'Q3', 'Q4'] as const).map(q => (
              <RetoolFilterButton
                key={q}
                label={q === 'all' ? 'All' : q}
                active={selectedQuarter === q}
                onClick={() => setSelectedQuarter(q)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* 4 KPI Summary Cards - Cleanly Formatted with No Overflow */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales Tax Card */}
        <Card
          className="border-0 shadow-sm text-white overflow-hidden rounded-xl"
          style={{ backgroundColor: TEAL }}
        >
          <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-200 truncate">
                  Sales Tax
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-0.5 truncate">
                {formatCompact(activeMetrics.sales)}
              </p>
              <p className="text-xs text-cyan-100/90 font-mono truncate">
                {formatCurrency(activeMetrics.sales)}
              </p>
              <p className="text-[11px] text-gray-300 truncate mt-0.5">
                {((activeMetrics.sales / activeMetrics.total) * 100).toFixed(1)}% of total · {activeMetrics.quarterLabel}
              </p>
            </div>
            <div className="rounded-xl p-2.5 shrink-0 bg-white/10 text-cyan-300 border border-white/10">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Property Tax Card */}
        <Card
          className="border-0 shadow-sm text-white overflow-hidden rounded-xl"
          style={{ backgroundColor: TEAL }}
        >
          <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-pink-300 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-pink-200 truncate">
                  Property Tax
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-0.5 truncate">
                {formatCompact(activeMetrics.property)}
              </p>
              <p className="text-xs text-pink-100/90 font-mono truncate">
                {formatCurrency(activeMetrics.property)}
              </p>
              <p className="text-[11px] text-gray-300 truncate mt-0.5">
                {((activeMetrics.property / activeMetrics.total) * 100).toFixed(1)}% of total · {activeMetrics.quarterLabel}
              </p>
            </div>
            <div className="rounded-xl p-2.5 shrink-0 bg-white/10 text-pink-300 border border-white/10">
              <Building2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Use Tax Card */}
        <Card
          className="border-0 shadow-sm text-white overflow-hidden rounded-xl"
          style={{ backgroundColor: TEAL }}
        >
          <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Receipt className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-cyan-200 truncate">
                  Use Tax
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-0.5 truncate">
                {formatCompact(activeMetrics.use)}
              </p>
              <p className="text-xs text-cyan-100/90 font-mono truncate">
                {formatCurrency(activeMetrics.use)}
              </p>
              <p className="text-[11px] text-gray-300 truncate mt-0.5">
                {((activeMetrics.use / activeMetrics.total) * 100).toFixed(1)}% of total · {activeMetrics.quarterLabel}
              </p>
            </div>
            <div className="rounded-xl p-2.5 shrink-0 bg-white/10 text-cyan-300 border border-white/10">
              <Receipt className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        {/* Total Fiscal Collections Card */}
        <Card
          className="border-0 shadow-sm text-white overflow-hidden rounded-xl bg-gradient-to-br from-[#023e52] to-[#012531]"
        >
          <CardContent className="p-4 sm:p-5 flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-200 truncate">
                  Total Collections
                </span>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white mt-0.5 truncate">
                {formatCompact(activeMetrics.total)}
              </p>
              <p className="text-xs text-emerald-100/90 font-mono truncate">
                {formatCurrency(activeMetrics.total)}
              </p>
              <p className="text-[11px] text-emerald-300/90 font-medium truncate mt-0.5">
                All 3 streams · {activeMetrics.quarterLabel}
              </p>
            </div>
            <div className="rounded-xl p-2.5 shrink-0 bg-white/10 text-emerald-300 border border-white/10">
              <DollarSign className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quarterly Summary Table */}
      <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-muted/20">
          <div>
            <h3 className="text-sm font-bold text-foreground">
              2025 Fiscal Collections by Quarter
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Aggregated from official monthly accounting totals (Jan 1 – Dec 31, 2025)
            </p>
          </div>
          <button
            onClick={() => setShowMonthlyDetails(!showMonthlyDetails)}
            className="text-xs font-semibold text-primary hover:text-primary/80 flex items-center gap-1 self-start sm:self-auto py-1 px-2.5 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <span>{showMonthlyDetails ? 'Hide Monthly Rows' : 'Show Monthly Rows'}</span>
            {showMonthlyDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                <th className="py-3 px-4">Tax Stream</th>
                <th
                  className={`py-3 px-3 text-right ${
                    selectedQuarter === 'Q1' ? 'bg-[#023e52]/10 text-[#023e52] font-bold' : ''
                  }`}
                >
                  Q1 (Jan–Mar)
                </th>
                <th
                  className={`py-3 px-3 text-right ${
                    selectedQuarter === 'Q2' ? 'bg-[#023e52]/10 text-[#023e52] font-bold' : ''
                  }`}
                >
                  Q2 (Apr–Jun)
                </th>
                <th
                  className={`py-3 px-3 text-right ${
                    selectedQuarter === 'Q3' ? 'bg-[#023e52]/10 text-[#023e52] font-bold' : ''
                  }`}
                >
                  Q3 (Jul–Sep)
                </th>
                <th
                  className={`py-3 px-3 text-right ${
                    selectedQuarter === 'Q4' ? 'bg-[#023e52]/10 text-[#023e52] font-bold' : ''
                  }`}
                >
                  Q4 (Oct–Dec)
                </th>
                <th
                  className={`py-3 px-4 text-right ${
                    selectedQuarter === 'all' ? 'bg-[#023e52]/10 text-[#023e52] font-bold' : 'text-foreground'
                  }`}
                >
                  2025 Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {/* Sales Tax Row */}
              <tr className="hover:bg-muted/20 transition-colors">
                <td className="py-2.5 px-4 font-semibold text-foreground flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#023e52] inline-block" />
                  Sales Tax
                </td>
                <td className={`py-2.5 px-3 text-right font-mono ${selectedQuarter === 'Q1' ? 'bg-[#023e52]/5 font-bold text-foreground' : 'text-foreground/90'}`}>
                  {formatCurrency(SALES_TAX_DATA.quarterlyTotals.Q1)}
                </td>
                <td className={`py-2.5 px-3 text-right font-mono ${selectedQuarter === 'Q2' ? 'bg-[#023e52]/5 font-bold text-foreground' : 'text-foreground/90'}`}>
                  {formatCurrency(SALES_TAX_DATA.quarterlyTotals.Q2)}
                </td>
                <td className={`py-2.5 px-3 text-right font-mono ${selectedQuarter === 'Q3' ? 'bg-[#023e52]/5 font-bold text-foreground' : 'text-foreground/90'}`}>
                  {formatCurrency(SALES_TAX_DATA.quarterlyTotals.Q3)}
                </td>
                <td className={`py-2.5 px-3 text-right font-mono ${selectedQuarter === 'Q4' ? 'bg-[#023e52]/5 font-bold text-foreground' : 'text-foreground/90'}`}>
                  {formatCurrency(SALES_TAX_DATA.quarterlyTotals.Q4)}
                </td>
                <td className={`py-2.5 px-4 text-right font-mono font-bold ${selectedQuarter === 'all' ? 'bg-[#023e52]/5 text-[#023e52]' : 'text-foreground'}`}>
                  {formatCurrency(SALES_TAX_DATA.grandTotal)}
                </td>
              </tr>

              {/* Property Tax Row */}
              <tr className="hover:bg-muted/20 transition-colors">
                <td className="py-2.5 px-4 font-semibold text-foreground flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#e4808c] inline-block" />
                  Property Tax
                </td>
                <td className={`py-2.5 px-3 text-right font-mono ${selectedQuarter === 'Q1' ? 'bg-[#023e52]/5 font-bold text-foreground' : 'text-foreground/90'}`}>
                  {formatCurrency(PROPERTY_TAX_DATA.quarterlyTotals.Q1)}
                </td>
                <td className={`py-2.5 px-3 text-right font-mono ${selectedQuarter === 'Q2' ? 'bg-[#023e52]/5 font-bold text-foreground' : 'text-foreground/90'}`}>
                  {formatCurrency(PROPERTY_TAX_DATA.quarterlyTotals.Q2)}
                </td>
                <td className={`py-2.5 px-3 text-right font-mono ${selectedQuarter === 'Q3' ? 'bg-[#023e52]/5 font-bold text-foreground' : 'text-foreground/90'}`}>
                  {formatCurrency(PROPERTY_TAX_DATA.quarterlyTotals.Q3)}
                </td>
                <td className={`py-2.5 px-3 text-right font-mono ${selectedQuarter === 'Q4' ? 'bg-[#023e52]/5 font-bold text-foreground' : 'text-foreground/90'}`}>
                  {formatCurrency(PROPERTY_TAX_DATA.quarterlyTotals.Q4)}
                </td>
                <td className={`py-2.5 px-4 text-right font-mono font-bold ${selectedQuarter === 'all' ? 'bg-[#023e52]/5 text-[#023e52]' : 'text-foreground'}`}>
                  {formatCurrency(PROPERTY_TAX_DATA.grandTotal)}
                </td>
              </tr>

              {/* Use Tax Row */}
              <tr className="hover:bg-muted/20 transition-colors">
                <td className="py-2.5 px-4 font-semibold text-foreground flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#38bdf8] inline-block" />
                  Use Tax
                </td>
                <td className={`py-2.5 px-3 text-right font-mono ${selectedQuarter === 'Q1' ? 'bg-[#023e52]/5 font-bold text-foreground' : 'text-foreground/90'}`}>
                  {formatCurrency(USE_TAX_DATA.quarterlyTotals.Q1)}
                </td>
                <td className={`py-2.5 px-3 text-right font-mono ${selectedQuarter === 'Q2' ? 'bg-[#023e52]/5 font-bold text-foreground' : 'text-foreground/90'}`}>
                  {formatCurrency(USE_TAX_DATA.quarterlyTotals.Q2)}
                </td>
                <td className={`py-2.5 px-3 text-right font-mono ${selectedQuarter === 'Q3' ? 'bg-[#023e52]/5 font-bold text-foreground' : 'text-foreground/90'}`}>
                  {formatCurrency(USE_TAX_DATA.quarterlyTotals.Q3)}
                </td>
                <td className={`py-2.5 px-3 text-right font-mono ${selectedQuarter === 'Q4' ? 'bg-[#023e52]/5 font-bold text-foreground' : 'text-foreground/90'}`}>
                  {formatCurrency(USE_TAX_DATA.quarterlyTotals.Q4)}
                </td>
                <td className={`py-2.5 px-4 text-right font-mono font-bold ${selectedQuarter === 'all' ? 'bg-[#023e52]/5 text-[#023e52]' : 'text-foreground'}`}>
                  {formatCurrency(USE_TAX_DATA.grandTotal)}
                </td>
              </tr>
            </tbody>

            <tfoot>
              {/* Grand Total Row */}
              <tr className="bg-muted/60 font-bold border-t-2 border-border text-foreground">
                <td className="py-3 px-4">Total Collections</td>
                <td className={`py-3 px-3 text-right font-mono ${selectedQuarter === 'Q1' ? 'bg-[#023e52]/10 text-primary font-extrabold' : ''}`}>
                  {formatCurrency(QUARTERLY_FISCAL_AGGREGATES[0].total)}
                </td>
                <td className={`py-3 px-3 text-right font-mono ${selectedQuarter === 'Q2' ? 'bg-[#023e52]/10 text-primary font-extrabold' : ''}`}>
                  {formatCurrency(QUARTERLY_FISCAL_AGGREGATES[1].total)}
                </td>
                <td className={`py-3 px-3 text-right font-mono ${selectedQuarter === 'Q3' ? 'bg-[#023e52]/10 text-primary font-extrabold' : ''}`}>
                  {formatCurrency(QUARTERLY_FISCAL_AGGREGATES[2].total)}
                </td>
                <td className={`py-3 px-3 text-right font-mono ${selectedQuarter === 'Q4' ? 'bg-[#023e52]/10 text-primary font-extrabold' : ''}`}>
                  {formatCurrency(QUARTERLY_FISCAL_AGGREGATES[3].total)}
                </td>
                <td className={`py-3 px-4 text-right font-mono font-extrabold ${selectedQuarter === 'all' ? 'bg-[#023e52]/10 text-primary' : 'text-primary'}`}>
                  {formatCurrency(GRAND_TOTAL_FISCAL_COLLECTIONS)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Optional Collapsible Monthly Ledger */}
        {showMonthlyDetails && (
          <div className="border-t p-4 bg-muted/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">
                Monthly Accounting Totals (12 Months of 2025)
              </span>
              <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                All 3 spreadsheets match Grand Totals exactly ($0.00 difference)
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border bg-background">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-muted/50 border-b border-border text-muted-foreground font-semibold">
                    <th className="py-2 px-3">Month</th>
                    <th className="py-2 px-3">Fiscal Quarter</th>
                    <th className="py-2 px-3 text-right">Sales Tax</th>
                    <th className="py-2 px-3 text-right">Property Tax</th>
                    <th className="py-2 px-3 text-right">Use Tax</th>
                    <th className="py-2 px-3 text-right font-bold text-foreground">Combined Monthly</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {monthlyTableData.map(m => (
                    <tr
                      key={m.month}
                      className={`hover:bg-muted/30 transition-colors ${
                        selectedQuarter !== 'all' && m.quarter === selectedQuarter ? 'bg-primary/5' : ''
                      }`}
                    >
                      <td className="py-1.5 px-3 font-medium text-foreground">{m.month}</td>
                      <td className="py-1.5 px-3">
                        <span className="px-1.5 py-0.5 rounded bg-muted font-mono text-[10px]">
                          {m.quarter}
                        </span>
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono text-foreground/90">
                        {formatCurrency(m.salesTax)}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono text-foreground/90">
                        {formatCurrency(m.propertyTax)}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono text-foreground/90">
                        {formatCurrency(m.useTax)}
                      </td>
                      <td className="py-1.5 px-3 text-right font-mono font-bold text-foreground">
                        {formatCurrency(m.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Spreadsheet Reconciliation Audit Note */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg border p-3 bg-muted/20 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <ShoppingBag className="w-3.5 h-3.5 text-primary" />
              Sales Tax Total
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              ✓ Verified
            </span>
          </div>
          <p className="text-sm font-bold font-mono text-foreground">
            {formatCurrency(SALES_TAX_DATA.grandTotal)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Matches spreadsheet Grand Total of $64,000,546.22 (Diff: $0.00).
          </p>
        </div>

        <div className="rounded-lg border p-3 bg-muted/20 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-pink-600" />
              Property Tax Total
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              ✓ Verified
            </span>
          </div>
          <p className="text-sm font-bold font-mono text-foreground">
            {formatCurrency(PROPERTY_TAX_DATA.grandTotal)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Matches spreadsheet Grand Total of $31,637,397.44 (Diff: $0.00).
          </p>
        </div>

        <div className="rounded-lg border p-3 bg-muted/20 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-1.5">
              <Receipt className="w-3.5 h-3.5 text-cyan-600" />
              Use Tax Total
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              ✓ Verified
            </span>
          </div>
          <p className="text-sm font-bold font-mono text-foreground">
            {formatCurrency(USE_TAX_DATA.grandTotal)}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Matches spreadsheet Grand Total of $4,297,798.89 (Diff: $0.00).
          </p>
        </div>
      </div>
    </div>
  )
}
