'use client'

import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { useWorkspaceSafe, PanelType } from '@/components/workspace/WorkspaceProvider'
import { usePlatformKey } from '@/lib/platform'
import {
  clients,
  engagementMetrics,
  matches,
  matchStages,
  properties,
  recommendations,
  predictions,
  signals,
  areaMetrics,
  intelFeed,
  macroIndicators,
  momentumSignals,
  advisorPerformance,
  nextTouches,
  marketMetrics,
  DEAL_STAGES,
  dealStageColors,
  type EngagementStatus,
  type DealStage,
} from '@/lib/mockData'

const DashboardBriefOrb = dynamic(() => import('@/components/DashboardBriefOrb'), { ssr: false })


// ═══════════════════════════════════════════════════════════════════════════
// PCIS DASHBOARD v8 — PCIS-Styled Software Dashboard
//
// Renders inside AppLayout (Sidebar + Header + Dubai skyline already exist).
// Uses the REAL PCIS design tokens: glassy cards, gold accents, Playfair serif.
// Software-dense layout with SVG charts. Keyboard-first.
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
  { id: 'E4', label: 'OUTPUT', name: 'Advisor Actions', route: '/recommendations', panelType: 'forge-dashboard' as PanelType, color: '#a78bfa', key: '4' },
]


// ═══════════════════════════════════════════════════════════════════════════
// SVG COMPONENTS — matching existing PCIS page patterns
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

