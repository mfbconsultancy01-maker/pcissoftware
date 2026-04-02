'use client'

import React, { useMemo } from 'react'
import {
  areas, type AreaProfile, type AreaTransaction, type AreaInventory,
  type PriceBreakdown, type BuyerDemographic, type RentalData,
  type ServiceChargeData, type SupplyPipelineProject, type MarketLiquidity,
  type RegulatoryInfo, type LifestyleAmenity, type CommunityProfile,
  type PriceTier, type SeasonalPattern, MONTHS,
} from '@/lib/marketData'

// ============================================================================
// PCIS Bloomberg-Grade Area Deep-Dive Panel
// ============================================================================
// Comprehensive terminal-style area analysis with 16 sections covering
// all market dimensions: pricing, rental, inventory, transactions, liquidity,
// supply, regulation, amenities, community, and seasonality.
// ============================================================================

// ---------------------------------------------------------------------------
// Chart Components
// ---------------------------------------------------------------------------

function LineChart({ data, labels, color, height = 120, showArea = true }: {
  data: number[]
  labels: string[]
  color: string
  height?: number
  showArea?: boolean
}) {
  if (!data.length) return null
  const width = 280
  const min = Math.min(...data) * 0.95
  const max = Math.max(...data) * 1.05
  const range = max - min || 1
  const padY = 6
  const padX = 4

  const points = data.map((v, i) => {
    const x = padX + (i / (data.length - 1)) * (width - padX * 2)
    const y = padY + (height - padY * 2) - ((v - min) / range) * (height - padY * 2)
    return { x, y, v }
  })

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ')
  const areaPath = `M${points[0].x},${height - padY} ${points.map(p => `L${p.x},${p.y}`).join(' ')} L${points[points.length - 1].x},${height - padY} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map(frac => {
        const y = padY + (height - padY * 2) * (1 - frac)
        return <line key={frac} x1={padX} y1={y} x2={width - padX} y2={y} stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
      })}

      {/* Area fill */}
      {showArea && <path d={areaPath} fill={color} opacity="0.08" />}

      {/* Line */}
      <polyline points={polyline} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

      {/* End dot */}
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="2.5" fill={color} />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r="4" fill={color} opacity="0.2" />

      {/* Start/End labels */}
      <text x={points[0].x} y={height - 1} fontSize="6" fill="rgba(255,255,255,0.3)" textAnchor="start">{labels[0]}</text>
      <text x={points[points.length - 1].x} y={height - 1} fontSize="6" fill="rgba(255,255,255,0.3)" textAnchor="end">{labels[labels.length - 1]}</text>

      {/* Current value */}
      <text x={points[points.length - 1].x + 3} y={points[points.length - 1].y + 2} fontSize="7" fill={color} fontWeight="bold">
        {data[data.length - 1].toLocaleString()}
      </text>
    </svg>
  )
}

function BarChart({ data, labels, color, height = 80 }: {
  data: number[]
  labels: string[]
  color: string
  height?: number
}) {
  if (!data.length) return null
  const max = Math.max(...data) || 1
  const barW = 100 / data.length

  return (
    <svg viewBox={`0 0 280 ${height}`} className="w-full" style={{ height }}>
      {data.map((v, i) => {
        const x = (i / data.length) * 280 + 1.5
        const w = (280 / data.length) - 3
        const barH = (v / max) * (height - 18)
        const y = height - 12 - barH
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={barH} fill={color} opacity={i === data.length - 1 ? 0.9 : 0.4} rx="1" />
            {i % 3 === 0 && (
              <text x={x + w / 2} y={height - 2} fontSize="5" fill="rgba(255,255,255,0.3)" textAnchor="middle">{labels[i]}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Section Components
// ---------------------------------------------------------------------------

function SectionHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-2.5 pb-1 border-b border-pcis-border/10">
      <h3 className="text-[11px] font-semibold text-pcis-text tracking-widest uppercase" style={{ fontFamily: "'Playfair Display', serif" }}>
        {title}
      </h3>
      {subtitle && <span className="text-[8px] text-pcis-text-muted/70">{subtitle}</span>}
    </div>
  )
}

function MetricCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-white/[0.02] border border-pcis-border/10 rounded-lg p-2">
      <span className="text-[7px] text-pcis-text-muted/50 uppercase tracking-widest block">{label}</span>
      <span className="text-[13px] font-bold tabular-nums block mt-0.5" style={{ color: color || 'inherit' }}>{value}</span>
      {sub && <span className="text-[8px] text-pcis-text-muted tabular-nums block">{sub}</span>}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Format helpers
// ---------------------------------------------------------------------------

function formatAED(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return 'AED —'
  if (n >= 1e9) return `AED ${(n / 1e9).toFixed(1)}B`
  if (n >= 1e6) return `AED ${(n / 1e6).toFixed(1)}M`
  if (n >= 1e3) return `AED ${(n / 1e3).toFixed(0)}K`
  return `AED ${n.toFixed(0)}`
}

function formatPct(n: number | undefined | null): string {
  if (n == null || isNaN(n)) return '—'
  const sign = n >= 0 ? '+' : ''
  return `${sign}${n.toFixed(1)}%`
}

function formatKm(km: number | undefined | null): string {
  if (km == null || isNaN(km)) return '— km'
  return `${km.toFixed(1)} km`
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function AreaProfileView({ entityId }: { entityId: string }) {
  const area = useMemo(() => areas.find(a => a.id === entityId), [entityId])

  if (!area) {
    return (
      <div className="h-full flex items-center justify-center bg-pcis-bg/50">
        <div className="text-center">
          <span className="text-2xl text-pcis-text-muted/20 block mb-2">📍</span>
          <span className="text-[10px] text-pcis-text-muted tracking-wider">Area not found</span>
        </div>
      </div>
    )
  }

  const outlookColor = area.outlook === 'bullish' ? '#22c55e' : area.outlook === 'bearish' ? '#ef4444' : '#f59e0b'
  const demandColor = area.demandScore >= 85 ? '#22c55e' : area.demandScore >= 70 ? '#3b82f6' : area.demandScore >= 55 ? '#f59e0b' : '#ef4444'
  const priceColor = area.priceChange30d >= 0 ? '#22c55e' : '#ef4444'
  const liq = area.liquidity as any
  const liqScore = liq?.liquidityScore ?? Math.round((liq?.absorptionRate ?? 0) * 100)
  const liquidityColor = liqScore >= 80 ? '#22c55e' : liqScore >= 60 ? '#3b82f6' : liqScore >= 40 ? '#f59e0b' : '#ef4444'
  const rentalData = area.rental as any

  return (
    <div className="h-full flex flex-col bg-pcis-bg">
      {/* SCROLLABLE CONTENT */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-3 p-4">

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 1. HEADER SECTION */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white/[0.02] border border-pcis-border/10 rounded-xl p-4">
            {/* Title Row */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-pcis-gold/[0.08] border border-pcis-gold/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[13px] font-bold text-pcis-gold tracking-wider" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {area.shortName}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-pcis-text" style={{ fontFamily: "'Playfair Display', serif" }}>
                    {area.name}
                  </h2>
                  <p className="text-[9px] text-pcis-text-muted mt-0.5 line-clamp-1">
                    {area.subAreas.slice(0, 4).join(' • ')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Demand Score */}
                <div className="text-center">
                  <div className="w-13 h-13 rounded-full border-2 flex items-center justify-center"
                    style={{ borderColor: demandColor, background: demandColor + '10' }}>
                    <span className="text-lg font-bold tabular-nums" style={{ color: demandColor }}>{area.demandScore}</span>
                  </div>
                  <span className="text-[7px] text-pcis-text-muted uppercase tracking-widest mt-0.5 block">Demand</span>
                </div>

                {/* Outlook Badge */}
                <div className="text-center">
                  <div className="px-2 py-1.5 rounded-lg"
                    style={{ background: outlookColor + '10', border: `1px solid ${outlookColor}25` }}>
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: outlookColor }}>
                      {area.outlook}
                    </span>
                  </div>
                  <span className="text-[7px] text-pcis-text-muted uppercase tracking-widest mt-0.5 block">Outlook</span>
                </div>

                {/* Off-Plan Ratio */}
                <div className="text-center">
                  <div className="px-2 py-1.5 rounded-lg bg-white/[0.02] border border-pcis-border/10">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-pcis-gold">
                      {(area as any).liquidity?.resaleVsOffPlanPct || 0}%
                    </span>
                  </div>
                  <span className="text-[7px] text-pcis-text-muted uppercase tracking-widest mt-0.5 block">Off-Plan</span>
                </div>
              </div>
            </div>

            {/* Description */}
            <p className="text-[9.5px] text-pcis-text-secondary leading-relaxed mb-3 border-t border-pcis-border/10 pt-2.5">
              {area.description}
            </p>

            {/* Key Metrics Row (8 columns) */}
            <div className="grid grid-cols-8 gap-1.5">
              <MetricCard label="Price/sqft" value={`${area.avgPriceSqft?.toLocaleString() || '—'}`} sub={formatPct(area.priceChange30d) + ' 30d'} color={priceColor} />
              <MetricCard label="Rental Yield" value={`${area.avgRentalYield || 0}%`} sub="Gross" />
              <MetricCard label="Avg Txn" value={formatAED(area.avgTransactionValue)} />
              <MetricCard label="Active List." value={(area.totalInventory || 0).toLocaleString()} sub={`+${area.newListings30d || 0}`} />
              <MetricCard label="90d Txns" value={(area.transactionCount90d || 0).toString()} sub={`${area.cashPercent || 0}% cash`} />
              <MetricCard label="Liquidity" value={liqScore.toString()} sub="Score" color={liquidityColor} />
              <MetricCard label="Off-Plan" value={`${(area as any).liquidity?.resaleVsOffPlanPct || 0}%`} sub="of txns" />
              <MetricCard label="Occupancy" value={`${rentalData?.occupancyRate || '—'}%`} sub="Rental" />
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 2. CHARTS SECTION — 2x2 Grid */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-2 gap-3">

            {/* Price History */}
            <div className="bg-white/[0.02] border border-pcis-border/10 rounded-xl p-3">
              <SectionHeader title="Price Trend" subtitle="AED/sqft · 12mo" />
              <LineChart data={area.priceHistory} labels={MONTHS} color={priceColor} height={100} />
              <div className="flex items-center gap-2 mt-1.5 text-[8px]">
                <span className="text-pcis-text-muted">30d <span className="font-bold" style={{ color: priceColor }}>{formatPct(area.priceChange30d)}</span></span>
                <span className="text-pcis-text-muted/50">·</span>
                <span className="text-pcis-text-muted">90d <span className="font-bold" style={{ color: area.priceChange90d >= 0 ? '#22c55e' : '#ef4444' }}>{formatPct(area.priceChange90d)}</span></span>
                <span className="text-pcis-text-muted/50">·</span>
                <span className="text-pcis-text-muted">YoY <span className="font-bold" style={{ color: area.priceChangeYoY >= 0 ? '#22c55e' : '#ef4444' }}>{formatPct(area.priceChangeYoY)}</span></span>
              </div>
            </div>

            {/* Demand History */}
            <div className="bg-white/[0.02] border border-pcis-border/10 rounded-xl p-3">
              <SectionHeader title="Demand Score" subtitle="Monthly · 12mo" />
              <LineChart data={area.demandHistory} labels={MONTHS} color={demandColor} height={100} />
              <div className="flex items-center gap-2 mt-1.5 text-[8px]">
                <span style={{ color: area.demandTrend === 'rising' ? '#22c55e' : area.demandTrend === 'falling' ? '#ef4444' : '#f59e0b' }}>
                  {area.demandTrend === 'rising' ? '▲' : area.demandTrend === 'falling' ? '▼' : '—'} {area.demandTrend}
                </span>
                <span className="text-pcis-text-muted/50">·</span>
                <span className="text-pcis-text-muted">{formatPct(area.demandChange)} vs Q</span>
              </div>
            </div>

            {/* Transaction Volume */}
            <div className="bg-white/[0.02] border border-pcis-border/10 rounded-xl p-3">
              <SectionHeader title="Transaction Volume" subtitle="Monthly · 12mo" />
              <BarChart data={area.volumeHistory} labels={MONTHS} color="#8b5cf6" height={80} />
            </div>

            {/* Yield History */}
            <div className="bg-white/[0.02] border border-pcis-border/10 rounded-xl p-3">
              <SectionHeader title="Rental Yield" subtitle="% Gross · 12mo" />
              <LineChart data={area.yieldHistory} labels={MONTHS} color="#f59e0b" height={100} showArea={false} />
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 3. RENTAL MARKET */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white/[0.02] border border-pcis-border/10 rounded-xl p-3">
            <SectionHeader title="Rental Market" subtitle="Annual AED rates" />
            <div className="grid grid-cols-5 gap-2 mb-3">
              {[
                { unit: 'Studio', rate: rentalData?.avgRentStudio },
                { unit: '1-Bed', rate: rentalData?.avgRent1Bed },
                { unit: '2-Bed', rate: rentalData?.avgRent2Bed },
                { unit: '3-Bed', rate: rentalData?.avgRent3Bed },
                { unit: '4+ Bed', rate: rentalData?.avgRent4PlusBed },
              ].map((item, idx) => (
                <div key={idx} className="bg-white/[0.02] border border-pcis-border/10 rounded-lg p-2">
                  <div className="text-[8px] text-pcis-text-muted/70 uppercase tracking-wider mb-0.5">{item.unit}</div>
                  <div className="text-[11px] font-bold text-pcis-text tabular-nums">{item.rate ? `${item.rate.toLocaleString()}` : '—'}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-pcis-border/10 pt-2.5">
              <div className="grid grid-cols-4 gap-2 text-[8px]">
                <div className="flex justify-between">
                  <span className="text-pcis-text-muted/70">Occupancy</span>
                  <span className="text-pcis-text font-bold">{rentalData?.occupancyRate || '—'}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pcis-text-muted/70">STR %</span>
                  <span className="text-pcis-text font-bold">{rentalData?.shortTermRentalPct || 0}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pcis-text-muted/70">DOM</span>
                  <span className="text-pcis-text font-bold">{rentalData?.avgDaysOnMarketRental || '—'} days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-pcis-text-muted/70">30d Change</span>
                  <span className="text-pcis-text font-bold" style={{ color: (rentalData?.rentalPriceChange30d || 0) >= 0 ? '#22c55e' : '#ef4444' }}>
                    {formatPct(rentalData?.rentalPriceChange30d || 0)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 4. PRICE BREAKDOWN BY TYPE */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white/[0.02] border border-pcis-border/10 rounded-xl p-3">
            <SectionHeader title="Price Breakdown" subtitle="by property type" />
            <div className="overflow-x-auto">
              <table className="w-full text-[9px]">
                <thead>
                  <tr className="text-pcis-text-muted/50 uppercase tracking-wider border-b border-pcis-border/10">
                    <th className="text-left py-1.5 font-medium">Type</th>
                    <th className="text-right py-1.5 font-medium">AED/sqft</th>
                    <th className="text-right py-1.5 font-medium">30d</th>
                    <th className="text-right py-1.5 font-medium">90d</th>
                    <th className="text-right py-1.5 font-medium">YoY</th>
                  </tr>
                </thead>
                <tbody>
                  {(area.priceBreakdown || []).map((pb: any, idx: number) => (
                    <tr key={idx} className="border-b border-pcis-border/5 hover:bg-white/[0.02]">
                      <td className="py-1 text-pcis-text font-medium">{pb.propertyType}</td>
                      <td className="py-1 text-right text-pcis-text tabular-nums">{pb.avgPriceSqft?.toLocaleString() || '—'}</td>
                      <td className="py-1 text-right tabular-nums" style={{ color: (pb.change30d || 0) >= 0 ? '#22c55e' : '#ef4444' }}>{formatPct(pb.change30d)}</td>
                      <td className="py-1 text-right tabular-nums" style={{ color: (pb.change90d || 0) >= 0 ? '#22c55e' : '#ef4444' }}>{formatPct(pb.change90d)}</td>
                      <td className="py-1 text-right tabular-nums" style={{ color: (pb.changeYoY || 0) >= 0 ? '#22c55e' : '#ef4444' }}>{formatPct(pb.changeYoY)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 5. PRICE TIERS */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white/[0.02] border border-pcis-border/10 rounded-xl p-3">
            <SectionHeader title="Market Tiers" subtitle="Price segments & share" />
            <div className="grid grid-cols-4 gap-2">
              {(area.priceTiers || []).map((tier: any, idx: number) => (
                <div key={idx} className="bg-white/[0.02] border border-pcis-border/10 rounded-lg p-2">
                  <div className="text-[9px] font-semibold text-pcis-text mb-1.5">{tier.tier}</div>
                  <div className="text-[8px] text-pcis-text-muted/70 mb-1">
                    {formatAED(tier.priceRangeMin)} – {formatAED(tier.priceRangeMax)}
                  </div>
                  <div className="text-[8px] text-pcis-text-muted mb-1.5">
                    <span className="text-pcis-gold font-bold">{tier.avgPriceSqft?.toLocaleString() || '—'}</span> AED/sqft
                  </div>
                  <div className="text-[8px] text-pcis-text-muted mb-1.5">Market: <span className="font-bold text-pcis-text">{tier.pctOfMarket}%</span></div>
                  <div className="h-1.5 bg-white/[0.03] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${tier.pctOfMarket}%`,
                      background: idx === 0 ? '#d4a574' : idx === 1 ? '#3b82f6' : idx === 2 ? '#22c55e' : '#f59e0b',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 6. ACTIVE INVENTORY */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white/[0.02] border border-pcis-border/10 rounded-xl p-3">
            <SectionHeader title="Active Inventory" subtitle={`${(area.totalInventory || 0).toLocaleString()} listings`} />
            <div className="grid grid-cols-4 gap-2">
              {(area.activeInventory || []).map((inv: any, idx: number) => (
                <div key={idx} className="bg-white/[0.02] border border-pcis-border/10 rounded-lg p-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[9px] font-semibold text-pcis-text">{inv.propertyType}</span>
                    <span className="text-[9px] font-bold text-pcis-gold tabular-nums">{inv.count}</span>
                  </div>
                  <div className="space-y-0.5 text-[8px]">
                    <div className="flex justify-between">
                      <span className="text-pcis-text-muted/70">Avg Price</span>
                      <span className="text-pcis-text tabular-nums">{formatAED(inv.avgPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-pcis-text-muted/70">Avg/sqft</span>
                      <span className="text-pcis-text tabular-nums">{inv.avgPriceSqft?.toLocaleString() || '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-pcis-text-muted/70">Avg Size</span>
                      <span className="text-pcis-text tabular-nums">{inv.avgSize?.toLocaleString() || '—'}</span>
                    </div>
                    <div className="flex justify-between text-[7px]">
                      <span className="text-pcis-text-muted/70">Range</span>
                      <span className="text-pcis-text-muted/90">{formatAED(inv.priceRange?.min)}–{formatAED(inv.priceRange?.max)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 7. RECENT TRANSACTIONS */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white/[0.02] border border-pcis-border/10 rounded-xl p-3">
            <SectionHeader title="Recent Transactions" subtitle="last 90 days" />
            <div className="overflow-x-auto">
              <table className="w-full text-[8px]">
                <thead>
                  <tr className="text-pcis-text-muted/50 uppercase tracking-wider border-b border-pcis-border/10">
                    <th className="text-left py-1.5 font-medium px-1">Date</th>
                    <th className="text-left py-1.5 font-medium px-1">Type</th>
                    <th className="text-center py-1.5 font-medium px-1">Bd</th>
                    <th className="text-right py-1.5 font-medium px-1">Size</th>
                    <th className="text-right py-1.5 font-medium px-1">Price</th>
                    <th className="text-right py-1.5 font-medium px-1">/sqft</th>
                    <th className="text-left py-1.5 font-medium px-1">Building</th>
                    <th className="text-center py-1.5 font-medium px-1">Plan</th>
                    <th className="text-left py-1.5 font-medium px-1">Buyer</th>
                    <th className="text-center py-1.5 font-medium px-1">Pymt</th>
                  </tr>
                </thead>
                <tbody className="max-h-48 overflow-y-auto block w-full">
                  {(area.recentTransactions || []).slice(0, 20).map((txn: any) => (
                    <tr key={txn.id} className="border-b border-pcis-border/5 hover:bg-white/[0.02] flex w-full">
                      <td className="py-1 px-1 text-pcis-text-muted tabular-nums w-12 flex-shrink-0">{txn.date}</td>
                      <td className="py-1 px-1 text-pcis-text w-16 flex-shrink-0">{txn.propertyType}</td>
                      <td className="py-1 px-1 text-center text-pcis-text tabular-nums w-8 flex-shrink-0">{txn.bedrooms}</td>
                      <td className="py-1 px-1 text-right text-pcis-text tabular-nums w-14 flex-shrink-0">{txn.size?.toLocaleString() || '—'}</td>
                      <td className="py-1 px-1 text-right text-pcis-text font-medium tabular-nums w-20 flex-shrink-0">{formatAED(txn.price)}</td>
                      <td className="py-1 px-1 text-right text-pcis-text tabular-nums w-12 flex-shrink-0">{txn.priceSqft?.toLocaleString() || '—'}</td>
                      <td className="py-1 px-1 text-pcis-text-secondary truncate flex-1">{txn.building || '—'}</td>
                      <td className="py-1 px-1 text-center w-16 flex-shrink-0">
                        <span className={`text-[7px] px-1 py-0.5 rounded ${txn.isOffPlan ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-white/[0.04] text-pcis-text-muted border border-pcis-border/10'}`}>
                          {txn.isOffPlan ? 'Off' : 'Rdy'}
                        </span>
                      </td>
                      <td className="py-1 px-1 text-pcis-text-secondary w-16 flex-shrink-0 truncate text-[7px]">{txn.buyerNationality}</td>
                      <td className="py-1 px-1 text-center w-14 flex-shrink-0">
                        <span className={`text-[7px] px-1 py-0.5 rounded ${txn.paymentType === 'Cash' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                          {txn.paymentType === 'Cash' ? 'C' : 'F'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 8. BUYER DEMOGRAPHICS */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white/[0.02] border border-pcis-border/10 rounded-xl p-3 relative overflow-hidden">
            <SectionHeader title="Buyer Demographics" subtitle="nationality breakdown" />
            <div className="flex items-center justify-center py-6">
              <div className="text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-pcis-gold/60">Coming soon</span>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 9. SUPPLY PIPELINE */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white/[0.02] border border-pcis-border/10 rounded-xl p-3">
            <SectionHeader title="Supply Pipeline" subtitle={`${(area.supplyPipeline || []).reduce((sum: number, p: any) => sum + (p.totalUnits || 0), 0).toLocaleString()} units incoming`} />
            <div className="overflow-x-auto">
              <table className="w-full text-[8px]">
                <thead>
                  <tr className="text-pcis-text-muted/50 uppercase tracking-wider border-b border-pcis-border/10">
                    <th className="text-left py-1.5 font-medium px-1">Development</th>
                    <th className="text-left py-1.5 font-medium px-1">Developer</th>
                    <th className="text-center py-1.5 font-medium px-1">Units</th>
                    <th className="text-left py-1.5 font-medium px-1">Unit Mix</th>
                    <th className="text-right py-1.5 font-medium px-1">Avg BUA</th>
                    <th className="text-left py-1.5 font-medium px-1">Delivery</th>
                    <th className="text-left py-1.5 font-medium px-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(area.supplyPipeline || []).slice(0, 10).map((proj: any, idx: number) => (
                    <tr key={idx} className="border-b border-pcis-border/5 hover:bg-white/[0.02]">
                      <td className="py-1 px-1 text-pcis-text font-medium">{proj.name}</td>
                      <td className="py-1 px-1 text-pcis-text-secondary">{proj.developer}</td>
                      <td className="py-1 px-1 text-center text-pcis-text font-bold tabular-nums">{(proj.totalUnits || 0).toLocaleString()}</td>
                      <td className="py-1 px-1 text-pcis-text-secondary text-[7px]">
                        {proj.roomMix ? Object.entries(proj.roomMix).map(([k, v]: [string, any]) => `${v}×${k}`).join(' ') : proj.primaryType || '—'}
                      </td>
                      <td className="py-1 px-1 text-right text-pcis-text tabular-nums">{proj.avgBuiltUpArea ? `${proj.avgBuiltUpArea} sqm` : '—'}</td>
                      <td className="py-1 px-1 text-pcis-text-secondary">{proj.expectedDelivery || proj.completionDate || '—'}</td>
                      <td className="py-1 px-1">
                        <span className="text-[7px] px-1.5 py-0.5 rounded bg-white/[0.04] text-pcis-text-muted border border-pcis-border/10">
                          {proj.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 9B. BUILDING REGISTRATION STATS (from DLD unit data) */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          {(area as any).buildingStats && (
            <div className="bg-white/[0.02] border border-pcis-border/10 rounded-xl p-3">
              <SectionHeader title="Unit Registrations" subtitle="DLD building data Q1 2026" />
              <div className="grid grid-cols-5 gap-2 mb-3">
                <div className="bg-white/[0.02] border border-pcis-border/10 rounded-lg p-2">
                  <div className="text-[8px] text-pcis-text-muted/70 uppercase tracking-wider mb-1">Registered</div>
                  <div className="text-[13px] font-bold text-pcis-text tabular-nums">{(area as any).buildingStats.totalRegistered.toLocaleString()}</div>
                </div>
                <div className="bg-white/[0.02] border border-pcis-border/10 rounded-lg p-2">
                  <div className="text-[8px] text-pcis-text-muted/70 uppercase tracking-wider mb-1">Off-Plan</div>
                  <div className="text-[13px] font-bold text-purple-400 tabular-nums">{(area as any).buildingStats.offplanPct}%</div>
                </div>
                <div className="bg-white/[0.02] border border-pcis-border/10 rounded-lg p-2">
                  <div className="text-[8px] text-pcis-text-muted/70 uppercase tracking-wider mb-1">Avg BUA</div>
                  <div className="text-[13px] font-bold text-pcis-text tabular-nums">{(area as any).buildingStats.avgBuiltUpArea} <span className="text-[8px] font-normal text-pcis-text-muted">sqm</span></div>
                </div>
                <div className="bg-white/[0.02] border border-pcis-border/10 rounded-lg p-2">
                  <div className="text-[8px] text-pcis-text-muted/70 uppercase tracking-wider mb-1">Parking</div>
                  <div className="text-[13px] font-bold text-pcis-text tabular-nums">{(area as any).buildingStats.parkingRatio} <span className="text-[8px] font-normal text-pcis-text-muted">/unit</span></div>
                </div>
                <div className="bg-white/[0.02] border border-pcis-border/10 rounded-lg p-2">
                  <div className="text-[8px] text-pcis-text-muted/70 uppercase tracking-wider mb-1">Projects</div>
                  <div className="text-[13px] font-bold text-pcis-gold tabular-nums">{(area as any).buildingStats.projectCount}</div>
                </div>
              </div>
              {/* Room Mix Bar */}
              <div className="border-t border-pcis-border/10 pt-2.5">
                <div className="text-[8px] text-pcis-text-muted/70 uppercase tracking-wider mb-1.5">Unit Mix</div>
                <div className="flex gap-0.5 h-4 rounded overflow-hidden">
                  {Object.entries((area as any).buildingStats.roomMix || {}).map(([room, count]: [string, any], idx: number) => {
                    const total = (area as any).buildingStats.totalRegistered || 1
                    const pct = (count / total) * 100
                    const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#ef4444', '#06b6d4']
                    return pct > 2 ? (
                      <div key={idx} className="relative group" style={{ width: `${pct}%`, background: colors[idx % colors.length] + '40', borderLeft: idx > 0 ? '1px solid rgba(0,0,0,0.2)' : 'none' }}>
                        <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-white/90 truncate px-0.5">
                          {room} ({count})
                        </span>
                      </div>
                    ) : null
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 10. MARKET LIQUIDITY */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white/[0.02] border border-pcis-border/10 rounded-xl p-3">
            <SectionHeader title="Market Liquidity" subtitle="Sell-through dynamics" />
            <div className="grid grid-cols-4 gap-2 mb-3">
              <div className="bg-white/[0.02] border border-pcis-border/10 rounded-lg p-2.5">
                <div className="text-[8px] text-pcis-text-muted/70 uppercase tracking-wider mb-1">Avg Days to Sell</div>
                <div className="text-[13px] font-bold text-pcis-text tabular-nums">{liq?.avgDaysToSell || liq?.avgDaysOnMarket || '—'}</div>
              </div>
              <div className="bg-white/[0.02] border border-pcis-border/10 rounded-lg p-2.5">
                <div className="text-[8px] text-pcis-text-muted/70 uppercase tracking-wider mb-1">Negotiation Margin</div>
                <div className="text-[13px] font-bold text-pcis-text tabular-nums">{liq?.negotiationMarginPct || '—'}%</div>
              </div>
              <div className="bg-white/[0.02] border border-pcis-border/10 rounded-lg p-2.5">
                <div className="text-[8px] text-pcis-text-muted/70 uppercase tracking-wider mb-1">Liquidity Score</div>
                <div className="text-[13px] font-bold tabular-nums" style={{ color: liquidityColor }}>{liqScore}</div>
              </div>
              <div className="bg-white/[0.02] border border-pcis-border/10 rounded-lg p-2.5">
                <div className="text-[8px] text-pcis-text-muted/70 uppercase tracking-wider mb-1">Off-Plan %</div>
                <div className="text-[13px] font-bold text-pcis-text tabular-nums">{liq?.resaleVsOffPlanPct || '—'}%</div>
              </div>
            </div>
            <div className="border-t border-pcis-border/10 pt-2.5">
              <div className="flex items-center gap-2.5">
                <span className="text-[8px] text-pcis-text-muted/70 w-20">Liquidity</span>
                <div className="flex-1 h-2 bg-white/[0.03] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{
                    width: `${liqScore}%`,
                    background: liquidityColor,
                  }} />
                </div>
                <span className="text-[8px] text-pcis-text-muted/70">{liqScore}%</span>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 11. SERVICE CHARGES */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white/[0.02] border border-pcis-border/10 rounded-xl p-3 relative overflow-hidden">
            <SectionHeader title="Service Charges" subtitle="annual burden per sqft" />
            <div className="flex items-center justify-center py-6">
              <div className="text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-pcis-gold/60">Coming soon</span>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 12. REGULATORY & COSTS */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white/[0.02] border border-pcis-border/10 rounded-xl p-3 relative overflow-hidden">
            <SectionHeader title="Regulatory & Costs" subtitle="Dubai real estate framework" />
            <div className="flex items-center justify-center py-6">
              <div className="text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-pcis-gold/60">Coming soon</span>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 13. LIFESTYLE & AMENITIES */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white/[0.02] border border-pcis-border/10 rounded-xl p-3 relative overflow-hidden">
            <SectionHeader title="Lifestyle & Amenities" subtitle="proximity & walkability" />
            <div className="flex items-center justify-center py-6">
              <div className="text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-pcis-gold/60">Coming soon</span>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 14. COMMUNITY PROFILE */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white/[0.02] border border-pcis-border/10 rounded-xl p-3 relative overflow-hidden">
            <SectionHeader title="Community Profile" subtitle="demographics & character" />
            <div className="flex items-center justify-center py-6">
              <div className="text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-pcis-gold/60">Coming soon</span>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 15. SEASONAL PATTERNS */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="bg-white/[0.02] border border-pcis-border/10 rounded-xl p-3 relative overflow-hidden">
            <SectionHeader title="Seasonal Patterns" subtitle="monthly volume index" />
            <div className="flex items-center justify-center py-6">
              <div className="text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-pcis-gold/60">Coming soon</span>
              </div>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════════ */}
          {/* 16. DRIVERS, RISKS, OUTLOOK */}
          {/* ═══════════════════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-3 gap-3 pb-4">

            {/* Key Drivers */}
            <div className="bg-white/[0.02] border border-pcis-border/10 rounded-xl p-3">
              <SectionHeader title="Key Drivers" />
              <div className="space-y-1">
                {(area.keyDrivers || []).map((driver: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 text-[8.5px]">
                    <span className="text-green-400/80 mt-0.5 flex-shrink-0">▸</span>
                    <span className="text-pcis-text-secondary leading-tight">{driver}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Factors */}
            <div className="bg-white/[0.02] border border-pcis-border/10 rounded-xl p-3">
              <SectionHeader title="Risk Factors" />
              <div className="space-y-1">
                {(area.riskFactors || []).map((risk: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 text-[8.5px]">
                    <span className="text-red-400/80 mt-0.5 flex-shrink-0">▸</span>
                    <span className="text-pcis-text-secondary leading-tight">{risk}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Outlook */}
            <div className="bg-white/[0.02] border border-pcis-border/10 rounded-xl p-3">
              <SectionHeader title="Market Outlook" />
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded"
                  style={{ color: outlookColor, background: outlookColor + '15', border: `1px solid ${outlookColor}25` }}>
                  {area.outlook}
                </span>
                <span className="text-[8px]" style={{ color: area.demandTrend === 'rising' ? '#22c55e' : area.demandTrend === 'falling' ? '#ef4444' : '#f59e0b' }}>
                  Demand {area.demandTrend}
                </span>
              </div>
              <p className="text-[8.5px] text-pcis-text-secondary leading-tight">
                {area.outlookReason}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
