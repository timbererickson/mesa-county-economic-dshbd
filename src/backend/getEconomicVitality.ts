const VITALITY_SHEET_ID = '1jge6iKft3BamE9tza9AxU1NtMtGKvofZHO5fTN_TgCI'

let cachedVitalityResult: any = null
let lastVitalityFetchTime = 0
const CACHE_DURATION = 5 * 60 * 1000

function parseN(val: any): number {
  if (typeof val === 'number') return val
  const n = parseFloat((val || '').toString().replace(/[$,%]/g, ''))
  return isNaN(n) ? 0 : n
}

// Retool-grounded fallback data matching official Mesa County datasets
const FALLBACK_QUARTERLY = [
  {
    year: '2025',
    quarter: 'Q1',
    label: 'Q1 2025',
    avgWeeklyWage: 1121,
    wageChange: 45,
    discouraged: 173,
    unemployed: 3450,
    employed: 77250,
    laborForce: 79640,
    unemploymentRate: 4.1,
    unemploymentRateChange: -0.10,
    jobGrowth: 670,
    jobGrowthPercent: 0.88
  },
  {
    year: '2025',
    quarter: 'Q2',
    label: 'Q2 2025',
    avgWeeklyWage: 1130,
    wageChange: 52,
    discouraged: 166,
    unemployed: 3313,
    employed: 76850,
    laborForce: 79200,
    unemploymentRate: 4.0,
    unemploymentRateChange: -0.15,
    jobGrowth: -340,
    jobGrowthPercent: -0.44
  },
  {
    year: '2025',
    quarter: 'Q3',
    label: 'Q3 2025',
    avgWeeklyWage: 1120,
    wageChange: 38,
    discouraged: 168,
    unemployed: 3270,
    employed: 76500,
    laborForce: 78900,
    unemploymentRate: 3.9,
    unemploymentRateChange: -0.20,
    jobGrowth: -430,
    jobGrowthPercent: -0.56
  },
  {
    year: '2025',
    quarter: 'Q4',
    label: 'Q4 2025',
    avgWeeklyWage: 1205,
    wageChange: 64,
    discouraged: 167,
    unemployed: 3180,
    employed: 76600,
    laborForce: 79000,
    unemploymentRate: 3.8,
    unemploymentRateChange: -0.25,
    jobGrowth: 170,
    jobGrowthPercent: 0.22
  },
  {
    year: '2026',
    quarter: 'Q1',
    label: 'Q1 2026',
    avgWeeklyWage: 1178,
    wageChange: 57,
    discouraged: 86,
    unemployed: 3150,
    employed: 76400,
    laborForce: 78708,
    unemploymentRate: 3.9,
    unemploymentRateChange: -0.20,
    jobGrowth: -337,
    jobGrowthPercent: -0.44
  },
  {
    year: '2026',
    quarter: 'Q2',
    label: 'Q2 2026',
    avgWeeklyWage: null,
    wageChange: null,
    discouraged: null,
    unemployed: 2990,
    employed: 75750,
    laborForce: 78740,
    unemploymentRate: 3.8,
    unemploymentRateChange: -0.20,
    jobGrowth: null,
    jobGrowthPercent: null
  },
  {
    year: '2026',
    quarter: 'Q3',
    label: 'Q3 2026',
    avgWeeklyWage: null,
    wageChange: null,
    discouraged: null,
    unemployed: 3115,
    employed: 74800,
    laborForce: 77915,
    unemploymentRate: 4.0,
    unemploymentRateChange: 0.10,
    jobGrowth: null,
    jobGrowthPercent: null
  },
  {
    year: '2026',
    quarter: 'Q4',
    label: 'Q4 2026',
    avgWeeklyWage: null,
    wageChange: null,
    discouraged: null,
    unemployed: null,
    employed: null,
    laborForce: null,
    unemploymentRate: null,
    unemploymentRateChange: null,
    jobGrowth: null,
    jobGrowthPercent: null
  }
]

async function readGoogleSheet(spreadsheetId: string, sheetName: string) {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`
    const res = await fetch(url)
    if (!res.ok) return []
    const text = await res.text()
    if (!text.includes('google.visualization.Query.setResponse')) return []
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
  } catch (e) {
    console.warn(`Failed to fetch sheet ${sheetName}:`, e)
    return []
  }
}

export default async function fetchEconomicVitality() {
  const now = Date.now()

  if (cachedVitalityResult && (now - lastVitalityFetchTime < CACHE_DURATION)) {
    return cachedVitalityResult
  }

  try {
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
      ...wages.map((w: any) => w.year),
      ...discouraged.map((d: any) => d.year),
      ...growth.map((g: any) => g.year),
      ...Object.keys(laborMap).map(k => k.split(' ')[0]!)
    ])].filter(y => parseInt(y) >= 2025).sort()

    const quarters = ['Q1', 'Q2', 'Q3', 'Q4']
    const quarterlyData: any[] = []

    allYears.forEach(y => {
      quarters.forEach(q => {
        const key = `${y} ${q}`
        const wage = wages.find((w: any) => w.year === y && w.quarter === q)
        const disc = discouraged.find((d: any) => d.year === y && d.quarter === q)
        const gro = growth.find((g: any) => g.year === y && g.quarter === q)
        
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

    const finalData = quarterlyData.length > 0 ? quarterlyData : FALLBACK_QUARTERLY

    const result = {
      quarterlyData: finalData,
      latest: finalData[finalData.length - 1] ?? null
    }

    cachedVitalityResult = result
    lastVitalityFetchTime = now

    return result
  } catch (err) {
    console.warn('Using Retool-grounded fallback vitality dataset:', err)
    const result = {
      quarterlyData: FALLBACK_QUARTERLY,
      latest: FALLBACK_QUARTERLY[FALLBACK_QUARTERLY.length - 1]
    }
    cachedVitalityResult = result
    lastVitalityFetchTime = now
    return result
  }
}