function DemandRing({ score, size = 36, strokeWidth = 3 }: { score: number; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 60 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444'
  return (
    <svg width={size} height={size}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        fill={color} fontSize="9" fontWeight="bold" fontFamily="monospace">{score}</text>
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

  // Workspace panel definitions for GO-code navigation
  const workspacePanels = useMemo(() => [
    // CIE Intelligence
    { tag: 'CID', label: 'CIE Dashboard', sub: 'E1 · Client profiles, archetypes, engagement', route: '/workspace' },
    { tag: 'CIP', label: 'CIE Profile', sub: 'E1 · Deep-dive 12-dimension cognitive profile', route: '/workspace' },
    { tag: 'CIS', label: 'CIE Signals', sub: 'E1 · Real-time behavioural signals & PCISCOM', route: '/workspace' },
    { tag: 'CIC', label: 'Client Comparator', sub: 'E1 · Side-by-side dimension comparison', route: '/workspace' },
    { tag: 'CIE', label: 'Engagement Intel', sub: 'E1 · Decay tracking, momentum analysis', route: '/workspace' },
    { tag: 'CIF', label: 'Prediction Engine', sub: 'E1 · AI-predicted behaviour patterns', route: '/workspace' },
    { tag: 'CIM', label: 'Client Map', sub: 'E1 · Global map with archetype markers & CIE rings', route: '/workspace' },
    { tag: 'CIG', label: 'Client Grid', sub: 'E1 · Spreadsheet view with all CIE columns', route: '/workspace' },
    { tag: 'CIPL', label: 'CIE Pipeline', sub: 'E1 · Kanban pipeline with cognitive overlays', route: '/workspace' },
    { tag: 'C36', label: 'Client 360', sub: 'Cross · All engines unified per client', route: '/workspace' },
    // SCOUT
    { tag: 'SCT', label: 'SCOUT Dashboard', sub: 'E2 · Market intelligence hub', route: '/workspace' },
    { tag: 'ARE', label: 'Area Intelligence', sub: 'E2 · Area demand, price, yield metrics', route: '/workspace' },
    { tag: 'TXN', label: 'Transaction Feed', sub: 'E2 · Live DLD transaction data', route: '/workspace' },
    { tag: 'PRC', label: 'Price Intelligence', sub: 'E2 · Price per sqft analysis', route: '/workspace' },
    { tag: 'CMP', label: 'Comparables Engine', sub: 'E2 · Property valuation benchmarking', route: '/workspace' },
    { tag: 'OFP', label: 'Off-Plan Projects', sub: 'E2 · New development launches', route: '/workspace' },
    { tag: 'DEV', label: 'Developer Analytics', sub: 'E2 · Developer track records', route: '/workspace' },
    { tag: 'MCR', label: 'Macro Intelligence', sub: 'E2 · Economic indicators & demand drivers', route: '/workspace' },
    { tag: 'EMG', label: 'Emerging Areas', sub: 'E2 · Growth-phase market detection', route: '/workspace' },
    { tag: 'HMP', label: 'Heat Map', sub: 'E2 · Visual demand & activity map', route: '/workspace' },
    // ENGINE
    { tag: 'ENG', label: 'ENGINE Dashboard', sub: 'E3 · Matching command centre', route: '/workspace' },
    { tag: 'EPM', label: 'Purpose Matrix', sub: 'E3 · Client-to-purpose mapping', route: '/workspace' },
    { tag: 'EMS', label: 'Match Scorer', sub: 'E3 · 4-pillar match analysis', route: '/workspace' },
    { tag: 'ERC', label: 'Recommendations', sub: 'E3 · AI match recommendations', route: '/workspace' },
    // FORGE (Claude-powered)
    { tag: 'FDH', label: 'FORGE Command Centre', sub: 'E4 · Pipeline intelligence dashboard', route: '/workspace' },
    { tag: 'FDR', label: 'Deal Room', sub: 'E4 · AI deal intelligence briefs', route: '/workspace' },
    { tag: 'FMP', label: 'Meeting Prep', sub: 'E4 · CIE-driven tactical briefings', route: '/workspace' },
    { tag: 'FOR', label: 'Opportunity Radar', sub: 'E4 · Cross-engine pattern detection', route: '/workspace' },
    { tag: 'FCD', label: 'Client Dossier', sub: 'E4 · Unified client intelligence file', route: '/workspace' },
    // Cross-Engine
    { tag: 'PPL', label: 'Deal Pipeline', sub: 'Cross · Client flow from profiling to closing', route: '/workspace' },
    { tag: 'NTF', label: 'Notifications', sub: 'Cross · Unified alert feed from all engines', route: '/workspace' },
  ], [])

  const results = useMemo(() => {
    if (!q.trim()) {
      // Show engines + top workspace panels when empty
      const defaults = engineDefs.map(e => ({ label: e.name, sub: `${e.label} engine`, route: e.route, tag: e.id }))
      const topPanels = workspacePanels.slice(0, 5) // Show first 5 CIE panels
      return [...defaults, ...topPanels]
    }
    const l = q.toLowerCase()
    const u = q.toUpperCase()
    const r: { label: string; sub: string; route: string; tag: string }[] = []

    // GO-code exact match gets top priority
    const goExact = workspacePanels.find(p => p.tag.toUpperCase() === u)
    if (goExact) r.push(goExact)

    // GO-code prefix match
    workspacePanels.forEach(p => {
      if (p.tag.toUpperCase() !== u && p.tag.toUpperCase().startsWith(u) && q.length >= 2)
        r.push(p)
    })

    // Workspace panel name/sub match
    workspacePanels.forEach(p => {
      if (!r.find(x => x.tag === p.tag) && (p.label.toLowerCase().includes(l) || p.sub.toLowerCase().includes(l)))
        r.push(p)
    })

    // Client search
    clients.forEach(c => {
      if (c.name.toLowerCase().includes(l))
        r.push({ label: c.name, sub: `${c.type} · ${c.category} · ${c.location}`, route: `/clients?id=${c.id}`, tag: c.initials })
    })

    // Property search
    properties.forEach(p => {
      if (p.name.toLowerCase().includes(l) || p.area.toLowerCase().includes(l))
        r.push({ label: p.name, sub: `${p.area} · ${fmtPrice(p.price)}`, route: `/matches?property=${p.id}`, tag: p.type.slice(0, 3).toUpperCase() })
    })

    // Engine search
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
// PANEL — standard PCIS glassy card wrapper
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


// ═══════════════════════════════════════════════════════════════════════════
// LATEST NEWS FEED — Compact live news panel (replaces Flywheel)
// ═══════════════════════════════════════════════════════════════════════════

interface NewsItem {
  id: string
  title: string
  link: string
  source: string
  publishedAt: string
  category: string
}

const NEWS_CAT_COLORS: Record<string, string> = {
  'real-estate': '#22c55e',
  'financial': '#06b6d4',
  'development': '#a78bfa',
  'regulatory': '#f59e0b',
  'market': '#ec4899',
}

const NEWS_CAT_SHORT: Record<string, string> = {
  'real-estate': 'RE',
  'financial': 'FIN',
  'development': 'DEV',
  'regulatory': 'REG',
  'market': 'MKT',
}

function newsTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

function LatestNewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const ws = useWorkspaceSafe()

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('/api/news?limit=3')
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setNews(data.articles || [])
      } catch { /* silent */ }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    const interval = setInterval(load, 5 * 60 * 1000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  return (
    <Panel>
      <PanelHeader
        title="Latest News"
        accent="#22c55e"
        right={
          <button
            onClick={() => ws?.openPanel?.('news-feed' as PanelType, 'tab')}
            className="text-[8px] text-pcis-gold/50 hover:text-pcis-gold font-mono uppercase tracking-wider transition-colors"
          >
            NWS →
          </button>
        }
      />
      <div className="divide-y divide-pcis-border/10">
        {loading ? (
          <div className="px-4 py-6 text-center">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse mx-auto mb-2" />
            <span className="text-[9px] text-white/30">Loading news...</span>
          </div>
        ) : news.length === 0 ? (
          <div className="px-4 py-6 text-center">
            <span className="text-[9px] text-white/30">No news available</span>
          </div>
        ) : (
          news.map((item) => {
            const catColor = NEWS_CAT_COLORS[item.category] || '#9ca3af'
            const catShort = NEWS_CAT_SHORT[item.category] || '?'
            return (
              <a
                key={item.id}
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2.5 px-4 py-2 hover:bg-white/[0.02] transition-colors group"
              >
                <div
                  className="w-1 h-full min-h-[24px] rounded-full mt-0.5 shrink-0"
                  style={{ backgroundColor: catColor, opacity: 0.5 }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-medium text-white/70 leading-snug line-clamp-2 group-hover:text-pcis-gold transition-colors">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className="text-[7px] font-mono font-bold"
                      style={{ color: catColor }}
                    >
                      {catShort}
                    </span>
                    <span className="text-[7px] text-white/20">{item.source}</span>
                    <span className="text-[7px] text-white/15 font-mono">{newsTimeAgo(item.publishedAt)}</span>
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
// TOP STATS BAR
// ═══════════════════════════════════════════════════════════════════════════

function StatsBar() {
  const stats = useMemo(() => {
    const totalPortfolio = clients.reduce((s, c) => s + c.financialProfile.portfolioValue, 0)
    const uhnw = clients.filter(c => c.type === 'UHNW').length
    const activeDeals = clients.filter(c => ['Viewing', 'Offer Made', 'Negotiation'].includes(c.dealStage)).length
    const actNow = recommendations.filter(r => r.urgency === 'Act').length
    const hotPred = predictions.filter(p => p.confidence >= 70).length
    const avgEng = Math.round(engagementMetrics.reduce((s, e) => s + e.engagementScore, 0) / engagementMetrics.length)
    return { totalPortfolio, uhnw, activeDeals, actNow, hotPred, avgEng }
  }, [])

  return (
    <div className="flex items-center gap-6 text-[10px]">
      <div className="flex items-center gap-1.5">
        <span className="text-pcis-text-muted">Clients:</span>
        <span className="font-semibold text-pcis-gold" style={{ fontFamily: "'Playfair Display', serif" }}>{clients.length}</span>
      </div>
      <div className="w-px h-3 bg-pcis-border/30" />
      <div className="flex items-center gap-1.5">
        <span className="text-pcis-text-muted">UHNW:</span>
        <span className="font-mono font-semibold text-pcis-gold">{stats.uhnw}</span>
      </div>
      <div className="w-px h-3 bg-pcis-border/30" />
      <div className="flex items-center gap-1.5">
        <span className="text-pcis-text-muted">Active Deals:</span>
        <span className="font-mono font-semibold" style={{ color: '#22c55e' }}>{stats.activeDeals}</span>
      </div>
      <div className="w-px h-3 bg-pcis-border/30" />
      <div className="flex items-center gap-1.5">
        <span className="text-pcis-text-muted">Actions:</span>
        <span className="font-mono font-semibold" style={{ color: stats.actNow > 0 ? '#ef4444' : '#22c55e' }}>{stats.actNow}</span>
      </div>
      <div className="w-px h-3 bg-pcis-border/30" />
      <div className="flex items-center gap-1.5">
        <span className="text-pcis-text-muted">Predictions:</span>
        <span className="font-mono font-semibold" style={{ color: '#f59e0b' }}>{stats.hotPred}</span>
      </div>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// ENGINE GATEWAY CARDS
// ═══════════════════════════════════════════════════════════════════════════

function EngineCards() {
  const router = useRouter()
  const ws = useWorkspaceSafe()
  const engStats = useMemo(() => ({
    E1: { metric: `${clients.length} profiles`, sub: `Avg engagement: ${Math.round(engagementMetrics.reduce((s, e) => s + e.engagementScore, 0) / engagementMetrics.length)}` },
    E2: { metric: `${properties.length} properties`, sub: `${areaMetrics.length} areas tracked` },
    E3: { metric: `${matchStages.filter(m => m.stage !== 'Identified' && m.stage !== 'Closed').length} active`, sub: `${matches.length} total matches` },
    E4: { metric: `${recommendations.filter(r => r.urgency === 'Act').length} urgent`, sub: `${recommendations.length} total actions` },
  }), [])

  const handleEngineClick = useCallback((e: typeof engineDefs[number]) => {
    if (ws) {
      ws.openPanel(e.panelType, 'tab')
    } else {
      router.push(e.route)
    }
  }, [ws, router])

  return (
    <div className="grid grid-cols-4 gap-3">
      {engineDefs.map(e => (
        <Panel key={e.id} onClick={() => handleEngineClick(e)}
          className="group hover:border-opacity-50 transition-all">
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
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// CLIENT WATCHLIST
// ═══════════════════════════════════════════════════════════════════════════

function ClientWatchlist() {
  const router = useRouter()

  const list = useMemo(() => {
    return engagementMetrics
      .map(e => {
        const c = clients.find(cl => cl.id === e.clientId)!
        const pred = predictions.find(p => p.clientId === c.id)
        return { client: c, eng: e, prediction: pred }
      })
      .sort((a, b) => {
        const aS = (a.prediction ? a.prediction.confidence : 0) + (a.eng.status === 'cooling' || a.eng.status === 'cold' ? 50 : 0) + a.eng.readinessScore * 30
        const bS = (b.prediction ? b.prediction.confidence : 0) + (b.eng.status === 'cooling' || b.eng.status === 'cold' ? 50 : 0) + b.eng.readinessScore * 30
        return bS - aS
      })
      .slice(0, 10)
  }, [])

  return (
    <Panel>
      <PanelHeader title="Client Watchlist" accent="#06b6d4"
        right={<button onClick={() => router.push('/clients')} className="text-[9px] text-pcis-gold/50 hover:text-pcis-gold transition-colors">View all →</button>} />
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead>
            <tr className="text-pcis-text-muted text-[8px] uppercase tracking-wider border-b border-pcis-border/10">
              <th className="text-left py-2 px-4 font-normal">Client</th>
              <th className="text-left py-2 px-2 font-normal">Type</th>
              <th className="text-center py-2 px-2 font-normal">Status</th>
              <th className="text-center py-2 px-2 font-normal">Engagement</th>
              <th className="text-left py-2 px-2 font-normal">Stage</th>
              <th className="text-left py-2 px-2 font-normal">Prediction</th>
              <th className="text-right py-2 px-4 font-normal">Budget</th>
            </tr>
          </thead>
          <tbody>
            {list.map(({ client, eng, prediction }, idx) => (
              <tr key={client.id}
                className="border-b border-pcis-border/10 hover:bg-pcis-gold/[0.03] cursor-pointer transition-colors"
                onClick={() => router.push(`/clients?id=${client.id}`)}>
                <td className="py-2 px-4">
                  <div className="flex items-center gap-2">
                    <div className="w-[5px] h-[5px] rounded-full" style={{ backgroundColor: statusMap[eng.status].color }} />
                    <span className="text-white/70 font-medium">{client.name}</span>
                  </div>
                </td>
                <td className="py-2 px-2">
                  <span className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded
                    ${client.type === 'UHNW' ? 'text-pcis-gold bg-pcis-gold/10' : 'text-pcis-text-muted bg-white/[0.03]'}`}>
                    {client.type}
                  </span>
                </td>
                <td className="py-2 px-2 text-center">
                  <span className="text-[9px] font-medium" style={{ color: statusMap[eng.status].color }}>
                    {statusMap[eng.status].label}
                  </span>
                </td>
                <td className="py-2 px-2">
                  <div className="flex items-center gap-1.5 justify-center">
                    <div className="w-12 h-[4px] bg-white/[0.04] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: `${eng.engagementScore}%`,
                        backgroundColor: eng.engagementScore >= 60 ? '#22c55e' : eng.engagementScore >= 40 ? '#f59e0b' : '#ef4444',
                      }} />
                    </div>
                    <span className="text-[9px] font-mono" style={{
                      color: eng.engagementScore >= 60 ? '#22c55e' : eng.engagementScore >= 40 ? '#f59e0b' : '#ef4444',
                    }}>{eng.engagementScore}</span>
                  </div>
                </td>
                <td className="py-2 px-2">
                  <span className="text-[9px]" style={{ color: dealStageColors[client.dealStage] }}>{client.dealStage}</span>
                </td>
                <td className="py-2 px-2">
                  {prediction ? (
                    <div className="flex items-center gap-1.5">
                      <span className="text-white/40 text-[9px]">{prediction.pattern}</span>
                      <span className="text-[8px] font-mono px-1 py-[1px] rounded"
                        style={{ backgroundColor: prediction.confidence >= 75 ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.08)', color: prediction.confidence >= 75 ? '#22c55e' : '#f59e0b' }}>
                        {prediction.confidence}%
                      </span>
                    </div>
                  ) : <span className="text-pcis-text-muted/30">—</span>}
                </td>
                <td className="py-2 px-4 text-right">
                  <span className="text-pcis-text-secondary text-[9px] font-mono">{fmt(client.financialProfile.budgetMax)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// PORTFOLIO HEALTH + PIPELINE
// ═══════════════════════════════════════════════════════════════════════════

function PortfolioHealth() {
  const data = useMemo(() => {
    const dist: Record<EngagementStatus, number> = { thriving: 0, active: 0, cooling: 0, cold: 0, dormant: 0 }
    engagementMetrics.forEach(e => dist[e.status]++)

    const pipeline: Record<DealStage, number> = { 'Lead In': 0, 'Discovery': 0, 'Viewing': 0, 'Offer Made': 0, 'Negotiation': 0, 'Closed Won': 0 }
    clients.forEach(c => pipeline[c.dealStage]++)

    const avgScore = Math.round(engagementMetrics.reduce((s, e) => s + e.engagementScore, 0) / engagementMetrics.length)
    const trend = engagementMetrics.slice(0, 7).map(e => e.engagementScore).reverse()

    return { dist, pipeline, avgScore, trend }
  }, [])

  const donutData = (['thriving', 'active', 'cooling', 'cold', 'dormant'] as EngagementStatus[])
    .filter(s => data.dist[s] > 0)
    .map(s => ({ label: statusMap[s].label, value: data.dist[s], color: statusMap[s].color }))

  const pipelineMax = Math.max(...DEAL_STAGES.map(s => data.pipeline[s]), 1)

  return (
    <div className="grid grid-cols-3 gap-3">
      {/* Engagement Health */}
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

      {/* Pipeline */}
      <Panel>
        <PanelHeader title="Deal Pipeline" accent="#22c55e" />
        <div className="px-4 py-4">
          <div className="flex items-end gap-2 h-[64px]">
            {DEAL_STAGES.map(stage => {
              const h = Math.max(4, (data.pipeline[stage] / pipelineMax) * 56)
              return (
                <div key={stage} className="flex-1 flex flex-col items-center justify-end">
                  <span className="text-[8px] font-mono mb-1" style={{ color: dealStageColors[stage] }}>{data.pipeline[stage]}</span>
                  <div className="w-full rounded-t" style={{
                    height: h,
                    background: `linear-gradient(to top, ${dealStageColors[stage]}, ${dealStageColors[stage]}60)`,
                  }} />
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

      {/* Latest News — Live Feed */}
      <LatestNewsFeed />
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// BOTTOM ROW: Matches + Actions + Intel + Market
// ═══════════════════════════════════════════════════════════════════════════

function BottomRow() {
  const router = useRouter()
  const ws = useWorkspaceSafe()

  const activeMatches = useMemo(() =>
    matchStages
      .filter(m => m.stage !== 'Identified' && m.stage !== 'Closed')
      .sort((a, b) => new Date(b.stageChangedAt).getTime() - new Date(a.stageChangedAt).getTime())
      .slice(0, 5)
      .map(m => ({
        match: m,
        client: clients.find(c => c.id === m.clientId)!,
        property: properties.find(p => p.id === m.propertyId)!,
      })),
  [])

  const urgentRecs = useMemo(() =>
    recommendations
      .filter(r => r.urgency === 'Act')
      .slice(0, 4)
      .map(r => ({ rec: r, client: clients.find(c => c.id === r.clientId)! })),
  [])

  const topIntel = useMemo(() => intelFeed.slice(0, 4), [])

  const macros = useMemo(() => macroIndicators.slice(0, 5), [])

  const gradeColors: Record<string, string> = {
    'A+': '#d4a574', 'A': '#22c55e', 'B+': '#3b82f6', 'B': '#9ca3af', 'C': '#ef4444', 'D': '#6b7280'
  }

  return (
    <div className="grid grid-cols-4 gap-3">

      {/* Active Matches */}
      <Panel>
        <PanelHeader title="Active Matches" accent="#22c55e"
          right={<button onClick={() => ws ? ws.openPanel('engine-dashboard', 'tab') : router.push('/matches')} className="text-[9px] text-pcis-gold/50 hover:text-pcis-gold transition-colors">E3 →</button>} />
        <div className="divide-y divide-pcis-border/10">
          {activeMatches.map(({ match, client, property }) => (
            <div key={match.id} className="px-4 py-2.5 hover:bg-pcis-gold/[0.02] transition-colors cursor-pointer" onClick={() => ws ? ws.openPanel('engine-dashboard', 'tab') : router.push('/matches')}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono font-bold" style={{ color: gradeColors[match.grade] }}>{match.grade}</span>
                <span className="text-[10px] text-white/60">{client.initials}</span>
                <span className="text-pcis-text-muted">→</span>
                <span className="text-[10px] text-white/50 truncate">{property.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-[3px] bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${match.overallScore * 100}%`, backgroundColor: gradeColors[match.grade] }} />
                </div>
                <span className="text-[8px] text-pcis-text-muted font-mono">{match.stage}</span>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Action Queue */}
      <Panel>
        <PanelHeader title="Action Queue" accent="#ef4444"
          right={<button onClick={() => ws ? ws.openPanel('forge-dashboard', 'tab') : router.push('/recommendations')} className="text-[9px] text-pcis-gold/50 hover:text-pcis-gold transition-colors">E4 →</button>} />
        <div className="divide-y divide-pcis-border/10">
          {urgentRecs.map(({ rec, client }) => (
            <div key={rec.id} className="px-4 py-2.5 hover:bg-pcis-gold/[0.02] transition-colors cursor-pointer" onClick={() => ws ? ws.openPanel('forge-dashboard', 'tab') : router.push('/recommendations')}>
              <div className="flex items-start gap-2">
                <div className="w-[6px] h-[6px] rounded-full mt-1 flex-shrink-0 bg-red-500/60" />
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-white/60 truncate leading-snug">{rec.title}</div>
                  <div className="text-[9px] text-pcis-text-muted mt-0.5">{client.name} · {rec.timeframe}</div>
                </div>
                <span className="text-[8px] font-mono text-red-400/60 bg-red-500/[0.08] px-1.5 py-0.5 rounded flex-shrink-0">ACT</span>
              </div>
            </div>
          ))}
          {/* Upcoming touches */}
          <div className="px-4 py-2">
            <div className="text-[9px] text-pcis-text-muted uppercase tracking-wider mb-1.5">Upcoming</div>
            {nextTouches.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 3).map(t => {
              const c = clients.find(cl => cl.id === t.clientId)!
              return (
                <div key={`${t.clientId}-${t.date}`} className="flex items-center gap-2 py-1">
                  <span className="text-[8px] text-pcis-gold/40 font-mono w-10">{new Date(t.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                  <span className="text-[9px] text-white/40">{c.name}</span>
                  <span className="text-[8px] text-pcis-text-muted ml-auto capitalize">{t.type}</span>
                </div>
              )
            })}
          </div>
        </div>
      </Panel>

      {/* Intel Headlines */}
      <Panel>
        <PanelHeader title="Market Intel" accent="#d4a574"
          right={<button onClick={() => ws ? ws.openPanel('scout-dashboard', 'tab') : router.push('/intel')} className="text-[9px] text-pcis-gold/50 hover:text-pcis-gold transition-colors">SCOUT →</button>} />
        <div className="divide-y divide-pcis-border/10">
          {topIntel.map(item => (
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
          {macros.map(m => (
            <div key={m.id} className="px-4 py-2 flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <span className="text-[9px] text-pcis-text-muted truncate block">{m.label}</span>
              </div>
              <MiniSparkline data={m.sparkline} color={m.trend >= 0 ? '#22c55e' : '#ef4444'} width={40} height={14} />
              <span className="text-[10px] font-mono text-white/50 w-16 text-right flex-shrink-0">{m.value}</span>
              <span className="text-[9px] font-mono w-10 text-right flex-shrink-0"
                style={{ color: m.trend >= 0 ? '#22c55e' : '#ef4444' }}>
                {m.trend >= 0 ? '+' : ''}{m.trend}%
              </span>
            </div>
          ))}
          {/* Area demand mini */}
          <div className="px-4 py-2.5">
            <div className="text-[9px] text-pcis-text-muted uppercase tracking-wider mb-2">Top Areas</div>
            {areaMetrics.sort((a, b) => b.demandScore - a.demandScore).slice(0, 3).map(a => (
              <div key={a.areaName} className="flex items-center gap-2 py-1">
                <span className="text-[9px] text-white/40 w-20 truncate">{a.areaName}</span>
                <div className="flex-1 h-[3px] bg-white/[0.04] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-pcis-gold/40" style={{ width: `${a.demandScore}%` }} />
                </div>
                <span className="text-[8px] font-mono text-pcis-gold/50">{a.demandScore}</span>
              </div>
            ))}
          </div>
        </div>
      </Panel>
    </div>
  )
}


// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function DashboardPage() {
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
          if (ws) {
            ws.openPanel(eng.panelType, 'tab')
          } else {
            router.push(eng.route)
          }
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [cmdOpen, router, ws])

  return (
    <div className="space-y-4">

      {/* Stats Bar */}
      <div className="flex items-center justify-between">
        <StatsBar />
        <button onClick={() => setCmdOpen(true)}
          className="flex items-center gap-2 text-[10px] text-pcis-text-muted hover:text-pcis-text-secondary transition-colors">
          <span>Search</span>
          <span className="text-pcis-gold/30 bg-pcis-gold/[0.05] px-1.5 py-0.5 rounded border border-pcis-gold/10 text-[8px] font-mono">{pk('⌘K')}</span>
        </button>
      </div>

      {/* Engine Gateway Cards */}
      <EngineCards />

      {/* Portfolio Health + Pipeline + Latest News */}
      <PortfolioHealth />

      {/* Client Watchlist Table */}
      <ClientWatchlist />

      {/* Bottom: Matches | Actions | Intel | Market */}
      <BottomRow />

      {/* Morning Brief Orb */}
      <DashboardBriefOrb />

      {/* Footer hint */}
      <div className="flex items-center justify-center gap-4 text-[8px] text-pcis-text-muted/30 font-mono pb-2">
        <span>Press 1-4 for engines</span>
        <span>·</span>
        <span>{pk('⌘K')} search</span>
        <span>·</span>
        <span>PCIS v1.0</span>
      </div>

      <CmdPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </div>
  )
}
