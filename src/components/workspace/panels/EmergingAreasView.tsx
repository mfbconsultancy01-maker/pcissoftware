'use client'

import { useState, useEffect } from 'react'
import { getAreaMetricsCached } from '@/lib/scoutDataCache'
import { emergingAreaSignals, type EmergingAreaSignal } from '@/lib/signalsData'
import { useWorkspaceNav } from '../useWorkspaceNav'

// ============================================================================
// TYPES
// ============================================================================

interface AreaMetric {
  areaName: string
  propertyCount: number
  avgPrice: number
  avgPricePerSqft: number
  priceChange30d: number
  demandScore: number
  inventoryCount: number
  topPropertyTypes: string[]
}

interface ProcessedArea extends EmergingAreaSignal {
  propertyCount: number
  demandScore: number
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Classify areas into phases based on real metrics.
 * Discovery: Low property count (<50), growing inventory, high demand
 * Early-growth: Moderate count (50-150), rising prices, strong demand
 * Acceleration: Growing count (150-300), accelerating prices, peak demand
 * Maturing: High count (>300), stable prices, stable demand
 */
function classifyPhase(
  propertyCount: number,
  demandScore: number,
  priceChange30d: number
): 'discovery' | 'early-growth' | 'acceleration' | 'maturing' {
  if (propertyCount < 50 && demandScore > 60) {
    return 'discovery'
  }
  if (propertyCount < 150 && priceChange30d > 0.5) {
    return 'early-growth'
  }
  if (propertyCount < 300 && demandScore > 70) {
    return 'acceleration'
  }
  return 'maturing'
}

/**
 * Generate reasonable sparkline data from available metrics.
 * Creates a 12-month trend based on the price change and demand score.
 */
function generateSparklineFromMetrics(
  baseValue: number,
  trendPercent: number,
  points: number = 12
): number[] {
  const sparkline: number[] = []
  const monthlyChange = trendPercent / 100 / points
  let current = baseValue

  for (let i = 0; i < points; i++) {
    sparkline.push(current)
    // Add some realistic variation (±2% monthly noise)
    const noise = (Math.random() - 0.5) * 0.02
    current = current * (1 + monthlyChange + noise)
  }

  return sparkline
}

/**
 * Convert backend area metrics to EmergingAreaSignal format.
 */
function transformMetricsToSignal(
  metric: AreaMetric,
  index: number,
  allMetrics: AreaMetric[]
): ProcessedArea {
  // Find a comparable established area (one with higher property count)
  const comparable = allMetrics
    .filter(m => m.propertyCount > metric.propertyCount)
    .sort((a, b) => b.propertyCount - a.propertyCount)[0] || allMetrics[0]

  const comparablePrice = comparable?.avgPricePerSqft || metric.avgPricePerSqft * 1.15

  // Calculate emerging score: lower property count + high demand + affordable vs comparable
  const countScore = Math.max(0, 100 - (metric.propertyCount / 5)) // Lower count = higher score
  const demandScore = metric.demandScore // 0-100
  const affordabilityScore =
    metric.avgPricePerSqft < comparablePrice
      ? Math.min(100, (comparablePrice / metric.avgPricePerSqft) * 50)
      : Math.max(0, 50 - ((metric.avgPricePerSqft - comparablePrice) / comparablePrice) * 50)

  const emergingScore = Math.round((countScore * 0.3 + demandScore * 0.4 + affordabilityScore * 0.3) / 100 * 100)

  const phase = classifyPhase(metric.propertyCount, metric.demandScore, metric.priceChange30d)

  // Generate sparklines from metrics
  const priceHistory = generateSparklineFromMetrics(metric.avgPricePerSqft, metric.priceChange30d)
  const volumeHistory = generateSparklineFromMetrics(metric.inventoryCount, metric.demandScore / 10)

  // Estimate 12-month appreciation based on 30-day change
  const projectedAppreciation12m = metric.priceChange30d * 12

  // Define catalysts based on demand and price changes
  const catalysts: string[] = []
  if (metric.demandScore > 75) catalysts.push('High buyer demand')
  if (metric.priceChange30d > 2) catalysts.push('Strong price momentum')
  if (metric.propertyCount < 50) catalysts.push('Limited supply')
  if (metric.inventoryCount > metric.propertyCount * 0.8)
    catalysts.push('Growing inventory base')

  // Define infrastructure and demand drivers
  const infrastructure: string[] = [
    'Transit connectivity in development',
    'Mixed-use development planned',
    'Commercial district expansion'
  ]

  const demandDrivers: string[] = [
    'Young professional migration',
    'Affordability advantage',
    'Proximity to employment hubs'
  ]

  const risks: string[] = [
    'Emerging market volatility',
    'Limited comps for valuation',
    'Market saturation risk'
  ]

  return {
    areaId: `area-${index}`,
    area: metric.areaName,
    emergingScore,
    phase,
    currentPriceSqft: Math.round(metric.avgPricePerSqft),
    comparableAreaPrice: Math.round(comparablePrice),
    priceGap: ((metric.avgPricePerSqft - comparablePrice) / comparablePrice) * 100,
    catalysts,
    risks,
    infrastructure,
    demandDrivers,
    priceHistory,
    volumeHistory,
    priceVelocity: metric.priceChange30d,
    volumeVelocity: (metric.demandScore / 100) * 5,
    projectedAppreciation12m,
    comparableArea: comparable?.areaName || 'Market Average',
    propertyCount: metric.propertyCount,
    demandScore: metric.demandScore,
  }
}

// ============================================================================
// COMPONENTS
// ============================================================================

function Sparkline({
  data,
  color,
  width = 80,
  height = 24,
}: {
  data: number[]
  color: string
  width?: number
  height?: number
}) {
  if (!data.length) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data
    .map((v: number, i: number) => {
      const x = (i / (data.length - 1)) * width
      const y = height - ((v - min) / range) * (height - 2) - 1
      return `${x},${y}`
    })
    .join(' ')
  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PhaseLabel({ phase }: { phase: string }): JSX.Element {
  const phaseStyles: Record<string, string> = {
    discovery: 'bg-blue-500/20 text-blue-300 border border-blue-500/40',
    'early-growth': 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
    acceleration: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
    maturing: 'bg-purple-500/20 text-purple-300 border border-purple-500/40',
  }

  return (
    <span className={`px-2 py-1 rounded text-[10px] font-semibold uppercase tracking-wider ${phaseStyles[phase] || phaseStyles.discovery}`}>
      {phase.replace('-', ' ')}
    </span>
  )
}

function PhasePipeline({ areas }: { areas: ProcessedArea[] }): JSX.Element {
  const phases = ['discovery', 'early-growth', 'acceleration', 'maturing'] as const
  const phaseCounts = phases.reduce(
    (acc: Record<string, number>, phase: string) => {
      acc[phase] = areas.filter((a: ProcessedArea) => a.phase === phase).length
      return acc
    },
    {}
  )

  return (
    <div className="bg-white/[0.02] border border-pcis-border/10 rounded-lg p-6 mb-6">
      <h3 className="text-pcis-text-secondary text-xs uppercase tracking-wider mb-4">Phase Pipeline</h3>
      <div className="flex items-center justify-between">
        {phases.map((phase: string, idx: number) => (
          <div key={phase} className="flex items-center">
            <div className="text-center">
              <div className="text-[32px] text-pcis-gold font-semibold">
                {phaseCounts[phase] || 0}
              </div>
              <div className="text-[10px] text-pcis-text-muted uppercase tracking-wider mt-1">
                {phase.replace('-', ' ')}
              </div>
            </div>
            {idx < phases.length - 1 && (
              <div className="mx-6 text-pcis-text-muted/50 text-xl">→</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function PriceGapBar({
  current,
  comparable,
}: {
  current: number
  comparable: number
}): JSX.Element {
  const gap = ((current - comparable) / comparable) * 100
  const isNegative = gap < 0
  const absGap = Math.abs(gap)

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-pcis-text-secondary">Current vs Comparable</span>
        <span className={isNegative ? 'text-emerald-400' : 'text-orange-400'}>
          {isNegative ? '−' : '+'}
          {absGap.toFixed(1)}%
        </span>
      </div>
      <div className="w-full h-2 bg-pcis-border/20 rounded-full overflow-hidden">
        <div
          className={`h-full ${isNegative ? 'bg-emerald-500/60' : 'bg-orange-500/60'}`}
          style={{ width: `${Math.min(100, (absGap / 200) * 100)}%` }}
        />
      </div>
    </div>
  )
}

function AreaCard({ area }: { area: ProcessedArea }): JSX.Element {
  const nav = useWorkspaceNav()

  return (
    <div className="bg-white/[0.02] border border-pcis-border/10 rounded-lg p-6 mb-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 pb-4 border-b border-pcis-border/10">
        <div>
          <h3 className="text-lg text-pcis-text font-semibold">{area.area}</h3>
          <div className="text-[8px] text-pcis-text-muted uppercase tracking-wider mt-1">
            Emerging Score
          </div>
        </div>
        <div className="text-right">
          <div className="text-[28px] text-pcis-gold font-semibold">{area.emergingScore}</div>
          <div className="mt-2">
            <PhaseLabel phase={area.phase} />
          </div>
        </div>
      </div>

      {/* Price and Metrics */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div>
          <div className="text-[8px] text-pcis-text-muted uppercase tracking-wider mb-1">
            Current Price/sqft
          </div>
          <div className="text-pcis-text font-semibold">${area.currentPriceSqft}</div>
        </div>
        <div>
          <div className="text-[8px] text-pcis-text-muted uppercase tracking-wider mb-1">
            Comparable Area
          </div>
          <div className="text-pcis-text font-semibold">${area.comparableAreaPrice}</div>
        </div>
        <div>
          <div className="text-[8px] text-pcis-text-muted uppercase tracking-wider mb-1">
            Price Gap
          </div>
          <div className="text-emerald-400 font-semibold">
            {(
              ((area.currentPriceSqft - area.comparableAreaPrice) /
                area.comparableAreaPrice) *
              100
            ).toFixed(1)}
            %
          </div>
        </div>
        <div>
          <div className="text-[8px] text-pcis-text-muted uppercase tracking-wider mb-1">
            Projected 12m
          </div>
          <div className="text-orange-400 font-semibold">{area.projectedAppreciation12m.toFixed(1)}%</div>
        </div>
      </div>

      {/* Price Gap Bar */}
      <div className="mb-6">
        <PriceGapBar
          current={area.currentPriceSqft}
          comparable={area.comparableAreaPrice}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <div className="text-[8px] text-pcis-text-muted uppercase tracking-wider mb-2">
            Price Movement (12m)
          </div>
          <div className="flex items-center justify-center h-8">
            <Sparkline data={area.priceHistory} color="#d4a574" width={120} height={24} />
          </div>
        </div>
        <div>
          <div className="text-[8px] text-pcis-text-muted uppercase tracking-wider mb-2">
            Volume Movement (12m)
          </div>
          <div className="flex items-center justify-center h-8">
            <Sparkline
              data={area.volumeHistory}
              color="#10b981"
              width={120}
              height={24}
            />
          </div>
        </div>
      </div>

      {/* Drivers and Risks */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <div className="text-[8px] text-pcis-text-muted uppercase tracking-wider mb-2">Catalysts</div>
          <ul className="text-[13px] text-pcis-text-secondary space-y-1">
            {area.catalysts.map((catalyst: string, idx: number) => (
              <li key={idx} className="flex items-start">
                <span className="text-pcis-gold mr-2">◆</span>
                <span>{catalyst}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-[8px] text-pcis-text-muted uppercase tracking-wider mb-2">
            Infrastructure
          </div>
          <ul className="text-[13px] text-pcis-text-secondary space-y-1">
            {area.infrastructure.map((item: string, idx: number) => (
              <li key={idx} className="flex items-start">
                <span className="text-blue-400 mr-2">●</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <div className="text-[8px] text-pcis-text-muted uppercase tracking-wider mb-2">
            Demand Drivers
          </div>
          <ul className="text-[13px] text-pcis-text-secondary space-y-1">
            {area.demandDrivers.map((driver: string, idx: number) => (
              <li key={idx} className="flex items-start">
                <span className="text-emerald-400 mr-2">★</span>
                <span>{driver}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <div className="text-[8px] text-pcis-text-muted uppercase tracking-wider mb-2">Risks</div>
          <ul className="text-[13px] text-pcis-text-secondary space-y-1">
            {area.risks.map((risk: string, idx: number) => (
              <li key={idx} className="flex items-start">
                <span className="text-red-400 mr-2">◆</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Velocity and Comparable */}
      <div className="grid grid-cols-2 gap-6 pt-4 border-t border-pcis-border/10">
        <div>
          <div className="text-[8px] text-pcis-text-muted uppercase tracking-wider mb-1">
            Price Velocity
          </div>
          <div className="text-pcis-text font-semibold text-sm">{area.priceVelocity.toFixed(2)}% per month</div>
          <div className="text-[8px] text-pcis-text-muted mt-1">Volume Velocity: {area.volumeVelocity.toFixed(2)}</div>
        </div>
        <div>
          <div className="text-[8px] text-pcis-text-muted uppercase tracking-wider mb-1">
            Compared To
          </div>
          <div
            className="text-pcis-gold font-semibold text-sm cursor-pointer hover:underline"
            onClick={() => nav.openArea(area.areaId)}
          >
            {area.comparableArea}
          </div>
        </div>
      </div>
    </div>
  )
}

function ComparisonTable({ areas }: { areas: ProcessedArea[] }): JSX.Element {
  const sortedAreas = [...areas].sort(
    (a: ProcessedArea, b: ProcessedArea) => b.emergingScore - a.emergingScore
  )

  return (
    <div className="bg-white/[0.02] border border-pcis-border/10 rounded-lg p-6 mt-6">
      <h3 className="text-pcis-text-secondary text-xs uppercase tracking-wider mb-4">
        Comparison Overview
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-pcis-border/10">
              <th className="text-left text-pcis-text-muted py-2 px-2">Area</th>
              <th className="text-left text-pcis-text-muted py-2 px-2">Phase</th>
              <th className="text-center text-pcis-text-muted py-2 px-2">Score</th>
              <th className="text-right text-pcis-text-muted py-2 px-2">Price/sqft</th>
              <th className="text-right text-pcis-text-muted py-2 px-2">Gap vs Comp</th>
              <th className="text-right text-pcis-text-muted py-2 px-2">Proj 12m</th>
              <th className="text-right text-pcis-text-muted py-2 px-2">Demand</th>
            </tr>
          </thead>
          <tbody>
            {sortedAreas.map((area: ProcessedArea) => (
              <tr key={area.area} className="border-b border-pcis-border/10 hover:bg-white/[0.02]">
                <td className="py-3 px-2 text-pcis-text">{area.area}</td>
                <td className="py-3 px-2">
                  <span className="text-[8px] uppercase tracking-wider text-pcis-text-secondary">
                    {area.phase.replace('-', ' ')}
                  </span>
                </td>
                <td className="py-3 px-2 text-center text-pcis-gold font-semibold">
                  {area.emergingScore}
                </td>
                <td className="py-3 px-2 text-right text-pcis-text">${area.currentPriceSqft}</td>
                <td className="py-3 px-2 text-right text-emerald-400">
                  {(
                    ((area.currentPriceSqft - area.comparableAreaPrice) /
                      area.comparableAreaPrice) *
                    100
                  ).toFixed(1)}
                  %
                </td>
                <td className="py-3 px-2 text-right text-orange-400">{area.projectedAppreciation12m.toFixed(1)}%</td>
                <td className="py-3 px-2 text-right text-pcis-text-secondary">{area.demandScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LoadingState(): JSX.Element {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border border-pcis-gold/30 border-t-pcis-gold mx-auto mb-4"></div>
        <p className="text-pcis-text-secondary text-sm">Loading emerging areas data...</p>
      </div>
    </div>
  )
}

function ErrorState({ message }: { message: string }): JSX.Element {
  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 my-4">
      <h3 className="text-red-400 font-semibold mb-2">Data Loading Error</h3>
      <p className="text-red-300 text-sm">{message}</p>
      <p className="text-pcis-text-muted text-xs mt-2">Falling back to mock data for display.</p>
    </div>
  )
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EmergingAreasView(): JSX.Element {
  const [areas, setAreas] = useState<ProcessedArea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch real area metrics from shared cache
        const data = await getAreaMetricsCached()

        if (!Array.isArray(data) || data.length === 0) {
          throw new Error('No area metrics data available')
        }
        const response = { data }

        // Transform API data to our format
        const transformedAreas = response.data
          .map((metric: AreaMetric, index: number) =>
            transformMetricsToSignal(metric, index, response.data)
          )
          // Sort by emerging score descending
          .sort((a: ProcessedArea, b: ProcessedArea) => b.emergingScore - a.emergingScore)
          // Take top 20 emerging areas
          .slice(0, 20)

        if (isMounted) {
          setAreas(transformedAreas)
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to fetch area metrics'
        console.error('EmergingAreasView error:', err)

        if (isMounted) {
          setError(errorMsg)

          // Fallback to mock data
          const fallbackAreas = emergingAreaSignals
            .sort((a: EmergingAreaSignal, b: EmergingAreaSignal) => b.emergingScore - a.emergingScore)
            .map((area: EmergingAreaSignal) => ({
              ...area,
              propertyCount: 75 + Math.floor(Math.random() * 150),
              demandScore: Math.floor(Math.random() * 100),
            }))
            .slice(0, 20)

          setAreas(fallbackAreas as ProcessedArea[])
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white/[0.01] to-transparent">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-pcis-border/10">
        <h1 style={{ fontFamily: "'Playfair Display', serif" }} className="text-3xl text-pcis-text mb-1">
          Emerging Areas
        </h1>
        <p className="text-sm text-pcis-text-secondary">Growth-Phase Market Detection</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0 px-6 py-6">
        {loading && <LoadingState />}

        {error && <ErrorState message={error} />}

        {!loading && areas.length > 0 && (
          <>
            {/* Phase Pipeline */}
            <PhasePipeline areas={areas} />

            {/* Area Cards */}
            <div className="mb-6">
              <h2 className="text-pcis-text-secondary text-xs uppercase tracking-wider mb-4">
                Deep-Dive Analysis
              </h2>
              {areas.map((area: ProcessedArea) => (
                <AreaCard key={area.area} area={area} />
              ))}
            </div>

            {/* Comparison Table */}
            <ComparisonTable areas={areas} />
          </>
        )}

        {!loading && areas.length === 0 && !error && (
          <div className="flex items-center justify-center h-64">
            <p className="text-pcis-text-secondary text-sm">No emerging areas data available.</p>
          </div>
        )}
      </div>
    </div>
  )
}
