// =============================================================================
// PCIS SCOUT — Live Data Hooks
// =============================================================================
// Data layer for Engine 2 (SCOUT - Market Intelligence).
// Each hook attempts to fetch from Dubai Pulse APIs first, then falls back
// to mock data if the API is unavailable or credentials aren't configured.
//
// Usage in panels:
//   const { transactions, loading, error, isLive } = useScoutTransactions({ area: 'Palm Jumeirah' })
//
// The `isLive` flag tells the panel whether it's showing real or mock data,
// so you can display a "LIVE" or "MOCK" badge in the UI.
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { USE_LIVE_API } from './mockData'
import {
  isDubaiPulseConfigured,
  fetchDLDTransactions,
  fetchDLDBuildings,
  fetchDLDProjects,
  fetchDLDPriceIndex,
  fetchDLDRentals,
  fetchDTCMHotelPerformance,
  fetchDTCMVisitors,
  fetchGDRFAVisas,
} from './dubaiPulse'
import {
  transformDLDTransaction,
  computeAreaAverages,
  computeBuildingAverages,
  aggregateVolumeByMonth,
  aggregateVolumeByArea,
  aggregateVolumeByType,
  type RawDLDTransaction,
} from './dldTransforms'
import { p1Api } from './api'
import type { Transaction, VolumeByPeriod, VolumeByArea, VolumeByType } from './transactionData'

// ---------------------------------------------------------------------------
// Generic hook state
// ---------------------------------------------------------------------------

type DataSource = 'live' | 'backend' | 'embedded' | 'mock'

interface DataState<T> {
  data: T | null
  loading: boolean
  error: string | null
  isLive: boolean
  source: DataSource
}

/**
 * Should we attempt to use the live Dubai Pulse API?
 * Requires both USE_LIVE_API flag and configured credentials.
 */
function shouldUseLiveData(): boolean {
  return USE_LIVE_API && isDubaiPulseConfigured()
}

// ---------------------------------------------------------------------------
// Hook: SCOUT Transactions
// ---------------------------------------------------------------------------

interface TransactionParams {
  area?: string
  fromDate?: string
  toDate?: string
  propertyType?: string
  limit?: number
}

interface TransactionResult {
  transactions: Transaction[]
  volumeByMonth: VolumeByPeriod[]
  volumeByArea: VolumeByArea[]
  volumeByType: VolumeByType[]
  total: number
}

