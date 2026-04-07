'use client'

import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import {
  ARCHETYPES,
  DIMENSION_META,
  pciscomSignals,
  type CIEClient,
  type Archetype,
} from '@/lib/cieData'
import {
  DEAL_STAGES,
  type EngagementStatus,
  type PredictionPattern,
} from '@/lib/mockData'
import { P1Loading } from '@/components/P1Loading'
import { useCIEClients, useMorningBriefing, useCIEAgentStatus, getCIESourceLabel, getCIESourceColor } from '@/lib/useCIEData'
import { p1Api } from '@/lib/api'
import { useWorkspaceNav, ClientLink } from '../useWorkspaceNav'

// ═══════════════════════════════════════════════════════════════════════════
// E1 CIE POWER DASHBOARD — Unified Client Intelligence Engine
//
// Follows the main DSH layout: StatsBar → SubPanel Cards → Analytics Row →
// Client Watchlist → Bottom Row. Every data point is CIE intelligence.
// This is the showcase of Engine 1's full cognitive profiling power.
// ═══════════════════════════════════════════════════════════════════════════

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

const getArchetypeColor = (archetype: Archetype): string => {
  const config = ARCHETYPES.find(a => a.id === archetype)
  return config?.color || '#D4A574'
}

const getCIEScoreColor = (score: number): string => {
  if (score >= 80) return '#22c55e'
  if (score >= 65) return '#f59e0b'
  if (score >= 50) return '#3b82f6'
  return '#ef4444'
}

const getEngagementColor = (status: string): string => {
  switch (status) {
    case 'thriving': return '#22c55e'
    case 'active': return '#06b6d4'
    case 'cooling': return '#f59e0b'
    case 'cold': return '#ef4444'
    case 'dormant': return '#6b7280'
    default: return '#9ca3af'
  }
}

const getSignalColor = (type: string): string => {
  switch (type) {
    case 'engagement': return '#06b6d4'
    case 'behavioral': return '#d4a574'
    case 'lifecycle': return '#a78bfa'
    case 'market': return '#22c55e'
    case 'risk': return '#ef4444'
    default: return '#9ca3af'
  }
}

// ── CIE Data Context (allows sub-components to access live or mock data) ───

const CIEDataContext = React.createContext<CIEClient[]>([])
function useCIEDataContext() { return React.useContext(CIEDataContext) }

// ── SVG Components ──────────────────────────────────────────────────────

