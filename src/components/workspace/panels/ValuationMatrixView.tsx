'use client'

import React, { useState, useMemo } from 'react'
import { buildingPrices, type BuildingPrice, getBuildingPricesByArea, areas, type AreaProfile } from '@/lib/marketData'
import { useWorkspaceNav } from '../useWorkspaceNav'

// ============================================================================
// PCIS Valuation Matrix — Per-Building Pricing Intelligence
// ============================================================================
// Select an area, see every building ranked by AED/sqft with premium/discount
// vs area average. Identify value leaders and premium outliers at a glance.
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

function PremiumBadge({ premium }: { premium: number }) {
  const isDiscount = premium < 0
  const color = isDiscount ? '#22c55e' : '#d4a574'
  const bgColor = isDiscount ? '#22c55e' : '#d4a574'
  return (
    <span className="text-[8px] font-bold uppercase tracking-wider px-2 py-1 rounded-full whitespace-nowrap"
      style={{ color, background: bgColor + '15', border: `1px solid ${bgColor}30` }}>
      {isDiscount ? '↓' : '↑'} {Math.abs(premium).toFixed(1)}%
    </span>
  )
}

function formatPct(n: number): string {
  return `${n >= 0 ? '+' : ''}${n.toFixed(1)}%`
}

function formatAED(n: number): string {
  return n.toLocaleString()
}

