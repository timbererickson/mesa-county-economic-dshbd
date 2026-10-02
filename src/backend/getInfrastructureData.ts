import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export interface InfrastructureProject {
  id: string
  projectName: string
  jurisdiction: string
  category: string
  projectDes?: string
  summary: string
  status: string
  percentComplete: number
  targetQuarter: string
  reportingQuarter: string
  quarter: string
  year: string
  milestones: string
  shovelReady: string
  estimatedBudget: number | null
  location: string
  leadAgency: string
  utilityImpact: string
  contractor?: string
  contactName?: string
  contactEmail?: string
  startDate?: string
  finishDate?: string
  projectType?: string
  utilityType?: string
  geometryType?: string
  coordinates?: any
}

export const SUPABASE_PROJECT_ID = 'wwbskqhbnprpjibnuxja'
export const SUPABASE_TABLE_NAME = 'map_features'
export const SUPABASE_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_m2N_k8khbzlRa4N_assb3g_AACvcXsn'

let supabaseClient: SupabaseClient | null = null

function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false },
    })
  }
  return supabaseClient
}

/**
 * Calculates Quarter and Year string from an ISO date string (YYYY-MM-DD)
 */
function dateToQuarterYear(dateStr?: string): { quarter: string; year: string } {
  if (!dateStr) return { quarter: 'Ongoing', year: '' }
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return { quarter: dateStr, year: '' }
  const y = d.getFullYear().toString()
  const m = d.getMonth() + 1
  let q = 'Q1'
  if (m >= 4 && m <= 6) q = 'Q2'
  else if (m >= 7 && m <= 9) q = 'Q3'
  else if (m >= 10 && m <= 12) q = 'Q4'
  return { quarter: `${q} ${y}`, year: y }
}

/**
 * Normalizes live Supabase map_features row into standard InfrastructureProject
 */
function normalizeMapFeature(row: Record<string, any>): InfrastructureProject | null {
  const attr = row.attributes || {}

  // Filter: strictly "Jurisdicti" or "Jurisdiction" = "Mesa County"
  const rawJurisdiction =
    attr.Jurisdicti ||
    attr.Jurisdiction ||
    attr.jurisdiction ||
    attr.jurisdicti ||
    row.Jurisdicti ||
    row.Jurisdiction ||
    (row.name && String(row.name).toLowerCase().includes('mesa county') ? 'Mesa County' : '')

  const jClean = String(rawJurisdiction || '').trim().toLowerCase()
  const isMesaCounty = jClean === 'mesa county' || jClean.includes('mesa count')

  if (!isMesaCounty) {
    return null
  }

  const projectName =
    attr.ProjectName ||
    attr.name ||
    row.name ||
    `Project ${row.id ? String(row.id).slice(0, 8) : ''}`

  const category =
    row.category ||
    attr.AssetType ||
    attr.category ||
    attr.UtilityType ||
    attr.ProjectType ||
    'Roadway / Infrastructure'

  const startDate = attr.StartDate || ''
  const finishDate = attr.FinishDate || ''
  const { quarter: targetQuarter, year } = dateToQuarterYear(finishDate || startDate)

  // Budget
  let estimatedBudget: number | null = null
  if (attr.DollarsObl != null) {
    const n = Number(attr.DollarsObl)
    if (!isNaN(n)) estimatedBudget = n
  } else if (attr.budget != null) {
    const n = Number(attr.budget)
    if (!isNaN(n)) estimatedBudget = n
  }

  const status = attr.ProjectStatus || attr.status || 'Active'

  // Estimate progress if not provided
  let percentComplete = 0
  const sLower = status.toLowerCase()
  if (sLower.includes('complete')) percentComplete = 100
  else if (sLower.includes('construction') || sLower.includes('active')) percentComplete = 60
  else if (sLower.includes('design') || sLower.includes('bid')) percentComplete = 30
  else percentComplete = 10

  // Project details from ProjectDes
  const projectDes =
    attr.ProjectDes ||
    attr.projectDes ||
    attr.ProjectDesc ||
    attr.projectDesc ||
    attr.ProjectDescription ||
    attr.projectDescription ||
    row.ProjectDes ||
    row.projectDes ||
    ''

  const summaryParts: string[] = []
  if (attr.ProjectType) summaryParts.push(`Type: ${attr.ProjectType}`)
  if (attr.UtilityType && attr.UtilityType !== 'N/A') summaryParts.push(`Utility: ${attr.UtilityType}`)
  if (startDate && finishDate) summaryParts.push(`Timeline: ${startDate} to ${finishDate}`)
  if (attr.AssetType) summaryParts.push(`Asset: ${attr.AssetType}`)
  const fallbackSummary = summaryParts.join(' • ') || attr.description || 'Mesa County utility mapping & capital project.'

  const summary = projectDes || fallbackSummary

  return {
    id: row.id || String(Math.random()),
    projectName,
    jurisdiction: 'Mesa County',
    category,
    projectDes,
    summary,
    status,
    percentComplete,
    targetQuarter,
    reportingQuarter: targetQuarter,
    quarter: targetQuarter,
    year,
    milestones: attr.ProjectStatus ? `Status: ${attr.ProjectStatus}` : 'Active in utility mapping.',
    shovelReady: attr.UtilityType && attr.UtilityType !== 'N/A' ? `Coordinates with ${attr.UtilityType} network.` : '',
    estimatedBudget,
    location: 'Mesa County, CO',
    leadAgency: attr.ContactName ? `${attr.ContactName}` : 'Mesa County',
    utilityImpact: attr.UtilityType ? `Utility classification: ${attr.UtilityType}` : 'Utility mapping corridor',
    contractor: attr.ContactName,
    contactName: attr.ContactName,
    contactEmail: attr.ContactEmail,
    startDate,
    finishDate,
    projectType: attr.ProjectType,
    utilityType: attr.UtilityType,
    geometryType: row.geometry_type || attr.geometryType,
    coordinates: row.geom?.coordinates,
  }
}

/**
 * Fetches real infrastructure projects from Supabase map_features table
 */
export async function fetchInfrastructureProjects(): Promise<InfrastructureProject[]> {
  try {
    const supabase = getSupabaseClient()

    const { data, error } = await supabase
      .from(SUPABASE_TABLE_NAME)
      .select('*')

    if (error) {
      console.error('Supabase query error:', error)
      return []
    }

    if (Array.isArray(data)) {
      const mapped = data
        .map(row => normalizeMapFeature(row))
        .filter((p): p is InfrastructureProject => p !== null)

      return mapped
    }

    return []
  } catch (err) {
    console.error('Failed to fetch from Supabase:', err)
    return []
  }
}
