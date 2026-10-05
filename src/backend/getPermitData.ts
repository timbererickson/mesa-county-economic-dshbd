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
  arcgisError?: string | null
  totalRecordsLoaded: number
}

let cachedPermitResult: PermitFetchResult | null = null
let lastPermitFetchTime = 0
const CACHE_DURATION = 5 * 60 * 1000

const ARCGIS_BASE_URL = 'https://mcgis.mesacounty.us/arcgis/rest/services/RTPO/RTPO_Maintstar_Data/MapServer/0/query'

// All subtypes are now supported and displayed per GIS layer predefined 2025+ configuration
export const EXCLUDED_SUBTYPES_LIST: readonly string[] = []

export function isExcludedSubtype(_subtype?: string | undefined | null): boolean {
  return false
}

export const RECIPIENT_PENDING_STATUS_PATTERNS = [
  'info needed',
  'additional info',
  'incomplete',
  'pending payment',
  'prf due',
  'revision for review',
  'hold',
  'renewal pending',
] as const

export function isRecipientPendingStatus(status: string | undefined | null): boolean {
  if (!status) return false
  const s = status.toLowerCase()
  return RECIPIENT_PENDING_STATUS_PATTERNS.some(pattern => s.includes(pattern))
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function parseDateVal(val: any): { timestamp: number | null; dateStr: string | null; year: number | null; quarter: string | null; month: string | null } {
  if (val === null || val === undefined || val === '') {
    return { timestamp: null, dateStr: null, year: null, quarter: null, month: null }
  }
  let d: Date
  if (typeof val === 'number') {
    // Esri ArcGIS millisecond timestamp
    d = new Date(val)
  } else {
    const s = String(val).trim()
    if (!s) return { timestamp: null, dateStr: null, year: null, quarter: null, month: null }
    if (/^\d{11,14}$/.test(s)) {
      d = new Date(Number(s))
    } else if (/^\d{9,10}$/.test(s)) {
      d = new Date(Number(s) * 1000)
    } else {
      d = new Date(s)
    }
  }

  if (isNaN(d.getTime())) {
    return { timestamp: null, dateStr: null, year: null, quarter: null, month: null }
  }

  const y = d.getFullYear()
  const qNum = Math.floor(d.getMonth() / 3) + 1
  const m = d.getMonth()
  const pad = (n: number) => String(n).padStart(2, '0')
  const dateStr = `${y}-${pad(m + 1)}-${pad(d.getDate())}`

  return {
    timestamp: d.getTime(),
    dateStr,
    year: y,
    quarter: `Q${qNum}`,
    month: MONTH_NAMES[m],
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
  return (
    (import.meta as any).env?.VITE_ARCGIS_TOKEN ||
    (import.meta as any).env?.ARCGIS_TOKEN ||
    ''
  )
}

async function fetchArcGISPermits(): Promise<PermitRecord[]> {
  const token = getArcGISToken()
  let allFeatures: any[] = []
  let offset = 0
  const limit = 16000
  let hasMore = true

  // The GIS layer has predefined queries to support 2025 data and later
  const whereClause = '1=1'

  while (hasMore) {
    let url = `${ARCGIS_BASE_URL}?where=${encodeURIComponent(whereClause)}&outFields=*&returnGeometry=false&f=json&resultOffset=${offset}&resultRecordCount=${limit}`
    if (token) {
      url += `&token=${encodeURIComponent(token)}`
    }

    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    })
    if (!res.ok) {
      throw new Error(`ArcGIS HTTP error ${res.status}: ${res.statusText}`)
    }
    const data: any = await res.json()
    if (data.error) {
      const code = data.error.code ? ` (${data.error.code})` : ''
      const msg = data.error.message || JSON.stringify(data.error)
      throw new Error(`ArcGIS Error${code}: ${msg}`)
    }
    const features = data.features || []
    if (features.length === 0) {
      break
    }

    allFeatures = allFeatures.concat(features)
    
    // Check pagination limits
    if (features.length < limit || data.exceededTransferLimit === false) {
      hasMore = false
    } else {
      offset += limit
      if (allFeatures.length >= 100000) {
        break
      }
    }
  }

  const records: PermitRecord[] = []

  for (const f of allFeatures) {
    const a = f.attributes || {}
    
    // Check permit type - Commercial vs Residential
    const rawType = String(a.PermitType || a.Permit_Type || a.Record_Type || a.RecordType || a.ProjectType || '').trim()
    const tl = rawType.toLowerCase()
    let recType: 'Commercial' | 'Residential' = 'Residential'
    if (tl.includes('com') || tl.includes('non-res') || tl.includes('site plan')) {
      recType = 'Commercial'
    } else {
      recType = 'Residential'
    }

    // Application Date - handle ArcGIS timestamps and date fields
    const appRaw = a.ApplicationDate ?? a.Application_Date ?? a.AppliedDate ?? a.Applied_Date ?? a.AcceptedDate ?? a.Accepted_Date ?? a.OpenDate ?? a.Open_Date ?? a.DateApplied ?? a.DateAccepted
    const appInfo = parseDateVal(appRaw)

    const accInfo = parseDateVal(a.AcceptedDate ?? a.Accepted_Date ?? a.DateAccepted)
    const apprInfo = parseDateVal(a.ApprovedDate ?? a.Approved_Date ?? a.DateApproved)
    const issInfo = parseDateVal(a.IssuedDate ?? a.Issued_Date ?? a.DateIssued)

    // Primary date representation for year/quarter
    const primaryInfo = (appInfo.year && appInfo.year >= 2025)
      ? appInfo
      : ((accInfo.year && accInfo.year >= 2025) ? accInfo : (issInfo.year && issInfo.year >= 2025 ? issInfo : (appInfo.year ? appInfo : { year: 2025, quarter: 'Q1', month: 'Jan', dateStr: '2025-01-01', timestamp: null })))

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

    const yr = String(primaryInfo.year || 2025)
    const qtr = `${primaryInfo.quarter || 'Q1'} ${yr}`

    const recordSubtype = a.Record_Subtype || a.RecordSubType || a.Subtype || a.Permit_Subtype || 'General'

    records.push({
      permitNumber: a.Permit_Number || a.PermitNumber || a.HumanName || `PERMIT-${a.OBJECTID || records.length + 1}`,
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
      openQuarter: primaryInfo.quarter ?? 'Q1',
      month: primaryInfo.month ?? 'Jan',
      quarter: qtr,
      year: yr,
      address: a.Address || '',
      description: a.Description || '',
    })
  }

  return records
}

