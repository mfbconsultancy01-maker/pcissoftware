'use client'

import { useEffect, useRef, useState } from 'react'
import type {
  Client, CognitiveProfile, CognitiveScore, EngagementMetrics,
  Prediction, Signal, Match, Recommendation, Relationship, LifecycleData,
  EngagementStatus, DealStage, ActivityRecord, NextTouch, ClientNote,
} from '@/lib/mockData'
import {
  getClient, properties, DEAL_STAGES, dealStageColors,
  getClientActivities, getNextTouch, getClientNotes, activities as allActivities,
  nextTouches, clientNotes as allClientNotes,
} from '@/lib/mockData'
import {
  getCIEClient,
  ARCHETYPES,
  DIMENSION_META,
  pciscomSignals,
  type CIEClient,
} from '@/lib/cieData'

// ============================================================
// STATUS PALETTE
// ============================================================

const statusColors: Record<EngagementStatus, string> = {
  thriving: '#22c55e',
  active: '#06b6d4',
  cooling: '#f59e0b',
  cold: '#3b82f6',
  dormant: '#6b7280',
}

// ============================================================
// CIE SCORE RING — SVG donut for CIE score
// ============================================================

function CIEScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const r = (size - 10) / 2
  const circumference = 2 * Math.PI * r
  const progress = (score / 100) * circumference
  const color = score >= 70 ? '#22c55e' : score >= 50 ? '#d4a574' : score >= 30 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90" style={{ width: size, height: size }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="4" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color}
          strokeWidth="4" strokeLinecap="round"
          strokeDasharray={`${progress} ${circumference}`}
          style={{ transition: 'stroke-dasharray 1s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold font-mono" style={{ color }}>{score}</span>
        <span className="text-[7px] text-pcis-text-muted uppercase tracking-wider">CIE</span>
      </div>
    </div>
  )
}

// ============================================================
// COGNITIVE RADAR CHART — canvas-based 12-axis
// ============================================================

