'use client'

import { useState, useMemo, useEffect } from 'react'
import { areaHeatMetrics, type AreaHeatMetric } from '@/lib/signalsData'
import { useWorkspaceNav, AreaLink } from '../useWorkspaceNav'
import { getAreaMetricsCached } from '@/lib/scoutDataCache'

type SortKey = 'overall' | 'price' | 'volume' | 'demand' | 'supply' | 'yield' | 'sentiment'
type ViewMode = 'grid' | 'table'

interface AreaMetricsResponse {
  areaName: string
  propertyCount: number
  avgPrice: number
  avgPricePerSqft: number
  priceChange7d: number
  priceChange30d: number
  avgDaysOnMarket: number
  inventoryCount: number
  demandScore: number
  topPropertyTypes: Array<{ type: string; count: number }>
  sources: Array<{ source: string; count: number }>
}

interface ComputedAreaHeat extends AreaHeatMetric {
  rawData?: AreaMetricsResponse
}

function getSortValue(metric: AreaHeatMetric, key: SortKey): number {
  switch (key) {
    case 'overall': return metric.overallHeat
    case 'price': return metric.priceHeat
    case 'volume': return metric.volumeHeat
    case 'demand': return metric.demandHeat
    case 'supply': return metric.supplyHeat
    case 'yield': return metric.yieldHeat
    case 'sentiment': return metric.sentimentHeat
    default: return metric.overallHeat
  }
}

function normalizeScore(value: number, min: number, max: number, reverse = false): number {
  if (value === 0 || !isFinite(value)) return 0
  const normalized = ((value - min) / (max - min)) * 100
  const clamped = Math.max(0, Math.min(100, normalized))
  return reverse ? 100 - clamped : clamped
}

function computeHeatFromBackendData(data: AreaMetricsResponse, staticMetric: AreaHeatMetric): ComputedAreaHeat {
  // Price heat: based on avgPricePerSqft (higher price = more heat)
  // Assuming typical range $500-$5000 per sqft
  const priceHeat = data.avgPricePerSqft > 0
    ? normalizeScore(data.avgPricePerSqft, 500, 5000)
    : 0

  // Volume heat: based on propertyCount (more properties = more heat)
  // Assuming typical range 0-10000 properties
  const volumeHeat = data.propertyCount > 0
    ? normalizeScore(data.propertyCount, 0, 10000)
    : 0

  // Demand heat: based on demandScore (direct, already 0-100)
  const demandHeat = data.demandScore >= 0 ? data.demandScore : 0

  // Supply heat: based on inventoryCount (more inventory = cooler, less inventory = hotter)
  // Assuming typical range 0-5000, reverse scaling
  const supplyHeat = data.inventoryCount >= 0
    ? normalizeScore(data.inventoryCount, 0, 5000, true)
    : 0

  // Yield heat: use static data as fallback, or compute from available metrics
  // For now, we'll use a combination of price momentum and demand
  const yieldHeat = data.priceChange30d !== 0 && data.priceChange30d !== undefined
    ? Math.max(0, Math.min(100, 50 + (data.priceChange30d * 2)))
    : staticMetric.yieldHeat

  // Sentiment heat: use static data as fallback
  const sentimentHeat = staticMetric.sentimentHeat

  // Overall heat: weighted composite
  const overallHeat = Math.round(
    priceHeat * 0.25 +
    volumeHeat * 0.20 +
    demandHeat * 0.25 +
    supplyHeat * 0.15 +
    yieldHeat * 0.10 +
    sentimentHeat * 0.05
  )

  return {
    ...staticMetric,
    priceHeat: Math.round(priceHeat),
    volumeHeat: Math.round(volumeHeat),
    demandHeat: Math.round(demandHeat),
    supplyHeat: Math.round(supplyHeat),
    yieldHeat: Math.round(yieldHeat),
    sentimentHeat: Math.round(sentimentHeat),
    overallHeat,
    rawData: data,
  }
}