export default function ValuationMatrixView() {
  const nav = useWorkspaceNav()
  const [selectedAreaId, setSelectedAreaId] = useState<string>(areas.length > 0 ? areas[0].id : '')
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingPrice | null>(null)

  const selectedArea = areas.find(a => a.id === selectedAreaId)
  const areaBuildings = selectedAreaId ? getBuildingPricesByArea(selectedAreaId) : []

  // Get buildings for selected area, sorted by avgPriceSqft descending
  const sortedBuildings = useMemo(() => {
    return [...areaBuildings].sort((a, b) => b.avgPriceSqft - a.avgPriceSqft)
  }, [areaBuildings])

  // Calculate area metrics
  const areaMetrics = useMemo(() => {
    if (!sortedBuildings.length) return null
    const count = sortedBuildings.length
    const avgPrice = sortedBuildings.reduce((s, b) => s + b.avgPriceSqft, 0) / count
    const avgYoY = sortedBuildings.reduce((s, b) => s + b.priceChangeYoY, 0) / count
    return { count, avgPrice, avgYoY }
  }, [sortedBuildings])

  // Top 5 and bottom 5 buildings across ALL areas
  const topBuildings = useMemo(() => {
    return [...buildingPrices]
      .sort((a, b) => b.avgPriceSqft - a.avgPriceSqft)
      .slice(0, 5)
  }, [])

  const bottomBuildings = useMemo(() => {
    return [...buildingPrices]
      .sort((a, b) => a.avgPriceSqft - b.avgPriceSqft)
      .slice(0, 5)
  }, [])

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-white/[0.01] to-white/[0.005]">

      {/* ── Header ── */}
      <div className="flex-shrink-0 pb-3 border-b border-white/[0.04]">
        <div className="flex items-baseline justify-between mb-2">
          <div>
            <h2 className="text-lg font-semibold text-white/90 tracking-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              Valuation Matrix
            </h2>
            <p className="text-[10px] text-white/40 tracking-wider uppercase mt-0.5">
              Building-level pricing analysis · Premium/discount mapping
            </p>
          </div>
          {areaMetrics && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[8px] text-white/40 uppercase tracking-wider block">Buildings Tracked</span>
                <span className="text-sm font-bold text-white/90 tabular-nums">{areaMetrics.count}</span>
              </div>
              <div className="text-right">
                <span className="text-[8px] text-white/40 uppercase tracking-wider block">Avg AED/sqft</span>
                <span className="text-sm font-bold text-white/90 tabular-nums">{formatAED(Math.round(areaMetrics.avgPrice))}</span>
              </div>
              <div className="text-right">
                <span className="text-[8px] text-white/40 uppercase tracking-wider block">YoY</span>
                <span className="text-sm font-bold tabular-nums" style={{ color: areaMetrics.avgYoY >= 0 ? '#22c55e' : '#ef4444' }}>
                  {formatPct(areaMetrics.avgYoY)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* ── Area Selector ── */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-3 px-3">
          {Array.from(areas).map(area => {
            const buildingCount = getBuildingPricesByArea(area.id).length
            return (
              <button
                key={area.id}
                onClick={() => {
                  setSelectedAreaId(area.id)
                  setSelectedBuilding(null)
                }}
                className={`flex-shrink-0 text-[9px] font-semibold uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all whitespace-nowrap ${
                  selectedAreaId === area.id
                    ? 'bg-white/[0.08] border border-[#d4a574]/30 text-[#d4a574]'
                    : 'bg-white/[0.02] border border-white/[0.04] text-white/60 hover:bg-white/[0.04]'
                }`}
              >
                {area.shortName} ({buildingCount})
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
        {/* ── Building Ranking Table ── */}
        <div className="flex-1 overflow-x-auto min-h-0">
          {sortedBuildings.length > 0 ? (
            <table className="w-full border-collapse text-[10px] text-white/70">
              <thead className="sticky top-0 bg-white/[0.02] border-b border-white/[0.04]">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-white/40 text-[8px] uppercase tracking-wider">#</th>
                  <th className="text-left px-3 py-2 font-semibold text-white/40 text-[8px] uppercase tracking-wider">Building</th>
                  <th className="text-right px-3 py-2 font-semibold text-white/40 text-[8px] uppercase tracking-wider">AED/sqft</th>
                  <th className="text-center px-3 py-2 font-semibold text-white/40 text-[8px] uppercase tracking-wider">vs Area</th>
                  <th className="text-right px-3 py-2 font-semibold text-white/40 text-[8px] uppercase tracking-wider">Min</th>
                  <th className="text-right px-3 py-2 font-semibold text-white/40 text-[8px] uppercase tracking-wider">Max</th>
                  <th className="text-right px-3 py-2 font-semibold text-white/40 text-[8px] uppercase tracking-wider">Spread %</th>
                  <th className="text-right px-3 py-2 font-semibold text-white/40 text-[8px] uppercase tracking-wider">12m Txns</th>
                  <th className="text-right px-3 py-2 font-semibold text-white/40 text-[8px] uppercase tracking-wider">30d %</th>
                  <th className="text-right px-3 py-2 font-semibold text-white/40 text-[8px] uppercase tracking-wider">YoY %</th>
                  <th className="text-right px-3 py-2 font-semibold text-white/40 text-[8px] uppercase tracking-wider">DOM</th>
                  <th className="text-right px-3 py-2 font-semibold text-white/40 text-[8px] uppercase tracking-wider">12m Price</th>
                </tr>
              </thead>
              <tbody>
                {sortedBuildings.map((building, idx) => {
                  const isTop3 = idx < 3
                  const spread = ((building.maxPriceSqft - building.minPriceSqft) / building.avgPriceSqft) * 100
                  return (
                    <tr
                      key={building.building}
                      onClick={() => setSelectedBuilding(building)}
                      className={`border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer transition-colors ${
                        isTop3 ? 'border-l-2 border-l-[#d4a574]' : ''
                      } ${selectedBuilding?.building === building.building ? 'bg-white/[0.04]' : ''}`}
                    >
                      <td className="px-3 py-2 text-white/60 tabular-nums font-semibold">{idx + 1}</td>
                      <td className="px-3 py-2 text-white/90">{building.building}</td>
                      <td className="px-3 py-2 text-right text-white/90 font-bold tabular-nums">{formatAED(building.avgPriceSqft)}</td>
                      <td className="px-3 py-2 text-center">
                        <PremiumBadge premium={building.premiumVsArea} />
                      </td>
                      <td className="px-3 py-2 text-right text-white/60 tabular-nums">{formatAED(building.minPriceSqft)}</td>
                      <td className="px-3 py-2 text-right text-white/60 tabular-nums">{formatAED(building.maxPriceSqft)}</td>
                      <td className="px-3 py-2 text-right text-white/60 tabular-nums">{spread.toFixed(1)}%</td>
                      <td className="px-3 py-2 text-right text-white/60 tabular-nums">{building.totalTransactions12m}</td>
                      <td className="px-3 py-2 text-right tabular-nums" style={{ color: building.priceChange30d >= 0 ? '#22c55e' : '#ef4444' }}>
                        {formatPct(building.priceChange30d)}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums" style={{ color: building.priceChangeYoY >= 0 ? '#22c55e' : '#ef4444' }}>
                        {formatPct(building.priceChangeYoY)}
                      </td>
                      <td className="px-3 py-2 text-right text-white/60 tabular-nums">{building.avgDaysOnMarket}d</td>
                      <td className="px-3 py-2 text-right">
                        <Sparkline data={building.priceHistory} color={building.priceChangeYoY >= 0 ? '#22c55e' : '#ef4444'} width={48} height={14} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="flex items-center justify-center h-full">
              <span className="text-white/40 text-sm">No buildings available for this area</span>
            </div>
          )}
        </div>

        {/* ── Selected Building Detail ── */}
        {selectedBuilding && (
          <div className="flex-shrink-0 border-t border-white/[0.04] p-4 bg-white/[0.01]">
            <SelectedBuildingDetail building={selectedBuilding} areaMetrics={areaMetrics} />
          </div>
        )}

        {/* ── Cross-Area Comparison ── */}
        <div className="flex-shrink-0 border-t border-white/[0.04] p-4 bg-white/[0.01]">
          <h3 className="text-[11px] font-semibold text-white/90 uppercase tracking-wider mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
            Market Context
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-[9px] font-semibold text-white/70 uppercase tracking-wider mb-2">Top 5 Most Expensive</h4>
              <div className="space-y-1">
                {topBuildings.map((b, i) => (
                  <div key={b.building} className="flex items-center justify-between text-[9px] py-1.5 px-2 bg-white/[0.02] rounded border border-white/[0.04]">
                    <div className="flex-1">
                      <span className="text-white/90 font-semibold">{b.building}</span>
                      <span className="text-white/40 ml-1">({b.area})</span>
                    </div>
                    <span className="text-white/70 tabular-nums font-bold ml-2">{formatAED(b.avgPriceSqft)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-[9px] font-semibold text-white/70 uppercase tracking-wider mb-2">Top 5 Most Affordable</h4>
              <div className="space-y-1">
                {bottomBuildings.map((b, i) => (
                  <div key={b.building} className="flex items-center justify-between text-[9px] py-1.5 px-2 bg-white/[0.02] rounded border border-white/[0.04]">
                    <div className="flex-1">
                      <span className="text-white/90 font-semibold">{b.building}</span>
                      <span className="text-white/40 ml-1">({b.area})</span>
                    </div>
                    <span className="text-white/70 tabular-nums font-bold ml-2">{formatAED(b.avgPriceSqft)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// Selected Building Detail Panel
// ============================================================================

interface SelectedBuildingDetailProps {
  building: BuildingPrice
  areaMetrics: { count: number; avgPrice: number; avgYoY: number } | null
}

function SelectedBuildingDetail({ building, areaMetrics }: SelectedBuildingDetailProps) {
  // Determine fair value assessment
  const getFairValueStatus = (): { label: string; color: string } => {
    if (building.premiumVsArea > 15) return { label: 'Above Fair', color: '#d4a574' }
    if (building.premiumVsArea < -15) return { label: 'Below Fair', color: '#22c55e' }
    return { label: 'Fair Value', color: '#3b82f6' }
  }

  const fairValue = getFairValueStatus()

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="text-[11px] font-semibold text-white/90" style={{ fontFamily: "'Playfair Display', serif" }}>
            {building.building}
          </h4>
          <p className="text-[8px] text-white/40">{building.area}</p>
        </div>
        <div className="text-right">
          <span className="text-[11px] font-bold text-white/90 tabular-nums block">{formatAED(building.avgPriceSqft)} AED/sqft</span>
          <span className="text-[8px]" style={{ color: fairValue.color }}>{fairValue.label}</span>
        </div>
      </div>

      {/* Price Chart */}
      <div className="bg-white/[0.02] border border-white/[0.04] rounded p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[8px] text-white/40 uppercase tracking-wider">12-Month Price History</span>
          <Sparkline data={building.priceHistory} color="#d4a574" width={120} height={24} />
        </div>
        <div className="grid grid-cols-4 gap-2 text-[8px]">
          <div>
            <span className="text-white/40">Min</span>
            <div className="text-white/90 font-bold tabular-nums">{formatAED(building.minPriceSqft)}</div>
          </div>
          <div>
            <span className="text-white/40">Max</span>
            <div className="text-white/90 font-bold tabular-nums">{formatAED(building.maxPriceSqft)}</div>
          </div>
          <div>
            <span className="text-white/40">Range</span>
            <div className="text-white/90 font-bold tabular-nums">{((building.maxPriceSqft - building.minPriceSqft) / building.avgPriceSqft * 100).toFixed(1)}%</div>
          </div>
          <div>
            <span className="text-white/40">Last Txn</span>
            <div className="text-white/90 font-bold tabular-nums">{building.lastTransactionDate.split('-')[2]}/{building.lastTransactionDate.split('-')[1]}</div>
          </div>
        </div>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-5 gap-2">
        <MetricCard label="Floor Premium" value={`${building.floorPremiumPct}%`} subtitle="per 10 floors" />
        <MetricCard label="Sea View Premium" value={`${building.seaViewPremiumPct}%`} subtitle="vs avg" />
        <MetricCard label="Avg Size" value={formatAED(Math.round(building.avgSize))} subtitle="sqft" />
        <MetricCard label="12m Txns" value={String(building.totalTransactions12m)} subtitle="transactions" />
        <MetricCard label="DOM" value={`${building.avgDaysOnMarket}d`} subtitle="on market" />
      </div>

      {/* Property Types */}
      <div className="bg-white/[0.02] border border-white/[0.04] rounded p-3">
        <span className="text-[8px] text-white/40 uppercase tracking-wider block mb-2">Available Types</span>
        <div className="flex flex-wrap gap-2">
          {building.propertyTypes.map(type => (
            <span key={type} className="text-[8px] font-semibold px-2 py-1 rounded bg-[#d4a574]/[0.1] border border-[#d4a574]/20 text-[#d4a574]">
              {type}
            </span>
          ))}
        </div>
      </div>

      {/* Recent Transaction */}
      <div className="bg-white/[0.02] border border-white/[0.04] rounded p-3">
        <span className="text-[8px] text-white/40 uppercase tracking-wider block mb-2">Latest Transaction</span>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-white/90 tabular-nums block">{formatAED(Math.round(building.lastTransactionPrice / 1000000))}M AED</span>
            <span className="text-[8px] text-white/40">{building.lastTransactionDate}</span>
          </div>
          <div className="text-right">
            <span className="text-[8px] text-white/40 block">Premium vs Avg</span>
            <span className="text-[10px] font-bold tabular-nums" style={{ color: building.premiumVsArea >= 0 ? '#d4a574' : '#22c55e' }}>
              {building.premiumVsArea >= 0 ? '+' : ''}{building.premiumVsArea.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, subtitle }: { label: string; value: string; subtitle: string }) {
  return (
    <div className="bg-white/[0.02] border border-white/[0.04] rounded p-2 text-center">
      <span className="text-[7px] text-white/40 uppercase tracking-wider block">{label}</span>
      <span className="text-[11px] font-bold text-white/90 tabular-nums block mt-1">{value}</span>
      <span className="text-[7px] text-white/40">{subtitle}</span>
    </div>
  )
}