// @ts-ignore
import satsMaintStarCsvUrl from '../data/sats_MaintStar.csv?url'

function robustParseLine(line: string): string[] {
  let firstCommas: number[] = []
  let pos = -1
  for (let k = 0; k < 4; k++) {
    pos = line.indexOf(",", pos + 1)
    if (pos === -1) break
    firstCommas.push(pos)
  }

  let lastCommas: number[] = []
  pos = line.length
  for (let k = 0; k < 5; k++) {
    pos = line.lastIndexOf(",", pos - 1)
    if (pos === -1) break
    lastCommas.unshift(pos)
  }

  if (firstCommas.length < 4 || lastCommas.length < 5 || firstCommas[3] >= lastCommas[0]) {
    return line.split(",")
  }

  const humanName = line.substring(0, firstCommas[0])
  const projectType = line.substring(firstCommas[0] + 1, firstCommas[1])
  const recordType = line.substring(firstCommas[1] + 1, firstCommas[2])
  const recordSubtype = line.substring(firstCommas[2] + 1, firstCommas[3])

  const status = line.substring(lastCommas[0] + 1, lastCommas[1])
  const acceptedDate = line.substring(lastCommas[1] + 1, lastCommas[2])
  const approvedDate = line.substring(lastCommas[2] + 1, lastCommas[3])
  const issuedDate = line.substring(lastCommas[3] + 1, lastCommas[4])
  const valuation = line.substring(lastCommas[4] + 1)

  const middle = line.substring(firstCommas[3] + 1, lastCommas[0])
  
  let address = ""
  let description = ""
  if (middle.startsWith("\"")) {
    const endQuote = middle.indexOf("\"", 1)
    if (endQuote !== -1) {
      address = middle.substring(1, endQuote)
      description = middle.substring(endQuote + 1)
      if (description.startsWith(",")) {
        description = description.substring(1)
      }
    } else {
      address = middle
    }
  } else {
    const firstComma = middle.indexOf(",")
    if (firstComma !== -1) {
      address = middle.substring(0, firstComma)
      description = middle.substring(firstComma + 1)
    } else {
      address = middle
    }
  }

  if (description.startsWith("\"") && description.endsWith("\"")) {
    description = description.substring(1, description.length - 1)
  }

  return [humanName, projectType, recordType, recordSubtype, address, description, status, acceptedDate, approvedDate, issuedDate, valuation]
}