export function useScoutTransactions(params?: TransactionParams): DataState<TransactionResult> & { refetch: () => void } {
  const [state, setState] = useState<DataState<TransactionResult>>({
    data: null,
    loading: true,
    error: null,
    isLive: false,
    source: 'mock',
  })

  const paramsRef = useRef(params)
  paramsRef.current = params

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))

    // ── Tier 1: Dubai Pulse Live API ──────────────────────────────────────
    if (shouldUseLiveData()) {
      try {
        const raw = await fetchDLDTransactions({
          area: paramsRef.current?.area,
          fromDate: paramsRef.current?.fromDate,
          toDate: paramsRef.current?.toDate,
          propertyType: paramsRef.current?.propertyType,
          limit: paramsRef.current?.limit || 500,
        })

        if (raw && Array.isArray(raw)) {
          const rawTransactions = raw as RawDLDTransaction[]
          const firstPass = rawTransactions.map(r => transformDLDTransaction(r))
          const areaAvgs = computeAreaAverages(firstPass)
          const bldgAvgs = computeBuildingAverages(firstPass)
          const transactions = rawTransactions.map(r => transformDLDTransaction(r, areaAvgs, bldgAvgs))
          const volumeByMonth = aggregateVolumeByMonth(transactions)
          const volumeByArea = aggregateVolumeByArea(transactions)
          const volumeByType = aggregateVolumeByType(transactions)

          setState({
            data: { transactions, volumeByMonth, volumeByArea, volumeByType, total: transactions.length },
            loading: false, error: null, isLive: true, source: 'live',
          })
          return
        }
      } catch (err) {
        console.warn('[SCOUT] Live API failed, trying backend:', err)
      }
    }

    // ── Tier 2: P1 Backend (Railway PostgreSQL) ───────────────────────────
    try {
      const res = await p1Api.getPropertiesForScout({
        area: paramsRef.current?.area,
        type: paramsRef.current?.propertyType,
        limit: paramsRef.current?.limit || 500,
      })

      if (res?.success && res.data && Array.isArray(res.data) && res.data.length > 0) {
        // Transform backend Property → SCOUT Transaction format
        const transactions: Transaction[] = res.data.map((p: any) => ({
          id: p.id,
          date: p.createdAt || new Date().toISOString(),
          area: p.area || p.city || 'Unknown',
          areaId: (p.area || 'unknown').toLowerCase().replace(/\s+/g, '-'),
          building: p.building || p.project || '',
          propertyType: mapBackendType(p.type),
          bedrooms: p.bedrooms || 0,
          size: parseFloat(p.sizeSqft) || 0,
          transactionValue: parseFloat(p.priceAmount) || 0,
          priceSqft: parseFloat(p.pricePerSqft) || 0,
          transactionType: 'Sale' as const,
          usageType: (['Office', 'Retail'].includes(p.type) ? 'Commercial' : 'Residential') as 'Residential' | 'Commercial',
          isOffPlan: p.completionStatus === 'OffPlan',
          registrationStatus: 'Registered' as const,
          buyerNationality: 'N/A',
          paymentMethod: 'Cash' as const,
          areaAvgPriceSqft: 0,
          priceVsAreaAvg: 0,
        }))

        // Compute area averages for context
        const areaAvgs = computeAreaAverages(transactions)
        transactions.forEach(t => {
          t.areaAvgPriceSqft = areaAvgs.get(t.area) || 0
          t.priceVsAreaAvg = t.areaAvgPriceSqft > 0
            ? Math.round(((t.priceSqft - t.areaAvgPriceSqft) / t.areaAvgPriceSqft) * 100)
            : 0
        })

        const volumeByMonth = aggregateVolumeByMonth(transactions)
        const volumeByArea = aggregateVolumeByArea(transactions)
        const volumeByType = aggregateVolumeByType(transactions)

        setState({
          data: { transactions, volumeByMonth, volumeByArea, volumeByType, total: res.pagination?.total || transactions.length },
          loading: false, error: null, isLive: true, source: 'backend',
        })
        return
      }
    } catch (err) {
      console.warn('[SCOUT] Backend fetch failed, falling back to embedded data:', err)
    }

    // ── Tier 3: Embedded TypeScript data files ────────────────────────────
    try {
      const { mockTransactionData } = await import('./transactionData')
      if (mockTransactionData?.transactions?.length > 0) {
        setState({
          data: {
            transactions: mockTransactionData.transactions,
            volumeByMonth: mockTransactionData.volumeByMonth,
            volumeByArea: mockTransactionData.volumeByArea,
            volumeByType: mockTransactionData.volumeByType,
            total: mockTransactionData.transactions.length,
          },
          loading: false, error: null, isLive: false, source: 'embedded',
        })
        return
      }
    } catch (err) {
      console.warn('[SCOUT] Embedded data failed, falling back to mock:', err)
    }

    // ── Tier 4: Empty fallback (last resort) ─────────────────────────────
    setState({
      data: { transactions: [], volumeByMonth: [], volumeByArea: [], volumeByType: [], total: 0 },
      loading: false, error: 'No data sources available', isLive: false, source: 'mock' as DataSource,
    })
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return { ...state, refetch: fetchData }
}

/** Map backend property type to SCOUT Transaction propertyType */
function mapBackendType(type: string): Transaction['propertyType'] {
  const map: Record<string, Transaction['propertyType']> = {
    Villa: 'Villa', Apartment: 'Apartment', Penthouse: 'Penthouse',
    Townhouse: 'Townhouse', Plot: 'Land', Commercial: 'Office',
  }
  return map[type] || 'Apartment'
}

