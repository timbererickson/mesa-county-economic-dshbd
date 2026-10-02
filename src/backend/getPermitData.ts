export interface PermitRecord {
  permitNumber: string
  projectType: string
  recordType: 'Commercial' | 'Residential'
  recordSubtype: string
  recordStatus: string
  valuation: number
  applicationDate: string | null
  acceptedDate: string | null
  approvedDate: string | null
  issuedDate: string | null
  daysToIssue: number | null
  daysAcceptedToApproved: number | null
  daysApprovedToIssued: number | null
  openYear: string
  openQuarter: string
  month: string
  quarter: string
  year: string
  address: string
  description: string
}

export interface PermitFetchResult {
  rawPermits: PermitRecord[]
  availableSubtypes: string[]
  allYears: string[]
  allQuarters: string[]
  source: 'arcgis' | 'snapshot'
}

let cachedPermitResult: PermitFetchResult | null = null
let lastPermitFetchTime = 0
const CACHE_DURATION = 5 * 60 * 1000

const ARCGIS_BASE_URL = 'https://mcgis.mesacounty.us/arcgis/rest/services/RTPO/RTPO_Maintstar_Data/MapServer/0/query'

// Subtypes excluded from the dataview as not indicative of economic status
export const EXCLUDED_SUBTYPES_LIST = [
  'Reroof',
  'Commercial Roof',
  'Commercial Reroof',
  'Electrical Service Upgrade',
  'Mechanical/HVAC',
  'Basement Finish',
  'Carport/Patio Cover',
  'HVAC Equipment',
  'Addition to Dwelling',
  'Plumbing',
  'Residential Remodel/ Addition/ Alteration',
  'Water Heater Replacement',
  'Storage/Shelter',
  'Storage/ Shelter',
  'Gas Line Repair/Replace',
  'Other',
  'Other - See Notes',
  'Water/Sewer Line Repair/Replacement',
  'Release of Non Compliance',
  'Release of Non- Compliance',
  'Release of Non-Compliance',
  'Electrical Panel Replacement',
  'Sign',
  'Sign/Banner Permit',
  'Fence/ Sign/ Pool',
  'Fence / Pool',
  'Fence/Sign/Pool',
  'EV Charger',
  'Commercial Solar',
  'Structure Rewire',
  'Damage Repair',
  'EMP',
  'Service for Booster Box',
  'Window Replacement',
  'Window/Door Replacement',
  'Alarm System',
] as const

const EXCLUDED_NORMALIZED_KEYS = new Set(
  EXCLUDED_SUBTYPES_LIST.map(s => s.toLowerCase().replace(/[^a-z0-9]/g, ''))
)

export function isExcludedSubtype(subtype: string | undefined | null): boolean {
  if (!subtype) return false
  const norm = subtype.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (EXCLUDED_NORMALIZED_KEYS.has(norm)) return true
  if (norm.includes('commercialroof') || norm.includes('commercialreroof')) return true
  if (norm.includes('windowdoorreplacement')) return true
  if (norm.includes('fencesignpool') || norm.includes('fencepool')) return true
  return false
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function parseDateVal(val: any): { timestamp: number | null; dateStr: string | null; year: number | null; quarter: string | null; month: string | null } {
  if (!val) return { timestamp: null, dateStr: null, year: null, quarter: null, month: null }
  let d: Date
  if (typeof val === 'number') {
    d = new Date(val)
  } else {
    const s = String(val).trim()
    if (!s) return { timestamp: null, dateStr: null, year: null, quarter: null, month: null }
    if (/^\d{12,14}$/.test(s)) {
      d = new Date(Number(s))
    } else {
      d = new Date(s)
    }
  }

  if (isNaN(d.getTime())) {
    return { timestamp: null, dateStr: null, year: null, quarter: null, month: null }
  }

  const y = d.getFullYear()
  const qNum = Math.floor(d.getMonth() / 3) + 1
  return {
    timestamp: d.getTime(),
    dateStr: d.toISOString().split('T')[0],
    year: y,
    quarter: `Q${qNum}`,
    month: MONTH_NAMES[d.getMonth()],
  }
}

function parseCsvLine(line: string): string[] {
  const fields: string[] = []
  let inQuotes = false
  let cur = ''
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      inQuotes = !inQuotes
    } else if (c === ',' && !inQuotes) {
      fields.push(cur)
      cur = ''
    } else {
      cur += c
    }
  }
  fields.push(cur)
  return fields
}

