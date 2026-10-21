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
  // Calendar date differences (actual calendar day span)
  daysToIssue: number | null
  daysAcceptedToApproved: number | null
  daysApprovedToIssued: number | null
  // Exact elapsed time differences (accounting for hours and minutes)
  timeToIssueHours: number | null
  timeToIssueDays: number | null
  timeAcceptedToApprovedHours: number | null
  timeAcceptedToApprovedDays: number | null
  timeApprovedToIssuedHours: number | null
  timeApprovedToIssuedDays: number | null
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

/**
 * Commercial subtypes that average less than 1 day (< 24 hours) in plan review
 * or turnaround time. These are over-the-counter/trade permits that do not undergo
 * true development plan review processes.
 */
export const EXCLUDED_COMMERCIAL_SUBTYPES = [
  'Service for Booster Box',
  'Reroof',
  'Electrical Service Upgrade',
  'Release of Non- Compliance',
  'Gas Line Repair/Replace',
  'Electrical Panel Replacement',
  'Water/Sewer Line Repair/Replacement',
  'HVAC Equipment',
  'Window Replacement',
  'Grease Trap Replacement',
] as const

export function isExcludedCommercialSubtype(subtype: string | null | undefined): boolean {
  if (!subtype) return false
  const normalized = subtype.toLowerCase().trim().replace(/^["']|["']$/g, '')
  return EXCLUDED_COMMERCIAL_SUBTYPES.some(
    s => s.toLowerCase().trim() === normalized
  )
}

export function isExcludedSubtype(subtype?: string | undefined | null, recordType?: string): boolean {
  if (!subtype) return false
  if (recordType === 'Commercial' || !recordType) {
    if (isExcludedCommercialSubtype(subtype)) return true
  }
  return false
}

/**
 * Residential permits scoped to specific keywords per development process metrics requirements:
 * remodel, family, solar, home, residential
 */
export const RESIDENTIAL_SUBTYPE_KEYWORDS = [
  'remodel',
  'family',
  'solar',
  'home',
  'residential',
] as const

export function isQualifyingResidentialSubtype(subtype: string | null | undefined): boolean {
  if (!subtype) return false
  const normalized = subtype.toLowerCase().trim()
  return RESIDENTIAL_SUBTYPE_KEYWORDS.some(kw => normalized.includes(kw))
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
  let y: number, m: number, dt: number
  let timestamp: number | null = null

  if (typeof val === 'number') {
    const d = new Date(val)
    if (isNaN(d.getTime())) return { timestamp: null, dateStr: null, year: null, quarter: null, month: null }
    y = d.getFullYear()
    m = d.getMonth()
    dt = d.getDate()
    timestamp = d.getTime()
  } else {
    const s = String(val).trim()
    if (!s) return { timestamp: null, dateStr: null, year: null, quarter: null, month: null }

    const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/)
    if (isoMatch) {
      y = Number(isoMatch[1])
      m = Number(isoMatch[2]) - 1
      dt = Number(isoMatch[3])
      const hr = isoMatch[4] ? Number(isoMatch[4]) : 0
      const min = isoMatch[5] ? Number(isoMatch[5]) : 0
      const sec = isoMatch[6] ? Number(isoMatch[6]) : 0
      timestamp = Date.UTC(y, m, dt, hr, min, sec)
    } else {
      const usMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/)
      if (usMatch) {
        y = Number(usMatch[3])
        m = Number(usMatch[1]) - 1
        dt = Number(usMatch[2])
        const hr = usMatch[4] ? Number(usMatch[4]) : 0
        const min = usMatch[5] ? Number(usMatch[5]) : 0
        const sec = usMatch[6] ? Number(usMatch[6]) : 0
        timestamp = Date.UTC(y, m, dt, hr, min, sec)
      } else {
        const d = new Date(s.replace(' ', 'T'))
        if (isNaN(d.getTime())) return { timestamp: null, dateStr: null, year: null, quarter: null, month: null }
        y = d.getFullYear()
        m = d.getMonth()
        dt = d.getDate()
        timestamp = d.getTime()
      }
    }
  }

  const qNum = Math.floor(m / 3) + 1
  const pad = (n: number) => String(n).padStart(2, '0')
  const dateStr = `${y}-${pad(m + 1)}-${pad(dt)}`

  return {
    timestamp,
    dateStr,
    year: y,
    quarter: `Q${qNum}`,
    month: MONTH_NAMES[m],
  }
}