async function fetchLocalCsvPermits(): Promise<PermitRecord[]> {
  const res = await fetch('/data/permit-valuations2.csv')
  if (!res.ok) {
    throw new Error(`Failed to load permit-valuations2.csv: ${res.statusText}`)
  }
  const text = await res.text()
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length <= 1) return []

  const records: PermitRecord[] = []

  for (let i = 1; i < lines.length; i++) {
    const r = robustParseLine(lines[i])
    if (r.length < 11) continue

    const permitNumber = r[0]?.trim() || `PERMIT-${i}`
    const projectType = r[1]?.trim() || 'Permitting'
    
    const rawType = String(r[2] || '').trim().toLowerCase()
    let recordType: 'Commercial' | 'Residential' = 'Residential'
    if (rawType.includes('com') || rawType.includes('non-res') || rawType.includes('site plan')) {
      recordType = 'Commercial'
    } else {
      recordType = 'Residential'
    }

    const recordSubtype = r[3]?.trim() || 'General'
    const address = r[4]?.trim() || ''
    const description = r[5]?.trim() || ''
    const recordStatus = r[6]?.trim() || 'Unknown'

    // Parse dates
    const appRaw = r[7]?.trim()
    const appInfo = parseDateVal(appRaw)

    const accInfo = appInfo

    const approvedRaw = r[8]?.trim()
    const apprInfo = parseDateVal(approvedRaw)

    const issuedRaw = r[9]?.trim()
    const issInfo = parseDateVal(issuedRaw)

    // Calculate days metrics
    const startTs = appInfo.timestamp
    const endTs = issInfo.timestamp || apprInfo.timestamp

    let daysToIssue: number | null = null
    if (startTs && endTs && endTs >= startTs) {
      daysToIssue = Math.round(((endTs - startTs) / (1000 * 60 * 60 * 24)) * 10) / 10
    }

    let daysAcceptedToApproved: number | null = null
    if (startTs && apprInfo.timestamp && apprInfo.timestamp >= startTs) {
      daysAcceptedToApproved = Math.round(((apprInfo.timestamp - startTs) / (1000 * 60 * 60 * 24)) * 10) / 10
    }

    let daysApprovedToIssued: number | null = null
    if (apprInfo.timestamp && issInfo.timestamp && issInfo.timestamp >= apprInfo.timestamp) {
      daysApprovedToIssued = Math.round(((issInfo.timestamp - apprInfo.timestamp) / (1000 * 60 * 60 * 24)) * 10) / 10
    }

    const valRaw = r[10]?.trim().replace(/[$,]/g, '') || ''
    const valuation = parseFloat(valRaw) || 0

    // Primary date representation for year/quarter
    const primaryInfo = (appInfo.year && appInfo.year >= 2025)
      ? appInfo
      : ((apprInfo.year && apprInfo.year >= 2025) ? apprInfo : (issInfo.year && issInfo.year >= 2025 ? issInfo : (appInfo.year ? appInfo : { year: 2025, quarter: 'Q1', month: 'Jan', dateStr: '2025-01-01', timestamp: null })))

    const yr = String(primaryInfo.year || 2025)
    const qtr = `${primaryInfo.quarter || 'Q1'} ${yr}`

    records.push({
      permitNumber,
      projectType,
      recordType,
      recordSubtype,
      recordStatus,
      valuation,
      applicationDate: appInfo.dateStr,
      acceptedDate: appInfo.dateStr,
      approvedDate: apprInfo.dateStr,
      issuedDate: issInfo.dateStr,
      daysToIssue,
      daysAcceptedToApproved,
      daysApprovedToIssued,
      openYear: yr,
      openQuarter: primaryInfo.quarter ?? 'Q1',
      month: primaryInfo.month ?? 'Jan',
      quarter: qtr,
      year: yr,
      address,
      description,
    })
  }

  return records
}

export default async function fetchPermitData(): Promise<PermitFetchResult> {
  const now = Date.now()

  if (cachedPermitResult && cachedPermitResult.rawPermits?.length > 0 && (now - lastPermitFetchTime < CACHE_DURATION)) {
    return cachedPermitResult
  }

  let rawPermits: PermitRecord[] = []
  let source: 'arcgis' | 'snapshot' = 'snapshot'
  let arcgisError: string | null = null

  // Use the local CSV data directly as the primary source for the time being
  try {
    rawPermits = await fetchLocalCsvPermits()
  } catch (csvErr: any) {
    console.error('Failed to load local permit snapshot:', csvErr)
    arcgisError = csvErr?.message || String(csvErr)
    rawPermits = []
  }

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
    arcgisError,
    totalRecordsLoaded: rawPermits.length,
  }

  cachedPermitResult = result
  lastPermitFetchTime = now
  return result
}
