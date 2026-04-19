'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useWorkspaceSafe, PanelType } from '@/components/workspace/WorkspaceProvider'
import { usePlatformKey } from '@/lib/platform'
import { useCIEClients } from '@/lib/useCIEData'
import { useAdvisorDashboard } from '@/lib/useForgeData'
import { useScoutAreas } from '@/lib/useScoutData'
import {
  useV2MorningBrief,
  useV2ProactiveTriggers,
  useV2OpportunityQueue,
  useV2QueueStats,
  useV2HealthScore,
  useV2Dashboard,
  useV2BrokerIntelligence,
  useV2WeeklyReport,
  useV2QualityGaps,
  useV2QualityHistory,
  useV2ForgeMetrics,
  useV2ConversionMetrics,
  useV2PortfolioHealth,
  v2MarkBriefViewed,
  type V2OpportunityItem,
  type V2ProactiveTrigger,
  type V2BriefAlert,
} from '@/lib/useV2Data'
import {
  clients,
  properties,
  engagementMetrics,
  recommendations,
  matchStages,
  areaMetrics,
  intelFeed,
  macroIndicators,
  momentumSignals,
  nextTouches,
  marketMetrics,
  DEAL_STAGES,
  dealStageColors,
  type EngagementStatus,
  type DealStage,
} from '@/lib/mockData'

const DashboardBriefOrb = dynamic(() => import('@/components/DashboardBriefOrb'), { ssr: false })


// ═══════════════════════════════════════════════════════════════════════════
// PCIS DASHBOARD v2.1 — V2 Backend Wired
//
// Three views: Today (action surface), Operations (engine overview),
// This Week (review + analytics). All powered by V2 endpoints.
// ═══════════════════════════════════════════════════════════════════════════


// ── Formatting ──────────────────────────────────────────────────────────
const fmt = (n: number) =>
  n >= 1e9 ? `${(n / 1e9).toFixed(1)}B` : n >= 1e6 ? `${(n / 1e6).toFixed(0)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(0)}K` : `${n}`
const fmtPrice = (n: number) => `AED ${fmt(n)}`

