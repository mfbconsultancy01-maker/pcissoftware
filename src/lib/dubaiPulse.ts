// =============================================================================
// Dubai Pulse — Unified API Service
// =============================================================================
// Central service for all Dubai Pulse open data APIs (DLD, DTCM, GDRFA, DSC).
// Handles OAuth token generation, automatic refresh, and request management.
//
// Auth flow:
//   1. Register at dubaipulse.gov.ae → receive API Key + API Secret
//   2. POST to /oauth/client_credential/accesstoken → receive Bearer token
//   3. Token expires after ~30 minutes → auto-refresh on 401
//
// Environment variables required:
//   NEXT_PUBLIC_DUBAI_PULSE_API_KEY    — your API key from Dubai Pulse
//   DUBAI_PULSE_API_SECRET             — your API secret (server-side only)
// =============================================================================

const DUBAI_PULSE_BASE = 'https://api.dubaipulse.gov.ae'
const TOKEN_ENDPOINT = `${DUBAI_PULSE_BASE}/oauth/client_credential/accesstoken?grant_type=client_credentials`

// ---------------------------------------------------------------------------
// Token Management
// ---------------------------------------------------------------------------

interface TokenState {
  accessToken: string | null
  expiresAt: number // unix timestamp in ms
}

let tokenState: TokenState = {
  accessToken: null,
  expiresAt: 0,
}

/**
 * Generate or refresh the Dubai Pulse Bearer token.
 * Called automatically when token is missing or expired.
 */
async function getAccessToken(): Promise<string | null> {
  const now = Date.now()

  // Return cached token if still valid (with 60s buffer)
  if (tokenState.accessToken && tokenState.expiresAt > now + 60_000) {
    return tokenState.accessToken
  }

  const apiKey = process.env.NEXT_PUBLIC_DUBAI_PULSE_API_KEY
  const apiSecret = process.env.DUBAI_PULSE_API_SECRET

  if (!apiKey || !apiSecret) {
    console.warn('[DubaiPulse] Missing API credentials. Set NEXT_PUBLIC_DUBAI_PULSE_API_KEY and DUBAI_PULSE_API_SECRET.')
    return null
  }

  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `client_id=${encodeURIComponent(apiKey)}&client_secret=${encodeURIComponent(apiSecret)}`,
    })

    if (!res.ok) {
      console.error(`[DubaiPulse] Token request failed: ${res.status} ${res.statusText}`)
      return null
    }

    const data = await res.json()
    const expiresIn = parseInt(data.expires_in || '1800') // default 30 min
    tokenState = {
      accessToken: data.access_token,
      expiresAt: now + expiresIn * 1000,
    }

    return tokenState.accessToken
  } catch (err) {
    console.error('[DubaiPulse] Token generation error:', err)
    return null
  }
}

/**
 * Force-clear the token (e.g. after a 401 response)
 */
function invalidateToken() {
  tokenState = { accessToken: null, expiresAt: 0 }
}

// ---------------------------------------------------------------------------
// Request Handler
// ---------------------------------------------------------------------------

export interface DubaiPulseQueryParams {
  offset?: number
  limit?: number
  filters?: Record<string, string | number>
}

/**
 * Make an authenticated request to any Dubai Pulse API endpoint.
 * Automatically handles token refresh on 401.
 *
 * @param datasetPath — the dataset path e.g. "open/dld/dld_transactions-open-api"
 * @param params — optional query params (offset, limit, filters)
 * @returns parsed JSON response or null on failure
 */
