export interface MonthlyRecord {
  month: string
  monthShort: string
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  amount: number
}

export interface TaxStreamData {
  id: 'sales' | 'property' | 'use'
  name: string
  shortName: string
  description: string
  color: string
  grandTotal: number // Grand Total from the official spreadsheet
  monthlyTotals: MonthlyRecord[]
  quarterlyTotals: {
    Q1: number
    Q2: number
    Q3: number
    Q4: number
  }
}

export const FISCAL_YEAR = '2025'

// 1. USE TAX 2025 (Official Spreadsheet Grand Total: $4,297,798.89)
const useTaxMonthly: MonthlyRecord[] = [
  { month: 'January', monthShort: 'Jan', quarter: 'Q1', amount: 310204.85 },
  { month: 'February', monthShort: 'Feb', quarter: 'Q1', amount: 306078.65 },
  { month: 'March', monthShort: 'Mar', quarter: 'Q1', amount: 304541.01 },
  { month: 'April', monthShort: 'Apr', quarter: 'Q2', amount: 314442.41 },
  { month: 'May', monthShort: 'May', quarter: 'Q2', amount: 5460.77 },
  { month: 'June', monthShort: 'Jun', quarter: 'Q2', amount: 2966.29 },
  { month: 'July', monthShort: 'Jul', quarter: 'Q3', amount: 2278.62 },
  { month: 'August', monthShort: 'Aug', quarter: 'Q3', amount: 3706.23 },
  { month: 'September', monthShort: 'Sep', quarter: 'Q3', amount: 3828.88 },
  { month: 'October', monthShort: 'Oct', quarter: 'Q4', amount: 4154.65 },
  { month: 'November', monthShort: 'Nov', quarter: 'Q4', amount: 3571.98 },
  { month: 'December', monthShort: 'Dec', quarter: 'Q4', amount: 3036564.55 },
]

// 2. PROPERTY TAX 2025 (Official Spreadsheet Grand Total: $31,637,397.44)
const propertyTaxMonthly: MonthlyRecord[] = [
  { month: 'January', monthShort: 'Jan', quarter: 'Q1', amount: 1717175.98 },
  { month: 'February', monthShort: 'Feb', quarter: 'Q1', amount: 9481815.75 },
  { month: 'March', monthShort: 'Mar', quarter: 'Q1', amount: 2242420.91 },
  { month: 'April', monthShort: 'Apr', quarter: 'Q2', amount: 0.0 }, // No April disbursement cycle
  { month: 'May', monthShort: 'May', quarter: 'Q2', amount: 7087460.70 },
  { month: 'June', monthShort: 'Jun', quarter: 'Q2', amount: 3079434.24 },
  { month: 'July', monthShort: 'Jul', quarter: 'Q3', amount: 6929084.33 },
  { month: 'August', monthShort: 'Aug', quarter: 'Q3', amount: 496580.25 },
  { month: 'September', monthShort: 'Sep', quarter: 'Q3', amount: 282083.38 },
  { month: 'October', monthShort: 'Oct', quarter: 'Q4', amount: 74385.03 },
  { month: 'November', monthShort: 'Nov', quarter: 'Q4', amount: 249256.46 },
  { month: 'December', monthShort: 'Dec', quarter: 'Q4', amount: -2299.59 }, // Net year-end accounting adjustment
]