function getArcGISToken(): string {
  if (typeof window !== 'undefined') {
    try {
      const urlToken = new URLSearchParams(window.location.search).get('token')
      if (urlToken) return urlToken
      const stored = localStorage.getItem('arcgis_token') || localStorage.getItem('token')
      if (stored) return stored
    } catch {
      // Ignore localStorage errors
    }
  }
  return (import.meta as any).env?.VITE_ARCGIS_TOKEN || ''
}

async function fetchArcGISPermits(): Promise<PermitRecord[]> {
  const token = getArcGISToken()
  let allFeatures: any[] = []
  let offset = 0
  const limit = 1000
  let hasMore = true

  // Filter directly at ArcGIS service level:
  // 1. Only residential and commercial via PermitType field
  // 2. Application date >= 2025 (orders by ApplicationDate DESC to prioritize 2026 records)
  const whereClause = "PermitType IN ('Residential', 'Commercial') AND ApplicationDate >= '2025-01-01 00:00:00'"

  while (hasMore) {
    let url = `${ARCGIS_BASE_URL}?where=${encodeURIComponent(whereClause)}&outFields=*&returnGeometry=false&f=json&orderByFields=${encodeURIComponent('ApplicationDate DESC')}&resultOffset=${offset}&resultRecordCount=${limit}`
    if (token) {
      url += `&token=${encodeURIComponent(token)}`
    }

    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    })
    if (!res.ok) {
      throw new Error(`ArcGIS HTTP error ${res.status}`)
    }
    const data: any = await res.json()
    if (data.error) {
      throw new Error(`ArcGIS error: ${data.error.message || JSON.stringify(data.error)}`)
    }
    const features = data.features || []
    if (features.length === 0) {
      break
    }

    allFeatures = allFeatures.concat(features)
    if (features.length < limit || data.exceededTransferLimit === false) {
      hasMore = false
    } else {
      offset += limit
    }
  }

  const records: PermitRecord[] = []

  for (const f of allFeatures) {
    const a = f.attributes || {}
    
    // Check permit type - strictly Residential and Commercial (check PermitType first)
    const rawType = String(a.PermitType || a.Permit_Type || a.Record_Type || a.RecordType || a.ProjectType || '').trim().toLowerCase()
    let recType: 'Commercial' | 'Residential' | null = null
    if (rawType.includes('com') || rawType.includes('non-res')) {
      recType = 'Commercial'
    } else if (rawType.includes('res')) {
      recType = 'Residential'
    }
    if (!recType) continue

    // Application Date (ApplicationDate / Application_Date / AcceptedDate / AppliedDate)
    const appRaw = a.ApplicationDate ?? a.Application_Date ?? a.AppliedDate ?? a.Applied_Date ?? a.AcceptedDate ?? a.Accepted_Date ?? a.OpenDate ?? a.Open_Date
    const appInfo = parseDateVal(appRaw)

    // Data from ApplicationDate must be 2025 and after
    if (!appInfo.year || appInfo.year < 2025) continue

    const accInfo = parseDateVal(a.AcceptedDate ?? a.Accepted_Date)
    const apprInfo = parseDateVal(a.ApprovedDate ?? a.Approved_Date)
    const issInfo = parseDateVal(a.IssuedDate ?? a.Issued_Date)

    const startTs = appInfo.timestamp || accInfo.timestamp
    const endTs = issInfo.timestamp || apprInfo.timestamp

    let daysToIssue: number | null = null
    if (startTs && endTs && endTs >= startTs) {
      daysToIssue = Math.round(((endTs - startTs) / (1000 * 60 * 60 * 24)) * 10) / 10
    }

    const accStartTs = accInfo.timestamp || appInfo.timestamp
    let daysAcceptedToApproved: number | null = null
    if (accStartTs && apprInfo.timestamp && apprInfo.timestamp >= accStartTs) {
      daysAcceptedToApproved = Math.round(((apprInfo.timestamp - accStartTs) / (1000 * 60 * 60 * 24)) * 10) / 10
    }

    let daysApprovedToIssued: number | null = null
    if (apprInfo.timestamp && issInfo.timestamp && issInfo.timestamp >= apprInfo.timestamp) {
      daysApprovedToIssued = Math.round(((issInfo.timestamp - apprInfo.timestamp) / (1000 * 60 * 60 * 24)) * 10) / 10
    }

    const yr = String(appInfo.year)
    const qtr = `${appInfo.quarter} ${yr}`

    const recordSubtype = a.Record_Subtype || a.RecordSubType || a.Subtype || 'General'
    if (isExcludedSubtype(recordSubtype)) continue

    records.push({
      permitNumber: a.Permit_Number || a.PermitNumber || a.HumanName || `PERMIT-${a.OBJECTID}`,
      projectType: a.ProjectType || 'Permitting',
      recordType: recType,
      recordSubtype,
      recordStatus: a.Record_Status || a.RecordStatus || a.Status || 'Unknown',
      valuation: Number(a.Valuation) || 0,
      applicationDate: appInfo.dateStr,
      acceptedDate: accInfo.dateStr,
      approvedDate: apprInfo.dateStr,
      issuedDate: issInfo.dateStr,
      daysToIssue,
      daysAcceptedToApproved,
      daysApprovedToIssued,
      openYear: yr,
      openQuarter: appInfo.quarter ?? 'Q1',
      month: appInfo.month ?? 'Jan',
      quarter: qtr,
      year: yr,
      address: a.Address || '',
      description: a.Description || '',
    })
  }

  return records
}

