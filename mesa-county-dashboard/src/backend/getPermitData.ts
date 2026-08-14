const SPREADSHEET_ID = '1myZjdrEFvR0_ZoHNdFGc75IuOQcA0H1Kb7ahAmEktzU'

let cachedPermitResult: any = null
let lastPermitFetchTime = 0
const CACHE_DURATION = 5 * 60 * 1000

function quarterSort(a: string, b: string): number {
  const [qa, ya] = a.split(' ')
  const [qb, yb] = b.split(' ')
  if (ya !== yb) return parseInt(ya ?? '0') - parseInt(yb ?? '0')
  return parseInt((qa ?? 'Q0').replace('Q', '')) - parseInt((qb ?? 'Q0').replace('Q', ''))
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

export default async function fetchPermitData() {
  const now = Date.now()

  if (cachedPermitResult && (now - lastPermitFetchTime < CACHE_DURATION)) {
    return cachedPermitResult
  }

  const [quarterlyData, majorData] = await Promise.all([
    readGoogleSheet(SPREADSHEET_ID, 'Quarterly_Metrics_Summary'),
    readGoogleSheet(SPREADSHEET_ID, 'Major_Projects_Detail'),
  ])

  const quarterlyRows = quarterlyData.sort((a: any, b: any) =>
    quarterSort(a.Fiscal_Quarter, b.Fiscal_Quarter)
  )

  const majorRows = majorData
    .map((r: any) => ({
      quarter: r.Fiscal_Quarter,
      permitNumber: r.Permit_Number,
      recordType: r.Record_Type,
      recordSubtype: r.Record_Subtype,
      valuation: parseFloat(r.Valuation) || 0,
      acceptedDate: r.Accepted_Date,
      issuedDate: r.Issued_Date,
      daysToIssue:
        r.Accepted_Date && r.Issued_Date
          ? Math.round(
              (new Date(r.Issued_Date).getTime() - new Date(r.Accepted_Date).getTime()) /
                (1000 * 60 * 60 * 24) * 10
            ) / 10
          : null,
    }))
    .sort((a: any, b: any) => b.valuation - a.valuation)

  const detailedMediansByQ: Record<string, number> = {}
  const diffsByQ: Record<string, number[]> = {}

  majorRows.forEach((r: any) => {
    if (r.recordType === 'Commercial' && r.recordSubtype !== 'Multi-Family' && r.daysToIssue !== null) {
      if (!diffsByQ[r.quarter]) diffsByQ[r.quarter] = []
      diffsByQ[r.quarter].push(r.daysToIssue)
    }
  })

  Object.entries(diffsByQ).forEach(([q, diffs]) => {
    const sorted = diffs.sort((a, b) => a - b)
    const mid = Math.floor(sorted.length / 2)
    const median = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
    detailedMediansByQ[q] = median || 0
  })

  let totalCommercial = 0
  let weightedMedianSum = 0
  quarterlyRows.forEach((r: any) => {
    const permits = parseInt(r.Commercial_Permits) || 0
    const calculatedMedian = detailedMediansByQ[r.Fiscal_Quarter]
    const median = (calculatedMedian !== undefined) 
      ? calculatedMedian 
      : (parseFloat(r.Median_Commercial_Turnaround_Days) || 0)
    
    totalCommercial += permits
    weightedMedianSum += median * permits
  })
  const weightedMedianDays =
    totalCommercial > 0 ? Math.round((weightedMedianSum / totalCommercial) * 10) / 10 : 0

  const latestQuarter = quarterlyRows[quarterlyRows.length - 1]
  const currentQueueCount = latestQuarter ? parseInt(latestQuarter.Projects_In_Queue) || 0 : 0
  const currentQuarterLabel = latestQuarter?.Fiscal_Quarter ?? ''

  const totalMajorCount = majorRows.length
  const totalMajorValue = majorRows.reduce((s: number, r: any) => s + r.valuation, 0)

  const quarterStats = quarterlyRows.map((r: any) => {
    const calculatedMedian = detailedMediansByQ[r.Fiscal_Quarter]
    const median = (calculatedMedian !== undefined) 
      ? calculatedMedian 
      : (parseFloat(r.Median_Commercial_Turnaround_Days) || 0)

    return {
      quarter: r.Fiscal_Quarter,
      commercial: parseInt(r.Commercial_Permits) || 0,
      residential: parseInt(r.Residential_Permits) || 0,
      total: parseInt(r.Total_Permits) || 0,
      medianDays: median,
      queueCount: parseInt(r.Projects_In_Queue) || 0,
      majorCount: parseInt(r.Major_Projects_Count) || 0,
      majorValue: parseFloat(r.Major_Projects_Total_Value) || 0,
    }
  })

  const result = {
    weightedMedianDays,
    currentQueueCount,
    currentQuarterLabel,
    totalMajorCount,
    totalMajorValue,
    quarterStats,
    majorProjects: majorRows,
  }

  cachedPermitResult = result
  lastPermitFetchTime = now

  return result
}