export function getCalendarDayDiff(dateStr1: string | null, dateStr2: string | null): number | null {
  if (!dateStr1 || !dateStr2) return null
  const [y1, m1, d1] = dateStr1.split('-').map(Number)
  const [y2, m2, d2] = dateStr2.split('-').map(Number)
  if (!y1 || !m1 || !d1 || !y2 || !m2 || !d2) return null
  const dt1 = Date.UTC(y1, m1 - 1, d1)
  const dt2 = Date.UTC(y2, m2 - 1, d2)
  const diff = Math.round((dt2 - dt1) / (1000 * 60 * 60 * 24))
  return diff >= 0 ? diff : null
}

export function getTimeDiff(
  info1: { timestamp: number | null; dateStr: string | null },
  info2: { timestamp: number | null; dateStr: string | null }
): { hours: number; days: number } | null {
  if (!info1?.timestamp || !info2?.timestamp || !info1.dateStr || !info2.dateStr) return null
  const calDiff = getCalendarDayDiff(info1.dateStr, info2.dateStr)
  if (calDiff === null) return null

  // If chronologically info2 is after or equal to info1
  if (info2.timestamp >= info1.timestamp) {
    const hours = Math.round(((info2.timestamp - info1.timestamp) / (1000 * 60 * 60)) * 10) / 10
    const days = Math.round((hours / 24) * 100) / 100
    return { hours, days }
  }

  // If recorded on the same calendar day, but info2 had a default morning/midnight timestamp (e.g. 06:00:00 UTC)
  if (calDiff === 0) {
    return { hours: 0, days: 0 }
  }

  // If positive calendar date difference, clamp negative sub-day jitter
  const rawHours = (info2.timestamp - info1.timestamp) / (1000 * 60 * 60)
  const hours = Math.round(Math.max(0, rawHours) * 10) / 10
  const days = Math.round((hours / 24) * 100) / 100
  return { hours, days }
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

    const effectiveAppInfo = appInfo.dateStr ? appInfo : accInfo
    const effectiveIssInfo = issInfo.dateStr ? issInfo : apprInfo

    // Calendar date differences
    const daysToIssue = getCalendarDayDiff(effectiveAppInfo.dateStr, effectiveIssInfo.dateStr)
    const daysAcceptedToApproved = getCalendarDayDiff(effectiveAppInfo.dateStr, apprInfo.dateStr)
    const daysApprovedToIssued = getCalendarDayDiff(apprInfo.dateStr, issInfo.dateStr)

    // Exact elapsed time differences (accounting for hours & minutes)
    const timeToIssue = getTimeDiff(effectiveAppInfo, effectiveIssInfo)
    const timeAcceptedToApproved = getTimeDiff(effectiveAppInfo, apprInfo)
    const timeApprovedToIssued = getTimeDiff(apprInfo, issInfo)

    const yr = String(primaryInfo.year || 2025)
    const qtr = `${primaryInfo.quarter || 'Q1'} ${yr}`

    const recordSubtype = a.Record_Subtype || a.RecordSubType || a.Subtype || a.Permit_Subtype || 'General'

    // Scope residential permits to requested subtype keywords (remodel, family, solar, home, residential)
    if (recType === 'Residential' && !isQualifyingResidentialSubtype(recordSubtype)) {
      continue
    }

    // Exclude commercial permits that do not undergo true plan review (average review or turnaround < 1 day)
    if (recType === 'Commercial' && isExcludedCommercialSubtype(recordSubtype)) {
      continue
    }

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
      timeToIssueHours: timeToIssue?.hours ?? null,
      timeToIssueDays: timeToIssue?.days ?? null,
      timeAcceptedToApprovedHours: timeAcceptedToApproved?.hours ?? null,
      timeAcceptedToApprovedDays: timeAcceptedToApproved?.days ?? null,
      timeApprovedToIssuedHours: timeApprovedToIssued?.hours ?? null,
      timeApprovedToIssuedDays: timeApprovedToIssued?.days ?? null,
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

    // Scope residential permits to requested subtype keywords (remodel, family, solar, home, residential)
    if (recordType === 'Residential' && !isQualifyingResidentialSubtype(recordSubtype)) {
      continue
    }

    // Exclude commercial permits that do not undergo true plan review (average review or turnaround < 1 day)
    if (recordType === 'Commercial' && isExcludedCommercialSubtype(recordSubtype)) {
      continue
    }

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

    // Calculate calendar date differences adhering directly to official dates
    const daysToIssue = getCalendarDayDiff(appInfo.dateStr, issInfo.dateStr || apprInfo.dateStr)
    const daysAcceptedToApproved = getCalendarDayDiff(appInfo.dateStr, apprInfo.dateStr)
    const daysApprovedToIssued = getCalendarDayDiff(apprInfo.dateStr, issInfo.dateStr)

    // Calculate exact elapsed time differences (accounting for hours & minutes)
    const timeToIssue = getTimeDiff(appInfo, issInfo.timestamp ? issInfo : apprInfo)
    const timeAcceptedToApproved = getTimeDiff(appInfo, apprInfo)
    const timeApprovedToIssued = getTimeDiff(apprInfo, issInfo)

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
      timeToIssueHours: timeToIssue?.hours ?? null,
      timeToIssueDays: timeToIssue?.days ?? null,
      timeAcceptedToApprovedHours: timeAcceptedToApproved?.hours ?? null,
      timeAcceptedToApprovedDays: timeAcceptedToApproved?.days ?? null,
      timeApprovedToIssuedHours: timeApprovedToIssued?.hours ?? null,
      timeApprovedToIssuedDays: timeApprovedToIssued?.days ?? null,
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

  // Dynamically compute and filter out any commercial subtype with average review or turnaround < 24 hrs (< 1 day)
  const comStats: Record<string, { revHrs: number[]; turnHrs: number[] }> = {}
  rawPermits.forEach(p => {
    if (p.recordType === 'Commercial') {
      const st = (p.recordSubtype || 'General').trim().replace(/^["']|["']$/g, '')
      if (!comStats[st]) {
        comStats[st] = { revHrs: [], turnHrs: [] }
      }
      if (p.timeAcceptedToApprovedHours != null && !isNaN(p.timeAcceptedToApprovedHours)) {
        comStats[st].revHrs.push(p.timeAcceptedToApprovedHours)
      }
      if (p.timeApprovedToIssuedHours != null && !isNaN(p.timeApprovedToIssuedHours)) {
        comStats[st].turnHrs.push(p.timeApprovedToIssuedHours)
      } else if (p.timeToIssueHours != null && !isNaN(p.timeToIssueHours)) {
        comStats[st].turnHrs.push(p.timeToIssueHours)
      }
    }
  })

  const fastComSubtypes = new Set<string>()
  Object.entries(comStats).forEach(([st, data]) => {
    const avgRev = data.revHrs.length > 0 ? data.revHrs.reduce((a, b) => a + b, 0) / data.revHrs.length : null
    const avgTurn = data.turnHrs.length > 0 ? data.turnHrs.reduce((a, b) => a + b, 0) / data.turnHrs.length : null
    if ((avgRev !== null && avgRev < 24) || (avgTurn !== null && avgTurn < 24)) {
      fastComSubtypes.add(st.toLowerCase())
    }
  })

  if (fastComSubtypes.size > 0) {
    rawPermits = rawPermits.filter(p => {
      if (p.recordType === 'Commercial') {
        const norm = (p.recordSubtype || 'General').trim().replace(/^["']|["']$/g, '').toLowerCase()
        if (fastComSubtypes.has(norm)) return false
      }
      return true
    })
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
