const SPREADSHEET_ID = '19ywlWoNdEEe8ePps6jzAZfjslB26elJORNVdmw4cKtw'

let cachedResult: any = null
let lastFetchTime = 0
const CACHE_DURATION = 5 * 60 * 1000

function parseNum(val: any): number | null {
  if (val === null || val === undefined) return null
  const n = parseFloat(String(val).replace(/[$,]/g, ''))
  return isNaN(n) ? null : n
}

function parseBudget(val: any): number | null {
  if (!val) return null
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

async function readGoogleSheet(spreadsheetId: string, sheetName: string) {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`
  const res = await fetch(url)
  const text = await res.text()
  const json = JSON.parse(text.substring(47, text.length - 2))
  
  const headers = json.table.cols.map((col: any) => col?.label || '')
  return json.table.rows.map((row: any) => {
    const obj: Record<string, any> = {}
    row.c.forEach((cell: any, idx: number) => {
      const header = headers[idx]
      if (header) {
        obj[header] = cell ? cell.v : null
      }
    })
    return obj
  })
}

export default async function fetchIndicatorData() {
  const now = Date.now()

  if (cachedResult && (now - lastFetchTime < CACHE_DURATION)) {
    return cachedResult
  }

  const [housingData, infraData] = await Promise.all([
    readGoogleSheet(SPREADSHEET_ID, 'Revenue/Housing'),
    readGoogleSheet(SPREADSHEET_ID, 'Infrastructure_and_Capacity'),
  ])

  const housingRows = housingData
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

  const infraRows = infraData
    .filter((r: any) => r['Project Name'])
    .map((r: any) => {
      const targetVal = String(r['Target Completion Quarter'] || r['Target_Completion_Quarter'] || '').trim();

      return {
        projectName: r['Project Name'],
        category: r['Project Category'] ?? '',
        summary: r['Project Summary'] ?? '',
        status: r['Project Status'] ?? '',
        percentComplete: parseNum(r['Percent Complete (%)']) ?? 0,
        targetQuarter: targetVal,
        reportingQuarter: targetVal,
        quarter: targetVal,
        year: getYear(targetVal),
        milestones: r['Status Updates / Milestones'] ?? '',
        shovelReady: r['Shovel-Ready Land Availability Highlights'] ?? '',
        estimatedBudget: parseBudget(r['Estimated Budget ($)']),
        timestamp: r['Timestamp'],
      }
    })
    .sort((a: any, b: any) => a.projectName.localeCompare(b.projectName))

  const allYears = [
    ...housingRows.map((r: any) => r.year),
    ...infraRows.map((r: any) => r.year)
  ].filter(Boolean)

  const housingYears = [...new Set(allYears)].sort()

  const result = {
    housingRows,
    housingYears,
    infraRows,
  }

  cachedResult = result
  lastFetchTime = now

  return result
}