// ---------------------------------------------------------------------------
// Hook: SCOUT Areas
// ---------------------------------------------------------------------------

export function useScoutAreas(): DataState<any[]> & { refetch: () => void } {
  const [state, setState] = useState<DataState<any[]>>({
    data: null,
    loading: true,
    error: null,
    isLive: false,
    source: 'mock',
  })

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }))

    // ── Tier 1: Dubai Pulse Live API ──────────────────────────────────────
    if (shouldUseLiveData()) {
      try {
        const [txData, bldgData] = await Promise.all([
          fetchDLDTransactions({ limit: 2000 }),
          fetchDLDBuildings({ limit: 1000 }),
        ])

        if (txData && Array.isArray(txData) && txData.length > 0) {
          const transactions = (txData as RawDLDTransaction[]).map(r => transformDLDTransaction(r))
          const areaAvgs = computeAreaAverages(transactions)

          const areaProfiles = Array.from(areaAvgs.entries()).map(([name, avgPrice]) => {
            const areaTx = transactions.filter(t => t.area === name)
            const totalValue = areaTx.reduce((sum, t) => sum + t.transactionValue, 0)
            return {
              id: areaTx[0]?.areaId || name.toLowerCase().replace(/\s+/g, '-'),
              name, shortName: name.slice(0, 4).toUpperCase(),
              avgPriceSqft: avgPrice, transactionCount90d: areaTx.length,
              avgTransactionValue: areaTx.length > 0 ? Math.round(totalValue / areaTx.length) : 0,
              totalInventory: 0, demandScore: Math.min(100, Math.round(areaTx.length * 2)),
              demandTrend: 'stable' as const, _live: true,
            }
          })

          setState({ data: areaProfiles, loading: false, error: null, isLive: true, source: 'live' })
          return
        }
      } catch (err) {
        console.warn('[SCOUT] Live area data failed, trying backend:', err)
      }
    }

    // ── Tier 2: P1 Backend — build area profiles from properties ──────────
    try {
      // Fetch a large batch to compute area aggregates
      const res = await p1Api.getPropertiesForScout({ limit: 100, page: 1 })
      if (res?.success && res.pagination?.total > 0) {
        // Fetch multiple pages to build area profiles
        const totalPages = Math.min(10, Math.ceil(res.pagination.total / 100))
        const allProperties = [...(res.data || [])]

        // Fetch a few more pages in parallel for better coverage
        if (totalPages > 1) {
          const extraPages = await Promise.all(
            Array.from({ length: Math.min(4, totalPages - 1) }, (_, i) =>
              p1Api.getPropertiesForScout({ limit: 100, page: i + 2 })
            )
          )
          for (const page of extraPages) {
            if (page?.data) allProperties.push(...page.data)
          }
        }

        if (allProperties.length > 0) {
          // Aggregate properties by area
          const areaMap = new Map<string, any[]>()
          for (const p of allProperties) {
            const area = p.area || p.city || 'Unknown'
            if (!areaMap.has(area)) areaMap.set(area, [])
            areaMap.get(area)!.push(p)
          }

          const areaProfiles = Array.from(areaMap.entries()).map(([name, props]) => {
            const prices = props.map((p: any) => parseFloat(p.pricePerSqft) || 0).filter((v: number) => v > 0)
            const values = props.map((p: any) => parseFloat(p.priceAmount) || 0).filter((v: number) => v > 0)
            const avgPriceSqft = prices.length > 0 ? Math.round(prices.reduce((a: number, b: number) => a + b, 0) / prices.length) : 0
            const avgTransactionValue = values.length > 0 ? Math.round(values.reduce((a: number, b: number) => a + b, 0) / values.length) : 0

            return {
              id: name.toLowerCase().replace(/\s+/g, '-'),
              name, shortName: name.slice(0, 4).toUpperCase(),
              avgPriceSqft, transactionCount90d: props.length,
              avgTransactionValue, totalInventory: props.length,
              demandScore: Math.min(100, Math.round(props.length * 0.5)),
              demandTrend: 'stable' as const, _backend: true,
            }
          }).sort((a, b) => b.transactionCount90d - a.transactionCount90d)

          setState({ data: areaProfiles, loading: false, error: null, isLive: true, source: 'backend' })
          return
        }
      }
    } catch (err) {
      console.warn('[SCOUT] Backend area fetch failed, falling back to embedded:', err)
    }

    // ── Tier 3: Embedded TypeScript data ──────────────────────────────────
    try {
      const { areas } = await import('./marketData')
      if (areas?.length > 0) {
        setState({ data: areas, loading: false, error: null, isLive: false, source: 'embedded' })
        return
      }
    } catch {
      console.warn('[SCOUT] Embedded area data failed, using mock')
    }

    // ── Tier 4: Mock ──────────────────────────────────────────────────────
    setState({ data: null, loading: false, error: 'Failed to load area data', isLive: false, source: 'mock' })
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return { ...state, refetch: fetchData }
}