export async function dubaiPulseRequest(
  datasetPath: string,
  params?: DubaiPulseQueryParams,
): Promise<any | null> {
  const token = await getAccessToken()
  if (!token) return null

  // Build URL with query params
  const url = new URL(`${DUBAI_PULSE_BASE}/${datasetPath}`)
  if (params?.offset !== undefined) url.searchParams.set('offset', String(params.offset))
  if (params?.limit !== undefined) url.searchParams.set('limit', String(params.limit))
  if (params?.filters) {
    for (const [key, val] of Object.entries(params.filters)) {
      url.searchParams.set(key, String(val))
    }
  }

  try {
    const res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    })

    // Auto-refresh on 401
    if (res.status === 401) {
      invalidateToken()
      const freshToken = await getAccessToken()
      if (!freshToken) return null

      const retry = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${freshToken}`,
          Accept: 'application/json',
        },
      })

      if (!retry.ok) {
        console.error(`[DubaiPulse] Retry failed: ${retry.status} for ${datasetPath}`)
        return null
      }
      return await retry.json()
    }

    if (!res.ok) {
      console.error(`[DubaiPulse] Request failed: ${res.status} for ${datasetPath}`)
      return null
    }

    return await res.json()
  } catch (err) {
    console.error(`[DubaiPulse] Fetch error for ${datasetPath}:`, err)
    return null
  }
}

// ---------------------------------------------------------------------------
// Dataset Paths — All DLD Endpoints
// ---------------------------------------------------------------------------

export const DLD_DATASETS = {
  /** 1.5M+ transactions, 46 columns, updated regularly */
  transactions: 'open/dld/dld_transactions-open-api',
  /** Building records with unit counts */
  buildings: 'open/dld/dld_buildings-open-api',
  /** Individual freehold unit records */
  units: 'open/dld/dld_units-open-api',
  /** Developer projects with status */
  projects: 'open/dld/dld_projects-open-api',
  /** Land registry parcels */
  landRegistry: 'open/dld/dld_land_registry-open-api',
  /** Property valuations */
  valuations: 'open/dld/dld_valuation-open-api',
  /** Licensed brokers */
  brokers: 'open/dld/dld_real_estate_licenses-open-api',
  /** Official residential price index */
  residentialSaleIndex: 'open/dld/dld_residential_sale_index-open-api',
  /** Rental agreements */
  rentals: 'open/dld/dld_rents-open-api',
} as const

// ---------------------------------------------------------------------------
// Dataset Paths — DTCM (Tourism)
// ---------------------------------------------------------------------------

export const DTCM_DATASETS = {
  /** Visitor demographics */
  visitorDemographics: 'open/dtcm/dtcm_divs_visitors_demographics-open-api',
  /** Visitors by nationality */
  visitorsByNationality: 'open/dtcm/dtcm_visitors_count_by_nationality-open-api',
  /** Hotel establishment performance (occupancy, ADR, RevPAR) */
  hotelPerformance: 'open/dtcm/dtcm_hotel_establishment_performance-open-api',
  /** Monthly overseas visitor reports */
  overseasMonthly: 'open/dtcm/dtcm_overseas_overall_monthly_report_fact-open-api',
} as const

// ---------------------------------------------------------------------------
// Dataset Paths — GDRFA (Visa & Immigration)
// ---------------------------------------------------------------------------

export const GDRFA_DATASETS = {
  /** Visa types and issuance */
  visaTypes: 'open/gdrfa/gdrfa_visa_types-open-api',
  /** Dubai ports entry/exit data */
  ports: 'open/gdrfa/gdrfa_dubai_ports-open-api',
} as const

// ---------------------------------------------------------------------------
// Convenience Fetchers
// ---------------------------------------------------------------------------

/**
 * Fetch DLD transactions with optional filters.
 * DLD column names use the original schema (area_name_en, actual_worth, etc.)
 */
export async function fetchDLDTransactions(params?: {
  area?: string
  fromDate?: string   // ISO date string
  toDate?: string     // ISO date string
  propertyType?: string
  transGroup?: string // "Sales", "Mortgage", "Gifts"
  offset?: number
  limit?: number
}) {
  const filters: Record<string, string> = {}
  if (params?.area) filters['area_name_en'] = params.area
  if (params?.fromDate) filters['instance_date_gte'] = params.fromDate
  if (params?.toDate) filters['instance_date_lte'] = params.toDate
  if (params?.propertyType) filters['property_type_en'] = params.propertyType
  if (params?.transGroup) filters['trans_group_en'] = params.transGroup

  return dubaiPulseRequest(DLD_DATASETS.transactions, {
    offset: params?.offset ?? 0,
    limit: params?.limit ?? 200,
    filters,
  })
}

/**
 * Fetch DLD building records
 */
export async function fetchDLDBuildings(params?: {
  area?: string
  offset?: number
  limit?: number
}) {
  const filters: Record<string, string> = {}
  if (params?.area) filters['area_name_en'] = params.area

  return dubaiPulseRequest(DLD_DATASETS.buildings, {
    offset: params?.offset ?? 0,
    limit: params?.limit ?? 500,
    filters,
  })
}

/**
 * Fetch DLD project records
 */
export async function fetchDLDProjects(params?: {
  offset?: number
  limit?: number
}) {
  return dubaiPulseRequest(DLD_DATASETS.projects, {
    offset: params?.offset ?? 0,
    limit: params?.limit ?? 500,
  })
}

/**
 * Fetch DTCM hotel performance data
 */
export async function fetchDTCMHotelPerformance(params?: {
  offset?: number
  limit?: number
}) {
  return dubaiPulseRequest(DTCM_DATASETS.hotelPerformance, {
    offset: params?.offset ?? 0,
    limit: params?.limit ?? 100,
  })
}

/**
 * Fetch DTCM visitor data by nationality
 */
export async function fetchDTCMVisitors(params?: {
  offset?: number
  limit?: number
}) {
  return dubaiPulseRequest(DTCM_DATASETS.visitorsByNationality, {
    offset: params?.offset ?? 0,
    limit: params?.limit ?? 100,
  })
}

/**
 * Fetch GDRFA visa type data
 */
export async function fetchGDRFAVisas(params?: {
  offset?: number
  limit?: number
}) {
  return dubaiPulseRequest(GDRFA_DATASETS.visaTypes, {
    offset: params?.offset ?? 0,
    limit: params?.limit ?? 100,
  })
}

/**
 * Fetch DLD residential sale price index
 */
export async function fetchDLDPriceIndex(params?: {
  offset?: number
  limit?: number
}) {
  return dubaiPulseRequest(DLD_DATASETS.residentialSaleIndex, {
    offset: params?.offset ?? 0,
    limit: params?.limit ?? 200,
  })
}

/**
 * Fetch DLD rental data
 */
export async function fetchDLDRentals(params?: {
  area?: string
  offset?: number
  limit?: number
}) {
  const filters: Record<string, string> = {}
  if (params?.area) filters['area_name_en'] = params.area

  return dubaiPulseRequest(DLD_DATASETS.rentals, {
    offset: params?.offset ?? 0,
    limit: params?.limit ?? 200,
    filters,
  })
}

/**
 * Check if Dubai Pulse credentials are configured
 */
export function isDubaiPulseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_DUBAI_PULSE_API_KEY &&
    process.env.DUBAI_PULSE_API_SECRET
  )
}
