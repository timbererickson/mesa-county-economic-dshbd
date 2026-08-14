const VITALITY_SHEET_ID = '1jge6iKft3BamE9tza9AxU1NtMtGKvofZHO5fTN_TgCI'

let cachedVitalityResult: any = null
let lastVitalityFetchTime = 0
const CACHE_DURATION = 5 * 60 * 1000

function parseN(val: any): number {
  if (typeof val === 'number') return val
  const n = parseFloat((val || '').toString().replace(/[$,%]/g, ''))
  return isNaN(n) ? 0 : n
}

// Standalone Google Sheets reader using Google's public JSON API
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

export default async function fetchEconomicVitality() {
  const now = Date.now()

  if (cachedVitalityResult && (now - lastVitalityFetchTime < CACHE_DURATION)) {
    return cachedVitalityResult
  }

  const [wageData, laborData, unemployedData, employedData, discouragedData, rateData, growthData] = await Promise.all([
    readGoogleSheet(VITALITY_SHEET_ID, 'Average Weekly Wage'),
    readGoogleSheet(VITALITY_SHEET_ID, 'Labor Force'),
    readGoogleSheet(VITALITY_SHEET_ID, 'Unemployed Persons'),
    readGoogleSheet(VITALITY_SHEET_ID, 'Employed Persons'),
    readGoogleSheet(VITALITY_SHEET_ID, 'U-4 Estimate - ESTIMATE NOT OFFICIAL'),
    readGoogleSheet(VITALITY_SHEET_ID, 'Unemployment Rate'),
    readGoogleSheet(VITALITY_SHEET_ID, 'Net Job Growth'),
  ])

  const monthToQ: Record<string, string> = {
    M01: 'Q1', M02: 'Q1', M03: 'Q1',
    M04: 'Q2', M05: 'Q2', M06: 'Q2',
    M07: 'Q3', M08: 'Q3', M09: 'Q3',
    M10: 'Q4', M11: 'Q4', M12: 'Q4'
  }

  const aggregateMonthly = (data: any[], valKey: string) => {
    const map: Record<string, { sum: number; count: number }> = {}
    data.forEach(r => {
      const year = r.Year
      const period = r.Period || r.Month
      const q = monthToQ[period]
      if (year && q) {
        const key = `${year} ${q}`
        if (!map[key]) map[key] = { sum: 0, count: 0 }
        map[key].sum += parseN(r[valKey])
        map[key].count += 1
      }
    })
    return map
  }

  const laborMap = aggregateMonthly(laborData, 'Civilian Labor Force')
  const employedMap = aggregateMonthly(employedData, 'Employed (derived: Labor Force − Unemployed)')
  const unemployedMap = aggregateMonthly(unemployedData, 'Unemployed (derived: Labor Force × Rate)')
  const rateMap = aggregateMonthly(rateData, 'Unemployment Rate (%)')
  const rateChangeMap = aggregateMonthly(rateData, 'Quarterly YoY Change (pts)')

  const filter2025 = (r: any) => parseInt(r.Year) >= 2025

  const wages = wageData.filter(filter2025).map((r: any) => ({
    year: r.Year,
    quarter: r.Quarter,
    value: parseN(r['Avg Weekly Wage ($)']),
    change: parseN(r['Wage Change (vs. Year Ago)']),
    percentChange: parseN(r['Wage % Change (vs. Year Ago)'])
  }))

  const discouraged = discouragedData.filter(filter2025).map((r: any) => ({
    year: r.Year,
    quarter: r.Quarter,
    value: parseN(r['ESTIMATED Discouraged Workers (Local)']),
    u3: parseN(r['Local U-3 (Actual, Grand Junction MSA)']),
    u4: parseN(r['ESTIMATED Local U-4'])
  }))

  const growth = growthData.filter(filter2025).map((r: any) => ({
    year: r.Year,
    quarter: r.Quarter,
    change: parseN(r['Employment Change (vs. Year Ago)']),
    percentChange: parseN(r['Employment % Change (vs. Year Ago)'])
  }))

  const allYears = [...new Set([
    ...wages.map(w => w.year),
    ...discouraged.map(d => d.year),
    ...growth.map(g => g.year),
    ...Object.keys(laborMap).map(k => k.split(' ')[0]!)
  ])].filter(y => parseInt(y) >= 2025).sort()

  const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
  const quarterlyData: any[] = []

  allYears.forEach(y => {
    quarters.forEach(q => {
      const key = `${y} ${q}`
      const wage = wages.find(w => w.year === y && w.quarter === q)
      const disc = discouraged.find(d => d.year === y && d.quarter === q)
      const gro = growth.find(g => g.year === y && g.quarter === q)
      
      const lab = laborMap[key] ? laborMap[key].sum / laborMap[key].count : null
      const emp = employedMap[key] ? employedMap[key].sum / employedMap[key].count : null
      const unemp = unemployedMap[key] ? unemployedMap[key].sum / unemployedMap[key].count : null
      const rate = rateMap[key] ? rateMap[key].sum / rateMap[key].count : null
      const rateChange = rateChangeMap[key] ? rateChangeMap[key].sum / rateChangeMap[key].count : null

      if (lab !== null || emp !== null || wage || disc || gro) {
        quarterlyData.push({
          year: y,
          quarter: q,
          label: `${q} ${y}`,
          avgWeeklyWage: wage?.value ?? null,
          wageChange: wage?.change ?? null,
          discouraged: disc?.value ?? null,
          unemployed: unemp,
          employed: emp,
          laborForce: lab,
          unemploymentRate: rate,
          unemploymentRateChange: rateChange,
          jobGrowth: gro?.change ?? null,
          jobGrowthPercent: gro?.percentChange ?? null
        })
      }
    })
  })

  const result = {
    quarterlyData,
    latest: quarterlyData[quarterlyData.length - 1] ?? null
  }

  cachedVitalityResult = result
  lastVitalityFetchTime = now

  return result
}