function MiniSparkline({ data, color = '#d4a574', width = 80, height = 24 }: { data: number[]; color?: string; width?: number; height?: number }) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 4) - 2
    return `${x},${y}`
  }).join(' ')
  const gradId = `cie-sp-${Math.random().toString(36).slice(2, 8)}`
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
  const c = color || (score >= 60 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444')
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
// TOP STATS BAR — CIE Intelligence Metrics
// ═══════════════════════════════════════════════════════════════════════════

function CIEStatsBar() {
  const cieClients = useCIEDataContext()

  const { avgCIEScore, atRiskClients, avgEngagement, uhnwCount, totalSignals, totalPredictions } = useMemo(() => {
    let totalCIE = 0
    let atRisk = 0
    let engSum = 0
    let engCount = 0
    let uhnw = 0
    let sigCount = 0
    let predCount = 0

    cieClients.forEach(c => {
      totalCIE += c.overallCIEScore
      if (c.client.type === 'UHNW') uhnw++
      sigCount += c.signalCount || 0
      if (c.prediction) predCount++
      if (c.engagement) {
        engSum += c.engagement.engagementScore || 0
        engCount++
        if (['cooling', 'cold', 'dormant'].includes(c.engagement.status)) atRisk++
      }
    })

    return {
      avgCIEScore: cieClients.length > 0 ? Math.round(totalCIE / cieClients.length) : 0,
      atRiskClients: atRisk,
      avgEngagement: engCount > 0 ? Math.round(engSum / engCount) : 0,
      uhnwCount: uhnw,
      totalSignals: sigCount,
      totalPredictions: predCount,
    }
  }, [cieClients])

  const stats = [
    { label: 'Profiled Clients', value: `${cieClients.length}`, color: '#d4a574' },
    { label: 'UHNW', value: `${uhnwCount}`, color: '#d4a574' },
    { label: 'Avg CIE Score', value: `${avgCIEScore}`, color: getCIEScoreColor(avgCIEScore) },
    { label: 'At Risk', value: `${atRiskClients}`, color: atRiskClients > 0 ? '#ef4444' : '#22c55e' },
    { label: 'Avg Engagement', value: `${avgEngagement}`, color: avgEngagement >= 60 ? '#22c55e' : '#f59e0b' },
    { label: 'Active Predictions', value: `${totalPredictions}`, color: '#f59e0b' },
    { label: 'Signals', value: `${totalSignals}`, color: '#06b6d4' },
    { label: '12 Dimensions', value: 'Active', color: '#a78bfa' },
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
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// ENGINE SUB-PANEL CARDS — Gateway to CIE workspace panels
// ═══════════════════════════════════════════════════════════════════════════

function CIESubPanelCards() {
  const cieClients = useCIEDataContext()
  const nav = useWorkspaceNav()

  const { totalSignals, atRiskCount, thrivingCount, predCount } = useMemo(() => {
    let sigs = 0, atRisk = 0, thriving = 0, preds = 0
    cieClients.forEach(c => {
      sigs += c.signalCount || 0
      if (c.prediction) preds++
      if (c.engagement) {
        if (['cooling', 'cold', 'dormant'].includes(c.engagement.status)) atRisk++
        if (c.engagement.status === 'thriving') thriving++
      }
    })
    return { totalSignals: sigs, atRiskCount: atRisk, thrivingCount: thriving, predCount: preds }
  }, [cieClients])

  const panels = [
    {
      code: 'CIP', title: 'Client Profile',
      desc: '12-dimension cognitive fingerprint for each client with PCISCOM signal integration',
      metric: `${DIMENSION_META.length} dimensions`,
      sub: 'Deep behavioral mapping',
      color: '#06b6d4',
      onClick: () => nav.openCIEProfileList(),
    },
    {
      code: 'CIS', title: 'Signal Feed',
      desc: 'Real-time cognitive signals from WhatsApp, viewings, and behavioral data',
      metric: `${totalSignals} active`,
      sub: `${pciscomSignals.length} PCISCOM signals`,
      color: '#d4a574',
      onClick: () => nav.openCIESignals(),
    },
    {
      code: 'CIC', title: 'Comparator',
      desc: 'Side-by-side multi-client dimension comparison with archetype overlay',
      metric: `${cieClients.length} profiles`,
      sub: `${ARCHETYPES.length} archetypes`,
      color: '#22c55e',
      onClick: () => nav.openCIEComparator(),
    },
    {
      code: 'CIE', title: 'Engagement',
      desc: 'Client engagement heatmap, at-risk detection, and momentum tracking',
      metric: `${atRiskCount} at risk`,
      sub: `${thrivingCount} thriving`,
      color: '#ef4444',
      onClick: () => nav.openCIEEngagement(),
    },
    {
      code: 'CIF', title: 'Predictions',
      desc: '7-pattern prediction engine with confidence scoring and timeline forecasts',
      metric: `${predCount} active`,
      sub: 'AI-driven forecasts',
      color: '#f59e0b',
      onClick: () => nav.openCIEPredictions(),
    },
    {
      code: 'C36', title: 'Client DNA',
      desc: 'Single-page intelligence brief: archetype, cognitive traits, do\'s/don\'ts, meeting prep',
      metric: `${cieClients.length} profiles`,
      sub: 'Advisor cheat sheet',
      color: '#a78bfa',
      onClick: () => nav.openClient360AsTab(cieClients[0]?.client.id || ''),
    },
    {
      code: 'CIM', title: 'Client Map',
      desc: 'Global client map with archetype markers, CIE score rings, and connection arcs to HQ',
      metric: `${cieClients.length} plotted`,
      sub: 'MapLibre GL powered',
      color: '#14B8A6',
      onClick: () => nav.openCIEMap(),
    },
    {
      code: 'CIG', title: 'Client Grid',
      desc: 'Spreadsheet-style sortable view with all CIE dimensions and intelligence columns',
      metric: `${cieClients.length} rows`,
      sub: 'Sort by any column',
      color: '#8B5CF6',
      onClick: () => nav.openCIEGrid(),
    },
    {
      code: 'CIPL', title: 'CIE Pipeline',
      desc: 'Kanban deal pipeline with cognitive intelligence overlays per client card',
      metric: `${DEAL_STAGES.length} stages`,
      sub: 'Drag to reposition',
      color: '#F97316',
      onClick: () => nav.openCIEPipeline(),
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
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
// CIE AGENT CHAT — Conversational intelligence interface
// ═══════════════════════════════════════════════════════════════════════════

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

const QUICK_PROMPTS = [
  'Who needs attention today?',
  'Any risk signals?',
  'Portfolio summary',
]

function CIEAgentChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [sessionId] = useState(() => `cie-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`)
  const [memoryInfo, setMemoryInfo] = useState<{ conversationCount: number; hasMemory: boolean } | null>(null)
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
      const res = await p1Api.chatWithCIEAgent(msg, history.slice(0, -1), sessionId)
      const reply = res?.data?.reply || 'Unable to process your request at this time.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
      if (res?.data?.memory) {
        setMemoryInfo(res.data.memory)
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. The CIE Agent could not be reached.' }])
    } finally {
      setLoading(false)
    }
  }, [input, loading, messages, sessionId])

  const hasMessages = messages.length > 0

  return (
    <Panel className="flex flex-col">
      <PanelHeader title="CIE Agent" accent="#d4a574"
        right={
          <div className="flex items-center gap-1.5">
            {memoryInfo?.hasMemory && (
              <span className="text-[7px] text-pcis-gold/40 font-mono mr-1">{memoryInfo.conversationCount} memories</span>
            )}
            <div className="w-1.5 h-1.5 rounded-full bg-pcis-gold animate-pulse" />
            <span className="text-[8px] text-pcis-gold/60 font-mono">ONLINE</span>
          </div>
        } />

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2" style={{ maxHeight: 140, minHeight: 100 }}>
        {!hasMessages ? (
          <div className="h-full flex flex-col items-center justify-center gap-2">
            <div className="text-[10px] text-pcis-text-muted/60 text-center leading-relaxed">
              Ask your CIE Agent about clients,<br />profiles, risks, or strategies
            </div>
            <div className="flex gap-1.5 flex-wrap justify-center mt-1">
              {QUICK_PROMPTS.map(q => (
                <button key={q} onClick={() => send(q)}
                  className="text-[8px] text-pcis-gold/50 border border-pcis-gold/15 rounded-full px-2 py-0.5 hover:border-pcis-gold/40 hover:text-pcis-gold/80 transition-colors">
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
                    ? 'bg-pcis-gold/10 text-pcis-gold/80 border border-pcis-gold/20'
                    : 'bg-white/[0.03] text-pcis-text-secondary border border-pcis-border/20'
                }`}>
                  {m.role === 'assistant' && (
                    <span className="text-[7px] text-pcis-gold/40 font-mono block mb-0.5">CIE AGENT</span>
                  )}
                  <span className="whitespace-pre-wrap">{m.content}</span>
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white/[0.03] border border-pcis-border/20 rounded-lg px-2.5 py-1.5">
                  <span className="text-[7px] text-pcis-gold/40 font-mono block mb-0.5">CIE AGENT</span>
                  <span className="text-[9px] text-pcis-text-muted/40 animate-pulse">Analysing...</span>
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
            placeholder="Ask the CIE Agent..."
            className="flex-1 text-[10px] bg-white/[0.03] border border-pcis-border/20 rounded-lg px-2.5 py-1.5 text-white/70 placeholder:text-pcis-text-muted/30 focus:outline-none focus:border-pcis-gold/30 transition-colors"
          />
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="text-[8px] font-mono text-pcis-gold/50 hover:text-pcis-gold disabled:text-pcis-text-muted/20 transition-colors px-1.5"
          >
            SEND
          </button>
        </div>
      </div>
    </Panel>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// ANALYTICS ROW — Archetype Distribution, CIE Agent Chat, CIE Trend
// ═══════════════════════════════════════════════════════════════════════════

function CIEAnalyticsRow() {
  const cieClients = useCIEDataContext()

  // Compute breakdowns from live data
  const { archetypeBreakdown, engagementBreakdown } = useMemo(() => {
    const ab: Record<Archetype, number> = { decisive: 0, analytical: 0, cautious: 0, impulsive: 0, balanced: 0 }
    const eb: Record<EngagementStatus, number> = { thriving: 0, active: 0, cooling: 0, cold: 0, dormant: 0 }
    cieClients.forEach(c => {
      ab[c.archetype]++
      if (c.engagement) eb[c.engagement.status]++
    })
    return { archetypeBreakdown: ab, engagementBreakdown: eb }
  }, [cieClients])

  // Archetype donut data
  const archetypeDonut = ARCHETYPES
    .filter(a => archetypeBreakdown[a.id] > 0)
    .map(a => ({ label: a.label, value: archetypeBreakdown[a.id], color: a.color }))

  // Engagement donut data
  const engagementDonut = (['thriving', 'active', 'cooling', 'cold', 'dormant'] as EngagementStatus[])
    .filter(s => engagementBreakdown[s] > 0)
    .map(s => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: engagementBreakdown[s], color: getEngagementColor(s) }))

  // CIE score distribution for trend sparkline
  const scoreDistribution = useMemo(() => {
    const sorted = [...cieClients].sort((a, b) => a.overallCIEScore - b.overallCIEScore)
    return sorted.map(c => c.overallCIEScore)
  }, [cieClients])

  // Dimension strength heatmap (avg across all clients)
  const dimensionAvgs = useMemo(() => {
    return DIMENSION_META.map(dim => {
      const values = cieClients
        .filter(c => c.profile)
        .map(c => {
          const score = c.profile!.scores.find(s => s.dimension === dim.name)
          return score?.value ?? 50
        })
      const avg = values.length > 0 ? Math.round(values.reduce((s, v) => s + v, 0) / values.length) : 50
      return { ...dim, avg }
    })
  }, [cieClients])

  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Archetype Distribution */}
      <Panel>
        <PanelHeader title="Archetype Distribution" accent="#d4a574" />
        <div className="px-4 py-4 flex items-center gap-4">
          <DonutChart data={archetypeDonut} size={80} strokeWidth={10} />
          <div className="flex-1">
            <div className="flex flex-col gap-1.5">
              {archetypeDonut.map(d => (
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

      {/* CIE Agent Dialogue */}
      <CIEAgentChat />

      {/* Dimension Intelligence Map */}
      <Panel>
        <PanelHeader title="Dimension Intelligence" accent="#a78bfa" />
        <div className="px-4 py-3">
          <div className="grid grid-cols-4 gap-x-3 gap-y-1.5">
            {dimensionAvgs.map(dim => (
              <div key={dim.shortCode} className="group">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[8px] text-white/50 font-mono">{dim.shortCode}</span>
                  <span className="text-[8px] font-mono font-semibold" style={{ color: dim.avg >= 70 ? '#22c55e' : dim.avg >= 50 ? '#f59e0b' : '#3b82f6' }}>
                    {dim.avg}
                  </span>
                </div>
                <div className="h-[3px] bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{
                    width: `${dim.avg}%`,
                    backgroundColor: dim.avg >= 70 ? '#22c55e' : dim.avg >= 50 ? '#f59e0b' : '#3b82f6',
                    opacity: 0.6,
                  }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2 border-t border-pcis-border/10">
            <div className="flex items-center gap-2">
              <span className="text-[8px] text-pcis-text-muted">CIE Score Curve</span>
              <MiniSparkline data={scoreDistribution} color="#d4a574" width={120} height={20} />
            </div>
          </div>
        </div>
      </Panel>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// CIE CLIENT WATCHLIST — Power table with cognitive data
// ═══════════════════════════════════════════════════════════════════════════

function CIEWatchlist() {
  const cieClients = useCIEDataContext()
  const nav = useWorkspaceNav()

  const list = useMemo(() => {
    return [...cieClients]
      .sort((a, b) => {
        // Priority: at-risk first, then by CIE score desc
        const aRisk = ['cooling', 'cold', 'dormant'].includes(a.engagement?.status || '') ? 50 : 0
        const bRisk = ['cooling', 'cold', 'dormant'].includes(b.engagement?.status || '') ? 50 : 0
        const aScore = (a.prediction ? a.prediction.confidence : 0) + aRisk + a.overallCIEScore * 0.3
        const bScore = (b.prediction ? b.prediction.confidence : 0) + bRisk + b.overallCIEScore * 0.3
        return bScore - aScore
      })
      .slice(0, 12)
  }, [cieClients])

  return (
    <Panel>
      <PanelHeader title="CIE Client Watchlist" accent="#06b6d4"
        right={
          <button onClick={() => nav.openCIEEngagement()} className="text-[9px] text-pcis-gold/50 hover:text-pcis-gold transition-colors">
            Full engagement →
          </button>
        } />
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="text-pcis-text-muted text-[8px] uppercase tracking-wider border-b border-pcis-border/10">
              <th className="text-left py-2 px-4 font-normal">Client</th>
              <th className="text-center py-2 px-2 font-normal">CIE</th>
              <th className="text-left py-2 px-2 font-normal">Archetype</th>
              <th className="text-left py-2 px-2 font-normal">Top Dimension</th>
              <th className="text-center py-2 px-2 font-normal">Engagement</th>
              <th className="text-center py-2 px-2 font-normal">Momentum</th>
              <th className="text-left py-2 px-2 font-normal">Prediction</th>
              <th className="text-center py-2 px-2 font-normal">Readiness</th>
              <th className="text-right py-2 px-4 font-normal">Signals</th>
            </tr>
          </thead>
          <tbody>
            {list.map(cie => {
              const topDim = cie.topDimensions[0]
              const dimMeta = topDim ? DIMENSION_META.find(d => d.name === topDim.dimension) : null
              const archConfig = ARCHETYPES.find(a => a.id === cie.archetype)

              return (
                <tr key={cie.client.id}
                  className="border-b border-pcis-border/10 hover:bg-pcis-gold/[0.03] cursor-pointer transition-colors"
                  onClick={() => nav.openCIEProfile(cie.client.id)}>
                  <td className="py-2 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: getEngagementColor(cie.engagement?.status || 'dormant') }} />
                      <ClientLink clientId={cie.client.id} className="text-white/70 font-medium no-underline hover:text-pcis-gold">
                        {cie.client.name}
                      </ClientLink>
                      {cie.client.type === 'UHNW' && (
                        <span className="text-[7px] font-mono font-semibold text-pcis-gold bg-pcis-gold/10 px-1 py-[1px] rounded">UHNW</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-2 text-center">
                    <span className="text-[10px] font-mono font-bold" style={{ color: getCIEScoreColor(cie.overallCIEScore) }}>
                      {cie.overallCIEScore}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: `${archConfig?.color || '#D4A574'}20`, color: archConfig?.color || '#D4A574' }}>
                      {archConfig?.label || 'Balanced'}
                    </span>
                  </td>
                  <td className="py-2 px-2">
                    {topDim && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[8px] text-white/50 font-mono">{dimMeta?.shortCode || '??'}</span>
                        <div className="w-10 h-[3px] bg-white/[0.04] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${topDim.value}%`,
                            backgroundColor: getArchetypeColor(cie.archetype),
                            opacity: 0.7,
                          }} />
                        </div>
                        <span className="text-[8px] font-mono text-white/60">{topDim.value}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center">
                    {cie.engagement && (
                      <span className="text-[9px] font-medium" style={{ color: getEngagementColor(cie.engagement.status) }}>
                        {cie.engagement.status.charAt(0).toUpperCase() + cie.engagement.status.slice(1)}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2 text-center">
                    {cie.engagement && (
                      <span className="text-[9px] font-mono" style={{
                        color: cie.engagement.momentum === 'heating' ? '#22c55e' : cie.engagement.momentum === 'cooling' ? '#ef4444' : '#f59e0b'
                      }}>
                        {cie.engagement.momentum === 'heating' ? '▲' : cie.engagement.momentum === 'cooling' ? '▼' : '→'}
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-2">
                    {cie.prediction ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-white/40 text-[8px]">{cie.prediction.pattern}</span>
                        <span className="text-[7px] font-mono px-1 py-[1px] rounded"
                          style={{
                            backgroundColor: cie.prediction.confidence >= 75 ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.08)',
                            color: cie.prediction.confidence >= 75 ? '#22c55e' : '#f59e0b'
                          }}>
                          {cie.prediction.confidence}%
                        </span>
                      </div>
                    ) : <span className="text-pcis-text-muted/30">—</span>}
                  </td>
                  <td className="py-2 px-2">
                    <div className="flex items-center justify-center">
                      {cie.engagement ? (
                        <DemandRing score={Math.round(cie.engagement.readinessScore * 100)} size={22} strokeWidth={2} />
                      ) : <span className="text-pcis-text-muted/30">—</span>}
                    </div>
                  </td>
                  <td className="py-2 px-4 text-right">
                    <span className="text-[9px] font-mono text-pcis-text-secondary">{cie.signalCount}</span>
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
// BOTTOM ROW — At-Risk, Hot Predictions, Latest Signals, PCISCOM Feed
// ═══════════════════════════════════════════════════════════════════════════

function CIEBottomRow() {
  const cieClients = useCIEDataContext()
  const nav = useWorkspaceNav()

  // At-risk clients
  const atRisk = useMemo(() =>
    cieClients
      .filter(c => ['cooling', 'cold', 'dormant'].includes(c.engagement?.status || ''))
      .sort((a, b) => {
        const order = { dormant: 0, cold: 1, cooling: 2 }
        return (order[a.engagement?.status as keyof typeof order] ?? 3) - (order[b.engagement?.status as keyof typeof order] ?? 3)
      })
      .slice(0, 5),
  [cieClients])

  // Hot predictions
  const hotPreds = useMemo(() =>
    cieClients
      .filter(c => c.prediction && c.prediction.confidence >= 60)
      .sort((a, b) => (b.prediction?.confidence || 0) - (a.prediction?.confidence || 0))
      .slice(0, 5),
  [cieClients])

  // Latest signals
  const latestSignals = useMemo(() =>
    ([] as any[])
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5),
  [])

  // PCISCOM feed
  const pciscomFeed = useMemo(() =>
    pciscomSignals
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5),
  [])

  return (
    <div className="grid grid-cols-4 gap-3">
      {/* At-Risk Clients */}
      <Panel>
        <PanelHeader title="At-Risk Clients" accent="#ef4444"
          right={<button onClick={() => nav.openCIEEngagement()} className="text-[9px] text-pcis-gold/50 hover:text-pcis-gold transition-colors">CIE →</button>} />
        <div className="divide-y divide-pcis-border/10">
          {atRisk.map(cie => (
            <div key={cie.client.id}
              className="px-4 py-2.5 hover:bg-pcis-gold/[0.02] transition-colors cursor-pointer"
              onClick={() => nav.openCIEProfile(cie.client.id)}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: getEngagementColor(cie.engagement?.status || 'dormant') }} />
                  <span className="text-[10px] text-white/70 font-medium">{cie.client.name}</span>
                </div>
                <span className="text-[8px] font-mono font-bold" style={{ color: getCIEScoreColor(cie.overallCIEScore) }}>
                  {cie.overallCIEScore}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-medium uppercase" style={{ color: getEngagementColor(cie.engagement?.status || 'dormant') }}>
                  {cie.engagement?.status}
                </span>
                <span className="text-[7px] text-pcis-text-muted/50">·</span>
                <span className="text-[8px] text-pcis-text-muted">
                  {ARCHETYPES.find(a => a.id === cie.archetype)?.label}
                </span>
              </div>
            </div>
          ))}
          {atRisk.length === 0 && (
            <div className="px-4 py-6 text-center text-[9px] text-pcis-text-muted/40">No at-risk clients</div>
          )}
        </div>
      </Panel>

      {/* Hot Predictions */}
      <Panel>
        <PanelHeader title="Hot Predictions" accent="#f59e0b"
          right={<button onClick={() => nav.openCIEPredictions()} className="text-[9px] text-pcis-gold/50 hover:text-pcis-gold transition-colors">CIF →</button>} />
        <div className="divide-y divide-pcis-border/10">
          {hotPreds.map(cie => (
            <div key={cie.client.id}
              className="px-4 py-2.5 hover:bg-pcis-gold/[0.02] transition-colors cursor-pointer"
              onClick={() => nav.openCIEProfile(cie.client.id)}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-white/60">{cie.client.name}</span>
                <span className="text-[8px] font-mono px-1.5 py-[1px] rounded"
                  style={{
                    backgroundColor: (cie.prediction?.confidence || 0) >= 75 ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.08)',
                    color: (cie.prediction?.confidence || 0) >= 75 ? '#22c55e' : '#f59e0b',
                  }}>
                  {cie.prediction?.confidence}%
                </span>
              </div>
              <div className="text-[8px] text-white/40">{cie.prediction?.pattern}</div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Latest Signals */}
      <Panel>
        <PanelHeader title="Latest Signals" accent="#06b6d4"
          right={<button onClick={() => nav.openCIESignals()} className="text-[9px] text-pcis-gold/50 hover:text-pcis-gold transition-colors">CIS →</button>} />
        <div className="divide-y divide-pcis-border/10">
          {latestSignals.map((sig, i) => {
            const client = cieClients.find(c => c.client.id === sig.clientId)
            return (
              <div key={`${sig.clientId}-${i}`}
                className="px-4 py-2.5 hover:bg-pcis-gold/[0.02] transition-colors cursor-pointer"
                onClick={() => nav.openCIEProfile(sig.clientId)}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getSignalColor(sig.type) }} />
                    <span className="text-[10px] text-white/60">{client?.client.name || 'Unknown'}</span>
                  </div>
                  <span className="text-[7px] text-pcis-text-muted font-mono">{ago(sig.timestamp)}</span>
                </div>
                <div className="text-[8px] text-white/40 truncate">{sig.content}</div>
              </div>
            )
          })}
        </div>
      </Panel>

      {/* PCISCOM WhatsApp Feed */}
      <Panel>
        <PanelHeader title="PCISCOM Feed" accent="#25D366"
          right={<span className="text-[8px] text-white/30 font-mono">WhatsApp</span>} />
        <div className="divide-y divide-pcis-border/10">
          {pciscomFeed.map((sig, i) => {
            const client = cieClients.find(c => c.client.id === sig.clientId)
            return (
              <div key={sig.messageId}
                className="px-4 py-2.5 hover:bg-pcis-gold/[0.02] transition-colors cursor-pointer"
                onClick={() => nav.openCIEProfile(sig.clientId)}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-white/60">{client?.client.name || 'Unknown'}</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[7px] font-mono" style={{
                      color: sig.sentiment >= 0.5 ? '#22c55e' : sig.sentiment >= 0 ? '#f59e0b' : '#ef4444'
                    }}>
                      {sig.sentiment >= 0.5 ? '+' : ''}{sig.sentiment.toFixed(1)}
                    </span>
                    <span className="text-[7px] text-pcis-text-muted font-mono">{ago(sig.timestamp)}</span>
                  </div>
                </div>
                <div className="text-[8px] text-white/50 mb-1">{sig.intent.replace(/_/g, ' ')}</div>
                <div className="flex gap-1">
                  {sig.dimensionImpacts.map((impact, j) => {
                    const dimMeta = DIMENSION_META.find(d => d.name === impact.dimension)
                    return (
                      <span key={j} className="text-[7px] font-mono px-1 py-[1px] rounded bg-white/[0.04]"
                        style={{ color: impact.delta > 0 ? '#22c55e' : '#ef4444' }}>
                        {dimMeta?.shortCode || '??'} {impact.delta > 0 ? '+' : ''}{impact.delta}
                      </span>
                    )
                  })}
                </div>
              </div>
            )
          })}
          {pciscomFeed.length === 0 && (
            <div className="px-4 py-6 text-center text-[9px] text-pcis-text-muted/40">Awaiting PCISCOM signals</div>
          )}
        </div>
      </Panel>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXPORT — E1 CIE Power Dashboard
// ═══════════════════════════════════════════════════════════════════════════

export default function CIEDashboardView(): React.ReactElement {
  // ── Live Data Hook: replaces mock cieClients with real backend data ────
  const liveData = useCIEClients()
  const agentStatus = useCIEAgentStatus()
  const cieClients = liveData.data || []
  const dataSource = liveData.source

  if (liveData.loading && cieClients.length === 0) {
    return <P1Loading message="Loading CIE intelligence..." />
  }

  return (
    <CIEDataContext.Provider value={cieClients}>
    <div className="h-full flex flex-col overflow-y-auto">
      <div className="flex-1 space-y-4 pb-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-pcis-text tracking-tight"
              style={{ fontFamily: "'Playfair Display', serif" }}>
              Client Intelligence Engine
            </h2>
            <p className="text-[10px] text-pcis-text-muted tracking-wider uppercase mt-0.5">
              E1 · Cognitive Profiling · Behavioral Intelligence · Predictive Analytics
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Data Source Badge */}
            <span className="text-[8px] font-mono px-2 py-0.5 rounded-full border"
              style={{
                color: getCIESourceColor(dataSource),
                borderColor: getCIESourceColor(dataSource) + '40',
                backgroundColor: getCIESourceColor(dataSource) + '10',
              }}>
              {getCIESourceLabel(dataSource)}
            </span>
            {agentStatus.data?.lastRunAt && (
              <span className="text-[8px] text-pcis-text-muted/40 font-mono">
                Last run: {ago(agentStatus.data.lastRunAt)}
              </span>
            )}
            <span className="text-[8px] text-pcis-text-muted/40 font-mono">E1-CIE</span>
            <div className="w-2 h-2 rounded-full animate-pulse"
              style={{ backgroundColor: dataSource === 'live' ? '#10B981' : '#F59E0B' }} />
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex-shrink-0 py-2.5 px-4 bg-white/[0.01] border border-pcis-border/20 rounded-lg">
          <CIEStatsBar />
        </div>

        {/* Sub-Panel Gateway Cards */}
        <CIESubPanelCards />

        {/* Analytics Row */}
        <CIEAnalyticsRow />

        {/* Client Watchlist */}
        <CIEWatchlist />

        {/* Bottom Row */}
        <CIEBottomRow />

        {/* Footer Hint */}
        <div className="text-center text-[8px] text-pcis-text-muted/30 font-mono py-2">
          {dataSource === 'live'
            ? 'Connected to CIE Agent · Profiles computed from Copper CRM via GPT-4o-mini · Narratives by Claude'
            : 'Click any panel card to open in workspace · Connect Copper CRM to activate live CIE profiling'
          }
        </div>
      </div>
    </div>
    </CIEDataContext.Provider>
  )
}