export default function HeatMapView() {
  const nav = useWorkspaceNav()
  const [sortBy, setSortBy] = useState<SortKey>('overall')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [areas, setAreas] = useState<ComputedAreaHeat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch data from backend API on mount
  useEffect(() => {
    const fetchAreaMetrics = async () => {
      try {
        setLoading(true)
        setError(null)

        const data = await getAreaMetricsCached()

        if (Array.isArray(data) && data.length > 0) {
          // Compute heat scores from backend data and merge with static data
          const computedAreas = data.map((backendData: any) => {
            // Find corresponding static metric for ID and other metadata
            const staticMetric = areaHeatMetrics.find(
              (m) => m.area.toLowerCase() === backendData.areaName.toLowerCase()
            ) || areaHeatMetrics[0]

            return computeHeatFromBackendData(backendData, staticMetric)
          })

          setAreas(computedAreas)
        } else {
          // Fallback to static data if API returns invalid format
          throw new Error('Invalid API response format')
        }
      } catch (err) {
        console.error('Failed to fetch area metrics:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch area metrics')
        // Fallback to static data
        setAreas(areaHeatMetrics as ComputedAreaHeat[])
      } finally {
        setLoading(false)
      }
    }

    fetchAreaMetrics()
  }, [])

  const sortedAreas = useMemo(() => {
    const sorted = [...areas].sort((a, b) => {
      const aVal = getSortValue(a, sortBy)
      const bVal = getSortValue(b, sortBy)
      return typeof bVal === 'number' && typeof aVal === 'number' ? bVal - aVal : 0
    })
    return sorted
  }, [areas, sortBy])

  const topMovers = useMemo(() => {
    const heating = [...areas]
      .sort((a, b) => (b.heatChange30d ?? 0) - (a.heatChange30d ?? 0))
      .slice(0, 3)
    const cooling = [...areas]
      .sort((a, b) => (a.heatChange30d ?? 0) - (b.heatChange30d ?? 0))
      .slice(0, 3)
    return { heating, cooling }
  }, [areas])

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white/[0.01] to-white/[0.005] p-6 gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 style={{ fontFamily: "'Playfair Display', serif" }} className="text-3xl text-white/90">
          Market Heat Map
        </h1>
        <p className="text-sm text-white/70">Area Activity & Momentum Analysis</p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/70 uppercase tracking-wider">Sort by:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="px-3 py-1.5 bg-white/[0.05] border border-white/[0.08] rounded text-xs text-white/90 hover:border-white/[0.15] transition-colors"
          >
            <option value="overall">Overall Heat</option>
            <option value="price">Price</option>
            <option value="volume">Volume</option>
            <option value="demand">Demand</option>
            <option value="supply">Supply</option>
            <option value="yield">Yield</option>
            <option value="sentiment">Sentiment</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`px-3 py-1.5 rounded text-xs uppercase tracking-wider transition-all ${
              viewMode === 'grid'
                ? 'bg-pcis-gold/20 border border-pcis-gold/40 text-pcis-gold'
                : 'bg-white/[0.05] border border-white/[0.08] text-white/70 hover:border-white/[0.15]'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded text-xs uppercase tracking-wider transition-all ${
              viewMode === 'table'
                ? 'bg-pcis-gold/20 border border-pcis-gold/40 text-pcis-gold'
                : 'bg-white/[0.05] border border-white/[0.08] text-white/70 hover:border-white/[0.15]'
            }`}
          >
            Table
          </button>
        </div>
      </div>

      {/* Heat Legend */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white/[0.02] border border-white/[0.04] rounded-lg">
        <span className="text-[8px] text-white/40 uppercase tracking-wider">Cold</span>
        <div className="flex gap-1 flex-1">
          {[0, 25, 50, 75, 100].map((val, i) => (
            <div
              key={i}
              className="flex-1 h-6 rounded"
              style={{ backgroundColor: getHeatColor(val, true) }}
            />
          ))}
        </div>
        <span className="text-[8px] text-white/40 uppercase tracking-wider">Hot</span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block px-4 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04] mb-3">
                <p className="text-sm text-white/70">Loading area metrics...</p>
              </div>
              <div className="flex gap-1 justify-center">
                <div className="w-2 h-2 rounded-full bg-pcis-gold/60 animate-bounce" style={{ animationDelay: '0s' }} />
                <div className="w-2 h-2 rounded-full bg-pcis-gold/60 animate-bounce" style={{ animationDelay: '0.2s' }} />
                <div className="w-2 h-2 rounded-full bg-pcis-gold/60 animate-bounce" style={{ animationDelay: '0.4s' }} />
              </div>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <p className="text-sm text-red-400 mb-2">Failed to load metrics</p>
              <p className="text-xs text-white/50">{error}</p>
              <p className="text-xs text-white/40 mt-2">Showing cached data</p>
            </div>
          </div>
        ) : sortedAreas.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-white/50">No area data available</p>
          </div>
        ) : viewMode === 'grid' ? (
          <HeatGridView areas={sortedAreas} nav={nav} />
        ) : (
          <HeatTableView areas={sortedAreas} sortBy={sortBy} setSortBy={setSortBy} />
        )}
      </div>

      {/* Top Movers */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
          <h3 className="text-xs text-pcis-gold uppercase tracking-wider mb-3">Heating Up</h3>
          <div className="space-y-2">
            {topMovers.heating.map((area) => (
              <AreaLink key={area.areaId} areaId={area.areaId}>
                <div className="flex items-center justify-between p-2 bg-white/[0.02] hover:bg-white/[0.05] rounded transition-colors cursor-pointer">
                  <span className="text-sm text-white/90">{area.shortName}</span>
                  <span className="text-xs text-green-400">▲ +{area.heatChange30d}%</span>
                </div>
              </AreaLink>
            ))}
          </div>
        </div>

        <div className="bg-white/[0.02] border border-white/[0.04] rounded-lg p-4">
          <h3 className="text-xs text-pcis-gold uppercase tracking-wider mb-3">Cooling Down</h3>
          <div className="space-y-2">
            {topMovers.cooling.map((area) => (
              <AreaLink key={area.areaId} areaId={area.areaId}>
                <div className="flex items-center justify-between p-2 bg-white/[0.02] hover:bg-white/[0.05] rounded transition-colors cursor-pointer">
                  <span className="text-sm text-white/90">{area.shortName}</span>
                  <span className="text-xs text-red-400">▼ {area.heatChange30d}%</span>
                </div>
              </AreaLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function HeatGridView({
  areas,
  nav,
}: {
  areas: AreaHeatMetric[]
  nav: ReturnType<typeof useWorkspaceNav>
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
      {areas.map((area) => (
        <button
          key={area.areaId}
          onClick={() => nav.openArea(area.areaId)}
          className="text-left bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] rounded-lg p-4 transition-all hover:bg-white/[0.04] group"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="font-medium text-white/90 text-sm">{area.area}</p>
              <p className="text-[8px] text-white/40 uppercase tracking-wider">{area.shortName}</p>
            </div>
            <span className={`text-xs font-semibold ${getTrendColor(area.heatTrend)}`}>
              {getTrendArrow(area.heatTrend)}
            </span>
          </div>

          <div
            className={`rounded-md p-3 mb-3 ${getHeatBg(area.overallHeat)}`}
            style={{ borderLeft: `3px solid ${getHeatColor(area.overallHeat)}` }}
          >
            <p className="text-[8px] text-white/40 uppercase tracking-wider">Heat Score</p>
            <p
              className="text-2xl font-bold tabular-nums"
              style={{ color: getHeatColor(area.overallHeat) }}
            >
              {area.overallHeat === 0 ? '--' : area.overallHeat}
            </p>
          </div>

          <div className="flex gap-1.5 mb-3">
            <HeatDot score={area.priceHeat} label="P" />
            <HeatDot score={area.volumeHeat} label="V" />
            <HeatDot score={area.demandHeat} label="D" />
            <HeatDot score={area.supplyHeat} label="S" />
            <HeatDot score={area.yieldHeat} label="Y" />
            <HeatDot score={area.sentimentHeat} label="SN" />
          </div>

          <div className="text-[8px] text-white/40 space-y-1">
            <div className="flex justify-between">
              <span>30d Change:</span>
              <span className={area.heatChange30d > 0 ? 'text-green-400' : 'text-red-400'}>
                {area.heatChange30d > 0 ? '+' : ''}{area.heatChange30d}%
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}

function HeatTableView({
  areas,
  sortBy,
  setSortBy,
}: {
  areas: AreaHeatMetric[]
  sortBy: SortKey
  setSortBy: (key: SortKey) => void
}) {
  const columnConfig: Record<SortKey, { label: string; width: string }> = {
    overall: { label: 'Overall', width: 'w-20' },
    price: { label: 'Price', width: 'w-16' },
    volume: { label: 'Volume', width: 'w-16' },
    demand: { label: 'Demand', width: 'w-16' },
    supply: { label: 'Supply', width: 'w-16' },
    yield: { label: 'Yield', width: 'w-16' },
    sentiment: { label: 'Sentiment', width: 'w-20' },
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-white/[0.02] border-b border-white/[0.04]">
          <tr>
            <th className="text-left px-4 py-3 text-[8px] text-white/70 uppercase tracking-wider font-medium">
              Area
            </th>
            {(['overall', 'price', 'volume', 'demand', 'supply', 'yield', 'sentiment'] as SortKey[]).map(
              (key) => (
                <th
                  key={key}
                  onClick={() => setSortBy(key)}
                  className={`px-3 py-3 text-[8px] uppercase tracking-wider font-medium cursor-pointer hover:text-white/90 transition-colors ${
                    sortBy === key
                      ? 'text-pcis-gold border-b-2 border-pcis-gold'
                      : 'text-white/50'
                  }`}
                >
                  {columnConfig[key].label}
                </th>
              )
            )}
            <th className="text-right px-4 py-3 text-[8px] text-white/50 uppercase tracking-wider font-medium">
              30d
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.04]">
          {areas.map((area) => (
            <tr key={area.areaId} className="hover:bg-white/[0.02] transition-colors">
              <td className="px-4 py-3 text-white/90 text-sm font-medium">{area.shortName}</td>
              <td
                className="px-3 py-3 text-center tabular-nums font-semibold"
                style={{
                  color: getHeatColor(area.overallHeat),
                  backgroundColor: getHeatColorBg(getHeatColor(area.overallHeat)),
                }}
              >
                {area.overallHeat === 0 ? '--' : area.overallHeat}
              </td>
              <td
                className="px-3 py-3 text-center tabular-nums"
                style={{ color: getHeatColor(area.priceHeat) }}
              >
                {area.priceHeat === 0 ? '--' : area.priceHeat}
              </td>
              <td
                className="px-3 py-3 text-center tabular-nums"
                style={{ color: getHeatColor(area.volumeHeat) }}
              >
                {area.volumeHeat === 0 ? '--' : area.volumeHeat}
              </td>
              <td
                className="px-3 py-3 text-center tabular-nums"
                style={{ color: getHeatColor(area.demandHeat) }}
              >
                {area.demandHeat === 0 ? '--' : area.demandHeat}
              </td>
              <td
                className="px-3 py-3 text-center tabular-nums"
                style={{ color: getHeatColor(area.supplyHeat) }}
              >
                {area.supplyHeat === 0 ? '--' : area.supplyHeat}
              </td>
              <td
                className="px-3 py-3 text-center tabular-nums"
                style={{ color: getHeatColor(area.yieldHeat) }}
              >
                {area.yieldHeat === 0 ? '--' : area.yieldHeat}
              </td>
              <td
                className="px-3 py-3 text-center tabular-nums"
                style={{ color: getHeatColor(area.sentimentHeat) }}
              >
                {area.sentimentHeat === 0 ? '--' : area.sentimentHeat}
              </td>
              <td className="text-right px-4 py-3 text-[8px] tabular-nums">
                <span className={area.heatChange30d > 0 ? 'text-green-400' : 'text-red-400'}>
                  {area.heatChange30d > 0 ? '+' : ''}{area.heatChange30d}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function HeatDot({ score, label }: { score: number; label: string }) {
  const displayScore = score === 0 ? '--' : score
  const title = score === 0 ? `${label}: unavailable` : `${label}: ${score}`

  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center"
      style={{ backgroundColor: getHeatColor(score === 0 ? 0 : score, true) }}
      title={title}
    >
      <span className="text-[7px] text-white/60 font-medium">{label}</span>
    </div>
  )
}

function getHeatColor(score: number, withOpacity = false): string {
  if (score >= 80) return withOpacity ? 'rgba(239, 68, 68, 0.8)' : '#ef4444'
  if (score >= 65) return withOpacity ? 'rgba(249, 115, 22, 0.8)' : '#f97316'
  if (score >= 50) return withOpacity ? 'rgba(245, 158, 11, 0.8)' : '#f59e0b'
  if (score >= 35) return withOpacity ? 'rgba(59, 130, 246, 0.8)' : '#3b82f6'
  return withOpacity ? 'rgba(107, 114, 128, 0.8)' : '#6b7280'
}

function getHeatBg(score: number): string {
  if (score >= 80) return 'bg-red-500/10'
  if (score >= 65) return 'bg-orange-500/10'
  if (score >= 50) return 'bg-amber-500/10'
  if (score >= 35) return 'bg-blue-500/10'
  return 'bg-gray-500/10'
}

function getHeatColorBg(color: string): string {
  if (color === '#ef4444') return 'rgba(239, 68, 68, 0.1)'
  if (color === '#f97316') return 'rgba(249, 115, 22, 0.1)'
  if (color === '#f59e0b') return 'rgba(245, 158, 11, 0.1)'
  if (color === '#3b82f6') return 'rgba(59, 130, 246, 0.1)'
  return 'rgba(107, 114, 128, 0.1)'
}

function getTrendColor(trend: string): string {
  if (trend === 'heating') return 'text-green-400'
  if (trend === 'cooling') return 'text-red-400'
  return 'text-white/40'
}

function getTrendArrow(trend: string): string {
  if (trend === 'heating') return '▲'
  if (trend === 'cooling') return '▼'
  return '—'
}
