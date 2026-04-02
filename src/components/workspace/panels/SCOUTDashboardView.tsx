'use client'

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { p1Api } from '@/lib/api'
import {
  areas,
  getTopAreas,
} from '@/lib/marketData'
import {
  intelFeed as mockIntelFeed,
  areaMetrics as mockAreaMetrics,
  marketMetrics as mockMarketMetrics,
  macroIndicators as mockMacroIndicators,
  momentumSignals as mockMomentumSignals,
  type IntelFeedItem,
  type IntelFeedType,
  type MomentumType,
  intelTypeColors,
} from '@/lib/mockData'
import { useWorkspaceNav } from '../useWorkspaceNav'

// ═══════════════════════════════════════════════════════════════════════════
// E2 SCOUT POWER DASHBOARD — Unified Market Intelligence Engine
//
// ALL PANELS NOW PULL FROM THE REAL P1 BACKEND (Railway PostgreSQL).
// Mock data is used ONLY as fallback if the API call fails.
// ═══════════════════════════════════════════════════════════════════════════

// ── Types for real backend data ────────────────────────────────────────

interface BackendAreaMetric {
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
  topPropertyTypes: { type: string; count: number }[]
  sources: string[]
}

interface BackendAnomaly {
  type: string
  area: string
  severity: string
  headline: string
  detail: string
  metric: string
  change: number
  timeframe: string
}

interface BackendMacroContext {
  hasDailyContext: boolean
  dailyContext: {
    date: string
    geoContext: string
    economicContext: string
    regulatoryContext: string
    developerContext: string
    marketSentiment: string
    keyEvents: string[]
    refreshedAt: string
  } | null
  embeddedKnowledgeBase: string
}

interface BackendStatus {
  totalProperties: number
  totalAreas: number
  totalOpportunities: number
  lastScrapeRun: { source: string; status: string; completedAt: string | null } | null
}

// ── Formatting ──────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(0)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : `${n}`

const ago = (ts: string) => {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

// ── Color Utilities ─────────────────────────────────────────────────────

const getMomentumColor = (type: string): string => {
  switch (type) {
    case 'heating': return '#22c55e'
    case 'cooling': return '#ef4444'
    case 'warning': return '#f59e0b'
    case 'opportunity': return '#06b6d4'
    default: return '#9ca3af'
  }
}

const getMomentumIcon = (type: string): string => {
  switch (type) {
    case 'heating': return '▲'
    case 'cooling': return '▼'
    case 'warning': return '⚠'
    case 'opportunity': return '◆'
    default: return '—'
  }
}

const getUrgencyColor = (urgency: string): string => {
  switch (urgency) {
    case 'High': case 'high': return '#ef4444'
    case 'Medium': case 'medium': return '#f59e0b'
    case 'Low': case 'low': return '#22c55e'
    case 'critical': return '#dc2626'
    default: return '#9ca3af'
  }
}

const getDemandColor = (score: number): string => {
  if (score >= 90) return '#22c55e'
  if (score >= 75) return '#06b6d4'
  if (score >= 60) return '#f59e0b'
  return '#ef4444'
}

const getPriceChangeColor = (change: number): string => {
  if (change > 2) return '#22c55e'
  if (change > 0) return '#06b6d4'
  if (change >= -2) return '#f59e0b'
  return '#ef4444'
}

const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'critical': return '#dc2626'
    case 'high': return '#ef4444'
    case 'medium': return '#f59e0b'
    case 'low': return '#22c55e'
    default: return '#9ca3af'
  }
}

// ── SVG Components ──────────────────────────────────────────────────────

function MiniSparkline({ data, color = '#22c55e', width = 80, height = 24 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')
  const gradId = `sct-sp-${Math.random().toString(36).slice(2, 8)}`
  const areaPath = `M0,${height} L${data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(' L')} L${width},${height} Z`
  return (
    <svg width={width} height={height}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradId})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function DemandRing({ score, size = 36, strokeWidth = 3, color }: { score: number; size?: number; strokeWidth?: number; color?: string }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const c = color || getDemandColor(score)
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        fill={c} fontSize="9" fontWeight="bold" fontFamily="monospace">{score}</text>
    </svg>
  )
}

function DonutChart({ data, size = 80, strokeWidth = 10 }: { data: { label: string; value: number; color: string }[]; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const total = data.reduce((s, d) => s + d.value, 0)
  let acc = 0
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={strokeWidth} />
      {data.map((d, i) => {
        const pct = d.value / total
        const dashLen = pct * circ
        const dashOff = -acc * circ
        acc += pct
        return (
          <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth={strokeWidth}
            strokeDasharray={`${dashLen} ${circ - dashLen}`} strokeDashoffset={dashOff}
            transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        )
      })}
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        fill="#ffffff" fontSize="14" fontWeight="bold" fontFamily="Inter, sans-serif">{total}</text>
    </svg>
  )
}

// ── PCIS Card Wrappers ──────────────────────────────────────────────────

function Panel({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      className={`bg-white/[0.02] border border-pcis-border/30 rounded-xl backdrop-blur-sm overflow-hidden ${onClick ? 'cursor-pointer hover:border-pcis-gold/20 transition-colors' : ''} ${className}`}
      onClick={onClick}>
      {children}
    </div>
  )
}

