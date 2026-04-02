// =============================================================================
// PCIS P1 — Live API Data Hook
// =============================================================================
// Fetches data from PCISP1 backend with automatic fallback to mock data.
// Import this alongside mockData — if USE_LIVE_API is true and the API
// responds, live data is used. Otherwise, mock data is returned.
// =============================================================================

import { USE_LIVE_API } from './mockData'
import { p1Api } from './api'
import { transformProperty, transformMatch, propertyToIntelItem } from './transforms'

/**
 * Fetch opportunities (properties with scores) from the live API
 * Falls back to null if API is unavailable
 */
export async function fetchOpportunities(params?: { minScore?: number; area?: string; type?: string }) {
  if (!USE_LIVE_API) return null
  try {
    const data = await p1Api.getOpportunities(params)
    if (!data?.success) return null
    return {
      properties: (data.data?.opportunities || data.data || []).map(transformProperty),
      total: data.data?.total || 0,
    }
  } catch { return null }
}

/**
 * Fetch area metrics from the live API
 */
export async function fetchAreaMetrics() {
  if (!USE_LIVE_API) return null
  try {
    const data = await p1Api.getAreaMetrics()
    if (!data?.success) return null
    return data.data || []
  } catch { return null }
}

/**
 * Fetch matches from the live API
 */
export async function fetchMatches(params?: { status?: string }) {
  if (!USE_LIVE_API) return null
  try {
    const data = await p1Api.getMatches(params)
    if (!data?.success) return null
    return {
      matches: (data.data?.matches || data.data || []).map(transformMatch),
      total: data.data?.total || 0,
    }
  } catch { return null }
}

/**
 * Fetch ENGINE status
 */
export async function fetchEngineStatus() {
  if (!USE_LIVE_API) return null
  try {
    const data = await p1Api.getEngineStatus()
    if (!data?.success) return null
    return data.data || null
  } catch { return null }
}

/**
 * Trigger ENGINE run
 */
export async function triggerEngineRun() {
  if (!USE_LIVE_API) return null
  try {
    const data = await p1Api.runEngine()
    return data
  } catch { return null }
}

/**
 * Generate intel feed from live opportunities
 */
export async function fetchIntelFeed() {
  if (!USE_LIVE_API) return null
  try {
    const data = await p1Api.getOpportunities({ minScore: 40, limit: 50 })
    if (!data?.success) return null
    const items = (data.data?.opportunities || data.data || []).map(propertyToIntelItem)
    return items
  } catch { return null }
}

/**
 * Check API health
 */
export async function checkP1Health(): Promise<boolean> {
  if (!USE_LIVE_API) return false
  try {
    const data = await p1Api.health()
    return data?.status === 'ok'
  } catch { return false }
}
