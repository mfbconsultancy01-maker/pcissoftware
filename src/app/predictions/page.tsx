'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import ClientDetailPanel from '@/components/ClientDetailPanel'
import {
  clients, predictions, engagementMetrics, cognitiveProfiles, signals, matches,
  recommendations, relationships, lifecycleData, advisorPerformance, nextTouches,
  getClient, getProfile, getEngagement, getClientPredictions, getClientSignals,
  getClientRelationships, getNextTouch, getOverdueClients, getClientActivities,
  getClientNotes,
  type Client, type Prediction, type PredictionPattern, type MomentumDirection,
  type EngagementMetrics as EngMetrics, type CognitiveProfile,
  PREDICTION_PATTERN_LIST, predictionPatternColors,
  computeUrgencyScore, buildSituationBrief, buildPlaybook,
  projectDecay, projectRecovery, getPatternDistribution,
} from '@/lib/mockData'

// ============================================================
// COLOR UTILITIES
// ============================================================

function confidenceColor(c: number): string {
  if (c >= 80) return '#22c55e'
  if (c >= 70) return '#d4a574'
  return '#f59e0b'
}

function momentumColor(m: MomentumDirection): string {
  if (m === 'heating') return '#ef4444'
  if (m === 'cooling') return '#3b82f6'
  return '#6b7280'
}

function momentumArrow(m: MomentumDirection): string {
  if (m === 'heating') return '↑'
  if (m === 'cooling') return '↓'
  return '→'
}

const statusColors: Record<string, string> = {
  thriving: '#22c55e', active: '#06b6d4', cooling: '#f59e0b', cold: '#3b82f6', dormant: '#6b7280',
}

// ============================================================
// AI SITUATION ROOM  - compact top strip
// ============================================================