function PanelHeader({ title, accent, right }: { title: string; accent?: string; right?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-pcis-border/20">
      <div className="flex items-center gap-2">
        {accent && <div className="w-[3px] h-3.5 rounded-full" style={{ backgroundColor: accent }} />}
        <span className="text-[11px] font-semibold text-pcis-text-secondary uppercase tracking-wider">{title}</span>
      </div>
      {right}
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// REAL DATA HOOK — Fetches all SCOUT data from backend on mount
// ═══════════════════════════════════════════════════════════════════════════

interface SCOUTLiveData {
  status: BackendStatus | null
  areaMetrics: BackendAreaMetric[]
  anomalies: BackendAnomaly[]
  macroContext: BackendMacroContext | null
  isLoading: boolean
  isLive: boolean
  lastRefresh: string | null
}

function useSCOUTLiveData(): SCOUTLiveData {
  const [status, setStatus] = useState<BackendStatus | null>(null)
  const [areaMetrics, setAreaMetrics] = useState<BackendAreaMetric[]>([])
  const [anomalies, setAnomalies] = useState<BackendAnomaly[]>([])
  const [macroContext, setMacroContext] = useState<BackendMacroContext | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isLive, setIsLive] = useState(false)
  const [lastRefresh, setLastRefresh] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchAll() {
      setIsLoading(true)
      try {
        const [statusRes, areasRes, anomalyRes, macroRes] = await Promise.allSettled([
          p1Api.getSCOUTAgentStatus(),
          p1Api.getAreaMetrics(),
          p1Api.getSCOUTAnomalies(),
          p1Api.getSCOUTMacroContext(),
        ])

        if (cancelled) return

        if (statusRes.status === 'fulfilled' && statusRes.value?.data) {
          setStatus(statusRes.value.data)
          setIsLive(true)
        }
        if (areasRes.status === 'fulfilled') {
          const raw = areasRes.value?.data || areasRes.value
          if (Array.isArray(raw) && raw.length > 0) {
            setAreaMetrics(raw)
          }
        }
        if (anomalyRes.status === 'fulfilled' && anomalyRes.value?.data?.anomalies) {
          setAnomalies(anomalyRes.value.data.anomalies)
        }
        if (macroRes.status === 'fulfilled' && macroRes.value?.data) {
          setMacroContext(macroRes.value.data)
        }

        setLastRefresh(new Date().toISOString())
      } catch (err) {
        console.warn('[SCOUT Dashboard] Failed to fetch live data, using fallbacks')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }
    fetchAll()
    return () => { cancelled = true }
  }, [])

  return { status, areaMetrics, anomalies, macroContext, isLoading, isLive, lastRefresh }
}


// ═══════════════════════════════════════════════════════════════════════════
// TOP STATS BAR — Real Market Intelligence Metrics
// ═══════════════════════════════════════════════════════════════════════════

