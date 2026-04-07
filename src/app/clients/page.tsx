'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { escapeHtml } from '@/lib/sanitize'
import ClientCard from '@/components/ClientCard'
import ClientDetailPanel from '@/components/ClientDetailPanel'
import {
  DealStage, DEAL_STAGES, dealStageColors,
  type Client, type EngagementStatus, type EngagementMetrics as EngMetrics,
  type CognitiveProfile, type Prediction, type Signal, type Match,
  type Recommendation, type Relationship, type LifecycleData, type NextTouch,
} from '@/lib/mockData'
import { useCIEClients } from '@/lib/useCIEData'
import { P1Loading, P1EmptyState, P1ErrorState } from '@/components/P1Loading'

// ============================================================
// LIVE DATA LAYER — replaces mock data imports
// ============================================================
// Module-level stores populated by ClientsPage from CIE hook.
// Sub-components read from these via the shim functions below.

let clients: Client[] = []
const _engagementMap = new Map<string, EngMetrics>()
const _profileMap = new Map<string, CognitiveProfile>()

// Shim functions (replace mock helpers — all sub-components use these)
function getEngagement(id: string): EngMetrics | undefined {
  return _engagementMap.get(id)
}
function getProfile(id: string): CognitiveProfile | undefined {
  return _profileMap.get(id)
}
function getClientPredictions(_id: string): Prediction[] { return [] }
function getClientRelationships(_id: string): Relationship[] { return [] }
function getClientSignals(_id: string): Signal[] { return [] }
function getNextTouch(_id: string): NextTouch | undefined { return undefined }
function getOverdueClients(): { client: Client; daysOverdue: number }[] { return [] }
function getPipelineStats(): Record<string, number> { return {} }

// Empty arrays for features not yet provided by CIE backend
const predictions: Prediction[] = []
const signals: Signal[] = []
const matches: Match[] = []
const recommendations: Recommendation[] = []
const relationships: Relationship[] = []
const lifecycleData: LifecycleData[] = []
const cognitiveProfiles: CognitiveProfile[] = []
const engagementMetrics: EngMetrics[] = []

// ============================================================
// FILTER TYPES
// ============================================================

type ViewMode = 'dashboard' | 'grid' | 'pipeline' | 'map'
type FilterKey = 'all' | 'needs-attention' | 'hot' | 'ready' | 'UHNW' | 'HNW' | 'Affluent'

const filters: { key: FilterKey; label: string; description: string }[] = [
  { key: 'all', label: 'All Clients', description: 'Full book' },
  { key: 'needs-attention', label: 'Needs Attention', description: 'Cooling, cold, or dormant' },
  { key: 'hot', label: 'Hot', description: 'Heating momentum' },
  { key: 'ready', label: 'Ready to Close', description: 'Readiness > 70%' },
  { key: 'UHNW', label: 'UHNW', description: 'Ultra High Net Worth' },
  { key: 'HNW', label: 'HNW', description: 'High Net Worth' },
  { key: 'Affluent', label: 'Affluent', description: 'Affluent tier' },
]

function filterClients(clientList: Client[], filter: FilterKey): Client[] {
  switch (filter) {
    case 'needs-attention':
      return clientList.filter(c => {
        const eng = getEngagement(c.id)
        return eng && (eng.status === 'cooling' || eng.status === 'cold' || eng.status === 'dormant')
      })
    case 'hot':
      return clientList.filter(c => {
        const eng = getEngagement(c.id)
        return eng && eng.momentum === 'heating'
      })
    case 'ready':
      return clientList.filter(c => {
        const eng = getEngagement(c.id)
        return eng && eng.readinessScore >= 0.7
      })
    case 'UHNW':
    case 'HNW':
    case 'Affluent':
      return clientList.filter(c => c.type === filter)
    default:
      return clientList
  }
}

// ============================================================
// SECTION TYPES  - grouped intelligence view
// ============================================================

interface ClientSection {
  key: string
  title: string
  subtitle: string
  color: string
  glowColor: string
  clients: Client[]
  icon: string
}

function buildSections(clientList: Client[]): ClientSection[] {
  // Categorize each client
  const spotlight: Client[] = []
  const needsAttention: Client[] = []
  const heatingUp: Client[] = []
  const thriving: Client[] = []
  const active: Client[] = []
  const steady: Client[] = []

  clientList.forEach(c => {
    const eng = getEngagement(c.id)
    if (!eng) { steady.push(c); return }

    // Spotlight: top urgency  - heating + high readiness, OR critical decay
    if ((eng.momentum === 'heating' && eng.readinessScore >= 0.7) || eng.decayRate >= 70) {
      spotlight.push(c)
      return
    }

    if (eng.status === 'cooling' || eng.status === 'cold' || eng.status === 'dormant') {
      needsAttention.push(c)
    } else if (eng.momentum === 'heating') {
      heatingUp.push(c)
    } else if (eng.status === 'thriving') {
      thriving.push(c)
    } else if (eng.status === 'active' && eng.engagementScore >= 60) {
      active.push(c)
    } else {
      steady.push(c)
    }
  })

  // Sort each section by engagement score descending
  const sortByEng = (a: Client, b: Client) => {
    const ea = getEngagement(a.id)
    const eb = getEngagement(b.id)
    return (eb?.engagementScore ?? 0) - (ea?.engagementScore ?? 0)
  }

  spotlight.sort(sortByEng)
  needsAttention.sort((a, b) => {
    // Sort by decay rate descending (most urgent first)
    const ea = getEngagement(a.id)
    const eb = getEngagement(b.id)
    return (eb?.decayRate ?? 0) - (ea?.decayRate ?? 0)
  })
  heatingUp.sort(sortByEng)
  thriving.sort(sortByEng)
  active.sort(sortByEng)
  steady.sort(sortByEng)

  const sections: ClientSection[] = []

  if (spotlight.length > 0) {
    sections.push({
      key: 'spotlight',
      title: 'Spotlight',
      subtitle: 'Highest priority  - requires immediate action',
      color: '#d4a574',
      glowColor: 'rgba(212,165,116,0.06)',
      clients: spotlight,
      icon: '◆',
    })
  }

  if (needsAttention.length > 0) {
    sections.push({
      key: 'attention',
      title: 'Needs Attention',
      subtitle: 'Engagement decaying  - re-engage before it\'s too late',
      color: '#f59e0b',
      glowColor: 'rgba(245,158,11,0.04)',
      clients: needsAttention,
      icon: '◈',
    })
  }

  if (heatingUp.length > 0) {
    sections.push({
      key: 'heating',
      title: 'Heating Up',
      subtitle: 'Momentum rising  - capitalize on the signal',
      color: '#22c55e',
      glowColor: 'rgba(34,197,94,0.04)',
      clients: heatingUp,
      icon: '↑',
    })
  }

  if (thriving.length > 0) {
    sections.push({
      key: 'thriving',
      title: 'Thriving',
      subtitle: 'Strong engagement  - maintain and nurture',
      color: '#22c55e',
      glowColor: 'rgba(34,197,94,0.02)',
      clients: thriving,
      icon: '◉',
    })
  }

  if (active.length > 0) {
    sections.push({
      key: 'active',
      title: 'Active',
      subtitle: 'Engaged and responsive',
      color: '#06b6d4',
      glowColor: 'rgba(6,182,212,0.02)',
      clients: active,
      icon: '○',
    })
  }

  if (steady.length > 0) {
    sections.push({
      key: 'steady',
      title: 'Steady',
      subtitle: 'Stable with moderate activity',
      color: '#6b7280',
      glowColor: 'rgba(107,114,128,0.02)',
      clients: steady,
      icon: '·',
    })
  }

  return sections
}

// ============================================================
// STAGGERED CARD WRAPPER  - fade-in animation
// ============================================================

function AnimatedCard({
  children,
  delay,
  isHero,
}: {
  children: React.ReactNode
  delay: number
  isHero?: boolean
}) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${isHero ? 'col-span-1 md:col-span-2' : ''}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
      }}
    >
      {children}
    </div>
  )
}

// ============================================================
// SECTION DIVIDER  - ambient glow separator
// ============================================================

function SectionDivider({ section, count }: { section: ClientSection; count: number }) {
  return (
    <div className="relative pt-8 pb-4 first:pt-2">
      {/* Ambient glow line */}
      <div className="absolute left-0 right-0 top-8 h-px" style={{
        background: `linear-gradient(90deg, transparent 0%, ${section.color}30 20%, ${section.color}50 50%, ${section.color}30 80%, transparent 100%)`,
      }} />

      {/* Section header */}
      <div className="relative flex items-center gap-3">
        <span className="text-[11px]" style={{ color: section.color }}>{section.icon}</span>
        <h2 className="text-[13px] font-semibold tracking-wide" style={{ color: section.color }}>
          {section.title}
        </h2>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.03]" style={{ color: section.color }}>
          {count}
        </span>
        <span className="text-[9px] text-pcis-text-muted/80 ml-1">{section.subtitle}</span>
      </div>
    </div>
  )
}

// ============================================================
// CONSTELLATION VIEW  - Canvas-based relationship network
// ============================================================