async function fetchLocalCsvPermits(): Promise<PermitRecord[]> {
  const res = await fetch('/data/query-result.csv')
  if (!res.ok) {
    throw new Error(`Failed to load /data/query-result.csv: ${res.statusText}`)
  }
  const text = await res.text()
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length <= 1) return []

  const records: PermitRecord[] = []

  for (let i = 1; i < lines.length; i++) {
    const f = parseCsvLine(lines[i])
    if (f.length < 7) continue

    // f[2] is RecordType
    const recTypeRaw = f[2]?.replace(/^"|"$/g, '').trim()
    let recordType: 'Commercial' | 'Residential' | null = null
    const tl = recTypeRaw.toLowerCase()
    if (tl.includes('com') || tl.includes('non-res')) {
      recordType = 'Commercial'
    } else if (tl.includes('res')) {
      recordType = 'Residential'
    }
    if (!recordType) continue

    // Subtype check
    const recordSubtype = f[3]?.replace(/^"|"$/g, '').trim() || 'General'
    if (isExcludedSubtype(recordSubtype)) continue

    // Application date in this dataset is AcceptedDate (f[f.length - 4])
    const accDateRaw = f[f.length - 4]?.replace(/^"|"$/g, '').trim()
    const appInfo = parseDateVal(accDateRaw)

    // Data from ApplicationDate must be 2025 and after
    if (!appInfo.year || appInfo.year < 2025) continue

    const approvedRaw = f[f.length - 3]?.replace(/^"|"$/g, '').trim()
    const issuedRaw = f[f.length - 2]?.replace(/^"|"$/g, '').trim()
    const accInfo = appInfo
    const apprInfo = parseDateVal(approvedRaw)
    const issInfo = parseDateVal(issuedRaw)

    let daysToIssue: number | null = null
    const startTs = appInfo.timestamp || accInfo.timestamp
    const endTs = issInfo.timestamp || apprInfo.timestamp
    if (startTs && endTs && endTs >= startTs) {
      daysToIssue = Math.round(((endTs - startTs) / (1000 * 60 * 60 * 24)) * 10) / 10
    }

    const accStartTs = accInfo.timestamp || appInfo.timestamp
    let daysAcceptedToApproved: number | null = null
    if (accStartTs && apprInfo.timestamp && apprInfo.timestamp >= accStartTs) {
      daysAcceptedToApproved = Math.round(((apprInfo.timestamp - accStartTs) / (1000 * 60 * 60 * 24)) * 10) / 10
    }

    let daysApprovedToIssued: number | null = null
    if (apprInfo.timestamp && issInfo.timestamp && issInfo.timestamp >= apprInfo.timestamp) {
      daysApprovedToIssued = Math.round(((issInfo.timestamp - apprInfo.timestamp) / (1000 * 60 * 60 * 24)) * 10) / 10
    }

    const valRaw = f[f.length - 1]?.replace(/^"|"$/g, '').replace(/[$,]/g, '').trim()
    const valuation = parseFloat(valRaw) || 0

    const yr = String(appInfo.year)
    const qtr = `${appInfo.quarter} ${yr}`

    records.push({
      permitNumber: f[0]?.replace(/^"|"$/g, '').trim() || '',
      projectType: f[1]?.replace(/^"|"$/g, '').trim() || 'Permitting',
      recordType,
      recordSubtype,
      recordStatus: f[f.length - 5]?.replace(/^"|"$/g, '').trim() || 'Unknown',
      valuation,
      applicationDate: appInfo.dateStr,
      acceptedDate: accInfo.dateStr,
      approvedDate: apprInfo.dateStr,
      issuedDate: issInfo.dateStr,
      daysToIssue,
      daysAcceptedToApproved,
      daysApprovedToIssued,
      openYear: yr,
      openQuarter: appInfo.quarter ?? 'Q1',
      month: appInfo.month ?? 'Jan',
      quarter: qtr,
      year: yr,
      address: f[4]?.replace(/^"|"$/g, '').trim() || '',
      description: f.slice(5, f.length - 5).join(', ').replace(/^"|"$/g, '').trim() || '',
    })
  }

  return records
}

