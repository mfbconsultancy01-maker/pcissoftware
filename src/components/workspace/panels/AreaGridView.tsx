'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { areas as staticAreas, type AreaProfile } from '@/lib/marketData'
import { getAreaMetricsCached } from '@/lib/scoutDataCache'
import { useWorkspaceNav } from '../useWorkspaceNav'

// ============================================================================
// PCIS Area Intelligence — Overview Grid
// ============================================================================
// Terminal-style grid showing all Dubai areas at a glance. Bloomberg-grade
// density with demand, pricing, yield, liquidity, service charges, community
// maturity, and sparklines. Click any area → opens full Area Profile panel.
// Fetches real data from backend API, with fallback to static data.
// ============================================================================

function Sparkline({ data, color, width = 56, height = 16 }: {
  data: number[]; color: string; width?: number; height?: number
}) {
  if (!data.length) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 2) - 1
    return `${x},${y}`
  }).join(' ')
  const lastX = width
  const lastY = height - ((data[data.length - 1] - min) / range) * (height - 2) - 1
  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r="2" fill={color} />
    </svg>
  )
}

function DemandBar({ score, trend }: { score: number; trend: string }) {
  const color = score >= 85 ? '#22c55e' : score >= 70 ? '#3b82f6' : score >= 55 ? '#f59e0b' : '#ef4444'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
      </div>
      <span className="text-[10px] font-bold tabular-nums" style={{ color }}>{score}</span>
      <span className="text-[8px]" style={{ color: trend === 'rising' ? '#22c55e' : trend === 'falling' ? '#ef4444' : '#6b7280' }}>
        {trend === 'rising' ? '▲' : trend === 'falling' ? '▼' : '—'}
      </span>
    </div>
  )
}

function formatPct(n: number): string {
  if (n === 0 || !n) return '--'
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

type SortKey = 'demand' | 'price' | 'yield' | 'volume' | 'liquidity' | 'name'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'demand', label: 'Demand' },
  { key: 'price', label: 'Price' },
  { key: 'yield', label: 'Yield' },
  { key: 'volume', label: 'Volume' },
  { key: 'liquidity', label: 'Liquidity' },
  { key: 'name', label: 'Name' },
]

// ============================================================================
// Transform backend API response to internal AreaProfile format
// ============================================================================

interface BackendAreaMetrics {
  areaName: string
  propertyCount: number
  avgPrice: number
  medianPrice: number
  avgPricePerSqft: number
  priceChange7d: number
  priceChange30d: number
  avgDaysOnMarket: number
  inventoryCount: number
  highOpportunityCount: number
  demandScore: number
  topPropertyTypes: Array<{ type: string; count: number }>
  sources: Array<{ source: string; count: number }>
}

function mergeBackendWithStatic(backendData: BackendAreaMetrics[], staticAreas: AreaProfile[]): AreaProfile[] {
  return backendData.map(backend => {
    // Try to find matching static area by name
    const staticMatch = staticAreas.find(
      s => s.name.toUpperCase() === backend.areaName.toUpperCase() ||
      s.shortName?.toUpperCase() === backend.areaName.toUpperCase()
    )

    // Generate reasonable defaults for missing fields
    const priceHistory = staticMatch?.priceHistory || Array.from({ length: 30 }, () => backend.avgPricePerSqft + (Math.random() - 0.5) * 100)
    const demandHistory = staticMatch?.demandHistory || Array.from({ length: 30 }, () => backend.demandScore + (Math.random() - 0.5) * 10)
    const volumeHistory = staticMatch?.volumeHistory || Array.from({ length: 30 }, () => backend.propertyCount / 30 + (Math.random() - 0.5) * 50)

    return {
      id: staticMatch?.id || `area-${backend.areaName.toLowerCase().replace(/\s+/g, '-')}`,
      name: backend.areaName,
      shortName: staticMatch?.shortName || backend.areaName.split(' ')[0],
      subAreas: staticMatch?.subAreas || [],
      demandScore: backend.demandScore,
      demandTrend: backend.priceChange30d > 0 ? 'rising' : backend.priceChange30d < 0 ? 'falling' : 'stable',
      avgPriceSqft: backend.avgPricePerSqft,
      priceChange30d: backend.priceChange30d,
      priceChangeYoY: staticMatch?.priceChangeYoY || backend.priceChange30d * 0.8, // Estimate YoY from 30d
      avgRentalYield: staticMatch?.avgRentalYield || 4.5, // Default yield
      transactionCount90d: backend.propertyCount, // Use property count as proxy
      totalInventory: backend.inventoryCount,
      cashPercent: staticMatch?.cashPercent || 35,
      topPropertyType: backend.topPropertyTypes?.[0]?.type || 'Apartment',
      outlook: backend.demandScore >= 75 ? 'bullish' : backend.demandScore >= 55 ? 'neutral' : 'bearish',
      priceHistory,
      demandHistory,
      volumeHistory,
      liquidity: staticMatch?.liquidity || {
        liquidityScore: Math.round((backend.inventoryCount / Math.max(backend.propertyCount, 1)) * 100),
        absorptionRate: backend.propertyCount > 0 ? backend.inventoryCount / backend.propertyCount : 0,
        avgDaysToSell: backend.avgDaysOnMarket || undefined,
        avgDaysOnMarket: backend.avgDaysOnMarket || 0,
      },
      community: staticMatch?.community || {
        maturityLevel: backend.propertyCount > 500 ? 'Established' : backend.propertyCount > 100 ? 'Maturing' : 'Emerging',
      },
      regulatory: staticMatch?.regulatory || { isFreehold: true },
      rental: staticMatch?.rental || { avgRent: 60000, occupancyRate: 85, rentChange: 2.5 },
      serviceCharges: staticMatch?.serviceCharges || { avgPerSqft: 25 },
      supplyPipeline: staticMatch?.supplyPipeline || [],
    } as AreaProfile
  })
}

