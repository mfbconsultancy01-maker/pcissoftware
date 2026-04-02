'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { escapeHtml } from '@/lib/sanitize'
import {
  clients, properties, areaMetrics, intelFeed, marketMetrics,
  intelTypeColors, PROPERTY_COORDS, AREA_COORDS,
  getClientName, getPropertyDetail, getClient,
  recommendations, matches,
  supplyDemandByArea, macroIndicators, momentumSignals,
  type IntelFeedItem, type IntelFeedType,
  type Property, type PropertyDetail, type PropertyImage,
  type Recommendation, type Match, type MomentumType,
} from '@/lib/mockData'
import type * as MaplibreGL from 'maplibre-gl'

// ============================================================
// TYPES & CONSTANTS
// ============================================================

type ViewMode = 'dashboard' | 'feed' | 'map'

const VIEW_TABS: { key: ViewMode; label: string }[] = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'feed', label: 'Feed' },
  { key: 'map', label: 'Map' },
]

const INTEL_TYPES: IntelFeedType[] = ['New Listing', 'Price Change', 'Market Signal', 'Competitive Intel', 'Regulatory Update', 'Developer Launch']

const urgencyColors: Record<string, string> = { High: '#ef4444', Medium: '#d4a574', Low: '#6b7280' }

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

function formatAED(value: number): string {
  if (value >= 1_000_000_000) return `AED ${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `AED ${(value / 1_000_000).toFixed(0)}M`
  if (value >= 1_000) return `AED ${(value / 1_000).toFixed(0)}K`
  return `AED ${value.toFixed(0)}`
}

function formatRelativeTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 30)}mo ago`
}

function trendColor(value: number): string {
  if (value > 0) return '#22c55e'
  if (value < 0) return '#ef4444'
  return '#6b7280'
}

function trendArrow(value: number): string {
  if (value > 0) return '\u25B2'
  if (value < 0) return '\u25BC'
  return '\u25CF'
}

function demandScoreColor(score: number): string {
  if (score >= 90) return '#22c55e'
  if (score >= 75) return '#d4a574'
  if (score >= 60) return '#3b82f6'
  return '#6b7280'
}

// ============================================================
// SVG MICRO-COMPONENTS
// ============================================================