const ago = (ts: string) => {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (m < 1) return 'now'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

const statusMap: Record<EngagementStatus, { color: string; label: string }> = {
  thriving: { color: '#22c55e', label: 'Thriving' },
  active: { color: '#06b6d4', label: 'Active' },
  cooling: { color: '#f59e0b', label: 'Cooling' },
  cold: { color: '#ef4444', label: 'Cold' },
  dormant: { color: '#6b7280', label: 'Dormant' },
}

const engineDefs = [
  { id: 'E1', label: 'CIE', name: 'Client Intelligence', route: '/clients', panelType: 'cie-dashboard' as PanelType, color: '#06b6d4', key: '1' },
  { id: 'E2', label: 'SCOUT', name: 'Market Intelligence', route: '/intel', panelType: 'scout-dashboard' as PanelType, color: '#d4a574', key: '2' },
  { id: 'E3', label: 'ENGINE', name: 'Matching Engine', route: '/matches', panelType: 'engine-dashboard' as PanelType, color: '#22c55e', key: '3' },
  { id: 'E4', label: 'FORGE', name: 'AI Advisor', route: '/recommendations', panelType: 'forge-dashboard' as PanelType, color: '#a78bfa', key: '4' },
]

type DashboardView = 'today' | 'operations' | 'week'


// ═══════════════════════════════════════════════════════════════════════════
// SVG COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

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
  const gradId = `s${Math.random().toString(36).slice(2, 8)}`
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

function HealthRing({ score, size = 48 }: { score: number; size?: number }) {
  const sw = 4
  const r = (size - sw) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize="12" fontWeight="bold" fontFamily="monospace">{score}</text>
    </svg>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

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

function SeverityDot({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: '#ef4444',
    high: '#f59e0b',
    medium: '#06b6d4',
    low: '#6b7280',
  }
  return <div className="w-[6px] h-[6px] rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: colors[severity] || '#6b7280' }} />
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    critical: { bg: 'bg-red-500/[0.08]', text: 'text-red-400/80' },
    high: { bg: 'bg-amber-500/[0.08]', text: 'text-amber-400/80' },
    medium: { bg: 'bg-cyan-500/[0.08]', text: 'text-cyan-400/80' },
    low: { bg: 'bg-gray-500/[0.08]', text: 'text-gray-400/80' },
  }
  const c = colors[severity] || colors.low
  return (
    <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded ${c.bg} ${c.text}`}>
      {severity}
    </span>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-4 py-8 text-center">
      <div className="w-2 h-2 rounded-full bg-pcis-gold/20 mx-auto mb-2" />
      <span className="text-[10px] text-pcis-text-muted/40">{message}</span>
    </div>
  )
}

function LoadingPulse() {
  return (
    <div className="px-4 py-6 text-center">
      <div className="w-1.5 h-1.5 rounded-full bg-pcis-gold animate-pulse mx-auto mb-2" />
      <span className="text-[9px] text-white/30">Loading...</span>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// COMMAND PALETTE (⌘K)
// ═══════════════════════════════════════════════════════════════════════════

function CmdPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [sel, setSel] = useState(0)
  const pk = usePlatformKey()

  useEffect(() => { if (open) { setQ(''); setSel(0); setTimeout(() => ref.current?.focus(), 30) } }, [open])

  const workspacePanels = useMemo(() => [
    { tag: 'CID', label: 'CIE Dashboard', sub: 'E1 · Client profiles, archetypes, engagement', route: '/workspace' },
    { tag: 'CIP', label: 'CIE Profile', sub: 'E1 · Deep-dive 12-dimension cognitive profile', route: '/workspace' },
    { tag: 'CIS', label: 'CIE Signals', sub: 'E1 · Real-time behavioural signals & PCISCOM', route: '/workspace' },
    { tag: 'SCT', label: 'SCOUT Dashboard', sub: 'E2 · Market intelligence hub', route: '/workspace' },
    { tag: 'ARE', label: 'Area Intelligence', sub: 'E2 · Area demand, price, yield metrics', route: '/workspace' },
    { tag: 'TXN', label: 'Transaction Feed', sub: 'E2 · Live DLD transaction data', route: '/workspace' },
    { tag: 'ENG', label: 'ENGINE Dashboard', sub: 'E3 · Matching command centre', route: '/workspace' },
    { tag: 'EPM', label: 'Purpose Matrix', sub: 'E3 · Client-to-purpose mapping', route: '/workspace' },
    { tag: 'FDH', label: 'FORGE Command Centre', sub: 'E4 · Pipeline intelligence dashboard', route: '/workspace' },
    { tag: 'FDR', label: 'Deal Room', sub: 'E4 · AI deal intelligence briefs', route: '/workspace' },
    { tag: 'FMP', label: 'Meeting Prep', sub: 'E4 · CIE-driven tactical briefings', route: '/workspace' },
    { tag: 'C36', label: 'Client 360', sub: 'Cross · All engines unified per client', route: '/workspace' },
  ], [])

  const results = useMemo(() => {
    if (!q.trim()) {
      const defaults = engineDefs.map(e => ({ label: e.name, sub: `${e.label} engine`, route: e.route, tag: e.id }))
      return [...defaults, ...workspacePanels.slice(0, 4)]
    }
    const l = q.toLowerCase()
    const u = q.toUpperCase()
    const r: { label: string; sub: string; route: string; tag: string }[] = []
    const goExact = workspacePanels.find(p => p.tag.toUpperCase() === u)
    if (goExact) r.push(goExact)
    workspacePanels.forEach(p => {
      if (p.tag.toUpperCase() !== u && p.tag.toUpperCase().startsWith(u) && q.length >= 2) r.push(p)
    })
    workspacePanels.forEach(p => {
      if (!r.find(x => x.tag === p.tag) && (p.label.toLowerCase().includes(l) || p.sub.toLowerCase().includes(l))) r.push(p)
    })
    clients.forEach(c => {
      if (c.name.toLowerCase().includes(l))
        r.push({ label: c.name, sub: `${c.type} · ${c.category} · ${c.location}`, route: `/clients?id=${c.id}`, tag: c.initials })
    })
    engineDefs.forEach(e => {
      if (e.name.toLowerCase().includes(l) || e.label.toLowerCase().includes(l))
        r.push({ label: e.name, sub: `${e.label} engine`, route: e.route, tag: e.id })
    })
    return r.slice(0, 12)
  }, [q, workspacePanels])

  useEffect(() => { setSel(0) }, [results.length])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[200]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="absolute top-[16%] left-1/2 -translate-x-1/2 w-[520px] bg-pcis-card border border-pcis-gold/20 rounded-xl shadow-2xl overflow-hidden backdrop-blur-xl"
        style={{ boxShadow: '0 25px 80px -20px rgba(212,165,116,0.12)' }}
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center border-b border-pcis-border/30 px-4 py-3 gap-3">
          <span className="text-pcis-gold/40 text-[10px] font-mono">{pk('⌘K')}</span>
          <input ref={ref} value={q} onChange={e => setQ(e.target.value)}
            placeholder="GO code, panel name, client, or property..."
            className="flex-1 bg-transparent text-white/80 text-[12px] outline-none placeholder:text-pcis-text-muted/50"
            onKeyDown={e => {
              if (e.key === 'Escape') onClose()
              if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, results.length - 1)) }
              if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)) }
              if (e.key === 'Enter' && results[sel]) { router.push(results[sel].route); onClose() }
            }} />
        </div>
        <div className="max-h-[320px] overflow-y-auto">
          {results.map((r, i) => (
            <button key={`${r.route}-${i}`}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors text-xs
                ${i === sel ? 'bg-pcis-gold/[0.06] border-l-2 border-pcis-gold/30' : 'hover:bg-white/[0.03] border-l-2 border-transparent'}`}
              onClick={() => { router.push(r.route); onClose() }}
              onMouseEnter={() => setSel(i)}>
              <span className="w-7 text-center text-[9px] font-mono font-bold text-pcis-text-muted">{r.tag}</span>
              <div className="flex-1 min-w-0">
                <div className="text-white/80 truncate">{r.label}</div>
                <div className="text-pcis-text-muted text-[9px] truncate">{r.sub}</div>
              </div>
              {i === sel && <span className="text-pcis-gold/30 text-[9px] font-mono">↵</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// NEWS FEED (stays as-is — RSS-sourced market news)
// ═══════════════════════════════════════════════════════════════════════════

interface NewsItem { id: string; title: string; link: string; source: string; publishedAt: string; category: string }
const NEWS_CAT_COLORS: Record<string, string> = { 'real-estate': '#22c55e', 'financial': '#06b6d4', 'development': '#a78bfa', 'regulatory': '#f59e0b', 'market': '#ec4899' }
const NEWS_CAT_SHORT: Record<string, string> = { 'real-estate': 'RE', 'financial': 'FIN', 'development': 'DEV', 'regulatory': 'REG', 'market': 'MKT' }

function LatestNewsFeed({ limit = 3 }: { limit?: number }) {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const ws = useWorkspaceSafe()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/news?limit=${limit}`)
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setNews(data.articles || [])
      } catch { /* silent */ }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    const interval = setInterval(load, 5 * 60 * 1000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [limit])

  return (
    <Panel>
      <PanelHeader title="Market News" accent="#22c55e"
        right={<button onClick={() => ws?.openPanel?.('news-feed' as PanelType, 'tab')} className="text-[8px] text-pcis-gold/50 hover:text-pcis-gold font-mono uppercase tracking-wider transition-colors">NWS →</button>} />
      <div className="divide-y divide-pcis-border/10">
        {loading ? <LoadingPulse /> : news.length === 0 ? <EmptyState message="No news available" /> : (
          news.map(item => {
            const catColor = NEWS_CAT_COLORS[item.category] || '#9ca3af'
            const catShort = NEWS_CAT_SHORT[item.category] || '?'
            return (
              <a key={item.id} href={item.link} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-2.5 px-4 py-2 hover:bg-white/[0.02] transition-colors group">
                <div className="w-1 h-full min-h-[24px] rounded-full mt-0.5 shrink-0" style={{ backgroundColor: catColor, opacity: 0.5 }} />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-medium text-white/70 leading-snug line-clamp-2 group-hover:text-pcis-gold transition-colors">{item.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[7px] font-mono font-bold" style={{ color: catColor }}>{catShort}</span>
                    <span className="text-[7px] text-white/20">{item.source}</span>
                    <span className="text-[7px] text-white/15 font-mono">{ago(item.publishedAt)}</span>
                  </div>
                </div>
              </a>
            )
          })
        )}
      </div>
    </Panel>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// TODAY VIEW — Action surface powered by V2
// ═══════════════════════════════════════════════════════════════════════════

function TodayView() {
  const morningBrief = useV2MorningBrief()
  const triggers = useV2ProactiveTriggers({ status: 'active', limit: 20 })
  const queue = useV2OpportunityQueue({ limit: 10 })
  const queueStats = useV2QueueStats()
  const healthScore = useV2HealthScore()

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'long' }).toUpperCase()

  // Mark brief as viewed on first render
  useEffect(() => {
    if (morningBrief.data?.id && !morningBrief.data.viewedAt) {
      v2MarkBriefViewed(morningBrief.data.id)
    }
  }, [morningBrief.data?.id, morningBrief.data?.viewedAt])

  const brief = morningBrief.data
  const meetings = brief?.sections?.meetings || []
  const alerts = brief?.sections?.clientAlerts || []
  const opportunities = brief?.sections?.opportunities || []
  const followUps = brief?.sections?.followUps || []
  const pipeline = brief?.sections?.pipelineHealth

  const totalBriefActions = meetings.length + alerts.length + opportunities.length + followUps.length

  return (
    <div className="space-y-4">

      {/* ── Greeting + Quick Stats ──────────────────────────── */}
      <div>
        <p className="text-[10px] tracking-[0.2em] text-pcis-gold/50 mb-1">{dateStr}</p>
        <h1 className="text-3xl text-white/90 mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
          {greeting}
        </h1>
        <p className="text-[11px] text-pcis-text-muted">
          {totalBriefActions > 0 ? `${totalBriefActions} items today` : 'Loading intelligence...'}
          {meetings.length > 0 && ` · ${meetings.length} meetings`}
          {alerts.filter(a => a.severity === 'critical').length > 0 && ` · ${alerts.filter(a => a.severity === 'critical').length} critical alerts`}
        </p>
      </div>

      {/* ── Quick Stats Bar ────────────────────────────────── */}
      <div className="flex items-center gap-4">
        {healthScore.data && (
          <div className="flex items-center gap-2">
            <HealthRing score={healthScore.data.overall} size={36} />
            <div>
              <div className="text-[9px] text-pcis-text-muted">FORGE Health</div>
              <div className="text-[10px] font-mono" style={{ color: healthScore.data.overall >= 70 ? '#22c55e' : '#f59e0b' }}>
                {healthScore.data.trend}
              </div>
            </div>
          </div>
        )}
        {queueStats.data && (
          <>
            <div className="w-px h-6 bg-pcis-border/20" />
            <div className="text-center">
              <div className="text-[14px] font-mono font-bold text-pcis-gold">{queueStats.data.total}</div>
              <div className="text-[8px] text-pcis-text-muted uppercase">Actions</div>
            </div>
            {queueStats.data.bySeverity?.critical > 0 && (
              <div className="text-center">
                <div className="text-[14px] font-mono font-bold text-red-400">{queueStats.data.bySeverity.critical}</div>
                <div className="text-[8px] text-pcis-text-muted uppercase">Critical</div>
              </div>
            )}
            <div className="text-center">
              <div className="text-[14px] font-mono font-bold text-green-400">{queueStats.data.actedToday}</div>
              <div className="text-[8px] text-pcis-text-muted uppercase">Done Today</div>
            </div>
          </>
        )}
        {pipeline && (
          <>
            <div className="w-px h-6 bg-pcis-border/20" />
            <div className="text-center">
              <div className="text-[14px] font-mono font-bold text-pcis-gold">{pipeline.totalActive}</div>
              <div className="text-[8px] text-pcis-text-muted uppercase">Pipeline</div>
            </div>
            {pipeline.atRiskDeals > 0 && (
              <div className="text-center">
                <div className="text-[14px] font-mono font-bold text-red-400">{pipeline.atRiskDeals}</div>
                <div className="text-[8px] text-pcis-text-muted uppercase">At Risk</div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Opportunity Queue (primary action surface) ──── */}
      <Panel>
        <PanelHeader title="Priority Actions" accent="#ef4444"
          right={<span className="text-[9px] font-mono text-pcis-text-muted/40">Scored & ranked by V2</span>} />
        <div className="divide-y divide-pcis-border/10">
          {queue.loading ? <LoadingPulse /> :
           !queue.data || queue.data.length === 0 ? <EmptyState message="No priority actions — all clear" /> :
           queue.data.slice(0, 8).map((item: V2OpportunityItem) => (
            <div key={item.id} className="px-4 py-3 hover:bg-pcis-gold/[0.02] transition-colors cursor-pointer group">
              <div className="flex items-start gap-3">
                <SeverityDot severity={item.severity} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[11px] text-white/70 font-medium truncate">{item.title}</span>
                    <SeverityBadge severity={item.severity} />
                  </div>
                  <p className="text-[10px] text-pcis-text-muted leading-snug truncate">{item.description}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    {item.clientName && <span className="text-[9px] text-pcis-gold/60">{item.clientName}</span>}
                    <span className="text-[8px] text-pcis-text-muted/40 font-mono">{item.type}</span>
                    <span className="text-[8px] text-pcis-text-muted/30 font-mono">{ago(item.createdAt)}</span>
                    <span className="text-[8px] font-mono text-pcis-gold/40">Score: {item.score}</span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); queue.act(item.id, 'acted') }}
                  className="text-[8px] font-mono uppercase tracking-wider px-2.5 py-1.5 rounded-lg border border-pcis-gold/15 text-pcis-gold/50 hover:text-pcis-gold hover:bg-pcis-gold/[0.06] hover:border-pcis-gold/30 transition-all opacity-0 group-hover:opacity-100"
                >
                  Act
                </button>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* ── Two-column: While You Slept + Meetings ────── */}
      <div className="grid grid-cols-2 gap-3">

        {/* While you slept — V2 proactive intelligence */}
        <Panel>
          <PanelHeader title="While You Slept" accent="#a78bfa"
            right={
              <span className="text-[8px] font-mono text-pcis-text-muted/30">
                {triggers.data?.length || 0} triggers
              </span>
            } />
          <div className="divide-y divide-pcis-border/10">
            {triggers.loading ? <LoadingPulse /> :
             !triggers.data || triggers.data.length === 0 ? <EmptyState message="No overnight triggers" /> :
             triggers.data.slice(0, 6).map((t: V2ProactiveTrigger) => (
              <div key={t.id} className="px-4 py-2.5 hover:bg-pcis-gold/[0.02] transition-colors">
                <div className="flex items-start gap-2.5">
                  <SeverityDot severity={t.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-white/60 leading-snug truncate">{t.title}</div>
                    <div className="text-[9px] text-pcis-text-muted mt-0.5 truncate">{t.description}</div>
                    <div className="flex items-center gap-2 mt-1">
                      {t.clientName && <span className="text-[8px] text-pcis-gold/50">{t.clientName}</span>}
                      <span className="text-[7px] font-mono text-pcis-text-muted/30">{t.triggerType.replace(/_/g, ' ')}</span>
                      <span className="text-[7px] text-pcis-text-muted/20 font-mono">{ago(t.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Today's meetings from morning brief */}
        <div className="space-y-3">
          <Panel>
            <PanelHeader title="Today's Meetings" accent="#06b6d4" />
            <div className="divide-y divide-pcis-border/10">
              {morningBrief.loading ? <LoadingPulse /> :
               meetings.length === 0 ? <EmptyState message="No meetings scheduled" /> :
               meetings.map((m, i) => (
                <div key={i} className="px-4 py-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[9px] font-mono text-pcis-gold/60">
                      {new Date(m.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-[10px] text-white/70">{m.clientName}</span>
                    <span className="text-[8px] text-pcis-text-muted capitalize">{m.type}</span>
                  </div>
                  {m.prepNotes && <p className="text-[9px] text-pcis-text-muted leading-snug">{m.prepNotes}</p>}
                </div>
              ))}
            </div>
          </Panel>

          {/* Client alerts from morning brief */}
          {alerts.length > 0 && (
            <Panel>
              <PanelHeader title="Client Alerts" accent="#ef4444" />
              <div className="divide-y divide-pcis-border/10">
                {alerts.slice(0, 4).map((a: V2BriefAlert, i: number) => (
                  <div key={i} className="px-4 py-2 flex items-start gap-2.5">
                    <SeverityDot severity={a.severity} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] text-white/60 truncate">{a.clientName}</div>
                      <div className="text-[9px] text-pcis-text-muted truncate">{a.message}</div>
                    </div>
                    {a.daysSinceContact && (
                      <span className="text-[8px] font-mono text-red-400/50">{a.daysSinceContact}d silent</span>
                    )}
                  </div>
                ))}
              </div>
            </Panel>
          )}
        </div>
      </div>

      {/* ── Market News (existing RSS) ─────────────────── */}
      <LatestNewsFeed limit={5} />
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// OPERATIONS VIEW — Engine overview (rewired to V2 where possible)
// ═══════════════════════════════════════════════════════════════════════════

function OperationsView() {
  const router = useRouter()
  const ws = useWorkspaceSafe()
  const cieClients = useCIEClients()
  const scoutAreas = useScoutAreas()
  const advisorDashboard = useAdvisorDashboard()
  const v2Health = useV2HealthScore()
  const v2ForgeMetrics = useV2ForgeMetrics()
  const v2Queue = useV2OpportunityQueue({ limit: 5 })
  const v2Triggers = useV2ProactiveTriggers({ status: 'active', limit: 5 })

  // ── Engine Cards with V2 metrics ────────────────────
  const engStats = useMemo(() => ({
    E1: {
      metric: `${cieClients.data?.length || 0} profiles`,
      sub: `Avg CIE: ${cieClients.data && cieClients.data.length > 0 ? Math.round(cieClients.data.reduce((s, c) => s + (c.overallCIEScore || 0), 0) / cieClients.data.length) : 0}`,
    },
    E2: {
      metric: `${scoutAreas.data?.length || 0} areas`,
      sub: `${scoutAreas.data?.length || 0} areas tracked`,
    },
    E3: {
      metric: `${advisorDashboard.data?.topMatches?.length || 0} active`,
      sub: `${advisorDashboard.data?.overview?.highScoringUnpresentedMatches || 0} unpresented`,
    },
    E4: {
      metric: v2ForgeMetrics.data ? `${v2ForgeMetrics.data.actionRate}% action rate` : `${advisorDashboard.data?.overview?.pendingAlerts || 0} alerts`,
      sub: v2Health.data ? `Health: ${v2Health.data.overall}/100` : `${advisorDashboard.data?.overview?.urgentRecommendations || 0} recommendations`,
    },
  }), [cieClients.data, scoutAreas.data, advisorDashboard.data, v2ForgeMetrics.data, v2Health.data])

  const handleEngineClick = useCallback((e: typeof engineDefs[number]) => {
    ws ? ws.openPanel(e.panelType, 'tab') : router.push(e.route)
  }, [ws, router])

  // ── Portfolio Health ────────────────────────────────
  const portfolioData = useMemo(() => {
    const dist: Record<EngagementStatus, number> = { thriving: 0, active: 0, cooling: 0, cold: 0, dormant: 0 }
    engagementMetrics.forEach(e => dist[e.status]++)
    const pipeline: Record<DealStage, number> = { 'Lead In': 0, 'Discovery': 0, 'Viewing': 0, 'Offer Made': 0, 'Negotiation': 0, 'Closed Won': 0 }
    clients.forEach(c => pipeline[c.dealStage]++)
    return { dist, pipeline }
  }, [])

  const donutData = (['thriving', 'active', 'cooling', 'cold', 'dormant'] as EngagementStatus[])
    .filter(s => portfolioData.dist[s] > 0)
    .map(s => ({ label: statusMap[s].label, value: portfolioData.dist[s], color: statusMap[s].color }))
  const pipelineMax = Math.max(...DEAL_STAGES.map(s => portfolioData.pipeline[s]), 1)

  const gradeColors: Record<string, string> = { 'A+': '#d4a574', 'A': '#22c55e', 'B+': '#3b82f6', 'B': '#9ca3af', 'C': '#ef4444', 'D': '#6b7280' }

  return (
    <div className="space-y-4">

      {/* ── Top Stats ─────────────────────────────────── */}
      <div className="flex items-center gap-6 text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="text-pcis-text-muted">Clients:</span>
          <span className="font-semibold text-pcis-gold" style={{ fontFamily: "'Playfair Display', serif" }}>{cieClients.data?.length || 0}</span>
        </div>
        <div className="w-px h-3 bg-pcis-border/30" />
        <div className="flex items-center gap-1.5">
          <span className="text-pcis-text-muted">UHNW:</span>
          <span className="font-mono font-semibold text-pcis-gold">{cieClients.data?.filter(c => c.client.type === 'UHNW').length || 0}</span>
        </div>
        <div className="w-px h-3 bg-pcis-border/30" />
        <div className="flex items-center gap-1.5">
          <span className="text-pcis-text-muted">Active Deals:</span>
          <span className="font-mono font-semibold" style={{ color: '#22c55e' }}>{cieClients.data?.filter(c => ['Viewing', 'Offer Made', 'Negotiation'].includes(c.client.dealStage)).length || 0}</span>
        </div>
        {v2Health.data && (
          <>
            <div className="w-px h-3 bg-pcis-border/30" />
            <div className="flex items-center gap-1.5">
              <span className="text-pcis-text-muted">FORGE:</span>
              <span className="font-mono font-semibold" style={{ color: v2Health.data.overall >= 70 ? '#22c55e' : '#f59e0b' }}>{v2Health.data.overall}/100</span>
            </div>
          </>
        )}
        {v2ForgeMetrics.data && (
          <>
            <div className="w-px h-3 bg-pcis-border/30" />
            <div className="flex items-center gap-1.5">
              <span className="text-pcis-text-muted">Action Rate:</span>
              <span className="font-mono font-semibold" style={{ color: '#a78bfa' }}>{v2ForgeMetrics.data.actionRate}%</span>
            </div>
          </>
        )}
      </div>

      {/* ── Engine Gateway Cards ───────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {engineDefs.map(e => (
          <Panel key={e.id} onClick={() => handleEngineClick(e)} className="group hover:border-opacity-50 transition-all">
            <div className="px-4 py-3.5">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color, opacity: 0.6 }} />
                  <span className="text-[10px] font-mono font-bold" style={{ color: e.color }}>{e.id}</span>
                </div>
                <kbd className="text-[8px] font-mono text-pcis-text-muted/40 group-hover:text-pcis-text-muted transition-colors">{e.key}</kbd>
              </div>
              <div className="text-[13px] font-semibold text-white/80 mb-0.5" style={{ fontFamily: "'Playfair Display', serif" }}>{e.name}</div>
              <div className="text-[10px] text-pcis-text-secondary font-mono">{engStats[e.id as keyof typeof engStats].metric}</div>
              <div className="text-[9px] text-pcis-text-muted mt-0.5">{engStats[e.id as keyof typeof engStats].sub}</div>
            </div>
          </Panel>
        ))}
      </div>

      {/* ── Portfolio Health + Pipeline + News ──────────── */}
      <div className="grid grid-cols-3 gap-3">
        <Panel>
          <PanelHeader title="Portfolio Health" accent="#06b6d4" />
          <div className="px-4 py-4 flex items-center gap-4">
            <DonutChart data={donutData} size={80} strokeWidth={10} />
            <div className="flex-1">
              <div className="flex flex-col gap-1.5">
                {donutData.map(d => (
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

        <Panel>
          <PanelHeader title="Deal Pipeline" accent="#22c55e" />
          <div className="px-4 py-4">
            <div className="flex items-end gap-2 h-[64px]">
              {DEAL_STAGES.map(stage => {
                const h = Math.max(4, (portfolioData.pipeline[stage] / pipelineMax) * 56)
                return (
                  <div key={stage} className="flex-1 flex flex-col items-center justify-end">
                    <span className="text-[8px] font-mono mb-1" style={{ color: dealStageColors[stage] }}>{portfolioData.pipeline[stage]}</span>
                    <div className="w-full rounded-t" style={{ height: h, background: `linear-gradient(to top, ${dealStageColors[stage]}, ${dealStageColors[stage]}60)` }} />
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2 mt-2">
              {DEAL_STAGES.map(stage => (
                <div key={stage} className="flex-1 text-center text-[7px] text-pcis-text-muted uppercase tracking-wide">{stage.split(' ').map(w => w[0]).join('')}</div>
              ))}
            </div>
          </div>
        </Panel>

        <LatestNewsFeed limit={3} />
      </div>

      {/* ── Client Watchlist ────────────────────────────── */}
      <Panel>
        <PanelHeader title="Client Watchlist" accent="#06b6d4"
          right={<button onClick={() => router.push('/clients')} className="text-[9px] text-pcis-gold/50 hover:text-pcis-gold transition-colors">View all →</button>} />
        <div className="overflow-x-auto">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="text-pcis-text-muted text-[8px] uppercase tracking-wider border-b border-pcis-border/10">
                <th className="text-left py-2 px-4 font-normal">Client</th>
                <th className="text-left py-2 px-2 font-normal">Type</th>
                <th className="text-center py-2 px-2 font-normal">Engagement</th>
                <th className="text-left py-2 px-2 font-normal">Stage</th>
                <th className="text-left py-2 px-2 font-normal">Top Dimension</th>
                <th className="text-center py-2 px-2 font-normal">Triggers</th>
              </tr>
            </thead>
            <tbody>
              {(cieClients.data || []).sort((a, b) => b.overallCIEScore - a.overallCIEScore).slice(0, 10).map(({ client, overallCIEScore: score, topDimensions }) => {
                // Check if this client has active triggers
                const clientTriggers = v2Triggers.data?.filter(t => t.clientId === client.id) || []
                return (
                  <tr key={client.id}
                    className="border-b border-pcis-border/10 hover:bg-pcis-gold/[0.03] cursor-pointer transition-colors"
                    onClick={() => router.push(`/clients?id=${client.id}`)}>
                    <td className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-[5px] h-[5px] rounded-full bg-pcis-gold/40" />
                        <span className="text-white/70 font-medium">{client.name}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded ${client.type === 'UHNW' ? 'text-pcis-gold bg-pcis-gold/10' : 'text-pcis-text-muted bg-white/[0.03]'}`}>{client.type}</span>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-1.5 justify-center">
                        <div className="w-12 h-[4px] bg-white/[0.04] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${score}%`, backgroundColor: score >= 60 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444' }} />
                        </div>
                        <span className="text-[9px] font-mono" style={{ color: score >= 60 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444' }}>{score}</span>
                      </div>
                    </td>
                    <td className="py-2 px-2">
                      <span className="text-[9px]" style={{ color: dealStageColors[client.dealStage] }}>{client.dealStage}</span>
                    </td>
                    <td className="py-2 px-2">
                      <span className="text-white/40 text-[9px]">{topDimensions?.[0]?.dimension || '—'}</span>
                    </td>
                    <td className="py-2 px-2 text-center">
                      {clientTriggers.length > 0 ? (
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-red-500/[0.08] text-red-400/70">{clientTriggers.length}</span>
                      ) : (
                        <span className="text-[9px] text-pcis-text-muted/30">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* ── Bottom: V2 Queue + Triggers + Intel + Market ── */}
      <div className="grid grid-cols-4 gap-3">

        {/* V2 Opportunity Queue */}
        <Panel>
          <PanelHeader title="Action Queue" accent="#ef4444"
            right={<span className="text-[8px] text-pcis-gold/50 font-mono">V2</span>} />
          <div className="divide-y divide-pcis-border/10">
            {v2Queue.loading ? <LoadingPulse /> :
             !v2Queue.data || v2Queue.data.length === 0 ? <EmptyState message="Queue clear" /> :
             v2Queue.data.slice(0, 5).map(item => (
              <div key={item.id} className="px-4 py-2.5 hover:bg-pcis-gold/[0.02] transition-colors cursor-pointer">
                <div className="flex items-start gap-2">
                  <SeverityDot severity={item.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-white/60 truncate leading-snug">{item.title}</div>
                    <div className="text-[9px] text-pcis-text-muted mt-0.5">{item.clientName || item.type} · {ago(item.createdAt)}</div>
                  </div>
                  <SeverityBadge severity={item.severity} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* V2 Proactive Triggers */}
        <Panel>
          <PanelHeader title="Active Triggers" accent="#a78bfa"
            right={<span className="text-[8px] text-pcis-gold/50 font-mono">V2</span>} />
          <div className="divide-y divide-pcis-border/10">
            {v2Triggers.loading ? <LoadingPulse /> :
             !v2Triggers.data || v2Triggers.data.length === 0 ? <EmptyState message="No active triggers" /> :
             v2Triggers.data.slice(0, 5).map(t => (
              <div key={t.id} className="px-4 py-2.5 hover:bg-pcis-gold/[0.02] transition-colors cursor-pointer">
                <div className="flex items-start gap-2">
                  <SeverityDot severity={t.severity} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-white/60 truncate leading-snug">{t.title}</div>
                    <div className="text-[9px] text-pcis-text-muted mt-0.5">{t.clientName || t.triggerType.replace(/_/g, ' ')} · {ago(t.createdAt)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Market Intel (from SCOUT) */}
        <Panel>
          <PanelHeader title="Market Intel" accent="#d4a574"
            right={<button onClick={() => ws ? ws.openPanel('scout-dashboard', 'tab') : router.push('/intel')} className="text-[9px] text-pcis-gold/50 hover:text-pcis-gold transition-colors">SCOUT →</button>} />
          <div className="divide-y divide-pcis-border/10">
            {intelFeed.slice(0, 4).map(item => (
              <div key={item.id} className="px-4 py-2.5 hover:bg-pcis-gold/[0.02] transition-colors cursor-pointer" onClick={() => ws ? ws.openPanel('scout-dashboard', 'tab') : router.push('/intel')}>
                <div className="flex gap-2.5">
                  <div className="w-[3px] flex-shrink-0 rounded-full self-stretch"
                    style={{ backgroundColor: item.urgency === 'High' ? '#ef4444' : item.urgency === 'Medium' ? '#d4a574' : '#6b7280' }} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] text-white/50 leading-snug truncate">{item.headline}</div>
                    <div className="text-[8px] text-pcis-text-muted mt-1">{item.type} · {ago(item.timestamp)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Market Data */}
        <Panel>
          <PanelHeader title="Market Data" />
          <div className="divide-y divide-pcis-border/10">
            {macroIndicators.slice(0, 5).map(m => (
              <div key={m.id} className="px-4 py-2 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-[9px] text-pcis-text-muted truncate block">{m.label}</span>
                </div>
                <MiniSparkline data={m.sparkline} color={m.trend >= 0 ? '#22c55e' : '#ef4444'} width={40} height={14} />
                <span className="text-[10px] font-mono text-white/50 w-16 text-right flex-shrink-0">{m.value}</span>
                <span className="text-[9px] font-mono w-10 text-right flex-shrink-0" style={{ color: m.trend >= 0 ? '#22c55e' : '#ef4444' }}>
                  {m.trend >= 0 ? '+' : ''}{m.trend}%
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Morning Brief Orb */}
      <DashboardBriefOrb />
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// THIS WEEK VIEW — Review + Analytics powered by V2
// ═══════════════════════════════════════════════════════════════════════════

function WeekView() {
  const weeklyReport = useV2WeeklyReport()
  const qualityGaps = useV2QualityGaps()
  const qualityHistory = useV2QualityHistory('weekly')
  const brokerIntel = useV2BrokerIntelligence()
  const forgeMetrics = useV2ForgeMetrics()
  const v2Health = useV2HealthScore()

  const report = weeklyReport.data

  return (
    <div className="space-y-4">

      {/* ── Header ──────────────────────────────────────── */}
      <div>
        <h2 className="text-xl text-white/90 mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>
          This Week
        </h2>
        <p className="text-[11px] text-pcis-text-muted">
          {report ? `Week of ${new Date(report.weekStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} — ${new Date(report.weekEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : 'Loading weekly synthesis...'}
        </p>
      </div>

      {/* ── Executive Summary ──────────────────────────── */}
      {report?.executiveSummary && (
        <Panel>
          <PanelHeader title="Executive Summary" accent="#d4a574" />
          <div className="px-4 py-4">
            <p className="text-[11px] text-white/60 leading-relaxed">{report.executiveSummary}</p>
          </div>
        </Panel>
      )}

      {/* ── Key Metrics Grid ──────────────────────────── */}
      <div className="grid grid-cols-4 gap-3">
        {v2Health.data && (
          <Panel>
            <div className="px-4 py-4 text-center">
              <HealthRing score={v2Health.data.overall} size={56} />
              <div className="text-[9px] text-pcis-text-muted mt-2 uppercase tracking-wider">FORGE Health</div>
              <div className="text-[10px] font-mono mt-1" style={{ color: v2Health.data.overall >= 70 ? '#22c55e' : '#f59e0b' }}>
                {v2Health.data.trend}
              </div>
            </div>
          </Panel>
        )}
        {forgeMetrics.data && (
          <>
            <Panel>
              <div className="px-4 py-4 text-center">
                <div className="text-2xl font-light text-pcis-gold" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {forgeMetrics.data.totalInteractions}
                </div>
                <div className="text-[9px] text-pcis-text-muted mt-1 uppercase tracking-wider">Total Outputs</div>
                <div className="text-[10px] font-mono text-white/40 mt-1">
                  Avg quality: {forgeMetrics.data.avgQualityScore?.toFixed(1) || '—'}
                </div>
              </div>
            </Panel>
            <Panel>
              <div className="px-4 py-4 text-center">
                <div className="text-2xl font-light" style={{ fontFamily: "'Playfair Display', serif", color: '#22c55e' }}>
                  {forgeMetrics.data.actionRate}%
                </div>
                <div className="text-[9px] text-pcis-text-muted mt-1 uppercase tracking-wider">Action Rate</div>
                <div className="text-[10px] font-mono text-white/40 mt-1">
                  Outputs acted on
                </div>
              </div>
            </Panel>
          </>
        )}
        {brokerIntel.data?.benchmarks && (
          <Panel>
            <div className="px-4 py-4 text-center">
              <div className="text-2xl font-light text-pcis-gold" style={{ fontFamily: "'Playfair Display', serif" }}>
                #{brokerIntel.data.benchmarks.rank}
              </div>
              <div className="text-[9px] text-pcis-text-muted mt-1 uppercase tracking-wider">Your Rank</div>
              <div className="text-[10px] font-mono text-white/40 mt-1">
                of {brokerIntel.data.benchmarks.totalBrokers} brokers
              </div>
            </div>
          </Panel>
        )}
      </div>

      {/* ── Two-column: Quality Gaps + Broker Intelligence ── */}
      <div className="grid grid-cols-2 gap-3">

        {/* Quality Gaps */}
        <Panel>
          <PanelHeader title="Quality Gaps" accent="#ef4444" />
          <div className="divide-y divide-pcis-border/10">
            {qualityGaps.loading ? <LoadingPulse /> :
             !qualityGaps.data || qualityGaps.data.length === 0 ? <EmptyState message="No quality gaps detected" /> :
             qualityGaps.data.slice(0, 6).map((gap, i) => (
              <div key={i} className="px-4 py-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-white/60">{gap.dimension}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-red-400/60">{gap.currentScore.toFixed(1)}</span>
                    <span className="text-[8px] text-pcis-text-muted">→</span>
                    <span className="text-[9px] font-mono text-green-400/60">{gap.bestInClass.toFixed(1)}</span>
                  </div>
                </div>
                <div className="w-full h-[3px] bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-red-500/60 to-amber-500/60"
                    style={{ width: `${(gap.currentScore / gap.bestInClass) * 100}%` }} />
                </div>
                {gap.recommendation && (
                  <p className="text-[8px] text-pcis-text-muted mt-1 truncate">{gap.recommendation}</p>
                )}
              </div>
            ))}
          </div>
        </Panel>

        {/* Broker Intelligence */}
        <Panel>
          <PanelHeader title="Your Intelligence" accent="#a78bfa" />
          <div className="px-4 py-4 space-y-4">
            {brokerIntel.loading ? <LoadingPulse /> :
             !brokerIntel.data ? <EmptyState message="Intelligence not computed yet" /> : (
              <>
                {/* Workflow Patterns */}
                {brokerIntel.data.workflowPatterns && (
                  <div>
                    <div className="text-[9px] text-pcis-text-muted uppercase tracking-wider mb-2">Workflow Patterns</div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-white/[0.02] rounded-lg px-3 py-2">
                        <div className="text-[8px] text-pcis-text-muted">Avg Session</div>
                        <div className="text-[11px] font-mono text-white/60">{brokerIntel.data.workflowPatterns.avgSessionMinutes}min</div>
                      </div>
                      <div className="bg-white/[0.02] rounded-lg px-3 py-2">
                        <div className="text-[8px] text-pcis-text-muted">Peak Hours</div>
                        <div className="text-[11px] font-mono text-white/60">
                          {brokerIntel.data.workflowPatterns.peakHours?.slice(0, 2).map(h => `${h}:00`).join(', ') || '—'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Neglected Clients */}
                {brokerIntel.data.clientPortfolio?.neglectedClients?.length > 0 && (
                  <div>
                    <div className="text-[9px] text-pcis-text-muted uppercase tracking-wider mb-2">
                      Neglected Clients ({brokerIntel.data.clientPortfolio.neglectedClients.length})
                    </div>
                    <div className="space-y-1.5">
                      {brokerIntel.data.clientPortfolio.neglectedClients.slice(0, 4).map((c, i) => (
                        <div key={i} className="flex items-center gap-2 text-[10px]">
                          <div className="w-[5px] h-[5px] rounded-full bg-red-500/50" />
                          <span className="text-white/50 flex-1 truncate">{c.clientName}</span>
                          <span className="font-mono text-red-400/60 text-[9px]">{c.daysSinceContact}d</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggestions */}
                {brokerIntel.data.suggestions?.length > 0 && (
                  <div>
                    <div className="text-[9px] text-pcis-text-muted uppercase tracking-wider mb-2">AI Suggestions</div>
                    <div className="space-y-1.5">
                      {brokerIntel.data.suggestions.slice(0, 3).map((s, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div className="w-1 h-1 rounded-full bg-pcis-gold/40 mt-1.5 flex-shrink-0" />
                          <p className="text-[9px] text-white/40 leading-snug">{s}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </Panel>
      </div>

      {/* ── Quality Trend Chart ────────────────────────── */}
      {qualityHistory.data && qualityHistory.data.length > 1 && (
        <Panel>
          <PanelHeader title="Quality Trend" accent="#22c55e" />
          <div className="px-4 py-4">
            <MiniSparkline
              data={qualityHistory.data.map(h => h.overall)}
              color="#22c55e"
              width={600}
              height={48}
            />
            <div className="flex justify-between mt-2">
              <span className="text-[8px] text-pcis-text-muted font-mono">
                {new Date(qualityHistory.data[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              <span className="text-[8px] text-pcis-text-muted font-mono">
                {new Date(qualityHistory.data[qualityHistory.data.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            </div>
          </div>
        </Panel>
      )}

      {/* ── FORGE Output Types Breakdown ───────────────── */}
      {forgeMetrics.data?.topOutputTypes && forgeMetrics.data.topOutputTypes.length > 0 && (
        <Panel>
          <PanelHeader title="Output Performance" accent="#d4a574" />
          <div className="px-4 py-3">
            <div className="grid grid-cols-2 gap-2">
              {forgeMetrics.data.topOutputTypes.slice(0, 6).map((t, i) => (
                <div key={i} className="flex items-center gap-3 py-1.5">
                  <span className="text-[10px] text-white/50 flex-1 truncate capitalize">{t.type.replace(/_/g, ' ')}</span>
                  <span className="text-[9px] font-mono text-pcis-gold/60">{t.count}</span>
                  <div className="w-8 h-[3px] bg-white/[0.04] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-pcis-gold/40" style={{ width: `${Math.min(100, (t.avgQuality / 10) * 100)}%` }} />
                  </div>
                  <span className="text-[8px] font-mono text-white/30">{t.avgQuality?.toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      )}
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE — View Switcher
// ═══════════════════════════════════════════════════════════════════════════

export default function DashboardPage() {
  const [view, setView] = useState<DashboardView>('today')
  const [cmdOpen, setCmdOpen] = useState(false)
  const router = useRouter()
  const ws = useWorkspaceSafe()
  const pk = usePlatformKey()

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setCmdOpen(p => !p); return }
      if (e.key === 'Escape') { setCmdOpen(false); return }
      if (!cmdOpen && !e.metaKey && !e.ctrlKey && !e.altKey) {
        const eng = engineDefs.find(en => en.key === e.key)
        if (eng) {
          ws ? ws.openPanel(eng.panelType, 'tab') : router.push(eng.route)
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [cmdOpen, router, ws])

  const views: { id: DashboardView; label: string; icon: string }[] = [
    { id: 'today', label: 'Today', icon: '◉' },
    { id: 'operations', label: 'Operations', icon: '⊞' },
    { id: 'week', label: 'This Week', icon: '▦' },
  ]

  return (
    <div className="space-y-4">

      {/* ── View Switcher + Search ────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1 bg-white/[0.02] border border-pcis-border/20 rounded-lg p-0.5">
          {views.map(v => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                view === v.id
                  ? 'bg-pcis-gold/10 text-pcis-gold border border-pcis-gold/20'
                  : 'text-pcis-text-muted hover:text-pcis-text-secondary hover:bg-white/[0.02] border border-transparent'
              }`}
            >
              <span className="text-[10px]">{v.icon}</span>
              {v.label}
            </button>
          ))}
        </div>
        <button onClick={() => setCmdOpen(true)}
          className="flex items-center gap-2 text-[10px] text-pcis-text-muted hover:text-pcis-text-secondary transition-colors">
          <span>Search</span>
          <span className="text-pcis-gold/30 bg-pcis-gold/[0.05] px-1.5 py-0.5 rounded border border-pcis-gold/10 text-[8px] font-mono">{pk('⌘K')}</span>
        </button>
      </div>

      {/* ── Active View ──────────────────────────────── */}
      {view === 'today' && <TodayView />}
      {view === 'operations' && <OperationsView />}
      {view === 'week' && <WeekView />}

      {/* ── Footer ───────────────────────────────────── */}
      <div className="flex items-center justify-center gap-4 text-[8px] text-pcis-text-muted/30 font-mono pb-2">
        <span>Press 1-4 for engines</span>
        <span>·</span>
        <span>{pk('⌘K')} search</span>
        <span>·</span>
        <span>PCIS V2.1</span>
      </div>

      <CmdPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  )
}
