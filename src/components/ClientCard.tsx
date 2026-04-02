'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import type {
  Client, CognitiveProfile, EngagementMetrics, Prediction, Signal,
  EngagementStatus, MomentumDirection, DealStage, NextTouch,
} from '@/lib/mockData'
import { dealStageColors } from '@/lib/mockData'

// ============================================================
// STATUS COLORS — intelligence system palette
// ============================================================

const statusColors: Record<EngagementStatus, { ring: string; glow: string; label: string }> = {
  thriving:  { ring: '#22c55e', glow: 'rgba(34,197,94,0.25)',  label: 'Thriving' },
  active:    { ring: '#06b6d4', glow: 'rgba(6,182,212,0.20)',  label: 'Active' },
  cooling:   { ring: '#f59e0b', glow: 'rgba(245,158,11,0.20)', label: 'Cooling' },
  cold:      { ring: '#3b82f6', glow: 'rgba(59,130,246,0.15)', label: 'Cold' },
  dormant:   { ring: '#6b7280', glow: 'rgba(107,114,128,0.10)',label: 'Dormant' },
}

const momentumIcons: Record<MomentumDirection, string> = {
  heating: '↑',
  cooling: '↓',
  stable: '→',
}

// ============================================================
// NEED BAR — elegant horizontal indicator
// ============================================================