export default async function fetchPermitData(): Promise<PermitFetchResult> {
  const now = Date.now()

  if (cachedPermitResult && cachedPermitResult.rawPermits?.length > 0 && (now - lastPermitFetchTime < CACHE_DURATION)) {
    return {
      ...cachedPermitResult,
      rawPermits: cachedPermitResult.rawPermits.filter(p => !isExcludedSubtype(p.recordSubtype)),
      availableSubtypes: cachedPermitResult.availableSubtypes.filter(st => !isExcludedSubtype(st)),
    }
  }

  let rawPermits: PermitRecord[] = []
  let source: 'arcgis' | 'snapshot' = 'arcgis'

  // Attempt live ArcGIS service query first
  try {
    rawPermits = await fetchArcGISPermits()
    if (rawPermits.length === 0) {
      throw new Error('ArcGIS returned 0 records; falling back to snapshot')
    }
  } catch (err) {
    console.info('Using local Mesa County snapshot (query-result.csv) - ArcGIS notice:', (err as any)?.message || err)
    source = 'snapshot'
    try {
      rawPermits = await fetchLocalCsvPermits()
    } catch (csvErr) {
      console.error('Failed to load local permit snapshot:', csvErr)
      rawPermits = []
    }
  }

  // Ensure all excluded non-economic subtypes are filtered out
  rawPermits = rawPermits.filter(p => !isExcludedSubtype(p.recordSubtype))

  const availableSubtypes = [...new Set(rawPermits.map(p => p.recordSubtype).filter(Boolean))].sort()
  
  const allYearsSet = new Set<string>()
  const allQuartersSet = new Set<string>()

  rawPermits.forEach(p => {
    const yrNum = parseInt(p.year, 10)
    if (!isNaN(yrNum) && yrNum >= 2025) {
      allYearsSet.add(p.year)
    }
    if (p.quarter) {
      allQuartersSet.add(p.quarter)
    }
  })

  const allYears = [...allYearsSet].filter(Boolean).sort()
  const allQuarters = [...allQuartersSet].filter(Boolean).sort((a, b) => {
    const ya = a.match(/\b(20\d{2})\b/)?.[1] ?? ''
    const yb = b.match(/\b(20\d{2})\b/)?.[1] ?? ''
    if (ya !== yb) return ya.localeCompare(yb)
    return a.localeCompare(b)
  })

  const result: PermitFetchResult = {
    rawPermits,
    availableSubtypes,
    allYears: allYears.length > 0 ? allYears : ['2025', '2026'],
    allQuarters: allQuarters.length > 0 ? allQuarters : ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'],
    source,
  }

  cachedPermitResult = result
  lastPermitFetchTime = now
  return result
}