// ---------------------------------------------------------------------------
// Hook: SCOUT Price Index
// ---------------------------------------------------------------------------

export function useScoutPriceIndex(): DataState<any[]> & { refetch: () => void } {
  const [state, setState] = useState<DataState<any[]>>({
    data: null,
    loading: true,
    error: null,
    isLive: false,
    source: 'mock' as DataSource,
  })

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }))

    if (shouldUseLiveData()) {
      try {
        const raw = await fetchDLDPriceIndex({ limit: 200 })
        if (raw && Array.isArray(raw) && raw.length > 0) {
          setState({ data: raw, loading: false, error: null, isLive: true, source: 'live' })
          return
        }
      } catch (err) {
        console.warn('[SCOUT] Price index fetch failed:', err)
      }
    }

    // Fall back to mock price trend data
    try {
      const { priceTrendSeries } = await import('./priceData')
      setState({ data: priceTrendSeries, loading: false, error: null, isLive: false, source: 'embedded' as DataSource })
    } catch {
      setState({ data: null, loading: false, error: 'Failed to load price data', isLive: false, source: 'embedded' as DataSource })
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return { ...state, refetch: fetchData }
}

// ---------------------------------------------------------------------------
// Hook: SCOUT Off-Plan Projects
// ---------------------------------------------------------------------------

export function useScoutProjects(): DataState<any[]> & { refetch: () => void } {
  const [state, setState] = useState<DataState<any[]>>({
    data: null,
    loading: true,
    error: null,
    isLive: false,
    source: 'mock' as DataSource,
  })

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }))

    if (shouldUseLiveData()) {
      try {
        const raw = await fetchDLDProjects({ limit: 500 })
        if (raw && Array.isArray(raw) && raw.length > 0) {
          setState({ data: raw, loading: false, error: null, isLive: true, source: 'live' })
          return
        }
      } catch (err) {
        console.warn('[SCOUT] Projects fetch failed:', err)
      }
    }

    // Fall back to mock
    try {
      const { offPlanProjects } = await import('./offPlanData')
      setState({ data: offPlanProjects, loading: false, error: null, isLive: false, source: 'embedded' as DataSource })
    } catch {
      setState({ data: null, loading: false, error: 'Failed to load project data', isLive: false, source: 'embedded' as DataSource })
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return { ...state, refetch: fetchData }
}

// ---------------------------------------------------------------------------
// Hook: SCOUT Macro — Tourism
// ---------------------------------------------------------------------------

export function useScoutTourism(): DataState<any> & { refetch: () => void } {
  const [state, setState] = useState<DataState<any>>({
    data: null,
    loading: true,
    error: null,
    isLive: false,
    source: 'mock' as DataSource,
  })

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }))

    if (shouldUseLiveData()) {
      try {
        const [hotel, visitors] = await Promise.all([
          fetchDTCMHotelPerformance({ limit: 100 }),
          fetchDTCMVisitors({ limit: 100 }),
        ])

        if (hotel || visitors) {
          setState({
            data: { hotelPerformance: hotel, visitorData: visitors },
            loading: false,
            error: null,
            isLive: true,
            source: 'live',
          })
          return
        }
      } catch (err) {
        console.warn('[SCOUT] Tourism data fetch failed:', err)
      }
    }

    // Fall back to mock
    try {
      const { tourismData } = await import('./macroData')
      setState({ data: tourismData, loading: false, error: null, isLive: false, source: 'embedded' as DataSource })
    } catch {
      setState({ data: null, loading: false, error: 'Failed to load tourism data', isLive: false, source: 'embedded' as DataSource })
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return { ...state, refetch: fetchData }
}

