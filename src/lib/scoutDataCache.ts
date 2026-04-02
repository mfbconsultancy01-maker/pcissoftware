// =============================================================================
// SCOUT Data Cache — Load once, keep forever, silently refresh every 30 min
// =============================================================================
// All SCOUT panels share this single cache. Data loads once on first access,
// stays available instantly for all panels, and quietly refreshes in the
// background every 30 minutes without any loading spinners.
// =============================================================================

import { p1Api } from './api'

const REFRESH_INTERVAL_MS = 30 * 60 * 1000 // 30 minutes

interface CacheEntry<T> {
  data: T | null
  fetchedAt: number
  promise?: Promise<T> // Deduplicates in-flight requests
}

const cache = new Map<string, CacheEntry<any>>()
let refreshTimer: ReturnType<typeof setInterval> | null = null

// ── Core cache logic ──────────────────────────────────────────────────────

function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  return entry?.data ?? null
}

function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, fetchedAt: Date.now() })
}

/**
 * Fetch with deduplication. Returns cached data instantly if available.
 * Only shows "loading" on the very first fetch — after that, data persists
 * and background refreshes update it silently.
 */
async function fetchWithDedup<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  // Return cached data immediately if we have any
  const cached = getCached<T>(key)
  if (cached !== null) return cached

  // If there's already an in-flight request, wait for it
  const existing = cache.get(key)
  if (existing?.promise) return existing.promise

  // First-ever fetch — this is the only time panels will show loading
  const promise = fetcher().then(data => {
    setCached(key, data)
    return data
  }).catch(err => {
    // Don't blow away existing data on error
    const current = cache.get(key)
    if (current?.data) return current.data as T
    cache.delete(key)
    throw err
  })

  cache.set(key, { data: null, fetchedAt: 0, promise })
  return promise
}

/**
 * Silent background refresh — fetches new data and swaps it in.
 * Never throws, never clears existing data on failure.
 */
async function silentRefresh<T>(key: string, fetcher: () => Promise<T>): Promise<void> {
  try {
    const data = await fetcher()
    if (data !== null && data !== undefined) {
      setCached(key, data)
    }
  } catch {
    // Silently ignore — keep stale data
  }
}

// ── Fetcher functions ─────────────────────────────────────────────────────

const fetchers = {
  areaMetrics: async () => {
    const response = await p1Api.getAreaMetrics()
    if (response?.success && response?.data && Array.isArray(response.data)) {
      return response.data
    }
    return []
  },
  scoutStatus: async () => {
    const response = await p1Api.getSCOUTAgentStatus()
    if (response?.success && response?.data) {
      return response.data
    }
    return null
  },
  scoutAnomalies: async () => {
    const response = await p1Api.getSCOUTAnomalies()
    if (response?.success && response?.data?.anomalies) {
      return response.data.anomalies
    }
    return []
  },
  scoutMacro: async () => {
    const response = await p1Api.getSCOUTMacroContext()
    if (response?.success && response?.data) {
      return response.data
    }
    return null
  },
}

// ── Background refresh loop ───────────────────────────────────────────────

function startBackgroundRefresh(): void {
  if (refreshTimer) return // Already running

  refreshTimer = setInterval(() => {
    console.log('[SCOUT Cache] Background refresh starting...')
    // Refresh all cached keys silently
    const keys = Array.from(cache.keys())
    keys.forEach(key => {
      const entry = cache.get(key)
      if (entry?.data !== null && key in fetchers) {
        silentRefresh(key, fetchers[key as keyof typeof fetchers])
      }
    })
  }, REFRESH_INTERVAL_MS)
}

// ── Public API ─────────────────────────────────────────────────────────────

export async function getAreaMetricsCached() {
  startBackgroundRefresh()
  return fetchWithDedup('areaMetrics', fetchers.areaMetrics)
}

export async function getSCOUTStatusCached() {
  startBackgroundRefresh()
  return fetchWithDedup('scoutStatus', fetchers.scoutStatus)
}

export async function getSCOUTAnomaliesCached() {
  startBackgroundRefresh()
  return fetchWithDedup('scoutAnomalies', fetchers.scoutAnomalies)
}

export async function getSCOUTMacroContextCached() {
  startBackgroundRefresh()
  return fetchWithDedup('scoutMacro', fetchers.scoutMacro)
}

/** Force-clear all cached data (e.g., after a scrape run completes) */
export function clearSCOUTCache(): void {
  cache.clear()
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
}
