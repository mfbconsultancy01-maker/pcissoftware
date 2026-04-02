'use client'

import React, { useState, useMemo } from 'react'
import { areas, type AreaProfile } from '@/lib/marketData'
import { useWorkspaceNav, AreaLink } from '../useWorkspaceNav'

// ============================================================================
// PCIS Price Intelligence — Area-by-Area Price Comparison Grid
// ============================================================================
// Bloomberg-grade price analysis across all Dubai areas. Shows entry-to-luxury
// price progression, momentum indicators, yield comparisons, and 12-month
// sparkline trends. Sort by price level, momentum, yield, or change velocity.
// Click any area → opens full Area Profile panel.
// ============================================================================

// ── Sparkline Component ────────────────────────────────────────────────────

function Sparkline({ data, color, width = 56, height = 16 }: {
  data: number[]
  color: string
  width?: number
  height?: number
}): React.ReactElement | null {
  if (!data || data.length === 0) return null
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

// ── Momentum Badge ─────────────────────────────────────────────────────────

function MomentumBadge({ momentumScore }: { momentumScore: number }): React.ReactElement {
  let label = '— Stable'
  let bgColor = 'bg-blue-500/20'
  let borderColor = 'border-blue-500/40'
  let textColor = 'text-blue-400'

  if (momentumScore > 15) {
    label = '▲ Accelerating'
    bgColor = 'bg-green-500/20'
    borderColor = 'border-green-500/40'
    textColor = 'text-green-400'
  } else if (momentumScore < -15) {
    if (momentumScore < -30) {
      label = '▼▼ Correcting'
      bgColor = 'bg-red-500/20'
      borderColor = 'border-red-500/40'
      textColor = 'text-red-400'
    } else {
      label = '▼ Decelerating'
      bgColor = 'bg-amber-500/20'
      borderColor = 'border-amber-500/40'
      textColor = 'text-amber-400'
    }
  }

  return (
    <span className={`text-[8px] font-semibold px-2 py-1 rounded-full border ${bgColor} ${borderColor} ${textColor} inline-block whitespace-nowrap`}>
      {label}
    </span>
  )
}

// ── Price Change Formatter ─────────────────────────────────────────────────

function formatPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

function getChangeColor(change: number): string {
  if (change > 0) return '#22c55e' // green
  if (change < 0) return '#ef4444' // red
  return '#ffffff' // white for zero
}

// ── Price Tier Bar Visualization ───────────────────────────────────────────

function PriceTierBar({ area }: { area: AreaProfile }): React.ReactElement {
  // Use priceTiers to show progression from affordable to ultra-luxury
  if (!area.priceTiers || area.priceTiers.length === 0) {
    return <div className="h-6 bg-white/[0.02] rounded" />
  }

  // Sort tiers by price range min
  const sortedTiers = [...area.priceTiers].sort((a, b) => a.priceRangeMin - b.priceRangeMin)

  // Calculate bar width proportional to market percentage
  const totalPct = sortedTiers.reduce((sum, t) => sum + t.pctOfMarket, 0) || 100

  const tierColors: Record<string, string> = {
    'Affordable': '#6b7280',      // gray
    'Mid-Range': '#3b82f6',       // blue
    'Luxury': '#d4a574',          // gold
    'Ultra-Luxury': '#fbbf24',    // amber
  }

  return (
    <div className="flex items-center gap-1 h-6">
      {sortedTiers.map((tier, idx) => {
        const width = (tier.pctOfMarket / totalPct) * 100
        const color = tierColors[tier.tier] || '#9ca3af'
        return (
          <div
            key={idx}
            className="h-full rounded transition-all hover:opacity-80 flex items-center justify-center text-[7px] font-bold text-white/80"
            style={{
              width: `${width}%`,
              backgroundColor: color,
              minWidth: width > 8 ? 'auto' : '0px',
            }}
            title={`${tier.tier}: ${(tier.priceRangeMin / 1e6).toFixed(0)}M–${(tier.priceRangeMax / 1e6).toFixed(0)}M AED`}
          >
            {width > 12 && tier.tier.split('-')[0]}
          </div>
        )
      })}
    </div>
  )
}

// ── Momentum Score (synthetic from price change trends) ─────────────────────

function calculateMomentumScore(area: AreaProfile): number {
  // Simple momentum: average of 90d and YoY changes, weighted
  const avg90d = area.priceChange90d || 0
  const avgYoY = area.priceChangeYoY || 0
  const momentum = (avg90d * 2 + avgYoY * 1) / 3
  return Math.round(momentum * 10) / 10 // -100 to +100 scale
}

// ── Sort Options ───────────────────────────────────────────────────────────

type SortKey = 'price' | 'change30d' | 'change90d' | 'changeYoY' | 'momentum' | 'yield'

const SORT_OPTIONS: Array<{ key: SortKey; label: string }> = [
  { key: 'price', label: 'Price Level' },
  { key: 'change30d', label: '30d Change' },
  { key: 'change90d', label: '90d Change' },
  { key: 'changeYoY', label: 'YoY Change' },
  { key: 'momentum', label: 'Momentum' },
  { key: 'yield', label: 'Yield' },
]

type ViewMode = 'grid' | 'table'

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function PriceMapView(): React.ReactElement {
  const nav = useWorkspaceNav()
  const [sortBy, setSortBy] = useState<SortKey>('price')
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [search, setSearch] = useState('')

  // ─────────────────────────────────────────────────────────────────────────
  // Market Summary Stats
  // ─────────────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const avgPrice = (areas.reduce((sum, a) => sum + a.avgPriceSqft, 0) / areas.length) || 0
    const medianPrice = areas.length > 0
      ? [...areas].sort((a, b) => a.avgPriceSqft - b.avgPriceSqft)[Math.floor(areas.length / 2)].avgPriceSqft
      : 0
    const highest = [...areas].sort((a, b) => b.avgPriceSqft - a.avgPriceSqft)[0]
    const lowest = [...areas].sort((a, b) => a.avgPriceSqft - b.avgPriceSqft)[0]
    const avgMomentum = (areas.reduce((sum, a) => sum + calculateMomentumScore(a), 0) / areas.length) || 0

    return { avgPrice, medianPrice, highest, lowest, avgMomentum }
  }, [])

  // ─────────────────────────────────────────────────────────────────────────
  // Filter and Sort
  // ─────────────────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let result = [...areas]

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.shortName.toLowerCase().includes(q)
      )
    }

    switch (sortBy) {
      case 'price':
        return result.sort((a, b) => b.avgPriceSqft - a.avgPriceSqft)
      case 'change30d':
        return result.sort((a, b) => (b.priceChange30d || 0) - (a.priceChange30d || 0))
      case 'change90d':
        return result.sort((a, b) => (b.priceChange90d || 0) - (a.priceChange90d || 0))
      case 'changeYoY':
        return result.sort((a, b) => (b.priceChangeYoY || 0) - (a.priceChangeYoY || 0))
      case 'momentum':
        return result.sort((a, b) => calculateMomentumScore(b) - calculateMomentumScore(a))
      case 'yield':
        return result.sort((a, b) => b.avgRentalYield - a.avgRentalYield)
      default:
        return result
    }
  }, [sortBy, search])

  // ═════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═════════════════════════════════════════════════════════════════════════

  return (
    <div className="h-full flex flex-col bg-transparent">

      {/* ────────────────────────────────────────────────────────────────────
          HEADER
          ──────────────────────────────────────────────────────────────────── */}

      <div className="flex items-center justify-between flex-shrink-0 pb-3 border-b border-white/[0.04]">
        <div>
          <h2
            className="text-lg font-semibold text-white/90 tracking-tight"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            Price Intelligence
          </h2>
          <p className="text-[10px] text-white/70 tracking-wider uppercase mt-0.5">
            Dubai Market · AED/sqft Analysis
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[8px] text-white/40 uppercase tracking-wider block">Market Avg</span>
            <span className="text-[11px] font-bold text-white/90 tabular-nums">
              {Math.round(stats.avgPrice).toLocaleString()}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[8px] text-white/40 uppercase tracking-wider block">Median</span>
            <span className="text-[11px] font-bold text-white/90 tabular-nums">
              {Math.round(stats.medianPrice).toLocaleString()}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[8px] text-white/40 uppercase tracking-wider block">Highest</span>
            <span className="text-[11px] font-bold text-[#d4a574] tabular-nums">
              {stats.highest?.shortName || '—'}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[8px] text-white/40 uppercase tracking-wider block">Lowest</span>
            <span className="text-[11px] font-bold text-white/90 tabular-nums">
              {stats.lowest?.shortName || '—'}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[8px] text-white/40 uppercase tracking-wider block">Avg Momentum</span>
            <span
              className="text-[11px] font-bold tabular-nums"
              style={{ color: stats.avgMomentum > 0 ? '#22c55e' : stats.avgMomentum < 0 ? '#ef4444' : '#ffffff' }}
            >
              {stats.avgMomentum > 0 ? '+' : ''}{stats.avgMomentum.toFixed(1)}
            </span>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────
          CONTROLS
          ──────────────────────────────────────────────────────────────────── */}

      <div className="flex items-center gap-3 py-2.5 flex-shrink-0 border-b border-white/[0.04]">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40">
            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.3" />
            <path d="M10.5 10.5L15 15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search areas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-7 bg-white/[0.02] border border-white/[0.04] rounded-lg pl-8 pr-3 text-[11px] text-white/90 placeholder-white/40 outline-none focus:border-[#d4a574]/30 focus:bg-white/[0.03] transition-colors"
          />
        </div>

        {/* Sort */}
        <div className="flex items-center gap-1">
          <span className="text-[8px] text-white/40 uppercase tracking-wider mr-1">Sort</span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortBy(opt.key)}
              className={`text-[8px] tracking-wider px-2 py-1 rounded-md transition-colors whitespace-nowrap ${
                sortBy === opt.key
                  ? 'text-[#d4a574] bg-[#d4a574]/[0.08] border border-[#d4a574]/20 font-bold'
                  : 'text-white/70 border border-transparent hover:bg-white/[0.03]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* View Mode */}
        <div className="flex items-center gap-1 ml-auto">
          <span className="text-[8px] text-white/40 uppercase tracking-wider mr-1">View</span>
          <button
            onClick={() => setViewMode('grid')}
            className={`text-[8px] tracking-wider px-2 py-1 rounded-md transition-colors ${
              viewMode === 'grid'
                ? 'text-[#d4a574] bg-[#d4a574]/[0.08] border border-[#d4a574]/20 font-bold'
                : 'text-white/70 border border-transparent hover:bg-white/[0.03]'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`text-[8px] tracking-wider px-2 py-1 rounded-md transition-colors ${
              viewMode === 'table'
                ? 'text-[#d4a574] bg-[#d4a574]/[0.08] border border-[#d4a574]/20 font-bold'
                : 'text-white/70 border border-transparent hover:bg-white/[0.03]'
            }`}
          >
            Table
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────────
          GRID VIEW
          ──────────────────────────────────────────────────────────────────── */}

      {viewMode === 'grid' && (
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-2 pb-2">
            {filtered.map((area) => (
              <PriceCard key={area.id} area={area} onAreaClick={() => nav.openArea(area.id)} />
            ))}
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <span className="text-white/40 text-sm">No areas match your search</span>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────────────────
          TABLE VIEW
          ──────────────────────────────────────────────────────────────────── */}

      {viewMode === 'table' && (
        <div className="flex-1 overflow-y-auto min-h-0">
          <table className="w-full text-[10px] border-collapse">
            <thead className="sticky top-0 bg-white/[0.01] border-b border-white/[0.04]">
              <tr>
                <th className="text-left px-3 py-2 text-white/40 font-medium uppercase tracking-wider text-[8px]">Area</th>
                <th className="text-right px-3 py-2 text-white/40 font-medium uppercase tracking-wider text-[8px]">AED/sqft</th>
                <th className="text-right px-3 py-2 text-white/40 font-medium uppercase tracking-wider text-[8px]">Entry</th>
                <th className="text-right px-3 py-2 text-white/40 font-medium uppercase tracking-wider text-[8px]">Mid</th>
                <th className="text-right px-3 py-2 text-white/40 font-medium uppercase tracking-wider text-[8px]">Premium</th>
                <th className="text-right px-3 py-2 text-white/40 font-medium uppercase tracking-wider text-[8px]">Ultra</th>
                <th className="text-right px-3 py-2 text-white/40 font-medium uppercase tracking-wider text-[8px]">30d %</th>
                <th className="text-right px-3 py-2 text-white/40 font-medium uppercase tracking-wider text-[8px]">90d %</th>
                <th className="text-right px-3 py-2 text-white/40 font-medium uppercase tracking-wider text-[8px]">YoY %</th>
                <th className="text-right px-3 py-2 text-white/40 font-medium uppercase tracking-wider text-[8px]">Yield</th>
                <th className="text-center px-3 py-2 text-white/40 font-medium uppercase tracking-wider text-[8px]">Momentum</th>
                <th className="text-right px-3 py-2 text-white/40 font-medium uppercase tracking-wider text-[8px]">90d Txns</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((area) => {
                const momentum = calculateMomentumScore(area)
                const tiers = [...(area.priceTiers || [])].sort((a, b) => a.priceRangeMin - b.priceRangeMin)
                const affordableTier = tiers.find(t => t.tier === 'Affordable')
                const midTier = tiers.find(t => t.tier === 'Mid-Range')
                const luxuryTier = tiers.find(t => t.tier === 'Luxury')
                const ultraTier = tiers.find(t => t.tier === 'Ultra-Luxury')

                return (
                  <tr key={area.id} className="border-b border-white/[0.02] hover:bg-white/[0.02] transition-colors">
                    <td className="text-left px-3 py-2 text-white/90">
                      <button
                        onClick={() => nav.openArea(area.id)}
                        className="hover:text-[#d4a574] transition-colors underline decoration-[#d4a574]/20 underline-offset-2"
                      >
                        {area.name}
                      </button>
                      <span className="text-white/40 ml-2">({area.shortName})</span>
                    </td>
                    <td className="text-right px-3 py-2 text-white/90 tabular-nums font-semibold">
                      {Math.round(area.avgPriceSqft).toLocaleString()}
                    </td>
                    <td className="text-right px-3 py-2 text-white/70 tabular-nums">
                      {affordableTier ? Math.round(affordableTier.avgPriceSqft).toLocaleString() : '—'}
                    </td>
                    <td className="text-right px-3 py-2 text-white/70 tabular-nums">
                      {midTier ? Math.round(midTier.avgPriceSqft).toLocaleString() : '—'}
                    </td>
                    <td className="text-right px-3 py-2 text-white/70 tabular-nums">
                      {luxuryTier ? Math.round(luxuryTier.avgPriceSqft).toLocaleString() : '—'}
                    </td>
                    <td className="text-right px-3 py-2 text-white/70 tabular-nums">
                      {ultraTier ? Math.round(ultraTier.avgPriceSqft).toLocaleString() : '—'}
                    </td>
                    <td className="text-right px-3 py-2 tabular-nums" style={{ color: getChangeColor(area.priceChange30d || 0) }}>
                      {formatPct(area.priceChange30d || 0)}
                    </td>
                    <td className="text-right px-3 py-2 tabular-nums" style={{ color: getChangeColor(area.priceChange90d || 0) }}>
                      {formatPct(area.priceChange90d || 0)}
                    </td>
                    <td className="text-right px-3 py-2 tabular-nums" style={{ color: getChangeColor(area.priceChangeYoY || 0) }}>
                      {formatPct(area.priceChangeYoY || 0)}
                    </td>
                    <td className="text-right px-3 py-2 text-white/70 tabular-nums">
                      {area.avgRentalYield.toFixed(2)}%
                    </td>
                    <td className="text-center px-3 py-2">
                      <MomentumBadge momentumScore={momentum} />
                    </td>
                    <td className="text-right px-3 py-2 text-white/70 tabular-nums">
                      {area.transactionCount90d.toLocaleString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <span className="text-white/40 text-sm">No areas match your search</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// PRICE CARD COMPONENT — Grid View
// ============================================================================

interface PriceCardProps {
  area: AreaProfile
  onAreaClick: () => void
}

function PriceCard({ area, onAreaClick }: PriceCardProps): React.ReactElement {
  const momentum = calculateMomentumScore(area)

  // Extract price tier data
  const tiers = [...(area.priceTiers || [])].sort((a, b) => a.priceRangeMin - b.priceRangeMin)
  const affordableTier = tiers.find(t => t.tier === 'Affordable')
  const midTier = tiers.find(t => t.tier === 'Mid-Range')
  const luxuryTier = tiers.find(t => t.tier === 'Luxury')

  return (
    <button
      onClick={onAreaClick}
      className="w-full text-left bg-white/[0.02] border border-white/[0.04] rounded-lg p-3 hover:bg-white/[0.04] hover:border-[#d4a574]/20 transition-all group"
    >
      {/* Row 1: Name + Code */}
      <div className="flex items-start justify-between mb-2.5">
        <div>
          <h3 className="text-[11px] font-semibold text-white/90 group-hover:text-[#d4a574] transition-colors" style={{ fontFamily: "'Playfair Display', serif" }}>
            {area.name}
          </h3>
          <span className="text-[8px] text-white/40">{area.shortName}</span>
        </div>
        <span className="text-[10px] font-bold text-white/90 tabular-nums">
          {Math.round(area.avgPriceSqft).toLocaleString()}
        </span>
      </div>

      {/* Row 2: Price Bar Visualization */}
      <div className="mb-2.5">
        <PriceTierBar area={area} />
      </div>

      {/* Row 3: Key Metrics */}
      <div className="grid grid-cols-4 gap-2 mb-2.5 text-[8px]">
        <div>
          <span className="text-white/40 block uppercase tracking-wider">30d</span>
          <span className="text-white/90 font-semibold" style={{ color: getChangeColor(area.priceChange30d || 0) }}>
            {formatPct(area.priceChange30d || 0)}
          </span>
        </div>
        <div>
          <span className="text-white/40 block uppercase tracking-wider">90d</span>
          <span className="text-white/90 font-semibold" style={{ color: getChangeColor(area.priceChange90d || 0) }}>
            {formatPct(area.priceChange90d || 0)}
          </span>
        </div>
        <div>
          <span className="text-white/40 block uppercase tracking-wider">YoY</span>
          <span className="text-white/90 font-semibold" style={{ color: getChangeColor(area.priceChangeYoY || 0) }}>
            {formatPct(area.priceChangeYoY || 0)}
          </span>
        </div>
        <div>
          <span className="text-white/40 block uppercase tracking-wider">Yield</span>
          <span className="text-white/90 font-semibold">{area.avgRentalYield.toFixed(2)}%</span>
        </div>
      </div>

      {/* Row 4: Sparkline + Momentum */}
      <div className="flex items-center justify-between mb-2.5">
        <Sparkline data={area.priceHistory} color="#d4a574" width={56} height={16} />
        <MomentumBadge momentumScore={momentum} />
      </div>

      {/* Row 5: Tier Badges */}
      <div className="flex flex-wrap gap-1 text-[7px]">
        {affordableTier && (
          <span className="bg-white/[0.05] border border-white/[0.08] text-white/60 px-1.5 py-0.5 rounded-sm">
            Entry: {Math.round(affordableTier.avgPriceSqft).toLocaleString()}
          </span>
        )}
        {midTier && (
          <span className="bg-white/[0.05] border border-white/[0.08] text-white/60 px-1.5 py-0.5 rounded-sm">
            Mid: {Math.round(midTier.avgPriceSqft).toLocaleString()}
          </span>
        )}
        {luxuryTier && (
          <span className="bg-white/[0.05] border border-white/[0.08] text-white/60 px-1.5 py-0.5 rounded-sm">
            Premium: {Math.round(luxuryTier.avgPriceSqft).toLocaleString()}
          </span>
        )}
      </div>
    </button>
  )
}