// 3. SALES TAX 2025 (Official Spreadsheet Grand Total: $64,000,546.22)
const salesTaxMonthly: MonthlyRecord[] = [
  { month: 'January', monthShort: 'Jan', quarter: 'Q1', amount: 48713.55 },
  { month: 'February', monthShort: 'Feb', quarter: 'Q1', amount: 5760045.57 },
  { month: 'March', monthShort: 'Mar', quarter: 'Q1', amount: 4420748.82 },
  { month: 'April', monthShort: 'Apr', quarter: 'Q2', amount: 4125640.26 },
  { month: 'May', monthShort: 'May', quarter: 'Q2', amount: 5700536.85 },
  { month: 'June', monthShort: 'Jun', quarter: 'Q2', amount: 5591024.30 },
  { month: 'July', monthShort: 'Jul', quarter: 'Q3', amount: 5922108.34 },
  { month: 'August', monthShort: 'Aug', quarter: 'Q3', amount: 5943304.46 },
  { month: 'September', monthShort: 'Sep', quarter: 'Q3', amount: 6025085.98 },
  { month: 'October', monthShort: 'Oct', quarter: 'Q4', amount: 6036280.43 },
  { month: 'November', monthShort: 'Nov', quarter: 'Q4', amount: 6225038.14 },
  { month: 'December', monthShort: 'Dec', quarter: 'Q4', amount: 8202019.52 },
]

function calcQuarters(records: MonthlyRecord[]) {
  const q = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 }
  records.forEach(r => {
    q[r.quarter] += r.amount
  })
  // Round each to 2 decimal places
  return {
    Q1: Math.round(q.Q1 * 100) / 100,
    Q2: Math.round(q.Q2 * 100) / 100,
    Q3: Math.round(q.Q3 * 100) / 100,
    Q4: Math.round(q.Q4 * 100) / 100,
  }
}

export const USE_TAX_DATA: TaxStreamData = {
  id: 'use',
  name: 'Use Tax',
  shortName: 'Use Tax',
  description: 'Taxes on taxable goods/services stored, used, or consumed in Mesa County where sales tax was not collected at point of purchase.',
  color: '#38bdf8', // Cyan
  grandTotal: 4297798.89,
  monthlyTotals: useTaxMonthly,
  quarterlyTotals: calcQuarters(useTaxMonthly),
}

export const PROPERTY_TAX_DATA: TaxStreamData = {
  id: 'property',
  name: 'Property Tax',
  shortName: 'Property Tax',
  description: 'Real estate and personal property tax revenues supporting General Fund, Human Services, Road & Bridge, and special districts.',
  color: '#e4808c', // Pink/Coral
  grandTotal: 31637397.44,
  monthlyTotals: propertyTaxMonthly,
  quarterlyTotals: calcQuarters(propertyTaxMonthly),
}

export const SALES_TAX_DATA: TaxStreamData = {
  id: 'sales',
  name: 'Sales Tax',
  shortName: 'Sales Tax',
  description: 'County-wide retail sales tax collections (General Fund, Public Safety Sales Tax, Capital projects, and districts).',
  color: '#023e52', // Teal / Primary
  grandTotal: 64000546.22,
  monthlyTotals: salesTaxMonthly,
  quarterlyTotals: calcQuarters(salesTaxMonthly),
}

export const ALL_TAX_STREAMS = [
  SALES_TAX_DATA,
  PROPERTY_TAX_DATA,
  USE_TAX_DATA,
]

export interface QuarterlyFiscalAggregate {
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
  label: string
  monthsLabel: string
  salesTax: number
  propertyTax: number
  useTax: number
  total: number
}

export const QUARTERLY_FISCAL_AGGREGATES: QuarterlyFiscalAggregate[] = (['Q1', 'Q2', 'Q3', 'Q4'] as const).map(q => {
  const sales = SALES_TAX_DATA.quarterlyTotals[q]
  const property = PROPERTY_TAX_DATA.quarterlyTotals[q]
  const use = USE_TAX_DATA.quarterlyTotals[q]
  const monthsMap = {
    Q1: 'Jan – Mar',
    Q2: 'Apr – Jun',
    Q3: 'Jul – Sep',
    Q4: 'Oct – Dec',
  }
  return {
    quarter: q,
    label: `${q} 2025`,
    monthsLabel: monthsMap[q],
    salesTax: sales,
    propertyTax: property,
    useTax: use,
    total: Math.round((sales + property + use) * 100) / 100,
  }
})

export const GRAND_TOTAL_FISCAL_COLLECTIONS = 
  SALES_TAX_DATA.grandTotal + PROPERTY_TAX_DATA.grandTotal + USE_TAX_DATA.grandTotal