function SituationRoom() {
  const brief = useMemo(() => buildSituationBrief(), [])
  const totalPredictions = predictions.length
  const heatingCount = predictions.filter(p => p.momentum === 'heating').length
  const avgConf = Math.round(predictions.reduce((s, p) => s + p.confidence, 0) / totalPredictions)

  return (
    <div className="bg-gradient-to-r from-pcis-gold/[0.05] via-transparent to-pcis-gold/[0.02] border border-pcis-gold/15 rounded-xl px-5 py-4">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-pcis-gold/15 flex items-center justify-center mt-0.5">
          <span className="text-pcis-gold text-sm">◎</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h2 className="text-[11px] font-semibold text-pcis-gold uppercase tracking-wider">Situation Room</h2>
            <span className="text-[9px] font-mono text-pcis-text-muted bg-white/[0.04] px-1.5 py-0.5 rounded">{totalPredictions} patterns</span>
            <span className="text-[9px] font-mono text-pcis-text-muted bg-white/[0.04] px-1.5 py-0.5 rounded">{avgConf}% avg</span>
            <span className="text-[9px] font-mono bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded">{heatingCount} heating</span>
          </div>
          <div className="space-y-0.5">
            {brief.map((sentence, i) => (
              <p key={i} className="text-[11px] text-pcis-text leading-relaxed">
                <span className="text-pcis-gold mr-1">▸</span>{sentence}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================
// PREDICTION LIST CARD  - compact but rich
// ============================================================

function PredictionListCard({
  prediction,
  isSelected,
  onClick,
}: {
  prediction: Prediction
  isSelected: boolean
  onClick: () => void
}) {
  const client = getClient(prediction.clientId)
  const engagement = getEngagement(prediction.clientId)
  const touch = getNextTouch(prediction.clientId)
  const urgency = computeUrgencyScore(prediction)

  if (!client || !engagement) return null

  const patColor = predictionPatternColors[prediction.pattern]
  const confColor = confidenceColor(prediction.confidence)
  const momColor = momentumColor(prediction.momentum)
  const engColor = statusColors[engagement.status] || '#6b7280'

  // Next touch urgency
  let touchColor = '#22c55e'
  let touchLabel = ''
  if (touch) {
    const diff = Math.ceil((new Date(touch.date).getTime() - Date.now()) / 86400000)
    touchColor = diff < 0 ? '#ef4444' : diff === 0 ? '#d4a574' : diff <= 2 ? '#f59e0b' : '#22c55e'
    touchLabel = diff < 0 ? `${Math.abs(diff)}d overdue` : diff === 0 ? 'Today' : `in ${diff}d`
  }

  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all ${
        isSelected
          ? 'border-pcis-gold/40 bg-pcis-gold/[0.04] ring-1 ring-pcis-gold/15'
          : 'border-pcis-border/20 bg-white/[0.015] hover:bg-white/[0.03] hover:border-pcis-border/40'
      }`}
    >
      {/* Row 1: Pattern badge + confidence + momentum */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{
            color: patColor, backgroundColor: patColor + '15',
          }}>
            {prediction.pattern}
          </span>
          <span className="text-[9px] font-mono font-bold" style={{ color: momColor }}>
            {momentumArrow(prediction.momentum)} {prediction.momentum}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono text-pcis-text-muted/60">URG {urgency}</span>
          {/* Confidence ring */}
          <div className="relative w-9 h-9 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="w-9 h-9 -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
              <circle cx="18" cy="18" r="15" fill="none" stroke={confColor}
                strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${(prediction.confidence / 100) * 94} 94`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold" style={{ color: confColor }}>
              {prediction.confidence}
            </span>
          </div>
        </div>
      </div>

      {/* Row 2: Client identity */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2"
          style={{ borderColor: engColor, backgroundColor: '#0a0a0a' }}>
          <span className="text-[9px] font-bold text-white">{client.initials}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[12px] font-semibold text-pcis-text truncate">{client.name}</p>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-pcis-gold">{client.type}</span>
            <span className="text-[8px] text-pcis-text-muted">•</span>
            <span className="text-[10px] text-pcis-text-muted">{client.category}</span>
            <div className="w-1.5 h-1.5 rounded-full ml-1" style={{ backgroundColor: engColor }} />
            <span className="text-[9px] text-pcis-text-muted capitalize">{engagement.status}</span>
          </div>
        </div>
      </div>

      {/* Row 3: Description */}
      <p className="text-[10px] text-pcis-text-muted leading-relaxed mb-2 line-clamp-2">"{prediction.description}"</p>

      {/* Row 4: Engagement mini-stats + next touch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-pcis-text-muted">Score</span>
            <span className="text-[10px] font-mono font-bold" style={{ color: engColor }}>{engagement.engagementScore}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-pcis-text-muted">Decay</span>
            <span className="text-[10px] font-mono font-bold" style={{ color: engagement.decayRate > 40 ? '#ef4444' : '#6b7280' }}>
              {engagement.decayRate}%
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-pcis-text-muted">Vel</span>
            <span className="text-[10px] font-mono font-bold text-pcis-text-secondary">{engagement.currentVelocity.toFixed(1)}</span>
          </div>
        </div>
        {touch && (
          <span className="text-[9px] font-mono font-semibold" style={{ color: touchColor }}>
            {touchLabel}
          </span>
        )}
      </div>
    </button>
  )
}

// ============================================================
// DETAIL PANEL  - right side deep-dive for selected prediction
// ============================================================

function PredictionDetail({
  prediction,
  onViewProfile,
}: {
  prediction: Prediction
  onViewProfile: (client: Client) => void
}) {
  const client = getClient(prediction.clientId)
  const profile = getProfile(prediction.clientId)
  const engagement = getEngagement(prediction.clientId)
  const clientSignals = getClientSignals(prediction.clientId)
  const touch = getNextTouch(prediction.clientId)

  if (!client || !profile || !engagement) return null

  const playbook = buildPlaybook(prediction.pattern, profile)
  const patColor = predictionPatternColors[prediction.pattern]
  const confColor = confidenceColor(prediction.confidence)
  const engColor = statusColors[engagement.status] || '#6b7280'

  // Impact simulator data
  const weeks = 5
  const decayCurve = projectDecay(prediction.clientId, weeks)
  const recoveryCurve = projectRecovery(prediction.clientId, weeks)
  const svgW = 320, svgH = 130
  const padL = 32, padR = 10, padT = 10, padB = 22
  const chartW = svgW - padL - padR, chartH = svgH - padT - padB
  function toX(i: number) { return padL + (i / weeks) * chartW }
  function toY(v: number) { return padT + (1 - v / 100) * chartH }
  const decayPath = decayCurve.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(v)}`).join(' ')
  const recoveryPath = recoveryCurve.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(v)}`).join(' ')
  const criticalWeek = decayCurve.findIndex(v => v < 30)

  // Touch urgency
  let touchColor = '#22c55e'
  let touchLabel = ''
  if (touch) {
    const diff = Math.ceil((new Date(touch.date).getTime() - Date.now()) / 86400000)
    touchColor = diff < 0 ? '#ef4444' : diff === 0 ? '#d4a574' : diff <= 2 ? '#f59e0b' : '#22c55e'
    touchLabel = diff < 0 ? `OVERDUE ${Math.abs(diff)}d` : diff === 0 ? 'TODAY' : `in ${diff}d`
  }

  const typeIcons: Record<string, string> = {
    viewing: '◈', inquiry: '◇', meeting: '◆', offer: '★', feedback: '◎',
    referral: '↗', financial: '◉', lifecycle: '○',
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={{
            color: patColor, backgroundColor: patColor + '15',
          }}>
            {prediction.pattern}
          </span>
          <span className="text-[10px] font-mono font-bold" style={{ color: momentumColor(prediction.momentum) }}>
            {momentumArrow(prediction.momentum)} {prediction.momentum}
          </span>
          <div className="ml-auto relative w-12 h-12 flex-shrink-0">
            <svg viewBox="0 0 36 36" className="w-12 h-12 -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
              <circle cx="18" cy="18" r="15" fill="none" stroke={confColor}
                strokeWidth="3" strokeLinecap="round"
                strokeDasharray={`${(prediction.confidence / 100) * 94} 94`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[13px] font-mono font-bold" style={{ color: confColor }}>
              {prediction.confidence}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2"
            style={{ borderColor: engColor, backgroundColor: '#0a0a0a' }}>
            <span className="text-[10px] font-bold text-white">{client.initials}</span>
          </div>
          <div>
            <p className="text-[14px] font-semibold text-pcis-text">{client.name}</p>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-pcis-gold">{client.type}</span>
              <span className="text-[8px] text-pcis-text-muted">•</span>
              <span className="text-[11px] text-pcis-text-muted">{client.category}</span>
              <span className="text-[8px] text-pcis-text-muted">•</span>
              <span className="text-[11px] text-pcis-text-muted">{client.location}</span>
            </div>
          </div>
        </div>

        <p className="text-[11px] text-pcis-text-muted leading-relaxed mt-3 italic">"{prediction.description}"</p>
      </div>

      {/* AI Playbook */}
      <div className="bg-pcis-gold/[0.03] border border-pcis-gold/15 rounded-xl p-4">
        <p className="text-[10px] text-pcis-gold font-semibold uppercase tracking-wider mb-2">AI Playbook</p>
        <p className="text-[12px] text-pcis-text leading-relaxed mb-3">{playbook.strategy}</p>
        {playbook.actions.length > 0 && (
          <div className="space-y-1.5">
            {playbook.actions.map((action, i) => (
              <p key={i} className="text-[11px] text-pcis-text-secondary leading-relaxed pl-3" style={{ textIndent: '-0.75rem' }}>
                <span className="text-pcis-gold/70"> -</span> {action}
              </p>
            ))}
          </div>
        )}
        {playbook.risks.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3 pt-2.5 border-t border-pcis-border/10">
            <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider mr-1">Risks:</span>
            {playbook.risks.map((r, i) => (
              <span key={i} className="text-[9px] text-red-400/80 bg-red-500/[0.08] px-2 py-0.5 rounded-full">{r}</span>
            ))}
          </div>
        )}
      </div>

      {/* Engagement snapshot */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Score', value: engagement.engagementScore, color: engColor },
          { label: 'Ready', value: `${Math.round(engagement.readinessScore * 100)}%`, color: '#a78bfa' },
          { label: 'Velocity', value: engagement.currentVelocity.toFixed(1), color: '#22c55e' },
          { label: 'Decay', value: `${engagement.decayRate}%`, color: engagement.decayRate > 40 ? '#ef4444' : '#f59e0b' },
        ].map(s => (
          <div key={s.label} className="text-center bg-white/[0.02] border border-pcis-border/20 rounded-lg py-2.5">
            <p className="text-[16px] font-mono font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-[9px] text-pcis-text-muted uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Next touch */}
      {touch && (
        <div className="flex items-center justify-between p-3.5 rounded-xl" style={{
          backgroundColor: touchColor + '08', borderLeft: `3px solid ${touchColor}`,
        }}>
          <div>
            <p className="text-[9px] text-pcis-text-muted uppercase tracking-wider mb-0.5">Next Touch</p>
            <p className="text-[11px] text-pcis-text">{touch.reason}</p>
            <p className="text-[10px] text-pcis-text-muted">{touch.type} · {new Date(touch.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
          </div>
          <span className={`text-[11px] font-mono font-bold ${touchLabel.includes('OVERDUE') ? 'animate-pulse' : ''}`} style={{ color: touchColor }}>
            {touchLabel}
          </span>
        </div>
      )}

      {/* Signal decomposition */}
      {clientSignals.length > 0 && (
        <div>
          <p className="text-[10px] text-pcis-text-muted uppercase tracking-wider mb-2">Signal Activity</p>
          <div className="space-y-2">
            {clientSignals.slice(0, 4).map(sig => (
              <div key={sig.id} className="flex items-start gap-2.5 py-2 border-b border-pcis-border/10 last:border-0">
                <span className="text-[12px] text-pcis-text-muted mt-0.5">{typeIcons[sig.type] || '○'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-pcis-text-secondary leading-relaxed">{sig.content}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {sig.impact.map((imp, idx) => (
                      <span key={idx} className={`text-[9px] px-1.5 py-0.5 rounded font-mono ${
                        imp.delta > 0 ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'
                      }`}>
                        {imp.delta > 0 ? '+' : ''}{imp.delta} {imp.dimension}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Impact simulator */}
      <div>
        <p className="text-[10px] text-pcis-text-muted uppercase tracking-wider mb-2">Impact Projection</p>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="text-center bg-white/[0.02] border border-pcis-border/20 rounded-lg py-2">
            <p className="text-[15px] font-mono font-bold" style={{ color: engColor }}>{engagement.engagementScore}</p>
            <p className="text-[8px] text-pcis-text-muted uppercase">Now</p>
          </div>
          <div className="text-center bg-white/[0.02] border border-pcis-border/20 rounded-lg py-2">
            <p className="text-[15px] font-mono font-bold text-red-400">{decayCurve[weeks]}</p>
            <p className="text-[8px] text-pcis-text-muted uppercase">No action (5w)</p>
          </div>
          <div className="text-center bg-white/[0.02] border border-pcis-border/20 rounded-lg py-2">
            <p className="text-[15px] font-mono font-bold text-green-400">{recoveryCurve[weeks]}</p>
            <p className="text-[8px] text-pcis-text-muted uppercase">With action (5w)</p>
          </div>
        </div>
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" style={{ height: 130 }}>
          {[0, 25, 50, 75, 100].map(v => (
            <g key={v}>
              <line x1={padL} y1={toY(v)} x2={svgW - padR} y2={toY(v)} stroke="rgba(255,255,255,0.04)" strokeWidth="0.5" />
              <text x={padL - 4} y={toY(v) + 3} fill="rgba(255,255,255,0.25)" fontSize="7" textAnchor="end" fontFamily="monospace">{v}</text>
            </g>
          ))}
          {Array.from({ length: weeks + 1 }).map((_, i) => (
            <text key={i} x={toX(i)} y={svgH - 4} fill="rgba(255,255,255,0.25)" fontSize="7" textAnchor="middle" fontFamily="monospace">W{i}</text>
          ))}
          <line x1={padL} y1={toY(30)} x2={svgW - padR} y2={toY(30)} stroke="rgba(239,68,68,0.2)" strokeWidth="0.5" strokeDasharray="3,3" />
          <text x={svgW - padR + 2} y={toY(30) + 3} fill="rgba(239,68,68,0.4)" fontSize="6" fontFamily="monospace">critical</text>
          <path d={decayPath} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
          <path d={recoveryPath} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
          <circle cx={toX(0)} cy={toY(engagement.engagementScore)} r="3" fill="#d4a574" />
          <circle cx={toX(weeks)} cy={toY(decayCurve[weeks])} r="2.5" fill="#ef4444" />
          <circle cx={toX(weeks)} cy={toY(recoveryCurve[weeks])} r="2.5" fill="#22c55e" />
        </svg>
        <div className="flex items-center gap-4 mt-1.5">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded bg-red-400" />
            <span className="text-[9px] text-pcis-text-muted">No action</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-0.5 rounded bg-green-400" />
            <span className="text-[9px] text-pcis-text-muted">With action</span>
          </div>
        </div>
        {criticalWeek > 0 && (
          <p className="text-[10px] text-red-400 mt-1.5">⚠ Without action, engagement drops below critical in ~{criticalWeek} week{criticalWeek !== 1 ? 's' : ''}.</p>
        )}
      </div>

      {/* CTA */}
      <button
        onClick={() => onViewProfile(client)}
        className="w-full text-center py-2.5 rounded-xl border border-pcis-gold/25 text-[11px] font-medium text-pcis-gold hover:bg-pcis-gold/10 transition-colors"
      >
        Open Full Client Profile
      </button>
    </div>
  )
}

// ============================================================
// SUMMARY STATS BAR  - compact inline metrics
// ============================================================

function SummaryBar() {
  const perf = advisorPerformance
  const dist = useMemo(() => getPatternDistribution(), [])
  const actedPct = Math.round((perf.recommendationsActedOn / perf.recommendationsTotal) * 100)
  const overdue = getOverdueClients()

  // Momentum counts
  const heatingCount = predictions.filter(p => p.momentum === 'heating').length
  const stableCount = predictions.filter(p => p.momentum === 'stable').length
  const coolingCount = predictions.filter(p => p.momentum === 'cooling').length
  const total = predictions.length

  return (
    <div className="flex items-center gap-5 py-3 px-1">
      {/* Momentum bar */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider">Momentum</span>
        <div className="w-24 h-1.5 rounded-full overflow-hidden bg-white/[0.04] flex">
          {heatingCount > 0 && <div className="h-full" style={{ width: `${(heatingCount / total) * 100}%`, backgroundColor: '#ef4444' }} />}
          {stableCount > 0 && <div className="h-full" style={{ width: `${(stableCount / total) * 100}%`, backgroundColor: '#6b7280' }} />}
          {coolingCount > 0 && <div className="h-full" style={{ width: `${(coolingCount / total) * 100}%`, backgroundColor: '#3b82f6' }} />}
        </div>
        <span className="text-[9px] font-mono text-red-400">{heatingCount}↑</span>
        <span className="text-[9px] font-mono text-pcis-text-muted">{stableCount}→</span>
        <span className="text-[9px] font-mono text-blue-400">{coolingCount}↓</span>
      </div>

      <div className="h-4 w-px bg-pcis-border/30" />

      <div className="flex items-center gap-1.5">
        <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider">Recs acted</span>
        <span className="text-[10px] font-mono font-bold" style={{ color: actedPct >= 75 ? '#22c55e' : '#f59e0b' }}>{actedPct}%</span>
      </div>

      <div className="h-4 w-px bg-pcis-border/30" />

      <div className="flex items-center gap-1.5">
        <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider">Conversion</span>
        <span className="text-[10px] font-mono font-bold text-pcis-gold">{Math.round(perf.conversionRate * 100)}%</span>
      </div>

      <div className="h-4 w-px bg-pcis-border/30" />

      <div className="flex items-center gap-1.5">
        <span className="text-[9px] text-pcis-text-muted uppercase tracking-wider">Overdue</span>
        <span className="text-[10px] font-mono font-bold" style={{ color: overdue.length > 0 ? '#ef4444' : '#22c55e' }}>{overdue.length}</span>
      </div>
    </div>
  )
}

// ============================================================
// PATTERN RADAR  - canvas 7-axis radial chart
// ============================================================

function PatternRadar({
  onPatternClick,
  activePattern,
}: {
  onPatternClick: (pattern: PredictionPattern | 'all') => void
  activePattern: PredictionPattern | 'all'
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [hoveredPattern, setHoveredPattern] = useState<string | null>(null)
  const animRef = useRef(0)
  const progressRef = useRef(0)

  const dist = useMemo(() => getPatternDistribution(), [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctxRaw = canvas.getContext('2d')
    if (!ctxRaw) return
    const ctx: CanvasRenderingContext2D = ctxRaw

    const dpr = window.devicePixelRatio || 2
    const W = 280, H = 240
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`
    ctx.scale(dpr, dpr)

    const cx = W / 2, cy = H / 2 - 5
    const maxR = 85
    const patterns = PREDICTION_PATTERN_LIST
    const n = patterns.length
    const angleStep = (Math.PI * 2) / n
    const startAngle = -Math.PI / 2

    // Find max count for scaling
    const maxCount = Math.max(2, ...patterns.map(p => dist[p].count))

    function draw(progress: number) {
      ctx.clearRect(0, 0, W, H)

      // Draw concentric rings
      for (let ring = 1; ring <= 3; ring++) {
        const r = (ring / 3) * maxR
        ctx.beginPath()
        for (let i = 0; i <= n; i++) {
          const angle = startAngle + i * angleStep
          const x = cx + Math.cos(angle) * r
          const y = cy + Math.sin(angle) * r
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.04)'
        ctx.lineWidth = 0.5
        ctx.stroke()
      }

      // Draw axis lines
      for (let i = 0; i < n; i++) {
        const angle = startAngle + i * angleStep
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(angle) * maxR, cy + Math.sin(angle) * maxR)
        ctx.strokeStyle = 'rgba(255,255,255,0.06)'
        ctx.lineWidth = 0.5
        ctx.stroke()
      }

      // Draw filled data polygon
      ctx.beginPath()
      const points: { x: number; y: number; pattern: string }[] = []
      for (let i = 0; i < n; i++) {
        const angle = startAngle + i * angleStep
        const count = dist[patterns[i]].count
        const r = (count / maxCount) * maxR * progress
        const x = cx + Math.cos(angle) * r
        const y = cy + Math.sin(angle) * r
        points.push({ x, y, pattern: patterns[i] })
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      }
      ctx.closePath()

      // Fill with gold gradient
      const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR)
      gradient.addColorStop(0, 'rgba(212, 165, 116, 0.15)')
      gradient.addColorStop(1, 'rgba(212, 165, 116, 0.03)')
      ctx.fillStyle = gradient
      ctx.fill()
      ctx.strokeStyle = 'rgba(212, 165, 116, 0.5)'
      ctx.lineWidth = 1.5
      ctx.stroke()

      // Draw data points and labels
      for (let i = 0; i < n; i++) {
        const angle = startAngle + i * angleStep
        const patternName = patterns[i]
        const count = dist[patternName].count
        const avgConf = dist[patternName].avgConfidence
        const r = (count / maxCount) * maxR * progress
        const px = cx + Math.cos(angle) * r
        const py = cy + Math.sin(angle) * r
        const isHovered = hoveredPattern === patternName
        const isActive = activePattern === patternName

        // Data point dot
        const dotColor = predictionPatternColors[patternName] || '#d4a574'
        ctx.beginPath()
        ctx.arc(px, py, isHovered || isActive ? 5 : 3.5, 0, Math.PI * 2)
        ctx.fillStyle = dotColor
        ctx.globalAlpha = isHovered || isActive ? 1 : 0.8
        ctx.fill()
        ctx.globalAlpha = 1

        // Label
        const labelR = maxR + 18
        const lx = cx + Math.cos(angle) * labelR
        const ly = cy + Math.sin(angle) * labelR

        ctx.save()
        ctx.font = `${isHovered || isActive ? 'bold ' : ''}9px Inter, system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = isHovered || isActive ? '#d4a574' : 'rgba(255,255,255,0.45)'
        // Shorten long pattern names
        const shortName = patternName.length > 12 ? patternName.split(' ')[0] : patternName
        ctx.fillText(shortName, lx, ly)

        // Count below label
        if (count > 0) {
          ctx.font = '8px monospace'
          ctx.fillStyle = isHovered || isActive ? '#d4a574' : 'rgba(255,255,255,0.3)'
          ctx.fillText(`${count} · ${avgConf}%`, lx, ly + 11)
        }
        ctx.restore()
      }

      // Center label
      ctx.font = 'bold 18px monospace'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillStyle = 'rgba(212, 165, 116, 0.7)'
      ctx.fillText(`${predictions.length}`, cx, cy - 4)
      ctx.font = '8px Inter, system-ui, sans-serif'
      ctx.fillStyle = 'rgba(255,255,255,0.3)'
      ctx.fillText('patterns', cx, cy + 10)
    }

    // Animate entrance
    let start: number | null = null
    function animate(ts: number) {
      if (!start) start = ts
      const elapsed = ts - start
      progressRef.current = Math.min(1, elapsed / 600)
      // Ease out
      const eased = 1 - Math.pow(1 - progressRef.current, 3)
      draw(eased)
      if (progressRef.current < 1) {
        animRef.current = requestAnimationFrame(animate)
      }
    }
    animRef.current = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animRef.current)
  }, [dist, hoveredPattern, activePattern])

  // Redraw on hover/active change without re-animating
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || progressRef.current < 1) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    // Trigger a re-render by updating the main effect deps
  }, [hoveredPattern, activePattern])

  // Handle click detection
  function handleCanvasClick(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cx = 140, cy = 115
    const maxR = 85
    const n = PREDICTION_PATTERN_LIST.length
    const angleStep = (Math.PI * 2) / n
    const startAngle = -Math.PI / 2

    // Check if click is near center (reset)
    const distFromCenter = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
    if (distFromCenter < 20) {
      onPatternClick('all')
      return
    }

    // Find closest axis
    const clickAngle = Math.atan2(y - cy, x - cx)
    let closest = 0
    let closestDist = Infinity
    for (let i = 0; i < n; i++) {
      const angle = startAngle + i * angleStep
      let diff = Math.abs(clickAngle - angle)
      if (diff > Math.PI) diff = Math.PI * 2 - diff
      if (diff < closestDist) {
        closestDist = diff
        closest = i
      }
    }
    if (closestDist < angleStep / 2 && distFromCenter < maxR + 30) {
      const pat = PREDICTION_PATTERN_LIST[closest]
      onPatternClick(activePattern === pat ? 'all' : pat)
    }
  }

  function handleCanvasMove(e: React.MouseEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const cx = 140, cy = 115
    const maxR = 85
    const n = PREDICTION_PATTERN_LIST.length
    const angleStep = (Math.PI * 2) / n
    const startAngle = -Math.PI / 2
    const distFromCenter = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)

    if (distFromCenter > maxR + 30 || distFromCenter < 15) {
      setHoveredPattern(null)
      return
    }

    const clickAngle = Math.atan2(y - cy, x - cx)
    let closest = 0
    let closestDist = Infinity
    for (let i = 0; i < n; i++) {
      const angle = startAngle + i * angleStep
      let diff = Math.abs(clickAngle - angle)
      if (diff > Math.PI) diff = Math.PI * 2 - diff
      if (diff < closestDist) {
        closestDist = diff
        closest = i
      }
    }
    setHoveredPattern(closestDist < angleStep / 2 ? PREDICTION_PATTERN_LIST[closest] : null)
  }

  return (
    <div className="bg-white/[0.02] border border-pcis-border/20 rounded-xl p-4">
      <p className="text-[10px] text-pcis-text-muted uppercase tracking-wider mb-2">Pattern Radar</p>
      <canvas
        ref={canvasRef}
        className="cursor-pointer mx-auto block"
        style={{ width: 280, height: 240 }}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMove}
        onMouseLeave={() => setHoveredPattern(null)}
      />
      {hoveredPattern && (
        <p className="text-[10px] text-center text-pcis-gold mt-1">
          Click to filter: {hoveredPattern}
        </p>
      )}
    </div>
  )
}

// ============================================================
// FILTER BAR  - compact
// ============================================================

type ConfidenceFilter = 'all' | '80+' | '70-79' | '<70'
type SortMode = 'urgency' | 'confidence' | 'recency'

// ============================================================
// ANIMATED CARD WRAPPER
// ============================================================

function AnimatedCard({ children, delay }: { children: React.ReactNode; delay: number }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(t)
  }, [delay])

  return (
    <div className="transition-all duration-500 ease-out" style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(8px)',
    }}>
      {children}
    </div>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function PredictionsPage() {
  const [patternFilter, setPatternFilter] = useState<PredictionPattern | 'all'>('all')
  const [momentumFilter, setMomentumFilter] = useState<MomentumDirection | 'all'>('all')
  const [confidenceFilter, setConfidenceFilter] = useState<ConfidenceFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('urgency')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPrediction, setSelectedPrediction] = useState<Prediction | null>(null)
  const [detailClient, setDetailClient] = useState<Client | null>(null)

  // Filter and sort
  const filteredPredictions = useMemo(() => {
    let result = [...predictions]
    if (patternFilter !== 'all') result = result.filter(p => p.pattern === patternFilter)
    if (momentumFilter !== 'all') result = result.filter(p => p.momentum === momentumFilter)
    if (confidenceFilter === '80+') result = result.filter(p => p.confidence >= 80)
    else if (confidenceFilter === '70-79') result = result.filter(p => p.confidence >= 70 && p.confidence < 80)
    else if (confidenceFilter === '<70') result = result.filter(p => p.confidence < 70)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(p => {
        const c = getClient(p.clientId)
        return c && (c.name.toLowerCase().includes(q) || p.pattern.toLowerCase().includes(q))
      })
    }
    if (sortMode === 'urgency') result.sort((a, b) => computeUrgencyScore(b) - computeUrgencyScore(a))
    else if (sortMode === 'confidence') result.sort((a, b) => b.confidence - a.confidence)
    else if (sortMode === 'recency') result.sort((a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime())
    return result
  }, [patternFilter, momentumFilter, confidenceFilter, sortMode, searchQuery])

  // Auto-select first prediction
  useEffect(() => {
    if (!selectedPrediction && filteredPredictions.length > 0) {
      setSelectedPrediction(filteredPredictions[0])
    }
  }, [filteredPredictions, selectedPrediction])

  // Detail flyout data
  const detailData = useMemo(() => {
    if (!detailClient) return null
    const id = detailClient.id
    return {
      client: detailClient,
      profile: getProfile(id) || cognitiveProfiles[0],
      engagement: getEngagement(id) || engagementMetrics[0],
      predictions: getClientPredictions(id),
      signals: getClientSignals(id),
      matches: matches.filter(m => m.clientId === id),
      recommendations: recommendations.filter(r => r.clientId === id),
      relationships: getClientRelationships(id),
      lifecycle: lifecycleData.find(l => l.clientId === id),
    }
  }, [detailClient])

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-pcis-card/40 backdrop-blur-sm border-b border-pcis-border px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-semibold text-pcis-text">Prediction Intelligence</h1>
            <p className="text-[11px] text-pcis-text-secondary mt-0.5">AI behavioral pattern analysis  - all insights derived from real data</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search client or pattern..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-52 bg-white/[0.04] border border-pcis-border/30 rounded-lg px-3 py-1.5 text-[11px] text-pcis-text placeholder-pcis-text-muted/50 focus:outline-none focus:border-pcis-gold/30"
            />
            <select
              value={sortMode}
              onChange={e => setSortMode(e.target.value as SortMode)}
              className="bg-white/[0.04] border border-pcis-border/30 rounded-lg px-2.5 py-1.5 text-[10px] text-pcis-text focus:outline-none focus:border-pcis-gold/30"
            >
              <option value="urgency">Sort: Urgency</option>
              <option value="confidence">Sort: Confidence</option>
              <option value="recency">Sort: Recent</option>
            </select>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {(['all', ...PREDICTION_PATTERN_LIST] as const).map(p => (
            <button
              key={p}
              onClick={() => setPatternFilter(p as PredictionPattern | 'all')}
              className={`px-2.5 py-1 rounded-full text-[9px] font-medium border transition-all ${
                patternFilter === p
                  ? 'border-pcis-gold/40 bg-pcis-gold/10 text-pcis-gold'
                  : 'border-pcis-border/20 text-pcis-text-muted hover:text-pcis-text hover:border-pcis-border/40'
              }`}
            >
              {p === 'all' ? 'All Patterns' : p}
            </button>
          ))}

          <div className="h-4 w-px bg-pcis-border/30 mx-1" />

          {(['all', 'heating', 'stable', 'cooling'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMomentumFilter(m as MomentumDirection | 'all')}
              className={`px-2.5 py-1 rounded-full text-[9px] font-medium border transition-all ${
                momentumFilter === m
                  ? 'border-pcis-gold/40 bg-pcis-gold/10 text-pcis-gold'
                  : 'border-pcis-border/20 text-pcis-text-muted hover:text-pcis-text hover:border-pcis-border/40'
              }`}
            >
              {m === 'all' ? 'All' : `${momentumArrow(m as MomentumDirection)} ${m}`}
            </button>
          ))}

          <div className="h-4 w-px bg-pcis-border/30 mx-1" />

          {(['all', '80+', '70-79', '<70'] as const).map(c => (
            <button
              key={c}
              onClick={() => setConfidenceFilter(c)}
              className={`px-2.5 py-1 rounded-full text-[9px] font-medium border transition-all ${
                confidenceFilter === c
                  ? 'border-pcis-gold/40 bg-pcis-gold/10 text-pcis-gold'
                  : 'border-pcis-border/20 text-pcis-text-muted hover:text-pcis-text hover:border-pcis-border/40'
              }`}
            >
              {c === 'all' ? 'All Conf' : c}
            </button>
          ))}

          <span className="ml-auto text-[10px] font-mono text-pcis-text-muted">{filteredPredictions.length} result{filteredPredictions.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Summary stats bar */}
        <div className="px-6 border-b border-pcis-border/20">
          <SummaryBar />
        </div>

        {/* Main content: Situation Room + List/Detail */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left panel  - scrollable list */}
          <div className="w-[420px] flex-shrink-0 border-r border-pcis-border/20 overflow-y-auto">
            {/* Situation room inside list panel */}
            <div className="p-4">
              <SituationRoom />
            </div>

            {/* Pattern Radar */}
            <div className="px-4 pb-3">
              <PatternRadar
                onPatternClick={(pattern) => setPatternFilter(pattern)}
                activePattern={patternFilter}
              />
            </div>

            {/* Prediction cards */}
            <div className="px-4 pb-6 space-y-3">
              {filteredPredictions.map((pred, i) => (
                <AnimatedCard key={pred.clientId + pred.pattern} delay={i * 60}>
                  <PredictionListCard
                    prediction={pred}
                    isSelected={selectedPrediction?.clientId === pred.clientId && selectedPrediction?.pattern === pred.pattern}
                    onClick={() => setSelectedPrediction(pred)}
                  />
                </AnimatedCard>
              ))}
              {filteredPredictions.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-[12px] text-pcis-text-muted">No predictions match filters</p>
                </div>
              )}
            </div>
          </div>

          {/* Right panel  - detail for selected prediction */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedPrediction ? (
              <PredictionDetail
                prediction={selectedPrediction}
                onViewProfile={(client) => setDetailClient(client)}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-[12px] text-pcis-text-muted">Select a prediction to view intelligence</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Client detail flyout */}
      {detailClient && detailData && (
        <ClientDetailPanel
          {...detailData}
          onClose={() => setDetailClient(null)}
          dealStage={detailClient.dealStage}
          dealStageChangedAt={detailClient.dealStageChangedAt}
          nextTouch={getNextTouch(detailClient.id)}
        />
      )}
    </div>
  )
}
