import { fetchInfrastructureProjects, type InfrastructureProject } from './getInfrastructureData'

const SPREADSHEET_ID = '19ywlWoNdEEe8ePps6jzAZfjslB26elJORNVdmw4cKtw'

let cachedResult: any = null
let lastFetchTime = 0
const CACHE_DURATION = 5 * 60 * 1000

const FALLBACK_HOUSING = [
  {
    quarter: 'Q1 2026',
    year: '2026',
    medianHomePrice: 425000,
    monthsOfInventory: 3.2,
    housingPermitsIssued: 185,
    multifamilyUnits: 340,
    salesTaxCollections: 8450000,
    notes: '',
    timestamp: '1/28/2026 15:48:38',
  }
]

function parseNum(val: any): number | null {
  if (val === null || val === undefined) return null
  const n = parseFloat(String(val).replace(/[$,]/g, ''))
  return isNaN(n) ? null : n
}

function parseBudget(val: any): number | null {
  if (val === null || val === undefined) return null
  if (typeof val === 'number') return val
  const cleanStr = String(val).toLowerCase().replace(/[$,]/g, '').trim()
  const isMillion = cleanStr.includes('million') || cleanStr.endsWith('m')
  const isK = cleanStr.endsWith('k')
  
  const numericPart = cleanStr.replace(/[^0-9.]/g, '').trim()
  const num = parseFloat(numericPart)
  if (isNaN(num)) return null
  
  if (isMillion) return num * 1_000_000
  if (isK) return num * 1_000
  return num
}

function getYear(quarter: string): string {
  if (!quarter) return ''
  const match = quarter.match(/\b(20\d{2})\b/)
  return match ? match[1]! : (quarter.split(' ')[1] ?? '')
}

async function readGoogleSheet(spreadsheetId: string, sheetSpec: string | number) {
  const isGid = typeof sheetSpec === 'number' || /^\d+$/.test(String(sheetSpec))
  const queries: string[] = []

  if (isGid) {
    queries.push(`gid=${sheetSpec}`)
    queries.push(`sheet=Infrastructure%20and%20Capacity`)
    queries.push(`sheet=Infrastructure_and_Capacity`)
  } else {
    queries.push(`sheet=${encodeURIComponent(sheetSpec)}`)
    if (String(sheetSpec).includes('_')) {
      queries.push(`sheet=${encodeURIComponent(String(sheetSpec).replace(/_/g, ' '))}`)
    }
  }

  for (const q of queries) {
    try {
      const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&${q}`
      const res = await fetch(url)
      if (!res.ok) continue
      const text = await res.text()
      if (!text.includes('google.visualization.Query.setResponse')) continue

      const json = JSON.parse(text.substring(47, text.length - 2))
      const headers = json.table?.cols?.map((col: any) => col?.label || '') || []
      const rows = json.table?.rows || []

      if (rows.length === 0) continue

      return rows.map((row: any) => {
        const obj: Record<string, any> = {}
        row.c?.forEach((cell: any, idx: number) => {
          const header = headers[idx]
          if (header) obj[header] = cell ? (cell.v ?? cell.f) : null
        })
        return obj
      })
    } catch (e) {
      console.warn(`Query ${q} failed:`, e)
    }
  }

  return []
}

export default async function fetchIndicatorData() {
  const now = Date.now()

  if (cachedResult && cachedResult.infraRows?.length > 0 && (now - lastFetchTime < CACHE_DURATION)) {
    return cachedResult
  }

  try {
    const [housingData, supabaseInfraProjects] = await Promise.all([
      readGoogleSheet(SPREADSHEET_ID, 'Revenue/Housing'),
      fetchInfrastructureProjects(),
    ])

    let housingRows = housingData
      .map((r: any) => {
        const quarterVal = r['Reporting Quarter'] || r['Reporting_Quarter'] || r['Fiscal_Quarter'] || r['quarter'] || '';
        const normalizedQuarter = String(quarterVal).trim();

        return {
          quarter: normalizedQuarter,
          year: getYear(normalizedQuarter),
          medianHomePrice: parseNum(r['Median Home Price ($)']),
          monthsOfInventory: parseNum(r['Months of Inventory']),
          housingPermitsIssued: parseNum(r['Housing Permits Issued']),
          multifamilyUnits: parseNum(r['Multifamily Units Under Construction']),
          salesTaxCollections: parseNum(r['Sales Tax Collections ($)']),
          notes: r['Notes / Staff Comments'] ?? '',
          timestamp: r['Timestamp'],
        }
      })
      .filter((r: any) => r.quarter)
      .sort((a: any, b: any) => {
        if (a.year !== b.year) return a.year.localeCompare(b.year)
        return a.quarter.localeCompare(b.quarter)
      })

    let infraRows: InfrastructureProject[] = supabaseInfraProjects

    if (housingRows.length === 0) {
      housingRows = FALLBACK_HOUSING
    }

    const allYears = [
      ...housingRows.map((r: any) => r.year),
      ...infraRows.map((r: any) => r.year)
    ].filter(Boolean)

    const housingYears = [...new Set(allYears)].sort()

    const result = { housingRows, housingYears, infraRows }
    cachedResult = result
    lastFetchTime = now
    return result
  } catch (e) {
    console.warn('fetchIndicatorData failed, using fallback for housing only:', e)
    const result = {
      housingRows: FALLBACK_HOUSING,
      housingYears: ['2026'],
      infraRows: [],
    }
    cachedResult = result
    lastFetchTime = now
    return result
  }
}