// ---------------------------------------------------------------------------
// Hook: SCOUT Macro — Visa & Population
// ---------------------------------------------------------------------------

export function useScoutVisaData(): DataState<any> & { refetch: () => void } {
  const [state, setState] = useState<DataState<any>>({
    data: null,
    loading: true,
    error: null,
    isLive: false,
    source: 'mock' as DataSource,
  })

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }))

    if (shouldUseLiveData()) {
      try {
        const raw = await fetchGDRFAVisas({ limit: 100 })
        if (raw && Array.isArray(raw) && raw.length > 0) {
          setState({ data: raw, loading: false, error: null, isLive: true, source: 'live' })
          return
        }
      } catch (err) {
        console.warn('[SCOUT] Visa data fetch failed:', err)
      }
    }

    // Fall back to mock
    try {
      const { visaData } = await import('./macroData')
      setState({ data: visaData, loading: false, error: null, isLive: false, source: 'embedded' as DataSource })
    } catch {
      setState({ data: null, loading: false, error: 'Failed to load visa data', isLive: false, source: 'embedded' as DataSource })
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return { ...state, refetch: fetchData }
}

// ---------------------------------------------------------------------------
// Hook: SCOUT Rentals (for yield calculations)
// ---------------------------------------------------------------------------

export function useScoutRentals(area?: string): DataState<any[]> & { refetch: () => void } {
  const [state, setState] = useState<DataState<any[]>>({
    data: null,
    loading: true,
    error: null,
    isLive: false,
    source: 'mock' as DataSource,
  })

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }))

    if (shouldUseLiveData()) {
      try {
        const raw = await fetchDLDRentals({ area, limit: 300 })
        if (raw && Array.isArray(raw) && raw.length > 0) {
          setState({ data: raw, loading: false, error: null, isLive: true, source: 'live' })
          return
        }
      } catch (err) {
        console.warn('[SCOUT] Rental data fetch failed:', err)
      }
    }

    // No mock fallback for rentals — return empty
    setState({ data: [], loading: false, error: null, isLive: false, source: 'embedded' as DataSource })
  }, [area])

  useEffect(() => { fetchData() }, [fetchData])

  return { ...state, refetch: fetchData }
}

// ---------------------------------------------------------------------------
// Utility: Data source indicator component helper
// ---------------------------------------------------------------------------

/**
 * Returns a label for the data source badge.
 * Use in panels: <span className={...}>{getSourceLabel(isLive, source)}</span>
 */
export function getSourceLabel(isLive: boolean, source?: DataSource): string {
  if (source === 'live') return 'DLD LIVE'
  if (source === 'backend') return 'P1 DATABASE'
  if (source === 'embedded') return 'EMBEDDED DATA'
  // Legacy fallback
  return isLive ? 'DLD LIVE' : 'MOCK DATA'
}

/**
 * Returns a color class for the source badge.
 */
export function getSourceColor(isLive: boolean, source?: DataSource): string {
  if (source === 'live') return 'text-green-400 bg-green-500/10 border-green-500/30'
  if (source === 'backend') return 'text-blue-400 bg-blue-500/10 border-blue-500/30'
  if (source === 'embedded') return 'text-amber-400 bg-amber-500/10 border-amber-500/30'
  return isLive
    ? 'text-green-400 bg-green-500/10 border-green-500/30'
    : 'text-white/40 bg-white/[0.04] border-white/[0.06]'
}

export type { DataSource }
