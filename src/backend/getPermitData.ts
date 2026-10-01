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
  openYear: string
  openQuarter: string
  quarter: string
  year: string
  address: string
  description: string
}

let cachedPermitResult: any = null
let lastPermitFetchTime = 0
const CACHE_DURATION = 5 * 60 * 1000

const ARCGIS_BASE_URL = 'https://mcgis.mesacounty.us/arcgis/rest/services/RTPO/RTPO_Maintstar_Data/MapServer/0/query'

function parseDateVal(val: any): { timestamp: number | null; dateStr: string | null } {
  if (!val) return { timestamp: null, dateStr: null }
  if (typeof val === 'number') {
    const d = new Date(val)
    return isNaN(d.getTime()) ? { timestamp: null, dateStr: null } : { timestamp: val, dateStr: d.toISOString().split('T')[0] }
  }
  const d = new Date(String(val))
  if (isNaN(d.getTime())) return { timestamp: null, dateStr: null }
  return { timestamp: d.getTime(), dateStr: d.toISOString().split('T')[0] }
}

async function fetchArcGISPermits(): Promise<PermitRecord[]> {
  let allFeatures: any[] = []
  let offset = 0
  const limit = 1000
  let hasMore = true

  while (hasMore) {
    try {
      const url = `${ARCGIS_BASE_URL}?where=1%3D1&outFields=*&returnGeometry=false&f=json&resultOffset=${offset}&resultRecordCount=${limit}`
      const res = await fetch(url)
      if (!res.ok) break
      const data: any = await res.json()
      if (data.error) break
      const features = data.features || []
      allFeatures = allFeatures.concat(features)
      if (features.length < limit || data.exceededTransferLimit === false) {
        hasMore = false
      } else {
        offset += limit
      }
    } catch (e) {
      break
    }
  }

  return allFeatures.map((f: any) => {
    const a = f.attributes || {}
    
    // Application Date (Application_Date / Applied_Date / Open_Date / Accepted_Date)
    const appRaw = a.Application_Date ?? a.ApplicationDate ?? a.Applied_Date ?? a.AppliedDate ?? a.Open_Date ?? a.OpenDate ?? a.Accepted_Date ?? a.AcceptedDate
    const { timestamp: appTs, dateStr: applicationDate } = parseDateVal(appRaw)

    const { timestamp: accTs, dateStr: acceptedDate } = parseDateVal(a.Accepted_Date ?? a.AcceptedDate)
    const { timestamp: apprTs, dateStr: approvedDate } = parseDateVal(a.Approved_Date ?? a.ApprovedDate)
    const { timestamp: issTs, dateStr: issuedDate } = parseDateVal(a.Issued_Date ?? a.IssuedDate)

    const primaryTs = appTs || accTs || apprTs || issTs

    let year = ''
    let quarter = ''
    if (primaryTs) {
      const d = new Date(primaryTs)
      year = String(d.getFullYear())
      quarter = `Q${Math.floor(d.getMonth() / 3) + 1} ${year}`
    }

    let daysToIssue: number | null = null
    const startTs = appTs || accTs
    const endTs = issTs || apprTs
    if (startTs && endTs && endTs >= startTs) {
      daysToIssue = Math.round(((endTs - startTs) / (1000 * 60 * 60 * 24)) * 10) / 10
    }

    const rawType = String(a.Record_Type || a.RecordType || a.ProjectType || '').toLowerCase()
    let recType: 'Commercial' | 'Residential' = rawType.includes('com') || rawType.includes('non-res') ? 'Commercial' : 'Residential'

    return {
      permitNumber: a.Permit_Number || a.HumanName || `PERMIT-${a.OBJECTID}`,
      projectType: a.ProjectType || 'Permitting',
      recordType: recType,
      recordSubtype: a.Record_Subtype || a.RecordSubType || 'General',
      recordStatus: a.Record_Status || a.Status || 'Unknown',
      valuation: Number(a.Valuation) || 0,
      applicationDate,
      acceptedDate,
      approvedDate,
      issuedDate,
      daysToIssue,
      openYear: year,
      openQuarter: quarter,
      quarter,
      year,
      address: a.Address || '',
      description: a.Description || '',
    }
  })
}

export default async function fetchPermitData() {
  const now = Date.now()

  if (cachedPermitResult && cachedPermitResult.rawPermits?.length > 0 && (now - lastPermitFetchTime < CACHE_DURATION)) {
    return cachedPermitResult
  }

  try {
    const rawPermits = await fetchArcGISPermits()

    const availableSubtypes = [...new Set(rawPermits.map(p => p.recordSubtype).filter(Boolean))].sort()
    
    const allYearsSet = new Set<string>()
    const allQuartersSet = new Set<string>()

    rawPermits.forEach(p => {
      if (p.year) allYearsSet.add(p.year)
      if (p.quarter) allQuartersSet.add(p.quarter)
    })

    const allYears = [...allYearsSet].filter(Boolean).sort()
    const allQuarters = [...allQuartersSet].filter(Boolean).sort((a, b) => {
      const ya = a.match(/\b(20\d{2})\b/)?.[1] ?? ''
      const yb = b.match(/\b(20\d{2})\b/)?.[1] ?? ''
      if (ya !== yb) return ya.localeCompare(yb)
      return a.localeCompare(b)
    })

    const result = {
      rawPermits,
      availableSubtypes,
      allYears: allYears.length > 0 ? allYears : ['2025', '2026'],
      allQuarters,
    }

    cachedPermitResult = result
    lastPermitFetchTime = now
    return result
  } catch (err) {
    console.warn('fetchPermitData live service error:', err)
    return {
      rawPermits: [],
      availableSubtypes: [],
      allYears: ['2025', '2026'],
      allQuarters: ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026'],
    }
  }
}