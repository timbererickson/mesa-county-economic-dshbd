import type { MonthlyRecord, TaxStreamData, QuarterlyFiscalAggregate } from './fiscalData2025'

export const FISCAL_YEAR_2026 = '2026'

// 1. USE TAX 2026 (Report Total YTD Sep: $2,393,433.05)
const useTaxMonthly2026: MonthlyRecord[] = [
  { month: 'January', monthShort: 'Jan', quarter: 'Q1', amount: 3310.81 },
  { month: 'February', monthShort: 'Feb', quarter: 'Q1', amount: 647623.04 },
  { month: 'March', monthShort: 'Mar', quarter: 'Q1', amount: -60733.68 }, // Accounting adjustment per GL report
  { month: 'April', monthShort: 'Apr', quarter: 'Q2', amount: 322559.02 },
  { month: 'May', monthShort: 'May', quarter: 'Q2', amount: 380118.68 },
  { month: 'June', monthShort: 'Jun', quarter: 'Q2', amount: 326724.84 },
  { month: 'July', monthShort: 'Jul', quarter: 'Q3', amount: 385820.73 },
  { month: 'August', monthShort: 'Aug', quarter: 'Q3', amount: 388009.61 },
  { month: 'September', monthShort: 'Sep', quarter: 'Q3', amount: 0.00 },
]

// 2. PROPERTY TAX 2026 (Report Total YTD Sep: $30,530,485.55)
const propertyTaxMonthly2026: MonthlyRecord[] = [
  { month: 'January', monthShort: 'Jan', quarter: 'Q1', amount: 281057.50 },
  { month: 'February', monthShort: 'Feb', quarter: 'Q1', amount: 8587434.93 },
  { month: 'March', monthShort: 'Mar', quarter: 'Q1', amount: 3761105.70 },
  { month: 'April', monthShort: 'Apr', quarter: 'Q2', amount: 6667952.65 },
  { month: 'May', monthShort: 'May', quarter: 'Q2', amount: 3449780.69 },
  { month: 'June', monthShort: 'Jun', quarter: 'Q2', amount: 7010221.96 },
  { month: 'July', monthShort: 'Jul', quarter: 'Q3', amount: 464080.86 },
  { month: 'August', monthShort: 'Aug', quarter: 'Q3', amount: 308851.26 },
  { month: 'September', monthShort: 'Sep', quarter: 'Q3', amount: 0.00 },
]

// 3. SALES TAX 2026 (Report Total YTD Sep: $38,427,692.87)
const salesTaxMonthly2026: MonthlyRecord[] = [
  { month: 'January', monthShort: 'Jan', quarter: 'Q1', amount: 18.97 },
  { month: 'February', monthShort: 'Feb', quarter: 'Q1', amount: 6208077.68 },
  { month: 'March', monthShort: 'Mar', quarter: 'Q1', amount: 4225811.28 },
  { month: 'April', monthShort: 'Apr', quarter: 'Q2', amount: 5094150.73 },
  { month: 'May', monthShort: 'May', quarter: 'Q2', amount: 5730245.21 },
  { month: 'June', monthShort: 'Jun', quarter: 'Q2', amount: 5554391.94 },
  { month: 'July', monthShort: 'Jul', quarter: 'Q3', amount: 5588261.44 },
  { month: 'August', monthShort: 'Aug', quarter: 'Q3', amount: 6025301.32 },
  { month: 'September', monthShort: 'Sep', quarter: 'Q3', amount: 1434.30 },
]

function calcQuarters2026(records: MonthlyRecord[]) {
  const q = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }
  records.forEach(r => {
    q[r.quarter] += r.amount
  })
  return {
    Q1: Math.round(q.Q1 * 100) / 100,
    Q2: Math.round(q.Q2 * 100) / 100,
    Q3: Math.round(q.Q3 * 100) / 100,
    Q4: 0,
  }
}

export const USE_TAX_DATA_2026: TaxStreamData = {
  id: 'use',
  name: 'Use Tax',
  shortName: 'Use Tax',
  description: 'Taxes on taxable goods/services stored, used, or consumed in Mesa County (FY 2026 Sep YTD).',
  color: '#38bdf8', // Cyan
  grandTotal: 2393433.05,
  monthlyTotals: useTaxMonthly2026,
  quarterlyTotals: calcQuarters2026(useTaxMonthly2026),
}

export const PROPERTY_TAX_DATA_2026: TaxStreamData = {
  id: 'property',
  name: 'Property Tax',
  shortName: 'Property Tax',
  description: 'Real estate and personal property tax revenues supporting General Fund (FY 2026 Sep YTD).',
  color: '#e4808c', // Pink/Coral
  grandTotal: 30530485.55,
  monthlyTotals: propertyTaxMonthly2026,
  quarterlyTotals: calcQuarters2026(propertyTaxMonthly2026),
}

export const SALES_TAX_DATA_2026: TaxStreamData = {
  id: 'sales',
  name: 'Sales Tax',
  shortName: 'Sales Tax',
  description: 'County-wide retail sales tax collections (FY 2026 Sep YTD).',
  color: '#023e52', // Teal / Primary
  grandTotal: 38427692.87,
  monthlyTotals: salesTaxMonthly2026,
  quarterlyTotals: calcQuarters2026(salesTaxMonthly2026),
}

export const ALL_TAX_STREAMS_2026 = [
  SALES_TAX_DATA_2026,
  PROPERTY_TAX_DATA_2026,
  USE_TAX_DATA_2026,
]

export const QUARTERLY_FISCAL_AGGREGATES_2026: QuarterlyFiscalAggregate[] = (['Q1', 'Q2', 'Q3', 'Q4'] as const).map(q => {
  const sales = SALES_TAX_DATA_2026.quarterlyTotals[q]
  const property = PROPERTY_TAX_DATA_2026.quarterlyTotals[q]
  const use = USE_TAX_DATA_2026.quarterlyTotals[q]
  const monthsMap = {
    Q1: 'Jan – Mar',
    Q2: 'Apr – Jun',
    Q3: 'Jul – Sep',
    Q4: 'Oct – Dec (Pending)',
  }
  return {
    quarter: q,
    label: `${q} 2026`,
    monthsLabel: monthsMap[q],
    salesTax: sales,
    propertyTax: property,
    useTax: use,
    total: Math.round((sales + property + use) * 100) / 100,
  }
})

export const GRAND_TOTAL_FISCAL_COLLECTIONS_2026 = 
  SALES_TAX_DATA_2026.grandTotal + PROPERTY_TAX_DATA_2026.grandTotal + USE_TAX_DATA_2026.grandTotal