function CognitiveRadar({ scores }: { scores: CognitiveScore[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef(0)
  const progressRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const dpr = 2
    const size = 200
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const maxR = size / 2 - 28
    const axes = scores.length

    progressRef.current = 0

    function draw() {
      progressRef.current = Math.min(1, progressRef.current + 0.025)
      const t = progressRef.current
      const ease = 1 - Math.pow(1 - t, 3)

      ctx.clearRect(0, 0, size, size)

      // Grid rings
      for (let ring = 1; ring <= 4; ring++) {
        const r = (ring / 4) * maxR
        ctx.strokeStyle = 'rgba(255,255,255,0.04)'
        ctx.lineWidth = 0.5
        ctx.beginPath()
        for (let i = 0; i <= axes; i++) {
          const angle = (i / axes) * Math.PI * 2 - Math.PI / 2
          const px = cx + Math.cos(angle) * r
          const py = cy + Math.sin(angle) * r
          if (i === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
        ctx.stroke()
      }

      // Axis lines + labels
      scores.forEach((score, i) => {
        const angle = (i / axes) * Math.PI * 2 - Math.PI / 2
        const ex = cx + Math.cos(angle) * maxR
        const ey = cy + Math.sin(angle) * maxR

        ctx.strokeStyle = 'rgba(255,255,255,0.06)'
        ctx.lineWidth = 0.5
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(ex, ey)
        ctx.stroke()

        const lx = cx + Math.cos(angle) * (maxR + 15)
        const ly = cy + Math.sin(angle) * (maxR + 15)
        ctx.fillStyle = 'rgba(255,255,255,0.35)'
        ctx.font = '7px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        const shortLabels: Record<string, string> = {
          'Trust Formation': 'Trust',
          'Risk Tolerance': 'Risk',
          'Decision Velocity': 'Speed',
          'Price Sensitivity': 'Price',
          'Status Orientation': 'Status',
          'Privacy Need': 'Privacy',
          'Detail Orientation': 'Detail',
          'Emotional Driver': 'Emotion',
          'Negotiation Style': 'Negot.',
          'Loyalty Tendency': 'Loyalty',
          'Innovation Appetite': 'Innov.',
          'Social Proof Need': 'Social',
        }
        ctx.fillText(shortLabels[score.dimension] || score.dimension.slice(0, 6), lx, ly)
      })

      // Data polygon — fill
      ctx.fillStyle = 'rgba(212,165,116,0.08)'
      ctx.beginPath()
      scores.forEach((score, i) => {
        const angle = (i / axes) * Math.PI * 2 - Math.PI / 2
        const r = (score.value / 100) * maxR * ease
        const px = cx + Math.cos(angle) * r
        const py = cy + Math.sin(angle) * r
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      })
      ctx.closePath()
      ctx.fill()

      // Data polygon — stroke
      ctx.strokeStyle = 'rgba(212,165,116,0.6)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      scores.forEach((score, i) => {
        const angle = (i / axes) * Math.PI * 2 - Math.PI / 2
        const r = (score.value / 100) * maxR * ease
        const px = cx + Math.cos(angle) * r
        const py = cy + Math.sin(angle) * r
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      })
      ctx.closePath()
      ctx.stroke()

      // Data points with trend indicators
      scores.forEach((score, i) => {
        const angle = (i / axes) * Math.PI * 2 - Math.PI / 2
        const r = (score.value / 100) * maxR * ease
        const px = cx + Math.cos(angle) * r
        const py = cy + Math.sin(angle) * r

        ctx.fillStyle = score.trend === 'rising' ? '#22c55e'
          : score.trend === 'falling' ? '#ef4444'
          : '#d4a574'
        ctx.beginPath()
        ctx.arc(px, py, 2.5, 0, Math.PI * 2)
        ctx.fill()

        ctx.globalAlpha = 0.3
        ctx.beginPath()
        ctx.arc(px, py, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 1
      })

      if (t < 1) {
        animRef.current = requestAnimationFrame(draw)
      }
    }

    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [scores])

  return <canvas ref={canvasRef} style={{ width: 200, height: 200 }} />
}

// ============================================================
// SIGNAL TIMELINE — vertical feed
// ============================================================

function SignalTimeline({ signals }: { signals: Signal[] }) {
  const typeIcons: Record<string, { icon: string; color: string }> = {
    viewing: { icon: '◉', color: 'text-cyan-400' },
    inquiry: { icon: '◆', color: 'text-pcis-gold' },
    meeting: { icon: '◈', color: 'text-green-400' },
    offer: { icon: '★', color: 'text-purple-400' },
    feedback: { icon: '◎', color: 'text-blue-400' },
    referral: { icon: '◇', color: 'text-amber-400' },
    financial: { icon: '◉', color: 'text-emerald-400' },
    lifecycle: { icon: '○', color: 'text-pcis-text-muted' },
  }

  function timeAgo(ts: string) {
    const diff = Date.now() - new Date(ts).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  return (
    <div className="space-y-0">
      {signals.map((signal, i) => {
        const meta = typeIcons[signal.type] || typeIcons.lifecycle
        return (
          <div key={signal.id} className="flex items-start gap-2.5 py-2 border-b border-pcis-border/20 last:border-0">
            <div className="flex flex-col items-center flex-shrink-0 pt-0.5">
              <span className={`text-[10px] ${meta.color}`}>{meta.icon}</span>
              {i < signals.length - 1 && (
                <div className="w-px h-full bg-pcis-border/20 mt-1" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[8px] font-semibold text-pcis-text-muted uppercase tracking-wider">{signal.type}</span>
                <span className="text-[8px] text-pcis-text-muted/50 font-mono">{timeAgo(signal.timestamp)}</span>
              </div>
              <p className="text-[10px] text-pcis-text-secondary leading-relaxed mt-0.5">{signal.content}</p>
              {signal.impact.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {signal.impact.map((imp, j) => (
                    <span
                      key={j}
                      className={`text-[7px] px-1 py-0.5 rounded ${
                        imp.delta > 0 ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'
                      }`}
                    >
                      {imp.dimension} {imp.delta > 0 ? '+' : ''}{imp.delta}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
      {signals.length === 0 && (
        <p className="text-[10px] text-pcis-text-muted/50 text-center py-4">No recent signals</p>
      )}
    </div>
  )
}

// ============================================================
// MATCH CARD — mini property match
// ============================================================

function MatchCard({ match }: { match: Match }) {
  const property = properties.find(p => p.id === match.propertyId)
  if (!property) return null

  const gradeColors: Record<string, string> = {
    'A+': 'text-green-400 bg-green-500/15',
    'A': 'text-green-400 bg-green-500/10',
    'B+': 'text-cyan-400 bg-cyan-500/10',
    'B': 'text-blue-400 bg-blue-500/10',
    'C': 'text-amber-400 bg-amber-500/10',
    'D': 'text-red-400 bg-red-500/10',
  }

  return (
    <div className="bg-white/[0.02] border border-pcis-border/30 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-pcis-text">{property.name}</span>
        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${gradeColors[match.grade] || ''}`}>
          {match.grade}
        </span>
      </div>
      <p className="text-[9px] text-pcis-text-muted mt-0.5">{property.area} · {property.bedrooms}BR · AED {(property.price / 1_000_000).toFixed(0)}M</p>

      <div className="grid grid-cols-4 gap-1.5 mt-2">
        {Object.entries(match.pillars).map(([key, val]) => (
          <div key={key}>
            <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-pcis-gold/60"
                style={{ width: `${val * 100}%` }}
              />
            </div>
            <span className="text-[6px] text-pcis-text-muted/50 uppercase mt-0.5 block text-center">
              {key === 'clientFit' ? 'Fit' : key === 'financial' ? 'Fin' : key === 'value' ? 'Val' : 'Time'}
            </span>
          </div>
        ))}
      </div>

      <p className="text-[8px] text-pcis-text-muted/70 mt-2 leading-relaxed line-clamp-2">{match.aiIntelligence}</p>
    </div>
  )
}

// ============================================================
// MAIN PANEL
// ============================================================

export interface ClientDetailPanelProps {
  client: Client
  profile: CognitiveProfile
  engagement: EngagementMetrics
  predictions: Prediction[]
  signals: Signal[]
  matches: Match[]
  recommendations: Recommendation[]
  relationships: Relationship[]
  lifecycle: LifecycleData | undefined
  dealStage: DealStage
  dealStageChangedAt: string
  nextTouch?: NextTouch
  onClose: () => void
}

export default function ClientDetailPanel({
  client, profile, engagement, predictions, signals, matches,
  recommendations, relationships, lifecycle, dealStage, dealStageChangedAt, nextTouch, onClose,
}: ClientDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'matches' | 'actions' | 'notes'>('overview')
  const [visible, setVisible] = useState(false)
  const [quickAction, setQuickAction] = useState<string | null>(null)
  const [timelineFilter, setTimelineFilter] = useState<'All' | 'Calls' | 'Emails' | 'Meetings' | 'Signals'>('All')
  const [localActivities, setLocalActivities] = useState<ActivityRecord[]>([])
  const [localNotes, setLocalNotes] = useState<ClientNote[]>([])
  const [formDuration, setFormDuration] = useState('')
  const [formOutcome, setFormOutcome] = useState<'positive' | 'neutral' | 'negative'>('positive')
  const [formSubject, setFormSubject] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formMeetingType, setFormMeetingType] = useState('In-person')
  const [formNotes, setFormNotes] = useState('')

  // CIE Data
  const cieClient = getCIEClient(client.id)
  const archetype = cieClient ? ARCHETYPES.find(a => a.id === cieClient.archetype) : null
  const archetypeColor = archetype?.color || '#6b7280'
  const cieScore = cieClient?.overallCIEScore ?? 0
  const clientPciscomSignals = pciscomSignals.filter(s => s.clientId === client.id)

  function handleSaveAction() {
    if (!quickAction) return
    const now = new Date().toISOString()
    const id = `local-${Date.now()}`

    if (quickAction === 'call') {
      const entry: ActivityRecord = {
        id, clientId: client.id, type: 'call', timestamp: now,
        title: 'Phone Call', content: formNotes || 'Call logged',
        duration: parseInt(formDuration) || undefined,
        outcome: formOutcome,
      }
      setLocalActivities(prev => [entry, ...prev])
    } else if (quickAction === 'email') {
      const entry: ActivityRecord = {
        id, clientId: client.id, type: 'email', timestamp: now,
        title: formSubject || 'Email', content: formNotes || 'Email logged',
      }
      setLocalActivities(prev => [entry, ...prev])
    } else if (quickAction === 'meeting') {
      const entry: ActivityRecord = {
        id, clientId: client.id, type: 'meeting', timestamp: now,
        title: `${formMeetingType} Meeting`, content: formNotes || 'Meeting scheduled',
        attendees: [client.name],
      }
      setLocalActivities(prev => [entry, ...prev])
    } else if (quickAction === 'note') {
      const note: ClientNote = {
        id, clientId: client.id, timestamp: now,
        content: formNotes || 'Note added', tags: [], isPinned: false,
      }
      setLocalNotes(prev => [note, ...prev])
    }
    setFormDuration(''); setFormOutcome('positive'); setFormSubject('')
    setFormDate(''); setFormMeetingType('In-person'); setFormNotes('')
    setQuickAction(null)
  }

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true))
  }, [])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 300)
  }

  const statusColor = statusColors[engagement.status] || '#6b7280'

  const relPartners = relationships.map(rel => {
    const partnerId = rel.fromClientId === client.id ? rel.toClientId : rel.fromClientId
    const partner = getClient(partnerId)
    return { ...rel, partnerName: partner?.name ?? partnerId }
  })

  const tabs = [
    { key: 'overview' as const, label: 'Overview' },
    { key: 'timeline' as const, label: `Timeline (${signals.length + getClientActivities(client.id).length + localActivities.filter(a => a.clientId === client.id).length})` },
    { key: 'matches' as const, label: `Matches (${matches.length})` },
    { key: 'actions' as const, label: `Actions (${recommendations.length})` },
    { key: 'notes' as const, label: `Notes (${getClientNotes(client.id).length + localNotes.filter(n => n.clientId === client.id).length})` },
  ]

  const momentumArrow = cieClient?.engagement?.momentum === 'heating' ? '▲' : cieClient?.engagement?.momentum === 'cooling' ? '▼' : '→'
  const momentumColor = cieClient?.engagement?.momentum === 'heating' ? '#22c55e' : cieClient?.engagement?.momentum === 'cooling' ? '#ef4444' : '#6b7280'

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
        onClick={handleClose}
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-12 h-[calc(100%-48px)] w-[580px] max-w-[90vw] bg-[#080808] border-l border-pcis-border/40 z-50 overflow-y-auto transition-transform duration-300 ease-out ${
          visible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* ===== CIE-POWERED HEADER ===== */}
        <div className="sticky top-0 bg-[#080808]/95 backdrop-blur-md border-b border-pcis-border/30 z-10 px-6 pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4 flex-1">
              {/* CIE Score Ring */}
              <CIEScoreRing score={cieScore} size={68} />

              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-pcis-text-primary">{client.name}</h2>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-pcis-gold/10 text-pcis-gold border border-pcis-gold/20">
                    {client.type}
                  </span>
                  {archetype && (
                    <span
                      className="text-[10px] font-mono px-2 py-0.5 rounded border"
                      style={{ color: archetypeColor, borderColor: archetypeColor + '40', backgroundColor: archetypeColor + '10' }}
                    >
                      {archetype.label}
                    </span>
                  )}
                  <span
                    className="text-[10px] font-mono px-2 py-0.5 rounded border"
                    style={{ color: statusColor, borderColor: statusColor + '40', backgroundColor: statusColor + '10' }}
                  >
                    {engagement.status}
                  </span>
                  <span className="text-[10px] font-mono" style={{ color: momentumColor }}>
                    {momentumArrow}
                  </span>
                </div>
                <p className="text-[10px] text-pcis-text-muted mt-1">{client.location}</p>
              </div>
            </div>

            <button
              onClick={handleClose}
              className="w-8 h-8 rounded bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors flex-shrink-0"
            >
              <span className="text-pcis-text-muted text-sm">×</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 pt-3 border-t border-pcis-border/20">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-3 py-1.5 rounded text-[10px] font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'bg-pcis-gold/10 text-pcis-gold border border-pcis-gold/20'
                    : 'text-pcis-text-muted hover:text-pcis-text-secondary hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quick Action Bar */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-pcis-border/20 bg-white/[0.01]">
          {[
            { label: 'Log Call', icon: '◉', action: 'call' },
            { label: 'Send Email', icon: '✉', action: 'email' },
            { label: 'Schedule', icon: '◆', action: 'meeting' },
            { label: 'Add Note', icon: '✎', action: 'note' },
          ].map(btn => (
            <button
              key={btn.action}
              onClick={() => setQuickAction(quickAction === btn.action ? null : btn.action)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-medium transition-all border ${
                quickAction === btn.action
                  ? 'border-pcis-gold/40 bg-pcis-gold/10 text-pcis-gold'
                  : 'border-pcis-border/30 text-pcis-text-muted hover:border-pcis-gold/20 hover:text-pcis-gold'
              }`}
            >
              <span className="text-[9px]">{btn.icon}</span>
              {btn.label}
            </button>
          ))}
        </div>

        {/* Quick Action Inline Form */}
        {quickAction && (
          <div className="px-6 py-4 border-b border-pcis-border/20 bg-pcis-gold/[0.02]">
            <div className="space-y-3">
              {quickAction === 'call' && (
                <>
                  <p className="text-[10px] text-pcis-gold font-semibold uppercase tracking-wider">Log Call</p>
                  <div className="flex gap-3">
                    <input type="number" placeholder="Duration (min)" value={formDuration} onChange={e => setFormDuration(e.target.value)} className="flex-1 bg-white/[0.04] border border-pcis-border/30 rounded px-3 py-2 text-[11px] text-pcis-text placeholder-pcis-text-muted/50 focus:outline-none focus:border-pcis-gold/30" />
                    <select value={formOutcome} onChange={e => setFormOutcome(e.target.value as 'positive' | 'neutral' | 'negative')} className="bg-white/[0.04] border border-pcis-border/30 rounded px-3 py-2 text-[11px] text-pcis-text focus:outline-none focus:border-pcis-gold/30">
                      <option value="positive">Positive</option>
                      <option value="neutral">Neutral</option>
                      <option value="negative">Negative</option>
                    </select>
                  </div>
                </>
              )}
              {quickAction === 'email' && (
                <>
                  <p className="text-[10px] text-pcis-gold font-semibold uppercase tracking-wider">Log Email</p>
                  <input type="text" placeholder="Subject" value={formSubject} onChange={e => setFormSubject(e.target.value)} className="w-full bg-white/[0.04] border border-pcis-border/30 rounded px-3 py-2 text-[11px] text-pcis-text placeholder-pcis-text-muted/50 focus:outline-none focus:border-pcis-gold/30" />
                </>
              )}
              {quickAction === 'meeting' && (
                <>
                  <p className="text-[10px] text-pcis-gold font-semibold uppercase tracking-wider">Schedule Meeting</p>
                  <div className="flex gap-3">
                    <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} className="flex-1 bg-white/[0.04] border border-pcis-border/30 rounded px-3 py-2 text-[11px] text-pcis-text focus:outline-none focus:border-pcis-gold/30" />
                    <select value={formMeetingType} onChange={e => setFormMeetingType(e.target.value)} className="bg-white/[0.04] border border-pcis-border/30 rounded px-3 py-2 text-[11px] text-pcis-text focus:outline-none focus:border-pcis-gold/30">
                      <option>In-person</option>
                      <option>Virtual</option>
                      <option>Property Viewing</option>
                    </select>
                  </div>
                </>
              )}
              {quickAction === 'note' && (
                <p className="text-[10px] text-pcis-gold font-semibold uppercase tracking-wider">Add Note</p>
              )}
              <textarea placeholder="Notes..." rows={2} value={formNotes} onChange={e => setFormNotes(e.target.value)} className="w-full bg-white/[0.04] border border-pcis-border/30 rounded px-3 py-2 text-[11px] text-pcis-text placeholder-pcis-text-muted/50 focus:outline-none focus:border-pcis-gold/30 resize-none" />
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveAction}
                  className="px-4 py-1.5 rounded text-[10px] font-medium bg-pcis-gold/20 text-pcis-gold hover:bg-pcis-gold/30 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => { setQuickAction(null); setFormNotes(''); setFormDuration(''); setFormSubject(''); setFormDate(''); }}
                  className="px-4 py-1.5 rounded text-[10px] font-medium text-pcis-text-muted hover:text-pcis-text transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="px-6 py-5">
          {/* ============= OVERVIEW TAB ============= */}
          {activeTab === 'overview' && (
            <div className="space-y-5">

              {/* CIE Intelligence Summary */}
              {archetype && (
                <div className="border border-pcis-border/30 bg-white/[0.02] rounded p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-[3px] h-3.5 rounded-full" style={{ backgroundColor: archetypeColor }} />
                    <h3 className="text-[11px] font-semibold text-pcis-text-primary uppercase tracking-wider">Cognitive Intelligence</h3>
                    <span className="text-[9px] font-mono text-pcis-text-muted ml-auto">E1 · CIE</span>
                  </div>
                  <p className="text-[11px] text-pcis-text-secondary leading-relaxed mb-3">{archetype.description}</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[8px] text-pcis-text-muted uppercase tracking-wider mb-1.5">Strengths</p>
                      {archetype.strengths.map((s, i) => (
                        <p key={i} className="text-[10px] text-green-400/80 flex items-start gap-1.5 mb-0.5">
                          <span className="text-[7px] mt-0.5">●</span> {s}
                        </p>
                      ))}
                    </div>
                    <div>
                      <p className="text-[8px] text-pcis-text-muted uppercase tracking-wider mb-1.5">Risks</p>
                      {archetype.risks.map((r, i) => (
                        <p key={i} className="text-[10px] text-red-400/80 flex items-start gap-1.5 mb-0.5">
                          <span className="text-[7px] mt-0.5">●</span> {r}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Deal Stage Progress */}
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  {DEAL_STAGES.map((stage, i) => {
                    const isActive = stage === dealStage
                    const isPast = DEAL_STAGES.indexOf(dealStage) > i
                    const color = dealStageColors[stage]
                    return (
                      <div key={stage} className="flex items-center flex-1">
                        <div className="flex-1 relative">
                          <div className="h-2 rounded-full" style={{
                            backgroundColor: isPast || isActive ? color : 'rgba(255,255,255,0.04)',
                            boxShadow: isActive ? `0 0 10px ${color}40` : 'none',
                          }} />
                          {isActive && (
                            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-5 h-5 rounded-full border-2 flex items-center justify-center" style={{ borderColor: color, backgroundColor: '#080808' }}>
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                            </div>
                          )}
                        </div>
                        {i < DEAL_STAGES.length - 1 && <div className="w-1.5" />}
                      </div>
                    )
                  })}
                </div>
                <div className="flex justify-between mt-1">
                  {DEAL_STAGES.map(stage => (
                    <span key={stage} className={`text-[8px] ${stage === dealStage ? 'font-semibold' : 'text-pcis-text-muted/50'}`}
                      style={{ color: stage === dealStage ? dealStageColors[stage] : undefined }}>
                      {stage}
                    </span>
                  ))}
                </div>
                <p className="text-[9px] text-pcis-text-muted mt-2">
                  In <span style={{ color: dealStageColors[dealStage] }}>{dealStage}</span> since {Math.floor((Date.now() - new Date(dealStageChangedAt).getTime()) / 86400000)} days
                </p>
              </div>

              {/* Key stats row — CIE Enhanced */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: 'CIE Score', value: cieScore, suffix: '', color: '#d4a574' },
                  { label: 'Engagement', value: engagement.engagementScore, suffix: '', color: statusColor },
                  { label: 'Readiness', value: Math.round(engagement.readinessScore * 100), suffix: '%', color: '#a78bfa' },
                  { label: 'Decay', value: engagement.decayRate, suffix: '%', color: engagement.decayRate > 50 ? '#ef4444' : '#f59e0b' },
                ].map(stat => (
                  <div key={stat.label} className="bg-white/[0.02] border border-pcis-border/30 rounded p-3 text-center">
                    <span className="text-lg font-bold font-mono" style={{ color: stat.color }}>
                      {stat.value}
                    </span>
                    <span className="text-[10px] text-pcis-text-muted" style={{ color: stat.color }}>{stat.suffix}</span>
                    <p className="text-[8px] text-pcis-text-muted uppercase tracking-wider mt-1">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Next Touch */}
              {nextTouch && (() => {
                const touchDate = new Date(nextTouch.date)
                const diffDays = Math.ceil((touchDate.getTime() - Date.now()) / 86400000)
                const isOverdue = diffDays < 0
                const color = isOverdue ? '#ef4444' : diffDays === 0 ? '#d4a574' : diffDays <= 2 ? '#f59e0b' : '#22c55e'
                return (
                  <div className="p-3.5 rounded border" style={{ borderColor: color + '30', backgroundColor: color + '06' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[12px]" style={{ color }}>
                          {nextTouch.type === 'call' ? '◉' : nextTouch.type === 'meeting' ? '◆' : nextTouch.type === 'viewing' ? '◈' : '○'}
                        </span>
                        <span className="text-[10px] text-pcis-text-secondary uppercase tracking-wider">Next Touch</span>
                      </div>
                      <span className={`text-[11px] font-mono font-bold ${isOverdue ? 'animate-pulse' : ''}`} style={{ color }}>
                        {isOverdue ? `OVERDUE ${Math.abs(diffDays)}d` : diffDays === 0 ? 'TODAY' : `in ${diffDays}d`}
                      </span>
                    </div>
                    <p className="text-[10px] text-pcis-text mt-1.5">{nextTouch.reason}</p>
                    <p className="text-[9px] text-pcis-text-muted mt-1">{touchDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} · {nextTouch.type}</p>
                  </div>
                )
              })()}

              {/* 12-Dimension Grid (3 cols × 4 rows) */}
              <div className="border border-pcis-border/30 bg-white/[0.02] rounded p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-[3px] h-3.5 rounded-full bg-pcis-gold" />
                  <h3 className="text-[11px] font-semibold text-pcis-text-primary uppercase tracking-wider">12 Cognitive Dimensions</h3>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {DIMENSION_META.map((meta) => {
                    const dimScore = profile.scores.find(s => s.dimension === meta.name)
                    const score = dimScore?.value || 0
                    const confidence = dimScore?.confidence || 0
                    const trend = dimScore?.trend || 'stable'

                    const trendSymbol = trend === 'rising' ? '▲' : trend === 'falling' ? '▼' : '→'
                    const trendColor = trend === 'rising' ? '#22c55e' : trend === 'falling' ? '#ef4444' : '#6b7280'
                    const barColor = score >= 70 ? 'bg-green-500/60' : score >= 40 ? 'bg-amber-500/60' : 'bg-pcis-text-muted/30'

                    return (
                      <div key={meta.name} className="border border-pcis-border/20 bg-white/[0.01] rounded p-2">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[8px] font-mono text-pcis-text-muted">{meta.shortCode}</span>
                          <span className="text-[8px] font-mono" style={{ color: trendColor }}>{trendSymbol}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[11px] font-mono font-bold text-pcis-gold">{score}</span>
                          <span className="text-[7px] text-pcis-text-muted">{confidence}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-pcis-border/20 rounded overflow-hidden">
                          <div className={`h-full ${barColor} transition-all`} style={{ width: `${score}%` }} />
                        </div>
                        <p className="text-[7px] text-pcis-text-muted mt-1 leading-tight truncate">{meta.name}</p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Cognitive Radar + Summary side by side */}
              <div className="border border-pcis-border/30 bg-white/[0.02] rounded p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-[3px] h-3.5 rounded-full bg-purple-500" />
                  <h3 className="text-[11px] font-semibold text-pcis-text-primary uppercase tracking-wider">Cognitive Radar</h3>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <CognitiveRadar scores={profile.scores} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-pcis-text-secondary leading-relaxed mb-3">{profile.summary}</p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {profile.keyTraits.map(trait => (
                        <span key={trait} className="text-[8px] text-pcis-gold/80 bg-pcis-gold/[0.08] px-2 py-0.5 rounded">{trait}</span>
                      ))}
                    </div>

                    {/* Top / Bottom Dimensions */}
                    {cieClient && (
                      <div className="space-y-2">
                        <div>
                          <p className="text-[7px] text-pcis-text-muted uppercase tracking-wider mb-1">Top Dimensions</p>
                          {cieClient.topDimensions.slice(0, 3).map((d, i) => (
                            <div key={i} className="flex items-center gap-2 mb-0.5">
                              <span className="text-[8px] font-mono text-green-400 w-5">{d.value}</span>
                              <span className="text-[8px] text-pcis-text-secondary">{d.dimension}</span>
                            </div>
                          ))}
                        </div>
                        <div>
                          <p className="text-[7px] text-pcis-text-muted uppercase tracking-wider mb-1">Needs Attention</p>
                          {cieClient.bottomDimensions.slice(0, 3).map((d, i) => (
                            <div key={i} className="flex items-center gap-2 mb-0.5">
                              <span className="text-[8px] font-mono text-red-400/70 w-5">{d.value}</span>
                              <span className="text-[8px] text-pcis-text-secondary">{d.dimension}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Financial profile */}
              <div className="bg-white/[0.02] border border-pcis-border/30 rounded p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-[3px] h-3.5 rounded-full bg-emerald-500" />
                  <h3 className="text-[11px] font-semibold text-pcis-text-primary uppercase tracking-wider">Financial Profile</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-lg font-mono font-bold text-pcis-text">
                      {(client.financialProfile.portfolioValue / 1_000_000).toFixed(0)}M
                    </p>
                    <p className="text-[9px] text-pcis-text-muted mt-0.5">Portfolio Value</p>
                  </div>
                  <div>
                    <p className="text-sm font-mono text-pcis-text-secondary">
                      {(client.financialProfile.budgetMin / 1_000_000).toFixed(0)}–{(client.financialProfile.budgetMax / 1_000_000).toFixed(0)}M
                    </p>
                    <p className="text-[9px] text-pcis-text-muted mt-0.5">Budget Range</p>
                  </div>
                  <div>
                    <p className="text-sm font-mono text-pcis-text-secondary">{client.financialProfile.currency}</p>
                    <p className="text-[9px] text-pcis-text-muted mt-0.5">Currency</p>
                  </div>
                </div>
              </div>

              {/* AI Approach strategy */}
              <div className="bg-white/[0.02] border border-pcis-border/30 rounded p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-[3px] h-3.5 rounded-full bg-cyan-500" />
                  <h3 className="text-[11px] font-semibold text-pcis-text-primary uppercase tracking-wider">AI Approach Strategy</h3>
                </div>
                <p className="text-[11px] text-pcis-text-secondary leading-relaxed">{profile.approachStrategy}</p>
                {profile.communicationTips.length > 0 && (
                  <div className="mt-3 space-y-1">
                    {profile.communicationTips.map((tip, i) => (
                      <p key={i} className="text-[10px] text-pcis-gold/70 flex items-start gap-1.5">
                        <span className="text-[7px] mt-0.5">◆</span> {tip}
                      </p>
                    ))}
                  </div>
                )}
                {profile.riskFactors[0] !== 'Standard monitoring' && (
                  <div className="mt-3">
                    <p className="text-[8px] text-pcis-text-muted uppercase tracking-wider mb-1.5">Risk Factors</p>
                    <div className="flex flex-wrap gap-1">
                      {profile.riskFactors.map((r, i) => (
                        <span key={i} className="text-[9px] text-red-400/70 bg-red-500/[0.06] px-2 py-0.5 rounded">{r}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* PCISCOM Signals */}
              {clientPciscomSignals.length > 0 && (
                <div className="bg-white/[0.02] border border-pcis-border/30 rounded p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-[3px] h-3.5 rounded-full bg-blue-500" />
                    <h3 className="text-[11px] font-semibold text-pcis-text-primary uppercase tracking-wider">PCISCOM Signals</h3>
                    <span className="text-[8px] font-mono text-pcis-text-muted ml-auto">WhatsApp</span>
                  </div>
                  <div className="space-y-2">
                    {clientPciscomSignals.map((signal, i) => (
                      <div key={i} className="border border-pcis-border/20 bg-white/[0.01] rounded p-2.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-medium text-pcis-text-primary">{signal.intent.replace(/_/g, ' ')}</span>
                          <span className="text-[8px] text-pcis-text-muted font-mono">{new Date(signal.timestamp).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[8px] text-pcis-text-muted">Sentiment</span>
                          <div className="flex-1 h-1.5 bg-pcis-border/20 rounded overflow-hidden">
                            <div className="h-full bg-blue-500/60 rounded" style={{ width: `${signal.sentiment * 100}%` }} />
                          </div>
                          <span className="text-[8px] font-mono text-pcis-gold">{Math.round(signal.sentiment * 100)}%</span>
                        </div>
                        {signal.dimensionImpacts.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {signal.dimensionImpacts.map((dim, j) => (
                              <span key={j} className={`text-[7px] px-1.5 py-0.5 rounded ${dim.delta > 0 ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                                {dim.dimension} {dim.delta > 0 ? '+' : ''}{dim.delta}
                              </span>
                            ))}
                          </div>
                        )}
                        {signal.riskFlags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {signal.riskFlags.map((flag, j) => (
                              <span key={j} className="text-[7px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">{flag}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Active predictions */}
              {predictions.length > 0 && (
                <div className="bg-white/[0.02] border border-pcis-border/30 rounded p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-[3px] h-3.5 rounded-full bg-amber-500" />
                    <h3 className="text-[11px] font-semibold text-pcis-text-primary uppercase tracking-wider">Active Predictions</h3>
                  </div>
                  <div className="space-y-2.5">
                    {predictions.map((pred, i) => (
                      <div key={i} className="flex items-start gap-3 py-2 border-b border-pcis-border/20 last:border-0">
                        <div className="relative w-10 h-10 flex-shrink-0">
                          <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90">
                            <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
                            <circle cx="18" cy="18" r="15" fill="none" stroke={pred.confidence >= 70 ? '#22c55e' : '#f59e0b'}
                              strokeWidth="3" strokeLinecap="round"
                              strokeDasharray={`${(pred.confidence / 100) * 94} 94`}
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-pcis-text">
                            {pred.confidence}
                          </span>
                        </div>
                        <div className="flex-1">
                          <span className="text-[11px] font-semibold text-pcis-text">{pred.pattern}</span>
                          <p className="text-[10px] text-pcis-text-muted leading-relaxed mt-0.5">{pred.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Relationships */}
              {relPartners.length > 0 && (
                <div className="bg-white/[0.02] border border-pcis-border/30 rounded p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-[3px] h-3.5 rounded-full bg-teal-500" />
                    <h3 className="text-[11px] font-semibold text-pcis-text-primary uppercase tracking-wider">Relationships</h3>
                  </div>
                  <div className="space-y-2">
                    {relPartners.map(rel => (
                      <div key={rel.id} className="flex items-center justify-between py-2 border-b border-pcis-border/20 last:border-0">
                        <div>
                          <span className="text-[11px] font-medium text-pcis-text">{rel.partnerName}</span>
                          <span className="text-[9px] text-pcis-text-muted ml-2">{rel.type}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[9px] text-pcis-text-muted">Influence</span>
                            <div className="w-12 h-1.5 bg-white/[0.06] rounded-full overflow-hidden mt-0.5">
                              <div className="h-full rounded-full bg-pcis-gold/50" style={{ width: `${rel.influenceStrength * 100}%` }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lifecycle */}
              {lifecycle && (
                <div className="bg-white/[0.02] border border-pcis-border/30 rounded p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-[3px] h-3.5 rounded-full bg-indigo-500" />
                    <h3 className="text-[11px] font-semibold text-pcis-text-primary uppercase tracking-wider">Lifecycle Intelligence</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-[9px] text-pcis-text-muted/50 uppercase">Life Stage</p>
                      <p className="text-[12px] text-pcis-text font-medium mt-0.5">{lifecycle.lifeStage}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-pcis-text-muted/50 uppercase">Portfolio Maturity</p>
                      <p className="text-[12px] text-pcis-text font-medium mt-0.5">{lifecycle.portfolioMaturity}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-[9px] text-pcis-text-muted/50 uppercase">Next Likely Action</p>
                    <p className="text-[11px] text-pcis-gold mt-0.5">{lifecycle.nextLikelyAction}</p>
                  </div>
                  {lifecycle.upcomingEvents.length > 0 && (
                    <div className="mt-3">
                      <p className="text-[9px] text-pcis-text-muted/50 uppercase mb-1">Upcoming Events</p>
                      {lifecycle.upcomingEvents.map((evt, i) => (
                        <p key={i} className="text-[10px] text-pcis-text-secondary flex items-start gap-1.5">
                          <span className="text-pcis-gold text-[7px] mt-0.5">●</span> {evt}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Contact info */}
              <div className="bg-white/[0.02] border border-pcis-border/30 rounded p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-[3px] h-3.5 rounded-full bg-gray-500" />
                  <h3 className="text-[11px] font-semibold text-pcis-text-primary uppercase tracking-wider">Contact</h3>
                </div>
                <div className="space-y-1.5">
                  <p className="text-[11px] text-pcis-text-secondary">{client.email}</p>
                  <p className="text-[11px] text-pcis-text-secondary">{client.phone}</p>
                  <p className="text-[10px] text-pcis-text-muted">Onboarded {new Date(client.onboardedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                </div>
              </div>
            </div>
          )}

          {/* ============= TIMELINE TAB ============= */}
          {activeTab === 'timeline' && (
            <div className="space-y-5">
              {/* Activity filter */}
              <div className="flex items-center gap-2">
                {(['All', 'Calls', 'Emails', 'Meetings', 'Signals'] as const).map(f => (
                  <button key={f} onClick={() => setTimelineFilter(f)} className={`px-3 py-1.5 rounded text-[10px] font-medium border transition-all ${
                    timelineFilter === f
                      ? 'border-pcis-gold/40 bg-pcis-gold/10 text-pcis-gold'
                      : 'border-pcis-border/20 text-pcis-text-muted hover:text-pcis-text hover:border-pcis-border/40'
                  }`}>
                    {f}
                  </button>
                ))}
              </div>

              {/* Unified timeline */}
              <div className="space-y-0">
                {(() => {
                  const clientActivities = [...getClientActivities(client.id), ...localActivities.filter(a => a.clientId === client.id)]
                  const clientSignals = signals.filter(s => s.clientId === client.id)

                  const unified = [
                    ...clientActivities.map(a => ({ ...a, source: 'activity' as const })),
                    ...clientSignals.map(s => ({
                      id: s.id, clientId: s.clientId, type: 'signal' as const,
                      title: s.type.charAt(0).toUpperCase() + s.type.slice(1) + ' Signal',
                      content: s.content, timestamp: s.timestamp, source: 'signal' as const,
                      impact: s.impact,
                    })),
                  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                    .filter(item => {
                      if (timelineFilter === 'All') return true
                      if (timelineFilter === 'Calls') return item.type === 'call'
                      if (timelineFilter === 'Emails') return item.type === 'email'
                      if (timelineFilter === 'Meetings') return item.type === 'meeting'
                      if (timelineFilter === 'Signals') return item.source === 'signal'
                      return true
                    })

                  const typeIcons: Record<string, string> = {
                    call: '◉', email: '✉', meeting: '◆', note: '✎', document: '◇', signal: '◎',
                  }
                  const typeColors: Record<string, string> = {
                    call: '#22c55e', email: '#06b6d4', meeting: '#d4a574', note: '#a78bfa', document: '#3b82f6', signal: '#f59e0b',
                  }

                  function timeAgo(ts: string) {
                    const diff = Date.now() - new Date(ts).getTime()
                    const mins = Math.floor(diff / 60000)
                    if (mins < 60) return `${mins}m ago`
                    const hrs = Math.floor(mins / 60)
                    if (hrs < 24) return `${hrs}h ago`
                    const days = Math.floor(hrs / 24)
                    return `${days}d ago`
                  }

                  return unified.map(item => (
                    <div key={item.id} className="flex gap-3 py-3 border-b border-pcis-border/10 last:border-0">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ backgroundColor: typeColors[item.type] + '15' }}>
                          <span className="text-[12px]" style={{ color: typeColors[item.type] }}>
                            {typeIcons[item.type] || '○'}
                          </span>
                        </div>
                        <div className="w-px flex-1 bg-pcis-border/10 mt-1" />
                      </div>
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-pcis-text">{item.title}</span>
                          {'duration' in item && item.duration && (
                            <span className="text-[9px] font-mono text-pcis-text-muted bg-white/[0.04] px-2 py-0.5 rounded">{item.duration}m</span>
                          )}
                          {'outcome' in item && item.outcome && (
                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded ${
                              item.outcome === 'positive' ? 'text-green-400 bg-green-500/10' :
                              item.outcome === 'negative' ? 'text-red-400 bg-red-500/10' :
                              'text-pcis-text-muted bg-white/[0.04]'
                            }`}>{item.outcome}</span>
                          )}
                          <span className="text-[9px] text-pcis-text-muted/60 ml-auto font-mono">{timeAgo(item.timestamp)}</span>
                        </div>
                        <p className="text-[10px] text-pcis-text-muted leading-relaxed mt-1">{item.content}</p>
                        {'impact' in item && item.impact && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {item.impact.map((imp: {dimension: string; delta: number}, idx: number) => (
                              <span key={idx} className={`text-[8px] px-2 py-0.5 rounded ${imp.delta > 0 ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                                {imp.delta > 0 ? '+' : ''}{imp.delta} {imp.dimension}
                              </span>
                            ))}
                          </div>
                        )}
                        {'attendees' in item && item.attendees && item.attendees.length > 0 && (
                          <p className="text-[9px] text-pcis-text-muted/60 mt-1">with {item.attendees.join(', ')}</p>
                        )}
                      </div>
                    </div>
                  ))
                })()}
              </div>
            </div>
          )}

          {/* ============= MATCHES TAB ============= */}
          {activeTab === 'matches' && (
            <div className="space-y-3">
              {matches.length === 0 && (
                <p className="text-[11px] text-pcis-text-muted/50 text-center py-8">No active matches</p>
              )}
              {matches.map(match => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          )}

          {/* ============= ACTIONS TAB ============= */}
          {activeTab === 'actions' && (
            <div className="space-y-3">
              {recommendations.length === 0 && (
                <p className="text-[11px] text-pcis-text-muted/50 text-center py-8">No pending actions</p>
              )}
              {recommendations.map(rec => {
                const urgencyColors: Record<string, string> = {
                  Act: 'text-red-400 bg-red-500/10',
                  Monitor: 'text-amber-400 bg-amber-500/10',
                  Prepare: 'text-blue-400 bg-blue-500/10',
                }
                return (
                  <div key={rec.id} className="bg-white/[0.02] border border-pcis-border/30 rounded p-3.5">
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${urgencyColors[rec.urgency] || ''}`}>
                        {rec.urgency.toUpperCase()}
                      </span>
                      <span className="text-[9px] text-pcis-text-muted">{rec.category}</span>
                    </div>
                    <p className="text-[12px] font-medium text-pcis-text mt-1.5">{rec.title}</p>
                    <p className="text-[10px] text-pcis-text-muted leading-relaxed mt-1">{rec.description}</p>
                  </div>
                )
              })}
            </div>
          )}

          {/* ============= NOTES TAB ============= */}
          {activeTab === 'notes' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-pcis-text-secondary uppercase tracking-wider">Advisor Notes</span>
                <button
                  onClick={() => setQuickAction(quickAction === 'note' ? null : 'note')}
                  className="px-3.5 py-1.5 rounded text-[10px] font-medium border border-pcis-gold/30 text-pcis-gold hover:bg-pcis-gold/10 transition-colors"
                >
                  + Add Note
                </button>
              </div>

              {(() => {
                const notes = [...getClientNotes(client.id), ...localNotes.filter(n => n.clientId === client.id)]
                const pinned = notes.filter(n => n.isPinned)
                const unpinned = notes.filter(n => !n.isPinned)

                const tagColors: Record<string, string> = {
                  'personal-preference': '#06b6d4',
                  'negotiation-strategy': '#a78bfa',
                  'family-decision': '#d4a574',
                  'timeline': '#f59e0b',
                  'concern': '#ef4444',
                  'relationship': '#22c55e',
                  'communication': '#3b82f6',
                  'financial-change': '#10b981',
                  'market-insight': '#6b7280',
                  'upsell-opportunity': '#a78bfa',
                }

                function timeAgo(ts: string) {
                  const diff = Date.now() - new Date(ts).getTime()
                  const hrs = Math.floor(diff / 3600000)
                  if (hrs < 1) return 'Just now'
                  if (hrs < 24) return `${hrs}h ago`
                  const days = Math.floor(hrs / 24)
                  return `${days}d ago`
                }

                return (
                  <>
                    {pinned.length > 0 && (
                      <div className="space-y-2.5">
                        <span className="text-[9px] text-pcis-gold uppercase tracking-wider font-medium">Pinned</span>
                        {pinned.map(note => (
                          <div key={note.id} className="p-3.5 rounded border border-pcis-gold/20 bg-pcis-gold/[0.03]">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[9px] text-pcis-text-muted font-mono">{timeAgo(note.timestamp)}</span>
                              <span className="text-[10px] text-pcis-gold">📌</span>
                            </div>
                            <p className="text-[10px] text-pcis-text leading-relaxed">{note.content}</p>
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                              {note.tags.map(tag => (
                                <span key={tag} className="text-[8px] px-2 py-0.5 rounded" style={{
                                  color: tagColors[tag] || '#6b7280',
                                  backgroundColor: (tagColors[tag] || '#6b7280') + '15',
                                }}>{tag}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {unpinned.length > 0 && (
                      <div className="space-y-2.5">
                        {pinned.length > 0 && <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider font-medium">Recent</span>}
                        {unpinned.map(note => (
                          <div key={note.id} className="p-3.5 rounded border border-pcis-border/20 bg-white/[0.01] hover:bg-white/[0.02] transition-colors">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[9px] text-pcis-text-muted font-mono">{timeAgo(note.timestamp)}</span>
                            </div>
                            <p className="text-[10px] text-pcis-text leading-relaxed">{note.content}</p>
                            <div className="flex flex-wrap gap-1.5 mt-2.5">
                              {note.tags.map(tag => (
                                <span key={tag} className="text-[8px] px-2 py-0.5 rounded" style={{
                                  color: tagColors[tag] || '#6b7280',
                                  backgroundColor: (tagColors[tag] || '#6b7280') + '15',
                                }}>{tag}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {notes.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-[11px] text-pcis-text-muted">No notes yet</p>
                        <p className="text-[9px] text-pcis-text-muted/50 mt-1">Add observations and insights about this client</p>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