function NeedBar({ label, value, max = 100, color, icon }: {
  label: string; value: number; max?: number; color: string; icon: string
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  const isLow = pct < 30
  const isCritical = pct < 15

  return (
    <div className="flex items-center gap-2 group">
      <span className="text-[9px] w-3 text-center opacity-60">{icon}</span>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[8px] text-pcis-text-secondary uppercase tracking-wider">{label}</span>
          <span className={`text-[8px] font-mono ${isCritical ? 'text-red-400' : isLow ? 'text-amber-400' : 'text-pcis-text-muted'}`}>
            {Math.round(value)}
          </span>
        </div>
        <div className="h-[3px] bg-white/[0.06] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000 ease-out"
            style={{
              width: `${pct}%`,
              background: isCritical
                ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                : isLow
                  ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                  : `linear-gradient(90deg, ${color}, ${color}88)`,
            }}
          />
        </div>
      </div>
    </div>
  )
}

// ============================================================
// SIGNAL PULSE — mini heartbeat sparkline
// ============================================================

function SignalPulse({ signals, status }: { signals: Signal[]; status: EngagementStatus }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const w = canvas.width = canvas.offsetWidth * 2
    const h = canvas.height = canvas.offsetHeight * 2
    ctx.scale(2, 2)
    const dw = w / 2
    const dh = h / 2

    // Generate pulse data from signal activity
    const points: number[] = []
    const segments = 40

    if (signals.length === 0 || status === 'dormant') {
      // Flatline
      for (let i = 0; i < segments; i++) points.push(dh / 2)
    } else {
      // Create heartbeat pattern based on signal density
      const intensity = Math.min(1, signals.length / 6)
      for (let i = 0; i < segments; i++) {
        const t = i / segments
        // Base: slight wave
        let y = dh / 2
        // Add spikes at intervals based on signal count
        const spikeFreq = Math.max(3, 8 - signals.length)
        if (i % spikeFreq === Math.floor(spikeFreq / 2)) {
          y -= (dh * 0.35) * intensity
        } else if (i % spikeFreq === Math.floor(spikeFreq / 2) + 1) {
          y += (dh * 0.15) * intensity
        } else {
          y += Math.sin(t * Math.PI * 4) * 1.5
        }
        points.push(Math.max(2, Math.min(dh - 2, y)))
      }
    }

    ctx.clearRect(0, 0, dw, dh)

    // Draw the pulse line
    const { ring } = statusColors[status] || statusColors.active
    ctx.strokeStyle = ring
    ctx.lineWidth = 1
    ctx.globalAlpha = status === 'dormant' ? 0.2 : 0.5
    ctx.beginPath()
    points.forEach((y, i) => {
      const x = (i / (segments - 1)) * dw
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Glow pass
    ctx.strokeStyle = ring
    ctx.lineWidth = 3
    ctx.globalAlpha = status === 'dormant' ? 0.05 : 0.15
    ctx.beginPath()
    points.forEach((y, i) => {
      const x = (i / (segments - 1)) * dw
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
  }, [signals, status])

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-5"
      style={{ imageRendering: 'auto' }}
    />
  )
}

// ============================================================
// STATUS RING — the intelligence system plumbob replacement
// ============================================================

function StatusRing({ status, momentum, initials, size = 56 }: {
  status: EngagementStatus; momentum: MomentumDirection; initials: string; size?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)
  const angleRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const dpr = 2
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const radius = size / 2 - 4
    const { ring, glow } = statusColors[status]

    // Pulse speed based on momentum
    const pulseSpeed = momentum === 'heating' ? 0.04 : momentum === 'cooling' ? 0.012 : 0.02

    function draw() {
      angleRef.current += pulseSpeed
      const pulse = Math.sin(angleRef.current) * 0.5 + 0.5

      ctx.clearRect(0, 0, size, size)

      // Outer glow
      const glowRadius = radius + 3 + pulse * 3
      const grad = ctx.createRadialGradient(cx, cy, radius - 2, cx, cy, glowRadius + 4)
      grad.addColorStop(0, glow)
      grad.addColorStop(1, 'transparent')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(cx, cy, glowRadius + 4, 0, Math.PI * 2)
      ctx.fill()

      // Ring background
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.stroke()

      // Active ring — arc sweep based on engagement
      ctx.strokeStyle = ring
      ctx.lineWidth = 2.5
      ctx.lineCap = 'round'
      ctx.globalAlpha = 0.7 + pulse * 0.3
      ctx.beginPath()
      // Full ring for thriving/active, partial for others
      const sweep = status === 'thriving' || status === 'active'
        ? Math.PI * 2
        : status === 'cooling'
          ? Math.PI * 1.4
          : status === 'cold'
            ? Math.PI * 0.8
            : Math.PI * 0.3
      const startAngle = -Math.PI / 2 + angleRef.current * 0.3
      ctx.arc(cx, cy, radius, startAngle, startAngle + sweep)
      ctx.stroke()
      ctx.globalAlpha = 1

      // Inner circle background
      ctx.fillStyle = 'rgba(10,10,10,0.9)'
      ctx.beginPath()
      ctx.arc(cx, cy, radius - 4, 0, Math.PI * 2)
      ctx.fill()

      // Initials
      ctx.fillStyle = '#ffffff'
      ctx.font = `600 ${size * 0.28}px Inter, sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(initials, cx, cy + 1)

      frameRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(frameRef.current)
  }, [status, momentum, initials, size])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className="flex-shrink-0"
    />
  )
}

// ============================================================
// PREDICTION BADGE — active pattern indicator
// ============================================================

function PredictionBadge({ prediction }: { prediction: Prediction }) {
  const patternColors: Record<string, string> = {
    'Imminent Purchase': 'text-green-400 bg-green-500/10',
    'Portfolio Expansion': 'text-cyan-400 bg-cyan-500/10',
    'Analysis Paralysis': 'text-amber-400 bg-amber-500/10',
    'Price Negotiation': 'text-blue-400 bg-blue-500/10',
    'Trust Erosion': 'text-red-400 bg-red-500/10',
    'Flight Risk': 'text-red-400 bg-red-500/10',
    'Upsell Opportunity': 'text-purple-400 bg-purple-500/10',
  }

  const colorClass = patternColors[prediction.pattern] || 'text-pcis-text-muted bg-white/5'

  return (
    <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-medium ${colorClass}`}>
      <span>{prediction.pattern}</span>
      <span className="opacity-60">{prediction.confidence}%</span>
    </div>
  )
}

// ============================================================
// CLIENT CARD — the living portrait
// ============================================================

export interface ClientCardProps {
  client: Client
  profile: CognitiveProfile
  engagement: EngagementMetrics
  predictions: Prediction[]
  signals: Signal[]
  onClick: () => void
  selected?: boolean
  dealStage: DealStage
  nextTouch?: NextTouch
}

export default function ClientCard({
  client, profile, engagement, predictions, signals, onClick, selected, dealStage, nextTouch,
}: ClientCardProps) {
  const [hovered, setHovered] = useState(false)

  // Derive need bar values
  const trustScore = profile.scores.find(s => s.dimension === 'Trust Formation')?.value ?? 50
  const attentionNeed = Math.min(100, Math.max(0,
    (engagement.daysSinceContact / engagement.expectedInterval) * 100
  ))
  const velocityRatio = engagement.baselineVelocity > 0
    ? (engagement.currentVelocity / engagement.baselineVelocity) * 50
    : 50

  // Tier color
  const tierColors: Record<string, string> = {
    UHNW: 'text-pcis-gold',
    HNW: 'text-cyan-400',
    Affluent: 'text-pcis-text-secondary',
  }

  // Card breathing — subtle scale based on momentum
  const breatheClass = engagement.momentum === 'heating'
    ? 'animate-pulse-subtle-fast'
    : engagement.status === 'dormant'
      ? ''
      : ''

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`
        w-full text-left rounded-xl border transition-all duration-300 ease-out
        ${selected
          ? 'border-pcis-gold/40 bg-pcis-gold/[0.06] shadow-lg shadow-pcis-gold/5'
          : 'border-pcis-border/60 bg-pcis-card/60 hover:border-pcis-border hover:bg-pcis-card/80'
        }
        ${hovered ? 'scale-[1.01] shadow-xl shadow-black/20' : ''}
        backdrop-blur-sm group relative overflow-hidden
      `}
    >
      {/* Subtle momentum gradient overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none rounded-xl"
        style={{
          background: engagement.momentum === 'heating'
            ? 'linear-gradient(135deg, #22c55e 0%, transparent 60%)'
            : engagement.momentum === 'cooling'
              ? 'linear-gradient(135deg, #f59e0b 0%, transparent 60%)'
              : 'none',
        }}
      />

      <div className="relative p-4">
        {/* Top row: Status Ring + Identity */}
        <div className="flex items-start gap-3">
          <StatusRing
            status={engagement.status}
            momentum={engagement.momentum}
            initials={client.initials}
            size={52}
          />
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-[13px] font-semibold text-pcis-text truncate">{client.name}</h3>
              <span className="text-[8px] font-medium opacity-50">{momentumIcons[engagement.momentum]}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[9px] font-semibold ${tierColors[client.type]}`}>{client.type}</span>
              <span className="text-[7px] text-pcis-text-muted">•</span>
              <span className="text-[9px] text-pcis-text-muted">{client.category}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[8px] text-pcis-text-muted">{client.location}</span>
              <span className="text-[7px] text-pcis-text-muted/70">•</span>
              <span className={`text-[8px] font-medium ${statusColors[engagement.status]?.ring ? '' : 'text-pcis-text-muted'}`}
                style={{ color: statusColors[engagement.status]?.ring }}>
                {statusColors[engagement.status]?.label}
              </span>
            </div>
            {/* Deal Stage */}
            <div className="mt-1.5">
              <span className="text-[8px] font-semibold px-2 py-0.5 rounded-full border"
                style={{
                  color: dealStageColors[dealStage],
                  borderColor: dealStageColors[dealStage] + '40',
                  backgroundColor: dealStageColors[dealStage] + '10',
                }}>
                {dealStage}
              </span>
            </div>
          </div>
        </div>

        {/* Portfolio value */}
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[9px] text-pcis-text-secondary uppercase tracking-wider">Portfolio</span>
          <span className="text-[11px] font-mono text-pcis-text font-medium">
            AED {(client.financialProfile.portfolioValue / 1_000_000).toFixed(0)}M
          </span>
        </div>

        {/* Need bars — the Sims vitals */}
        <div className="mt-3 space-y-1.5">
          <NeedBar
            label="Engagement"
            value={engagement.engagementScore}
            color={statusColors[engagement.status]?.ring || '#6b7280'}
            icon="◉"
          />
          <NeedBar
            label="Trust"
            value={trustScore}
            color="#06b6d4"
            icon="◈"
          />
          <NeedBar
            label="Readiness"
            value={engagement.readinessScore * 100}
            color="#a78bfa"
            icon="◆"
          />
          <NeedBar
            label="Momentum"
            value={velocityRatio}
            color="#22c55e"
            icon="◇"
          />
          <NeedBar
            label="Attention"
            value={100 - attentionNeed}
            color="#f59e0b"
            icon="◎"
          />
        </div>

        {/* Active predictions */}
        {predictions.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {predictions.slice(0, 2).map((pred, i) => (
              <PredictionBadge key={i} prediction={pred} />
            ))}
          </div>
        )}

        {/* Cognitive traits */}
        <div className="mt-2 flex flex-wrap gap-1">
          {profile.keyTraits.slice(0, 3).map((trait) => (
            <span key={trait} className="text-[8px] text-pcis-text-muted bg-white/[0.04] px-1.5 py-0.5 rounded">
              {trait}
            </span>
          ))}
        </div>

        {/* Signal pulse — heartbeat */}
        <div className="mt-3 border-t border-pcis-border/30 pt-2">
          {/* Next Touch */}
          {nextTouch && (() => {
            const now = new Date()
            const touchDate = new Date(nextTouch.date)
            const diffDays = Math.ceil((touchDate.getTime() - now.getTime()) / 86400000)
            const isOverdue = diffDays < 0
            const isToday = diffDays === 0
            const isUrgent = diffDays >= 1 && diffDays <= 2
            const color = isOverdue ? '#ef4444' : isToday ? '#d4a574' : isUrgent ? '#f59e0b' : '#22c55e'
            const label = isOverdue
              ? `OVERDUE ${Math.abs(diffDays)}d`
              : isToday
                ? 'TODAY'
                : `in ${diffDays}d`
            return (
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] uppercase tracking-wider" style={{ color }}>
                    {nextTouch.type === 'call' ? '◉' : nextTouch.type === 'meeting' ? '◆' : nextTouch.type === 'viewing' ? '◈' : '○'}
                  </span>
                  <span className="text-[8px] text-pcis-text-secondary uppercase tracking-wider">Next Touch</span>
                </div>
                <span className={`text-[8px] font-mono font-semibold ${isOverdue ? 'animate-pulse' : ''}`} style={{ color }}>
                  {label}
                </span>
              </div>
            )
          })()}
          <div className="flex items-center justify-between mb-1">
            <span className="text-[8px] text-pcis-text-muted/80 uppercase tracking-wider">Signal Activity</span>
            <span className="text-[8px] text-pcis-text-muted font-mono">
              {engagement.daysSinceContact === 0 ? 'Today' : `${engagement.daysSinceContact}d ago`}
            </span>
          </div>
          <SignalPulse signals={signals} status={engagement.status} />
        </div>
      </div>
    </button>
  )
}