export default function AreaGridView() {
  const nav = useWorkspaceNav()
  const [sortBy, setSortBy] = useState<SortKey>('demand')
  const [search, setSearch] = useState('')
  const [areas, setAreas] = useState<AreaProfile[]>(staticAreas)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch real data on mount
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getAreaMetricsCached()

        if (Array.isArray(data) && data.length > 0) {
          // Merge backend data with static data for enrichment
          const mergedAreas = mergeBackendWithStatic(data, staticAreas)
          setAreas(mergedAreas)
        } else {
          // API failed or no data, fall back to static
          console.warn('Failed to fetch real area metrics, using static data')
          setAreas(staticAreas)
        }
      } catch (err) {
        console.error('Error fetching area metrics:', err)
        setError('Failed to load real-time area data')
        setAreas(staticAreas) // Fallback to static
      } finally {
        setLoading(false)
      }
    }

    fetchAreas()
  }, [])

  // Helper to safely extract liquidity score
  const getLiquidityScore = (a: AreaProfile): number => {
    const liq = a.liquidity as any
    return liq?.liquidityScore ?? Math.round((liq?.absorptionRate ?? 0) * 100)
  }

  const sorted = useMemo(() => {
    let result = [...areas]
    if (search) {
      const q = search.toLowerCase()
      result = result.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.shortName.toLowerCase().includes(q) ||
        (a.subAreas || []).some(s => s.toLowerCase().includes(q))
      )
    }
    switch (sortBy) {
      case 'demand': return result.sort((a, b) => b.demandScore - a.demandScore)
      case 'price': return result.sort((a, b) => b.avgPriceSqft - a.avgPriceSqft)
      case 'yield': return result.sort((a, b) => b.avgRentalYield - a.avgRentalYield)
      case 'volume': return result.sort((a, b) => b.transactionCount90d - a.transactionCount90d)
      case 'liquidity': return result.sort((a, b) => getLiquidityScore(b) - getLiquidityScore(a))
      case 'name': return result.sort((a, b) => a.name.localeCompare(b.name))
    }
  }, [sortBy, search, areas])

  const totalInventory = areas.reduce((s, a) => s + a.totalInventory, 0)
  const totalTransactions = areas.reduce((s, a) => s + a.transactionCount90d, 0)
  const avgDemand = Math.round(areas.reduce((s, a) => s + a.demandScore, 0) / areas.length)
  const avgYield = (areas.reduce((s, a) => s + a.avgRentalYield, 0) / areas.length).toFixed(1)
  const avgLiquidity = Math.round(areas.reduce((s, a) => s + getLiquidityScore(a), 0) / areas.length)

  return (
    <div className="h-full flex flex-col">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-shrink-0 pb-3 border-b border-pcis-border/10">
        <div>
          <h2 className="text-lg font-semibold text-pcis-text tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            Area Intelligence
          </h2>
          <p className="text-[10px] text-pcis-text-muted tracking-wider uppercase mt-0.5">
            Dubai Real Estate Market · {areas.length} Areas Monitored {loading && '(Loading...)'}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {[
            { label: 'Avg Demand', value: String(avgDemand) },
            { label: 'Avg Yield', value: `${avgYield}%` },
            { label: 'Avg Liquidity', value: String(avgLiquidity) },
            { label: 'Total Listings', value: totalInventory.toLocaleString() },
            { label: '90d Txns', value: totalTransactions.toLocaleString() },
          ].map(s => (
            <div key={s.label} className="text-right">
              <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider block">{s.label}</span>
              <span className="text-sm font-bold text-pcis-text tabular-nums">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="flex items-center gap-3 py-2.5 flex-shrink-0">
        <div className="relative flex-1 max-w-xs">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-pcis-text-muted">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M10.5 10.5L15 15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input type="text" placeholder="Search areas..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-7 bg-white/[0.03] border border-pcis-border/20 rounded-lg pl-8 pr-3 text-[11px] text-pcis-text placeholder-pcis-text-muted/40 outline-none focus:border-pcis-gold/30" />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[8px] text-pcis-text-muted/60 uppercase tracking-wider mr-1">Sort</span>
          {SORT_OPTIONS.map(opt => (
            <button key={opt.key} onClick={() => setSortBy(opt.key)}
              className={`text-[8px] tracking-wider px-2 py-1 rounded-md transition-colors ${
                sortBy === opt.key
                  ? 'text-pcis-gold bg-pcis-gold/[0.08] border border-pcis-gold/20 font-bold'
                  : 'text-pcis-text-muted border border-transparent hover:bg-white/[0.03]'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading State ── */}
      {loading && (
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="text-center">
            <div className="inline-block w-8 h-8 border-2 border-pcis-gold/20 border-t-pcis-gold rounded-full animate-spin mb-2"></div>
            <span className="text-pcis-text-muted text-sm">Loading real-time area metrics...</span>
          </div>
        </div>
      )}

      {/* ── Error State ── */}
      {error && !loading && (
        <div className="flex-1 flex items-center justify-center min-h-0">
          <div className="text-center">
            <span className="text-red-400/60 text-sm mb-2 block">{error}</span>
            <span className="text-pcis-text-muted text-xs">Using cached static data</span>
          </div>
        </div>
      )}

      {/* ── Grid ── */}
      {!loading && (
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 pb-2">
            {sorted.map((area) => (
              <AreaCard key={area.id} area={area} onClick={() => nav.openArea(area.id)} />
            ))}
          </div>
          {sorted.length === 0 && (
            <div className="text-center py-12">
              <span className="text-pcis-text-muted/40 text-sm">No areas match your search</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Area Card — compact but info-dense
// ---------------------------------------------------------------------------

function AreaCard({ area, onClick }: { area: AreaProfile; onClick: () => void }) {
  const outlookColor = area.outlook === 'bullish' ? '#22c55e' : area.outlook === 'bearish' ? '#ef4444' : '#f59e0b'
  const priceColor = area.priceChange30d >= 0 ? '#22c55e' : '#ef4444'
  const yoyColor = area.priceChangeYoY >= 0 ? '#22c55e' : '#ef4444'
  // Safe access: real data has absorptionRate instead of liquidityScore
  const liq = area.liquidity as any
  const liqScore = liq?.liquidityScore ?? Math.round((liq?.absorptionRate ?? 0) * 100)
  const liqColor = liqScore >= 75 ? '#22c55e' : liqScore >= 50 ? '#3b82f6' : liqScore >= 30 ? '#f59e0b' : '#ef4444'
  // Safe access: real data may not have maturityLevel
  const comm = area.community as any
  const maturityLevel = comm?.maturityLevel || (area.transactionCount90d > 500 ? 'Established' : area.transactionCount90d > 100 ? 'Maturing' : 'Emerging')
  const matColor = maturityLevel === 'Established' ? '#22c55e' : maturityLevel === 'Maturing' ? '#3b82f6' : '#f59e0b'

  // Format days on market: show "New" if 0, otherwise show formatted days
  const daysOnMarketDisplay = (area.liquidity as any)?.avgDaysOnMarket === 0 ? 'New' : `${(area.liquidity as any)?.avgDaysOnMarket || 0}d`

  return (
    <button onClick={onClick}
      className="w-full text-left bg-white/[0.02] border border-pcis-border/20 rounded-xl p-3.5 hover:bg-white/[0.04] hover:border-pcis-gold/20 transition-all group">

      {/* Row 1: Name + badges */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold tracking-wider text-pcis-gold/60 bg-pcis-gold/[0.06] px-1.5 py-0.5 rounded">
            {area.shortName}
          </span>
          <div>
            <h3 className="text-[13px] font-semibold text-pcis-text group-hover:text-pcis-gold transition-colors" style={{ fontFamily: "'Playfair Display', serif" }}>
              {area.name}
            </h3>
            <span className="text-[8px] text-pcis-text-muted">
              {maturityLevel} · {(area.regulatory as any)?.tenure || ((area.regulatory as any)?.isFreehold ? 'Freehold' : 'Leasehold')} · {area.topPropertyType}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ color: matColor, background: matColor + '12', border: `1px solid ${matColor}20` }}>
            {maturityLevel}
          </span>
          <span className="text-[7px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ color: outlookColor, background: outlookColor + '12', border: `1px solid ${outlookColor}20` }}>
            {area.outlook}
          </span>
        </div>
      </div>

      {/* Row 2: Demand bar */}
      <DemandBar score={area.demandScore} trend={area.demandTrend} />

      {/* Row 3: 7-column metrics */}
      <div className="grid grid-cols-7 gap-2 mt-2.5">
        <div>
          <span className="text-[7px] text-pcis-text-muted/50 uppercase tracking-wider block">AED/sqft</span>
          <span className="text-[11px] font-bold text-pcis-text tabular-nums">{area.avgPriceSqft.toLocaleString()}</span>
          <span className="text-[8px] tabular-nums block" style={{ color: priceColor }}>{formatPct(area.priceChange30d)}</span>
        </div>
        <div>
          <span className="text-[7px] text-pcis-text-muted/50 uppercase tracking-wider block">Yield</span>
          <span className="text-[11px] font-bold text-pcis-text tabular-nums">{area.avgRentalYield}%</span>
          <span className="text-[8px] text-pcis-text-muted tabular-nums block">{(area.rental as any)?.avgRent ? `${((area.rental as any).avgRent / 1000).toFixed(0)}k/yr` : 'gross'}</span>
        </div>
        <div>
          <span className="text-[7px] text-pcis-text-muted/50 uppercase tracking-wider block">YoY</span>
          <span className="text-[11px] font-bold tabular-nums" style={{ color: yoyColor }}>{formatPct(area.priceChangeYoY)}</span>
        </div>
        <div>
          <span className="text-[7px] text-pcis-text-muted/50 uppercase tracking-wider block">Liquidity</span>
          <span className="text-[11px] font-bold tabular-nums" style={{ color: liqColor }}>{liqScore}</span>
          <span className="text-[8px] text-pcis-text-muted tabular-nums block">{daysOnMarketDisplay} avg</span>
        </div>
        <div>
          <span className="text-[7px] text-pcis-text-muted/50 uppercase tracking-wider block">Svc Chg</span>
          <span className="text-[11px] font-bold text-pcis-text tabular-nums">{(area.serviceCharges as any)?.avgPerSqft || (area.serviceCharges as any)?.avg || '—'}</span>
          <span className="text-[8px] text-pcis-text-muted tabular-nums block">AED/sqft</span>
        </div>
        <div>
          <span className="text-[7px] text-pcis-text-muted/50 uppercase tracking-wider block">Occupancy</span>
          <span className="text-[11px] font-bold text-pcis-text tabular-nums">{(area.rental as any)?.occupancyRate ? `${(area.rental as any).occupancyRate}%` : '—'}</span>
          <span className="text-[8px] text-pcis-text-muted tabular-nums block">{(area.rental as any)?.rentChange ? `${(area.rental as any).rentChange > 0 ? '+' : ''}${(area.rental as any).rentChange}%` : `${area.cashPercent}% cash`}</span>
        </div>
        <div>
          <span className="text-[7px] text-pcis-text-muted/50 uppercase tracking-wider block">90d Txns</span>
          <span className="text-[11px] font-bold text-pcis-text tabular-nums">{area.transactionCount90d}</span>
          <span className="text-[8px] text-pcis-text-muted tabular-nums block">{area.cashPercent}% cash</span>
        </div>
      </div>

      {/* Row 4: Sparklines + pipeline hint */}
      <div className="flex items-center gap-3 mt-2.5 pt-2 border-t border-pcis-border/10">
        <div className="flex items-center gap-1">
          <span className="text-[7px] text-pcis-text-muted/40 uppercase">Price</span>
          <Sparkline data={area.priceHistory} color={priceColor} width={48} height={14} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[7px] text-pcis-text-muted/40 uppercase">Demand</span>
          <Sparkline data={area.demandHistory} color={area.demandTrend === 'rising' ? '#22c55e' : area.demandTrend === 'falling' ? '#ef4444' : '#3b82f6'} width={48} height={14} />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-[7px] text-pcis-text-muted/40 uppercase">Vol</span>
          <Sparkline data={area.volumeHistory} color="#8b5cf6" width={48} height={14} />
        </div>
        {(area.supplyPipeline || []).length > 0 && (
          <span className="text-[7px] text-pcis-text-muted/40 ml-1">
            {area.supplyPipeline.reduce((s: number, p: any) => s + (p.totalUnits || 0), 0).toLocaleString()} units pipeline
          </span>
        )}
        <div className="ml-auto">
          <span className="text-[7px] text-pcis-gold/30 group-hover:text-pcis-gold/80 transition-colors tracking-wider">OPEN PROFILE →</span>
        </div>
      </div>
    </button>
  )
}