function MiniSparkline({ data, color = '#d4a574', width = 80, height = 28 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')

  const gradientId = `spark-${Math.random().toString(36).slice(2, 8)}`
  const areaPath = `M0,${height} L${points.split(' ').map((p, i) => (i === 0 ? p : ` L${p}`)).join('')} L${width},${height} Z`

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DemandRing({ score, size = 40, strokeWidth = 3 }: { score: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = demandScoreColor(score)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize={size < 44 ? 10 : 12} fontWeight="bold" fontFamily="Inter, system-ui, sans-serif">
        {score}
      </text>
    </svg>
  )
}

function SentimentGauge({ score, size = 80 }: { score: number; size?: number }) {
  const strokeWidth = 5
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (score / 100) * circumference
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#d4a574' : '#ef4444'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2 - 4} textAnchor="middle" dominantBaseline="central"
        fill="#ffffff" fontSize={20} fontWeight="bold" fontFamily="Inter, system-ui, sans-serif">
        {score}
      </text>
      <text x={size / 2} y={size / 2 + 14} textAnchor="middle" dominantBaseline="central"
        fill="rgba(255,255,255,0.4)" fontSize={8} fontFamily="Inter, system-ui, sans-serif">
        SENTIMENT
      </text>
    </svg>
  )
}

// ============================================================
// DONUT CHART
// ============================================================

function DonutChart({ data, size = 120, strokeWidth = 18 }: { data: { label: string; value: number; color: string }[]; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const total = data.reduce((s, d) => s + d.value, 0)
  let accumulated = 0

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
        {data.map((d, i) => {
          const pct = d.value / total
          const dashLen = pct * circumference
          const dashOffset = -accumulated * circumference
          accumulated += pct
          return (
            <circle key={i} cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={d.color} strokeWidth={strokeWidth}
              strokeDasharray={`${dashLen} ${circumference - dashLen}`} strokeDashoffset={dashOffset}
              transform={`rotate(-90 ${size / 2} ${size / 2})`} />
          )
        })}
        <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
          fill="#ffffff" fontSize={18} fontWeight="bold" fontFamily="Inter, system-ui, sans-serif">
          {total}
        </text>
      </svg>
      <div className="flex flex-col gap-1.5">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-[10px] text-pcis-text-secondary">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
            <span>{d.label}</span>
            <span className="font-mono font-semibold ml-auto" style={{ color: d.color }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// HORIZONTAL BAR CHART
// ============================================================

function HorizontalBars({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(...data.map(d => d.value))
  return (
    <div className="flex flex-col gap-2.5">
      {data.map((d, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className="w-16 text-[10px] text-pcis-text-secondary text-right flex-shrink-0">{d.label}</div>
          <div className="flex-1 h-4 bg-white/[0.04] rounded overflow-hidden">
            <div className="h-full rounded transition-all duration-500" style={{ width: `${(d.value / max) * 100}%`, background: d.color }} />
          </div>
          <div className="w-8 text-[10px] font-mono font-semibold text-right" style={{ color: '#d4a574' }}>{d.value}%</div>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// STACKED BAR CHART
// ============================================================

function StackedBar({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div>
      <div className="flex h-6 rounded-md overflow-hidden mb-3">
        {data.map((d, i) => (
          <div key={i} className="transition-all duration-500" style={{ width: `${(d.value / total) * 100}%`, background: d.color, minWidth: d.value > 0 ? 2 : 0 }}
            title={`${d.label}: ${d.value}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[9px] text-pcis-text-secondary">
            <div className="w-1.5 h-1.5 rounded-sm" style={{ background: d.color }} />
            <span>{d.label}</span>
            <span className="font-mono font-semibold" style={{ color: '#d4a574' }}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ============================================================
// BOOK STATS BAR (matching Clients pattern)
// ============================================================

function MarketStatsBar() {
  const highUrgency = intelFeed.filter(i => i.urgency === 'High').length
  const newListings = intelFeed.filter(i => i.type === 'New Listing').length
  const topArea = [...areaMetrics].sort((a, b) => b.demandScore - a.demandScore)[0]

  return (
    <div className="flex items-center gap-6 text-[10px]">
      <div className="flex items-center gap-1.5">
        <span className="text-pcis-text-muted">Avg Price/Sqft:</span>
        <span className="font-semibold text-pcis-gold" style={{ fontFamily: "'Playfair Display', serif" }}>AED {marketMetrics.avgPricePerSqft.toLocaleString()}</span>
      </div>
      <div className="w-px h-3 bg-pcis-border/30" />
      <div className="flex items-center gap-1.5">
        <span className="text-pcis-text-muted">Monthly Vol:</span>
        <span className="font-mono font-semibold text-pcis-text">{marketMetrics.monthlyTransactionVolume}</span>
      </div>
      <div className="w-px h-3 bg-pcis-border/30" />
      <div className="flex items-center gap-1.5">
        <span className="text-pcis-text-muted">High Priority:</span>
        <span className="font-mono font-semibold" style={{ color: '#ef4444' }}>{highUrgency}</span>
      </div>
      <div className="w-px h-3 bg-pcis-border/30" />
      <div className="flex items-center gap-1.5">
        <span className="text-pcis-text-muted">New Listings:</span>
        <span className="font-mono font-semibold" style={{ color: '#22c55e' }}>{newListings}</span>
      </div>
      <div className="w-px h-3 bg-pcis-border/30" />
      <div className="flex items-center gap-1.5">
        <span className="text-pcis-text-muted">Top Area:</span>
        <span className="font-semibold text-pcis-gold" style={{ fontFamily: "'Playfair Display', serif" }}>{topArea?.areaName}</span>
      </div>
    </div>
  )
}

// ============================================================
// DASHBOARD VIEW
// ============================================================

function DashboardView() {
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d' | '1y' | 'all'>('30d')
  const sortedAreas = useMemo(() => [...areaMetrics].sort((a, b) => b.demandScore - a.demandScore), [])

  const dateFilterMs = useMemo(() => {
    const now = Date.now()
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : dateRange === '90d' ? 90 : dateRange === '1y' ? 365 : 99999
    return now - days * 86400000
  }, [dateRange])

  const recentFeed = useMemo(() => [...intelFeed].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).filter(i => new Date(i.timestamp).getTime() >= dateFilterMs).slice(0, 15), [dateFilterMs])

  // Property type distribution
  const propertyTypeDist = useMemo(() => {
    const counts: Record<string, number> = {}
    properties.forEach(p => { counts[p.type] = (counts[p.type] || 0) + 1 })
    const colors: Record<string, string> = { Villa: '#22c55e', Penthouse: '#d4a574', Apartment: '#3b82f6', Estate: '#a78bfa', Townhouse: '#ec4899' }
    return Object.entries(counts).map(([label, value]) => ({ label, value, color: colors[label] || '#6b7280' }))
  }, [])

  // Buyer nationality distribution
  const nationalityDist = useMemo(() => {
    const countries: Record<string, number> = {}
    clients.forEach(c => {
      const parts = c.location.split(', ')
      const country = parts[parts.length - 1] || 'Unknown'
      countries[country] = (countries[country] || 0) + 1
    })
    const sorted = Object.entries(countries).sort((a, b) => b[1] - a[1]).slice(0, 6)
    const total = clients.length
    const colors = ['#d4a574', '#22c55e', '#3b82f6', '#a78bfa', '#f59e0b', '#ec4899']
    return sorted.map(([label, value], i) => ({ label, value: Math.round((value / total) * 100), color: colors[i] }))
  }, [])

  return (
    <div className="p-6 space-y-5">
      {/* Date Range Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[9px] text-pcis-text-muted uppercase tracking-widest font-semibold">Time Range</span>
          <div className="flex gap-1 bg-white/[0.02] border border-pcis-border/20 rounded-lg p-0.5">
            {([
              { key: '7d', label: '7D' },
              { key: '30d', label: '30D' },
              { key: '90d', label: '90D' },
              { key: '1y', label: '1Y' },
              { key: 'all', label: 'All' },
            ] as const).map(opt => (
              <button key={opt.key} onClick={() => setDateRange(opt.key)}
                className="px-3 py-1 rounded-md text-[10px] font-medium transition-all"
                style={{
                  background: dateRange === opt.key ? 'rgba(212,165,116,0.15)' : 'transparent',
                  color: dateRange === opt.key ? '#d4a574' : 'rgba(255,255,255,0.4)',
                  borderBottom: dateRange === opt.key ? '1px solid rgba(212,165,116,0.4)' : '1px solid transparent',
                }}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <span className="text-[9px] text-pcis-text-muted">{recentFeed.length} intel items in range</span>
      </div>

      {/* Market Pulse Strip - matching Clients top metric cards */}
      <div className="grid grid-cols-5 gap-4">
        {/* Avg Price/Sqft */}
        <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-5">
          <p className="text-[10px] text-pcis-text-secondary uppercase tracking-wider mb-2">Avg Price / Sqft</p>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[24px] font-light text-pcis-gold" style={{ fontFamily: "'Playfair Display', serif", letterSpacing: '0.02em' }}>AED {marketMetrics.avgPricePerSqft.toLocaleString()}</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[11px] font-semibold font-mono" style={{ color: trendColor(2.2) }}>{trendArrow(2.2)} 2.2%</span>
                <span className="text-[9px] text-pcis-text-muted">7d</span>
              </div>
            </div>
            <MiniSparkline data={marketMetrics.priceHistory7d} />
          </div>
        </div>

        {/* Monthly Volume */}
        <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-5 text-center">
          <p className="text-[10px] text-pcis-text-secondary uppercase tracking-wider mb-2">Monthly Volume</p>
          <p className="text-[24px] font-bold font-mono text-pcis-text">{marketMetrics.monthlyTransactionVolume}</p>
          <div className="flex items-center justify-center gap-1.5 mt-1">
            <span className="text-[11px] font-semibold font-mono" style={{ color: '#22c55e' }}>{trendArrow(23)} 23%</span>
            <span className="text-[9px] text-pcis-text-muted">YoY</span>
          </div>
        </div>

        {/* Days on Market */}
        <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-5 text-center">
          <p className="text-[10px] text-pcis-text-secondary uppercase tracking-wider mb-2">Days on Market</p>
          <p className="text-[24px] font-bold font-mono" style={{ color: '#22c55e' }}>{marketMetrics.daysOnMarketAvg}</p>
          <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-semibold bg-green-500/10 border border-green-500/20" style={{ color: '#22c55e' }}>Healthy</span>
        </div>

        {/* Total Inventory */}
        <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-5 text-center">
          <p className="text-[10px] text-pcis-text-secondary uppercase tracking-wider mb-2">Total Inventory</p>
          <p className="text-[24px] font-bold font-mono" style={{ color: '#06b6d4' }}>{marketMetrics.totalInventory.toLocaleString()}</p>
          <p className="text-[9px] text-pcis-text-muted mt-1.5">Active listings</p>
        </div>

        {/* Market Sentiment */}
        <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-5 flex items-center justify-center">
          <SentimentGauge score={marketMetrics.marketSentimentScore} />
        </div>
      </div>

      {/* Hot Alerts Strip */}
      {(() => {
        const hotAlerts = intelFeed.filter(i => i.urgency === 'High').sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 4)
        return hotAlerts.length > 0 ? (
          <div className="bg-red-500/[0.04] border border-red-500/20 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <h3 className="text-[10px] text-red-400 uppercase tracking-wider font-semibold">Priority Alerts</h3>
              <span className="text-[9px] text-red-400/60 font-mono">{hotAlerts.length} urgent</span>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {hotAlerts.map(alert => (
                <div key={alert.id} className="bg-black/30 border border-red-500/10 rounded-lg p-3 hover:border-red-500/30 transition-colors cursor-default">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[7px] px-1.5 py-0.5 rounded font-semibold"
                      style={{ background: `${intelTypeColors[alert.type]}18`, color: intelTypeColors[alert.type] }}>{alert.type}</span>
                    <span className="text-[8px] text-pcis-text-muted ml-auto">{formatRelativeTime(alert.timestamp)}</span>
                  </div>
                  <p className="text-[10px] font-medium text-pcis-text leading-snug line-clamp-2">{alert.headline}</p>
                  {alert.tags && alert.tags.length > 0 && (
                    <div className="flex gap-1 mt-1.5">
                      {alert.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[7px] px-1.5 py-0.5 rounded-full bg-white/[0.04] text-pcis-text-muted font-medium">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null
      })()}

      {/* ============================================================ */}
      {/* SUPPLY vs DEMAND PULSE                                       */}
      {/* ============================================================ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-[10px] text-pcis-text-secondary uppercase tracking-wider font-semibold">Supply vs Demand Pulse</h3>
          <span className="text-[8px] px-2 py-0.5 rounded-full bg-white/[0.04] text-pcis-text-muted">Live</span>
        </div>
        {(() => {
          const sorted = [...supplyDemandByArea].sort((a, b) => a.monthsOfSupply - b.monthsOfSupply)
          const avgAboveAsk = Math.round(supplyDemandByArea.reduce((s, a) => s + a.pctAboveAsk, 0) / supplyDemandByArea.length)
          const avgAbsorption = Math.round(supplyDemandByArea.reduce((s, a) => s + a.absorptionRate, 0) / supplyDemandByArea.length * 10) / 10
          return (
            <div className="grid grid-cols-3 gap-4">
              {/* Months of Supply by Area */}
              <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[9px] text-pcis-text-muted uppercase tracking-wider">Months of Supply</h4>
                  <span className="text-[8px] text-pcis-text-muted">&lt;3 = Seller&apos;s  |  &gt;6 = Buyer&apos;s</span>
                </div>
                <div className="space-y-2">
                  {sorted.map(area => {
                    const pct = Math.min(area.monthsOfSupply / 8, 1) * 100
                    const color = area.monthsOfSupply < 3 ? '#ef4444' : area.monthsOfSupply < 6 ? '#d4a574' : '#22c55e'
                    return (
                      <div key={area.area} className="flex items-center gap-2">
                        <span className="text-[9px] text-pcis-text-secondary w-[100px] truncate">{area.area}</span>
                        <div className="flex-1 h-3 bg-white/[0.03] rounded-full overflow-hidden relative">
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}cc, ${color})` }} />
                          {/* 3-month and 6-month markers */}
                          <div className="absolute top-0 bottom-0 w-px bg-white/10" style={{ left: `${(3/8)*100}%` }} />
                          <div className="absolute top-0 bottom-0 w-px bg-white/10" style={{ left: `${(6/8)*100}%` }} />
                        </div>
                        <span className="text-[10px] font-mono font-semibold w-8 text-right" style={{ color }}>{area.monthsOfSupply}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Absorption Rate */}
              <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-[9px] text-pcis-text-muted uppercase tracking-wider">Absorption Rate</h4>
                    <p className="text-[8px] text-pcis-text-muted mt-0.5">Demand vs Supply Balance</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[16px] font-semibold font-mono" style={{ color: avgAbsorption > 0 ? '#22c55e' : '#ef4444' }}>
                      {avgAbsorption > 0 ? '+' : ''}{avgAbsorption}%
                    </span>
                    <p className="text-[7px] text-pcis-text-muted">market avg</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {sorted.map(area => {
                    const maxAbs = 30
                    const barPct = Math.min(Math.abs(area.absorptionRate) / maxAbs, 1) * 50
                    const isPositive = area.absorptionRate >= 0
                    return (
                      <div key={area.area} className="flex items-center gap-2">
                        <span className="text-[8px] text-pcis-text-secondary w-[80px] truncate text-right">{area.area}</span>
                        <div className="flex-1 h-2.5 bg-white/[0.02] rounded-full relative">
                          {/* Center line */}
                          <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/15" />
                          {isPositive ? (
                            <div className="absolute top-0 bottom-0 rounded-r-full" style={{ left: '50%', width: `${barPct}%`, background: 'linear-gradient(90deg, #22c55e88, #22c55e)' }} />
                          ) : (
                            <div className="absolute top-0 bottom-0 rounded-l-full" style={{ right: '50%', width: `${barPct}%`, background: 'linear-gradient(270deg, #ef444488, #ef4444)' }} />
                          )}
                        </div>
                        <span className="text-[9px] font-mono w-8 text-right" style={{ color: isPositive ? '#22c55e' : '#ef4444' }}>
                          {isPositive ? '+' : ''}{area.absorptionRate}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* % Selling Above Ask */}
              <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="text-[9px] text-pcis-text-muted uppercase tracking-wider">Selling Above Ask</h4>
                    <p className="text-[8px] text-pcis-text-muted mt-0.5">Leading Indicator</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[16px] font-semibold text-pcis-gold" style={{ fontFamily: "'Playfair Display', serif" }}>{avgAboveAsk}%</span>
                    <p className="text-[7px] text-pcis-text-muted">market avg</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {[...supplyDemandByArea].sort((a, b) => b.pctAboveAsk - a.pctAboveAsk).map(area => (
                    <div key={area.area} className="flex items-center gap-2">
                      <span className="text-[8px] text-pcis-text-secondary w-[80px] truncate">{area.area}</span>
                      <div className="flex-1 h-2.5 bg-white/[0.03] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{
                          width: `${area.pctAboveAsk}%`,
                          background: area.pctAboveAsk > 35 ? 'linear-gradient(90deg, #d4a57488, #d4a574)' : area.pctAboveAsk > 20 ? 'linear-gradient(90deg, #22c55e66, #22c55e)' : 'linear-gradient(90deg, #3b82f666, #3b82f6)',
                        }} />
                      </div>
                      <span className="text-[9px] font-mono font-semibold w-8 text-right" style={{
                        color: area.pctAboveAsk > 35 ? '#d4a574' : area.pctAboveAsk > 20 ? '#22c55e' : '#3b82f6'
                      }}>{area.pctAboveAsk}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )
        })()}
      </div>

      {/* ============================================================ */}
      {/* MACRO & CAPITAL FLOW RADAR                                   */}
      {/* ============================================================ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-[10px] text-pcis-text-secondary uppercase tracking-wider font-semibold">Macro &amp; Capital Flow Radar</h3>
          <span className="text-[8px] px-2 py-0.5 rounded-full bg-pcis-gold/10 text-pcis-gold font-semibold">Bloomberg-Grade</span>
        </div>
        <div className="grid grid-cols-5 gap-3">
          {macroIndicators.map(ind => (
            <div key={ind.id} className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-4 hover:border-pcis-gold/15 transition-colors">
              <p className="text-[8px] text-pcis-text-muted uppercase tracking-wider mb-1.5">{ind.label}</p>
              <div className="flex items-end justify-between">
                <p className="text-[18px] font-light text-pcis-text leading-none" style={{ fontFamily: "'Playfair Display', serif" }}>{ind.value}</p>
                <span className="text-[9px] font-mono font-semibold" style={{ color: ind.trend > 0 ? '#22c55e' : ind.trend < 0 ? '#ef4444' : '#6b7280' }}>
                  {ind.trend > 0 ? '▲' : ind.trend < 0 ? '▼' : '—'} {Math.abs(ind.trend)}%
                </span>
              </div>
              {/* Mini Sparkline */}
              <svg viewBox="0 0 80 20" className="w-full h-4 mt-2">
                {(() => {
                  const min = Math.min(...ind.sparkline)
                  const max = Math.max(...ind.sparkline)
                  const range = max - min || 1
                  const points = ind.sparkline.map((v, i) => `${(i / (ind.sparkline.length - 1)) * 80},${20 - ((v - min) / range) * 18}`).join(' ')
                  const clr = ind.trend > 0 ? '#22c55e' : ind.trend < 0 ? '#ef4444' : '#6b7280'
                  return (
                    <>
                      <polyline points={points} fill="none" stroke={clr} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
                      <circle cx={80} cy={parseFloat(points.split(' ').pop()?.split(',')[1] || '10')} r="2" fill={clr} />
                    </>
                  )
                })()}
              </svg>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================ */}
      {/* MARKET MOMENTUM SIGNALS                                      */}
      {/* ============================================================ */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <h3 className="text-[10px] text-pcis-text-secondary uppercase tracking-wider font-semibold">Market Momentum Signals</h3>
          <span className="text-[8px] px-2 py-0.5 rounded-full bg-white/[0.04] text-pcis-text-muted">{momentumSignals.length} active</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {momentumSignals.slice(0, 8).map(sig => {
            const styleMap: Record<MomentumType, { color: string; borderColor: string; label: string }> = {
              heating:     { color: '#ef4444', borderColor: 'rgba(239,68,68,0.25)', label: 'Heating' },
              cooling:     { color: '#3b82f6', borderColor: 'rgba(59,130,246,0.25)', label: 'Cooling' },
              warning:     { color: '#f59e0b', borderColor: 'rgba(245,158,11,0.25)', label: 'Alert' },
              opportunity: { color: '#22c55e', borderColor: 'rgba(34,197,94,0.25)', label: 'Opportunity' },
            }
            const s = styleMap[sig.type]
            return (
              <div key={sig.id} className="bg-white/[0.02] rounded-xl p-3.5 transition-colors cursor-default hover:border-pcis-gold/20"
                style={{ border: `1px solid ${s.borderColor}`, borderLeftWidth: 3, borderLeftColor: s.color }}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold text-pcis-text">{sig.area}</span>
                    <span className="text-[7px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wider"
                      style={{ background: `${s.color}12`, color: s.color, border: `1px solid ${s.color}30` }}>{s.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {sig.change !== 0 && (
                      <span className="text-[10px] font-mono font-bold" style={{ color: s.color }}>
                        {sig.change > 0 ? '+' : ''}{sig.change}%
                      </span>
                    )}
                    <span className="text-[8px] text-pcis-text-muted">{sig.timeframe}</span>
                  </div>
                </div>
                <p className="text-[10px] text-pcis-text-secondary leading-snug">{sig.signal}</p>
                <span className="text-[8px] text-pcis-text-muted mt-1 inline-block">{sig.metric}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Area Intelligence Grid */}
      <div>
        <h3 className="text-[10px] text-pcis-text-secondary uppercase tracking-wider mb-3">Area Intelligence</h3>
        <div className="grid grid-cols-3 gap-4">
          {sortedAreas.map(area => (
            <div key={area.areaName} className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-5 hover:border-pcis-gold/20 transition-colors cursor-default">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="text-[14px] font-semibold text-pcis-text">{area.areaName}</h4>
                  <p className="text-[20px] font-light text-pcis-gold mt-0.5" style={{ fontFamily: "'Playfair Display', serif", letterSpacing: '0.02em' }}>{formatAED(area.avgPrice)}</p>
                </div>
                <DemandRing score={area.demandScore} />
              </div>
              <div className="flex items-center gap-3 mb-2.5">
                <span className="text-[11px] text-pcis-text-secondary">AED {area.avgPricePerSqft.toLocaleString()}/sqft</span>
                <span className="text-[11px] font-semibold font-mono" style={{ color: trendColor(area.priceChange7d) }}>
                  {trendArrow(area.priceChange7d)} {Math.abs(area.priceChange7d).toFixed(1)}% 7d
                </span>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex gap-3 text-[9px] text-pcis-text-muted">
                  <span>{area.inventoryCount} listings</span>
                  <span>{area.monthlyVolume} txns/mo</span>
                  <span>{area.daysOnMarket}d avg</span>
                </div>
                {area.activeClientIds.length > 0 && (
                  <span className="text-[9px] font-semibold px-2 py-0.5 rounded bg-pcis-gold/10 text-pcis-gold">
                    {area.activeClientIds.length} client{area.activeClientIds.length > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Market Composition */}
      <div>
        <h3 className="text-[10px] text-pcis-text-secondary uppercase tracking-wider mb-3">Market Composition</h3>
        <div className="grid grid-cols-2 gap-4">
          {/* Property Types */}
          <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-5">
            <h4 className="text-[9px] text-pcis-text-muted uppercase tracking-wider mb-3">Property Types</h4>
            <DonutChart data={propertyTypeDist} />
          </div>

          {/* Buyer Nationalities */}
          <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-5">
            <h4 className="text-[9px] text-pcis-text-muted uppercase tracking-wider mb-3">Buyer Nationalities</h4>
            <HorizontalBars data={nationalityDist} />
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// FEED VIEW
// ============================================================

function FeedView() {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<IntelFeedType | 'All'>('All')
  const [urgencyFilter, setUrgencyFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let items = [...intelFeed].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    if (typeFilter !== 'All') items = items.filter(i => i.type === typeFilter)
    if (urgencyFilter !== 'All') items = items.filter(i => i.urgency === urgencyFilter)
    if (search.trim()) {
      const q = search.toLowerCase()
      items = items.filter(i =>
        i.headline.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.tags.some(t => t.toLowerCase().includes(q))
      )
    }
    return items
  }, [search, typeFilter, urgencyFilter])

  return (
    <div className="p-6 space-y-4">
      {/* Filter Controls */}
      <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-5">
        {/* Search */}
        <input
          type="text"
          placeholder="Search headlines, descriptions, tags..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white/[0.03] border border-pcis-border/40 rounded-lg px-3 py-2 text-[12px] text-pcis-text placeholder-pcis-text-muted/60 focus:outline-none focus:border-pcis-gold/30 transition-colors mb-3"
        />

        {/* Type Pills - matching Clients filter pill pattern */}
        <div className="flex gap-1.5 flex-wrap mb-3">
          <button
            onClick={() => setTypeFilter('All')}
            className={`px-3 py-1 rounded-full text-[9px] font-medium transition-all ${
              typeFilter === 'All'
                ? 'bg-pcis-gold/15 text-pcis-gold border border-pcis-gold/20'
                : 'text-pcis-text-muted bg-white/[0.02] border border-pcis-border/20 hover:border-pcis-border/40'
            }`}
          >All</button>
          {INTEL_TYPES.map(type => (
            <button key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1 rounded-full text-[9px] font-medium transition-all border ${
                typeFilter === type ? '' : 'text-pcis-text-muted bg-white/[0.02] border-pcis-border/20 hover:border-pcis-border/40'
              }`}
              style={typeFilter === type ? {
                background: `${intelTypeColors[type]}18`,
                color: intelTypeColors[type],
                borderColor: `${intelTypeColors[type]}40`,
              } : undefined}
            >{type}</button>
          ))}
        </div>

        {/* Urgency Pills + Count */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {(['All', 'High', 'Medium', 'Low'] as const).map(u => (
              <button key={u}
                onClick={() => setUrgencyFilter(u)}
                className={`px-3 py-1 rounded-full text-[9px] font-medium transition-all border ${
                  urgencyFilter === u ? '' : 'text-pcis-text-muted bg-white/[0.02] border-pcis-border/20 hover:border-pcis-border/40'
                }`}
                style={urgencyFilter === u ? {
                  background: u === 'All' ? 'rgba(212,165,116,0.15)' : `${urgencyColors[u]}18`,
                  color: u === 'All' ? '#d4a574' : urgencyColors[u],
                  borderColor: u === 'All' ? 'rgba(212,165,116,0.2)' : `${urgencyColors[u]}40`,
                } : undefined}
              >{u}</button>
            ))}
          </div>
          <span className="text-[10px] text-pcis-text-muted font-mono">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Feed Items */}
      <div className="space-y-2.5">
        {filtered.map(item => {
          const isExpanded = expandedId === item.id
          return (
            <div key={item.id}
              className="bg-white/[0.02] border border-pcis-border/30 rounded-xl transition-all cursor-pointer hover:border-pcis-border/50"
              style={{ borderLeftWidth: 3, borderLeftColor: intelTypeColors[item.type] }}
              onClick={() => setExpandedId(isExpanded ? null : item.id)}>
              <div className="p-5">
                {/* Header */}
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] px-2 py-0.5 rounded font-semibold"
                      style={{ background: `${intelTypeColors[item.type]}18`, color: intelTypeColors[item.type] }}>{item.type}</span>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: urgencyColors[item.urgency] }} />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-pcis-text-muted">{formatRelativeTime(item.timestamp)}</span>
                    <svg width="10" height="10" viewBox="0 0 10 10" className="transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                      <path d="M2 3.5L5 6.5L8 3.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
                    </svg>
                  </div>
                </div>

                {/* Content */}
                <h4 className="text-[14px] font-semibold text-pcis-text mb-1">{item.headline}</h4>
                <p className="text-[12px] text-pcis-text-secondary leading-relaxed mb-3">{item.description}</p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.map(tag => (
                    <span key={tag} className="text-[9px] px-2 py-0.5 rounded bg-white/[0.04] text-pcis-text-muted">{tag}</span>
                  ))}
                </div>
              </div>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="border-t border-pcis-border/20 px-5 pb-5 pt-4" onClick={e => e.stopPropagation()}>
                  {/* Summary */}
                  {item.summary && (
                    <div className="mb-4">
                      <h5 className="text-[9px] text-pcis-text-muted uppercase tracking-wider font-semibold mb-2">Full Analysis</h5>
                      <p className="text-[11px] text-pcis-text-secondary leading-relaxed">{item.summary}</p>
                    </div>
                  )}

                  {/* Key Facts */}
                  {item.keyFacts && item.keyFacts.length > 0 && (
                    <div className="mb-4">
                      <h5 className="text-[9px] text-pcis-text-muted uppercase tracking-wider font-semibold mb-2">Key Data Points</h5>
                      <div className="grid grid-cols-1 gap-1.5">
                        {item.keyFacts.map((fact, i) => (
                          <div key={i} className="flex items-start gap-2 bg-white/[0.02] rounded-lg px-3 py-2">
                            <span className="text-[8px] text-pcis-gold font-bold mt-0.5 flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                            <span className="text-[10px] text-pcis-text leading-snug">{fact}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Price Change Metadata */}
                  {item.metadata?.priceOld && item.metadata?.priceNew && (
                    <div className="mb-4 flex items-center gap-4 bg-white/[0.02] rounded-lg p-3">
                      <div>
                        <p className="text-[8px] text-pcis-text-muted uppercase">Previous</p>
                        <p className="text-[13px] font-light text-pcis-text-secondary line-through" style={{ fontFamily: "'Playfair Display', serif" }}>AED {(item.metadata.priceOld / 1_000_000).toFixed(1)}M</p>
                      </div>
                      <svg width="16" height="12" viewBox="0 0 16 12"><path d="M0 6H13M13 6L9 2M13 6L9 10" stroke="rgba(212,165,116,0.5)" strokeWidth="1.2" fill="none" /></svg>
                      <div>
                        <p className="text-[8px] text-pcis-text-muted uppercase">Current</p>
                        <p className="text-[13px] font-light text-pcis-gold" style={{ fontFamily: "'Playfair Display', serif" }}>AED {(item.metadata.priceNew / 1_000_000).toFixed(1)}M</p>
                      </div>
                      <div className="ml-auto">
                        <span className="text-[12px] font-mono font-bold" style={{ color: item.metadata.priceNew > item.metadata.priceOld ? '#22c55e' : '#ef4444' }}>
                          {item.metadata.priceNew > item.metadata.priceOld ? '+' : ''}{(((item.metadata.priceNew - item.metadata.priceOld) / item.metadata.priceOld) * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Source Link */}
                  {item.sourceUrl && (
                    <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[10px] text-pcis-gold/70 hover:text-pcis-gold transition-colors group"
                      onClick={e => e.stopPropagation()}>
                      <svg width="12" height="12" viewBox="0 0 12 12" className="opacity-50 group-hover:opacity-100 transition-opacity">
                        <path d="M5 1H2C1.45 1 1 1.45 1 2V10C1 10.55 1.45 11 2 11H10C10.55 11 11 10.55 11 10V7" stroke="currentColor" strokeWidth="1" fill="none" />
                        <path d="M7 1H11V5" stroke="currentColor" strokeWidth="1" fill="none" />
                        <path d="M11 1L5.5 6.5" stroke="currentColor" strokeWidth="1" fill="none" />
                      </svg>
                      <span>{item.sourceName || 'View Source'}</span>
                      <span className="text-pcis-text-muted">— {item.sourceUrl.replace(/https?:\/\/(www\.)?/, '').split('/')[0]}</span>
                    </a>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="text-center py-12 text-pcis-text-muted text-[12px]">
            No intel items match your filters
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// PRICE TIER HELPERS
// ============================================================

function priceTierColor(price: number): string {
  if (price >= 100_000_000) return '#d4a574'
  if (price >= 40_000_000) return '#22c55e'
  return '#3b82f6'
}

function priceTierLabel(price: number): string {
  if (price >= 100_000_000) return 'Ultra-Prime'
  if (price >= 40_000_000) return 'Luxury'
  return 'Premium'
}

// ============================================================
// LISTINGS PANEL - shows properties in a selected area
// ============================================================

function ListingsPanel({
  areaName,
  onClose,
  onSelectProperty,
}: {
  areaName: string
  onClose: () => void
  onSelectProperty: (property: Property) => void
}) {
  const area = areaMetrics.find(a => a.areaName === areaName)
  const areaProperties = properties.filter(p => p.area === areaName)

  return (
    <div className="absolute left-4 top-4 bottom-4 z-[25] w-[320px] bg-[#0a0a0a]/95 backdrop-blur-xl border border-pcis-border/30 rounded-xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-pcis-border/20">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h3 className="text-[15px] font-semibold text-pcis-text">{areaName}</h3>
            {area && <p className="text-[20px] font-light text-pcis-gold mt-0.5" style={{ fontFamily: "'Playfair Display', serif", letterSpacing: '0.02em' }}>{formatAED(area.avgPrice)}</p>}
          </div>
          <div className="flex items-center gap-2">
            {area && <DemandRing score={area.demandScore} size={42} />}
            <button onClick={onClose} className="text-pcis-text-muted hover:text-pcis-text transition-colors text-[16px] ml-1">&times;</button>
          </div>
        </div>

        {/* Area stats */}
        {area && (
          <div className="flex gap-3 text-[9px] text-pcis-text-muted mt-1">
            <span>AED {area.avgPricePerSqft.toLocaleString()}/sqft</span>
            <span style={{ color: trendColor(area.priceChange7d) }} className="font-semibold">
              {trendArrow(area.priceChange7d)} {Math.abs(area.priceChange7d).toFixed(1)}%
            </span>
            <span>{area.inventoryCount} listings</span>
            <span>{area.daysOnMarket}d avg</span>
          </div>
        )}

        {/* Active clients */}
        {area && area.activeClientIds.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2.5">
            <span className="text-[8px] text-pcis-text-muted mr-1">Active clients:</span>
            {area.activeClientIds.map(cid => (
              <span key={cid} className="text-[8px] px-1.5 py-0.5 rounded bg-pcis-gold/10 text-pcis-gold font-semibold">
                {getClientName(cid)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Property List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {areaProperties.length === 0 ? (
          <div className="text-center py-8 text-pcis-text-muted text-[11px]">No properties in this area</div>
        ) : (
          areaProperties.map(property => (
            <div key={property.id}
              className="bg-white/[0.02] border border-pcis-border/20 rounded-lg p-3 hover:border-pcis-gold/20 transition-colors cursor-pointer group"
              onClick={() => onSelectProperty(property)}>
              <div className="flex items-start justify-between mb-1.5">
                <h4 className="text-[12px] font-semibold text-pcis-text group-hover:text-pcis-gold transition-colors">{property.name}</h4>
                <span className="text-[8px] px-1.5 py-0.5 rounded font-semibold flex-shrink-0 ml-2"
                  style={{ background: `${priceTierColor(property.price)}18`, color: priceTierColor(property.price) }}>
                  {property.type}
                </span>
              </div>
              <p className="text-[16px] font-light text-pcis-gold mb-1.5" style={{ fontFamily: "'Playfair Display', serif", letterSpacing: '0.02em' }}>{formatAED(property.price)}</p>
              <div className="flex items-center gap-3 text-[9px] text-pcis-text-muted mb-2">
                <span>{property.bedrooms} bed{property.bedrooms > 1 ? 's' : ''}</span>
                <span>{property.currency}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {property.features.slice(0, 3).map(f => (
                  <span key={f} className="text-[8px] px-1.5 py-0.5 rounded bg-white/[0.04] text-pcis-text-muted">{f}</span>
                ))}
              </div>
              <div className="mt-2 text-[9px] text-pcis-gold font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                View 3D Model &rarr;
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

// ============================================================
// IMMERSIVE PROPERTY DETAIL PANEL
// ============================================================

type DetailTab = 'gallery' | 'details' | '3d'

function ThreeCanvas({ property }: { property: Property }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<any>(null)
  const animFrameRef = useRef<number>(0)
  const initRef = useRef(false)

  useEffect(() => {
    if (!containerRef.current || initRef.current) return
    initRef.current = true
    let cancelled = false

    async function setup() {
      const THREE = await import('three')
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js')
      if (cancelled || !containerRef.current) return
      await new Promise(r => setTimeout(r, 50))
      if (cancelled || !containerRef.current) return

      const w = containerRef.current.clientWidth || 400
      const h = containerRef.current.clientHeight || 400

      // --- Photorealistic renderer ---
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
      renderer.setSize(w, h)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      renderer.setClearColor(0x08090c, 1)
      renderer.shadowMap.enabled = true
      renderer.shadowMap.type = THREE.PCFSoftShadowMap
      renderer.toneMapping = THREE.ACESFilmicToneMapping
      renderer.toneMappingExposure = 1.4
      containerRef.current.appendChild(renderer.domElement)
      rendererRef.current = renderer

      const scene = new THREE.Scene()
      scene.fog = new THREE.FogExp2(0x08090c, 0.035)

      // --- Procedural environment (warm dusk gradient) ---
      const pmremGen = new THREE.PMREMGenerator(renderer)
      pmremGen.compileEquirectangularShader()
      const envScene = new THREE.Scene()
      // Sky dome with dusk gradient
      const skyGeo = new THREE.SphereGeometry(50, 32, 32)
      const skyMat = new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {},
        vertexShader: `varying vec3 vWorldPos; void main(){ vWorldPos = (modelMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `varying vec3 vWorldPos;
          void main(){
            float h = normalize(vWorldPos).y;
            vec3 zenith = vec3(0.02, 0.02, 0.06);
            vec3 horizon = vec3(0.12, 0.06, 0.03);
            vec3 ground = vec3(0.015, 0.015, 0.02);
            vec3 col = h > 0.0 ? mix(horizon, zenith, smoothstep(0.0, 0.6, h)) : mix(horizon, ground, smoothstep(0.0, -0.3, h));
            // Warm glow near horizon
            float glowAngle = atan(vWorldPos.z, vWorldPos.x);
            float glow = exp(-4.0 * abs(h)) * (0.5 + 0.5 * cos(glowAngle - 1.2));
            col += vec3(0.25, 0.12, 0.04) * glow * 0.5;
            gl_FragColor = vec4(col, 1.0);
          }`
      })
      envScene.add(new THREE.Mesh(skyGeo, skyMat))
      const envRT = pmremGen.fromScene(envScene, 0, 0.1, 100)
      scene.environment = envRT.texture
      pmremGen.dispose()

      // --- Camera ---
      const camera = new THREE.PerspectiveCamera(40, w / h, 0.1, 120)
      camera.position.set(9, 5.5, 9)
      camera.lookAt(0, 1.2, 0)

      // --- Controls ---
      const controls = new OrbitControls(camera, renderer.domElement)
      controls.target.set(0, 1.2, 0)
      controls.enableDamping = true
      controls.dampingFactor = 0.06
      controls.autoRotate = true
      controls.autoRotateSpeed = 0.8
      controls.maxDistance = 20
      controls.minDistance = 3.5
      controls.maxPolarAngle = Math.PI / 2.15
      controls.minPolarAngle = 0.2
      controls.update()

      // --- Lighting rig (cinematic 3-point + fill) ---
      // Key light: warm directional (sun at dusk angle)
      const keyLight = new THREE.DirectionalLight(0xffd4a0, 2.8)
      keyLight.position.set(8, 12, 6)
      keyLight.castShadow = true
      keyLight.shadow.mapSize.set(2048, 2048)
      keyLight.shadow.camera.near = 0.5
      keyLight.shadow.camera.far = 40
      keyLight.shadow.camera.left = -12
      keyLight.shadow.camera.right = 12
      keyLight.shadow.camera.top = 12
      keyLight.shadow.camera.bottom = -12
      keyLight.shadow.bias = -0.0002
      keyLight.shadow.normalBias = 0.02
      keyLight.shadow.radius = 4
      scene.add(keyLight)

      // Fill light: cool blue from opposite
      const fillLight = new THREE.DirectionalLight(0x8090c0, 0.6)
      fillLight.position.set(-6, 5, -4)
      scene.add(fillLight)

      // Rim light: warm accent from behind
      const rimLight = new THREE.DirectionalLight(0xd4a574, 1.0)
      rimLight.position.set(-3, 6, 8)
      scene.add(rimLight)

      // Hemisphere ambient: sky/ground
      const hemiLight = new THREE.HemisphereLight(0x1a1a30, 0x0a0804, 0.5)
      scene.add(hemiLight)

      // Subtle point light for pool/gold accent glow
      const accentLight = new THREE.PointLight(0xd4a574, 0.4, 15, 2)
      accentLight.position.set(0, 0.5, 0)
      scene.add(accentLight)

      // --- Ground plane (polished concrete with subtle reflection) ---
      const groundMat = new THREE.MeshPhysicalMaterial({
        color: 0x0e0e10,
        metalness: 0.1,
        roughness: 0.85,
        clearcoat: 0.08,
        clearcoatRoughness: 0.9,
        envMapIntensity: 0.3,
      })
      const ground = new THREE.Mesh(new THREE.CircleGeometry(16, 128), groundMat)
      ground.rotation.x = -Math.PI / 2
      ground.position.y = -0.005
      ground.receiveShadow = true
      scene.add(ground)

      // Subtle radial grid
      const gridMat = new THREE.LineBasicMaterial({ color: 0x151518, transparent: true, opacity: 0.4 })
      for (let r = 2; r <= 14; r += 2) {
        const ringGeo = new THREE.RingGeometry(r - 0.01, r + 0.01, 64)
        const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: 0x151518, transparent: true, opacity: 0.15, side: THREE.DoubleSide }))
        ring.rotation.x = -Math.PI / 2; ring.position.y = 0.001; scene.add(ring)
      }

      // --- Build the property model ---
      const model = buildPropertyModel(property, THREE)
      scene.add(model)

      // --- Animation loop ---
      const clock = new THREE.Clock()
      function animate() {
        if (cancelled) return
        animFrameRef.current = requestAnimationFrame(animate)
        const t = clock.getElapsedTime()
        // Animate water surfaces if they exist
        model.traverse((child: any) => {
          if (child.userData?.isWater && child.material) {
            child.material.opacity = 0.55 + Math.sin(t * 1.5) * 0.08
            child.position.y = child.userData.baseY + Math.sin(t * 0.8) * 0.008
          }
        })
        controls.update()
        renderer.render(scene, camera)
      }
      animate()

      const onResize = () => {
        if (!containerRef.current) return
        const nw = containerRef.current.clientWidth; const nh = containerRef.current.clientHeight
        if (nw > 0 && nh > 0) { camera.aspect = nw / nh; camera.updateProjectionMatrix(); renderer.setSize(nw, nh) }
      }
      window.addEventListener('resize', onResize)
      const ro = new ResizeObserver(onResize); if (containerRef.current) ro.observe(containerRef.current)
      ;(containerRef.current as any).__cleanup = () => { window.removeEventListener('resize', onResize); ro.disconnect() }
    }
    setup()

    return () => {
      cancelled = true
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (rendererRef.current) { rendererRef.current.dispose(); rendererRef.current.domElement?.remove() }
      if (containerRef.current && (containerRef.current as any).__cleanup) (containerRef.current as any).__cleanup()
      initRef.current = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [property.id])

  return <div ref={containerRef} className="w-full h-full" />
}

function PropertyDetailPanel({
  property,
  onClose,
  compareIds,
  onToggleCompare,
}: {
  property: Property
  onClose: () => void
  compareIds: string[]
  onToggleCompare: (id: string) => void
}) {
  const [activeTab, setActiveTab] = useState<DetailTab>('gallery')
  const [activeImageIdx, setActiveImageIdx] = useState(0)
  const [calcDownPct, setCalcDownPct] = useState(20)
  const [calcYears, setCalcYears] = useState(25)
  const [calcRate, setCalcRate] = useState(4.5)
  const detail = getPropertyDetail(property.id)
  const images = detail?.images ?? []
  const propertyMatches = useMemo(() => matches.filter(m => m.propertyId === property.id).sort((a, b) => b.overallScore - a.overallScore), [property.id])

  const TABS: { key: DetailTab; label: string }[] = [
    { key: 'gallery', label: 'Gallery' },
    { key: 'details', label: 'Details' },
    { key: '3d', label: '3D Model' },
  ]

  return (
    <div className="absolute right-0 top-0 bottom-0 z-[25] bg-[#0a0a0a]/97 backdrop-blur-xl border-l border-pcis-border/30 flex flex-col overflow-hidden"
      style={{ width: 520 }}>
      {/* Header */}
      <div className="flex-shrink-0 px-5 pt-4 pb-3 border-b border-pcis-border/20">
        <div className="flex items-start justify-between mb-1">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[9px] px-2 py-0.5 rounded font-semibold"
                style={{ background: `${priceTierColor(property.price)}18`, color: priceTierColor(property.price) }}>
                {property.type}
              </span>
              {detail?.completionStatus && (
                <span className="text-[8px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 font-medium">{detail.completionStatus}</span>
              )}
            </div>
            <h3 className="text-[18px] font-semibold text-pcis-text leading-tight">{property.name}</h3>
            <p className="text-[10px] text-pcis-text-muted mt-0.5">{property.area} - {detail?.viewType ?? ''}</p>
          </div>
          <button onClick={onClose}
            className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-white/[0.06] border border-pcis-border/20 text-pcis-text-muted hover:text-pcis-text hover:bg-white/[0.1] transition-colors text-[14px] ml-3">
            &times;
          </button>
        </div>
        {detail?.tagline && <p className="text-[11px] text-pcis-gold/80 italic mt-1">{detail.tagline}</p>}

        {/* Price + Key Stats */}
        <div className="flex items-end gap-4 mt-3 mb-3">
          <p className="text-[28px] font-light text-pcis-gold leading-none" style={{ fontFamily: "'Playfair Display', serif", letterSpacing: '0.03em' }}>{formatAED(property.price)}</p>
          {detail?.specs && (
            <div className="flex gap-3 text-[10px] text-pcis-text-muted pb-0.5">
              <span>{detail.specs.totalArea.toLocaleString()} sqft</span>
              <span>{property.bedrooms} bed</span>
              <span>{detail.specs.bathrooms} bath</span>
              <span>{detail.specs.parking} parking</span>
            </div>
          )}
        </div>

        {/* Client Matches Strip */}
        {propertyMatches.length > 0 && (
          <div className="mb-3 p-2.5 bg-white/[0.02] border border-pcis-border/20 rounded-lg">
            <p className="text-[8px] text-pcis-text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-pcis-gold" /> Matched Clients
              <span className="text-[7px] text-pcis-gold font-mono ml-auto">{propertyMatches.length} match{propertyMatches.length > 1 ? 'es' : ''}</span>
            </p>
            <div className="flex flex-col gap-1.5">
              {propertyMatches.slice(0, 3).map(m => {
                const client = getClient(m.clientId)
                const gradeColor = m.grade.startsWith('A') ? '#22c55e' : m.grade.startsWith('B') ? '#d4a574' : '#6b7280'
                return (
                  <div key={m.id} className="flex items-center gap-2.5 group">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-pcis-gold/10 border border-pcis-gold/20 flex items-center justify-center text-[8px] font-bold text-pcis-gold">
                      {client?.initials ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium text-pcis-text truncate">{client?.name ?? 'Unknown'}</p>
                      <p className="text-[8px] text-pcis-text-muted truncate">{m.aiIntelligence.slice(0, 80)}...</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[10px] font-bold font-mono" style={{ color: gradeColor }}>{m.grade}</span>
                      <span className="text-[8px] text-pcis-text-muted font-mono">{Math.round(m.overallScore * 100)}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 mb-3">
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-pcis-gold/10 border border-pcis-gold/20 text-[9px] font-semibold text-pcis-gold hover:bg-pcis-gold/20 transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            Share
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white/[0.04] border border-pcis-border/20 text-[9px] font-semibold text-pcis-text-muted hover:text-pcis-text hover:bg-white/[0.08] transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            Book Viewing
          </button>
          <button className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white/[0.04] border border-pcis-border/20 text-[9px] font-semibold text-pcis-text-muted hover:text-pcis-text hover:bg-white/[0.08] transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            PDF Report
          </button>
          <button onClick={() => onToggleCompare(property.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-[9px] font-semibold transition-colors ${
              compareIds.includes(property.id)
                ? 'bg-blue-500/20 border border-blue-500/30 text-blue-400'
                : 'bg-white/[0.04] border border-pcis-border/20 text-pcis-text-muted hover:text-pcis-text hover:bg-white/[0.08]'
            }`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="1" y="3" width="9" height="18" rx="1"/><rect x="14" y="3" width="9" height="18" rx="1"/></svg>
            {compareIds.includes(property.id) ? 'In Compare' : 'Compare'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center bg-white/[0.03] border border-pcis-border/40 rounded-lg overflow-hidden">
          {TABS.map((tab, i) => (
            <div key={tab.key} className="flex items-center flex-1">
              {i > 0 && <div className="w-px h-5 bg-pcis-border/30" />}
              <button onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-3 py-1.5 text-[10px] font-medium transition-colors text-center ${
                  activeTab === tab.key ? 'bg-pcis-gold/10 text-pcis-gold' : 'text-pcis-text-muted hover:text-pcis-text'
                }`}>
                {tab.label}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {/* Gallery Tab */}
        {activeTab === 'gallery' && (
          <div className="flex flex-col">
            {/* Main Image */}
            <div className="relative w-full" style={{ height: 280 }}>
              {images.length > 0 ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={images[activeImageIdx]?.url}
                    alt={images[activeImageIdx]?.caption ?? ''}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect fill="%231a1a1a" width="800" height="400"/><text x="400" y="200" fill="%23d4a574" text-anchor="middle" font-size="18">' + property.name + '</text></svg>')}` }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <p className="text-[11px] text-white/90">{images[activeImageIdx]?.caption}</p>
                    <p className="text-[9px] text-white/50 mt-0.5">{activeImageIdx + 1} / {images.length}</p>
                  </div>
                </>
              ) : (
                <div className="w-full h-full bg-pcis-card flex items-center justify-center text-pcis-text-muted text-[11px]">No images available</div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex gap-1 p-2 overflow-x-auto">
                {images.map((img, idx) => (
                  <button key={idx} onClick={() => setActiveImageIdx(idx)}
                    className={`flex-shrink-0 w-[72px] h-[48px] rounded overflow-hidden border-2 transition-colors ${idx === activeImageIdx ? 'border-pcis-gold' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url.replace('w=1200', 'w=200')} alt={img.caption} className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  </button>
                ))}
              </div>
            )}

            {/* Description */}
            {detail && (
              <div className="px-5 py-4">
                <p className="text-[11px] text-pcis-text-secondary leading-relaxed mb-4">{detail.description}</p>

                {/* Highlights */}
                <h4 className="text-[9px] text-pcis-text-secondary uppercase tracking-wider mb-2">Key Highlights</h4>
                <div className="space-y-1.5 mb-4">
                  {detail.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 text-[10px] text-pcis-text-muted">
                      <span className="text-pcis-gold mt-px flex-shrink-0">{'\u2726'}</span>
                      <span>{h}</span>
                    </div>
                  ))}
                </div>

                {/* Amenities */}
                <h4 className="text-[9px] text-pcis-text-secondary uppercase tracking-wider mb-2">Amenities</h4>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {detail.amenities.map(a => (
                    <span key={a} className="text-[8px] px-2 py-0.5 rounded-full bg-white/[0.04] text-pcis-text-muted border border-pcis-border/20">{a}</span>
                  ))}
                </div>

                {/* Developer / Architect */}
                <div className="flex gap-4 text-[10px] text-pcis-text-muted">
                  <div><span className="text-pcis-text-secondary">Developer:</span> {detail.developer}</div>
                  {detail.architect && <div><span className="text-pcis-text-secondary">Architect:</span> {detail.architect}</div>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Details Tab */}
        {activeTab === 'details' && detail && (
          <div className="p-5 space-y-5">
            {/* Specs Grid */}
            <div>
              <h4 className="text-[9px] text-pcis-text-secondary uppercase tracking-wider mb-3">Property Specifications</h4>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Total Area', value: `${detail.specs.totalArea.toLocaleString()} sqft` },
                  { label: 'Plot Size', value: detail.specs.plotSize ? `${detail.specs.plotSize.toLocaleString()} sqft` : 'N/A' },
                  { label: 'Built Year', value: detail.specs.builtYear.toString() },
                  { label: 'Floors', value: detail.specs.floors.toString() },
                  { label: 'Bedrooms', value: property.bedrooms.toString() },
                  { label: 'Bathrooms', value: detail.specs.bathrooms.toString() },
                  { label: 'Parking', value: detail.specs.parking.toString() },
                  { label: 'Furnishing', value: detail.furnishing },
                  { label: 'Service Charge', value: detail.specs.serviceCharge ? `AED ${detail.specs.serviceCharge}/sqft/yr` : 'N/A' },
                ].map(s => (
                  <div key={s.label} className="bg-white/[0.02] border border-pcis-border/20 rounded-lg p-2.5">
                    <p className="text-[8px] text-pcis-text-secondary uppercase tracking-wider">{s.label}</p>
                    <p className="text-[13px] font-semibold text-pcis-text mt-0.5">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Price History Chart */}
            {detail.priceHistory && detail.priceHistory.length > 1 && (() => {
              const hist = detail.priceHistory!
              const minP = Math.min(...hist.map(h => h.price))
              const maxP = Math.max(...hist.map(h => h.price))
              const rangeP = maxP - minP || 1
              const chartW = 460
              const chartH = 100
              const pad = { top: 8, bottom: 20, left: 0, right: 0 }
              const w = chartW - pad.left - pad.right
              const h = chartH - pad.top - pad.bottom
              const pts = hist.map((entry, i) => ({
                x: pad.left + (i / (hist.length - 1)) * w,
                y: pad.top + h - ((entry.price - minP) / rangeP) * h,
                ...entry,
              }))
              const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
              const areaD = `${pathD} L${pts[pts.length - 1].x},${chartH - pad.bottom} L${pts[0].x},${chartH - pad.bottom} Z`
              const gradId = 'ph-grad'
              return (
                <div>
                  <h4 className="text-[9px] text-pcis-text-secondary uppercase tracking-wider mb-3">Price History (12 Months)</h4>
                  <div className="bg-white/[0.02] border border-pcis-border/20 rounded-xl p-4">
                    <div className="flex justify-between text-[9px] text-pcis-text-muted mb-2">
                      <span>{formatAED(maxP)}</span>
                      <span className="font-mono font-semibold" style={{ color: hist[hist.length - 1].price >= hist[0].price ? '#22c55e' : '#ef4444' }}>
                        {hist[hist.length - 1].price >= hist[0].price ? '+' : ''}{(((hist[hist.length - 1].price - hist[0].price) / hist[0].price) * 100).toFixed(1)}% overall
                      </span>
                    </div>
                    <svg width={chartW} height={chartH} viewBox={`0 0 ${chartW} ${chartH}`} className="w-full">
                      <defs>
                        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#d4a574" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#d4a574" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {/* Grid lines */}
                      {[0, 0.25, 0.5, 0.75, 1].map(pct => (
                        <line key={pct} x1={pad.left} y1={pad.top + h * (1 - pct)} x2={chartW - pad.right} y2={pad.top + h * (1 - pct)}
                          stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
                      ))}
                      <path d={areaD} fill={`url(#${gradId})`} />
                      <polyline points={pts.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="#d4a574" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      {/* Event dots */}
                      {pts.filter(p => p.event).map((p, i) => (
                        <g key={i}>
                          <circle cx={p.x} cy={p.y} r={3} fill="#d4a574" stroke="#0a0a0a" strokeWidth="1.5" />
                        </g>
                      ))}
                    </svg>
                    {/* Date labels */}
                    <div className="flex justify-between text-[7px] text-pcis-text-muted mt-1">
                      <span>{new Date(hist[0].date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}</span>
                      <span>{new Date(hist[Math.floor(hist.length / 2)].date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}</span>
                      <span>{new Date(hist[hist.length - 1].date).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })}</span>
                    </div>
                    {/* Event timeline */}
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {hist.filter(h => h.event).map((h, i) => (
                        <span key={i} className="text-[7px] px-1.5 py-0.5 rounded bg-white/[0.04] text-pcis-text-muted border border-pcis-border/10">
                          {new Date(h.date).toLocaleDateString('en-US', { month: 'short' })} — {h.event}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Investment Metrics */}
            <div>
              <h4 className="text-[9px] text-pcis-text-secondary uppercase tracking-wider mb-3">Investment Analysis</h4>
              <div className="bg-white/[0.02] border border-pcis-border/20 rounded-xl p-4 space-y-3">
                <div className="flex justify-between text-[10px]">
                  <span className="text-pcis-text-muted">Price / sqft</span>
                  <span className="font-semibold text-pcis-gold" style={{ fontFamily: "'Playfair Display', serif" }}>AED {detail.investment.pricePerSqft.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-pcis-text-muted">Est. Rental Yield</span>
                  <span className="font-mono font-semibold text-green-400">{detail.investment.estimatedRentalYield}%</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-pcis-text-muted">5yr Capital Appreciation</span>
                  <span className="font-mono font-semibold text-green-400">+{detail.investment.capitalAppreciation5yr}%</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-pcis-text-muted">DLD Registration Fee</span>
                  <span className="font-semibold text-pcis-text" style={{ fontFamily: "'Playfair Display', serif" }}>{formatAED(detail.investment.dldFee)}</span>
                </div>
                <div className="border-t border-pcis-border/20 pt-2 mt-2">
                  <p className="text-[9px] text-pcis-text-secondary">Comparable Recent Sale</p>
                  <p className="text-[10px] text-pcis-text-muted mt-0.5">{detail.investment.comparableRecentSale}</p>
                </div>
              </div>
            </div>

            {/* Mortgage / Payment Calculator */}
            <div>
              <h4 className="text-[9px] text-pcis-text-secondary uppercase tracking-wider mb-3">Payment Calculator</h4>
              <div className="bg-white/[0.02] border border-pcis-border/20 rounded-xl p-4 space-y-4">
                {(() => {
                  const price = property.price
                  const downPayment = price * (calcDownPct / 100)
                  const loanAmount = price - downPayment
                  const monthlyRate = calcRate / 100 / 12
                  const numPayments = calcYears * 12
                  const monthlyPayment = monthlyRate > 0
                    ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / (Math.pow(1 + monthlyRate, numPayments) - 1)
                    : loanAmount / numPayments
                  const totalCost = monthlyPayment * numPayments + downPayment
                  const totalInterest = totalCost - price
                  const dldFee = price * 0.04
                  const agentFee = price * 0.02
                  const totalUpfront = downPayment + dldFee + agentFee

                  return (
                    <>
                      {/* Sliders */}
                      <div>
                        <div className="flex justify-between text-[9px] mb-1.5">
                          <span className="text-pcis-text-muted">Down Payment</span>
                          <span className="font-mono font-semibold text-pcis-gold">{calcDownPct}% — {formatAED(downPayment)}</span>
                        </div>
                        <input type="range" min={10} max={80} step={5} value={calcDownPct}
                          onChange={e => setCalcDownPct(Number(e.target.value))}
                          className="w-full h-1.5 rounded-full appearance-none bg-white/[0.06] cursor-pointer"
                          style={{ accentColor: '#d4a574' }} />
                      </div>
                      <div>
                        <div className="flex justify-between text-[9px] mb-1.5">
                          <span className="text-pcis-text-muted">Mortgage Term</span>
                          <span className="font-mono font-semibold text-pcis-text">{calcYears} years</span>
                        </div>
                        <input type="range" min={5} max={30} step={5} value={calcYears}
                          onChange={e => setCalcYears(Number(e.target.value))}
                          className="w-full h-1.5 rounded-full appearance-none bg-white/[0.06] cursor-pointer"
                          style={{ accentColor: '#d4a574' }} />
                      </div>
                      <div>
                        <div className="flex justify-between text-[9px] mb-1.5">
                          <span className="text-pcis-text-muted">Interest Rate</span>
                          <span className="font-mono font-semibold text-pcis-text">{calcRate}%</span>
                        </div>
                        <input type="range" min={2} max={8} step={0.25} value={calcRate}
                          onChange={e => setCalcRate(Number(e.target.value))}
                          className="w-full h-1.5 rounded-full appearance-none bg-white/[0.06] cursor-pointer"
                          style={{ accentColor: '#d4a574' }} />
                      </div>

                      {/* Results */}
                      <div className="border-t border-pcis-border/20 pt-3 space-y-2.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-pcis-text-muted">Monthly Payment</span>
                          <span className="text-[14px] font-light text-pcis-gold" style={{ fontFamily: "'Playfair Display', serif", letterSpacing: '0.02em' }}>{formatAED(monthlyPayment)}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-pcis-text-muted">Loan Amount</span>
                          <span className="font-mono font-semibold text-pcis-text">{formatAED(loanAmount)}</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-pcis-text-muted">Total Interest</span>
                          <span className="font-mono font-semibold text-red-400">{formatAED(totalInterest)}</span>
                        </div>
                      </div>

                      {/* Total Upfront Costs */}
                      <div className="border-t border-pcis-border/20 pt-3">
                        <p className="text-[8px] text-pcis-text-secondary uppercase tracking-wider mb-2">Total Upfront Costs</p>
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[9px]">
                            <span className="text-pcis-text-muted">Down Payment ({calcDownPct}%)</span>
                            <span className="font-mono text-pcis-text">{formatAED(downPayment)}</span>
                          </div>
                          <div className="flex justify-between text-[9px]">
                            <span className="text-pcis-text-muted">DLD Registration (4%)</span>
                            <span className="font-mono text-pcis-text">{formatAED(dldFee)}</span>
                          </div>
                          <div className="flex justify-between text-[9px]">
                            <span className="text-pcis-text-muted">Agent Commission (2%)</span>
                            <span className="font-mono text-pcis-text">{formatAED(agentFee)}</span>
                          </div>
                          <div className="flex justify-between text-[10px] pt-1.5 border-t border-pcis-border/10">
                            <span className="font-semibold text-pcis-text">Total Required</span>
                            <span className="font-semibold text-pcis-gold" style={{ fontFamily: "'Playfair Display', serif" }}>{formatAED(totalUpfront)}</span>
                          </div>
                        </div>
                      </div>

                      {/* ROI Snapshot */}
                      <div className="border-t border-pcis-border/20 pt-3">
                        <p className="text-[8px] text-pcis-text-secondary uppercase tracking-wider mb-2">5-Year Investment Snapshot</p>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="text-center p-2 bg-white/[0.02] rounded-lg">
                            <p className="text-[8px] text-pcis-text-muted">Rental Income</p>
                            <p className="text-[11px] font-mono font-semibold text-green-400">{formatAED(price * (detail.investment.estimatedRentalYield / 100) * 5)}</p>
                          </div>
                          <div className="text-center p-2 bg-white/[0.02] rounded-lg">
                            <p className="text-[8px] text-pcis-text-muted">Capital Gain</p>
                            <p className="text-[11px] font-mono font-semibold text-green-400">{formatAED(price * (detail.investment.capitalAppreciation5yr / 100))}</p>
                          </div>
                          <div className="text-center p-2 bg-white/[0.02] rounded-lg">
                            <p className="text-[8px] text-pcis-text-muted">Net ROI</p>
                            <p className="text-[11px] font-mono font-semibold text-pcis-gold">
                              {((((price * (detail.investment.estimatedRentalYield / 100) * 5) + (price * (detail.investment.capitalAppreciation5yr / 100)) - totalInterest) / totalUpfront) * 100).toFixed(1)}%
                            </p>
                          </div>
                        </div>
                      </div>
                    </>
                  )
                })()}
              </div>
            </div>

            {/* Neighborhood */}
            <div>
              <h4 className="text-[9px] text-pcis-text-secondary uppercase tracking-wider mb-3">Neighborhood</h4>
              <div className="bg-white/[0.02] border border-pcis-border/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-pcis-text-muted">Walk Score</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-pcis-gold" style={{ width: `${detail.neighborhood.walkScore}%` }} />
                    </div>
                    <span className="font-mono font-semibold text-pcis-text w-6 text-right">{detail.neighborhood.walkScore}</span>
                  </div>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-pcis-text-muted">To Downtown</span>
                  <span className="text-pcis-text">{detail.neighborhood.commuteToDowntown}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-pcis-text-muted">School District</span>
                  <span className="text-pcis-text">{detail.neighborhood.schoolDistrict}</span>
                </div>
                <div className="border-t border-pcis-border/20 pt-2">
                  <p className="text-[9px] text-pcis-text-secondary mb-1.5">Nearby Landmarks</p>
                  {detail.neighborhood.nearbyLandmarks.map(l => (
                    <p key={l} className="text-[9px] text-pcis-text-muted mb-0.5">{'\u2022'} {l}</p>
                  ))}
                </div>
              </div>
            </div>

            {/* Last Updated */}
            <p className="text-[8px] text-pcis-text-muted/50 text-center">
              Last updated: {new Date(detail.lastUpdated).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
              {' - '}Sources: DLD Registry, Bayut, Property Finder
            </p>
          </div>
        )}

        {/* 3D Model Tab */}
        {activeTab === '3d' && (
          <div className="flex flex-col h-full" style={{ minHeight: 450 }}>
            <ThreeCanvas property={property} />
            <div className="flex-shrink-0 p-3 border-t border-pcis-border/20 text-center">
              <p className="text-[9px] text-pcis-text-muted">Drag to rotate - Scroll to zoom - Procedural architectural maquette</p>
            </div>
          </div>
        )}

        {/* Fallback for no detail */}
        {activeTab === 'details' && !detail && (
          <div className="p-5 text-[11px] text-pcis-text-muted text-center">
            Detailed property information is being sourced. Please check back shortly.
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// 3D MODEL GENERATOR
// ============================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPropertyModel(property: Property, THREE: any) {
  const group = new THREE.Group()
  const seed = property.id.split('').reduce((a: number, c: string) => a + c.charCodeAt(0), 0)
  const rng = (i: number) => { const s = Math.sin(seed * 9301 + i * 49297) * 49297; return s - Math.floor(s) }

  // ========== PBR MATERIAL LIBRARY ==========

  // Architectural concrete - slightly warm
  const concreteMat = new THREE.MeshPhysicalMaterial({
    color: 0x1c1c1e, metalness: 0.0, roughness: 0.78,
    clearcoat: 0.05, clearcoatRoughness: 0.9, envMapIntensity: 0.4,
  })
  // Dark facade panels
  const facadeMat = new THREE.MeshPhysicalMaterial({
    color: 0x141416, metalness: 0.05, roughness: 0.65,
    clearcoat: 0.1, clearcoatRoughness: 0.7, envMapIntensity: 0.5,
  })
  // Warm stone/travertine
  const stoneMat = new THREE.MeshPhysicalMaterial({
    color: 0x2a2420, metalness: 0.0, roughness: 0.85, envMapIntensity: 0.3,
  })
  // Gold/brass trim
  const goldMat = new THREE.MeshPhysicalMaterial({
    color: 0xd4a574, metalness: 0.85, roughness: 0.15,
    clearcoat: 0.3, clearcoatRoughness: 0.1, envMapIntensity: 1.2,
  })
  // Brushed dark metal (railings, frames)
  const darkMetalMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a1a1e, metalness: 0.9, roughness: 0.35,
    clearcoat: 0.15, envMapIntensity: 0.6,
  })
  // Glass - realistic transmission
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x88aacc, metalness: 0.0, roughness: 0.05,
    transmission: 0.92, thickness: 0.1, ior: 1.52,
    envMapIntensity: 1.0, transparent: true, opacity: 0.35,
  })
  // Interior warm glow (visible through windows)
  const interiorMat = new THREE.MeshPhysicalMaterial({
    color: 0x3d2a15, metalness: 0.0, roughness: 0.9,
    emissive: 0x2a1a08, emissiveIntensity: 0.6,
  })
  // Pool water
  const poolMat = new THREE.MeshPhysicalMaterial({
    color: 0x006688, metalness: 0.1, roughness: 0.05,
    transmission: 0.7, thickness: 0.4, ior: 1.33,
    transparent: true, opacity: 0.6, envMapIntensity: 1.5,
  })
  // Pool tiles (bottom)
  const poolTileMat = new THREE.MeshPhysicalMaterial({
    color: 0x003344, metalness: 0.0, roughness: 0.4,
    clearcoat: 0.2, envMapIntensity: 0.3,
  })
  // White stucco/render
  const whiteMat = new THREE.MeshPhysicalMaterial({
    color: 0x252528, metalness: 0.0, roughness: 0.8, envMapIntensity: 0.35,
  })
  // Wood decking
  const woodMat = new THREE.MeshPhysicalMaterial({
    color: 0x1e1510, metalness: 0.0, roughness: 0.75,
    clearcoat: 0.15, clearcoatRoughness: 0.6, envMapIntensity: 0.25,
  })
  // Lawn/grass
  const grassMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a3010, metalness: 0.0, roughness: 0.95, envMapIntensity: 0.15,
  })
  // Sand
  const sandMat = new THREE.MeshPhysicalMaterial({
    color: 0x2a2218, metalness: 0.0, roughness: 0.95, envMapIntensity: 0.1,
  })
  // Driveway paving
  const pavingMat = new THREE.MeshPhysicalMaterial({
    color: 0x161618, metalness: 0.0, roughness: 0.7,
    clearcoat: 0.05, envMapIntensity: 0.25,
  })

  const bedScale = Math.min(property.bedrooms / 6, 1.5)

  // ========== HELPERS ==========

  function addMesh(geo: any, mat: any, x: number, y: number, z: number, shadows = true) {
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(x, y, z)
    if (shadows) { mesh.castShadow = true; mesh.receiveShadow = true }
    group.add(mesh)
    return mesh
  }

  function addBox(w: number, h: number, d: number, x: number, y: number, z: number, mat: any) {
    return addMesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z)
  }

  // Recessed window with frame, interior glow, and mullion
  function addWindow(x: number, y: number, z: number, w: number, h: number, face: 'front' | 'back' | 'left' | 'right') {
    const depth = 0.08
    const frameW = 0.03
    const isFB = face === 'front' || face === 'back'
    const sign = (face === 'front' || face === 'right') ? 1 : -1
    const fOff = sign * depth / 2

    // Window recess (dark void)
    if (isFB) {
      addBox(w, h, depth, x, y, z + fOff * 0.5, interiorMat)
      // Glass pane
      addBox(w - frameW * 2, h - frameW * 2, 0.01, x, y, z + fOff, glassMat)
      // Frame - top, bottom, left, right
      addBox(w, frameW, frameW, x, y + h / 2 - frameW / 2, z + fOff, darkMetalMat)
      addBox(w, frameW, frameW, x, y - h / 2 + frameW / 2, z + fOff, darkMetalMat)
      addBox(frameW, h, frameW, x - w / 2 + frameW / 2, y, z + fOff, darkMetalMat)
      addBox(frameW, h, frameW, x + w / 2 - frameW / 2, y, z + fOff, darkMetalMat)
      // Vertical mullion
      if (w > 0.5) addBox(0.015, h - frameW * 2, 0.015, x, y, z + fOff, darkMetalMat)
    } else {
      addBox(depth, h, w, x + fOff * 0.5, y, z, interiorMat)
      addBox(0.01, h - frameW * 2, w - frameW * 2, x + fOff, y, z, glassMat)
      addBox(frameW, frameW, w, x + fOff, y + h / 2 - frameW / 2, z, darkMetalMat)
      addBox(frameW, frameW, w, x + fOff, y - h / 2 + frameW / 2, z, darkMetalMat)
      addBox(frameW, h, frameW, x + fOff, y, z - w / 2 + frameW / 2, darkMetalMat)
      addBox(frameW, h, frameW, x + fOff, y, z + w / 2 - frameW / 2, darkMetalMat)
      if (w > 0.5) addBox(0.015, h - frameW * 2, 0.015, x + fOff, y, z, darkMetalMat)
    }
  }

  // Window grid on a facade
  function addWindowGrid(cx: number, cy: number, cz: number, cols: number, rows: number, face: 'front' | 'back' | 'left' | 'right', ww = 0.4, wh = 0.55, gapX = 0.7, gapY = 0.8) {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const isFB = face === 'front' || face === 'back'
        const ox = isFB ? cx + (c - (cols - 1) / 2) * gapX : cx
        const oy = cy + (r - (rows - 1) / 2) * gapY
        const oz = isFB ? cz : cz + (c - (cols - 1) / 2) * gapX
        addWindow(ox, oy, oz, ww, wh, face)
      }
    }
  }

  // Glass railing (balcony/terrace)
  function addRailing(x: number, y: number, z: number, length: number, axis: 'x' | 'z') {
    const railH = 0.4
    const panelThick = 0.015
    // Glass panel
    if (axis === 'x') {
      addBox(length, railH, panelThick, x, y + railH / 2, z, glassMat)
      // Top rail - metal
      addBox(length + 0.02, 0.02, 0.025, x, y + railH, z, darkMetalMat)
      // Posts
      addBox(0.02, railH, 0.02, x - length / 2, y + railH / 2, z, darkMetalMat)
      addBox(0.02, railH, 0.02, x + length / 2, y + railH / 2, z, darkMetalMat)
    } else {
      addBox(panelThick, railH, length, x, y + railH / 2, z, glassMat)
      addBox(0.025, 0.02, length + 0.02, x, y + railH, z, darkMetalMat)
      addBox(0.02, railH, 0.02, x, y + railH / 2, z - length / 2, darkMetalMat)
      addBox(0.02, railH, 0.02, x, y + railH / 2, z + length / 2, darkMetalMat)
    }
  }

  // Cylindrical column
  function addColumn(x: number, y: number, z: number, radius: number, height: number, mat: any) {
    const mesh = addMesh(new THREE.CylinderGeometry(radius, radius, height, 16), mat, x, y + height / 2, z)
    return mesh
  }

  // Procedural palm tree
  function addPalmTree(x: number, z: number, scale = 1) {
    const trunkH = 2.2 * scale
    const trunkR = 0.06 * scale
    // Trunk - slightly curved via segments
    const trunkMat = new THREE.MeshPhysicalMaterial({ color: 0x1a1408, roughness: 0.9, metalness: 0.0 })
    const trunkGeo = new THREE.CylinderGeometry(trunkR * 0.7, trunkR, trunkH, 8)
    const trunk = addMesh(trunkGeo, trunkMat, x, trunkH / 2, z)
    trunk.rotation.z = (rng(x * 100 + z * 37) - 0.5) * 0.08

    // Fronds (6-8 leaf clusters)
    const leafMat = new THREE.MeshPhysicalMaterial({ color: 0x0e2808, roughness: 0.85, metalness: 0.0, side: THREE.DoubleSide })
    const frondCount = 6 + Math.floor(rng(x * 71 + z * 13) * 3)
    for (let i = 0; i < frondCount; i++) {
      const angle = (i / frondCount) * Math.PI * 2
      const droop = 0.4 + rng(i * 17 + x * 31) * 0.3
      const leafLen = (0.8 + rng(i * 23 + z * 41) * 0.4) * scale
      // Each frond is a stretched, rotated plane
      const leafGeo = new THREE.PlaneGeometry(leafLen, 0.15 * scale, 4, 1)
      // Bend the leaf downward
      const posAttr = leafGeo.attributes.position
      for (let v = 0; v < posAttr.count; v++) {
        const lx = posAttr.getX(v)
        const factor = (lx / leafLen + 0.5)
        posAttr.setY(v, posAttr.getY(v) - factor * factor * droop * leafLen)
      }
      leafGeo.computeVertexNormals()
      const leaf = addMesh(leafGeo, leafMat, x, trunkH, z, false)
      leaf.rotation.y = angle
      leaf.rotation.z = -0.1
    }
  }

  // Shrub/bush
  function addShrub(x: number, z: number, scale = 1) {
    const bushMat = new THREE.MeshPhysicalMaterial({ color: 0x0f2a0a, roughness: 0.95, metalness: 0.0 })
    for (let i = 0; i < 3; i++) {
      const r = (0.15 + rng(x * 50 + z * 30 + i) * 0.12) * scale
      const ox = (rng(i * 7 + x * 11) - 0.5) * 0.12 * scale
      const oz = (rng(i * 13 + z * 17) - 0.5) * 0.12 * scale
      addMesh(
        new THREE.SphereGeometry(r, 8, 6),
        bushMat,
        x + ox, r * 0.8, z + oz, false
      )
    }
  }

  // Lounge chair
  function addLounger(x: number, z: number, rotY = 0) {
    const lg = new THREE.Group()
    // Seat
    const seatMat = new THREE.MeshPhysicalMaterial({ color: 0x181510, roughness: 0.6, metalness: 0.1 })
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.7), seatMat)
    seat.position.set(0, 0.15, 0); seat.castShadow = true; lg.add(seat)
    // Back rest (angled)
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.35), seatMat)
    back.position.set(0, 0.25, -0.22); back.rotation.x = -0.5; back.castShadow = true; lg.add(back)
    // Legs
    const legMat = darkMetalMat
    const legGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.15, 6)
    for (const lx of [-0.12, 0.12]) {
      for (const lz of [-0.3, 0.3]) {
        const leg = new THREE.Mesh(legGeo, legMat)
        leg.position.set(lx, 0.075, lz); lg.add(leg)
      }
    }
    lg.position.set(x, 0, z)
    lg.rotation.y = rotY
    group.add(lg)
  }

  // ========== POOL COMPLEX ==========
  function addPoolComplex(px: number, pz: number, pw: number, pd: number) {
    const poolDepth = 0.15
    // Pool basin (recessed)
    addBox(pw, poolDepth, pd, px, -poolDepth / 2 + 0.01, pz, poolTileMat)
    // Water surface (animated)
    const water = addBox(pw - 0.06, 0.02, pd - 0.06, px, 0.02, pz, poolMat)
    water.userData = { isWater: true, baseY: 0.02 }
    // Pool coping (stone edge)
    const copingW = 0.06
    const copingH = 0.04
    addBox(pw + copingW * 2, copingH, copingW, px, copingH / 2, pz - pd / 2 - copingW / 2, stoneMat) // near
    addBox(pw + copingW * 2, copingH, copingW, px, copingH / 2, pz + pd / 2 + copingW / 2, stoneMat) // far
    addBox(copingW, copingH, pd, px - pw / 2 - copingW / 2, copingH / 2, pz, stoneMat) // left
    addBox(copingW, copingH, pd, px + pw / 2 + copingW / 2, copingH / 2, pz, stoneMat) // right
    // Underwater light glow
    const poolLight = new THREE.PointLight(0x0088aa, 0.3, 3, 2)
    poolLight.position.set(px, -0.05, pz)
    group.add(poolLight)
    // Pool deck surrounding
    addBox(pw + 1.0, 0.015, pd + 1.0, px, 0.005, pz, woodMat)
    // Loungers beside pool
    addLounger(px - pw / 2 - 0.5, pz - pd / 4, Math.PI / 2)
    addLounger(px - pw / 2 - 0.5, pz + pd / 4, Math.PI / 2)
  }

  // ========== PROPERTY TYPE MODELS ==========

  switch (property.type) {
    case 'Villa': {
      const bw = 3.2 + bedScale * 0.6

      // -- Foundation/plinth --
      addBox(bw + 0.2, 0.12, 3.4, 0, 0.06, 0, stoneMat)

      // -- Main wing (2 storey) --
      addBox(bw, 2.4, 3.2, 0, 1.26, 0, facadeMat)
      // Side wing (single storey, offset)
      const swW = 2.0 + bedScale * 0.3
      addBox(swW, 1.8, 2.4, bw / 2 + swW / 2 + 0.15, 0.96, -0.3, facadeMat)

      // -- Flat roof overhangs with gold fascia --
      addBox(bw + 0.5, 0.06, 3.6, 0, 2.49, 0.1, concreteMat) // concrete slab
      addBox(bw + 0.55, 0.025, 3.65, 0, 2.52, 0.1, goldMat) // gold edge
      addBox(swW + 0.4, 0.05, 2.7, bw / 2 + swW / 2 + 0.15, 1.89, -0.2, concreteMat)
      addBox(swW + 0.45, 0.02, 2.75, bw / 2 + swW / 2 + 0.15, 1.92, -0.2, goldMat)

      // -- Floor-to-ceiling windows (main wing front) --
      const mainWinCols = Math.max(3, Math.round(bw / 0.85))
      addWindowGrid(0, 1.3, 1.62, mainWinCols, 2, 'front', 0.5, 0.7, 0.8, 0.95)
      // Main wing back windows
      addWindowGrid(0, 1.3, -1.62, Math.max(2, mainWinCols - 1), 2, 'back', 0.4, 0.6, 0.8, 0.95)
      // Side wing windows
      addWindowGrid(bw / 2 + swW / 2 + 0.15, 1.0, 0.92, 2, 1, 'front', 0.45, 0.65)
      addWindowGrid(bw / 2 + swW / 2 + 0.15, 1.0, -1.52, 2, 1, 'back', 0.35, 0.55)

      // -- Grand entrance --
      // Recessed entrance portal
      addBox(1.0, 1.8, 0.15, 0, 0.96, 1.68, darkMetalMat) // door frame
      addBox(0.85, 1.65, 0.04, 0, 0.9, 1.7, goldMat) // door itself
      // Entrance overhang/canopy
      addBox(1.6, 0.04, 0.6, 0, 2.1, 1.9, concreteMat)
      addBox(1.65, 0.015, 0.65, 0, 2.12, 1.9, goldMat)
      // Canopy support columns
      addColumn(-0.7, 0, 2.1, 0.04, 2.1, darkMetalMat)
      addColumn(0.7, 0, 2.1, 0.04, 2.1, darkMetalMat)

      // -- Second floor balcony (main wing) --
      addBox(bw * 0.6, 0.05, 0.6, 0, 1.8, 1.9, concreteMat)
      addRailing(0, 1.85, 2.18, bw * 0.6, 'x')
      addRailing(-bw * 0.3, 1.85, 1.9, 0.55, 'z')
      addRailing(bw * 0.3, 1.85, 1.9, 0.55, 'z')

      // -- Terrace connecting wings --
      addBox(1.5, 0.02, 2.0, bw / 2 + 0.1, 0.01, 1.8, pavingMat)

      // -- Driveway --
      addBox(2.0, 0.015, 4, 0, 0.005, 3.8, pavingMat)

      break
    }
    case 'Penthouse': {
      const floors = Math.max(5, property.bedrooms + 1)
      const floorH = 1.0
      const th = floors * floorH
      const towerW = 2.8
      const towerD = 2.6

      // -- Tower body --
      addBox(towerW, th, towerD, 0, th / 2, 0, facadeMat)

      // -- Structural floor slabs with gold edge --
      for (let i = 0; i <= floors; i++) {
        const fy = i * floorH
        addBox(towerW + 0.08, 0.05, towerD + 0.08, 0, fy, 0, concreteMat)
        addBox(towerW + 0.12, 0.015, towerD + 0.12, 0, fy + 0.025, 0, goldMat)
      }

      // -- Full-height glass curtain wall (front + right) --
      for (let i = 0; i < floors; i++) {
        const fy = i * floorH + floorH / 2
        // Front facade - floor-to-ceiling windows
        const winCols = 3
        for (let c = 0; c < winCols; c++) {
          const wx = (c - (winCols - 1) / 2) * 0.75
          addWindow(wx, fy, towerD / 2 + 0.01, 0.55, floorH - 0.15, 'front')
        }
        // Right facade
        for (let c = 0; c < 2; c++) {
          const wz = (c - 0.5) * 0.9
          addWindow(towerW / 2 + 0.01, fy, wz, 0.55, floorH - 0.15, 'right')
        }
      }

      // -- Balconies (every other floor, front) --
      for (let i = 1; i < floors; i += 2) {
        const by = i * floorH
        addBox(towerW + 0.3, 0.04, 0.55, 0, by + 0.02, towerD / 2 + 0.3, concreteMat)
        addRailing(0, by + 0.04, towerD / 2 + 0.55, towerW + 0.25, 'x')
      }

      // -- Penthouse crown (top 2 floors special treatment) --
      // Setback penthouse level
      const phY = th
      addBox(towerW - 0.4, 1.4, towerD - 0.4, 0, phY + 0.7, 0, facadeMat)
      // Penthouse wraparound glass
      addWindowGrid(0, phY + 0.7, (towerD - 0.4) / 2 + 0.01, 3, 1, 'front', 0.55, 1.0, 0.7, 1.0)
      // Penthouse terrace (full floor below)
      addBox(towerW + 0.2, 0.04, towerD + 0.2, 0, phY + 0.02, 0, stoneMat)
      addRailing(0, phY + 0.04, towerD / 2 + 0.08, towerW + 0.15, 'x')
      addRailing(towerW / 2 + 0.08, phY + 0.04, 0, towerD - 0.2, 'z')
      addRailing(-towerW / 2 - 0.08, phY + 0.04, 0, towerD - 0.2, 'z')

      // -- Rooftop terrace with pergola --
      const roofY = phY + 1.4
      addBox(towerW - 0.8, 0.03, towerD - 0.8, 0, roofY + 0.015, 0, woodMat)
      // Pergola posts
      for (const px of [-0.8, 0.8]) {
        for (const pz of [-0.6, 0.6]) {
          addColumn(px, roofY, pz, 0.03, 0.9, darkMetalMat)
        }
      }
      // Pergola beams
      addBox(2.0, 0.03, 0.03, 0, roofY + 0.9, -0.6, darkMetalMat)
      addBox(2.0, 0.03, 0.03, 0, roofY + 0.9, 0.6, darkMetalMat)
      addBox(0.03, 0.03, 1.5, -0.8, roofY + 0.9, 0, darkMetalMat)
      addBox(0.03, 0.03, 1.5, 0.8, roofY + 0.9, 0, darkMetalMat)
      // Slat shading
      for (let s = -0.6; s <= 0.6; s += 0.15) {
        addBox(1.95, 0.01, 0.04, 0, roofY + 0.88, s, darkMetalMat)
      }

      // -- Building base/lobby --
      addBox(towerW + 0.6, 0.08, towerD + 0.6, 0, 0.04, 0, stoneMat)
      // Lobby entrance
      addBox(1.2, 1.6, 0.06, 0, 0.8, towerD / 2 + 0.35, glassMat)
      addBox(1.3, 0.04, 0.15, 0, 1.62, towerD / 2 + 0.35, goldMat)

      break
    }
    case 'Apartment': {
      const aFloors = Math.max(4, Math.ceil(property.bedrooms * 1.0))
      const floorH = 0.95
      const ah = aFloors * floorH
      const aw = 2.4 + bedScale * 0.5
      const ad = 2.2

      // -- Building mass --
      addBox(aw, ah, ad, 0, ah / 2, 0, facadeMat)

      // -- Floor slabs --
      for (let i = 0; i <= aFloors; i++) {
        addBox(aw + 0.06, 0.04, ad + 0.06, 0, i * floorH, 0, concreteMat)
        addBox(aw + 0.1, 0.012, ad + 0.1, 0, i * floorH + 0.02, 0, goldMat)
      }

      // -- Window grid (front) --
      const winCols = Math.max(3, Math.round(aw / 0.7))
      for (let fl = 0; fl < aFloors; fl++) {
        const fy = fl * floorH + floorH / 2 + 0.05
        for (let c = 0; c < winCols; c++) {
          const wx = (c - (winCols - 1) / 2) * 0.65
          addWindow(wx, fy, ad / 2 + 0.01, 0.4, floorH - 0.25, 'front')
        }
      }
      // Back windows
      for (let fl = 0; fl < aFloors; fl++) {
        const fy = fl * floorH + floorH / 2 + 0.05
        for (let c = 0; c < Math.max(2, winCols - 1); c++) {
          const wx = (c - (Math.max(2, winCols - 1) - 1) / 2) * 0.7
          addWindow(wx, fy, -ad / 2 - 0.01, 0.35, floorH - 0.3, 'back')
        }
      }

      // -- Balconies (front, every floor) --
      for (let fl = 0; fl < aFloors; fl++) {
        const by = fl * floorH
        addBox(aw - 0.1, 0.04, 0.45, 0, by + 0.02, ad / 2 + 0.25, concreteMat)
        addRailing(0, by + 0.04, ad / 2 + 0.46, aw - 0.15, 'x')
      }

      // -- Flat roof with mechanical penthouse --
      addBox(aw + 0.15, 0.06, ad + 0.15, 0, ah + 0.03, 0, concreteMat)
      addBox(aw + 0.2, 0.02, ad + 0.2, 0, ah + 0.07, 0, goldMat)
      // Mechanical room
      addBox(0.8, 0.5, 0.6, 0, ah + 0.31, -0.3, facadeMat)

      // -- Ground level lobby --
      addBox(aw + 0.4, 0.06, ad + 0.8, 0, 0.03, 0.2, pavingMat)
      addBox(1.0, 1.2, 0.04, 0, 0.6, ad / 2 + 0.6, glassMat)
      addBox(1.1, 0.03, 0.08, 0, 1.22, ad / 2 + 0.6, goldMat)

      break
    }
    case 'Estate': {
      // -- Grand central pavilion --
      addBox(5.5, 3.2, 4.2, 0, 1.6, 0, facadeMat)
      // Foundation
      addBox(5.8, 0.15, 4.5, 0, 0.075, 0, stoneMat)

      // -- Mansard/hip roof --
      // Lower roof slope (wider)
      addBox(5.7, 0.08, 4.4, 0, 3.24, 0, concreteMat)
      addBox(5.75, 0.025, 4.45, 0, 3.3, 0, goldMat)
      // Upper roof mass
      addBox(4.8, 0.7, 3.6, 0, 3.63, 0, concreteMat)
      addBox(4.85, 0.02, 3.65, 0, 4.0, 0, goldMat)
      // Ridge detail
      addBox(3.5, 0.15, 0.15, 0, 4.075, 0, goldMat)

      // -- East wing --
      addBox(2.6, 2.6, 3.2, 4.0, 1.3, -0.4, facadeMat)
      addBox(2.8, 0.06, 3.4, 4.0, 2.63, -0.4, concreteMat)
      addBox(2.85, 0.02, 3.45, 4.0, 2.68, -0.4, goldMat)

      // -- West wing --
      addBox(2.6, 2.6, 3.2, -4.0, 1.3, -0.4, facadeMat)
      addBox(2.8, 0.06, 3.4, -4.0, 2.63, -0.4, concreteMat)
      addBox(2.85, 0.02, 3.45, -4.0, 2.68, -0.4, goldMat)

      // -- Colonnade entrance portico --
      addBox(3.0, 0.1, 1.8, 0, 2.95, 3.0, concreteMat)
      addBox(3.1, 0.04, 1.85, 0, 3.02, 3.0, goldMat)
      // 4 columns
      for (let ci = -1.5; ci <= 1.5; ci += 1.0) {
        addColumn(ci, 0, 3.6, 0.08, 2.95, stoneMat)
        // Column capital
        addBox(0.2, 0.06, 0.2, ci, 2.98, 3.6, goldMat)
        // Column base
        addBox(0.2, 0.06, 0.2, ci, 0.03, 3.6, stoneMat)
      }

      // -- Windows (central) --
      addWindowGrid(0, 1.5, 2.12, 4, 2, 'front', 0.55, 0.7, 1.1, 1.0)
      addWindowGrid(0, 1.5, -2.12, 3, 2, 'back', 0.5, 0.65, 1.2, 1.0)
      // Wing windows
      addWindowGrid(4.0, 1.3, 1.22, 2, 2, 'front', 0.5, 0.6, 0.9, 0.9)
      addWindowGrid(-4.0, 1.3, 1.22, 2, 2, 'front', 0.5, 0.6, 0.9, 0.9)
      // Side windows
      addWindowGrid(5.32, 1.3, -0.4, 2, 2, 'right', 0.5, 0.6, 0.9, 0.9)
      addWindowGrid(-5.32, 1.3, -0.4, 2, 2, 'left', 0.5, 0.6, 0.9, 0.9)

      // -- Grand entrance doors --
      addBox(1.4, 2.2, 0.08, 0, 1.1, 2.14, darkMetalMat)
      addBox(1.2, 2.0, 0.04, 0, 1.05, 2.16, goldMat)
      // Entrance steps
      for (let step = 0; step < 3; step++) {
        addBox(2.0 + step * 0.3, 0.08, 0.3, 0, step * 0.08 + 0.04, 2.5 + step * 0.3, stoneMat)
      }

      // -- Courtyard (front) --
      addBox(5, 0.02, 4, 0, 0.01, 5.0, pavingMat)
      // Circular fountain
      const fountainMat = stoneMat
      addMesh(new THREE.CylinderGeometry(0.6, 0.7, 0.25, 24), fountainMat, 0, 0.125, 5.5)
      addMesh(new THREE.CylinderGeometry(0.45, 0.45, 0.02, 24), poolMat, 0, 0.25, 5.5)
      // Fountain water
      const fWater = addMesh(new THREE.CylinderGeometry(0.42, 0.42, 0.01, 24), poolMat, 0, 0.26, 5.5, false)
      fWater.userData = { isWater: true, baseY: 0.26 }

      // -- Circular driveway --
      const driveMat = pavingMat
      addMesh(new THREE.RingGeometry(2.0, 3.5, 32), driveMat, 0, 0.008, 5.5)
      const driveRing = group.children[group.children.length - 1]
      driveRing.rotation.x = -Math.PI / 2

      break
    }
    case 'Townhouse': {
      const units = Math.min(property.bedrooms, 4)
      const unitW = 1.3
      const unitD = 2.4
      const unitH = 3.4
      const gap = 0.08

      for (let i = 0; i < units; i++) {
        const ux = (i - (units - 1) / 2) * (unitW + gap)

        // -- Unit body --
        addBox(unitW, unitH, unitD, ux, unitH / 2, 0, facadeMat)

        // -- Individual flat roof --
        addBox(unitW + 0.1, 0.04, unitD + 0.1, ux, unitH + 0.02, 0, concreteMat)
        addBox(unitW + 0.14, 0.015, unitD + 0.14, ux, unitH + 0.05, 0, goldMat)

        // -- Parapet with metal cap --
        addBox(unitW + 0.08, 0.15, 0.04, ux, unitH + 0.115, unitD / 2 + 0.02, concreteMat)
        addBox(unitW + 0.1, 0.02, 0.06, ux, unitH + 0.2, unitD / 2 + 0.02, darkMetalMat)

        // -- Front door --
        addBox(0.45, 1.1, 0.06, ux, 0.55, unitD / 2 + 0.03, darkMetalMat)
        addBox(0.38, 1.0, 0.03, ux, 0.52, unitD / 2 + 0.05, goldMat)

        // -- Windows (front, 2 floors above door) --
        addWindow(ux, 1.8, unitD / 2 + 0.01, 0.5, 0.65, 'front')
        addWindow(ux, 2.7, unitD / 2 + 0.01, 0.5, 0.55, 'front')

        // -- Back windows --
        addWindow(ux, 1.0, -unitD / 2 - 0.01, 0.4, 0.5, 'back')
        addWindow(ux, 1.9, -unitD / 2 - 0.01, 0.4, 0.55, 'back')
        addWindow(ux, 2.8, -unitD / 2 - 0.01, 0.35, 0.45, 'back')

        // -- Small front garden --
        addBox(unitW - 0.1, 0.025, 0.7, ux, 0.012, unitD / 2 + 0.5, grassMat)
        // Low hedge
        addMesh(new THREE.BoxGeometry(unitW - 0.1, 0.12, 0.06), grassMat, ux, 0.06, unitD / 2 + 0.85, false)

        // -- Juliet balcony (2nd floor) --
        addRailing(ux, 1.45, unitD / 2 + 0.04, 0.5, 'x')
      }

      // -- Shared front path --
      const totalW = units * (unitW + gap)
      addBox(totalW + 0.6, 0.015, 0.5, 0, 0.005, unitD / 2 + 1.1, pavingMat)
      // Pavement curb
      addBox(totalW + 0.8, 0.04, 0.06, 0, 0.02, unitD / 2 + 1.4, stoneMat)

      break
    }
  }

  // ========== FEATURE-BASED ADDITIONS ==========
  const hasPool = property.features.some(f => /pool|infinity/i.test(f))
  const hasGarden = property.features.some(f => /garden|tropical|nature|landscap/i.test(f))
  const hasTennis = property.features.some(f => /tennis/i.test(f))
  const hasBeach = property.features.some(f => /beach/i.test(f))

  if (hasPool) {
    const poolSide = property.type === 'Estate' ? { x: -4, z: -3.5, w: 3.0, d: 1.5 } :
      property.type === 'Villa' ? { x: -2.5, z: -2.5, w: 2.5, d: 1.3 } :
      { x: -2, z: -2, w: 2.0, d: 1.2 }
    addPoolComplex(poolSide.x, poolSide.z, poolSide.w, poolSide.d)
  }

  if (hasGarden) {
    // Lawn patches
    const gardenR = property.type === 'Estate' ? 5 : 3
    for (let i = 0; i < 3; i++) {
      const angle = rng(i * 7) * Math.PI * 2
      const dist = 2.5 + rng(i * 13) * gardenR
      addBox(1.5 + rng(i * 3) * 1, 0.02, 1.2 + rng(i * 5) * 0.8, Math.cos(angle) * dist, 0.01, Math.sin(angle) * dist, grassMat)
    }
    // Palm trees
    addPalmTree(3.5, -3, 1.0)
    addPalmTree(-3, 3, 0.85)
    if (property.type === 'Estate') {
      addPalmTree(6, 2, 1.1)
      addPalmTree(-6, -2, 0.9)
    }
    // Shrubs
    for (let i = 0; i < 5; i++) {
      const sa = rng(i * 11 + 3) * Math.PI * 2
      const sd = 2 + rng(i * 19) * (gardenR - 1)
      addShrub(Math.cos(sa) * sd, Math.sin(sa) * sd, 0.7 + rng(i * 7) * 0.5)
    }
  }

  if (hasTennis) {
    const tx = 5, tz = 3
    // Court surface
    addBox(4.0, 0.02, 2.2, tx, 0.01, tz, new THREE.MeshPhysicalMaterial({ color: 0x0a2a0a, roughness: 0.85 }))
    // Court lines
    addBox(3.9, 0.005, 0.015, tx, 0.025, tz, whiteMat)
    addBox(0.015, 0.005, 2.1, tx, 0.025, tz, whiteMat)
    addBox(3.9, 0.005, 0.015, tx, 0.025, tz - 1.05, whiteMat)
    addBox(3.9, 0.005, 0.015, tx, 0.025, tz + 1.05, whiteMat)
    // Net
    addBox(0.02, 0.55, 2.1, tx, 0.3, tz, new THREE.MeshPhysicalMaterial({ color: 0x333333, roughness: 0.9, transparent: true, opacity: 0.5 }))
    // Net posts
    addColumn(tx, 0, tz - 1.15, 0.025, 0.6, darkMetalMat)
    addColumn(tx, 0, tz + 1.15, 0.025, 0.6, darkMetalMat)
    // Surrounding fence
    for (const fz of [tz - 1.2, tz + 1.2]) {
      addBox(4.2, 0.015, 0.015, tx, 0.6, fz, darkMetalMat)
    }
  }

  if (hasBeach) {
    // Beach strip
    addBox(8, 0.02, 2.0, 0, 0.005, -5.5, sandMat)
    // Water edge
    const waterEdge = addBox(8, 0.01, 1.5, 0, 0.005, -7.0, poolMat)
    waterEdge.userData = { isWater: true, baseY: 0.005 }
    // Beach loungers
    addLounger(-1.5, -5, 0)
    addLounger(1.5, -5, 0)
  }

  // Always add some ambient landscaping (palms/shrubs near building)
  if (!hasGarden) {
    addShrub(2.5, 1.5, 0.5)
    addShrub(-2, -1.5, 0.6)
  }

  return group
}

// ============================================================
// MAP VIEW
// ============================================================

function IntelMap({
  isVisible,
  selectedArea,
  onAreaSelect,
  selectedProperty,
  onSelectProperty,
  compareIds,
  onToggleCompare,
}: {
  isVisible: boolean
  selectedArea: string | null
  onAreaSelect: (area: string | null) => void
  selectedProperty: Property | null
  onSelectProperty: (property: Property | null) => void
  compareIds: string[]
  onToggleCompare: (id: string) => void
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MaplibreGL.Map | null>(null)
  const mlRef = useRef<typeof MaplibreGL | null>(null)
  const markersRef = useRef<MaplibreGL.Marker[]>([])
  const initStartedRef = useRef(false)
  const [mapReady, setMapReady] = useState(false)
  const [hoveredProperty, setHoveredProperty] = useState<Property | null>(null)
  const [mapFilters, setMapFilters] = useState({ ultraPrime: true, luxury: true, premium: true, Villa: true, Penthouse: true, Apartment: true, Estate: true, Townhouse: true })
  const [showHeatmap, setShowHeatmap] = useState(false)
  const onAreaSelectRef = useRef(onAreaSelect)
  onAreaSelectRef.current = onAreaSelect

  // Initialize MapLibre GL
  useEffect(() => {
    if (!isVisible || !mapContainerRef.current) return
    if (mapRef.current) {
      try { mapRef.current.resize(); setMapReady(true) } catch (_) { mapRef.current = null }
      if (mapRef.current) return
    }
    if (initStartedRef.current) return
    initStartedRef.current = true
    let cancelled = false

    async function init() {
      const mlModule = await import('maplibre-gl')
      const ml = (mlModule as any).default || mlModule
      if (typeof ml.Map !== 'function') { initStartedRef.current = false; return }

      if (!document.querySelector('style[data-maplibre]')) {
        const style = document.createElement('style')
        style.setAttribute('data-maplibre', 'true')
        style.textContent = `
          .maplibregl-map{font:12px/20px Helvetica Neue,Arial,Helvetica,sans-serif;overflow:hidden;position:relative;-webkit-tap-highlight-color:rgba(0,0,0,0)}
          .maplibregl-canvas{left:0;position:absolute;top:0}
          .maplibregl-canvas-container.maplibregl-interactive{cursor:grab;user-select:none}
          .maplibregl-canvas-container.maplibregl-interactive:active{cursor:grabbing}
          .maplibregl-ctrl-bottom-left,.maplibregl-ctrl-bottom-right,.maplibregl-ctrl-top-left,.maplibregl-ctrl-top-right{pointer-events:none;position:absolute;z-index:2}
          .maplibregl-ctrl-top-left{left:0;top:0}.maplibregl-ctrl-top-right{right:0;top:0}
          .maplibregl-ctrl-bottom-left{bottom:0;left:0}.maplibregl-ctrl-bottom-right{bottom:0;right:0}
          .maplibregl-ctrl{clear:both;pointer-events:auto;transform:translate(0)}
          .maplibregl-ctrl-top-right .maplibregl-ctrl{float:right;margin:10px 10px 0 0}
          .maplibregl-ctrl-bottom-right .maplibregl-ctrl{float:right;margin:0 10px 10px 0}
          .maplibregl-ctrl-group{background:#fff;border-radius:4px;box-shadow:0 0 0 2px rgba(0,0,0,.1)}
          .maplibregl-ctrl-group button{background-color:transparent;border:0;box-sizing:border-box;cursor:pointer;display:block;height:29px;outline:none;overflow:hidden;padding:0;width:29px}
          .maplibregl-ctrl-group button+button{border-top:1px solid #ddd}
          .maplibregl-marker{position:absolute;top:0;left:0;will-change:transform}
        `
        document.head.appendChild(style)
      }
      if (!document.querySelector('link[href*="maplibre-gl"]')) {
        const link = document.createElement('link'); link.rel = 'stylesheet'
        link.href = 'https://unpkg.com/maplibre-gl@latest/dist/maplibre-gl.css'
        document.head.appendChild(link)
      }
      if (cancelled || !mapContainerRef.current) { initStartedRef.current = false; return }
      mlRef.current = ml

      while (mapContainerRef.current.firstChild) {
        mapContainerRef.current.removeChild(mapContainerRef.current.firstChild)
      }

      const map = new ml.Map({
        container: mapContainerRef.current,
        style: {
          version: 8 as const,
          sources: { 'carto-dark': { type: 'raster' as const, tiles: [
            'https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            'https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
            'https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
          ], tileSize: 256, maxzoom: 20 } },
          layers: [{ id: 'carto-dark-layer', type: 'raster' as const, source: 'carto-dark', minzoom: 0, maxzoom: 20 }],
        },
        center: [55.22, 25.12], zoom: 11, minZoom: 9, maxZoom: 18,
        attributionControl: false,
      })

      map.addControl(new ml.NavigationControl({ showCompass: true, showZoom: true, visualizePitch: true }), 'bottom-right')

      let readyFired = false
      const markReady = () => {
        if (readyFired || cancelled) return
        readyFired = true
        if (cancelled) { map.remove(); initStartedRef.current = false; return }
        mapRef.current = map; map.resize(); setMapReady(true)
      }
      map.on('load', markReady)
      // Fallback: if load event does not fire within 3s, mark ready anyway
      // (tiles may still be loading but the map canvas is usable)
      setTimeout(markReady, 3000)
    }
    init()

    return () => {
      cancelled = true
      markersRef.current.forEach(m => m.remove()); markersRef.current = []
      setMapReady(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible])

  // Add markers (filtered)
  useEffect(() => {
    const map = mapRef.current; const ml = mlRef.current
    if (!map || !ml || !mapReady) return

    markersRef.current.forEach(m => m.remove()); markersRef.current = []

    // Filter properties based on mapFilters
    const filteredProperties = properties.filter(p => {
      const tierOk = (p.price >= 100_000_000 && mapFilters.ultraPrime) ||
                     (p.price >= 40_000_000 && p.price < 100_000_000 && mapFilters.luxury) ||
                     (p.price < 40_000_000 && mapFilters.premium)
      const typeOk = mapFilters[p.type as keyof typeof mapFilters] !== false
      return tierOk && typeOk
    })

    // Property pins
    filteredProperties.forEach(property => {
      const coords = PROPERTY_COORDS[property.id]
      if (!coords) return

      const color = priceTierColor(property.price)
      const size = property.price >= 100_000_000 ? 18 : property.price >= 40_000_000 ? 14 : 10

      const el = document.createElement('div')
      el.style.cursor = 'pointer'
      el.innerHTML = `
        <div style="position:relative;width:${size + 12}px;height:${size + 12}px;display:flex;align-items:center;justify-content:center;">
          <div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};box-shadow:0 0 ${showHeatmap ? '24' : '12'}px ${color}${showHeatmap ? 'aa' : '66'};border:2px solid rgba(255,255,255,0.3);transition:transform 0.2s;"></div>
          ${showHeatmap ? `<div style="position:absolute;width:${size * 4}px;height:${size * 4}px;border-radius:50%;background:radial-gradient(circle,${color}30 0%,transparent 70%);pointer-events:none;"></div>` : ''}
        </div>
      `
      el.addEventListener('mouseenter', () => setHoveredProperty(property))
      el.addEventListener('mouseleave', () => setHoveredProperty(null))

      markersRef.current.push(new ml.Marker({ element: el, anchor: 'center' }).setLngLat(coords).addTo(map))
    })

    // Area labels - CLICKABLE
    Object.entries(AREA_COORDS).forEach(([areaName, data]) => {
      const area = areaMetrics.find(a => a.areaName === areaName)
      if (!area) return

      const labelEl = document.createElement('div')
      labelEl.style.cursor = 'pointer'
      labelEl.innerHTML = `
        <div style="background:rgba(10,10,10,0.85);backdrop-filter:blur(8px);border:1px solid rgba(212,165,116,0.2);border-radius:8px;padding:6px 10px;white-space:nowrap;transition:border-color 0.2s,transform 0.2s;">
          <div style="font:bold 10px Inter,system-ui,sans-serif;color:#d4a574;">${escapeHtml(data.label)}</div>
          <div style="display:flex;gap:8px;margin-top:2px;">
            <span style="font:9px Inter,system-ui,sans-serif;color:rgba(255,255,255,0.5);">AED ${area.avgPricePerSqft.toLocaleString()}/sqft</span>
            <span style="font:bold 9px Inter,system-ui,sans-serif;color:${demandScoreColor(area.demandScore)};">${area.demandScore}</span>
          </div>
          <div style="font:bold 8px Inter,system-ui,sans-serif;color:rgba(212,165,116,0.5);margin-top:3px;">Click to explore &rarr;</div>
        </div>
      `
      labelEl.addEventListener('click', () => {
        onAreaSelectRef.current(areaName)
        map.flyTo({ center: data.center, zoom: 13, duration: 800 })
      })
      labelEl.addEventListener('mouseenter', () => {
        const inner = labelEl.firstElementChild as HTMLElement
        if (inner) { inner.style.borderColor = 'rgba(212,165,116,0.6)'; inner.style.transform = 'scale(1.05)' }
      })
      labelEl.addEventListener('mouseleave', () => {
        const inner = labelEl.firstElementChild as HTMLElement
        if (inner) { inner.style.borderColor = 'rgba(212,165,116,0.2)'; inner.style.transform = 'scale(1)' }
      })

      markersRef.current.push(new ml.Marker({ element: labelEl, anchor: 'top', offset: [0, 14] }).setLngLat(data.center).addTo(map))
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, mapFilters, showHeatmap])

  // Stats
  const highUrgencyCount = intelFeed.filter(i => i.urgency === 'High').length
  const newListingsCount = intelFeed.filter(i => i.type === 'New Listing').length

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 400 }}>
      <div ref={mapContainerRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} />

      {/* Stats Overlay - hidden when listings panel is open */}
      {!selectedArea && (
        <div className="absolute top-4 left-4 z-20 bg-[#0a0a0a]/90 backdrop-blur-xl border border-pcis-border/30 rounded-xl p-4 min-w-[200px]">
          <h3 className="text-[9px] font-bold text-pcis-gold uppercase tracking-widest mb-3">Market Intelligence Map</h3>
          <div className="space-y-2">
            {[
              { label: 'Properties', value: properties.length.toString(), color: '#ffffff' },
              { label: 'Areas Tracked', value: areaMetrics.length.toString(), color: '#ffffff' },
              { label: 'High Priority', value: highUrgencyCount.toString(), color: '#ef4444' },
              { label: 'New Listings', value: newListingsCount.toString(), color: '#22c55e' },
              { label: 'Avg Price/Sqft', value: `AED ${marketMetrics.avgPricePerSqft.toLocaleString()}`, color: '#d4a574' },
            ].map(stat => (
              <div key={stat.label} className="flex justify-between text-[10px]">
                <span className="text-pcis-text-muted">{stat.label}</span>
                <span className="font-mono font-semibold" style={{ color: stat.color }}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Listings Panel */}
      {selectedArea && !selectedProperty && (
        <ListingsPanel
          areaName={selectedArea}
          onClose={() => {
            onAreaSelect(null)
            mapRef.current?.flyTo({ center: [55.22, 25.12], zoom: 11, duration: 800 })
          }}
          onSelectProperty={onSelectProperty}
        />
      )}

      {/* Property Detail Panel */}
      {selectedProperty && (
        <PropertyDetailPanel
          property={selectedProperty}
          onClose={() => onSelectProperty(null)}
          compareIds={compareIds}
          onToggleCompare={onToggleCompare}
        />
      )}

      {/* Legend - shifts left when 3D viewer is open */}
      <div className="absolute top-4 z-20 bg-[#0a0a0a]/90 backdrop-blur-xl border border-pcis-border/30 rounded-xl p-3.5 transition-all duration-300"
        style={{ right: selectedProperty ? 536 : 56 }}>
        <h4 className="text-[8px] font-semibold text-pcis-text-muted uppercase tracking-wider mb-2">Price Tier</h4>
        {[
          { label: 'Ultra-Prime (100M+)', color: '#d4a574', size: 12 },
          { label: 'Luxury (40-100M)', color: '#22c55e', size: 10 },
          { label: 'Premium (<40M)', color: '#3b82f6', size: 8 },
        ].map(tier => (
          <div key={tier.label} className="flex items-center gap-2 mb-1.5 last:mb-0">
            <div className="flex-shrink-0 rounded-full" style={{ width: tier.size, height: tier.size, background: tier.color, boxShadow: `0 0 6px ${tier.color}66` }} />
            <span className="text-[9px] text-pcis-text-secondary">{tier.label}</span>
          </div>
        ))}
      </div>

      {/* Map Filters Panel */}
      {!selectedArea && !selectedProperty && (
        <div className="absolute top-4 z-20 bg-[#0a0a0a]/90 backdrop-blur-xl border border-pcis-border/30 rounded-xl p-3.5"
          style={{ right: 56, top: 140 }}>
          <h4 className="text-[8px] font-semibold text-pcis-text-muted uppercase tracking-wider mb-2">Filters</h4>
          <div className="space-y-1.5 mb-3">
            {([
              { key: 'ultraPrime', label: 'Ultra-Prime', color: '#d4a574' },
              { key: 'luxury', label: 'Luxury', color: '#22c55e' },
              { key: 'premium', label: 'Premium', color: '#3b82f6' },
            ] as const).map(tier => (
              <button key={tier.key} onClick={() => setMapFilters(f => ({ ...f, [tier.key]: !f[tier.key] }))}
                className="flex items-center gap-2 w-full text-left group">
                <div className="w-3 h-3 rounded-sm border flex items-center justify-center"
                  style={{ borderColor: mapFilters[tier.key] ? tier.color : 'rgba(255,255,255,0.15)', background: mapFilters[tier.key] ? `${tier.color}20` : 'transparent' }}>
                  {mapFilters[tier.key] && <div className="w-1.5 h-1.5 rounded-sm" style={{ background: tier.color }} />}
                </div>
                <span className="text-[9px]" style={{ color: mapFilters[tier.key] ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)' }}>{tier.label}</span>
              </button>
            ))}
          </div>
          <div className="border-t border-pcis-border/20 pt-2 mb-2">
            <h4 className="text-[8px] font-semibold text-pcis-text-muted uppercase tracking-wider mb-1.5">Type</h4>
            <div className="flex flex-wrap gap-1">
              {(['Villa', 'Penthouse', 'Apartment', 'Estate', 'Townhouse'] as const).map(type => (
                <button key={type} onClick={() => setMapFilters(f => ({ ...f, [type]: !f[type] }))}
                  className="px-1.5 py-0.5 rounded text-[8px] border transition-colors"
                  style={{
                    borderColor: mapFilters[type] ? 'rgba(212,165,116,0.3)' : 'rgba(255,255,255,0.08)',
                    background: mapFilters[type] ? 'rgba(212,165,116,0.1)' : 'transparent',
                    color: mapFilters[type] ? 'rgba(212,165,116,0.9)' : 'rgba(255,255,255,0.3)',
                  }}>
                  {type}
                </button>
              ))}
            </div>
          </div>
          <div className="border-t border-pcis-border/20 pt-2">
            <button onClick={() => setShowHeatmap(h => !h)}
              className="flex items-center gap-2 w-full text-left">
              <div className="w-3 h-3 rounded-sm border flex items-center justify-center"
                style={{ borderColor: showHeatmap ? '#d4a574' : 'rgba(255,255,255,0.15)', background: showHeatmap ? 'rgba(212,165,116,0.2)' : 'transparent' }}>
                {showHeatmap && <div className="w-1.5 h-1.5 rounded-sm bg-pcis-gold" />}
              </div>
              <span className="text-[9px]" style={{ color: showHeatmap ? 'rgba(212,165,116,0.9)' : 'rgba(255,255,255,0.4)' }}>Demand Heatmap</span>
            </button>
          </div>
        </div>
      )}

      {/* Hovered Property Card - only when no panels are open */}
      {hoveredProperty && !selectedArea && !selectedProperty && (
        <div className="absolute bottom-4 left-4 z-20 bg-[#0a0a0a]/90 backdrop-blur-xl border border-pcis-gold/20 rounded-xl p-4 min-w-[280px] pointer-events-none">
          <h4 className="text-[14px] font-semibold text-pcis-text mb-0.5">{hoveredProperty.name}</h4>
          <p className="text-[10px] text-pcis-text-muted mb-3">{hoveredProperty.area}</p>
          <div className="flex gap-4 mb-3">
            <div>
              <p className="text-[9px] text-pcis-text-muted">Price</p>
              <p className="text-[18px] font-light text-pcis-gold" style={{ fontFamily: "'Playfair Display', serif", letterSpacing: '0.02em' }}>{formatAED(hoveredProperty.price)}</p>
            </div>
            <div>
              <p className="text-[9px] text-pcis-text-muted">Type</p>
              <p className="text-[12px] text-pcis-text">{hoveredProperty.type}</p>
            </div>
            <div>
              <p className="text-[9px] text-pcis-text-muted">Beds</p>
              <p className="text-[12px] text-pcis-text">{hoveredProperty.bedrooms}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2.5">
            {hoveredProperty.features.slice(0, 3).map(f => (
              <span key={f} className="text-[8px] px-1.5 py-0.5 rounded bg-white/[0.04] text-pcis-text-muted">{f}</span>
            ))}
          </div>
          <span className="inline-block px-2 py-0.5 rounded text-[9px] font-semibold"
            style={{ background: `${priceTierColor(hoveredProperty.price)}18`, color: priceTierColor(hoveredProperty.price), border: `1px solid ${priceTierColor(hoveredProperty.price)}40` }}>
            {priceTierLabel(hoveredProperty.price)}
          </span>
        </div>
      )}
    </div>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================

// ============================================================
// COMPARISON PANEL
// ============================================================

function ComparePanel({ propertyIds, onClose, onRemove }: { propertyIds: string[]; onClose: () => void; onRemove: (id: string) => void }) {
  const compareProps = propertyIds.map(id => {
    const prop = properties.find(p => p.id === id)
    const detail = getPropertyDetail(id)
    return { prop, detail }
  }).filter(x => x.prop && x.detail)

  if (compareProps.length < 2) return null

  const rows: { label: string; getValue: (p: Property, d: PropertyDetail) => string; highlight?: 'lower' | 'higher' }[] = [
    { label: 'Price', getValue: (p) => formatAED(p.price), highlight: 'lower' },
    { label: 'Price/sqft', getValue: (_, d) => `AED ${d.investment.pricePerSqft.toLocaleString()}`, highlight: 'lower' },
    { label: 'Total Area', getValue: (_, d) => `${d.specs.totalArea.toLocaleString()} sqft`, highlight: 'higher' },
    { label: 'Bedrooms', getValue: (p) => p.bedrooms.toString() },
    { label: 'Bathrooms', getValue: (_, d) => d.specs.bathrooms.toString() },
    { label: 'Parking', getValue: (_, d) => d.specs.parking.toString() },
    { label: 'Floors', getValue: (_, d) => d.specs.floors.toString() },
    { label: 'Built', getValue: (_, d) => d.specs.builtYear.toString() },
    { label: 'Rental Yield', getValue: (_, d) => `${d.investment.estimatedRentalYield}%`, highlight: 'higher' },
    { label: '5yr Appreciation', getValue: (_, d) => `+${d.investment.capitalAppreciation5yr}%`, highlight: 'higher' },
    { label: 'DLD Fee (4%)', getValue: (_, d) => formatAED(d.investment.dldFee) },
    { label: 'Walk Score', getValue: (_, d) => d.neighborhood.walkScore.toString(), highlight: 'higher' },
    { label: 'To Downtown', getValue: (_, d) => d.neighborhood.commuteToDowntown },
    { label: 'Days on Market', getValue: () => `${Math.floor(Math.random() * 60 + 10)}d` },
    { label: 'Developer', getValue: (_, d) => d.developer },
  ]

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center" onClick={onClose}>
      <div className="bg-[#0a0a0a] border border-pcis-border/30 rounded-2xl w-[90%] max-w-[900px] max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-pcis-border/20">
          <div className="flex items-center gap-3">
            <h2 className="text-[14px] font-semibold text-pcis-text">Property Comparison</h2>
            <span className="text-[8px] px-2 py-0.5 rounded-full bg-pcis-gold/10 text-pcis-gold font-semibold">{compareProps.length} properties</span>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/[0.06] border border-pcis-border/20 text-pcis-text-muted hover:text-pcis-text transition-colors text-[16px]">&times;</button>
        </div>

        {/* Comparison Table */}
        <div className="flex-1 overflow-auto p-6">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left text-[9px] text-pcis-text-secondary uppercase tracking-wider p-2 w-[140px]">Metric</th>
                {compareProps.map(({ prop }) => (
                  <th key={prop!.id} className="text-left p-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-[11px] font-semibold text-pcis-text">{prop!.name}</p>
                        <p className="text-[8px] text-pcis-text-muted">{prop!.area}</p>
                        <span className="text-[7px] px-1.5 py-0.5 rounded font-semibold mt-1 inline-block"
                          style={{ background: `${priceTierColor(prop!.price)}18`, color: priceTierColor(prop!.price) }}>{prop!.type}</span>
                      </div>
                      <button onClick={() => onRemove(prop!.id)} className="text-[10px] text-pcis-text-muted hover:text-red-400 transition-colors">&times;</button>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={row.label} className={ri % 2 === 0 ? 'bg-white/[0.01]' : ''}>
                  <td className="text-[9px] text-pcis-text-secondary p-2 border-t border-pcis-border/10">{row.label}</td>
                  {compareProps.map(({ prop, detail }) => (
                    <td key={prop!.id} className="text-[10px] font-mono text-pcis-text p-2 border-t border-pcis-border/10">
                      {row.getValue(prop!, detail!)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function IntelPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')
  const [selectedArea, setSelectedArea] = useState<string | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [compareIds, setCompareIds] = useState<string[]>([])
  const [showCompare, setShowCompare] = useState(false)

  // Reset selections when leaving map view
  useEffect(() => {
    if (viewMode !== 'map') {
      setSelectedArea(null)
      setSelectedProperty(null)
    }
  }, [viewMode])

  return (
    <div style={viewMode === 'map' ? {
      position: 'relative',
      margin: '-24px', width: 'calc(100% + 48px)', height: 'calc(100% + 48px)',
    } : { position: 'relative' }}>

      {/* Page header - matching Clients header pattern */}
      {viewMode !== 'map' && (
        <div className="flex-shrink-0 bg-pcis-card/40 backdrop-blur-sm border-b border-pcis-border px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-lg font-semibold text-pcis-text">Market Intelligence</h1>
              <p className="text-[11px] text-pcis-text-secondary mt-0.5">Real-time market intelligence and property events</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-white/[0.03] border border-pcis-border/40 rounded-lg overflow-hidden">
                {VIEW_TABS.map((tab, i) => (
                  <div key={tab.key} className="flex items-center">
                    {i > 0 && <div className="w-px h-5 bg-pcis-border/30" />}
                    <button
                      onClick={() => setViewMode(tab.key)}
                      className={`px-3 py-1.5 text-[10px] font-medium transition-colors ${
                        viewMode === tab.key ? 'bg-pcis-gold/10 text-pcis-gold' : 'text-pcis-text-muted hover:text-pcis-text'
                      }`}
                    >
                      {tab.label}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <MarketStatsBar />
        </div>
      )}

      {/* Floating tab switcher when in Map mode */}
      {viewMode === 'map' && (
        <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
          <div className="flex items-center bg-[#0a0a0a]/80 backdrop-blur-md border border-pcis-border/40 rounded-lg overflow-hidden">
            {VIEW_TABS.map((tab, i) => (
              <div key={tab.key} className="flex items-center">
                {i > 0 && <div className="w-px h-5 bg-pcis-border/30" />}
                <button
                  onClick={() => setViewMode(tab.key)}
                  className={`px-3.5 py-2 text-[10px] font-medium transition-colors ${
                    viewMode === tab.key ? 'bg-pcis-gold/10 text-pcis-gold' : 'text-pcis-text-muted hover:text-pcis-text'
                  }`}
                >
                  {tab.label}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {viewMode === 'dashboard' && <DashboardView />}
      {viewMode === 'feed' && <FeedView />}

      {/* Map - always mounted, visibility toggled */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        width: '100%', height: '100%',
        visibility: viewMode === 'map' ? 'visible' : 'hidden',
        zIndex: viewMode === 'map' ? 10 : 0,
        minHeight: viewMode === 'map' ? undefined : 0,
      }}>
        <IntelMap
          isVisible={viewMode === 'map'}
          selectedArea={selectedArea}
          onAreaSelect={setSelectedArea}
          selectedProperty={selectedProperty}
          onSelectProperty={setSelectedProperty}
          compareIds={compareIds}
          onToggleCompare={(id) => setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length >= 3 ? prev : [...prev, id])}
        />
      </div>

      {/* Compare Floating Bar */}
      {compareIds.length > 0 && viewMode === 'map' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[50] bg-[#0a0a0a]/95 backdrop-blur-xl border border-pcis-border/40 rounded-2xl px-5 py-3 flex items-center gap-4">
          <div className="flex items-center gap-2">
            {compareIds.map(id => {
              const prop = properties.find(p => p.id === id)
              return prop ? (
                <div key={id} className="flex items-center gap-2 bg-white/[0.04] border border-pcis-border/20 rounded-lg px-3 py-1.5">
                  <span className="text-[9px] font-medium text-pcis-text">{prop.name}</span>
                  <button onClick={() => setCompareIds(prev => prev.filter(x => x !== id))} className="text-[10px] text-pcis-text-muted hover:text-red-400">&times;</button>
                </div>
              ) : null
            })}
          </div>
          <div className="w-px h-6 bg-pcis-border/30" />
          <span className="text-[9px] text-pcis-text-muted">{compareIds.length}/3</span>
          {compareIds.length >= 2 && (
            <button onClick={() => setShowCompare(true)}
              className="px-4 py-1.5 rounded-lg bg-pcis-gold/20 border border-pcis-gold/30 text-[10px] font-semibold text-pcis-gold hover:bg-pcis-gold/30 transition-colors">
              Compare Now
            </button>
          )}
          <button onClick={() => setCompareIds([])} className="text-[9px] text-pcis-text-muted hover:text-red-400 transition-colors">Clear</button>
        </div>
      )}

      {/* Compare Panel Overlay */}
      {showCompare && compareIds.length >= 2 && (
        <ComparePanel
          propertyIds={compareIds}
          onClose={() => setShowCompare(false)}
          onRemove={(id) => {
            const next = compareIds.filter(x => x !== id)
            setCompareIds(next)
            if (next.length < 2) setShowCompare(false)
          }}
        />
      )}
    </div>
  )
}