function ConstellationView({
  filteredClients,
  onSelectClient,
  selectedId,
}: {
  filteredClients: Client[]
  onSelectClient: (client: Client) => void
  selectedId: string | null
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef(0)
  const timeRef = useRef(0)
  const nodesRef = useRef<Array<{
    client: Client
    x: number
    y: number
    targetX: number
    targetY: number
    radius: number
    status: EngagementStatus
  }>>([])
  const hoveredRef = useRef<string | null>(null)

  const statusColors: Record<EngagementStatus, string> = {
    thriving: '#22c55e',
    active: '#06b6d4',
    cooling: '#f59e0b',
    cold: '#3b82f6',
    dormant: '#6b7280',
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const w = container.offsetWidth
    const h = container.offsetHeight
    const cx = w / 2
    const cy = h / 2

    const statusRings: Record<EngagementStatus, number> = {
      thriving: 0.2, active: 0.4, cooling: 0.6, cold: 0.75, dormant: 0.9,
    }

    const grouped: Record<EngagementStatus, Client[]> = {
      thriving: [], active: [], cooling: [], cold: [], dormant: [],
    }

    filteredClients.forEach(c => {
      const eng = getEngagement(c.id)
      const status = eng?.status || 'active'
      grouped[status].push(c)
    })

    const nodes: typeof nodesRef.current = []

    Object.entries(grouped).forEach(([status, cls]) => {
      const ringRatio = statusRings[status as EngagementStatus]
      const ringRadius = Math.min(w, h) * 0.45 * ringRatio
      cls.forEach((client, i) => {
        const angle = (i / Math.max(1, cls.length)) * Math.PI * 2 - Math.PI / 2
        const jitter = Math.random() * 20 - 10
        const eng = getEngagement(client.id)
        const tierSize = client.type === 'UHNW' ? 26 : client.type === 'HNW' ? 20 : 16

        nodes.push({
          client,
          x: cx + Math.cos(angle) * (ringRadius + jitter),
          y: cy + Math.sin(angle) * (ringRadius + jitter),
          targetX: cx + Math.cos(angle) * (ringRadius + jitter),
          targetY: cy + Math.sin(angle) * (ringRadius + jitter),
          radius: tierSize,
          status: (eng?.status || 'active') as EngagementStatus,
        })
      })
    })

    nodesRef.current = nodes
  }, [filteredClients])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const ctx = canvas.getContext('2d')!

    function draw() {
      const w = container!.offsetWidth
      const h = container!.offsetHeight
      const dpr = 2
      canvas!.width = w * dpr
      canvas!.height = h * dpr
      ctx.scale(dpr, dpr)

      timeRef.current += 0.01
      const t = timeRef.current

      ctx.clearRect(0, 0, w, h)

      const nodes = nodesRef.current

      relationships.forEach(rel => {
        const fromNode = nodes.find(n => n.client.id === rel.fromClientId)
        const toNode = nodes.find(n => n.client.id === rel.toClientId)
        if (!fromNode || !toNode) return

        const isHighlighted = selectedId === rel.fromClientId || selectedId === rel.toClientId
          || hoveredRef.current === rel.fromClientId || hoveredRef.current === rel.toClientId

        ctx.strokeStyle = isHighlighted
          ? `rgba(212,165,116,${0.3 + Math.sin(t * 2) * 0.1})`
          : 'rgba(255,255,255,0.04)'
        ctx.lineWidth = isHighlighted ? 1.5 : 0.5

        const mx = (fromNode.x + toNode.x) / 2
        const my = (fromNode.y + toNode.y) / 2 - 30
        ctx.beginPath()
        ctx.moveTo(fromNode.x, fromNode.y)
        ctx.quadraticCurveTo(mx, my, toNode.x, toNode.y)
        ctx.stroke()

        if (isHighlighted) {
          ctx.fillStyle = 'rgba(212,165,116,0.5)'
          ctx.font = '8px Inter, sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(rel.type, (fromNode.x + toNode.x) / 2, (fromNode.y + toNode.y) / 2 - 8)
        }
      })

      nodes.forEach(node => {
        const isSelected = selectedId === node.client.id
        const isHovered = hoveredRef.current === node.client.id
        const color = statusColors[node.status]

        const floatX = Math.sin(t + node.x * 0.01) * 2
        const floatY = Math.cos(t + node.y * 0.01) * 2
        const nx = node.x + floatX
        const ny = node.y + floatY

        if (isSelected || isHovered) {
          const grad = ctx.createRadialGradient(nx, ny, node.radius, nx, ny, node.radius * 2.5)
          grad.addColorStop(0, color + '30')
          grad.addColorStop(1, 'transparent')
          ctx.fillStyle = grad
          ctx.beginPath()
          ctx.arc(nx, ny, node.radius * 2.5, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.fillStyle = '#0a0a0a'
        ctx.beginPath()
        ctx.arc(nx, ny, node.radius, 0, Math.PI * 2)
        ctx.fill()

        ctx.strokeStyle = color
        ctx.lineWidth = isSelected ? 2.5 : isHovered ? 2 : 1.5
        ctx.globalAlpha = isSelected || isHovered ? 1 : 0.6
        ctx.beginPath()
        ctx.arc(nx, ny, node.radius, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 1

        ctx.fillStyle = '#ffffff'
        ctx.font = `600 ${node.radius * 0.65}px Inter, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(node.client.initials, nx, ny + 0.5)

        if (isSelected || isHovered) {
          ctx.fillStyle = 'rgba(255,255,255,0.8)'
          ctx.font = '9px Inter, sans-serif'
          ctx.fillText(node.client.name, nx, ny + node.radius + 12)
          ctx.fillStyle = color
          ctx.font = '8px Inter, sans-serif'
          ctx.fillText(`${node.client.type} · ${node.status}`, nx, ny + node.radius + 22)
        }
      })

      frameRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(frameRef.current)
  }, [filteredClients, selectedId])

  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const clicked = nodesRef.current.find(node => {
      const dx = node.x - x
      const dy = node.y - y
      return Math.sqrt(dx * dx + dy * dy) < node.radius + 5
    })

    if (clicked) onSelectClient(clicked.client)
  }

  function handleCanvasMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const hovered = nodesRef.current.find(node => {
      const dx = node.x - x
      const dy = node.y - y
      return Math.sqrt(dx * dx + dy * dy) < node.radius + 5
    })

    hoveredRef.current = hovered?.client.id ?? null
    canvas.style.cursor = hovered ? 'pointer' : 'default'
  }

  return (
    <div ref={containerRef} className="w-full h-[calc(100vh-180px)] relative">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMove}
      />
      <div className="absolute bottom-4 left-4 flex items-center gap-4 bg-pcis-card/80 backdrop-blur-sm border border-pcis-border/40 rounded-lg px-4 py-2.5">
        {(['thriving', 'active', 'cooling', 'cold', 'dormant'] as EngagementStatus[]).map(status => (
          <div key={status} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: statusColors[status] }} />
            <span className="text-[9px] text-pcis-text-secondary capitalize">{status}</span>
          </div>
        ))}
        <div className="h-3 w-px bg-pcis-border/30" />
        <div className="flex items-center gap-3">
          <span className="text-[8px] text-pcis-text-muted/80">Size = Tier</span>
          <span className="text-[8px] text-pcis-text-muted/80">Lines = Relationships</span>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// STATS HEADER
// ============================================================

function BookStats({ clientList }: { clientList: Client[] }) {
  const stats = useMemo(() => {
    let totalPortfolio = 0
    let thriving = 0, active = 0, cooling = 0, cold = 0, dormant = 0
    let heating = 0

    clientList.forEach(c => {
      totalPortfolio += c.financialProfile.portfolioValue
      const eng = getEngagement(c.id)
      if (eng) {
        if (eng.status === 'thriving') thriving++
        else if (eng.status === 'active') active++
        else if (eng.status === 'cooling') cooling++
        else if (eng.status === 'cold') cold++
        else if (eng.status === 'dormant') dormant++
        if (eng.momentum === 'heating') heating++
      }
    })

    return { totalPortfolio, thriving, active, cooling, cold, dormant, heating, total: clientList.length }
  }, [clientList])

  return (
    <div className="flex items-center gap-5">
      <div>
        <span className="text-[20px] font-bold font-mono text-pcis-text">{stats.total}</span>
        <span className="text-[10px] text-pcis-text-secondary ml-1.5">clients</span>
      </div>
      <div className="h-6 w-px bg-pcis-border/30" />
      <div>
        <span className="text-[14px] font-mono text-pcis-gold font-medium">
          AED {(stats.totalPortfolio / 1_000_000_000).toFixed(2)}B
        </span>
        <span className="text-[9px] text-pcis-text-secondary ml-1.5">portfolio</span>
      </div>
      <div className="h-6 w-px bg-pcis-border/30" />
      <div className="flex items-center gap-3">
        {[
          { count: stats.thriving, color: '#22c55e', label: 'Thriving' },
          { count: stats.active, color: '#06b6d4', label: 'Active' },
          { count: stats.cooling, color: '#f59e0b', label: 'Cooling' },
          { count: stats.cold, color: '#3b82f6', label: 'Cold' },
          { count: stats.dormant, color: '#6b7280', label: 'Dormant' },
        ].filter(s => s.count > 0).map(s => (
          <div key={s.label} className="flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
            <span className="text-[9px] font-mono" style={{ color: s.color }}>{s.count}</span>
          </div>
        ))}
      </div>
      {stats.heating > 0 && (
        <>
          <div className="h-6 w-px bg-pcis-border/30" />
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-green-400">↑</span>
            <span className="text-[10px] font-mono text-green-400">{stats.heating}</span>
            <span className="text-[9px] text-pcis-text-secondary">heating</span>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================================
// SEARCH
// ============================================================

function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-pcis-text-muted" width="13" height="13" viewBox="0 0 16 16" fill="none">
        <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3" />
        <line x1="10.5" y1="10.5" x2="14" y2="14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      <input
        type="text"
        placeholder="Search clients..."
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-48 bg-white/[0.03] border border-pcis-border/40 rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-pcis-text placeholder-pcis-text-muted/60 focus:outline-none focus:border-pcis-gold/30 transition-colors"
      />
    </div>
  )
}

// ============================================================
// DASHBOARD VIEW  - aggregate intelligence war room
// ============================================================

function EngagementRadar({
  clientList,
  onSelectClient,
}: {
  clientList: Client[]
  onSelectClient: (client: Client) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef(0)
  const timeRef = useRef(0)
  const hoveredRef = useRef<string | null>(null)
  const nodesRef = useRef<Array<{
    client: Client; x: number; y: number; baseX: number; baseY: number
    r: number; color: string; eng: EngMetrics
  }>>([])

  const statusColor: Record<string, string> = {
    thriving: '#22c55e', active: '#06b6d4', cooling: '#f59e0b', cold: '#3b82f6', dormant: '#6b7280',
  }

  // Build node positions
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const w = container.offsetWidth
    const h = container.offsetHeight
    const cx = w / 2
    const cy = h / 2
    const maxRadius = Math.min(w, h) * 0.44

    const nodes: typeof nodesRef.current = []

    clientList.forEach(c => {
      const eng = getEngagement(c.id)
      if (!eng) return

      // Map engagement score to distance from center (100=center, 0=edge)
      // High engagement = close to center (healthy), low = far out (danger)
      const distRatio = 1 - (eng.engagementScore / 100)
      const dist = distRatio * maxRadius * 0.9 + maxRadius * 0.08

      // Map days since contact to angle (0 days = top, more days = clockwise)
      const maxDays = 70
      const angleRatio = Math.min(1, eng.daysSinceContact / maxDays)
      const angle = -Math.PI / 2 + angleRatio * Math.PI * 1.8

      const x = cx + Math.cos(angle) * dist
      const y = cy + Math.sin(angle) * dist
      const r = c.type === 'UHNW' ? 14 : c.type === 'HNW' ? 11 : 8
      const color = statusColor[eng.status] || '#6b7280'

      nodes.push({ client: c, x, y, baseX: x, baseY: y, r, color, eng })
    })

    nodesRef.current = nodes
  }, [clientList])

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d')!

    function draw() {
      const w = container!.offsetWidth
      const h = container!.offsetHeight
      const dpr = 2
      canvas!.width = w * dpr
      canvas!.height = h * dpr
      ctx.scale(dpr, dpr)

      timeRef.current += 0.008
      const t = timeRef.current

      const cx = w / 2
      const cy = h / 2
      const maxR = Math.min(w, h) * 0.44

      ctx.clearRect(0, 0, w, h)

      // === LAYER 1: Concentric ring grid ===
      for (let ring = 1; ring <= 5; ring++) {
        const r = (ring / 5) * maxR
        ctx.strokeStyle = `rgba(255,255,255,${ring === 3 ? 0.06 : 0.025})`
        ctx.lineWidth = ring === 3 ? 0.8 : 0.5
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.stroke()
      }

      // Ring labels
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.font = '8px Inter, sans-serif'
      ctx.textAlign = 'left'
      const labels = ['100', '80', '60', '40', '20']
      labels.forEach((label, i) => {
        const r = ((i + 1) / 5) * maxR
        ctx.fillText(label, cx + 4, cy - r + 10)
      })

      // === LAYER 2: Radial axis lines ===
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2
        ctx.strokeStyle = 'rgba(255,255,255,0.03)'
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR)
        ctx.stroke()
      }

      // === LAYER 3: Danger zone  - pulsing outer arc ===
      const dangerPulse = Math.sin(t * 1.5) * 0.3 + 0.7
      const dangerGrad = ctx.createRadialGradient(cx, cy, maxR * 0.55, cx, cy, maxR * 1.05)
      dangerGrad.addColorStop(0, 'transparent')
      dangerGrad.addColorStop(0.6, `rgba(239,68,68,${0.015 * dangerPulse})`)
      dangerGrad.addColorStop(1, `rgba(239,68,68,${0.05 * dangerPulse})`)
      ctx.fillStyle = dangerGrad
      ctx.beginPath()
      ctx.arc(cx, cy, maxR * 1.05, 0, Math.PI * 2)
      ctx.fill()

      // Danger zone label
      ctx.fillStyle = `rgba(239,68,68,${0.35 * dangerPulse})`
      ctx.font = '8px Inter, sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText('DANGER ZONE', cx + maxR - 4, cy + maxR - 8)

      // === LAYER 4: Safe zone  - center glow ===
      const safeGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.25)
      safeGrad.addColorStop(0, 'rgba(34,197,94,0.04)')
      safeGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = safeGrad
      ctx.beginPath()
      ctx.arc(cx, cy, maxR * 0.25, 0, Math.PI * 2)
      ctx.fill()

      // === LAYER 5: Sweeping radar beam ===
      const sweepAngle = t * 0.8
      const sweepGrad = ctx.createConicGradient(sweepAngle, cx, cy)
      sweepGrad.addColorStop(0, 'rgba(212,165,116,0.08)')
      sweepGrad.addColorStop(0.08, 'rgba(212,165,116,0.03)')
      sweepGrad.addColorStop(0.15, 'transparent')
      sweepGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = sweepGrad
      ctx.beginPath()
      ctx.arc(cx, cy, maxR, 0, Math.PI * 2)
      ctx.fill()

      // Beam line
      ctx.strokeStyle = 'rgba(212,165,116,0.15)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(cx + Math.cos(sweepAngle) * maxR, cy + Math.sin(sweepAngle) * maxR)
      ctx.stroke()

      // === LAYER 6: Relationship lines ===
      const nodes = nodesRef.current
      relationships.forEach(rel => {
        const fromNode = nodes.find(n => n.client.id === rel.fromClientId)
        const toNode = nodes.find(n => n.client.id === rel.toClientId)
        if (!fromNode || !toNode) return

        const isHighlighted = hoveredRef.current === rel.fromClientId || hoveredRef.current === rel.toClientId

        ctx.strokeStyle = isHighlighted
          ? `rgba(212,165,116,${0.25 + Math.sin(t * 3) * 0.1})`
          : 'rgba(255,255,255,0.025)'
        ctx.lineWidth = isHighlighted ? 1.5 : 0.5

        // Bezier curve
        const mx = (fromNode.x + toNode.x) / 2 + (fromNode.y - toNode.y) * 0.15
        const my = (fromNode.y + toNode.y) / 2 + (toNode.x - fromNode.x) * 0.15
        ctx.beginPath()
        ctx.moveTo(fromNode.x, fromNode.y)
        ctx.quadraticCurveTo(mx, my, toNode.x, toNode.y)
        ctx.stroke()

        if (isHighlighted) {
          ctx.fillStyle = 'rgba(212,165,116,0.6)'
          ctx.font = '8px Inter, sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(rel.type, (fromNode.x + toNode.x) / 2, (fromNode.y + toNode.y) / 2 - 6)
        }
      })

      // === LAYER 7: Client nodes ===
      nodes.forEach(node => {
        // Gentle float animation
        const floatX = Math.sin(t * 0.7 + node.baseX * 0.02) * 2
        const floatY = Math.cos(t * 0.7 + node.baseY * 0.02) * 2
        node.x = node.baseX + floatX
        node.y = node.baseY + floatY

        const isHovered = hoveredRef.current === node.client.id

        // Sweep hit detection  - brighten when radar beam passes
        const nodeAngle = Math.atan2(node.y - cy, node.x - cx)
        let angleDiff = ((sweepAngle % (Math.PI * 2)) - ((nodeAngle + Math.PI * 2) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
        if (angleDiff > Math.PI) angleDiff = Math.PI * 2 - angleDiff
        const sweepHit = Math.max(0, 1 - angleDiff / 0.5)

        // Outer glow
        const glowAlpha = isHovered ? 0.35 : 0.08 + sweepHit * 0.2
        const glowR = node.r + (isHovered ? 12 : 6 + sweepHit * 8)
        const gGrad = ctx.createRadialGradient(node.x, node.y, node.r * 0.5, node.x, node.y, glowR)
        gGrad.addColorStop(0, node.color + Math.round(glowAlpha * 255).toString(16).padStart(2, '0'))
        gGrad.addColorStop(1, 'transparent')
        ctx.fillStyle = gGrad
        ctx.beginPath()
        ctx.arc(node.x, node.y, glowR, 0, Math.PI * 2)
        ctx.fill()

        // Pulse ring for heating momentum
        if (node.eng.momentum === 'heating') {
          const pulsePhase = (t * 2 + node.baseX * 0.01) % 1
          const pulseR = node.r + pulsePhase * 12
          ctx.strokeStyle = node.color
          ctx.lineWidth = 1
          ctx.globalAlpha = (1 - pulsePhase) * 0.3
          ctx.beginPath()
          ctx.arc(node.x, node.y, pulseR, 0, Math.PI * 2)
          ctx.stroke()
          ctx.globalAlpha = 1
        }

        // Node circle
        ctx.fillStyle = '#0a0a0a'
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2)
        ctx.fill()

        // Status ring
        ctx.strokeStyle = node.color
        ctx.lineWidth = isHovered ? 2.5 : 2
        ctx.globalAlpha = isHovered ? 1 : 0.7 + sweepHit * 0.3
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2)
        ctx.stroke()
        ctx.globalAlpha = 1

        // Initials
        ctx.fillStyle = '#ffffff'
        ctx.font = `600 ${node.r * 0.75}px Inter, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(node.client.initials, node.x, node.y + 0.5)

        // Hover tooltip
        if (isHovered) {
          const tooltipY = node.y - node.r - 8

          // Name
          ctx.fillStyle = '#ffffff'
          ctx.font = '600 10px Inter, sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(node.client.name, node.x, tooltipY - 18)

          // Status + metrics
          ctx.fillStyle = node.color
          ctx.font = '8px Inter, sans-serif'
          ctx.fillText(
            `${node.client.type} · Eng ${node.eng.engagementScore} · ${node.eng.daysSinceContact}d ago`,
            node.x, tooltipY - 6
          )

          // Prediction if any
          const pred = predictions.find(p => p.clientId === node.client.id)
          if (pred) {
            ctx.fillStyle = 'rgba(212,165,116,0.7)'
            ctx.font = '8px Inter, sans-serif'
            ctx.fillText(`${pred.pattern} (${pred.confidence}%)`, node.x, tooltipY + 5)
          }
        }
      })

      // === LAYER 8: Center hub ===
      const hubGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18)
      hubGrad.addColorStop(0, 'rgba(212,165,116,0.15)')
      hubGrad.addColorStop(1, 'transparent')
      ctx.fillStyle = hubGrad
      ctx.beginPath()
      ctx.arc(cx, cy, 18, 0, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = '#0a0a0a'
      ctx.beginPath()
      ctx.arc(cx, cy, 8, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = 'rgba(212,165,116,0.3)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(cx, cy, 8, 0, Math.PI * 2)
      ctx.stroke()

      // Axis label: "Engagement" at center, "Days" around edge
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.font = '8px Inter, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('HIGH', cx, cy - maxR + 16)
      ctx.fillText('ENGAGEMENT', cx, cy - maxR + 24)
      ctx.fillText('0d', cx - 4, cy - maxR * 0.08 - 6)

      frameRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(frameRef.current)
  }, [clientList])

  function handleClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const hit = nodesRef.current.find(n => Math.hypot(n.x - x, n.y - y) < n.r + 4)
    if (hit) onSelectClient(hit.client)
  }

  function handleMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const hovered = nodesRef.current.find(n => Math.hypot(n.x - x, n.y - y) < n.r + 4)
    hoveredRef.current = hovered?.client.id ?? null
    canvas.style.cursor = hovered ? 'pointer' : 'default'
  }

  return (
    <div ref={containerRef} className="w-full h-full">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onClick={handleClick}
        onMouseMove={handleMove}
      />
    </div>
  )
}

function StatusDonut({ clientList }: { clientList: Client[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const counts = useMemo(() => {
    const c = { thriving: 0, active: 0, cooling: 0, cold: 0, dormant: 0 }
    clientList.forEach(cl => {
      const eng = getEngagement(cl.id)
      if (eng) c[eng.status]++
    })
    return c
  }, [clientList])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const size = 140
    const dpr = 2
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const outerR = 58
    const innerR = 38

    const segments = [
      { key: 'thriving', color: '#22c55e', count: counts.thriving },
      { key: 'active', color: '#06b6d4', count: counts.active },
      { key: 'cooling', color: '#f59e0b', count: counts.cooling },
      { key: 'cold', color: '#3b82f6', count: counts.cold },
      { key: 'dormant', color: '#6b7280', count: counts.dormant },
    ].filter(s => s.count > 0)

    const total = segments.reduce((s, seg) => s + seg.count, 0)
    let startAngle = -Math.PI / 2

    ctx.clearRect(0, 0, size, size)

    segments.forEach(seg => {
      const sweep = (seg.count / total) * Math.PI * 2
      ctx.fillStyle = seg.color
      ctx.globalAlpha = 0.75
      ctx.beginPath()
      ctx.arc(cx, cy, outerR, startAngle, startAngle + sweep)
      ctx.arc(cx, cy, innerR, startAngle + sweep, startAngle, true)
      ctx.closePath()
      ctx.fill()
      ctx.globalAlpha = 1
      startAngle += sweep
    })

    // Center text
    ctx.fillStyle = '#ffffff'
    ctx.font = '600 22px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(`${total}`, cx, cy - 4)
    ctx.fillStyle = 'rgba(255,255,255,0.6)'
    ctx.font = '9px Inter, sans-serif'
    ctx.fillText('CLIENTS', cx, cy + 12)
  }, [counts])

  return <canvas ref={canvasRef} style={{ width: 140, height: 140 }} />
}

function TierDistribution({ clientList }: { clientList: Client[] }) {
  const tiers = useMemo(() => {
    const t = { UHNW: 0, HNW: 0, Affluent: 0 }
    clientList.forEach(c => t[c.type]++)
    return t
  }, [clientList])

  const total = clientList.length || 1
  const items = [
    { label: 'UHNW', count: tiers.UHNW, color: '#d4a574' },
    { label: 'HNW', count: tiers.HNW, color: '#06b6d4' },
    { label: 'Affluent', count: tiers.Affluent, color: '#6b7280' },
  ]

  return (
    <div className="space-y-2.5">
      {items.map(t => (
        <div key={t.label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-medium" style={{ color: t.color }}>{t.label}</span>
            <span className="text-[9px] font-mono text-pcis-text-secondary">{t.count}</span>
          </div>
          <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(t.count / total) * 100}%`, backgroundColor: t.color, opacity: 0.7 }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function PriorityQueue({
  clientList,
  onSelectClient,
}: {
  clientList: Client[]
  onSelectClient: (client: Client) => void
}) {
  // Combine urgent recommendations + decay alerts into priority items
  const items = useMemo(() => {
    const urgentRecs = recommendations
      .filter(r => r.urgency === 'Act')
      .map(r => {
        const client = clients.find(c => c.id === r.clientId)
        return { client, rec: r, type: 'action' as const }
      })
      .filter(r => r.client && clientList.some(c => c.id === r.client!.id))

    const decayAlerts = clientList
      .map(c => ({ client: c, eng: getEngagement(c.id) }))
      .filter(d => d.eng && d.eng.decayRate >= 40 && !urgentRecs.some(r => r.client?.id === d.client.id))
      .sort((a, b) => (b.eng!.decayRate) - (a.eng!.decayRate))
      .slice(0, 3)
      .map(d => ({ client: d.client, rec: null, type: 'decay' as const, decay: d.eng!.decayRate }))

    return [...urgentRecs, ...decayAlerts].slice(0, 6)
  }, [clientList])

  const statusColor: Record<string, string> = {
    thriving: '#22c55e', active: '#06b6d4', cooling: '#f59e0b', cold: '#3b82f6', dormant: '#6b7280',
  }

  return (
    <div className="space-y-1.5">
      {items.map((item, i) => {
        const eng = getEngagement(item.client!.id)
        const color = statusColor[eng?.status || 'active']
        return (
          <button
            key={i}
            onClick={() => item.client && onSelectClient(item.client)}
            className="w-full text-left flex items-start gap-2.5 p-2.5 rounded-lg border border-pcis-border/20 bg-white/[0.01] hover:bg-white/[0.03] hover:border-pcis-border/40 transition-all group"
          >
            {/* Priority number */}
            <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
              style={{ backgroundColor: color + '15' }}>
              <span className="text-[8px] font-bold" style={{ color }}>{i + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-pcis-text truncate">{item.client!.name}</span>
                {item.type === 'action' ? (
                  <span className="text-[8px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">ACT</span>
                ) : (
                  <span className="text-[8px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">DECAY {'decay' in item ? item.decay : 0}%</span>
                )}
              </div>
              <p className="text-[9px] text-pcis-text-muted leading-relaxed mt-0.5 line-clamp-2">
                {item.rec ? item.rec.description : `${eng?.daysSinceContact ?? 0} days silent  - engagement at ${eng?.engagementScore ?? 0}%`}
              </p>
            </div>
            {/* Arrow on hover */}
            <span className="text-[10px] text-pcis-gold opacity-0 group-hover:opacity-100 transition-opacity mt-1">→</span>
          </button>
        )
      })}
    </div>
  )
}

function PredictionsSummary({ clientList }: { clientList: Client[] }) {
  const activePredictions = useMemo(() => {
    return predictions.filter(p => clientList.some(c => c.id === p.clientId))
  }, [clientList])

  const patternCounts = useMemo(() => {
    const counts: Record<string, { count: number; avgConf: number }> = {}
    activePredictions.forEach(p => {
      if (!counts[p.pattern]) counts[p.pattern] = { count: 0, avgConf: 0 }
      counts[p.pattern].count++
      counts[p.pattern].avgConf += p.confidence
    })
    Object.values(counts).forEach(v => { v.avgConf = Math.round(v.avgConf / v.count) })
    return Object.entries(counts).sort((a, b) => b[1].count - a[1].count)
  }, [activePredictions])

  const patternColors: Record<string, string> = {
    'Imminent Purchase': '#22c55e',
    'Portfolio Expansion': '#06b6d4',
    'Analysis Paralysis': '#f59e0b',
    'Price Negotiation': '#3b82f6',
    'Trust Erosion': '#ef4444',
    'Flight Risk': '#ef4444',
    'Upsell Opportunity': '#a78bfa',
  }

  return (
    <div className="space-y-2">
      {patternCounts.map(([pattern, data]) => (
        <div key={pattern} className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: patternColors[pattern] || '#6b7280' }} />
            <span className="text-[10px] text-pcis-text-secondary">{pattern}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono font-medium text-pcis-text">{data.count}</span>
            <span className="text-[8px] text-pcis-text-muted">avg {data.avgConf}%</span>
          </div>
        </div>
      ))}
      {patternCounts.length === 0 && (
        <p className="text-[9px] text-pcis-text-muted/70 text-center py-2">No active predictions</p>
      )}
    </div>
  )
}

function MomentumBreakdown({ clientList }: { clientList: Client[] }) {
  const momentum = useMemo(() => {
    let heating = 0, stable = 0, cooling = 0
    clientList.forEach(c => {
      const eng = getEngagement(c.id)
      if (eng) {
        if (eng.momentum === 'heating') heating++
        else if (eng.momentum === 'cooling') cooling++
        else stable++
      }
    })
    return { heating, stable, cooling }
  }, [clientList])

  const total = clientList.length || 1

  return (
    <div className="space-y-2.5">
      {[
        { label: 'Heating', count: momentum.heating, color: '#22c55e', icon: '↑' },
        { label: 'Stable', count: momentum.stable, color: '#06b6d4', icon: '→' },
        { label: 'Cooling', count: momentum.cooling, color: '#f59e0b', icon: '↓' },
      ].map(m => (
        <div key={m.label}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span className="text-[9px]" style={{ color: m.color }}>{m.icon}</span>
              <span className="text-[9px] font-medium" style={{ color: m.color }}>{m.label}</span>
            </div>
            <span className="text-[9px] font-mono text-pcis-text-secondary">{m.count} ({Math.round((m.count / total) * 100)}%)</span>
          </div>
          <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(m.count / total) * 100}%`, backgroundColor: m.color, opacity: 0.7 }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

function RecentSignalFeed({ clientList }: { clientList: Client[] }) {
  const recentSignals = useMemo(() => {
    return signals
      .filter(s => clientList.some(c => c.id === s.clientId))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 8)
  }, [clientList])

  function timeAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h`
    return `${Math.floor(hrs / 24)}d`
  }

  const typeColors: Record<string, string> = {
    viewing: '#06b6d4', inquiry: '#d4a574', meeting: '#22c55e', offer: '#a78bfa',
    feedback: '#3b82f6', referral: '#f59e0b', financial: '#10b981', lifecycle: '#6b7280',
  }

  return (
    <div className="space-y-0">
      {recentSignals.map(sig => {
        const client = clients.find(c => c.id === sig.clientId)
        return (
          <div key={sig.id} className="flex items-start gap-2 py-1.5 border-b border-pcis-border/10 last:border-0">
            <div className="w-1 h-1 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: typeColors[sig.type] || '#6b7280' }} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-semibold text-pcis-text">{client?.initials}</span>
                <span className="text-[8px] text-pcis-text-secondary uppercase">{sig.type}</span>
                <span className="text-[8px] text-pcis-text-muted/70 ml-auto font-mono">{timeAgo(sig.timestamp)}</span>
              </div>
              <p className="text-[9px] text-pcis-text-muted truncate">{sig.content}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DashboardView({
  clientList,
  onSelectClient,
}: {
  clientList: Client[]
  onSelectClient: (client: Client) => void
}) {
  // Compute aggregate metrics
  const metrics = useMemo(() => {
    let totalPortfolio = 0
    let totalEngagement = 0
    let atRiskCount = 0
    let count = 0

    clientList.forEach(c => {
      totalPortfolio += c.financialProfile.portfolioValue
      const eng = getEngagement(c.id)
      if (eng) {
        totalEngagement += eng.engagementScore
        if (eng.status === 'cooling' || eng.status === 'cold' || eng.status === 'dormant') atRiskCount++
        count++
      }
    })

    const activePreds = predictions.filter(p => clientList.some(c => c.id === p.clientId))
    const avgEngagement = count > 0 ? Math.round(totalEngagement / count) : 0

    return { totalPortfolio, avgEngagement, atRiskCount, activePredictions: activePreds.length, total: clientList.length }
  }, [clientList])

  return (
    <div className="p-6 space-y-5">
      {/* Top metric cards */}
      <div className="grid grid-cols-5 gap-4">
        {[
          { label: 'Total Portfolio', value: `AED ${(metrics.totalPortfolio / 1_000_000_000).toFixed(2)}B`, color: '#d4a574' },
          { label: 'Avg Engagement', value: `${metrics.avgEngagement}`, color: metrics.avgEngagement >= 60 ? '#22c55e' : '#f59e0b' },
          { label: 'Clients at Risk', value: `${metrics.atRiskCount}`, color: metrics.atRiskCount > 0 ? '#ef4444' : '#22c55e' },
          { label: 'Active Predictions', value: `${metrics.activePredictions}`, color: '#a78bfa' },
          { label: 'Book Size', value: `${metrics.total}`, color: '#06b6d4' },
        ].map(card => (
          <div key={card.label} className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-5 text-center">
            <p className="text-[24px] font-bold font-mono" style={{ color: card.color }}>{card.value}</p>
            <p className="text-[10px] text-pcis-text-secondary uppercase tracking-wider mt-1.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Main grid: 3 columns */}
      <div className="grid grid-cols-12 gap-5">

        {/* Left column  - Status + Tier + Momentum */}
        <div className="col-span-3 space-y-5">
          <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-4">
            <h3 className="text-[10px] text-pcis-text-secondary uppercase tracking-wider mb-3">Book Status</h3>
            <div className="flex justify-center mb-3">
              <StatusDonut clientList={clientList} />
            </div>
            <div className="space-y-1">
              {[
                { label: 'Thriving', color: '#22c55e' },
                { label: 'Active', color: '#06b6d4' },
                { label: 'Cooling', color: '#f59e0b' },
                { label: 'Cold', color: '#3b82f6' },
                { label: 'Dormant', color: '#6b7280' },
              ].map(s => {
                const count = clientList.filter(c => getEngagement(c.id)?.status === s.label.toLowerCase()).length
                return count > 0 ? (
                  <div key={s.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="text-[9px] text-pcis-text-secondary">{s.label}</span>
                    </div>
                    <span className="text-[9px] font-mono" style={{ color: s.color }}>{count}</span>
                  </div>
                ) : null
              })}
            </div>
          </div>

          <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-4">
            <h3 className="text-[10px] text-pcis-text-secondary uppercase tracking-wider mb-3">Tier Distribution</h3>
            <TierDistribution clientList={clientList} />
          </div>

          <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-4">
            <h3 className="text-[10px] text-pcis-text-secondary uppercase tracking-wider mb-3">Momentum</h3>
            <MomentumBreakdown clientList={clientList} />
          </div>
        </div>

        {/* Center column  - Scatter + Signal feed */}
        <div className="col-span-6 space-y-5">
          <div className="bg-white/[0.015] border border-pcis-border/30 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <h3 className="text-[11px] text-pcis-text-secondary uppercase tracking-wider">Engagement Radar</h3>
                <p className="text-[9px] text-pcis-text-muted/70 mt-0.5">Center = high engagement · Edge = danger zone · Click any client</p>
              </div>
              <div className="flex items-center gap-4">
                {[
                  { color: '#22c55e', label: 'Thriving' },
                  { color: '#06b6d4', label: 'Active' },
                  { color: '#f59e0b', label: 'Cooling' },
                  { color: '#3b82f6', label: 'Cold' },
                  { color: '#6b7280', label: 'Dormant' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-[8px] text-pcis-text-muted/80">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-[400px]">
              <EngagementRadar clientList={clientList} onSelectClient={onSelectClient} />
            </div>
          </div>

          <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-4">
            <h3 className="text-[10px] text-pcis-text-secondary uppercase tracking-wider mb-3">Recent Signal Activity</h3>
            <RecentSignalFeed clientList={clientList} />
          </div>
        </div>

        {/* Right column  - Priority queue + Predictions */}
        <div className="col-span-3 space-y-5">
          <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-4">
            <h3 className="text-[10px] text-pcis-text-secondary uppercase tracking-wider mb-3">Priority Queue</h3>
            <PriorityQueue clientList={clientList} onSelectClient={onSelectClient} />
          </div>

          <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-4">
            <h3 className="text-[10px] text-pcis-text-secondary uppercase tracking-wider mb-3">Active Patterns</h3>
            <PredictionsSummary clientList={clientList} />
          </div>

          <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-4">
            <h3 className="text-[10px] text-pcis-text-secondary uppercase tracking-wider mb-3">Pipeline Funnel</h3>
            <div className="space-y-2">
              {DEAL_STAGES.map(stage => {
                const count = clientList.filter(c => c.dealStage === stage).length
                const maxCount = Math.max(...DEAL_STAGES.map(s => clientList.filter(c => c.dealStage === s).length), 1)
                return (
                  <div key={stage}>
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[8px] font-medium" style={{ color: dealStageColors[stage] }}>{stage}</span>
                      <span className="text-[8px] font-mono text-pcis-text-secondary">{count}</span>
                    </div>
                    <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{
                        width: `${(count / maxCount) * 100}%`,
                        backgroundColor: dealStageColors[stage],
                        opacity: 0.7,
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-white/[0.02] border border-pcis-border/30 rounded-xl p-4">
            <h3 className="text-[10px] text-pcis-text-secondary uppercase tracking-wider mb-3">
              Overdue Follow-ups
              {(() => {
                const overdue = getOverdueClients()
                return overdue.length > 0 ? (
                  <span className="ml-2 text-[8px] font-mono text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">{overdue.length}</span>
                ) : null
              })()}
            </h3>
            <div className="space-y-1.5">
              {getOverdueClients().slice(0, 4).map(item => (
                <button
                  key={item.client.id}
                  onClick={() => onSelectClient(item.client)}
                  className="w-full text-left flex items-center gap-2 p-2 rounded-lg border border-red-500/10 bg-red-500/[0.02] hover:bg-red-500/[0.05] transition-all"
                >
                  <span className="text-[9px] font-semibold text-pcis-text truncate flex-1">{item.client.name}</span>
                  <span className="text-[8px] font-mono text-red-400">{item.daysOverdue}d</span>
                </button>
              ))}
              {getOverdueClients().length === 0 && (
                <p className="text-[9px] text-green-400 text-center py-2">All follow-ups on track</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// GROUPED GRID VIEW  - the intelligence layout
// ============================================================

function GroupedGridView({
  sections,
  selectedClientId,
  onSelectClient,
}: {
  sections: ClientSection[]
  selectedClientId: string | null
  onSelectClient: (client: Client) => void
}) {
  // Track cumulative card index for stagger delay
  let cardIndex = 0

  return (
    <div className="px-6 pb-8">
      {sections.map((section) => {
        const isSpotlight = section.key === 'spotlight'
        const sectionCards = section.clients

        return (
          <div key={section.key}>
            <SectionDivider section={section} count={sectionCards.length} />

            {/* Ambient section background glow */}
            <div className="relative">
              <div
                className="absolute -inset-x-6 -top-2 bottom-0 rounded-2xl pointer-events-none"
                style={{ background: section.glowColor }}
              />

              <div className={`relative grid gap-4 ${
                isSpotlight
                  ? 'grid-cols-1 md:grid-cols-2'
                  : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
              }`}>
                {sectionCards.map((client) => {
                  const profile = getProfile(client.id) || { clientId: client.id, scores: [], summary: '', keyTraits: [], approachStrategy: '', riskFactors: [], communicationTips: [], lastComputed: new Date().toISOString() }
                  const engagement = getEngagement(client.id) || { clientId: client.id, status: 'active' as const, momentum: 'stable' as const, currentVelocity: 0, baselineVelocity: 1, decayRate: 0, daysSinceContact: 0, expectedInterval: 7, engagementScore: 50, readinessScore: 0.5 }
                  const clientPredictions = getClientPredictions(client.id)
                  const clientSignals = getClientSignals(client.id)

                  const currentDelay = cardIndex * 50
                  cardIndex++

                  return (
                    <AnimatedCard
                      key={client.id}
                      delay={currentDelay}
                      isHero={false}
                    >
                      <ClientCard
                        client={client}
                        profile={profile}
                        engagement={engagement}
                        predictions={clientPredictions}
                        signals={clientSignals}
                        onClick={() => onSelectClient(client)}
                        selected={selectedClientId === client.id}
                        dealStage={client.dealStage}
                        nextTouch={getNextTouch(client.id)}
                      />
                    </AnimatedCard>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}

      {sections.length === 0 && (
        <div className="text-center py-16">
          <p className="text-sm text-pcis-text-muted">No clients match this filter</p>
        </div>
      )}
    </div>
  )
}

// ============================================================
// PIPELINE VIEW  - Kanban deal stages
// ============================================================

function PipelineView({
  clientList,
  onSelectClient,
  onStageChange,
}: {
  clientList: Client[]
  onSelectClient: (client: Client) => void
  onStageChange: (clientId: string, newStage: DealStage) => void
}) {
  const pipelineStats = useMemo(() => getPipelineStats(), [])
  const [dragClientId, setDragClientId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<DealStage | null>(null)

  const statusColor: Record<string, string> = {
    thriving: '#22c55e', active: '#06b6d4', cooling: '#f59e0b', cold: '#3b82f6', dormant: '#6b7280',
  }

  return (
    <div className="p-6 space-y-5">
      {/* Pipeline stats */}
      <div className="flex items-center gap-4">
        <div className="h-6 w-px bg-pcis-border/30" />
        {DEAL_STAGES.map(stage => (
          <div key={stage} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: dealStageColors[stage] }} />
            <span className="text-[9px] font-mono" style={{ color: dealStageColors[stage] }}>
              {clientList.filter(c => c.dealStage === stage).length}
            </span>
          </div>
        ))}
      </div>

      {/* Kanban board */}
      <div className="grid grid-cols-6 gap-3" style={{ minHeight: 'calc(100vh - 260px)' }}>
        {DEAL_STAGES.map(stage => {
          const stageClients = clientList.filter(c => c.dealStage === stage)
          const stageColor = dealStageColors[stage]

          return (
            <div key={stage} className="flex flex-col"
              onDragOver={e => { e.preventDefault(); setDropTarget(stage) }}
              onDragLeave={() => setDropTarget(null)}
              onDrop={e => {
                e.preventDefault()
                if (dragClientId) {
                  onStageChange(dragClientId, stage)
                  setDragClientId(null)
                }
                setDropTarget(null)
              }}
            >
              {/* Column header */}
              <div className={`mb-3 transition-all ${dropTarget === stage ? 'scale-[1.02]' : ''}`}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stageColor }} />
                  <h3 className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: stageColor }}>
                    {stage}
                  </h3>
                  <span className="text-[9px] font-mono text-pcis-text-muted ml-auto">{stageClients.length}</span>
                </div>
                <div className="h-0.5 rounded-full" style={{ backgroundColor: stageColor + '30' }} />
              </div>

              {/* Client cards */}
              <div className="flex-1 space-y-2">
                {stageClients.map(client => {
                  const eng = getEngagement(client.id)
                  const touch = getNextTouch(client.id)
                  const color = statusColor[eng?.status || 'active']

                  // Next touch urgency
                  let touchColor = '#22c55e'
                  let touchLabel = ''
                  if (touch) {
                    const diffDays = Math.ceil((new Date(touch.date).getTime() - Date.now()) / 86400000)
                    touchColor = diffDays < 0 ? '#ef4444' : diffDays === 0 ? '#d4a574' : diffDays <= 2 ? '#f59e0b' : '#22c55e'
                    touchLabel = diffDays < 0 ? `${Math.abs(diffDays)}d overdue` : diffDays === 0 ? 'Today' : `in ${diffDays}d`
                  }

                  return (
                    <button
                      key={client.id}
                      draggable
                      onDragStart={() => setDragClientId(client.id)}
                      onDragEnd={() => { setDragClientId(null); setDropTarget(null) }}
                      onClick={() => onSelectClient(client)}
                      className={`w-full text-left p-3 rounded-lg border transition-all group cursor-grab active:cursor-grabbing ${
                        dragClientId === client.id
                          ? 'border-pcis-gold/40 bg-pcis-gold/[0.05] opacity-60'
                          : 'border-pcis-border/20 bg-white/[0.015] hover:bg-white/[0.03] hover:border-pcis-border/40'
                      }`}
                    >
                      {/* Header: initials + name */}
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 border-2"
                          style={{ borderColor: color, backgroundColor: '#0a0a0a' }}>
                          <span className="text-[8px] font-bold text-white">{client.initials}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-semibold text-pcis-text truncate">{client.name}</p>
                          <p className="text-[8px] text-pcis-text-muted">{client.type}</p>
                        </div>
                      </div>

                      {/* Portfolio value */}
                      <p className="text-[9px] font-mono text-pcis-text-secondary mt-2">
                        AED {(client.financialProfile.portfolioValue / 1_000_000).toFixed(0)}M
                      </p>

                      {/* Next touch */}
                      {touch && (
                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[7px] text-pcis-text-muted uppercase">Next</span>
                          <span className="text-[7px] font-mono font-semibold" style={{ color: touchColor }}>{touchLabel}</span>
                        </div>
                      )}

                      {/* Engagement bar */}
                      {eng && (
                        <div className="mt-2 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{
                            width: `${eng.engagementScore}%`,
                            backgroundColor: color,
                            opacity: 0.7,
                          }} />
                        </div>
                      )}
                    </button>
                  )
                })}

                {stageClients.length === 0 && (
                  <div className={`flex-1 flex items-center justify-center border border-dashed rounded-lg min-h-[80px] transition-colors ${
                    dropTarget === stage ? 'border-pcis-gold/40 bg-pcis-gold/[0.03]' : 'border-pcis-border/15'
                  }`}>
                    <p className="text-[8px] text-pcis-text-muted/40">{dropTarget === stage ? 'Drop here' : 'No clients'}</p>
                  </div>
                )}

                {/* Drop zone indicator */}
                {dropTarget === stage && stageClients.length > 0 && (
                  <div className="h-1 rounded-full bg-pcis-gold/40 mt-2 animate-pulse" />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// CLIENT WORLD MAP  - MapLibre GL (same approach as Relationships)
// ============================================================

import type * as MaplibreGL from 'maplibre-gl'

// Map city names from client.location to lat/lon coordinates
const CITY_COORDS: Record<string, { lat: number; lon: number }> = {
  'Dubai':          { lat: 25.20, lon: 55.27 },
  'Shanghai':       { lat: 31.23, lon: 121.47 },
  'Moscow':         { lat: 55.75, lon: 37.62 },
  'London':         { lat: 51.51, lon: -0.13 },
  'Tokyo':          { lat: 35.68, lon: 139.69 },
  'Amsterdam':      { lat: 52.37, lon: 4.90 },
  'Paris':          { lat: 48.86, lon: 2.35 },
  'Riyadh':         { lat: 24.69, lon: 46.72 },
  'Munich':         { lat: 48.14, lon: 11.58 },
  'Milan':          { lat: 45.46, lon: 9.19 },
  'Seoul':          { lat: 37.57, lon: 126.98 },
  'Mumbai':         { lat: 19.08, lon: 72.88 },
  'São Paulo':      { lat: -23.55, lon: -46.63 },
  'New York':       { lat: 40.71, lon: -74.01 },
  'Stockholm':      { lat: 59.33, lon: 18.07 },
  'Osaka':          { lat: 34.69, lon: 135.50 },
  'Madrid':         { lat: 40.42, lon: -3.70 },
  'St. Petersburg': { lat: 59.93, lon: 30.32 },
  'Abu Dhabi':      { lat: 24.45, lon: 54.65 },
  'Hong Kong':      { lat: 22.32, lon: 114.17 },
  'Singapore':      { lat: 1.35, lon: 103.82 },
  'Sydney':         { lat: -33.87, lon: 151.21 },
  'Zurich':         { lat: 47.38, lon: 8.54 },
  'Geneva':         { lat: 46.20, lon: 6.15 },
  'Monaco':         { lat: 43.73, lon: 7.42 },
}

function getCityFromLocation(location: string): string {
  // Extract city from "City, Country" format
  return location.split(',')[0].trim()
}

const typeColors: Record<string, string> = {
  'UHNW': '#d4a574',
  'HNW': '#22c55e',
  'Affluent': '#3b82f6',
}

const categoryColors: Record<string, string> = {
  'Trophy Buyer': '#f59e0b',
  'Investor': '#22c55e',
  'Lifestyle': '#a78bfa',
  'Portfolio Builder': '#3b82f6',
}

const dealStageMapColors: Record<string, string> = {
  'Lead In': '#6b7280',
  'Discovery': '#3b82f6',
  'Viewing': '#a78bfa',
  'Offer Made': '#f59e0b',
  'Negotiation': '#d4a574',
  'Closed Won': '#22c55e',
  'Closed Lost': '#ef4444',
  'Dormant': '#374151',
}

function ClientWorldMap({
  clientList,
  onSelectClient,
  isVisible,
}: {
  clientList: Client[]
  onSelectClient: (client: Client) => void
  isVisible: boolean
}) {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MaplibreGL.Map | null>(null)
  const mlRef = useRef<typeof MaplibreGL | null>(null)
  const markersRef = useRef<MaplibreGL.Marker[]>([])
  const initStartedRef = useRef(false)
  const [mapReady, setMapReady] = useState(false)
  const [hoveredClient, setHoveredClient] = useState<Client | null>(null)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)

  const displayClient = hoveredClient || selectedClient

  // Build client positions
  const clientPositions = useMemo(() => {
    return clientList.map(client => {
      const city = getCityFromLocation(client.location)
      const coords = CITY_COORDS[city] || CITY_COORDS['Dubai']
      // Add small jitter so clients in the same city don't stack
      const jLat = (Math.sin(client.id.charCodeAt(1) * 7.3) * 0.5)
      const jLon = (Math.cos(client.id.charCodeAt(1) * 5.7) * 0.5)
      return { client, lat: coords.lat + jLat, lon: coords.lon + jLon, city }
    })
  }, [clientList])

  // Initialize MapLibre GL only when visible
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

      // Inject critical CSS
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
        center: [40, 25], zoom: 2.5, minZoom: 2, maxZoom: 18,
        attributionControl: false,
      })

      map.addControl(new ml.NavigationControl({ showCompass: true, showZoom: true, visualizePitch: true }), 'bottom-right')

      map.on('load', () => {
        if (cancelled) { map.remove(); initStartedRef.current = false; return }
        mapRef.current = map; map.resize(); setMapReady(true)
      })
    }
    init()

    return () => {
      cancelled = true
      markersRef.current.forEach(m => m.remove()); markersRef.current = []
      setMapReady(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isVisible])

  // Add markers when data changes
  useEffect(() => {
    const map = mapRef.current; const ml = mlRef.current
    if (!map || !ml || !mapReady) return

    markersRef.current.forEach(m => m.remove()); markersRef.current = []

    // Dubai HQ marker
    const hqEl = document.createElement('div')
    hqEl.innerHTML = `
      <div style="position:relative;width:50px;height:50px;display:flex;align-items:center;justify-content:center;">
        <div style="position:absolute;inset:0;border-radius:50%;border:2px solid rgba(212,165,116,0.3);animation:pcis-client-pulse 2s ease-in-out infinite;"></div>
        <div style="position:absolute;inset:10px;border-radius:50%;border:1px solid rgba(212,165,116,0.2);animation:pcis-client-pulse 2s ease-in-out infinite 0.3s;"></div>
        <div style="width:12px;height:12px;border-radius:50%;background:radial-gradient(circle,#d4a574 0%,#8a6540 100%);box-shadow:0 0 20px rgba(212,165,116,0.4);border:2px solid rgba(255,255,255,0.3);"></div>
      </div>
    `
    markersRef.current.push(new ml.Marker({ element: hqEl, anchor: 'center' }).setLngLat([55.27, 25.20]).addTo(map))

    const hqLabel = document.createElement('div')
    hqLabel.innerHTML = `<div style="background:rgba(10,10,10,0.85);backdrop-filter:blur(8px);border:1px solid rgba(212,165,116,0.3);border-radius:8px;padding:5px 10px;pointer-events:none;">
      <div style="font:bold 10px Inter,system-ui,sans-serif;color:#d4a574;">YOUR OFFICE</div>
      <div style="font:9px Inter,system-ui,sans-serif;color:rgba(255,255,255,0.4);">Dubai · ${clientList.length} clients worldwide</div>
    </div>`
    markersRef.current.push(new ml.Marker({ element: hqLabel, anchor: 'left', offset: [18, 0] }).setLngLat([55.27, 25.20]).addTo(map))

    // Client markers
    clientPositions.forEach(({ client, lat, lon, city }) => {
      const tColor = typeColors[client.type] || '#d4a574'
      const stageColor = dealStageMapColors[client.dealStage] || '#6b7280'
      const budget = client.financialProfile.budgetMax
      const size = budget >= 100_000_000 ? 38 : budget >= 50_000_000 ? 34 : 30

      const el = document.createElement('div')
      el.style.cursor = 'pointer'
      el.innerHTML = `
        <div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">
          <svg viewBox="0 0 36 36" width="${size}" height="${size}" style="position:absolute;inset:0;transform:rotate(-90deg);">
            <circle cx="18" cy="18" r="15" fill="rgba(10,10,10,0.9)" stroke="rgba(255,255,255,0.06)" stroke-width="2"/>
            <circle cx="18" cy="18" r="15" fill="none" stroke="${stageColor}" stroke-width="2.5" stroke-linecap="round"
              stroke-dasharray="${(DEAL_STAGES.indexOf(client.dealStage) + 1) / DEAL_STAGES.length * 94} 94"/>
          </svg>
          <span style="font:bold 10px Inter,system-ui,sans-serif;color:${tColor};z-index:2;position:relative;">${escapeHtml(client.initials)}</span>
        </div>
      `

      el.addEventListener('click', (e) => { e.stopPropagation(); setSelectedClient(client); onSelectClient(client) })
      el.addEventListener('mouseenter', () => setHoveredClient(client))
      el.addEventListener('mouseleave', () => setHoveredClient(null))

      markersRef.current.push(new ml.Marker({ element: el, anchor: 'center' }).setLngLat([lon, lat]).addTo(map))

      // City label for non-Dubai clients
      if (city !== 'Dubai') {
        const label = document.createElement('div')
        label.innerHTML = `<div style="text-align:center;pointer-events:none;white-space:nowrap;">
          <div style="font:bold 10px Inter,system-ui,sans-serif;color:rgba(255,255,255,0.7);text-shadow:0 1px 4px rgba(0,0,0,0.8);">${escapeHtml(client.name.split(' ')[0])}</div>
          <div style="font:9px Inter,system-ui,sans-serif;color:${tColor}99;text-shadow:0 1px 4px rgba(0,0,0,0.8);">${escapeHtml(client.location)}</div>
        </div>`
        markersRef.current.push(new ml.Marker({ element: label, anchor: 'top', offset: [0, size / 2 + 3] }).setLngLat([lon, lat]).addTo(map))
      }
    })

    // Connection arcs to Dubai
    try {
      if (map.getLayer('client-arcs')) map.removeLayer('client-arcs')
      if (map.getSource('client-arcs')) map.removeSource('client-arcs')
    } catch (_) {}

    const arcFeatures: any[] = []
    clientPositions.forEach(({ client, lat, lon }) => {
      const dist = Math.sqrt((lon - 55.27) ** 2 + (lat - 25.20) ** 2)
      if (dist < 2) return
      const coords: number[][] = []
      for (let i = 0; i <= 40; i++) {
        const t = i / 40
        coords.push([lon + (55.27 - lon) * t, lat + (25.20 - lat) * t + Math.sin(t * Math.PI) * dist * 0.12])
      }
      arcFeatures.push({ type: 'Feature', properties: { color: typeColors[client.type] || '#d4a574' }, geometry: { type: 'LineString', coordinates: coords } })
    })

    if (arcFeatures.length > 0) {
      map.addSource('client-arcs', { type: 'geojson', data: { type: 'FeatureCollection', features: arcFeatures } })
      map.addLayer({ id: 'client-arcs', type: 'line', source: 'client-arcs', paint: {
        'line-color': ['get', 'color'], 'line-width': 1, 'line-opacity': 0.25, 'line-dasharray': [4, 3],
      }})
    }

    return () => {
      markersRef.current.forEach(m => m.remove()); markersRef.current = []
      try {
        if (map.getStyle()) {
          if (map.getLayer('client-arcs')) map.removeLayer('client-arcs')
          if (map.getSource('client-arcs')) map.removeSource('client-arcs')
        }
      } catch (_) {}
    }
  }, [clientPositions, mapReady, onSelectClient])

  // Stats
  const uhnwCount = clientList.filter(c => c.type === 'UHNW').length
  const intlCount = clientPositions.filter(c => c.city !== 'Dubai').length

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', minHeight: 400 }}>
      <div ref={mapContainerRef} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' }} />

      <style>{`
        @keyframes pcis-client-pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        .maplibregl-ctrl-group { background: rgba(10,10,10,0.8) !important; border: 1px solid rgba(255,255,255,0.1) !important; border-radius: 8px !important; }
        .maplibregl-ctrl-group button { width: 30px !important; height: 30px !important; }
        .maplibregl-ctrl button .maplibregl-ctrl-icon { filter: invert(1) brightness(0.7); }
      `}</style>

      {/* Top-left stats */}
      <div className="absolute top-4 left-4 z-10 pointer-events-none">
        <div className="bg-[#0a0a0a]/80 backdrop-blur-md border border-pcis-border/30 rounded-xl px-5 py-3.5">
          <div className="flex items-center gap-3 mb-1.5">
            <span className="text-[13px] font-semibold text-pcis-gold tracking-wide">CLIENT GLOBAL MAP</span>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          </div>
          <p className="text-[10px] text-pcis-text-muted">
            {clientList.length} clients · {uhnwCount} UHNW · {intlCount} international
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="absolute top-4 right-16 z-10 pointer-events-none">
        <div className="bg-[#0a0a0a]/80 backdrop-blur-md border border-pcis-border/30 rounded-xl px-4 py-3">
          <p className="text-[9px] text-pcis-text-muted uppercase tracking-wider mb-2">Client Type</p>
          <div className="space-y-1.5">
            {Object.entries(typeColors).map(([label, color]) => (
              <div key={label} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color, opacity: 0.7 }} />
                <span className="text-[9px] text-pcis-text-muted">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Floating client card */}
      {displayClient && (
        <div className="absolute bottom-6 left-6 w-80 bg-[#0a0a0a]/90 backdrop-blur-xl border border-pcis-border/30 rounded-xl p-4 pointer-events-none z-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center border-2"
              style={{ borderColor: typeColors[displayClient.type] || '#d4a574', backgroundColor: '#0a0a0a' }}>
              <span className="text-[12px] font-bold text-white">{displayClient.initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[14px] font-semibold text-pcis-text">{displayClient.name}</p>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px]" style={{ color: typeColors[displayClient.type] }}>{displayClient.type}</span>
                <span className="text-[8px] text-pcis-text-muted">•</span>
                <span className="text-[10px] text-pcis-text-muted">{displayClient.category}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="text-pcis-text-muted">{displayClient.location}</span>
            <span className="text-pcis-text-muted">•</span>
            <span style={{ color: dealStageMapColors[displayClient.dealStage] }}>{displayClient.dealStage}</span>
            <span className="ml-auto text-pcis-gold font-mono">AED {(displayClient.financialProfile.budgetMax / 1_000_000).toFixed(0)}M</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function ClientsPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [detailClient, setDetailClient] = useState<Client | null>(null)
  const [stageOverrides, setStageOverrides] = useState<Record<string, DealStage>>({})

  // ── CIE Live Data ──────────────────────────────────────────
  const { data: cieClients, loading, error, refetch } = useCIEClients()

  // Populate module-level stores from CIE hook data
  // (sub-components read via getEngagement/getProfile shims)
  useMemo(() => {
    _engagementMap.clear()
    _profileMap.clear()

    if (!cieClients || cieClients.length === 0) {
      clients = []
      return
    }

    clients = cieClients.map(cc => {
      const score = cc.overallCIEScore
      const status: EngagementStatus =
        score >= 75 ? 'thriving' :
        score >= 55 ? 'active' :
        score >= 35 ? 'cooling' :
        score >= 15 ? 'cold' : 'dormant'

      _engagementMap.set(cc.client.id, {
        clientId: cc.client.id,
        status,
        momentum: 'stable' as const,
        currentVelocity: cc.signalCount,
        baselineVelocity: Math.max(1, cc.signalCount),
        decayRate: score < 30 ? 50 : score < 50 ? 25 : 0,
        daysSinceContact: 0,
        expectedInterval: 7,
        engagementScore: score,
        readinessScore: score / 100,
      })

      if (cc.profile) {
        _profileMap.set(cc.client.id, cc.profile)
      }

      return cc.client
    })
  }, [cieClients])

  // ── Loading / Error / Empty guards ─────────────────────────
  if (loading) {
    return <P1Loading message="Loading client intelligence..." />
  }

  if (error) {
    return <P1ErrorState message={error} onRetry={refetch} />
  }

  if (clients.length === 0) {
    return (
      <P1EmptyState
        icon="👥"
        title="No Clients Yet"
        description="Add clients through the CIE engine to see cognitive profiles and intelligence here."
        action={{ label: 'Refresh', onClick: refetch }}
      />
    )
  }

  function handleStageChange(clientId: string, newStage: DealStage) {
    setStageOverrides(prev => ({ ...prev, [clientId]: newStage }))
  }

  // Filter and search
  const filteredClients = useMemo(() => {
    let result = filterClients(clients, activeFilter).map(c =>
      stageOverrides[c.id] ? { ...c, dealStage: stageOverrides[c.id] } : c
    )

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.location.toLowerCase().includes(q) ||
        c.type.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      )
    }

    return result
  }, [activeFilter, searchQuery, cieClients])

  // Build grouped sections for grid view
  const sections = useMemo(() => buildSections(filteredClients), [filteredClients])

  // Get detail data for flyout
  const detailData = useMemo(() => {
    if (!detailClient) return null
    const id = detailClient.id

    // Fallback profile/engagement for detail panel (required props)
    const fallbackProfile: CognitiveProfile = {
      clientId: id, scores: [], summary: '', keyTraits: [],
      approachStrategy: '', riskFactors: [], communicationTips: [],
      lastComputed: new Date().toISOString(),
    }
    const fallbackEngagement: EngMetrics = {
      clientId: id, status: 'active', momentum: 'stable',
      currentVelocity: 0, baselineVelocity: 1, decayRate: 0,
      daysSinceContact: 0, expectedInterval: 7,
      engagementScore: 50, readinessScore: 0.5,
    }

    return {
      client: detailClient,
      profile: getProfile(id) || fallbackProfile,
      engagement: getEngagement(id) || fallbackEngagement,
      predictions: getClientPredictions(id),
      signals: getClientSignals(id),
      matches: matches.filter(m => m.clientId === id),
      recommendations: recommendations.filter(r => r.clientId === id),
      relationships: getClientRelationships(id),
      lifecycle: lifecycleData.find(l => l.clientId === id),
    }
  }, [detailClient, cieClients])

  function handleSelectClient(client: Client) {
    setSelectedClientId(client.id)
    setDetailClient(client)
  }

  function handleCloseDetail() {
    setDetailClient(null)
    setSelectedClientId(null)
  }

  return (
    <div
      className="h-full flex flex-col"
      style={viewMode === 'map' ? {
        position: 'relative',
        margin: '-24px', width: 'calc(100% + 48px)', height: 'calc(100% + 48px)',
      } : { position: 'relative' }}
    >
      {/* Page header  - hidden when map is full screen */}
      {viewMode !== 'map' && (
      <div className="flex-shrink-0 bg-pcis-card/40 backdrop-blur-sm border-b border-pcis-border px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-semibold text-pcis-text">Client Intelligence</h1>
            <p className="text-[11px] text-pcis-text-secondary mt-0.5">Living profiles powered by Engine 1  - Cognitive & Engagement Analysis</p>
          </div>
          <div className="flex items-center gap-3">
            <SearchBar value={searchQuery} onChange={setSearchQuery} />
            <div className="flex items-center bg-white/[0.03] border border-pcis-border/40 rounded-lg overflow-hidden">
              {([
                { key: 'dashboard' as ViewMode, label: 'Dashboard' },
                { key: 'pipeline' as ViewMode, label: 'Pipeline' },
                { key: 'map' as ViewMode, label: 'Map' },
                { key: 'grid' as ViewMode, label: 'Grid' },
              ]).map((v, i) => (
                <div key={v.key} className="flex items-center">
                  {i > 0 && <div className="w-px h-5 bg-pcis-border/30" />}
                  <button
                    onClick={() => setViewMode(v.key)}
                    className={`px-3 py-1.5 text-[10px] font-medium transition-colors ${
                      viewMode === v.key ? 'bg-pcis-gold/10 text-pcis-gold' : 'text-pcis-text-muted hover:text-pcis-text'
                    }`}
                  >
                    {v.label}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <BookStats clientList={filteredClients} />

        <div className="flex items-center gap-1.5 mt-4">
          {filters.map(f => {
            const count = filterClients(clients, f.key).length
            return (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`px-3 py-1 rounded-full text-[9px] font-medium transition-all ${
                  activeFilter === f.key
                    ? 'bg-pcis-gold/15 text-pcis-gold border border-pcis-gold/20'
                    : 'text-pcis-text-muted hover:text-pcis-text bg-white/[0.02] border border-pcis-border/20 hover:border-pcis-border/40'
                }`}
                title={f.description}
              >
                {f.label}
                {f.key !== 'all' && (
                  <span className={`ml-1.5 text-[8px] ${activeFilter === f.key ? 'opacity-70' : 'opacity-40'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
      )}

      {/* Floating tab switcher when in Map mode  - centered at top */}
      {viewMode === 'map' && (
        <div style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 20 }}>
          <div className="flex items-center bg-[#0a0a0a]/80 backdrop-blur-md border border-pcis-border/40 rounded-lg overflow-hidden">
            {([
              { key: 'dashboard' as ViewMode, label: 'Dashboard' },
              { key: 'pipeline' as ViewMode, label: 'Pipeline' },
              { key: 'map' as ViewMode, label: 'Map' },
              { key: 'grid' as ViewMode, label: 'Grid' },
            ]).map((v, i) => (
              <div key={v.key} className="flex items-center">
                {i > 0 && <div className="w-px h-5 bg-pcis-border/30" />}
                <button
                  onClick={() => setViewMode(v.key)}
                  className={`px-3.5 py-2 text-[10px] font-medium transition-colors ${
                    viewMode === v.key ? 'bg-pcis-gold/10 text-pcis-gold' : 'text-pcis-text-muted hover:text-pcis-text'
                  }`}
                >
                  {v.label}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content area */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative', minHeight: 0 }}>
        {/* Map view  - always mounted, toggled with visibility */}
        <div
          style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            width: '100%', height: '100%',
            visibility: viewMode === 'map' ? 'visible' : 'hidden',
            zIndex: viewMode === 'map' ? 10 : 0,
          }}
        >
          <ClientWorldMap
            clientList={filteredClients}
            onSelectClient={handleSelectClient}
            isVisible={viewMode === 'map'}
          />
        </div>

        {/* Other views */}
        <div className="h-full overflow-y-auto" style={{ display: viewMode === 'map' ? 'none' : 'block' }}>
          {viewMode === 'dashboard' ? (
            <DashboardView
              clientList={filteredClients}
              onSelectClient={handleSelectClient}
            />
          ) : viewMode === 'grid' ? (
            <GroupedGridView
              sections={sections}
              selectedClientId={selectedClientId}
              onSelectClient={handleSelectClient}
            />
          ) : viewMode === 'pipeline' ? (
            <PipelineView
              clientList={filteredClients}
              onSelectClient={handleSelectClient}
              onStageChange={handleStageChange}
            />
          ) : null}
        </div>
      </div>

      {/* Detail flyout */}
      {detailClient && detailData && (
        <ClientDetailPanel
          {...detailData}
          onClose={handleCloseDetail}
          dealStage={detailClient.dealStage}
          dealStageChangedAt={detailClient.dealStageChangedAt}
          nextTouch={getNextTouch(detailClient.id)}
        />
      )}
    </div>
  )
}