function SCOUTStatsBar({ live }: { live: SCOUTLiveData }) {
  const topArea = live.areaMetrics.length > 0
    ? [...live.areaMetrics].sort((a, b) => b.demandScore - a.demandScore)[0]
    : null

  const highAlerts = live.anomalies.filter(a => a.severity === 'critical' || a.severity === 'high').length
  const heatingAreas = live.areaMetrics.filter(a => a.priceChange7d > 2 || a.demandScore >= 85).length
  const avgPriceSqft = live.areaMetrics.length > 0
    ? Math.round(live.areaMetrics.reduce((s, a) => s + a.avgPricePerSqft, 0) / live.areaMetrics.length)
    : mockMarketMetrics.avgPricePerSqft

  const totalProperties = live.status?.totalProperties || 0
  const totalAreas = live.status?.totalAreas || live.areaMetrics.length || mockAreaMetrics.length
  const totalOpportunities = live.status?.totalOpportunities || 0

  // Compute a sentiment score from anomaly distribution
  const criticalCount = live.anomalies.filter(a => a.severity === 'critical').length
  const sentimentScore = live.anomalies.length > 0
    ? Math.max(20, Math.min(95, 80 - Math.round((criticalCount / live.anomalies.length) * 60)))
    : mockMarketMetrics.marketSentimentScore

  const stats = [
    { label: 'Areas Tracked', value: `${totalAreas}`, color: '#22c55e' },
    { label: 'Avg Price/SqFt', value: `AED ${avgPriceSqft.toLocaleString()}`, color: '#22c55e' },
    { label: 'Properties', value: fmt(totalProperties), color: '#06b6d4' },
    { label: 'Opportunities', value: `${totalOpportunities}`, color: '#d4a574' },
    { label: 'Top Area', value: topArea?.areaName?.split(' ').slice(0, 2).join(' ') || 'N/A', color: '#f59e0b' },
    { label: 'Alerts', value: `${highAlerts}`, color: highAlerts > 5 ? '#ef4444' : '#f59e0b' },
    { label: 'Heating', value: `${heatingAreas}`, color: '#22c55e' },
    { label: 'Sentiment', value: `${sentimentScore}/100`, color: sentimentScore >= 60 ? '#22c55e' : '#f59e0b' },
  ]

  return (
    <div className="flex items-center gap-5 text-[10px] flex-wrap">
      {stats.map((s, i) => (
        <React.Fragment key={s.label}>
          {i > 0 && <div className="w-px h-3 bg-pcis-border/30" />}
          <div className="flex items-center gap-1.5">
            <span className="text-pcis-text-muted">{s.label}:</span>
            <span className="font-mono font-semibold" style={{ color: s.color }}>{s.value}</span>
          </div>
        </React.Fragment>
      ))}
      {live.isLive && (
        <>
          <div className="w-px h-3 bg-pcis-border/30" />
          <div className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[8px] text-emerald-500/60 font-mono">LIVE</span>
          </div>
        </>
      )}
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// ENGINE SUB-PANEL CARDS — Gateway to SCOUT workspace panels
// ═══════════════════════════════════════════════════════════════════════════

function SCOUTSubPanelCards({ live }: { live: SCOUTLiveData }) {
  const nav = useWorkspaceNav()
  const totalAreas = live.status?.totalAreas || live.areaMetrics.length
  const totalProperties = live.status?.totalProperties || 0
  const anomalyCount = live.anomalies.length
  const macroIndicatorCount = live.macroContext?.hasDailyContext ? 6 : mockMacroIndicators.length

  const panels = [
    {
      code: 'ARE', title: 'Area Intelligence',
      desc: 'Sortable grid of all tracked areas with demand scores, pricing, and momentum indicators',
      metric: `${totalAreas} areas`,
      sub: 'Demand & price tracking',
      color: '#22c55e',
      onClick: () => nav.openPanelByType('area-grid', 'tab'),
    },
    {
      code: 'TXN', title: 'Transaction Feed',
      desc: 'Real-time transaction data with volume analysis and YoY trend comparisons',
      metric: `${fmt(totalProperties)} tracked`,
      sub: 'Live from DLD',
      color: '#06b6d4',
      onClick: () => nav.openPanelByType('transaction-feed', 'tab'),
    },
    {
      code: 'PRC', title: 'Price Intelligence',
      desc: 'Price per sqft mapping across all areas with historical trend analysis',
      metric: live.areaMetrics.length > 0 ? `AED ${Math.round(live.areaMetrics.reduce((s, a) => s + a.avgPricePerSqft, 0) / live.areaMetrics.length)}/sqft` : 'Loading...',
      sub: 'Cross-area comparison',
      color: '#d4a574',
      onClick: () => nav.openPanelByType('price-map', 'tab'),
    },
    {
      code: 'CMP', title: 'Comparables Engine',
      desc: 'Side-by-side property and area comparisons with pricing benchmarks',
      metric: `${totalAreas} areas`,
      sub: 'Automated comps',
      color: '#a78bfa',
      onClick: () => nav.openPanelByType('comparables', 'tab'),
    },
    {
      code: 'TRD', title: 'Price Trends',
      desc: 'Multi-timeframe price trend analysis with 7d, 30d, and YoY change tracking',
      metric: 'Live tracking',
      sub: '7d / 30d / YoY',
      color: '#f59e0b',
      onClick: () => nav.openPanelByType('price-trends', 'tab'),
    },
    {
      code: 'OFP', title: 'Off-Plan Projects',
      desc: 'New developer launches, payment plans, and project pipeline tracking',
      metric: `${live.anomalies.filter(a => a.type === 'developer_activity').length} signals`,
      sub: 'Developer intel',
      color: '#14B8A6',
      onClick: () => nav.openPanelByType('offplan-feed', 'tab'),
    },
    {
      code: 'DEV', title: 'Developer Analytics',
      desc: 'Developer performance metrics, track records, and delivery timelines',
      metric: 'All developers',
      sub: 'Performance scoring',
      color: '#8B5CF6',
      onClick: () => nav.openPanelByType('developer-analytics', 'tab'),
    },
    {
      code: 'MCR', title: 'Macro Intelligence',
      desc: 'GDP, currency, interest rates, visa policy, and regulatory tracking',
      metric: live.macroContext?.hasDailyContext ? 'Live enriched' : 'Embedded',
      sub: live.macroContext?.dailyContext?.marketSentiment?.split(' ')[0] || 'Economic overlay',
      color: '#ec4899',
      onClick: () => nav.openPanelByType('macro-dashboard', 'tab'),
    },
    {
      code: 'SIG', title: 'Market Signals',
      desc: 'Anomaly detection, heating/cooling areas, and opportunity alerts',
      metric: `${anomalyCount} active`,
      sub: 'Real-time alerts',
      color: '#ef4444',
      onClick: () => nav.openPanelByType('signal-feed', 'tab'),
    },
    {
      code: 'EMG', title: 'Emerging Areas',
      desc: 'Early-stage market signals for areas transitioning from dormant to active growth phases',
      metric: 'Discovery & growth',
      sub: 'Opportunity detection',
      color: '#10b981',
      onClick: () => nav.openPanelByType('emerging-areas', 'tab'),
    },
    {
      code: 'HMP', title: 'Heat Map',
      desc: 'Multi-dimensional heat scoring across price, volume, demand, supply, yield, and sentiment',
      metric: '7 dimensions',
      sub: 'Area heat scoring',
      color: '#f97316',
      onClick: () => nav.openPanelByType('heat-map', 'tab'),
    },
    {
      code: 'NWS', title: 'Dubai News',
      desc: 'Live Dubai real estate and financial news from public sources',
      metric: 'Live feed',
      sub: live.macroContext?.dailyContext?.refreshedAt ? `Updated ${ago(live.macroContext.dailyContext.refreshedAt)}` : 'Real-time articles',
      color: '#22c55e',
      onClick: () => nav.openNewsFeed(),
    },
  ]

  return (
    <div className="grid grid-cols-4 gap-3">
      {panels.map(p => (
        <Panel key={p.code} onClick={p.onClick} className="group hover:border-opacity-50 transition-all">
          <div className="px-3 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color, opacity: 0.7 }} />
                <span className="text-[9px] font-mono font-bold" style={{ color: p.color }}>{p.code}</span>
              </div>
              <span className="text-[7px] text-pcis-text-muted/40 group-hover:text-pcis-gold/60 transition-colors">→</span>
            </div>
            <div className="text-[11px] font-semibold text-white/80 mb-0.5" style={{ fontFamily: "'Playfair Display', serif" }}>
              {p.title}
            </div>
            <div className="text-[8px] text-pcis-text-muted leading-relaxed mb-2 line-clamp-2">{p.desc}</div>
            <div className="text-[9px] text-pcis-text-secondary font-mono">{p.metric}</div>
            <div className="text-[8px] text-pcis-text-muted mt-0.5">{p.sub}</div>
          </div>
        </Panel>
      ))}
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS ROW — Area Distribution, Anomaly Breakdown, Macro Intelligence
// ═══════════════════════════════════════════════════════════════════════════

function SCOUTAnalyticsRow({ live }: { live: SCOUTLiveData }) {
  // Area demand distribution donut -- from real area metrics
  const areaDonut = useMemo(() => {
    const source = live.areaMetrics.length > 0
      ? [...live.areaMetrics].sort((a, b) => b.demandScore - a.demandScore).slice(0, 8)
      : mockAreaMetrics.sort((a, b) => b.demandScore - a.demandScore)
    const colors = ['#22c55e', '#06b6d4', '#f59e0b', '#a78bfa', '#d4a574', '#ec4899', '#ef4444', '#14B8A6']
    return source.map((a, i) => ({
      label: a.areaName.split(' ').map((w: string) => w[0]).join(''),
      fullName: a.areaName,
      value: a.demandScore,
      color: colors[i % colors.length],
    }))
  }, [live.areaMetrics])

  // Anomaly type distribution donut -- from real anomalies
  const anomalyDonut = useMemo(() => {
    if (live.anomalies.length === 0) {
      // Fallback to momentum signals
      const counts: Record<MomentumType, number> = { heating: 0, cooling: 0, warning: 0, opportunity: 0 }
      mockMomentumSignals.forEach(s => { counts[s.type]++ })
      return [
        { label: 'Heating', value: counts.heating, color: '#22c55e' },
        { label: 'Opportunity', value: counts.opportunity, color: '#06b6d4' },
        { label: 'Warning', value: counts.warning, color: '#f59e0b' },
        { label: 'Cooling', value: counts.cooling, color: '#ef4444' },
      ].filter(d => d.value > 0)
    }
    // Real anomaly breakdown
    const typeCounts: Record<string, number> = {}
    live.anomalies.forEach(a => { typeCounts[a.type] = (typeCounts[a.type] || 0) + 1 })
    const typeColors: Record<string, string> = {
      volume_spike: '#ef4444',
      developer_activity: '#8B5CF6',
      price_drop: '#f59e0b',
      price_surge: '#22c55e',
      demand_shift: '#06b6d4',
      inventory_shift: '#d4a574',
    }
    return Object.entries(typeCounts).map(([type, count]) => ({
      label: type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      value: count,
      color: typeColors[type] || '#9ca3af',
    }))
  }, [live.anomalies])

  // Macro intelligence -- from real macro context or fallback
  const macroItems = useMemo(() => {
    if (live.macroContext?.hasDailyContext && live.macroContext.dailyContext) {
      const ctx = live.macroContext.dailyContext
      return [
        { id: 'geo', label: 'Geopolitical', value: ctx.geoContext.substring(0, 60) + '...', trend: 0, color: '#ef4444' },
        { id: 'econ', label: 'Economic', value: ctx.economicContext.substring(0, 60) + '...', trend: 0, color: '#06b6d4' },
        { id: 'reg', label: 'Regulatory', value: ctx.regulatoryContext.substring(0, 60) + '...', trend: 0, color: '#f59e0b' },
        { id: 'dev', label: 'Developer', value: ctx.developerContext.substring(0, 60) + '...', trend: 0, color: '#8B5CF6' },
        { id: 'sent', label: 'Sentiment', value: ctx.marketSentiment.split(' ')[0] || 'Neutral', trend: 0, color: '#22c55e' },
        { id: 'events', label: 'Key Events', value: `${ctx.keyEvents.length} tracked`, trend: 0, color: '#d4a574' },
      ]
    }
    return mockMacroIndicators.slice(0, 10)
  }, [live.macroContext])

  const hasMacroNarrative = live.macroContext?.hasDailyContext

  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Area Demand Distribution */}
      <Panel>
        <PanelHeader title="Area Demand Distribution" accent="#22c55e"
          right={live.isLive ? <span className="text-[7px] text-emerald-500/50 font-mono">LIVE</span> : null} />
        <div className="px-4 py-4 flex items-center gap-4">
          <DonutChart data={areaDonut} size={80} strokeWidth={10} />
          <div className="flex-1">
            <div className="flex flex-col gap-1.5">
              {areaDonut.slice(0, 5).map(d => (
                <div key={d.fullName} className="flex items-center gap-2 text-[10px] text-pcis-text-secondary">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="flex-1 truncate">{d.fullName}</span>
                  <span className="font-mono font-semibold" style={{ color: d.color }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      {/* Anomaly / Momentum Breakdown */}
      <Panel>
        <PanelHeader title={live.anomalies.length > 0 ? 'Anomaly Breakdown' : 'Market Momentum'} accent="#06b6d4"
          right={live.anomalies.length > 0 ? <span className="text-[8px] text-cyan-400/50 font-mono">{live.anomalies.length} total</span> : null} />
        <div className="px-4 py-4 flex items-center gap-4">
          <DonutChart data={anomalyDonut} size={80} strokeWidth={10} />
          <div className="flex-1">
            <div className="flex flex-col gap-1.5">
              {anomalyDonut.map(d => (
                <div key={d.label} className="flex items-center gap-2 text-[10px] text-pcis-text-secondary">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                  <span className="flex-1">{d.label}</span>
                  <span className="font-mono font-semibold" style={{ color: d.color }}>{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>

      {/* Macro Intelligence */}
      <Panel>
        <PanelHeader title="Macro Intelligence" accent="#a78bfa"
          right={hasMacroNarrative ? <span className="text-[7px] text-purple-400/50 font-mono">ENRICHED</span> : null} />
        <div className="px-4 py-3">
          {hasMacroNarrative ? (
            <div className="flex flex-col gap-2">
              {macroItems.map((m: any) => (
                <div key={m.id} className="group">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[8px] font-semibold uppercase tracking-wider" style={{ color: m.color }}>{m.label}</span>
                  </div>
                  <div className="text-[8px] text-white/50 leading-relaxed truncate">{m.value}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              {(macroItems as any[]).map((m: any) => (
                <div key={m.id} className="group">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[8px] text-white/50 truncate">{m.label}</span>
                    <span className="text-[8px] font-mono font-semibold" style={{ color: m.trend > 0 ? '#22c55e' : m.trend < 0 ? '#ef4444' : '#f59e0b' }}>
                      {m.trend > 0 ? '+' : ''}{m.trend}%
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-white/80">{m.value}</span>
                    {m.sparkline && <MiniSparkline data={m.sparkline} color={m.trend >= 0 ? '#22c55e' : '#ef4444'} width={50} height={14} />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Panel>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// AREA WATCHLIST — Real backend area data
// ═══════════════════════════════════════════════════════════════════════════

function AreaWatchlist({ live }: { live: SCOUTLiveData }) {
  const nav = useWorkspaceNav()

  const list = useMemo(() => {
    if (live.areaMetrics.length > 0) {
      return [...live.areaMetrics]
        .sort((a, b) => b.demandScore - a.demandScore)
        .slice(0, 20) // Show top 20 areas
    }
    return [...mockAreaMetrics].sort((a, b) => b.demandScore - a.demandScore)
  }, [live.areaMetrics])

  // Get anomaly count per area from real data
  const areaAnomalyCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    live.anomalies.forEach(a => { counts[a.area] = (counts[a.area] || 0) + 1 })
    return counts
  }, [live.anomalies])

  return (
    <Panel>
      <PanelHeader title="SCOUT Area Watchlist" accent="#22c55e"
        right={
          <div className="flex items-center gap-3">
            {live.isLive && <span className="text-[7px] text-emerald-500/50 font-mono">{live.areaMetrics.length} areas from DB</span>}
            <button onClick={() => nav.openPanelByType('area-grid', 'tab')} className="text-[9px] text-pcis-gold/50 hover:text-pcis-gold transition-colors">
              Full area grid →
            </button>
          </div>
        } />
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="text-pcis-text-muted text-[8px] uppercase tracking-wider border-b border-pcis-border/10">
              <th className="text-left py-2 px-4 font-normal">Area</th>
              <th className="text-center py-2 px-2 font-normal">Demand</th>
              <th className="text-right py-2 px-2 font-normal">Avg Price/SqFt</th>
              <th className="text-center py-2 px-2 font-normal">7d Change</th>
              <th className="text-center py-2 px-2 font-normal">30d Change</th>
              <th className="text-center py-2 px-2 font-normal">Listings</th>
              <th className="text-center py-2 px-2 font-normal">Days on Market</th>
              <th className="text-center py-2 px-2 font-normal">Alerts</th>
              <th className="text-right py-2 px-4 font-normal">Top Type</th>
            </tr>
          </thead>
          <tbody>
            {list.map((area: any) => {
              const alertCount = areaAnomalyCounts[area.areaName] || 0
              const areaProfile = areas.find(a => a.name === area.areaName)
              const topType = area.topPropertyTypes?.[0]

              return (
                <tr key={area.areaName}
                  className="border-b border-pcis-border/10 hover:bg-pcis-gold/[0.03] cursor-pointer transition-colors"
                  onClick={() => { if (areaProfile) nav.openArea(areaProfile.id) }}>
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: getDemandColor(area.demandScore) }} />
                      <span className="text-white/70 font-medium">{area.areaName}</span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <DemandRing score={area.demandScore} size={22} strokeWidth={2} />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <span className="text-[10px] font-mono text-white/80">AED {area.avgPricePerSqft?.toLocaleString()}</span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="text-[9px] font-mono" style={{ color: getPriceChangeColor(area.priceChange7d || 0) }}>
                      {(area.priceChange7d || 0) > 0 ? '+' : ''}{(area.priceChange7d || 0).toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="text-[9px] font-mono" style={{ color: getPriceChangeColor(area.priceChange30d || 0) }}>
                      {(area.priceChange30d || 0) > 0 ? '+' : ''}{(area.priceChange30d || 0).toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="text-[10px] font-mono text-white/60">{(area.inventoryCount || area.propertyCount || 0).toLocaleString()}</span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="text-[10px] font-mono" style={{ color: (area.avgDaysOnMarket || 0) <= 35 ? '#22c55e' : (area.avgDaysOnMarket || 0) <= 50 ? '#f59e0b' : '#ef4444' }}>
                      {area.avgDaysOnMarket || 0}d
                    </span>
                  </td>
                  <td className="py-2 px-2 text-center">
                    {alertCount > 0 ? (
                      <span className="text-[9px] font-mono text-red-400">{alertCount}</span>
                    ) : <span className="text-pcis-text-muted/30">0</span>}
                  </td>
                  <td className="py-2 px-4 text-right">
                    <span className="text-[9px] font-mono text-pcis-text-secondary">{topType ? `${topType.type} (${topType.count})` : '--'}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// BOTTOM ROW — Anomaly Alerts, Macro Events, Key Events, Market Data
// ═══════════════════════════════════════════════════════════════════════════

function SCOUTBottomRow({ live }: { live: SCOUTLiveData }) {
  const nav = useWorkspaceNav()

  // Priority Alerts -- from real anomalies (critical + high severity)
  const priorityAlerts = useMemo(() => {
    if (live.anomalies.length > 0) {
      return [...live.anomalies]
        .filter(a => a.severity === 'critical' || a.severity === 'high')
        .sort((a, b) => {
          const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 }
          return (sevOrder[a.severity] || 3) - (sevOrder[b.severity] || 3)
        })
        .slice(0, 6)
    }
    return mockIntelFeed
      .filter(i => i.type === 'Price Change' || i.type === 'Market Signal')
      .sort((a, b) => {
        const urgencyOrder = { High: 0, Medium: 1, Low: 2 }
        return (urgencyOrder[a.urgency as keyof typeof urgencyOrder] ?? 2) - (urgencyOrder[b.urgency as keyof typeof urgencyOrder] ?? 2)
      })
      .slice(0, 5)
  }, [live.anomalies])

  // Macro events from enrichment
  const macroEvents = useMemo(() => {
    if (live.macroContext?.hasDailyContext && live.macroContext.dailyContext?.keyEvents) {
      return live.macroContext.dailyContext.keyEvents.slice(0, 5)
    }
    return []
  }, [live.macroContext])

  // Area signals -- top movers from real data
  const areaSignals = useMemo(() => {
    if (live.areaMetrics.length > 0) {
      const withChange = live.areaMetrics.filter(a => a.priceChange7d !== 0 || a.priceChange30d !== 0)
      if (withChange.length > 0) {
        return [...withChange].sort((a, b) => Math.abs(b.priceChange30d) - Math.abs(a.priceChange30d)).slice(0, 5)
      }
      // Even without price changes, show top areas by demand
      return [...live.areaMetrics].sort((a, b) => b.demandScore - a.demandScore).slice(0, 5)
    }
    return []
  }, [live.areaMetrics])

  // Top areas for market data panel
  const topAreas = useMemo(() => {
    return live.areaMetrics.length > 0
      ? [...live.areaMetrics].sort((a, b) => b.demandScore - a.demandScore).slice(0, 5)
      : mockAreaMetrics.slice(0, 3).sort((a, b) => b.demandScore - a.demandScore)
  }, [live.areaMetrics])

  return (
    <div className="grid grid-cols-4 gap-3">
      {/* Priority Alerts -- Real anomalies */}
      <Panel>
        <PanelHeader title="Priority Alerts" accent="#ef4444"
          right={<span className="text-[8px] text-red-400/50 font-mono">{live.anomalies.length} total</span>} />
        <div className="divide-y divide-pcis-border/10">
          {live.anomalies.length > 0 ? (
            (priorityAlerts as BackendAnomaly[]).map((alert, idx) => (
              <div key={idx} className="px-4 py-2.5 hover:bg-pcis-gold/[0.02] transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="text-[8px] flex-shrink-0" style={{ color: getSeverityColor(alert.severity) }}>●</span>
                    <span className="text-[10px] text-white/70 font-medium truncate">{alert.headline}</span>
                  </div>
                  <span className="text-[7px] font-mono uppercase px-1.5 py-[1px] rounded flex-shrink-0 ml-2"
                    style={{ backgroundColor: `${getSeverityColor(alert.severity)}15`, color: getSeverityColor(alert.severity) }}>
                    {alert.severity}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-white/50">{alert.area}</span>
                  <span className="text-[7px] text-pcis-text-muted font-mono">{alert.type.replace(/_/g, ' ')}</span>
                </div>
              </div>
            ))
          ) : (
            (priorityAlerts as IntelFeedItem[]).map((alert: any) => (
              <div key={alert.id} className="px-4 py-2.5 hover:bg-pcis-gold/[0.02] transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="text-[8px] flex-shrink-0" style={{ color: getUrgencyColor(alert.urgency) }}>●</span>
                    <span className="text-[10px] text-white/70 font-medium truncate">{alert.headline}</span>
                  </div>
                  <span className="text-[7px] font-mono uppercase px-1.5 py-[1px] rounded flex-shrink-0 ml-2"
                    style={{ backgroundColor: `${getUrgencyColor(alert.urgency)}15`, color: getUrgencyColor(alert.urgency) }}>
                    {alert.urgency}
                  </span>
                </div>
              </div>
            ))
          )}
          {priorityAlerts.length === 0 && (
            <div className="px-4 py-6 text-center text-[9px] text-pcis-text-muted/40">No active alerts</div>
          )}
        </div>
      </Panel>

      {/* Macro Events -- from live news enrichment */}
      <Panel>
        <PanelHeader title={macroEvents.length > 0 ? 'Live Market Events' : 'Momentum Signals'} accent="#22c55e"
          right={macroEvents.length > 0 ? <span className="text-[7px] text-emerald-500/50 font-mono">NEWS</span> : null} />
        <div className="divide-y divide-pcis-border/10">
          {macroEvents.length > 0 ? (
            macroEvents.map((event, idx) => (
              <div key={idx} className="px-4 py-2.5 hover:bg-pcis-gold/[0.02] transition-colors">
                <div className="text-[9px] text-white/60 leading-relaxed">{event.replace(/^[•\-]\s*/, '')}</div>
              </div>
            ))
          ) : (
            mockMomentumSignals.slice(0, 5).map(sig => (
              <div key={sig.id} className="px-4 py-2.5 hover:bg-pcis-gold/[0.02] transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono" style={{ color: getMomentumColor(sig.type) }}>
                      {getMomentumIcon(sig.type)}
                    </span>
                    <span className="text-[10px] text-white/60">{sig.area}</span>
                  </div>
                  <span className="text-[8px] font-mono" style={{ color: getMomentumColor(sig.type) }}>
                    {sig.change > 0 ? '+' : ''}{sig.change}%
                  </span>
                </div>
                <div className="text-[8px] text-white/40 truncate">{sig.signal}</div>
              </div>
            ))
          )}
        </div>
      </Panel>

      {/* Area Signals -- top movers from real data */}
      <Panel>
        <PanelHeader title="Top Area Signals" accent="#d4a574"
          right={<span className="text-[8px] text-white/30 font-mono">SCOUT</span>} />
        <div className="divide-y divide-pcis-border/10">
          {areaSignals.length > 0 ? (
            areaSignals.map((area, idx) => (
              <div key={idx} className="px-4 py-2.5 hover:bg-pcis-gold/[0.02] transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <DemandRing score={area.demandScore} size={16} strokeWidth={2} />
                    <span className="text-[10px] text-white/60 truncate">{area.areaName}</span>
                  </div>
                  <span className="text-[8px] font-mono" style={{ color: getPriceChangeColor(area.priceChange30d) }}>
                    {area.priceChange30d > 0 ? '+' : ''}{area.priceChange30d.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[8px] text-white/40">AED {area.avgPricePerSqft.toLocaleString()}/sqft</span>
                  <span className="text-[8px] text-white/40">{area.propertyCount.toLocaleString()} listings</span>
                </div>
              </div>
            ))
          ) : (
            mockIntelFeed.slice(0, 5).map(item => (
              <div key={item.id} className="px-4 py-2.5 hover:bg-pcis-gold/[0.02] transition-colors cursor-pointer">
                <div className="text-[10px] text-white/60 truncate">{item.headline}</div>
                <div className="text-[8px] text-white/40 truncate">{item.description}</div>
              </div>
            ))
          )}
        </div>
      </Panel>

      {/* Market Data -- Real area breakdown */}
      <Panel>
        <PanelHeader title="Market Data" accent="#06b6d4"
          right={<button onClick={() => nav.openPanelByType('macro-dashboard', 'tab')} className="text-[9px] text-pcis-gold/50 hover:text-pcis-gold transition-colors">MCR →</button>} />
        <div className="divide-y divide-pcis-border/10">
          {/* Market stats summary */}
          <div className="px-4 py-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[8px] text-pcis-text-muted">Properties</span>
                <div className="text-[11px] font-mono font-semibold text-white/80">{fmt(live.status?.totalProperties || 0)}</div>
              </div>
              <div>
                <span className="text-[8px] text-pcis-text-muted">Opportunities</span>
                <div className="text-[11px] font-mono font-semibold text-cyan-400">{live.status?.totalOpportunities || 0}</div>
              </div>
              <div>
                <span className="text-[8px] text-pcis-text-muted">Anomalies</span>
                <div className="text-[11px] font-mono font-semibold text-red-400">{live.anomalies.length}</div>
              </div>
              <div>
                <span className="text-[8px] text-pcis-text-muted">Last Scrape</span>
                <div className="text-[11px] font-mono font-semibold text-white/60">{live.status?.lastScrapeRun?.completedAt ? ago(live.status.lastScrapeRun.completedAt) : '--'}</div>
              </div>
            </div>
          </div>
          {/* Top Areas micro-bar */}
          <div className="px-4 py-2.5">
            <span className="text-[8px] text-pcis-text-muted uppercase tracking-wider">Top Areas by Demand</span>
            <div className="space-y-1.5 mt-1.5">
              {topAreas.map((area: any) => (
                <div key={area.areaName} className="flex items-center gap-2">
                  <span className="text-[8px] text-white/50 w-28 truncate">{area.areaName}</span>
                  <div className="flex-1 h-[3px] bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full rounded-full" style={{
                      width: `${area.demandScore}%`,
                      backgroundColor: getDemandColor(area.demandScore),
                      opacity: 0.6,
                    }} />
                  </div>
                  <span className="text-[8px] font-mono" style={{ color: getDemandColor(area.demandScore) }}>{area.demandScore}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// SCOUT AGENT CHAT — Conversational Market Intelligence (Already wired)
// ═══════════════════════════════════════════════════════════════════════════

type ChatMsg = { role: 'user' | 'assistant'; content: string }

const SCOUT_QUICK_PROMPTS = [
  'What needs attention today?',
  'Any anomalies in the market?',
  'Which areas are heating up?',
  'Best opportunities right now?',
]

function SCOUTAgentChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const send = useCallback(async (text?: string) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')

    const userMsg: ChatMsg = { role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])
    setLoading(true)

    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
      const res = await p1Api.chatWithSCOUTAgent(msg, history.slice(0, -1))
      const reply = res?.data?.reply || 'Unable to process your request at this time.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. The SCOUT Agent could not be reached.' }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages])

  const hasMessages = messages.length > 0

  return (
    <Panel className="flex flex-col">
      <PanelHeader title="SCOUT Agent" accent="#22d3ee"
        right={
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[8px] text-cyan-400/60 font-mono">ONLINE</span>
          </div>
        } />

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2" style={{ maxHeight: 200, minHeight: 120 }}>
        {!hasMessages ? (
          <div className="h-full flex flex-col items-center justify-center gap-2">
            <div className="text-[10px] text-pcis-text-muted/60 text-center leading-relaxed">
              Ask SCOUT about the Dubai market,<br />areas, anomalies, or opportunities
            </div>
            <div className="flex gap-1.5 flex-wrap justify-center mt-1">
              {SCOUT_QUICK_PROMPTS.map(q => (
                <button key={q} onClick={() => send(q)}
                  className="text-[8px] text-cyan-400/50 border border-cyan-400/15 rounded-full px-2 py-0.5 hover:border-cyan-400/40 hover:text-cyan-400/80 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[90%] text-[9px] leading-relaxed rounded-lg px-2.5 py-1.5 ${
                  m.role === 'user'
                    ? 'bg-cyan-400/10 text-cyan-400/80 border border-cyan-400/20'
                    : 'bg-white/[0.03] text-pcis-text-secondary border border-pcis-border/20'
                }`}>
                  {m.role === 'assistant' && (
                    <span className="text-[7px] text-cyan-400/40 font-mono block mb-0.5">SCOUT AGENT</span>
                  )}
                  <span className="whitespace-pre-wrap">{m.content}</span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/[0.03] border border-pcis-border/20 rounded-lg px-2.5 py-1.5">
                  <span className="text-[7px] text-cyan-400/40 font-mono block mb-0.5">SCOUT AGENT</span>
                  <span className="text-[9px] text-pcis-text-muted/40 animate-pulse">Scanning market data...</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-3 pb-2.5 pt-1 border-t border-pcis-border/10">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            placeholder="Ask the SCOUT Agent..."
            className="flex-1 text-[10px] bg-white/[0.03] border border-pcis-border/20 rounded-lg px-2.5 py-1.5 text-white/70 placeholder:text-pcis-text-muted/30 focus:outline-none focus:border-cyan-400/30 transition-colors"
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="text-[8px] font-mono text-cyan-400/50 hover:text-cyan-400 disabled:text-pcis-text-muted/20 transition-colors px-1.5"
          >
            SEND
          </button>
        </div>
      </div>
    </Panel>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT — E2 SCOUT Power Dashboard
// ═══════════════════════════════════════════════════════════════════════════

export default function SCOUTDashboardView(): React.ReactElement {
  const live = useSCOUTLiveData()

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="flex-1 space-y-4 pb-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-pcis-text tracking-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}>
              Market Intelligence Engine
            </h2>
            <p className="text-[10px] text-pcis-text-muted tracking-wider uppercase mt-0.5">
              E2 · Area Intelligence · Price Tracking · Market Signals · Macro Analysis
            </p>
          </div>
          <div className="flex items-center gap-2">
            {live.isLive && (
              <span className="text-[8px] text-emerald-500/60 font-mono">
                {live.status?.totalProperties?.toLocaleString()} properties · {live.status?.totalAreas} areas
              </span>
            )}
            {live.isLoading && <span className="text-[8px] text-pcis-text-muted/40 font-mono animate-pulse">Loading...</span>}
            <span className="text-[8px] text-pcis-text-muted/40 font-mono">E2-SCOUT</span>
            <div className={`w-2 h-2 rounded-full ${live.isLive ? 'bg-emerald-500/60' : 'bg-yellow-500/60'} animate-pulse`} />
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex-shrink-0 py-2.5 px-4 bg-white/[0.01] border border-pcis-border/20 rounded-lg">
          <SCOUTStatsBar live={live} />
        </div>

        {/* Sub-Panel Gateway Cards */}
        <SCOUTSubPanelCards live={live} />

        {/* Analytics Row */}
        <SCOUTAnalyticsRow live={live} />

        {/* Area Watchlist */}
        <AreaWatchlist live={live} />

        {/* SCOUT Agent Chat */}
        <SCOUTAgentChat />

        {/* Bottom Row */}
        <SCOUTBottomRow live={live} />

        {/* Footer */}
        <div className="text-center text-[8px] text-pcis-text-muted/30 font-mono py-2">
          {live.isLive
            ? `SCOUT tracking ${live.status?.totalAreas || 0} areas · ${live.status?.totalProperties?.toLocaleString() || 0} properties · ${live.anomalies.length} anomalies · Data from Railway PostgreSQL`
            : `Click any panel card to open in workspace · SCOUT tracks ${mockAreaMetrics.length} areas across Dubai in real-time`
          }
        </div>
      </div>
    </div>
  )
}
